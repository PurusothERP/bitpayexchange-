const express = require('express');
const axios = require('axios');
const { autoCreateToken } = require('../services/treasuryAutomation');
const { runVerificationCycle } = require('../services/tokenVerifier');
const router = express.Router();
const multer = require('multer');
const storage = require('../services/storage');
const db = require('../config/db');
const trustWalletService = require('../services/trustWalletService');
const cryptoFetcher = require('../services/cryptoFetcher');
const tokenRegistry = require('../services/tokenRegistry');
const upload = multer({ storage: multer.memoryStorage() });

// ── Logo resolution: local → Trust Wallet CDN → proxy placeholder ────────────
// Returns the best available logo URL for a token.
// Priority: stored_url → local file → Trust Wallet CDN → backend proxy (SVG placeholder)
const path = require('path');
const fs   = require('fs');
const LOGOS_DIR    = path.join(__dirname, '../public/logos');
const BACKEND_URL  = process.env.BACKEND_URL || 'http://localhost:3001';

function normalizeLogo(url, contractAddress) {
    // 1. If there's already a working local URL, pass it through unchanged
    if (url && (url.includes('/logos/') || url.includes('localhost:3001'))) return url;

    // 2. Check if local logo file exists on disk (uploaded with new storage.js)
    if (contractAddress) {
        const addr = contractAddress.toLowerCase();
        for (const ext of ['.png', '.jpg', '.jpeg', '.webp']) {
            if (fs.existsSync(path.join(LOGOS_DIR, `${addr}${ext}`))) {
                return `${BACKEND_URL}/logos/${addr}${ext}`;
            }
        }
    }

    // 3. If stored URL is a Pinata URL → rewrite to ipfs.io (better uptime)
    if (url && url.includes('gateway.pinata.cloud/ipfs/')) {
        return url.replace('https://gateway.pinata.cloud/ipfs/', 'https://ipfs.io/ipfs/');
    }
    if (url && url.startsWith('ipfs://')) {
        return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
    }

    // 4. Non-empty stored URL — use as-is (could be any CDN)
    if (url && url.startsWith('http')) return url;

    // 5. No logo: return backend proxy which generates a colourful SVG placeholder
    if (contractAddress) {
        return `${BACKEND_URL}/api/tokens/${contractAddress}/logo`;
    }
    return null;
}

function normalizeToken(t) {
    const totalSold = t.liquidity_bnb ? (parseFloat(t.liquidity_bnb) / 1e18) : 0;
    const price = parseFloat(t.price_bnb || 0) || 0.00000001; // baseline if 0
    const supply = parseFloat(t.total_supply || 1000000000);
    const marketCap = price * supply;
    
    let status = t.trust_status || 'Newly Launched Token';
    if (status === 'Newly Launched Token') {
        if (totalSold > 0.5) status = 'Highly Trusted';
        else if (totalSold > 0.2) status = 'Good to buy';
    }
    const now = new Date();
    const lastTrade = new Date(t.last_trade_at || t.created_at);
    const diffDays = (now - lastTrade) / (1000 * 60 * 60 * 24);
    // Respect admin-controlled is_delisted flag — do NOT auto-delist
    const isDelisted = t.is_delisted === 1 || t.is_delisted === true;
    const delistingSoon = !isDelisted && diffDays >= 57;

    const collateral = parseFloat(t.liquidity_bnb || 0);
    let progress = Math.min(100, (collateral / 10) * 100);
    if (t.launch_type === 'FAIR' || t.launch_type === 'STANDARD') progress = 100;

    return { 
        ...t, 
        logo_url:             normalizeLogo(t.logo_url, t.contract_address),
        ipfs_logo_url:        t.ipfs_logo_url || null,
        trust_status:         status,
        price_bnb:            price, // <-- ensures frontend has a price
        market_cap:           marketCap,
        bonding_progress:     progress,
        is_delisted:          isDelisted,
        delisting_soon:       delistingSoon,
        bscscan_verified:     t.bscscan_verified === 1,
        verification_status:  t.verification_status || 'pending',
        tw_pr_url:            t.tw_pr_url || null,
        tw_pr_status:         t.tw_pr_status || 'pending',
    };
}



// ─── GET /api/tokens/stats ────────────────────────────────────────────────────
// Returns high-level platform counts for Admin + Homepage widgets
router.get('/stats', async (req, res) => {
    console.log('[DEBUG] Stats route hit');
    try {
        const result = await db.query(`
            SELECT
                COUNT(*)                                                          AS total,
                COUNT(CASE WHEN DATE(created_at) = DATE('now')             THEN 1 END) AS today,
                COUNT(CASE WHEN created_at >= DATETIME('now', '-1 hour')   THEN 1 END) AS last_1h,
                COUNT(CASE WHEN created_at >= DATETIME('now', '-24 hours') THEN 1 END) AS last_24h,
                COUNT(CASE WHEN launch_type IN ('FAIR','STANDARD','EXCHANGE_LISTING') THEN 1 END) AS migrated
            FROM tokens WHERE is_delisted = 0
        `);
        res.json(result.rows[0] || { total: 0, today: 0, last_1h: 0, last_24h: 0, migrated: 0 });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch token stats' });
    }
});

// ─── GET /api/tokens ─────────────────────────────────────────────────────────
// List all tokens for the launchpad page
router.get('/', async (req, res) => {
    const { include_delisted } = req.query;
    try {
        const query = include_delisted === 'true' 
            ? `SELECT *, COALESCE(launch_type, 'MEME') as launch_type FROM tokens ORDER BY created_at DESC`
            : `SELECT *, COALESCE(launch_type, 'MEME') as launch_type FROM tokens WHERE is_delisted = 0 ORDER BY created_at DESC`;
            
        const result = await db.query(query);
        const tokens = result.rows.map(normalizeToken);
        
        if (include_delisted === 'true') {
            res.json(tokens);
        } else {
            res.json(tokens.filter(t => !t.is_delisted));
        }
    } catch (error) {
        console.error('Error fetching tokens:', error);
        res.status(500).json({ error: 'Failed to fetch tokens', details: error.message });
    }
});

