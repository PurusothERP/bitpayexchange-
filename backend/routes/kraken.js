const express = require('express');
const axios = require('axios');
const router = express.Router();

const KRAKEN_BASE = 'https://api.kraken.com/0/public';
const KRAKEN_HEADERS = { 'Accept': 'application/json' };

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

// ─── GET /api/kraken/time ──────────────────────────────────────────────────────
router.get('/time', async (req, res) => {
    try {
        const data = await cached('kraken_time', async () => {
            const r = await axios.get(`${KRAKEN_BASE}/Time`, { headers: KRAKEN_HEADERS, timeout: 5000 });
            return r.data;
        }, 5000);
        res.json(data);
    } catch (e) {
        res.json({ error: e.message });
    }
});

// ─── GET /api/kraken/status ────────────────────────────────────────────────────
router.get('/status', async (req, res) => {
    try {
        const data = await cached('kraken_status', async () => {
            const r = await axios.get(`${KRAKEN_BASE}/SystemStatus`, { headers: KRAKEN_HEADERS, timeout: 5000 });
            return r.data;
        }, 10000);
        res.json(data);
    } catch (e) {
        res.json({ error: e.message });
    }
});

// ─── GET /api/kraken/assets ────────────────────────────────────────────────────
router.get('/assets', async (req, res) => {
    try {
        const data = await cached('kraken_assets', async () => {
            const r = await axios.get(`${KRAKEN_BASE}/Assets`, { headers: KRAKEN_HEADERS, timeout: 15000 });
            return r.data;
        }, 60000); // cache 1 minute
        res.json(data);
    } catch (e) {
        res.json({ error: e.message });
    }
});

// ─── GET /api/kraken/pairs ─────────────────────────────────────────────────────
router.get('/pairs', async (req, res) => {
    try {
        const data = await cached('kraken_pairs', async () => {
            const r = await axios.get(`${KRAKEN_BASE}/AssetPairs`, { headers: KRAKEN_HEADERS, timeout: 15000 });
            return r.data;
        }, 60000);
        res.json(data);
    } catch (e) {
        res.json({ error: e.message });
    }
});

// ─── GET /api/kraken/ticker ────────────────────────────────────────────────────
router.get('/ticker', async (req, res) => {
    const { pair } = req.query;
    if (!pair) return res.status(400).json({ error: 'Missing pair parameter' });
    try {
        const data = await cached(`kraken_ticker_${pair}`, async () => {
            const r = await axios.get(`${KRAKEN_BASE}/Ticker`, {
                params: { pair },
                headers: KRAKEN_HEADERS,
                timeout: 5000
            });
            return r.data;
        }, 3000); // 3 sec cache
        res.json(data);
    } catch (e) {
        res.json({ error: e.message });
    }
});

// ─── GET /api/kraken/candles ───────────────────────────────────────────────────
router.get('/candles', async (req, res) => {
    const { pair, interval, since } = req.query;
    if (!pair) return res.status(400).json({ error: 'Missing pair parameter' });
    try {
        const data = await cached(`kraken_candles_${pair}_${interval}_${since}`, async () => {
            const r = await axios.get(`${KRAKEN_BASE}/OHLC`, {
                params: { pair, interval, since },
                headers: KRAKEN_HEADERS,
                timeout: 10000
            });
            return r.data;
        }, 10000);
        res.json(data);
    } catch (e) {
        res.json({ error: e.message });
    }
});

// ─── GET /api/kraken/depth ─────────────────────────────────────────────────────
router.get('/depth', async (req, res) => {
    const { pair, count } = req.query;
    if (!pair) return res.status(400).json({ error: 'Missing pair parameter' });
    try {
        const data = await cached(`kraken_depth_${pair}_${count}`, async () => {
            const r = await axios.get(`${KRAKEN_BASE}/Depth`, {
                params: { pair, count },
                headers: KRAKEN_HEADERS,
                timeout: 5000
            });
            return r.data;
        }, 3000);
        res.json(data);
    } catch (e) {
        res.json({ error: e.message });
    }
});

// ─── GET /api/kraken/trades ────────────────────────────────────────────────────
router.get('/trades', async (req, res) => {
    const { pair, since } = req.query;
    if (!pair) return res.status(400).json({ error: 'Missing pair parameter' });
    try {
        const data = await cached(`kraken_trades_${pair}_${since}`, async () => {
            const r = await axios.get(`${KRAKEN_BASE}/Trades`, {
                params: { pair, since },
                headers: KRAKEN_HEADERS,
                timeout: 5000
            });
            return r.data;
        }, 3000);
        res.json(data);
    } catch (e) {
        res.json({ error: e.message });
    }
});

