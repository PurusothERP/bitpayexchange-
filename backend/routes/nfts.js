const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ── GET /api/nfts ────────────────────────────────────────────────────────────
// Returns filtered/sorted list of top NFTs
router.get('/', async (req, res) => {
    const { sort, filter, search } = req.query;
    
    let query = 'SELECT * FROM nfts WHERE 1=1';
    let params = [];

    if (search) {
        query += ' AND (name LIKE ? OR symbol LIKE ? OR contract_address LIKE ?)';
        const s = `%${search}%`;
        params.push(s, s, s);
    }

    // Filters
    if (filter === 'new') {
        query += ' AND created_at > datetime("now", "-7 days")';
    } else if (filter === 'mintable') {
        query += ' AND mintable = 1';
    }

    // Sorting
    if (sort === 'price_high') query += ' ORDER BY last_sell_price DESC';
    else if (sort === 'price_low') query += ' ORDER BY last_sell_price ASC';
    else if (sort === 'popularity') query += ' ORDER BY popularity DESC';
    else if (sort === 'market_cap') query += ' ORDER BY market_cap DESC';
    else if (sort === 'trending') query += ' ORDER BY liquidity_changes DESC';
    else query += ' ORDER BY market_cap DESC';

    query += ' LIMIT 500';

    try {
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch NFTs' });
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

// ── SEEDING LOGIC (Internal) ──────────────────────────────────────────────────
router.post('/seed', async (req, res) => {
    const topNfts = [
        { name: 'Bored Ape Yacht Club', symbol: 'BAYC', address: '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d', img: 'https://i.seadn.io/gae/Ju9CVP8ZXYicSthI7n5QCvmXyzpqcHnyS_P083y810W-3K6v_h6T6hS1uH8v5s1l5f_7f0r_f9_9?auto=format&w=256', cap: 500000, price: 12.5 },
        { name: 'CryptoPunks', symbol: 'PUNK', address: '0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb', img: 'https://i.seadn.io/gae/yNi69U6u6Z5p9i5Y5z5Y5z5Y5z5Y5z5Y5z5Y5z5Y5z5Y5z5Y5z5Y5z5Y5z5Y5z5Y?auto=format&w=256', cap: 1000000, price: 25.8 },
        { name: 'Azuki', symbol: 'AZUKI', address: '0xed5af388653567af2f388e6224dc7c4b3241c544', img: 'https://i.seadn.io/gae/H-eyH_6N09uY4B04B04B04B04B04B04B04B04B04B04B04B04B04B04B04B04B04?auto=format&w=256', cap: 150000, price: 5.2 },
        { name: 'Mutant Ape Yacht Club', symbol: 'MAYC', address: '0x60e4d786628fea580b5990c04f9b1f1f6c95d971', img: 'https://i.seadn.io/gae/lHex_9B6p3Z6p3Z6p3Z6p3Z6p3Z6p3Z6p3Z6p3Z6p3Z6p3Z6p3Z6p3Z6p3Z6p3Z?auto=format&w=256', cap: 200000, price: 2.8 },
        { name: 'Doodles', symbol: 'DOODLE', address: '0x8a90cab2b38b6c8435213e5de70bc2d4a51f1adb', img: 'https://i.seadn.io/gae/7B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B?auto=format&w=256', cap: 80000, price: 1.4 },
        { name: 'Pudgy Penguins', symbol: 'PPG', address: '0xbd3531da5cf5857e7cfaa92426877b022e612cf8', img: 'https://i.seadn.io/gae/yNi69U6u6Z5p9i5Y5z5Y5z5Y5z5Y5z5Y5z5Y5z5Y5z5Y5z5Y5z5Y5z5Y5z5Y5z5Y?auto=format&w=256', cap: 120000, price: 8.5 }
    ];

    try {
        for (let i = 0; i < 500; i++) {
            const template = topNfts[i % topNfts.length];
            const name = i < topNfts.length ? template.name : `${template.name} #${i}`;
            const symbol = i < topNfts.length ? template.symbol : `${template.symbol}${i}`;
            const address = i < topNfts.length ? template.address : `0x${Math.random().toString(16).slice(2, 42)}`;
            const cap = template.cap * (0.8 + Math.random() * 0.4);
            const price = template.price * (0.8 + Math.random() * 0.4);
            const risk = (Math.random() * 15).toFixed(2);
            const supply = 10000;
            const circulation = Math.floor(supply * (0.5 + Math.random() * 0.5));

            await db.query(
                `INSERT INTO nfts (name, symbol, contract_address, image_url, total_supply, circulating_supply, mintable, liquidity_changes, high_52w, low_52w, last_sell_price, risk_factor, market_cap, creator_address, popularity)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(contract_address) DO NOTHING`,
                [
                    name, symbol, address.toLowerCase(), template.img, 
                    supply.toString(), circulation.toString(), 
                    Math.random() > 0.7 ? 1 : 0, 
                    Math.floor(Math.random() * 1000),
                    (price * 1.5).toFixed(4), (price * 0.5).toFixed(4),
                    price.toFixed(4), risk, cap.toFixed(2), 
                    `0x${Math.random().toString(16).slice(2, 42)}`,
                    Math.floor(Math.random() * 100)
                ]
            );
        }
        res.json({ success: true, message: '500 NFTs seeded' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
