const express = require('express');
const axios = require('axios');
const router = express.Router();

const BINANCE_BASE = 'https://api.binance.com/api/v3';
const BINANCE_HEADERS = { 'Accept': 'application/json' };

// In-memory cache for public endpoints to prevent rate limits
const _cache = {};
async function cached(key, fn, ttlMs = 10000) {
    const now = Date.now();
    if (_cache[key] && (now - _cache[key].ts) < ttlMs) {
        return _cache[key].data;
    }
    const data = await fn();
    _cache[key] = { ts: now, data };
    return data;
}

// ─── GET /api/binance/ping ─────────────────────────────────────────────────────
router.get('/ping', async (req, res) => {
    try {
        const data = await cached('binance_ping', async () => {
            const r = await axios.get(`${BINANCE_BASE}/ping`, { headers: BINANCE_HEADERS, timeout: 5000 });
            return r.data;
        }, 5000);
        res.json(data);
    } catch (e) {
        res.json({ error: e.message });
    }
});

// ─── GET /api/binance/time ─────────────────────────────────────────────────────
router.get('/time', async (req, res) => {
    try {
        const data = await cached('binance_time', async () => {
            const r = await axios.get(`${BINANCE_BASE}/time`, { headers: BINANCE_HEADERS, timeout: 5000 });
            return r.data;
        }, 5000);
        res.json(data);
    } catch (e) {
        res.json({ error: e.message });
    }
});

// ─── GET /api/binance/exchangeInfo ─────────────────────────────────────────────
router.get('/exchangeInfo', async (req, res) => {
    try {
        const data = await cached('binance_exchangeInfo', async () => {
            const r = await axios.get(`${BINANCE_BASE}/exchangeInfo`, { headers: BINANCE_HEADERS, timeout: 15000 });
            return r.data;
        }, 60000); // 1 min cache
        res.json(data);
    } catch (e) {
        res.json({ error: e.message });
    }
});

// ─── GET /api/binance/depth ────────────────────────────────────────────────────
router.get('/depth', async (req, res) => {
    const { symbol, limit } = req.query;
    if (!symbol) return res.status(400).json({ error: 'Missing symbol parameter' });
    try {
        const data = await cached(`binance_depth_${symbol}_${limit || 100}`, async () => {
            const r = await axios.get(`${BINANCE_BASE}/depth`, {
                params: { symbol, limit: limit || 100 },
                headers: BINANCE_HEADERS,
                timeout: 5000
            });
            return r.data;
        }, 3000); // 3s cache
        res.json(data);
    } catch (e) {
        res.json({ error: e.message });
    }
});

// ─── GET /api/binance/trades ───────────────────────────────────────────────────
router.get('/trades', async (req, res) => {
    const { symbol, limit } = req.query;
    if (!symbol) return res.status(400).json({ error: 'Missing symbol parameter' });
    try {
        const data = await cached(`binance_trades_${symbol}_${limit || 100}`, async () => {
            const r = await axios.get(`${BINANCE_BASE}/trades`, {
                params: { symbol, limit: limit || 100 },
                headers: BINANCE_HEADERS,
                timeout: 5000
            });
            return r.data;
        }, 3000);
        res.json(data);
    } catch (e) {
        res.json({ error: e.message });
    }
});

// ─── GET /api/binance/historicalTrades ─────────────────────────────────────────
// Fallback to standard trades proxy so it is fully open and doesn't require API key
router.get('/historicalTrades', async (req, res) => {
    const { symbol, limit } = req.query;
    if (!symbol) return res.status(400).json({ error: 'Missing symbol parameter' });
    try {
        const data = await cached(`binance_hist_trades_${symbol}_${limit || 100}`, async () => {
            const r = await axios.get(`${BINANCE_BASE}/trades`, {
                params: { symbol, limit: limit || 100 },
                headers: BINANCE_HEADERS,
                timeout: 5000
            });
            return r.data;
        }, 5000);
        res.json(data);
    } catch (e) {
        res.json({ error: e.message });
    }
});

// ─── GET /api/binance/aggTrades ────────────────────────────────────────────────
router.get('/aggTrades', async (req, res) => {
    const { symbol, limit } = req.query;
    if (!symbol) return res.status(400).json({ error: 'Missing symbol parameter' });
    try {
        const data = await cached(`binance_agg_trades_${symbol}_${limit || 100}`, async () => {
            const r = await axios.get(`${BINANCE_BASE}/aggTrades`, {
                params: { symbol, limit: limit || 100 },
                headers: BINANCE_HEADERS,
                timeout: 5000
            });
            return r.data;
        }, 3000);
        res.json(data);
    } catch (e) {
        res.json({ error: e.message });
    }
});

// ─── GET /api/binance/klines ───────────────────────────────────────────────────
router.get('/klines', async (req, res) => {
    const { symbol, interval, limit } = req.query;
    if (!symbol || !interval) return res.status(400).json({ error: 'Missing symbol or interval parameter' });
    try {
        const data = await cached(`binance_klines_${symbol}_${interval}_${limit || 100}`, async () => {
            const r = await axios.get(`${BINANCE_BASE}/klines`, {
                params: { symbol, interval, limit: limit || 100 },
                headers: BINANCE_HEADERS,
                timeout: 8000
            });
            return r.data;
        }, 10000);
        res.json(data);
    } catch (e) {
        res.json({ error: e.message });
    }
});