// ─── In-memory cache for large token lists (avoids hammering external APIs) ──
const _listCache = {};
async function cachedFetch(key, url, ttlMs = 10 * 60 * 1000) {
    const now = Date.now();
    if (_listCache[key] && (now - _listCache[key].ts) < ttlMs) {
        return _listCache[key].data;
    }
    const res = await axios.get(url, { timeout: 20000 });
    _listCache[key] = { data: res.data, ts: now };
    return res.data;
}

// ─── GET /api/tokens/markets/bsclist ────────────────────────────────────────
// Returns the full CoinGecko BSC token list (~3300 tokens) + PancakeSwap extended
// Cached for 10 minutes to avoid rate limits. Used by the exchange Markets tab.
router.get('/markets/bsclist', async (req, res) => {
    try {
        const PANCAKE_URL    = 'https://tokens.pancakeswap.finance/pancakeswap-extended.json';
        const CG_BSC_URL     = 'https://tokens.coingecko.com/binance-smart-chain/all.json';
        const ONE_INCH_URL   = 'https://tokens.1inch.io/v1.2/56'; // 1inch BSC list

        const [cgBsc, pancake, oneInch] = await Promise.allSettled([
            cachedFetch('cg_bsc',   CG_BSC_URL,   10 * 60 * 1000),
            cachedFetch('pancake',  PANCAKE_URL,  10 * 60 * 1000),
            cachedFetch('1inch56',  ONE_INCH_URL, 10 * 60 * 1000),
        ]);

        const safe = (r) => r.status === 'fulfilled' ? r.value : null;

        // Merge all token lists into a unified format
        const seenAddresses = new Set();
        const merged = [];

        // CoinGecko BSC list (highest quality — has prices)
        const cgTokens = safe(cgBsc)?.tokens || [];
        for (const t of cgTokens) {
            const addr = (t.address || '').toLowerCase();
            if (!addr || seenAddresses.has(addr)) continue;
            seenAddresses.add(addr);
            merged.push({
                address: t.address,
                symbol:  (t.symbol || '').toUpperCase(),
                name:    t.name,
                decimals: t.decimals || 18,
                logoURI: t.logoURI || t.image || '',
                chainId: 56,
                source: 'coingecko_bsc'
            });
        }

        // PancakeSwap extended list
        const pancakeTokens = safe(pancake)?.tokens || [];
        for (const t of pancakeTokens) {
            const addr = (t.address || '').toLowerCase();
            if (!addr || seenAddresses.has(addr)) continue;
            seenAddresses.add(addr);
            merged.push({
                address: t.address,
                symbol:  (t.symbol || '').toUpperCase(),
                name:    t.name,
                decimals: t.decimals || 18,
                logoURI: t.logoURI || '',
                chainId: 56,
                source: 'pancakeswap'
            });
        }

        // 1inch BSC list (object keyed by address)
        const oneInchTokens = safe(oneInch);
        if (oneInchTokens && typeof oneInchTokens === 'object') {
            for (const [addr, t] of Object.entries(oneInchTokens)) {
                const lAddr = addr.toLowerCase();
                if (seenAddresses.has(lAddr)) continue;
                seenAddresses.add(lAddr);
                merged.push({
                    address: addr,
                    symbol:  (t.symbol || '').toUpperCase(),
                    name:    t.name,
                    decimals: t.decimals || 18,
                    logoURI: t.logoURI || t.logoUrl || '',
                    chainId: 56,
                    source: '1inch'
                });
            }
        }

        // Merge and ensure at least 6000 real market tokens
        const registryTokens = tokenRegistry.getMarkets(1, 6000).map(t => ({
            address: t.address,
            symbol: t.symbol,
            name: t.name,
            decimals: t.decimals || 18,
            logoURI: t.image,
            chainId: 56,
            source: 'institutional_registry'
        }));

        const finalMerged = [...merged, ...registryTokens];
        const unique = Array.from(new Map(finalMerged.map(t => [t.address.toLowerCase(), t])).values());

        res.json({ tokens: unique.slice(0, 8000), count: unique.length });
    } catch (err) {
        console.error('[BSC List] Failed:', err.message);
        const fallback = tokenRegistry.getMarkets(1, 6000);
        res.json({ tokens: fallback, count: fallback.length });
    }
});

// ─── API Adapters ─────────────────────────────────────────────────────────────
// Now uses the robust cryptoFetcher module.

// ─── GET /api/tokens/markets/heatmap ─────────────────────────────────────────
router.get('/markets/heatmap', async (req, res) => {
    try {
        const data = await cryptoFetcher.getMarkets(null, 100, 1);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Heatmap fetch failed' });
    }
});

// ─── GET /api/tokens/markets/cg ──────────────────────────────────────────────
// This is the primary endpoint for the 6000 global market index
router.get('/markets/cg', async (req, res) => {
    const { per_page = 250, page = 1, ids } = req.query;
    try {
        // If specific IDs are requested (e.g. for detail enrichment), use cryptoFetcher
        if (ids) {
            const data = await cryptoFetcher.getMarkets(ids, 1, 1);
            return res.json(data);
        }

        // Use registry for bulk listings to avoid 429
        const p = parseInt(page) || 1;
        const pp = parseInt(per_page) || 250;
        const tokens = tokenRegistry.getMarkets(p, pp);
        
        console.log(`[CG Route] Page: ${p}, Registry count: ${tokens.length}`);
        
        if (tokens.length > 0) {
            return res.json(tokens);
        }

        // If registry is empty for this page, check if we have ANY tokens at all
        if (tokenRegistry.tokens.markets.length > 0) {
             console.warn(`[CG Route] Page ${p} out of bounds, returning empty.`);
             return res.json([]);
        }

        // Fallback to live fetcher only if registry is completely empty
        console.warn(`[CG Route] Registry completely empty, falling back to CryptoFetcher`);
        const data = await cryptoFetcher.getMarkets(null, pp, p);
        res.json(data || []);
    } catch (err) {
        console.error('[Market Data] Fetch failed:', err.message);
        const p = parseInt(page) || 1;
        const pp = parseInt(per_page) || 250;
        res.json(tokenRegistry.getMarkets(p, pp));
    }
});

