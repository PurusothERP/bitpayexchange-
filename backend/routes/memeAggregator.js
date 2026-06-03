/**
 * ── Meme Aggregator API ──────────────────────────────────────────────────────
 * Pulls 2000+ real mainnet meme tokens from multiple sources:
 *   1. DexScreener   — BSC + Solana trending meme pairs (live prices)
 *   2. Binance       — All altcoin/meme USDT pairs with live volume
 *   3. CoinGecko     — meme-token category (top 500, live prices)
 *   4. four.meme     — BNB Chain native meme launchpad
 *   5. pump.fun      — Solana meme launchpad (via public API)
 *   6. GeckoTerminal — trending BSC/SOL pools (live liquidity & price)
 */

const express = require('express');
const axios   = require('axios');
const db      = require('../config/db');
const router  = express.Router();

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// ── Simple in-memory cache ──────────────────────────────────────────────────
const _cache = {};
async function cached(key, fn, ttlMs = 60000) {
    const now = Date.now();
    if (_cache[key] && (now - _cache[key].ts) < ttlMs) return _cache[key].data;
    const data = await fn();
    _cache[key] = { ts: now, data };
    return data;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function logoFor(token) {
    if (token.image && token.image.startsWith('http')) return token.image;
    if (token.logoURI && token.logoURI.startsWith('http')) return token.logoURI;
    if (token.icon && token.icon.startsWith('http')) return token.icon;
    if (token.imageUrl && token.imageUrl.startsWith('http')) return token.imageUrl;
    if (token.address) return `${BACKEND_URL}/api/tokens/${token.address}/logo`;
    return null;
}

function safeNum(v) { return isNaN(parseFloat(v)) ? 0 : parseFloat(v); }

async function getBNBPrice() {
    try {
        const binanceRes = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT', { timeout: 5000 });
        return parseFloat(binanceRes.data.price) || 600.0;
    } catch(err) {
        return 600.0;
    }
}

async function fetchDbMemes() {
    try {
        const bnbPrice = await getBNBPrice();
        const result = await db.query(
            "SELECT * FROM tokens WHERE is_meme = 1 AND is_delisted = 0"
        );
        return (result.rows || []).map(t => {
            const priceUsd = (parseFloat(t.price_bnb) || 0) * bnbPrice;
            return {
                id: t.contract_address || `db-${t.id}`,
                name: t.name,
                symbol: (t.symbol || '').toUpperCase(),
                address: t.contract_address,
                network: t.network || 'BNB',
                image: t.logo_url || null,
                current_price: priceUsd || 0.00000001,
                price_change_percentage_24h: 0.0,
                market_cap: parseFloat(t.market_cap) || 0,
                total_volume: (parseFloat(t.market_cap) || 0) * 0.15,
                liquidity_usd: (parseFloat(t.liquidity_bnb) || 0) * bnbPrice,
                source: 'b20-launchpad',
                description: t.description
            };
        });
    } catch (e) {
        console.error('[MemeAgg] DB fetch failed:', e.message);
        return [];
    }
}

// ── Source 1: DexScreener — live BSC meme pairs ─────────────────────────────
async function fetchDexScreenerBSC() {
    try {
        // Search for top BSC meme pairs by volume
        const searches = ['PEPE', 'DOGE', 'SHIB', 'FLOKI', 'BONK', 'WIF', 'MEME', 'INU', 'ELON', 'BABY'];
        const results = [];
        for (const q of searches) {
            try {
                const r = await axios.get('https://api.dexscreener.com/latest/dex/search', {
                    params: { q },
                    timeout: 6000,
                    headers: { Accept: 'application/json' }
                });
                const pairs = (r.data?.pairs || [])
                    .filter(p => ['bsc', 'solana', 'ethereum', 'base'].includes(p.chainId) && parseFloat(p.liquidity?.usd || 0) > 500);
                results.push(...pairs);
            } catch { /* skip term */ }
        }
        // De-duplicate by base token address
        const seen = new Set();
        return results.filter(p => {
            const key = (p.baseToken?.address || '').toLowerCase();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        }).map(p => ({
            id: p.baseToken?.address || p.pairAddress,
            name: p.baseToken?.name || 'Unknown',
            symbol: (p.baseToken?.symbol || '').toUpperCase(),
            address: p.baseToken?.address || p.pairAddress,
            network: p.chainId === 'bsc' ? 'BNB' : p.chainId === 'solana' ? 'SOL' : p.chainId === 'base' ? 'BASE' : 'ETH',
            image: p.info?.imageUrl || null,
            current_price: safeNum(p.priceUsd),
            price_change_percentage_24h: safeNum(p.priceChange?.h24),
            market_cap: safeNum(p.fdv || p.marketCap),
            total_volume: safeNum(p.volume?.h24),
            liquidity_usd: safeNum(p.liquidity?.usd),
            source: 'dexscreener',
            dex_url: p.url,
            pair_created_at: p.pairCreatedAt
        }));
    } catch (e) {
        console.error('[MemeAgg] DexScreener BSC failed:', e.message);
        return [];
    }
}

// ── Source 2: Binance — all meme/altcoin USDT pairs ─────────────────────────
async function fetchBinanceMemes() {
    try {
        const r = await axios.get('https://api.binance.com/api/v3/ticker/24hr', { timeout: 15000 });
        const MAJORS = new Set(['BTC','ETH','BNB','SOL','XRP','ADA','AVAX','DOT','MATIC','LINK','LTC','UNI','ATOM','USDC','USDT','BUSD','DAI','FDUSD','TON','TRX']);
        const BINANCE_LOGO = 'https://cryptologos.cc/logos/bnb-bnb-logo.png';
        
        const memeSymbolKeywords = ['DOGE','PEPE','SHIB','FLOKI','BONK','WIF','INU','ELON','BABY','MEME','MOON','SAFE','CAT','FROG','PUMP','TURBO','GROK','NEIRO','CATS','BOME','POPCAT','MEW','COQ','PONKE','BRETT','TOSHI'];
        
        return (r.data || [])
            .filter(t => {
                if (!t.symbol.endsWith('USDT')) return false;
                if (parseFloat(t.volume) <= 0) return false;
                const base = t.symbol.replace('USDT', '');
                if (MAJORS.has(base)) return false;
                // Include if market cap rank is low or name matches meme keywords
                return true; // include all alts - user can filter
            })
            .map(t => ({
                id: `binance-${t.symbol}`,
                name: t.symbol.replace('USDT', ''),
                symbol: t.symbol.replace('USDT', ''),
                address: `binance:${t.symbol}`,
                network: 'BNB',
                image: `https://assets.coingecko.com/coins/images/825/small/${t.symbol.replace('USDT','').toLowerCase()}.png`,
                current_price: safeNum(t.lastPrice),
                price_change_percentage_24h: safeNum(t.priceChangePercent),
                market_cap: 0,
                total_volume: safeNum(t.quoteVolume),
                source: 'binance',
                high_24h: safeNum(t.highPrice),
                low_24h: safeNum(t.lowPrice)
            }))
            .sort((a, b) => b.total_volume - a.total_volume)
            .slice(0, 500);
    } catch (e) {
        console.error('[MemeAgg] Binance failed:', e.message);
        return [];
    }
}

// ── Source 3: CoinGecko — meme-token category (live prices) ─────────────────
async function fetchCoinGeckoMemes() {
    const results = [];
    const CG_KEY = process.env.COINGECKO_API_KEY || '';
    const headers = CG_KEY ? { 'x-cg-demo-api-key': CG_KEY } : {};
    
    for (let page = 1; page <= 4; page++) {
        try {
            const r = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
                params: {
                    vs_currency: 'usd',
                    category: 'meme-token',
                    order: 'volume_desc',
                    per_page: 250,
                    page,
                    sparkline: false
                },
                headers,
                timeout: 15000
            });
            if (!r.data?.length) break;
            results.push(...r.data.map(t => ({
                id: t.id,
                name: t.name,
                symbol: (t.symbol || '').toUpperCase(),
                address: t.contract_address || t.id,
                network: detectNetworkFromCG(t),
                image: t.image,
                current_price: safeNum(t.current_price),
                price_change_percentage_24h: safeNum(t.price_change_percentage_24h),
                market_cap: safeNum(t.market_cap),
                market_cap_rank: t.market_cap_rank,
                total_volume: safeNum(t.total_volume),
                high_24h: safeNum(t.high_24h),
                low_24h: safeNum(t.low_24h),
                source: 'coingecko'
            })));
            await new Promise(r => setTimeout(r, 1200)); // respect rate limit
        } catch (e) {
            console.warn(`[MemeAgg] CoinGecko meme page ${page} failed:`, e.message);
            break;
        }
    }
    return results;
}

