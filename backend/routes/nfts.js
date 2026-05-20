const express = require('express');
const router = express.Router();
const db = require('../config/db');
const axios = require('axios');

// ── Bulk Real-Time Sync (CoinGecko — 500+ Mainnet Collections) ───────────────
async function syncRealNFTs() {
    try {
        console.log('[NFT-Sync] 🚀 Bulk-fetching 500+ Mainnet NFT Collections from CoinGecko...');
        const PAGES = 6; // 6 × 100 = 600 collections
        let total = 0;

        for (let page = 1; page <= PAGES; page++) {
            try {
                const geckoRes = await axios.get('https://api.coingecko.com/api/v3/nfts/markets', {
                    params: {
                        order: 'market_cap_usd_asc', // asc = low to high floor price
                        per_page: 100,
                        page
                    },
                    timeout: 15000
                });

                const collections = geckoRes.data || [];
                if (!collections.length) break;

                for (const item of collections) {
                    const floorPrice = parseFloat(
                        item.floor_price?.native_currency ??
                        item.floor_price_in_native_currency ?? 0
                    ) || 0;
                    const cap       = parseFloat(item.market_cap_24h || item.market_cap || 0) || 0;
                    const address   = (item.contract_address || item.id || '').toLowerCase();
                    const img       = item.image?.large || item.image?.small || item.image?.thumb || '';
                    const symbol    = (item.symbol || item.id || 'NFT').toUpperCase();
                    const name      = item.name || 'Unknown Collection';
                    const vol24h    = parseFloat(item.volume_24h?.native_currency || item.total_volume || 0) || 0;
                    const holders   = parseInt(item.number_of_unique_addresses || 0) || 0;
                    const sales24h  = parseInt(item.sales_24h || 0) || 0;
                    const native    = item.native_currency || 'ETH';

                    if (!address) continue;

                    await db.query(
                        `INSERT INTO nfts 
                            (name, symbol, contract_address, image_url, last_sell_price, market_cap,
                             risk_factor, popularity, liquidity_changes)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                         ON CONFLICT(contract_address) DO UPDATE SET
                            last_sell_price  = excluded.last_sell_price,
                            market_cap       = excluded.market_cap,
                            image_url        = CASE WHEN excluded.image_url != '' THEN excluded.image_url ELSE nfts.image_url END,
                            popularity       = excluded.popularity`,
                        [
                            name,
                            symbol,
                            address,
                            img,
                            floorPrice,
                            cap,
                            parseFloat((1 + Math.random() * 3).toFixed(2)),
                            holders || sales24h * 10 || Math.floor(Math.random() * 100),
                            vol24h > 0 ? Math.floor(vol24h * 10) : Math.floor(Math.random() * 50)
                        ]
                    );
                    total++;
                }

                console.log(`[NFT-Sync] ✅ Page ${page}/${PAGES} — ${total} collections indexed so far`);
                // Respect CoinGecko rate limit (free tier ~30 req/min)
                await new Promise(r => setTimeout(r, 2200));
            } catch (pageErr) {
                console.warn(`[NFT-Sync] ⚠️ Page ${page} failed: ${pageErr.message}`);
                await new Promise(r => setTimeout(r, 3000));
            }
        }

        console.log(`[NFT-Sync] 🏁 Sync complete — ${total} real mainnet NFTs indexed.`);
        return total;
    } catch (err) {
        console.error('[NFT-Sync] Fatal Error:', err.message);
        return 0;
    }
}

// ── Auto-sync on startup (non-blocking) ──────────────────────────────────────
(async () => {
    try {
        const count = await db.query('SELECT COUNT(*) as cnt FROM nfts WHERE image_url != ""');
        const existing = count?.rows?.[0]?.cnt || 0;
        if (existing < 100) {
            console.log(`[NFT-Sync] Only ${existing} NFTs in DB — triggering initial bulk sync...`);
            syncRealNFTs();
        } else {
            console.log(`[NFT-Sync] ${existing} NFTs already indexed. Skipping startup sync.`);
        }
    } catch (_) {
        syncRealNFTs();
    }
})();

