const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ── GET /api/trades/:tokenAddress ─────────────────────────────────────────────
// Returns all trades for a specific token (for chart / trading history)
router.get('/:tokenAddress', async (req, res) => {
    const { tokenAddress } = req.params;
    if (!tokenAddress.startsWith('0x') || tokenAddress.length !== 42) {
        return res.status(400).json({ error: 'Invalid token address' });
    }
    try {
        const result = await db.query(
            `SELECT * FROM trades WHERE LOWER(token_address) = LOWER(?) ORDER BY timestamp DESC LIMIT 500`,
            [tokenAddress]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch trades', details: err.message });
    }
});

// ── GET /api/trades/:tokenAddress/chart ───────────────────────────────────────
// Returns price history for chart rendering
router.get('/:tokenAddress/chart', async (req, res) => {
    const { tokenAddress } = req.params;
    try {
        const result = await db.query(
            `SELECT price_bnb, collateral_bnb, timestamp FROM price_history
             WHERE LOWER(token_address) = LOWER(?) ORDER BY timestamp ASC LIMIT 200`,
            [tokenAddress]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch chart data', details: err.message });
    }
});

// ── GET /api/trades/:tokenAddress/stats ───────────────────────────────────────
// Returns 24h volume, buy/sell counts, price change
router.get('/:tokenAddress/stats', async (req, res) => {
    const { tokenAddress } = req.params;
    try {
        const since24h = new Date(Date.now() - 86400000).toISOString();
        const stats = await db.query(`
            SELECT
                COUNT(*) as total_trades,
                COUNT(CASE WHEN trade_type = 'buy' THEN 1 END) as buys,
                COUNT(CASE WHEN trade_type = 'sell' THEN 1 END) as sells,
                SUM(amount_bnb) as volume_24h,
                MAX(price_bnb) as price_high,
                MIN(price_bnb) as price_low,
                MAX(CASE WHEN trade_type = 'buy' THEN price_bnb END) as last_buy_price
            FROM trades
            WHERE LOWER(token_address) = LOWER(?) AND timestamp >= ?
        `, [tokenAddress, since24h]);

        const firstPrice = await db.query(`
            SELECT price_bnb FROM price_history WHERE LOWER(token_address) = LOWER(?) ORDER BY timestamp ASC LIMIT 1
        `, [tokenAddress]);

        const lastPrice = await db.query(`
            SELECT price_bnb FROM price_history WHERE LOWER(token_address) = LOWER(?) ORDER BY timestamp DESC LIMIT 1
        `, [tokenAddress]);

        const s = stats.rows[0] || {};
        const fp = firstPrice.rows[0]?.price_bnb || 0;
        const lp = lastPrice.rows[0]?.price_bnb || 0;
        const change24h = fp > 0 ? ((lp - fp) / fp) * 100 : 0;

        res.json({
            ...s,
            price_change_24h: change24h.toFixed(2),
            current_price: lp
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stats', details: err.message });
    }
});

router.get('/:tokenAddress/stats', async (req, res) => {
    // Existing stats logic...
});

// ── POST /api/trades/sync ────────────────────────────────────────────────────
// Sync on-chain trade with DB
router.post('/sync', async (req, res) => {
    const { tokenAddress, buyerWallet, amount, amountBNB, priceBNB, txHash, tradeType } = req.body;
    
    try {
        // 1. Check if token is delisted
        const tokenCheck = await db.query('SELECT is_delisted FROM tokens WHERE LOWER(contract_address) = LOWER(?)', [tokenAddress]);
        if (tokenCheck.rows[0]?.is_delisted === 1) {
            return res.status(403).json({ error: 'TOKEN DELISTED: Trading is permanently disabled for this asset.' });
        }

        // 2. Insert trade (1% fee tracking)
        const fee = parseFloat(amountBNB || 0) * 0.01;
        await db.query(`
            INSERT INTO trades (token_address, trader_wallet, amount_tokens, amount_bnb, price_bnb, tx_hash, trade_type, fee_bnb)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [tokenAddress, buyerWallet, amount, amountBNB, priceBNB, txHash, tradeType || 'buy', fee]);

        // 2.5 Log to treasury_transfers for Admin Dashboard Inflow
        if (fee > 0) {
            await db.query(`
                INSERT INTO treasury_transfers (amount_bnb, source_contract, destination_address, tx_hash, transfer_type)
                VALUES (?, ?, ?, ?, 'trading_fee')
            `, [fee, tokenAddress, '0x6451ee4def4a8b8fbc2c64301a79e267de378935', txHash]);
        }

        // 3. Update token's last trade activity
        await db.query(`
            UPDATE tokens SET last_trade_at = CURRENT_TIMESTAMP WHERE LOWER(contract_address) = LOWER(?)
        `, [tokenAddress]);

        res.json({ success: true, fee_logged: fee });
    } catch (err) {
        console.error('Trade sync error:', err);
        res.status(500).json({ error: 'Failed to sync trade' });
    }
});

module.exports = router;
