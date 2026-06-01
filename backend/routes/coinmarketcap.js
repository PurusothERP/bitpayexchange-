const express = require('express');
const axios = require('axios');
const router = express.Router();

const CMC_BASE = 'https://pro-api.coinmarketcap.com/v1';
const CMC_V2_BASE = 'https://pro-api.coinmarketcap.com/v2';
const PAPRIKA_BASE = 'https://api.coinpaprika.com/v1';

// In-memory cache
const _cache = {};
async function cached(key, fn, ttlMs = 30000) {
    const now = Date.now();
    if (_cache[key] && (now - _cache[key].ts) < ttlMs) return _cache[key].data;
    const data = await fn();
    _cache[key] = { ts: now, data };
    return data;
}

const CMC_KEY = process.env.CMC_API_KEY;

function cmcHeaders() {
    if (CMC_KEY) return { 'X-CMC_PRO_API_KEY': CMC_KEY, 'Accept': 'application/json' };
    return { 'Accept': 'application/json' };
}

// ─── GET /api/cmc/global ───────────────────────────────────────────────────────
// Global crypto market metrics. Falls back to Coinpaprika if no CMC key.
router.get('/global', async (req, res) => {
    try {
        const data = await cached('cmc_global', async () => {
            if (CMC_KEY) {
                const r = await axios.get(`${CMC_BASE}/global-metrics/quotes/latest`, {
                    headers: cmcHeaders(), timeout: 8000
                });
                return r.data;
            }
            // Fallback: Coinpaprika global stats
            const r = await axios.get(`${PAPRIKA_BASE}/global`, {
                headers: { Accept: 'application/json' }, timeout: 8000
            });
            return { data: r.data, source: 'coinpaprika_fallback' };
        }, 60000);
        res.json(data);
    } catch (e) {
        res.status(502).json({ error: e.message, source: 'cmc' });
    }
});

// ─── GET /api/cmc/listings ─────────────────────────────────────────────────────
// Top N cryptocurrency listings with price, market cap, volume. Falls back to Coinpaprika.
router.get('/listings', async (req, res) => {
    const { limit = 100, start = 1, convert = 'USD' } = req.query;
    try {
        const data = await cached(`cmc_listings_${start}_${limit}_${convert}`, async () => {
            if (CMC_KEY) {
                const r = await axios.get(`${CMC_BASE}/cryptocurrency/listings/latest`, {
                    params: { limit, start, convert },
                    headers: cmcHeaders(), timeout: 15000
                });
                return r.data;
            }
            // Fallback: Coinpaprika tickers (top coins by rank)
            const r = await axios.get(`${PAPRIKA_BASE}/tickers`, {
                params: { quotes: convert },
                headers: { Accept: 'application/json' }, timeout: 15000
            });
            const tickers = (r.data || [])
                .slice((parseInt(start) - 1), (parseInt(start) - 1) + parseInt(limit))
                .map(t => ({
                    id: t.id,
                    name: t.name,
                    symbol: t.symbol,
                    cmc_rank: t.rank,
                    quote: {
                        [convert]: {
                            price: t.quotes?.[convert]?.price || 0,
                            volume_24h: t.quotes?.[convert]?.volume_24h || 0,
                            percent_change_24h: t.quotes?.[convert]?.percent_change_24h || 0,
                            market_cap: t.quotes?.[convert]?.market_cap || 0
                        }
                    }
                }));
            return { data: tickers, source: 'coinpaprika_fallback' };
        }, 30000);
        res.json(data);
    } catch (e) {
        res.status(502).json({ error: e.message, source: 'cmc' });
    }
});