// ── GET /api/nfts ─────────────────────────────────────────────────────────────
// Params: sort, search, page, limit, sync
router.get('/', async (req, res) => {
    const { sort = 'price_low', search, page = 1, limit = 100, sync } = req.query;

    if (sync === 'true') {
        // Fire-and-forget background sync
        syncRealNFTs().catch(() => {});
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = 'WHERE image_url != ""';
    let params = [];

    if (search) {
        where += ' AND (name LIKE ? OR symbol LIKE ? OR contract_address LIKE ?)';
        const s = `%${search}%`;
        params.push(s, s, s);
    }

    // Sorting — default: price low to high (floor price ascending)
    let orderBy = 'ORDER BY CAST(last_sell_price AS REAL) ASC';
    if (sort === 'price_high')  orderBy = 'ORDER BY CAST(last_sell_price AS REAL) DESC';
    if (sort === 'price_low')   orderBy = 'ORDER BY CAST(last_sell_price AS REAL) ASC';
    if (sort === 'market_cap')  orderBy = 'ORDER BY CAST(market_cap AS REAL) DESC';
    if (sort === 'popularity')  orderBy = 'ORDER BY popularity DESC';

    const limitVal = Math.min(parseInt(limit) || 100, 200);

    try {
        const [result, countRes] = await Promise.all([
            db.query(
                `SELECT * FROM nfts ${where} ${orderBy} LIMIT ? OFFSET ?`,
                [...params, limitVal, offset]
            ),
            db.query(`SELECT COUNT(*) as total FROM nfts ${where}`, params)
        ]);

        res.json({
            nfts: result.rows || [],
            total: countRes?.rows?.[0]?.total || 0,
            page: parseInt(page),
            limit: limitVal
        });
    } catch (err) {
        console.error('[NFT GET]', err.message);
        res.status(500).json({ error: 'Failed to fetch NFTs', nfts: [], total: 0 });
    }
});

// ── GET /api/nfts/count ───────────────────────────────────────────────────────
router.get('/count', async (req, res) => {
    try {
        const r = await db.query('SELECT COUNT(*) as total FROM nfts WHERE image_url != ""');
        res.json({ total: r?.rows?.[0]?.total || 0 });
    } catch (_) {
        res.json({ total: 0 });
    }
});

// ── GET /api/nfts/:address ────────────────────────────────────────────────────
router.get('/:address', async (req, res) => {
    if (req.params.address === 'count') return; // handled above
    try {
        const result = await db.query(
            'SELECT * FROM nfts WHERE LOWER(contract_address) = LOWER(?)',
            [req.params.address]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'NFT not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch NFT detail' });
    }
});

// ── GET /api/nfts/portfolio/:address ───────────────────────────────────────────
router.get('/portfolio/:address', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT n.* FROM nfts n
            JOIN nft_trades t ON LOWER(n.contract_address) = LOWER(t.nft_address)
            WHERE LOWER(t.buyer_wallet) = LOWER(?) AND t.type = 'buy'
            GROUP BY n.contract_address
        `, [req.params.address]);
        res.json(result.rows || []);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch portfolio' });
    }
});

// ── GET /api/nfts/history/:address ───────────────────────────────────────────
router.get('/history/:address', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM nft_trades WHERE LOWER(nft_address) = LOWER(?) ORDER BY timestamp DESC LIMIT 50',
            [req.params.address]
        );
        res.json(result.rows || []);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch trade history' });
    }
});

// ── POST /api/nfts/buy ────────────────────────────────────────────────────────
router.post('/buy', async (req, res) => {
    const { nft_address, buyer_wallet, price, tx_hash } = req.body;
    if (!nft_address || !buyer_wallet || !tx_hash)
        return res.status(400).json({ error: 'Missing required fields' });

    try {
        await db.query(
            'INSERT INTO nft_trades (nft_address, buyer_wallet, price, tx_hash) VALUES (?, ?, ?, ?)',
            [nft_address.toLowerCase(), buyer_wallet.toLowerCase(), price, tx_hash]
        );
        await db.query(
            `UPDATE nfts SET
                last_buy_price = ?, last_sell_price = ?,
                liquidity_changes = liquidity_changes + 1,
                popularity = popularity + 5
             WHERE LOWER(contract_address) = LOWER(?)`,
            [price, price, nft_address]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Purchase recording failed' });
    }
});

// ── POST /api/nfts/seed ───────────────────────────────────────────────────────
router.post('/seed', async (req, res) => {
    res.json({ success: true, message: 'Bulk sync started in background. Check server logs.' });
    syncRealNFTs().catch(() => {});
});

module.exports = router;
