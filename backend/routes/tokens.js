const express = require('express');
const axios = require('axios');
const { autoCreateToken } = require('../services/treasuryAutomation');
const { runVerificationCycle } = require('../services/tokenVerifier');
const router = express.Router();
const multer = require('multer');
const storage = require('../services/storage');
const db = require('../config/db');
const trustWalletService = require('../services/trustWalletService');

const upload = multer({ storage: multer.memoryStorage() });

// ── Normalize IPFS URLs to a reliable public gateway ─────────────────────────
// Pinata's gateway rate-limits heavily (HTTP 429). Use cloudflare-ipfs.com instead.
function normalizeLogo(url) {
    if (!url) return url;
    // Replace Pinata gateway (rate-limited 429) with ipfs.io public gateway
    if (url.includes('gateway.pinata.cloud/ipfs/')) {
        return url.replace('https://gateway.pinata.cloud/ipfs/', 'https://ipfs.io/ipfs/');
    }
    // Also handle ipfs:// protocol
    if (url.startsWith('ipfs://')) {
        return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
    }
    return url;
}

function normalizeToken(t) {
    const totalSold = t.liquidity_bnb ? (parseFloat(t.liquidity_bnb) / 1e18) : 0;
    const price = parseFloat(t.price_bnb || 0);
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
    let isDelisted = t.is_delisted === 1;
    let delistingSoon = false;
    if (diffDays >= 60) isDelisted = true;
    else if (diffDays >= 57) delistingSoon = true;

    const collateral = parseFloat(t.liquidity_bnb || 0);
    let progress = Math.min(100, (collateral / 10) * 100);
    if (t.launch_type === 'FAIR' || t.launch_type === 'STANDARD') progress = 100;

    return { 
        ...t, 
        logo_url:             normalizeLogo(t.logo_url),
        ipfs_logo_url:        t.ipfs_logo_url || null,
        trust_status:         status,
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

// ─── GET /api/tokens/markets/cg ─────────────────────────────────────────────
// PROXY: Fetch market data from CoinGecko to avoid frontend CORS issues.
router.get('/markets/cg', async (req, res) => {
    const { category, per_page, page } = req.query;
    try {
        const headers = process.env.COINGECKO_API_KEY
            ? { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY }
            : {};

        const params = {
            vs_currency: 'usd',
            order: 'market_cap_desc',
            per_page: per_page || 250,
            page: page || 1,
            sparkline: false
        };
        if (category) params.category = category;

        const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
            headers,
            params,
            timeout: 15000 // 15s timeout
        });
        res.json(response.data);
    } catch (err) {
        console.error('[Token Proxy] Market fetch failed:', err.message);
        res.status(500).json({ error: 'Failed to fetch external market data', details: err.message });
    }
});

// ─── GET /api/tokens/markets/new ──────────────────────────────────────────
// Fetch newly listed assets from CoinGecko (Alpha Discovery)
router.get('/markets/new', async (req, res) => {
    try {
        const headers = process.env.COINGECKO_API_KEY
            ? { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY }
            : {};
        // Use 'newly-listed-coins' category or just general market with 'id_desc' if supported
        // Demo key usually supports category filtering
        const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
            headers,
            params: { 
                vs_currency: 'usd',
                category: 'newly-listed-coins',
                per_page: 50,
                page: 1,
                sparkline: false
            },
            timeout: 15000
        });
        res.json(response.data);
    } catch (err) {
        console.error('[Token Proxy] New listings fetch failed:', err.message);
        // Fallback to general tokens sorted by rank if category fail
        res.status(500).json({ error: 'Failed to fetch newly listed data' });
    }
});