// ─── GET /api/cmc/quotes ───────────────────────────────────────────────────────
// Get latest price quotes for specific symbols (e.g. ?symbol=BTC,ETH,SOL)
router.get('/quotes', async (req, res) => {
    const { symbol, id, convert = 'USD' } = req.query;
    if (!symbol && !id) return res.status(400).json({ error: 'Missing symbol or id parameter' });
    try {
        const cacheKey = `cmc_quotes_${symbol || id}_${convert}`;
        const data = await cached(cacheKey, async () => {
            if (CMC_KEY) {
                const params = { convert };
                if (symbol) params.symbol = symbol;
                if (id) params.id = id;
                const r = await axios.get(`${CMC_V2_BASE}/cryptocurrency/quotes/latest`, {
                    params, headers: cmcHeaders(), timeout: 8000
                });
                return r.data;
            }
            // Fallback: resolve each symbol via Coinpaprika
            const symbols = (symbol || '').split(',').map(s => s.trim().toLowerCase());
            const results = {};
            for (const sym of symbols) {
                try {
                    const paprikaId = `${sym}-${sym}`; // rough estimate
                    const r = await axios.get(`${PAPRIKA_BASE}/tickers/${paprikaId}-${sym}`, {
                        headers: { Accept: 'application/json' }, timeout: 5000
                    }).catch(() => null);
                    if (r?.data?.quotes) {
                        results[sym.toUpperCase()] = [{
                            id: r.data.id,
                            name: r.data.name,
                            symbol: r.data.symbol,
                            quote: {
                                [convert]: {
                                    price: r.data.quotes?.[convert]?.price || 0,
                                    percent_change_24h: r.data.quotes?.[convert]?.percent_change_24h || 0,
                                    market_cap: r.data.quotes?.[convert]?.market_cap || 0,
                                }
                            }
                        }];
                    }
                } catch {}
            }
            return { data: results, source: 'coinpaprika_fallback' };
        }, 15000);
        res.json(data);
    } catch (e) {
        res.status(502).json({ error: e.message, source: 'cmc' });
    }
});

// ─── GET /api/cmc/trending ─────────────────────────────────────────────────────
// Trending cryptocurrency gainers and losers by volume
router.get('/trending', async (req, res) => {
    const { time_period = '24h', limit = 10 } = req.query;
    try {
        const data = await cached(`cmc_trending_${time_period}_${limit}`, async () => {
            if (CMC_KEY) {
                const r = await axios.get(`${CMC_BASE}/cryptocurrency/trending/gainers-losers`, {
                    params: { time_period, limit },
                    headers: cmcHeaders(), timeout: 8000
                });
                return r.data;
            }
            // Fallback: Coinpaprika tickers sorted by 24h volume change
            const r = await axios.get(`${PAPRIKA_BASE}/tickers`, {
                headers: { Accept: 'application/json' }, timeout: 10000
            });
            const sorted = (r.data || [])
                .filter(t => t.quotes?.USD?.percent_change_24h != null)
                .sort((a, b) => Math.abs(b.quotes.USD.percent_change_24h) - Math.abs(a.quotes.USD.percent_change_24h))
                .slice(0, parseInt(limit));
            return { data: sorted, source: 'coinpaprika_fallback' };
        }, 60000);
        res.json(data);
    } catch (e) {
        res.status(502).json({ error: e.message, source: 'cmc' });
    }
});

// ─── GET /api/cmc/info ─────────────────────────────────────────────────────────
// Get static metadata for a coin (logo, website, social links) by symbol or id
router.get('/info', async (req, res) => {
    const { symbol, id } = req.query;
    if (!symbol && !id) return res.status(400).json({ error: 'Missing symbol or id' });
    try {
        const cacheKey = `cmc_info_${symbol || id}`;
        const data = await cached(cacheKey, async () => {
            if (CMC_KEY) {
                const params = {};
                if (symbol) params.symbol = symbol;
                if (id) params.id = id;
                const r = await axios.get(`${CMC_V2_BASE}/cryptocurrency/info`, {
                    params, headers: cmcHeaders(), timeout: 8000
                });
                return r.data;
            }
            // Fallback: Coinpaprika coin info
            const sym = (symbol || id || '').toLowerCase();
            const r = await axios.get(`${PAPRIKA_BASE}/coins/${sym}-${sym}`, {
                headers: { Accept: 'application/json' }, timeout: 8000
            }).catch(() => null);
            return { data: r?.data || {}, source: 'coinpaprika_fallback' };
        }, 300000);
        res.json(data);
    } catch (e) {
        res.status(502).json({ error: e.message, source: 'cmc' });
    }
});

// ─── GET /api/cmc/status ───────────────────────────────────────────────────────
// Check CMC API key status and rate limits
router.get('/status', (req, res) => {
    res.json({
        has_api_key: !!CMC_KEY,
        api_base: CMC_BASE,
        fallback: 'Coinpaprika (keyless)',
        status: CMC_KEY ? 'live' : 'fallback_mode'
    });
});

module.exports = router;