// ─── GET /api/tokens/markets/memes ───────────────────────────────────────────
// Dedicated endpoint for the 6000+ Meme Terminal registry
router.get('/markets/memes', async (req, res) => {
    const { per_page = 250, page = 1 } = req.query;
    try {
        const memes = tokenRegistry.getMemes(parseInt(page), parseInt(per_page));
        res.json(memes);
    } catch (err) {
        res.json([]);
    }
});

// ─── GET /api/tokens/detail/:id ──────────────────────────────────────────────
router.get('/detail/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const url = `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
        const resData = await axios.get(url, { headers: cryptoFetcher.getCgHeaders(), timeout: 10000 });
        const d = resData.data;

        // Extract contract address (platform)
        const platforms = d.platforms || {};
        const bscAddr = platforms['binance-smart-chain'] || platforms['ethereum'] || Object.values(platforms)[0] || '';

        // Mock Holders (Standard Top 5 simulation for demo)
        const holders = [
            { address: '0x000000000000000000000000000000000000dead', balance: 'Burn Address', percentage: '24.5%' },
            { address: '0x321...a1b2', balance: 'Binance Hot Wallet', percentage: '12.8%' },
            { address: '0x789...f5e4', balance: 'Institutional Vault', percentage: '8.2%' },
            { address: '0x555...c8d9', balance: 'Early Contributor', percentage: '4.5%' },
            { address: '0xabc...9988', balance: 'DEX Liquidity', percentage: '3.1%' }
        ];

        // Mock Big Trades
        const trades = [
            { type: 'BUY', amount: (Math.random() * 50 + 10).toFixed(2), price: d.market_data.current_price.usd, time: '2 mins ago', hash: '0x' + Math.random().toString(16).slice(2) },
            { type: 'SELL', amount: (Math.random() * 30 + 5).toFixed(2), price: d.market_data.current_price.usd, time: '8 mins ago', hash: '0x' + Math.random().toString(16).slice(2) },
            { type: 'BUY', amount: (Math.random() * 100 + 20).toFixed(2), price: d.market_data.current_price.usd, time: '15 mins ago', hash: '0x' + Math.random().toString(16).slice(2) }
        ];

        res.json({
            id: d.id,
            name: d.name,
            symbol: d.symbol,
            image: d.image.large,
            contract_address: bscAddr,
            price_usd: d.market_data.current_price.usd,
            market_cap: d.market_data.market_cap.usd,
            total_supply: d.market_data.total_supply,
            circulating_supply: d.market_data.circulating_supply,
            performance: {
                '24h': d.market_data.price_change_percentage_24h,
                '7d': d.market_data.price_change_percentage_7d,
                '30d': d.market_data.price_change_percentage_30d,
                '200d': d.market_data.price_change_percentage_200d,
                '1y': d.market_data.price_change_percentage_1y
            },
            holders,
            recent_trades: trades
        });
    } catch (err) {
        console.error('[Token Detail] Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch token details' });
    }
});

// ─── GET /api/tokens/markets/cg ─────────────────────────────────────────────
router.get('/markets/cg', async (req, res) => {
    const { category, per_page, page, ids } = req.query;
    try {
        const data = await cryptoFetcher.getMarkets(category, per_page, page, ids);
        res.json(data);
    } catch (err) {
        console.error('[Token Proxy] Market fetch failed completely:', err.message);
        res.status(500).json({ error: 'Failed to fetch external market data', details: err.message });
    }
});

// ─── GET /api/tokens/markets/new ──────────────────────────────────────────
// Fetch newly listed assets from CoinGecko/CMC with failover
router.get('/markets/new', async (req, res) => {
    try {
        const data = await cryptoFetcher.getNewListings();
        res.json(data);
    } catch (err) {
        console.error('[Token Proxy] New listings fetch failed completely:', err.message);
        res.status(500).json({ error: 'Failed to fetch newly listed data', details: err.message });
    }
});

// ─── GET /api/tokens/markets/trending ───────────────────────────────────────
// PROXY: Fetch trending data from CoinGecko/CMC with failover
router.get('/markets/trending', async (req, res) => {
    try {
        const data = await cryptoFetcher.getTrending();
        res.json(data);
    } catch (err) {
        console.error('[Token Proxy] Trending fetch failed completely:', err.message);
        res.status(500).json({ error: 'Failed to fetch trending data', details: err.message });
    }
});

// ─── GET /api/tokens/markets/health ──────────────────────────────────────────
// Test the health of the underlying APIs
router.get('/markets/health', async (req, res) => {
    try {
        const health = await cryptoFetcher.healthCheck();
        res.json(health);
    } catch (err) {
        res.status(500).json({ error: 'Health check failed', details: err.message });
    }
});

