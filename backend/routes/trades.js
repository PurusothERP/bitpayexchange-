const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ── GET /api/trades/history/:tokenAddress ──────────────────────────────────────
router.get('/history/:tokenAddress', async (req, res) => {
    const { tokenAddress } = req.params;
    if (!tokenAddress || tokenAddress.length < 3) {
        return res.status(400).json({ error: 'Invalid token identifier' });
    }
    try {
        const result = await db.query(
            `SELECT * FROM trades WHERE LOWER(token_address) = LOWER(?) ORDER BY timestamp DESC LIMIT 200`,
            [tokenAddress]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch trade history' });
    }
});

// ── GET /api/trades/chart/:tokenAddress ───────────────────────────────────────
router.get('/chart/:tokenAddress', async (req, res) => {
    const { tokenAddress } = req.params;
    try {
        const result = await db.query(
            `SELECT price_bnb as price, timestamp as time FROM price_history
             WHERE LOWER(token_address) = LOWER(?) ORDER BY timestamp ASC LIMIT 500`,
            [tokenAddress]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch chart data' });
    }
});

// ── GET /api/trades/market/:tokenAddress ──────────────────────────────────────
router.get('/market/:tokenAddress', async (req, res) => {
    const { tokenAddress } = req.params;
    try {
        const stats = await db.query(`
            SELECT
                SUM(amount_bnb) as volume_24h,
                MAX(price_bnb) as high_24h,
                MIN(price_bnb) as low_24h
            FROM trades
            WHERE LOWER(token_address) = LOWER(?) AND timestamp >= DATETIME('now', '-1 day')
        `, [tokenAddress]);

        const priceResult = await db.query(`
            SELECT price_bnb FROM price_history WHERE LOWER(token_address) = LOWER(?) ORDER BY timestamp DESC LIMIT 1
        `, [tokenAddress]);

        res.json({
            ...stats.rows[0],
            current_price: priceResult.rows[0]?.price_bnb || 0
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch market stats' });
    }
});

router.get('/:tokenAddress/stats', async (req, res) => {
    // Existing stats logic...
});

// ── POST /api/trades/sync ────────────────────────────────────────────────────
// Sync on-chain trade with DB
router.post('/sync', async (req, res) => {
    const { tokenAddress, tokenSymbol, buyerWallet, amount, amountBNB, priceBNB, txHash, tradeType, pnl_bnb, positionId } = req.body;
    
    try {
        // 1. Check if token is delisted
        const tokenCheck = await db.query('SELECT is_delisted FROM tokens WHERE LOWER(contract_address) = LOWER(?)', [tokenAddress]);
        if (tokenCheck.rows[0]?.is_delisted === 1) {
            return res.status(403).json({ error: 'TOKEN DELISTED: Trading is permanently disabled for this asset.' });
        }

        // 2. Insert trade
        const feePercent = (tradeType === 'futures' || tradeType === 'spot_exchange' || tradeType === 'futures_open') ? 0.00001 : 0.01;
        const fee = parseFloat(amountBNB || 0) * feePercent;
        
        await db.query(`
            INSERT INTO trades (token_address, token_symbol, trader_wallet, amount_tokens, amount_bnb, price_bnb, tx_hash, trade_type, fee_bnb, pnl_bnb, position_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [tokenAddress, tokenSymbol || 'BNB', buyerWallet, amount, amountBNB, priceBNB, txHash, tradeType || 'buy', fee, pnl_bnb || 0, positionId]);

        // 2.5 Log to treasury_transfers for Admin Dashboard Inflow
        if (fee > 0) {
            await db.query(`
                INSERT INTO treasury_transfers (amount_bnb, asset, amount_usd, source_contract, destination_address, tx_hash, transfer_type)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [fee, 'BNB', 0, tokenAddress, process.env.FEE_WALLET || '0x6451ee4def4a8b8fbc2c64301a79e267de378935', txHash, tradeType === 'futures' ? 'futures_fee' : 'trading_fee']);
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
