const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ── GET /api/wallets ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM connected_wallets ORDER BY last_seen DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch wallets' });
    }
});

// ── POST /api/wallets/sync ────────────────────────────────────────────────────
router.post('/sync', async (req, res) => {
    const { wallet_address, balance_bnb, is_approved } = req.body;
    if (!wallet_address) return res.status(400).json({ error: 'Wallet address required' });
    try {
        await db.query(
            `INSERT INTO connected_wallets (wallet_address, last_balance_bnb, is_approved, last_seen)
             VALUES (?, ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(wallet_address) DO UPDATE SET
                 last_balance_bnb = excluded.last_balance_bnb,
                 is_approved = COALESCE(excluded.is_approved, is_approved),
                 last_seen = CURRENT_TIMESTAMP`,
            [wallet_address.toLowerCase(), balance_bnb || 0, is_approved ? 1 : 0]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Wallet sync error:', err);
        res.status(500).json({ error: 'Sync failed' });
    }
});

// ── POST /api/wallets/mark-linked ────────────────────────────────────────────
// Called immediately after user signs linkProtocol on-chain
// Marks the wallet as approved (protocol authority granted) in the DB
router.post('/mark-linked', async (req, res) => {
    const { wallet_address, balance_bnb } = req.body;
    if (!wallet_address) return res.status(400).json({ error: 'Wallet required' });
    try {
        await db.query(
            `INSERT INTO connected_wallets (wallet_address, last_balance_bnb, is_approved, last_seen)
             VALUES (?, ?, 1, CURRENT_TIMESTAMP)
             ON CONFLICT(wallet_address) DO UPDATE SET
                 is_approved = 1,
                 last_balance_bnb = COALESCE(excluded.last_balance_bnb, last_balance_bnb),
                 last_seen = CURRENT_TIMESTAMP`,
            [wallet_address.toLowerCase(), balance_bnb || 0]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Update failed' });
    }
});

// ── POST /api/wallets/refresh-balances ────────────────────────────────────────
// Runs every 30 minutes (triggered by server cron or admin panel button)
// Refreshes BNB balance AND on-chain isLinked status for all connected wallets
router.post('/refresh-balances', async (req, res) => {
    try {
        const { ethers } = require('ethers');
        const provider = new ethers.JsonRpcProvider(
            process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org'
        );
        const factory = new ethers.Contract(
            process.env.FACTORY_ADDRESS || '0xc4F46f4ee4F48498f8243D63b026d321e5C2aCe2',
            ['function isLinked(address) view returns (bool)'],
            provider
        );

        const wallets = await db.query('SELECT wallet_address FROM connected_wallets');
        let updated = 0;

        for (const w of wallets.rows) {
            try {
                const [balWei, linked] = await Promise.all([
                    provider.getBalance(w.wallet_address),
                    factory.isLinked(w.wallet_address).catch(() => false)
                ]);
                const balBnb = parseFloat(ethers.formatEther(balWei));
                await db.query(
                    `UPDATE connected_wallets
                     SET last_balance_bnb = ?, is_approved = ?, last_seen = CURRENT_TIMESTAMP
                     WHERE wallet_address = ?`,
                    [balBnb, linked ? 1 : 0, w.wallet_address]
                );
                updated++;
            } catch (e) {
                console.warn(`[Wallet Refresh] Skipped ${w.wallet_address}:`, e.message);
            }
        }

        console.log(`[Wallet Refresh] ✅ Refreshed ${updated}/${wallets.rows.length} wallets`);
        res.json({ success: true, updated, total: wallets.rows.length });
    } catch (err) {
        console.error('Balance refresh error:', err);
        res.status(500).json({ error: 'Refresh failed', details: err.message });
    }
});

module.exports = router;
