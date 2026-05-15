const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ── Real-Time Sync Logic (CoinGecko) ──────────────────────────────────────────
async function syncRealNFTs() {
    try {
        const axios = require('axios');
        console.log('[NFT-Sync] Fetching LIVE Mainnet Data from CoinGecko...');
        const geckoRes = await axios.get('https://api.coingecko.com/api/v3/nfts/markets', {
            params: { order: 'market_cap_usd_desc', per_page: 100, page: 1 },
            timeout: 10000
        });

        const collections = geckoRes.data;
        for (const item of collections) {
            const floorPrice = item.floor_price?.native_currency || item.floor_price_in_native_currency || 0;
            const cap = item.market_cap_24h || 0;
            const address = item.contract_address || item.id;
            const img = item.image?.large || item.image?.small || '';

            await db.query(
                `INSERT INTO nfts (name, symbol, contract_address, image_url, last_sell_price, market_cap, risk_factor, popularity, liquidity_changes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(contract_address) DO UPDATE SET
                    last_sell_price = excluded.last_sell_price,
                    market_cap = excluded.market_cap,
                    image_url = CASE WHEN excluded.image_url != '' THEN excluded.image_url ELSE nfts.image_url END,
                    popularity = popularity + 1`,
                [
                    item.name, item.symbol.toUpperCase(), address.toLowerCase(), img,
                    floorPrice, cap, (1 + Math.random() * 3).toFixed(2), 
                    Math.floor(Math.random() * 100), Math.floor(Math.random() * 50)
                ]
            );
        }
        console.log(`[NFT-Sync] ✅ Successfully synchronized ${collections.length} Live Mainnet Collections.`);
        return true;
    } catch (err) {
        console.error('[NFT-Sync] Error:', err.message);
        return false;
    }
}

// ── GET /api/nfts ────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    const { sort, filter, search, sync } = req.query;
    
    // Optional on-the-fly sync
    if (sync === 'true') await syncRealNFTs();

    let query = 'SELECT * FROM nfts WHERE image_url != ""';
    let params = [];

    if (search) {
        query += ' AND (name LIKE ? OR symbol LIKE ? OR contract_address LIKE ?)';
        const s = `%${search}%`;
        params.push(s, s, s);
    }

    // Sorting
    if (sort === 'price_high') query += ' ORDER BY CAST(last_sell_price AS REAL) DESC';
    else if (sort === 'price_low') query += ' ORDER BY CAST(last_sell_price AS REAL) ASC';
    else if (sort === 'market_cap') query += ' ORDER BY CAST(market_cap AS REAL) DESC';
    else query += ' ORDER BY CAST(market_cap AS REAL) DESC';

    query += ' LIMIT 100';

    try {
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

// ── GET /api/nfts/:address ────────────────────────────────────────────────────
router.get('/:address', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM nfts WHERE LOWER(contract_address) = LOWER(?)', [req.params.address]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'NFT not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch NFT detail' });
    }
});

// ── GET /api/nfts/history/:address ───────────────────────────────────────────
router.get('/history/:address', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM nft_trades WHERE LOWER(nft_address) = LOWER(?) ORDER BY timestamp DESC LIMIT 50',
            [req.params.address]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch trade history' });
    }
});

// ── POST /api/nfts/buy ────────────────────────────────────────────────────────
router.post('/buy', async (req, res) => {
    const { nft_address, buyer_wallet, price, tx_hash } = req.body;
    if (!nft_address || !buyer_wallet || !tx_hash) return res.status(400).json({ error: 'Missing data' });

    try {
        // Record trade
        await db.query(
            'INSERT INTO nft_trades (nft_address, buyer_wallet, price, tx_hash) VALUES (?, ?, ?, ?)',
            [nft_address.toLowerCase(), buyer_wallet.toLowerCase(), price, tx_hash]
        );

        // Update NFT stats
        await db.query(
            `UPDATE nfts SET 
                last_buy_price = ?, 
                last_sell_price = ?,
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

// ── SEEDING LOGIC (Triggers Live Sync) ──────────────────────────────────────
router.post('/seed', async (req, res) => {
    const success = await syncRealNFTs();
    if (success) {
        res.json({ success: true, message: 'Institutional NFT Registry synchronized with Live Mainnet data.' });
    } else {
        res.status(500).json({ error: 'Failed to synchronize with Live Mainnet. Verify network uplink.' });
    }
});

module.exports = router;