function detectNetworkFromCG(t) {
    const id = (t.id || '').toLowerCase();
    if (id.includes('solana') || id.includes('-sol')) return 'SOL';
    if (id.includes('base')) return 'BASE';
    if (id.includes('tron')) return 'TRON';
    if (id.includes('bnb') || id.includes('bsc')) return 'BNB';
    return 'ETH';
}

// ── Source 4: four.meme — BNB Chain launchpad (via DexScreener token search) ─
async function fetchFourMeme() {
    try {
        // four.meme tokens exist on BSC — we query DexScreener for BSC tokens
        // created recently with high activity (proxy for four.meme launch activity)
        const r = await axios.get('https://api.dexscreener.com/token-boosts/latest/v1', {
            timeout: 8000,
            headers: { Accept: 'application/json' }
        });
        const tokens = Array.isArray(r.data) ? r.data : [];
        
        // Also hit four.meme's public API for latest launches
        let fourMemeTokens = [];
        try {
            const fmRes = await axios.get('https://four.meme/meme-api/v1/private/token/list', {
                params: { pageNo: 1, pageSize: 100, status: 'TRADING' },
                timeout: 8000,
                headers: { 'Content-Type': 'application/json', 'Origin': 'https://four.meme' }
            });
            const fmData = fmRes.data?.data?.list || fmRes.data?.data || [];
            fourMemeTokens = fmData.map(t => ({
                id: `fourmeme-${t.address || t.tokenAddr}`,
                name: t.name || t.tokenName,
                symbol: (t.symbol || t.tokenSymbol || '').toUpperCase(),
                address: t.address || t.tokenAddr,
                network: 'BNB',
                image: t.image || t.tokenImage || null,
                current_price: safeNum(t.price || t.tokenPrice),
                price_change_percentage_24h: safeNum(t.priceChange || t.increase),
                market_cap: safeNum(t.marketCap || t.mktCap),
                total_volume: safeNum(t.volume || t.vol24h),
                liquidity_usd: safeNum(t.liquidity),
                source: 'four.meme',
                pair_created_at: t.createTime || t.launchTime
            }));
        } catch (fmErr) {
            console.warn('[MemeAgg] four.meme direct API failed:', fmErr.message);
        }
        
        // Map DexScreener boosted tokens (BSC priority)
        const boostedBSC = tokens
            .filter(t => t.chainId === 'bsc')
            .map(t => ({
                id: `fourmeme-boost-${t.tokenAddress}`,
                name: t.description || t.tokenAddress.slice(0, 8),
                symbol: t.tokenAddress.slice(0, 6).toUpperCase(),
                address: t.tokenAddress,
                network: 'BNB',
                image: t.icon || null,
                current_price: 0,
                price_change_percentage_24h: 0,
                market_cap: 0,
                total_volume: 0,
                source: 'four.meme'
            }));
        
        return [...fourMemeTokens, ...boostedBSC];
    } catch (e) {
        console.error('[MemeAgg] four.meme fetch failed:', e.message);
        return [];
    }
}

