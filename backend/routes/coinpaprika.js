const express = require('express');
const axios = require('axios');
const router = express.Router();

const PAPRIKA_BASE = 'https://api.coinpaprika.com/v1';
const PAPRIKA_HEADERS = { 'Accept': 'application/json' };

// In-memory cache to respect rate limits (free tier = 25k calls/month)
const _cache = {};
async function cached(key, fn, ttlMs = 30000) {
    const now = Date.now();
    if (_cache[key] && (now - _cache[key].ts) < ttlMs) {
        return _cache[key].data;
    }
    const data = await fn();
    _cache[key] = { ts: now, data };
    return data;
}

// ─── GET /api/paprika/global ───────────────────────────────────────────────────
// Global crypto market statistics: total market cap, 24h volume, BTC dominance, etc.
router.get('/global', async (req, res) => {
    try {
        const data = await cached('paprika_global', async () => {
            const r = await axios.get(`${PAPRIKA_BASE}/global`, {
                headers: PAPRIKA_HEADERS,
                timeout: 8000
            });
            return r.data;
        }, 60000); // 1 min cache — global stats don't change every second
        res.json(data);
    } catch (e) {
        res.status(502).json({ error: e.message, source: 'coinpaprika' });
    }
});

// ─── GET /api/paprika/coins ────────────────────────────────────────────────────
// Full directory of all supported coins (id, name, symbol, rank, type)
router.get('/coins', async (req, res) => {
    try {
        const data = await cached('paprika_coins', async () => {
            const r = await axios.get(`${PAPRIKA_BASE}/coins`, {
                headers: PAPRIKA_HEADERS,
                timeout: 15000
            });
            return r.data;
        }, 300000); // 5 min cache — coin list rarely changes
        res.json(data);
    } catch (e) {
        res.status(502).json({ error: e.message, source: 'coinpaprika' });
    }
});

// ─── GET /api/paprika/tickers ──────────────────────────────────────────────────
// All coins tickers with prices, market caps, volume and price changes
router.get('/tickers', async (req, res) => {
    const { quotes } = req.query;
    try {
        const data = await cached(`paprika_tickers_${quotes || 'USD'}`, async () => {
            const r = await axios.get(`${PAPRIKA_BASE}/tickers`, {
                params: quotes ? { quotes } : {},
                headers: PAPRIKA_HEADERS,
                timeout: 20000
            });
            return r.data;
        }, 30000); // 30 sec cache
        res.json(data);
    } catch (e) {
        res.status(502).json({ error: e.message, source: 'coinpaprika' });
    }
});

// ─── GET /api/paprika/tickers/:id ─────────────────────────────────────────────
// Specific coin ticker by id (e.g. btc-bitcoin, eth-ethereum, sol-solana)
// Used as fallback when CoinGecko rate-limits the application (429 responses)
router.get('/tickers/:id', async (req, res) => {
    const { id } = req.params;
    const { quotes } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing coin id' });
    try {
        const data = await cached(`paprika_ticker_${id}_${quotes || 'USD'}`, async () => {
            const r = await axios.get(`${PAPRIKA_BASE}/tickers/${id}`, {
                params: quotes ? { quotes } : {},
                headers: PAPRIKA_HEADERS,
                timeout: 8000
            });
            return r.data;
        }, 15000); // 15 sec cache
        res.json(data);
    } catch (e) {
        res.status(502).json({ error: e.message, source: 'coinpaprika' });
    }
});

// ─── GET /api/paprika/ohlcv/:id ───────────────────────────────────────────────
// Latest OHLCV (Open High Low Close Volume) candle data for a coin
router.get('/ohlcv/:id', async (req, res) => {
    const { id } = req.params;
    const { quote } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing coin id' });
    try {
        const data = await cached(`paprika_ohlcv_${id}_${quote || 'USD'}`, async () => {
            const r = await axios.get(`${PAPRIKA_BASE}/coins/${id}/ohlcv/latest`, {
                params: quote ? { quote } : {},
                headers: PAPRIKA_HEADERS,
                timeout: 10000
            });
            return r.data;
        }, 60000); // 1 min cache — daily candles
        res.json(data);
    } catch (e) {
        res.status(502).json({ error: e.message, source: 'coinpaprika' });
    }
});

// ─── GET /api/paprika/coins/:id ───────────────────────────────────────────────
// Get detailed coin info: name, description, socials, whitepaper, etc.
router.get('/coins/:id', async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Missing coin id' });
    try {
        const data = await cached(`paprika_coin_${id}`, async () => {
            const r = await axios.get(`${PAPRIKA_BASE}/coins/${id}`, {
                headers: PAPRIKA_HEADERS,
                timeout: 10000
            });
            return r.data;
        }, 120000); // 2 min cache
        res.json(data);
    } catch (e) {
        res.status(502).json({ error: e.message, source: 'coinpaprika' });
    }
});

// ─── GET /api/paprika/exchanges ────────────────────────────────────────────────
// List all exchanges tracked by Coinpaprika
router.get('/exchanges', async (req, res) => {
    try {
        const data = await cached('paprika_exchanges', async () => {
            const r = await axios.get(`${PAPRIKA_BASE}/exchanges`, {
                headers: PAPRIKA_HEADERS,
                timeout: 10000
            });
            return r.data;
        }, 300000); // 5 min cache
        res.json(data);
    } catch (e) {
        res.status(502).json({ error: e.message, source: 'coinpaprika' });
    }
});

// ─── GET /api/paprika/search ───────────────────────────────────────────────────
// Search for coins, exchanges, icos, people or tags
router.get('/search', async (req, res) => {
    const { q, c, limit } = req.query;
    if (!q) return res.status(400).json({ error: 'Missing search query q' });
    try {
        const data = await cached(`paprika_search_${q}_${c}_${limit}`, async () => {
            const r = await axios.get(`${PAPRIKA_BASE}/search`, {
                params: { q, c, limit },
                headers: PAPRIKA_HEADERS,
                timeout: 8000
            });
            return r.data;
        }, 30000);
        res.json(data);
    } catch (e) {
        res.status(502).json({ error: e.message, source: 'coinpaprika' });
    }
});

module.exports = router;