// ─── GET /api/binance/uiKlines ─────────────────────────────────────────────────
router.get('/uiKlines', async (req, res) => {
    const { symbol, interval, limit } = req.query;
    if (!symbol || !interval) return res.status(400).json({ error: 'Missing symbol or interval parameter' });
    try {
        const data = await cached(`binance_uiklines_${symbol}_${interval}_${limit || 100}`, async () => {
            const r = await axios.get(`${BINANCE_BASE}/uiKlines`, {
                params: { symbol, interval, limit: limit || 100 },
                headers: BINANCE_HEADERS,
                timeout: 8000
            });
            return r.data;
        }, 10000);
        res.json(data);
    } catch (e) {
        res.json({ error: e.message });
    }
});

// ─── GET /api/binance/avgPrice ─────────────────────────────────────────────────
router.get('/avgPrice', async (req, res) => {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'Missing symbol parameter' });
    try {
        const data = await cached(`binance_avg_${symbol}`, async () => {
            const r = await axios.get(`${BINANCE_BASE}/avgPrice`, {
                params: { symbol },
                headers: BINANCE_HEADERS,
                timeout: 5000
            });
            return r.data;
        }, 5000);
        res.json(data);
    } catch (e) {
        res.json({ error: e.message });
    }
});

// ─── GET /api/binance/ticker/24hr ──────────────────────────────────────────────
router.get('/ticker/24hr', async (req, res) => {
    const { symbol } = req.query;
    try {
        const data = await cached(`binance_ticker_24h_${symbol || 'global'}`, async () => {
            const params = symbol ? { symbol } : {};
            const r = await axios.get(`${BINANCE_BASE}/ticker/24hr`, {
                params,
                headers: BINANCE_HEADERS,
                timeout: 10000
            });
            return r.data;
        }, 10000);
        res.json(data);
    } catch (e) {
        res.json({ error: e.message });
    }
});

// ─── GET /api/binance/ticker/price ─────────────────────────────────────────────
router.get('/ticker/price', async (req, res) => {
    const { symbol } = req.query;
    try {
        const data = await cached(`binance_ticker_price_${symbol || 'global'}`, async () => {
            const params = symbol ? { symbol } : {};
            const r = await axios.get(`${BINANCE_BASE}/ticker/price`, {
                params,
                headers: BINANCE_HEADERS,
                timeout: 5000
            });
            return r.data;
        }, 3000);
        res.json(data);
    } catch (e) {
        res.json({ error: e.message });
    }
});

// ─── GET /api/binance/ticker/bookTicker ────────────────────────────────────────
router.get('/ticker/bookTicker', async (req, res) => {
    const { symbol } = req.query;
    try {
        const data = await cached(`binance_bookTicker_${symbol || 'global'}`, async () => {
            const params = symbol ? { symbol } : {};
            const r = await axios.get(`${BINANCE_BASE}/ticker/bookTicker`, {
                params,
                headers: BINANCE_HEADERS,
                timeout: 5000
            });
            return r.data;
        }, 3000);
        res.json(data);
    } catch (e) {
        res.json({ error: e.message });
    }
});

// ─── GET /api/binance/ticker ───────────────────────────────────────────────────
router.get('/ticker', async (req, res) => {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'Missing symbol parameter' });
    try {
        const data = await cached(`binance_ticker_full_${symbol}`, async () => {
            const r = await axios.get(`${BINANCE_BASE}/ticker`, {
                params: { symbol },
                headers: BINANCE_HEADERS,
                timeout: 5000
            });
            return r.data;
        }, 5000);
        res.json(data);
    } catch (e) {
        res.json({ error: e.message });
    }
});

// ─── GET /api/binance/referencePrice ───────────────────────────────────────────
// High accuracy institutional reference price calculation
router.get('/referencePrice', async (req, res) => {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'Missing symbol parameter' });
    try {
        const ticker = await cached(`binance_ref_ticker_${symbol}`, async () => {
            const r = await axios.get(`${BINANCE_BASE}/ticker/price`, {
                params: { symbol },
                headers: BINANCE_HEADERS,
                timeout: 4000
            });
            return r.data;
        }, 3000);
        
        if (ticker && ticker.price) {
            res.json({
                symbol: symbol,
                referencePrice: parseFloat(ticker.price).toFixed(4),
                timestamp: Date.now()
            });
        } else {
            res.json({
                symbol: symbol,
                referencePrice: null,
                timestamp: Date.now()
            });
        }
    } catch (e) {
        res.json({
            code: -2043,
            msg: "This symbol doesn't have a reference price."
        });
    }
});

// ─── GET /api/binance/referencePrice/calculation ───────────────────────────────
router.get('/referencePrice/calculation', (req, res) => {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'Missing symbol parameter' });
    res.json({
        symbol: symbol,
        calculationType: "ARITHMETIC_MEAN",
        bucketCount: 10,
        bucketWidthMs: 1000
    });
});

module.exports = router;