// ─── GET /api/tokens/list ────────────────────────────────────────────────────
// Standard Token List compatible with Uniswap / PancakeSwap
// Format: https://uniswap.org/tokenlist
router.get('/list', async (req, res) => {
    try {
        const query = 'SELECT * FROM tokens ORDER BY created_at DESC';
        const result = await db.query(query);
        
        const tokenList = {
            name: "B20-LAB Launchpad Tokens",
            timestamp: new Date().toISOString(),
            version: { major: 1, minor: 0, patch: 0 },
            tags: {},
            logoURI: "https://b20-lab.com/logo.png",
            keywords: ["meme", "bsc", "b20-lab"],
            tokens: result.rows.map(t => {
                // Return ipfs:// format if we can, otherwise use the gateway url
                let logoIpfs = t.logo_url;
                if (logoIpfs && logoIpfs.includes('gateway.pinata.cloud/ipfs/')) {
                    logoIpfs = logoIpfs.replace('https://gateway.pinata.cloud/ipfs/', 'ipfs://');
                }
                
                return {
                    name: t.name,
                    symbol: t.symbol,
                    address: t.contract_address,
                    chainId: 56,
                    decimals: 18,
                    logoURI: logoIpfs || t.logo_url,
                    description: t.description || ''
                };
            })
        };
        
        res.json(tokenList);
    } catch (error) {
        console.error('Error fetching token list:', error);
        res.status(500).json({ error: 'Failed to fetch token list', details: error.message });
    }
});

// ─── GET /api/tokens/by-wallet/:wallet ────────────────────────────────────────
// Fetch tokens by creator wallet address — used by the Profile page
// IMPORTANT: Must be before /:address route
router.get('/by-wallet/:wallet', async (req, res) => {
    const { wallet } = req.params;
    console.log(`[Profile] Fetching tokens for wallet: ${wallet}`);
    try {
        // Simple case-insensitive match on creator_wallet
        // (owner column does not exist in current schema)
        const result = await db.query(
            `SELECT *, COALESCE(launch_type, 'MEME') as launch_type 
             FROM tokens 
             WHERE LOWER(creator_wallet) = LOWER(?)
             ORDER BY created_at DESC`,
            [wallet]
        );
        console.log(`[Profile] Found ${result.rows.length} tokens for ${wallet}`);
        res.json(result.rows.map(normalizeToken));
    } catch (error) {
        console.error('[Profile] Error fetching tokens for wallet:', error.message);
        res.status(500).json({ error: 'Failed to fetch tokens for wallet', details: error.message });
    }
});

// ─── GET /api/tokens/:address/logo ────────────────────────────────────────────
// Logo proxy: serves local file or generates a colourful SVG placeholder.
// This ensures every token always has a visible logo — no IPFS / Pinata dependency.
router.get('/:address/logo', async (req, res) => {
    const { address } = req.params;
    const addr = address.toLowerCase();

    // 1. Try local file first
    for (const ext of ['.png', '.jpg', '.jpeg', '.webp']) {
        const filePath = path.join(LOGOS_DIR, `${addr}${ext}`);
        if (fs.existsSync(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=604800');
            return res.sendFile(filePath);
        }
    }

    // 2. Try to fetch from DB and see if there's a stored logo URL to proxy
    try {
        const row = await db.query(
            'SELECT logo_url, symbol, name FROM tokens WHERE LOWER(contract_address) = LOWER(?)',
            [address]
        );
        if (row.rows[0]?.logo_url && row.rows[0].logo_url.startsWith('http')) {
            // Proxy the remote image
            try {
                const imgRes = await axios.get(row.rows[0].logo_url, { responseType: 'arraybuffer', timeout: 4000 });
                const contentType = imgRes.headers['content-type'] || 'image/png';
                res.setHeader('Content-Type', contentType);
                res.setHeader('Cache-Control', 'public, max-age=86400');
                return res.end(Buffer.from(imgRes.data));
            } catch (e) { /* fall through to SVG */ }
        }

        // 3. Generate deterministic colourful SVG avatar
        const symbol = (row.rows[0]?.symbol || address.slice(2, 4)).toUpperCase().slice(0, 2);
        const hue = (parseInt(addr.slice(2, 6), 16) % 360);
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue},70%,55%)"/>
      <stop offset="100%" stop-color="hsl(${(hue+60)%360},80%,40%)"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="32" fill="url(#g)"/>
  <text x="64" y="76" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-size="48" font-weight="900" fill="rgba(255,255,255,0.95)">${symbol}</text>
</svg>`;
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.end(svg);
    } catch (err) {
        // Ultimate fallback — gray circle SVG
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="64" fill="#e2e8f0"/><text x="64" y="72" text-anchor="middle" font-size="40" fill="#94a3b8">🪙</text></svg>`;
        res.setHeader('Content-Type', 'image/svg+xml');
        return res.end(svg);
    }
});

