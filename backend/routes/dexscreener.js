const express = require('express');
const axios = require('axios');
const router = express.Router();

const DS_BASE = 'https://api.dexscreener.com';
const DS_HEADERS = { 'Accept': 'application/json' };

// ── in-memory cache to respect DexScreener rate limits ──────────────────────
const _cache = {};
async function cached(key, fn, ttlMs = 30000) {
    const now = Date.now();
    if (_cache[key] && (now - _cache[key].ts) < ttlMs) return _cache[key].data;
    const data = await fn();
    _cache[key] = { ts: now, data };
    return data;
}

// ─── GET /api/dex/profiles/latest ───────────────────────────────────────────
// Latest token profiles submitted to DexScreener
router.get('/profiles/latest', async (req, res) => {
    try {
        const data = await cached('profiles_latest', async () => {
            const r = await axios.get(`${DS_BASE}/token-profiles/latest/v1`, { headers: DS_HEADERS, timeout: 8000 });
            return r.data;
        });
        res.json(data);
    } catch (e) {
        console.error('[DexScreener] profiles/latest failed:', e.message);
        res.json([]);
    }
});

// ─── GET /api/dex/profiles/recent-updates ───────────────────────────────────
router.get('/profiles/recent-updates', async (req, res) => {
    try {
        const data = await cached('profiles_recent', async () => {
            const r = await axios.get(`${DS_BASE}/token-profiles/recent-updates/v1`, { headers: DS_HEADERS, timeout: 8000 });
            return r.data;
        });
        res.json(data);
    } catch (e) {
        console.error('[DexScreener] profiles/recent-updates failed:', e.message);
        res.json([]);
    }
});

// ─── GET /api/dex/cto/latest ────────────────────────────────────────────────
// Latest Community Takeover projects
router.get('/cto/latest', async (req, res) => {
    try {
        const data = await cached('cto_latest', async () => {
            const r = await axios.get(`${DS_BASE}/community-takeovers/latest/v1`, { headers: DS_HEADERS, timeout: 8000 });
            return r.data;
        });
        res.json(data);
    } catch (e) {
        console.error('[DexScreener] cto/latest failed:', e.message);
        res.json([]);
    }
});

// ─── GET /api/dex/boosts/latest ─────────────────────────────────────────────
// Latest boosted/promoted tokens
router.get('/boosts/latest', async (req, res) => {
    try {
        const data = await cached('boosts_latest', async () => {
            const r = await axios.get(`${DS_BASE}/token-boosts/latest/v1`, { headers: DS_HEADERS, timeout: 8000 });
            return r.data;
        });
        res.json(data);
    } catch (e) {
        console.error('[DexScreener] boosts/latest failed:', e.message);
        res.json([]);
    }
});

// ─── GET /api/dex/boosts/top ────────────────────────────────────────────────
// Top boosted tokens by spend
router.get('/boosts/top', async (req, res) => {
    try {
        const data = await cached('boosts_top', async () => {
            const r = await axios.get(`${DS_BASE}/token-boosts/top/v1`, { headers: DS_HEADERS, timeout: 8000 });
            return r.data;
        });
        res.json(data);
    } catch (e) {
        console.error('[DexScreener] boosts/top failed:', e.message);
        res.json([]);
    }
});

// ─── GET /api/dex/narratives/trending ───────────────────────────────────────
// Trending crypto narratives/sectors (AI, MEME, DEPIN, RWA, GAMING...)
router.get('/narratives/trending', async (req, res) => {
    try {
        const data = await cached('narratives_trending', async () => {
            const r = await axios.get(`${DS_BASE}/metas/trending/v1`, { headers: DS_HEADERS, timeout: 8000 });
            return r.data;
        }, 60000);
        res.json(data);
    } catch (e) {
        console.error('[DexScreener] narratives/trending failed:', e.message);
        res.json({ data: [] });
    }
});

// ─── GET /api/dex/narratives/:slug ──────────────────────────────────────────
// Detailed narrative data by slug (e.g. 'ai', 'meme', 'depin')
router.get('/narratives/:slug', async (req, res) => {
    const { slug } = req.params;
    try {
        const data = await cached(`narrative_${slug}`, async () => {
            const r = await axios.get(`${DS_BASE}/metas/meta/v1/${slug}`, { headers: DS_HEADERS, timeout: 8000 });
            return r.data;
        }, 60000);
        res.json(data);
    } catch (e) {
        console.error('[DexScreener] narrative detail failed:', e.message);
        res.json({});
    }
});

// ─── GET /api/dex/search?q=PEPE ─────────────────────────────────────────────
// Live DexScreener token/pair search
router.get('/search', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json({ pairs: [] });
    try {
        const r = await axios.get(`${DS_BASE}/latest/dex/search`, {
            params: { q },
            headers: DS_HEADERS,
            timeout: 8000
        });
        res.json(r.data || { pairs: [] });
    } catch (e) {
        console.error('[DexScreener] search failed:', e.message);
        res.json({ pairs: [] });
    }
});

// ─── GET /api/dex/pairs/:chainId/:pairId ────────────────────────────────────
// Full pair info — price, liquidity, volume, socials
router.get('/pairs/:chainId/:pairId', async (req, res) => {
    const { chainId, pairId } = req.params;
    try {
        const data = await cached(`pair_${chainId}_${pairId}`, async () => {
            const r = await axios.get(`${DS_BASE}/latest/dex/pairs/${chainId}/${pairId}`, { headers: DS_HEADERS, timeout: 8000 });
            return r.data;
        }, 15000);
        res.json(data);
    } catch (e) {
        console.error('[DexScreener] pair data failed:', e.message);
        res.json({ pairs: [] });
    }
});

// ─── GET /api/dex/token-pools/:chainId/:tokenAddress ────────────────────────
// All pools for a token across all DEXs
router.get('/token-pools/:chainId/:tokenAddress', async (req, res) => {
    const { chainId, tokenAddress } = req.params;
    try {
        const data = await cached(`pools_${chainId}_${tokenAddress}`, async () => {
            const r = await axios.get(`${DS_BASE}/token-pairs/v1/${chainId}/${tokenAddress}`, { headers: DS_HEADERS, timeout: 8000 });
            return r.data;
        }, 20000);
        res.json(data);
    } catch (e) {
        console.error('[DexScreener] token-pools failed:', e.message);
        res.json([]);
    }
});

// ─── GET /api/dex/token-market/:chainId/:addresses ──────────────────────────
// Live market data for up to 30 token addresses (comma-separated)
router.get('/token-market/:chainId/:addresses', async (req, res) => {
    const { chainId, addresses } = req.params;
    try {
        const data = await cached(`market_${chainId}_${addresses}`, async () => {
            const r = await axios.get(`${DS_BASE}/tokens/v1/${chainId}/${addresses}`, { headers: DS_HEADERS, timeout: 8000 });
            return r.data;
        }, 15000);
        res.json(data);
    } catch (e) {
        console.error('[DexScreener] token-market failed:', e.message);
        res.json([]);
    }
});

// ─── GET /api/dex/orders/:chainId/:tokenAddress ─────────────────────────────
// Check DexScreener paid orders for a token
router.get('/orders/:chainId/:tokenAddress', async (req, res) => {
    const { chainId, tokenAddress } = req.params;
    try {
        const r = await axios.get(`${DS_BASE}/orders/v1/${chainId}/${tokenAddress}`, { headers: DS_HEADERS, timeout: 8000 });
        res.json(r.data || []);
    } catch (e) {
        console.error('[DexScreener] orders failed:', e.message);
        res.json([]);
    }
});

module.exports = router;