// ─── GET /api/kraken/spread ────────────────────────────────────────────────────
router.get('/spread', async (req, res) => {
    const { pair, since } = req.query;
    if (!pair) return res.status(400).json({ error: 'Missing pair parameter' });
    try {
        const data = await cached(`kraken_spread_${pair}_${since}`, async () => {
            const r = await axios.get(`${KRAKEN_BASE}/Spread`, {
                params: { pair, since },
                headers: KRAKEN_HEADERS,
                timeout: 5000
            });
            return r.data;
        }, 5000);
        res.json(data);
    } catch (e) {
        res.json({ error: e.message });
    }
});

// ─── PRIVATE SIMULATED ENDPOINTS ───────────────────────────────────────────────
// Used as fallback to keep account displays functioning beautifully

// ─── POST /api/kraken/private/Balance ───
router.post('/private/Balance', (req, res) => {
    res.json({
        error: [],
        result: {
            "ZUSD": "124500.52",
            "XXBT": "1.42850000",
            "XETH": "12.65000000",
            "SOL": "45.00000000",
            "KFEE": "250.00"
        }
    });
});

// ─── POST /api/kraken/private/BalanceEx ───
router.post('/private/BalanceEx', (req, res) => {
    res.json({
        error: [],
        result: {
            "ZUSD": { balance: "124500.52", hold: "0.00" },
            "XXBT": { balance: "1.42850000", hold: "0.05000000" },
            "XETH": { balance: "12.65000000", hold: "0.00" },
            "SOL": { balance: "45.00000000", hold: "2.00000000" }
        }
    });
});

// ─── POST /api/kraken/private/TradeBalance ───
router.post('/private/TradeBalance', (req, res) => {
    res.json({
        error: [],
        result: {
            eb: "148500.25", // equivalent balance
            tb: "124500.52", // trade balance
            m: "0.00",       // margin amount
            n: "4250.25",    // unrealized net profit/loss
            v: "152750.50",  // cost basis
            e: "152750.50",  // equity
            mf: "124500.52", // free margin
            ml: "0.00"       // margin level
        }
    });
});

// ─── POST /api/kraken/private/OpenOrders ───
router.post('/private/OpenOrders', (req, res) => {
    res.json({
        error: [],
        result: {
            open: {
                "O-KRAK-001": {
                    refid: null,
                    userref: 0,
                    status: "open",
                    opentm: Date.now() / 1000 - 3600,
                    descr: {
                        pair: "XBTUSD",
                        type: "buy",
                        ordertype: "limit",
                        price: "58200.0",
                        leverage: "none",
                        order: "buy 0.10000000 XBTUSD @ limit 58200.0"
                    },
                    vol: "0.10000000",
                    vol_exec: "0.00000000",
                    cost: "0.00000",
                    fee: "0.00000",
                    price: "0.00000",
                    stopprice: "0.00000",
                    limitprice: "0.00000",
                    misc: "",
                    oflags: "fciq"
                }
            }
        }
    });
});

// ─── POST /api/kraken/private/ClosedOrders ───
router.post('/private/ClosedOrders', (req, res) => {
    res.json({
        error: [],
        result: {
            closed: {
                "O-KRAK-002": {
                    refid: null,
                    userref: 0,
                    status: "closed",
                    opentm: Date.now() / 1000 - 7200,
                    closetm: Date.now() / 1000 - 7100,
                    descr: {
                        pair: "ETHUSD",
                        type: "sell",
                        ordertype: "market",
                        price: "3120.5",
                        leverage: "none",
                        order: "sell 2.00000000 ETHUSD @ market"
                    },
                    vol: "2.00000000",
                    vol_exec: "2.00000000",
                    cost: "6241.00",
                    fee: "15.60",
                    price: "3120.5",
                    stopprice: "0.00000",
                    limitprice: "0.00000",
                    misc: "",
                    oflags: "fciq"
                }
            }
        }
    });
});

// ─── POST /api/kraken/private/QueryOrders ───
router.post('/private/QueryOrders', (req, res) => {
    const { txid } = req.body;
    res.json({
        error: [],
        result: {
            [txid || "O-KRAK-001"]: {
                status: "open",
                opentm: Date.now() / 1000 - 3600,
                descr: {
                    pair: "XBTUSD",
                    type: "buy",
                    ordertype: "limit",
                    price: "58200.0",
                    order: "buy 0.10000000 XBTUSD @ limit 58200.0"
                },
                vol: "0.10000000",
                vol_exec: "0.00000000"
            }
        }
    });
});

// ─── POST /api/kraken/private/AddOrder ───
router.post('/private/AddOrder', (req, res) => {
    const { pair, type, ordertype, volume, price } = req.body;
    res.json({
        error: [],
        result: {
            descr: {
                order: `${type} ${volume} ${pair} @ ${ordertype} ${price || 'market'}`
            },
            txid: [
                "O-KRAK-" + Math.random().toString(36).substring(2, 8).toUpperCase()
            ]
        }
    });
});

// ─── POST /api/kraken/private/CancelOrder ───
router.post('/private/CancelOrder', (req, res) => {
    res.json({
        error: [],
        result: {
            count: 1,
            pending: true
        }
    });
});

module.exports = router;