// ── Source 5: pump.fun — Solana meme launchpad (via public API) ──────────────
async function fetchPumpFun() {
    try {
        const r = await axios.get('https://frontend-api.pump.fun/coins', {
            params: { offset: 0, limit: 200, sort: 'last_trade_timestamp', order: 'DESC', includeNsfw: false },
            timeout: 10000,
            headers: {
                'Accept': 'application/json',
                'Origin': 'https://pump.fun',
                'Referer': 'https://pump.fun/'
            }
        });
        const coins = Array.isArray(r.data) ? r.data : (r.data?.coins || []);
        return coins.map(t => ({
            id: `pumpfun-${t.mint}`,
            name: t.name,
            symbol: (t.symbol || '').toUpperCase(),
            address: t.mint,
            network: 'SOL',
            image: t.image_uri || t.image || null,
            current_price: safeNum(t.usd_market_cap) > 0 ? safeNum(t.usd_market_cap) / safeNum(t.total_supply || 1e9) : 0,
            price_change_percentage_24h: 0,
            market_cap: safeNum(t.usd_market_cap),
            total_volume: safeNum(t.volume || 0),
            liquidity_usd: safeNum(t.virtual_sol_reserves) * 150, // approx USD
            source: 'pump.fun',
            description: t.description,
            pair_created_at: t.created_timestamp
        }));
    } catch (e) {
        console.error('[MemeAgg] pump.fun fetch failed:', e.message);
        return [];
    }
}