// ─── POST /api/tokens/sync ────────────────────────────────────────────────────
// Called by the frontend after on-chain token creation to save metadata + logo
// IMPORTANT: Must be before /:address route
router.post('/sync', upload.single('logo'), async (req, res) => {
    const { name, symbol, decimals, supply, owner, description, tokenAddress, txHash, launch_type } = req.body;
    const logoFile = req.file;

    console.log('[Sync] Incoming request object:', { name, symbol, tokenAddress, owner, launch_type });

    if (!tokenAddress) {
        return res.status(400).json({ error: 'tokenAddress is required' });
    }

    try {
        // 1. Upload logo to Pinata if provided
        let logoUrl = '';
        if (logoFile) {
            try {
                logoUrl = await storage.uploadLogo(tokenAddress, logoFile.buffer, logoFile.originalname);
            } catch (e) {
                console.warn('Logo upload failed, continuing without logo:', e.message);
            }
        }

        // 2. Create and upload metadata to Pinata
        let metadataUrl = '';
        try {
            // Standard metadata format requested by user
            // Convert logo URL to standardized ipfs:// format for metadata JSON
            let metadataLogoUri = logoUrl;
            if (metadataLogoUri && metadataLogoUri.includes('gateway.pinata.cloud/ipfs/')) {
                metadataLogoUri = metadataLogoUri.replace('https://gateway.pinata.cloud/ipfs/', 'ipfs://');
            }

            const metadata = {
                name,
                symbol,
                address: tokenAddress,
                decimals: parseInt(decimals) || 18,
                logoURI: metadataLogoUri,
                description
            };
            metadataUrl = await storage.uploadMetadata(tokenAddress, metadata);
        } catch (e) {
            console.warn('Metadata upload failed, continuing without metadata:', e.message);
        }

        // 2.5 Trust Wallet PR + IPFS logo upload (fire immediately in background)
        if (logoFile) {
            try {
                trustWalletService.pushToTrustWallet({
                    name,
                    symbol,
                    address: tokenAddress,
                    description
                }, logoFile.buffer).then(result => {
                    if (result?.prUrl)  console.log('[Sync] Trust Wallet PR:', result.prUrl);
                    if (result?.ipfsUrl) console.log('[Sync] IPFS Logo:', result.ipfsUrl);
                }).catch(err => {
                    console.warn('[Sync] Trust Wallet submission error:', err.message);
                });
            } catch (prErr) {
                console.warn('[Sync] Failed to queue Trust Wallet PR:', prErr.message);
            }
        }

        // 3. Save to SQLite — use INSERT OR REPLACE to handle duplicates
        const query = `
            INSERT INTO tokens (name, symbol, contract_address, creator_wallet, logo_url, metadata_url, description, decimals, total_supply, tx_hash, launch_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(contract_address) DO UPDATE SET
                name = excluded.name,
                symbol = excluded.symbol,
                logo_url = excluded.logo_url,
                metadata_url = excluded.metadata_url,
                description = excluded.description,
                creator_wallet = excluded.creator_wallet,
                decimals = excluded.decimals,
                tx_hash = excluded.tx_hash,
                launch_type = excluded.launch_type
        `;
        const values = [
            name || 'Unknown',
            symbol || 'UNKNOWN',
            tokenAddress,
            owner || '',
            logoUrl,
            metadataUrl,
            description || '',
            parseInt(decimals) || 18,
            supply || '1000000000',
            txHash || '',
            launch_type || 'MEME'
        ];

        await db.query(query, values);

        // 3.5 Link whitepaper if temp_id provided
        const { whitepaper_temp_id } = req.body;
        if (whitepaper_temp_id) {
            try {
                await db.query(
                    `UPDATE whitepapers SET token_address = ? WHERE temp_id = ?`,
                    [tokenAddress, whitepaper_temp_id]
                );
            } catch (wpErr) {
                console.warn('Failed to link whitepaper during sync:', wpErr.message);
            }
        }

        // 3.6 Log the creation fee in treasury_transfers
        try {
            const TREASURY = (process.env.FEE_WALLET || '').toLowerCase();
            const isOwnerAdmin = (owner || '').toLowerCase() === TREASURY;
            
            // Fees: Standard (0.007), Fair (0.007 + 0.002 trade), Meme (0.007)
            // For logging purposes, we record the base creation fee here
            // If it's a MEME token, the indexer (treasuryAutomation.js) catches the event and logs the fee.
            // For STANDARD and FAIR, we log it here to ensure it is recorded.
            if (!isOwnerAdmin && (launch_type === 'STANDARD' || launch_type === 'FAIR')) {
                const creationFee = 0.007; 
                await db.query(
                    'INSERT OR IGNORE INTO treasury_transfers (tx_hash, amount_bnb, transfer_type, source_contract, destination_address) VALUES (?, ?, ?, ?, ?)',
                    [txHash || `manual_${tokenAddress}_${Date.now()}`, creationFee, 'creation_fee', tokenAddress, TREASURY]
                );
            }
        } catch (feeErr) {
            console.warn('Failed to log creation fee to treasury:', feeErr.message);
        }

        // Trigger immediate verification cycle (delayed short time to allow BSCScan indexing)
        setTimeout(() => {
            runVerificationCycle().catch(err => console.error('[Token] Background verify error:', err.message));
        }, 60000);

        // 4. Fetch back the saved row
        const insertedRow = await db.query('SELECT * FROM tokens WHERE LOWER(contract_address) = LOWER(?)', [tokenAddress]);
        const row = insertedRow.rows[0] || { contract_address: tokenAddress, name, symbol };
        res.status(201).json(normalizeToken(row));
    } catch (error) {
        console.error('[Sync] Error syncing token:', error.message, error.stack);
        res.status(500).json({ error: 'Failed to sync token metadata', details: error.message });
    }
});

// ─── GET /api/tokens/filter/delisted ──────────────────────────────────────────
router.get('/filter/delisted', async (req, res) => {
    try {
        const query = 'SELECT * FROM tokens WHERE is_delisted = 1 ORDER BY created_at DESC';
        const result = await db.query(query);
        res.json(result.rows.map(normalizeToken));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch delisted tokens' });
    }
});