// ─── GET /api/tokens/markets/trending ───────────────────────────────────────
// PROXY: Fetch trending data from CoinGecko, enriched with full market data
// (proper images, live prices, 24h change) via /coins/markets.
router.get('/markets/trending', async (req, res) => {
    try {
        const headers = process.env.COINGECKO_API_KEY
            ? { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY }
            : {};

        // Step 1: get the trending list
        const trendRes = await axios.get('https://api.coingecko.com/api/v3/search/trending', {
            headers,
            timeout: 15000
        });
        const coins = trendRes.data.coins || [];

        // Step 2: extract coin IDs and fetch full market data for proper images + prices
        const ids = coins.slice(0, 15).map(c => c.item?.id).filter(Boolean).join(',');
        let marketMap = {};
        if (ids) {
            try {
                const mktRes = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
                    headers,
                    params: {
                        vs_currency: 'usd',
                        ids,
                        order: 'market_cap_desc',
                        sparkline: false,
                        price_change_percentage: '24h'
                    },
                    timeout: 15000
                });
                (mktRes.data || []).forEach(c => { marketMap[c.id] = c; });
            } catch (e) {
                console.warn('[Trending] Market enrichment failed, using thumbnail fallback:', e.message);
            }
        }

        // Step 3: merge – prefer full market data image, fall back to thumb
        const enrichedCoins = coins.slice(0, 15).map(c => {
            const item = c.item || {};
            const mkt  = marketMap[item.id] || {};
            return {
                item: {
                    ...item,
                    // Use /coins/markets image (200x200) if available, else thumb
                    thumb: mkt.image || item.thumb || item.small || item.large || '',
                    small: mkt.image || item.small || item.thumb || '',
                    large: mkt.image || item.large || item.thumb || '',
                    // Inject live price & change directly onto item so frontend reads them
                    current_price: mkt.current_price ?? item.data?.price ?? 0,
                    price_change_percentage_24h: mkt.price_change_percentage_24h ?? item.data?.price_change_percentage_24h?.usd ?? 0,
                    data: {
                        ...(item.data || {}),
                        price: mkt.current_price ?? item.data?.price ?? 0,
                        price_change_percentage_24h: {
                            usd: mkt.price_change_percentage_24h ?? item.data?.price_change_percentage_24h?.usd ?? 0
                        }
                    }
                }
            };
        });

        res.json({ ...trendRes.data, coins: enrichedCoins });
    } catch (err) {
        console.error('[Token Proxy] Trending fetch failed:', err.message);
        res.status(500).json({ error: 'Failed to fetch trending data' });
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
    try {
        // Case-insensitive match so MetaMask mixed-case wallets always find their tokens
        const query = `SELECT *, COALESCE(launch_type, 'MEME') as launch_type FROM tokens WHERE LOWER(creator_wallet) = LOWER(?) ORDER BY created_at DESC`;
        const result = await db.query(query, [wallet]);
        res.json(result.rows.map(normalizeToken));
    } catch (error) {
        console.error('Error fetching tokens for wallet:', error);
        res.status(500).json({ error: 'Failed to fetch tokens for wallet', details: error.message });
    }
});

// ─── POST /api/tokens/sync ────────────────────────────────────────────────────
// Called by the frontend after on-chain token creation to save metadata + logo
// IMPORTANT: Must be before /:address route
router.post('/sync', upload.single('logo'), async (req, res) => {
    const { name, symbol, decimals, supply, owner, description, tokenAddress, txHash, launch_type } = req.body;
    const logoFile = req.file;

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
            const TREASURY = (process.env.FEE_WALLET || '0x6451ee4def4a8b8fbc2c64301a79e267de378935').toLowerCase();
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
        console.error('Error syncing token:', error);
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

    const TREASURY = (process.env.FEE_WALLET || '0x6451ee4def4a8b8fbc2c64301a79e267de378935').toLowerCase();
    
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
    const { contract_address, new_status, tx_hash } = req.body;
    const isManual = tx_hash === 'admin_manual';
    
    try {
        await db.query(
            'UPDATE tokens SET trust_status = ? WHERE contract_address = ?',
            [new_status, contract_address]
        );
        
        // Log the service fee in treasury_transfers
        // If manual (admin), log 0 fee. If from user, log 0.01 fee.
        try {
            const TREASURY = (process.env.FEE_WALLET || '0x6451ee4def4a8b8fbc2c64301a79e267de378935').toLowerCase();
            await db.query(
                'INSERT OR IGNORE INTO treasury_transfers (tx_hash, amount_bnb, transfer_type, source_contract, destination_address) VALUES (?, ?, ?, ?, ?)',
                [tx_hash || `status_req_${contract_address}_${Date.now()}`, isManual ? 0 : 0.01, 'upgrade_fee', contract_address, TREASURY]
            );
        } catch (transErr) {
            console.warn('Failed to log status fee transfer:', transErr.message);
        }

        res.json({ success: true, message: isManual ? 'Status updated by Admin' : 'Status updated after verification' });
    } catch (error) {
        console.error('Status request failed:', error);
        res.status(500).json({ error: 'Request failed' });
    }
});