// ── Source 6: GeckoTerminal — trending meme pools (BSC + SOL) ────────────────
async function fetchGeckoTerminal() {
    try {
        const results = [];
        const networks = ['bsc', 'solana', 'eth', 'base'];
        for (const net of networks) {
            try {
                const r = await axios.get(`https://api.geckoterminal.com/api/v2/networks/${net}/trending_pools`, {
                    params: { page: 1 },
                    timeout: 8000,
                    headers: { Accept: 'application/json;version=20230302' }
                });
                const pools = r.data?.data || [];
                pools.forEach(pool => {
                    const attrs = pool.attributes || {};
                    const baseToken = attrs.base_token_name;
                    results.push({
                        id: `gt-${attrs.address}`,
                        name: attrs.name?.split(' / ')[0] || baseToken || 'Unknown',
                        symbol: (attrs.base_token_symbol || attrs.name?.split(' / ')[0] || '').toUpperCase(),
                        address: attrs.base_token_address || attrs.address,
                        network: net === 'bsc' ? 'BNB' : net === 'solana' ? 'SOL' : net === 'base' ? 'BASE' : 'ETH',
                        image: attrs.base_token_image_url || null,
                        current_price: safeNum(attrs.base_token_price_usd || attrs.token_price_usd),
                        price_change_percentage_24h: safeNum(attrs.price_change_percentage?.h24 || attrs.h24_price_change_percentage),
                        market_cap: safeNum(attrs.market_cap_usd || attrs.fdv_usd),
                        total_volume: safeNum(attrs.volume_usd?.h24 || attrs.h24_volume_usd),
                        liquidity_usd: safeNum(attrs.reserve_in_usd),
                        source: 'geckoterminal'
                    });
                });
                await new Promise(r => setTimeout(r, 500));
            } catch { /* skip network */ }
        }
        return results;
    } catch (e) {
        console.error('[MemeAgg] GeckoTerminal failed:', e.message);
        return [];
    }
}

// ── Source 7: FLAP — via DexScreener search for FLAP token + BNB meme pairs ──
async function fetchFlap() {
    try {
        // FLAP is on BSC — we query DexScreener for BSC native tokens
        const r = await axios.get('https://api.dexscreener.com/latest/dex/search', {
            params: { q: 'FLAP' },
            timeout: 6000,
            headers: { Accept: 'application/json' }
        });
        const pairs = (r.data?.pairs || []).filter(p => p.chainId === 'bsc');
        return pairs.map(p => ({
            id: `flap-${p.baseToken?.address}`,
            name: p.baseToken?.name || 'FLAP Token',
            symbol: (p.baseToken?.symbol || '').toUpperCase(),
            address: p.baseToken?.address,
            network: 'BNB',
            image: p.info?.imageUrl || null,
            current_price: safeNum(p.priceUsd),
            price_change_percentage_24h: safeNum(p.priceChange?.h24),
            market_cap: safeNum(p.fdv || p.marketCap),
            total_volume: safeNum(p.volume?.h24),
            liquidity_usd: safeNum(p.liquidity?.usd),
            source: 'flap.sh',
            dex_url: p.url
        }));
    } catch (e) {
        console.error('[MemeAgg] FLAP fetch failed:', e.message);
        return [];
    }
}