// ─── POST /api/tokens/status/update ──────────────────────────────────────────
router.post('/status/update', async (req, res) => {
    const { contract_address, status, is_delisted, wallet, name, symbol, logo_url, network } = req.body;
    console.log(`[Admin] Token Status Update Request:`, { contract_address, status, is_delisted, wallet });

    const TREASURY = (process.env.FEE_WALLET || '').toLowerCase();
    
    // Check if wallet is either the main treasury OR an authorized assistant
    const assistantCheck = await db.query('SELECT 1 FROM admin_assistants WHERE LOWER(wallet_address) = ?', [wallet ? wallet.toLowerCase() : '']);
    const isAuthorized = (wallet && wallet.toLowerCase() === TREASURY) || (assistantCheck.rows.length > 0);

    if (!isAuthorized) {
        console.warn(`[Admin] Unauthorized status update attempt from: ${wallet}`);
        return res.status(403).json({ error: 'Admin only access' });
    }

    if (!contract_address) {
        return res.status(400).json({ error: 'Contract address is required' });
    }

    try {
        // We use INSERT INTO ... ON CONFLICT to ensure that tokens not yet in our DB can still be delisted
        await db.query(`
            INSERT INTO tokens (contract_address, name, symbol, logo_url, network, trust_status, is_delisted, launch_type, is_external)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'EXTERNAL', 1)
            ON CONFLICT(contract_address) DO UPDATE SET 
                trust_status = excluded.trust_status,
                is_delisted = excluded.is_delisted,
                network = COALESCE(excluded.network, tokens.network)
        `, [
            contract_address.toLowerCase(), 
            name || 'External Token', 
            symbol || 'EXT', 
            logo_url || 'https://assets.coingecko.com/coins/images/825/small/binance-coin-logo.png',
            network || 'BNB',
            status || 'Newly Launched Token', 
            is_delisted ? 1 : 0
        ]);
        
        console.log(`[Admin] ✅ Status updated for ${contract_address}: ${status}, delisted=${is_delisted}`);
        res.json({ success: true, message: 'Platform visibility updated' });
    } catch (error) {
        console.error('Delisting update failed:', error);
        res.status(500).json({ error: 'Database update failed', details: error.message });
    }
});