// ─── POST /api/tokens/boost ──────────────────────────────────────────────────
router.post('/boost', async (req, res) => {
    const { contract_address, tx_hash } = req.body;
    if (!contract_address || !tx_hash) return res.status(400).json({ error: 'Missing address/tx' });
    
    try {
        const TREASURY = (process.env.FEE_WALLET || '0x6451ee4def4a8b8fbc2c64301a79e267de378935').toLowerCase();
        
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

// ─── GET /api/tokens/:address ─────────────────────────────────────────────────
// Get a single token by contract address
router.get('/:address', async (req, res) => {
    const { address } = req.params;

    // Validate looks like an Ethereum address
    if (!address.startsWith('0x') || address.length !== 42) {
        return res.status(400).json({ error: 'Invalid token address' });
    }

    try {
        const query = 'SELECT * FROM tokens WHERE LOWER(contract_address) = LOWER(?)';
        const result = await db.query(query, [address]);

        if (result.rows.length === 0) {
            // Fallback: try to fetch basic info on-chain
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
                const [name, symbol, totalSupply] = await Promise.all([
                    tokenContract.name(),
                    tokenContract.symbol(),
                    tokenContract.totalSupply()
                ]);
                // Auto-sync into DB for missing tokens discovered via URL
                try {
                    await db.query(
                        `INSERT OR IGNORE INTO tokens (contract_address, name, symbol, total_supply, launch_type, description)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [address.toLowerCase(), name, symbol, totalSupply.toString(), 'MEME', 'On-chain auto-synchronized asset. Metadata pending.']
                    );
                } catch (dbErr) { console.warn('Failed to auto-sync missing token:', dbErr.message); }

                return res.json({
                    contract_address: address,
                    name,
                    symbol,
                    total_supply: totalSupply.toString(),
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

// ── GET /api/tokens/verify-status/:address ───────────────────────────────────
// Returns live BSCScan verification + Trust Wallet PR status for a token
router.get('/verify-status/:address', async (req, res) => {
    const { address } = req.params;
    if (!address.startsWith('0x') || address.length !== 42) {
        return res.status(400).json({ error: 'Invalid address' });
    }
    try {
        const result = await db.query(
            `SELECT contract_address, name, symbol,
                    bscscan_verified, verification_status, verify_guid,
                    compiler_version, last_verified_at,
                    tw_pr_url, tw_pr_status, tw_submitted_at, ipfs_logo_url
             FROM tokens WHERE LOWER(contract_address) = LOWER(?)`,
            [address]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Token not found' });
        const t = result.rows[0];
        res.json({
            contract_address:    t.contract_address,
            name:                t.name,
            symbol:              t.symbol,
            bscscan_verified:    t.bscscan_verified === 1,
            verification_status: t.verification_status || 'pending',
            compiler_version:    t.compiler_version,
            last_verified_at:    t.last_verified_at,
            bscscan_url:         `https://bscscan.com/address/${t.contract_address}`,
            tw_pr_url:           t.tw_pr_url || null,
            tw_pr_status:        t.tw_pr_status || 'pending',
            tw_submitted_at:     t.tw_submitted_at || null,
            ipfs_logo_url:       t.ipfs_logo_url || null,
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch verification status', details: error.message });
    }
});

// ─── POST /api/tokens/admin/verify-cycle ──────────────────────────────────
// Admin only: Trigge BSCScan / Trust Wallet verification cycle manually
router.post('/admin/verify-cycle', async (req, res) => {
    const { wallet } = req.body;
    const TREASURY = (process.env.FEE_WALLET || '0x6451ee4def4a8b8fbc2c64301a79e267de378935').toLowerCase();
    
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
    
    const TREASURY = (process.env.FEE_WALLET || '0x6451ee4def4a8b8fbc2c64301a79e267de378935').toLowerCase();
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

// ─── GET /api/tokens/stats ────────────────────────────────────────────────────
// Returns high-level platform counts for Admin + Homepage widgets
router.get('/stats', async (req, res) => {
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

// ─── GET /api/tokens/listing-submissions ────────────────────────────────────
// Admin: retrieve all listing submissions
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