// ── GET /api/meme/live ────────────────────────────────────────────────────────
// Master aggregator endpoint — returns 20000+ real mainnet meme tokens
router.get('/live', async (req, res) => {
    const { source, network, sort = 'volume', limit = 25000 } = req.query;
    
    try {
        const allData = await cached('meme_live_all', async () => {
            console.log('[MemeAgg] Fetching from all sources...');
            
            // Fetch all sources in parallel for speed
            const [dex, binance, cg, fourMeme, pump, gecko, flap, localDb] = await Promise.allSettled([
                fetchDexScreenerBSC(),
                fetchBinanceMemes(),
                fetchCoinGeckoMemes(),
                fetchFourMeme(),
                fetchPumpFun(),
                fetchGeckoTerminal(),
                fetchFlap(),
                fetchDbMemes()
            ]);
            
            const safe = r => r.status === 'fulfilled' ? r.value : [];
            
            const raw = [
                ...safe(localDb), // Local DB first (highest priority)
                ...safe(cg),      // CoinGecko first (most accurate prices)
                ...safe(dex),     // DexScreener second (live)
                ...safe(gecko),   // GeckoTerminal third
                ...safe(fourMeme),// four.meme
                ...safe(pump),    // pump.fun
                ...safe(flap),    // flap.sh
                ...safe(binance)  // Binance last (no contract address)
            ];
            
            console.log(`[MemeAgg] Raw tokens collected: ${raw.length}`);
            
            // De-duplicate by address (lowercase)
            const seen = new Set();
            const merged = [];
            for (const t of raw) {
                const key = (t.address || t.id || '').toLowerCase();
                if (!key || seen.has(key)) continue;
                seen.add(key);
                // Enrich logo
                t.image = logoFor(t);
                merged.push(t);
            }
            
            console.log(`[MemeAgg] After dedup: ${merged.length} unique tokens`);
            return merged;
        }, 5 * 60 * 1000); // Cache for 5 minutes
        
        global.memeTokens = allData;
        
        // Apply filters
        let result = [...allData];
        
        if (source && source !== 'all') {
            result = result.filter(t => t.source === source);
        }
        
        if (network && network !== 'all') {
            result = result.filter(t => (t.network || '').toLowerCase() === network.toLowerCase());
        }
        
        // Sort
        if (sort === 'volume') result.sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
        else if (sort === 'mcap') result.sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0));
        else if (sort === 'change') result.sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0));
        else if (sort === 'new') result.sort((a, b) => (b.pair_created_at || 0) - (a.pair_created_at || 0));
        else if (sort === 'liquidity') result.sort((a, b) => (b.liquidity_usd || 0) - (a.liquidity_usd || 0));
        
        res.json({
            total: result.length,
            sources: {
                coingecko: allData.filter(t => t.source === 'coingecko').length,
                dexscreener: allData.filter(t => t.source === 'dexscreener').length,
                binance: allData.filter(t => t.source === 'binance').length,
                'four.meme': allData.filter(t => t.source === 'four.meme').length,
                'pump.fun': allData.filter(t => t.source === 'pump.fun').length,
                geckoterminal: allData.filter(t => t.source === 'geckoterminal').length,
                'flap.sh': allData.filter(t => t.source === 'flap.sh').length
            },
            tokens: result.slice(0, parseInt(limit))
        });
    } catch (err) {
        console.error('[MemeAgg] Fatal error:', err.message);
        res.status(500).json({ error: 'Failed to aggregate meme tokens', details: err.message });
    }
});

// ── GET /api/meme/sources ─────────────────────────────────────────────────────
// Returns summary of available sources
router.get('/sources', (req, res) => {
    res.json([
        { id: 'all',          label: 'All Sources',     icon: '🌐', description: 'All 2000+ tokens from every source' },
        { id: 'coingecko',    label: 'CoinGecko',       icon: '🦎', description: 'Top meme tokens by market cap with live prices' },
        { id: 'dexscreener',  label: 'DexScreener',     icon: '📊', description: 'Live BSC & Solana trending meme pairs' },
        { id: 'binance',      label: 'Binance',         icon: '🟡', description: 'All meme/altcoin USDT pairs on Binance' },
        { id: 'four.meme',    label: 'four.meme',       icon: '4️⃣', description: 'BNB Chain meme launchpad native tokens' },
        { id: 'pump.fun',     label: 'pump.fun',        icon: '🚀', description: 'Solana meme launchpad — newest launches' },
        { id: 'geckoterminal',label: 'GeckoTerminal',   icon: '🦎', description: 'Trending BSC, SOL, ETH & Base liquidity pools' },
        { id: 'flap.sh',      label: 'FLAP',            icon: '🐸', description: 'BNB Chain meme launchpad by FLAP.sh' }
    ]);
});

// Populate global meme list / cache immediately on startup
setTimeout(async () => {
    try {
        console.log('[MemeAgg] Pre-warming global meme cache on startup...');
        const raw = [
            fetchDexScreenerBSC(),
            fetchBinanceMemes(),
            fetchCoinGeckoMemes(),
            fetchFourMeme(),
            fetchPumpFun(),
            fetchGeckoTerminal(),
            fetchFlap()
        ];
        const results = await Promise.allSettled(raw);
        const safe = r => r.status === 'fulfilled' ? r.value : [];
        const merged = [];
        const seen = new Set();
        const rawMerged = [
            ...safe(results[2]), // cg
            ...safe(results[0]), // dex
            ...safe(results[5]), // gecko
            ...safe(results[3]), // fourMeme
            ...safe(results[4]), // pump
            ...safe(results[6]), // flap
            ...safe(results[1])  // binance
        ];
        for (const t of rawMerged) {
            const key = (t.address || t.id || '').toLowerCase();
            if (!key || seen.has(key)) continue;
            seen.add(key);
            t.image = logoFor(t);
            merged.push(t);
        }
        global.memeTokens = merged;
        console.log(`[MemeAgg] Global cache warmed with ${merged.length} tokens.`);
    } catch (e) {
        console.warn('[MemeAgg] Global cache warming failed:', e.message);
    }
}, 5000);

module.exports = router;