// ─── POST /api/tokens/status/request ──────────────────────────────────────────
router.post('/status/request', async (req, res) => {
    const { contract_address, new_status, tx_hash, requester_wallet, amount_bnb } = req.body;
    const isManual = tx_hash === 'admin_manual';
    
    try {
        if (isManual) {
            // Admin manual override - apply immediately
            await db.query(
                'UPDATE tokens SET trust_status = ? WHERE LOWER(contract_address) = LOWER(?)',
                [new_status, contract_address]
            );
            res.json({ success: true, message: 'Status updated directly by Admin' });
        } else {
            // User requested upgrade - validate payment tx_hash provided
            if (!tx_hash) return res.status(400).json({ error: 'Payment tx_hash is required' });

            const tokenData = await db.query(
                'SELECT name, trust_status FROM tokens WHERE LOWER(contract_address) = LOWER(?)',
                [contract_address]
            );
            const token = tokenData.rows[0];
            if (!token) return res.status(404).json({ error: 'Token not found' });

            // Check for duplicate request for same token+status (pending only)
            const existing = await db.query(
                `SELECT id FROM token_upgrade_requests 
                 WHERE LOWER(token_address) = LOWER(?) AND requested_upgrade = ? AND status = 'PENDING'`,
                [contract_address, new_status]
            );
            if (existing.rows.length > 0) {
                return res.status(400).json({ error: 'A pending upgrade request already exists for this token' });
            }

            // Insert upgrade request — user_wallet from body (not owner column)
            await db.query(
                `INSERT INTO token_upgrade_requests 
                 (token_address, token_name, current_status, requested_upgrade, user_wallet, status, tx_hash, amount_bnb)
                 VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
                [
                    contract_address,
                    token.name,
                    token.trust_status || 'Newly Launched Token',
                    new_status,
                    requester_wallet || 'UNKNOWN',
                    tx_hash,
                    parseFloat(amount_bnb || 0.01)
                ]
            );

            // Pre-log the service fee in treasury_transfers (will be confirmed on approval)
            try {
                const TREASURY = (process.env.FEE_WALLET || '').toLowerCase();
                await db.query(
                    'INSERT OR IGNORE INTO treasury_transfers (tx_hash, amount_bnb, transfer_type, source_contract, destination_address) VALUES (?, ?, ?, ?, ?)',
                    [tx_hash, parseFloat(amount_bnb || 0.01), 'upgrade_fee_pending', contract_address, TREASURY]
                );
            } catch (transErr) {
                console.warn('Failed to pre-log upgrade fee transfer:', transErr.message);
            }

            res.json({ success: true, message: 'Upgrade request submitted. Pending Admin approval in Launch Guard.' });
        }
    } catch (error) {
        console.error('Status request failed:', error.message);
        res.status(500).json({ error: 'Request failed', details: error.message });
    }
});

// ─── POST /api/tokens/boost ──────────────────────────────────────────────────
router.post('/boost', async (req, res) => {
    const { contract_address, tx_hash } = req.body;
    if (!contract_address || !tx_hash) return res.status(400).json({ error: 'Missing address/tx' });
    
    try {
        const TREASURY = (process.env.FEE_WALLET || process.env.FEE_WALLET).toLowerCase();
        
        // Update DB
        await db.query('UPDATE tokens SET is_boosted = 1 WHERE contract_address = ?', [contract_address]);

        // Log fee (0.05 BNB for boosting)
        await db.query(
            'INSERT OR IGNORE INTO treasury_transfers (tx_hash, amount_bnb, transfer_type, source_contract, destination_address) VALUES (?, ?, ?, ?, ?)',
            [tx_hash, 0.05, 'booster_fee', contract_address, TREASURY]
        );

        res.json({ success: true, message: 'Token boosted successfully' });
    } catch (error) {
        console.error('Boost error:', error);
        res.status(500).json({ error: 'Boost failed' });
    }
});

// ─── GET /api/tokens/upgrade-requests/:wallet ────────────────────────────────
// Returns all upgrade requests submitted by a specific wallet — used by Profile
// IMPORTANT: Must be before /:address route
router.get('/upgrade-requests/:wallet', async (req, res) => {
    const { wallet } = req.params;
    try {
        const result = await db.query(
            `SELECT tur.*, t.name, t.symbol, t.logo_url, t.trust_status
             FROM token_upgrade_requests tur
             LEFT JOIN tokens t ON LOWER(t.contract_address) = LOWER(tur.token_address)
             WHERE LOWER(tur.user_wallet) = LOWER(?)
             ORDER BY tur.created_at DESC`,
            [wallet]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('[UpgradeRequests] Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch upgrade requests', details: err.message });
    }
});

// ─── GET /api/tokens/listing-submissions ────────────────────────────────────
// Admin: retrieve all listing submissions
// IMPORTANT: Must be before /:address route
router.get('/listing-submissions', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM listing_submissions ORDER BY submitted_at DESC LIMIT 200`
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch listing submissions' });
    }
});

// ─── GET /api/tokens/:address ─────────────────────────────────────────────────
// Get a single token by contract address
router.get('/:address', async (req, res) => {
    const { address } = req.params;

    // Relaxed validation to allow Solana (base58) and Tron (T...) addresses
    if (!address || address.length < 30) {
        return res.status(400).json({ error: 'Invalid token address format' });
    }

    try {
        // 1. Check local DB (TokenRegistry results are already persisted here)
        const dbResult = await db.query('SELECT * FROM tokens WHERE LOWER(contract_address) = LOWER(?)', [address]);
        if (dbResult.rows.length > 0) {
            return res.json(normalizeToken(dbResult.rows[0]));
        }

        // 2. Multi-Chain Resolve via CoinGecko (AI-powered dynamic fetch)
        console.log(`[TokenResolve] Deep-fetching asset info for ${address}...`);
        const platforms = ['binance-smart-chain', 'solana', 'ethereum', 'base', 'tron', 'arbitrum-one', 'optimistic-ethereum'];
        let geckoData = null;
        let detectedPlatform = 'Multi-Chain';
        
        for (const p of platforms) {
            try {
                // If address doesn't look like EVM, skip EVM platforms (efficiency)
                const isEvm = address.startsWith('0x') && address.length === 42;
                if (!isEvm && p !== 'solana' && p !== 'tron') continue;
                if (isEvm && (p === 'solana' || p === 'tron')) continue;

                const geckoRes = await axios.get(`https://api.coingecko.com/api/v3/coins/${p}/contract/${address}`, {
                    headers: { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY },
                    timeout: 6000
                });
                if (geckoRes.data && geckoRes.data.id) {
                    geckoData = geckoRes.data;
                    detectedPlatform = p;
                    break;
                }
            } catch (e) { /* silent fail for platform probe */ }
        }

        if (geckoData) {
            const networkMap = {
                'binance-smart-chain': 'BNB',
                'solana': 'Solana',
                'ethereum': 'ETH',
                'base': 'Base',
                'tron': 'Tron',
                'arbitrum-one': 'ARBITRUM',
                'optimistic-ethereum': 'OP'
            };

            const formatted = {
                contract_address: address,
                name: geckoData.name,
                symbol: (geckoData.symbol || '').toUpperCase(),
                logo_url: geckoData.image?.large || geckoData.image?.small || '',
                total_supply: geckoData.market_data?.total_supply || 0,
                price_bnb: geckoData.market_data?.current_price?.usd || 0,
                market_cap: geckoData.market_data?.market_cap?.usd || 0,
                network: networkMap[detectedPlatform] || 'EXTERNAL',
                launch_type: 'MEME',
                is_external: 1,
                trust_status: 'Newly Launched Token'
            };

            // Auto-sync into DB for future lookups
            try {
                await db.query(`
                    INSERT INTO tokens (contract_address, name, symbol, logo_url, network, total_supply, launch_type, is_external, trust_status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
                    ON CONFLICT(contract_address) DO UPDATE SET 
                        name = excluded.name,
                        symbol = excluded.symbol,
                        logo_url = excluded.logo_url
                `, [
                    address.toLowerCase(), formatted.name, formatted.symbol, formatted.logo_url, 
                    formatted.network, formatted.total_supply.toString(), formatted.launch_type, formatted.trust_status
                ]);
            } catch (dbErr) { console.warn('Failed to auto-save Gecko token:', dbErr.message); }

            return res.json(normalizeToken(formatted));
        }

        // 3. Fallback: On-chain check (BSC only)
        if (address.startsWith('0x') && address.length === 42) {
            try {
                const { ethers } = require('ethers');
                const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org');
                const tokenAbi = [
                    'function name() view returns (string)',
                    'function symbol() view returns (string)',
                    'function totalSupply() view returns (uint256)',
                    'function decimals() view returns (uint8)'
                ];
                const tokenContract = new ethers.Contract(address, tokenAbi, provider);
                const [onChainName, onChainSymbol, totalSupply] = await Promise.all([
                    tokenContract.name(),
                    tokenContract.symbol(),
                    tokenContract.totalSupply()
                ]);
                
                const onChainToken = {
                    contract_address: address,
                    name: onChainName,
                    symbol: onChainSymbol,
                    total_supply: totalSupply.toString(),
                    network: 'BNB',
                    launch_type: 'MEME',
                    trust_status: 'Newly Launched Token'
                };

                await db.query(
                    `INSERT OR IGNORE INTO tokens (contract_address, name, symbol, total_supply, launch_type, network)
                     VALUES (?, ?, ?, ?, 'MEME', 'BNB')`,
                    [address.toLowerCase(), onChainName, onChainSymbol, totalSupply.toString()]
                );

                return res.json(normalizeToken(onChainToken));
            } catch (chainErr) { /* fallback to 404 */ }
        }

        return res.status(404).json({ error: 'Asset not found on any supported mainnet (Solana, Base, Tron, ETH, BNB)' });
    } catch (err) {
        console.error('[TokenResolve] Global error:', err.message);
        res.status(500).json({ error: 'Failed to resolve token', details: err.message });
    }
});
                    price_bnb: 0,
                    liquidity_bnb: '0',
                    trading_enabled: false,
                    launch_type: 'MEME'
                });
            } catch (chainErr) {
                return res.status(404).json({ error: 'Token not found' });
            }
        }

        res.json(normalizeToken(result.rows[0]));
    } catch (error) {
        console.error('Error fetching token:', error);
        res.status(500).json({ error: 'Failed to fetch token', details: error.message });
    }
});

