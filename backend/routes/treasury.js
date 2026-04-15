const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ── GET /api/treasury/transfers ───────────────────────────────────────────────
// Returns recorded treasury transfers with optional time filtering
router.get('/transfers', async (req, res) => {
    const { days, start, end } = req.query;
    let query = `SELECT * FROM treasury_transfers`;
    let params = [];

    if (start && end) {
        query += ` WHERE timestamp BETWEEN ? AND ?`;
        params.push(start, end);
    } else if (days && days !== 'all') {
        const amount = parseInt(days);
        const unit = days.toLowerCase().endsWith('h') ? 'hours' : 'days';
        query += ` WHERE timestamp >= datetime('now', '-' || ? || ' ' || ?)`;
        params.push(amount.toString(), unit);
    }

    query += ` ORDER BY timestamp DESC LIMIT 1000`;

    try {
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch treasury transfers', details: err.message });
    }
});

// ── GET /api/treasury/stats ───────────────────────────────────────────────────
// Summary stats for admin
router.get('/stats', async (req, res) => {
    try {
        const totals = await db.query(`
            SELECT
                SUM(amount_bnb) as total_bnb,
                COUNT(*) as total_transfers,
                COUNT(CASE WHEN transfer_type = 'trading_fee' THEN 1 END) as fee_transfers,
                COUNT(CASE WHEN transfer_type = 'migration_fee' THEN 1 END) as migration_transfers,
                COUNT(CASE WHEN transfer_type LIKE '%sweep%' THEN 1 END) as sweep_transfers
            FROM treasury_transfers
        `);
        const tradeStats = await db.query(`
            SELECT
                COUNT(*) as total_trades,
                COUNT(CASE WHEN trade_type = 'buy' THEN 1 END) as buys,
                COUNT(CASE WHEN trade_type = 'sell' THEN 1 END) as sells,
                SUM(amount_bnb) as total_volume_bnb,
                SUM(fee_bnb) as total_fees_bnb
            FROM trades
        `);
        res.json({
            treasury: totals.rows[0] || {},
            trading: tradeStats.rows[0] || {}
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stats', details: err.message });
    }
});

// ── POST /api/treasury/log ────────────────────────────────────────────────────
// Manually log a treasury collection event (admin direct BNB sends, etc.)
router.post('/log', async (req, res) => {
    const { amount_bnb, source_contract, destination_address, tx_hash, transfer_type } = req.body;
    if (!amount_bnb || !tx_hash) {
        return res.status(400).json({ error: 'amount_bnb and tx_hash are required' });
    }
    try {
        await db.query(
            `INSERT INTO treasury_transfers (amount_bnb, source_contract, destination_address, tx_hash, transfer_type)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (tx_hash) DO NOTHING`,
            [
                parseFloat(amount_bnb),
                source_contract || 'manual',
                destination_address || '',
                tx_hash,
                transfer_type || 'manual_collection'
            ]
        );
        res.json({ success: true, message: 'Treasury transfer logged.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to log treasury transfer', details: err.message });
    }
});

module.exports = router;