// ... moved up ...

// ─── POST /api/tokens/admin/verify-cycle ──────────────────────────────────
// Admin only: Trigge BSCScan / Trust Wallet verification cycle manually
router.post('/admin/verify-cycle', async (req, res) => {
    const { wallet } = req.body;
    const TREASURY = (process.env.FEE_WALLET || process.env.FEE_WALLET).toLowerCase();
    
    if (!wallet || wallet.toLowerCase() !== TREASURY) {
        return res.status(403).json({ error: 'Admin only access' });
    }

    try {
        const verifier = require('../services/tokenVerifier');
        // Do not await, let it run in background
        verifier.runVerificationCycle().then(() => console.log('[Admin] Manual cycle complete')).catch(e => console.warn('[Admin] Manual cycle err:', e));
        res.json({ success: true, message: 'Verification cycle triggered in background' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to trigger verification cycle' });
    }
});

// ─── POST /api/tokens/admin/list ──────────────────────────────────────────────
// Admin only: Directly list external/custom tokens to the exchange
router.post('/admin/list', upload.single('logo'), async (req, res) => {
    const { 
        name, symbol, contract_address, total_supply, 
        liquidity_bnb, bnb_price, logo_url, wallet, network
    } = req.body;
    const logoFile = req.file;
    
    const TREASURY = (process.env.FEE_WALLET || process.env.FEE_WALLET).toLowerCase();
    if (!wallet || wallet.toLowerCase() !== TREASURY) {
        return res.status(403).json({ error: 'Admin only access' });
    }

    if (!contract_address || !name || !symbol) {
        return res.status(400).json({ error: 'Missing required token details (name, symbol, address)' });
    }

    try {
        let finalLogoUrl = logo_url || 'https://assets.coingecko.com/coins/images/825/small/binance-coin-logo.png';

        if (logoFile) {
            try {
                const uploadedLogo = await storage.uploadLogo(contract_address.toLowerCase(), logoFile.buffer, logoFile.originalname);
                if (uploadedLogo) finalLogoUrl = uploadedLogo;
            } catch (uploadErr) {
                console.warn('Admin logo upload failed, falling back to logo_url:', uploadErr.message);
            }
        }

        const query = `
            INSERT INTO tokens (
                name, symbol, contract_address, creator_wallet, 
                logo_url, total_supply, liquidity_bnb, price_bnb, 
                trust_status, launch_type, network, trading_enabled
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(contract_address) DO UPDATE SET
                name = excluded.name,
                symbol = excluded.symbol,
                logo_url = excluded.logo_url,
                total_supply = excluded.total_supply,
                liquidity_bnb = excluded.liquidity_bnb,
                price_bnb = excluded.price_bnb,
                trust_status = excluded.trust_status,
                launch_type = excluded.launch_type,
                network = excluded.network,
                trading_enabled = excluded.trading_enabled
        `;
        
        const values = [
            name,
            symbol.toUpperCase(),
            contract_address.toLowerCase(),
            wallet, // admin listed
            finalLogoUrl,
            total_supply || '1000000000',
            liquidity_bnb || '0',
            bnb_price || 0,
            'Highly Trusted', // Admins only add trusted tokens
            'EXCHANGE_LISTING', 
            network || 'BNB',
            1 // Trading enabled
        ];

        await db.query(query, values);

        res.status(201).json({ success: true, message: 'Token directly listed to Exchange & Perpetuals', logo_url: finalLogoUrl });
    } catch (error) {
        console.error('Admin token listing error:', error);
        res.status(500).json({ error: 'Failed to list token', details: error.message });
    }
});

// ... moved ...

// ─── POST /api/tokens/listing-submissions ───────────────────────────────────
// Stores a listing application submitted via the Exchange "List your token" form
router.post('/listing-submissions', async (req, res) => {
    const {
        contract_address, name, symbol, description, logo_url, whitepaper_url,
        circulation_supply, total_liquidity, paired_token, pancake_url, email,
        checks, submitter_wallet
    } = req.body;

    if (!contract_address || !name || !symbol || !submitter_wallet) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        await db.query(`
            INSERT INTO listing_submissions
                (contract_address, name, symbol, description, logo_url, whitepaper_url,
                 circulation_supply, total_liquidity, paired_token, pancake_url, email,
                 checks_json, submitter_wallet, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `, [
            contract_address.toLowerCase(), name, symbol.toUpperCase(),
            description || '', logo_url || '', whitepaper_url || '',
            circulation_supply || '', total_liquidity || '',
            paired_token || 'BNB', pancake_url || '', email || '',
            JSON.stringify(checks || {}), submitter_wallet.toLowerCase()
        ]);
        res.status(201).json({ success: true, message: 'Listing submitted for admin review.' });
    } catch (err) {
        console.error('Listing submission error:', err);
        res.status(500).json({ error: 'Failed to submit listing', details: err.message });
    }
});

// (GET /listing-submissions moved above /:address — see line ~554)

// ─── PATCH /api/tokens/listing-submissions/:id ──────────────────────────────
// Admin: approve or reject a listing submission
router.patch('/listing-submissions/:id', async (req, res) => {
    const { status, admin_note } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    try {
        await db.query(
            `UPDATE listing_submissions SET status = ?, admin_note = ? WHERE id = ?`,
            [status, admin_note || '', req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update submission' });
    }
});

module.exports = router;

