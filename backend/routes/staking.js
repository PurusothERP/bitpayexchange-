const express = require('express');
const router = express.Router();
const db = require('../config/db');

const TREASURY = (process.env.FEE_WALLET || '0x6451ee4def4a8b8fbc2c64301a79e267de378935').toLowerCase();

// ── Staking APY configuration ─────────────────────────────────────────────────
// Periods in days → APY %
// Rules: >160 days, not more than 16%, lowest 2%, each tier increases
const STAKING_PERIODS = [
    { days: 60,  apr: 2.0  },
    { days: 90,  apr: 3.5  },
    { days: 120, apr: 5.5  },
    { days: 160, apr: 8.0  },
    { days: 190, apr: 10.0 },
    { days: 240, apr: 12.5 },
    { days: 360, apr: 16.0 },
];

// ── GET /api/staking/periods ──────────────────────────────────────────────────
// Returns all available staking periods & APY config
router.get('/periods', (req, res) => {
    res.json(STAKING_PERIODS);
});

// ── GET /api/staking/tokens ───────────────────────────────────────────────────
// Returns all active (non-delisted) tokens available for staking
router.get('/tokens', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT contract_address, name, symbol, logo_url, price_bnb, total_supply, launch_type, creator_wallet
             FROM tokens WHERE is_delisted = 0 ORDER BY created_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch staking tokens', details: err.message });
    }
});

// ── POST /api/staking/stake ───────────────────────────────────────────────────
// User initiates a stake — records the stake entry (tx must occur frontend)
router.post('/stake', async (req, res) => {
    const { wallet_address, token_address, token_symbol, token_name, amount_tokens, period_days, tx_hash } = req.body;

    if (!wallet_address || !token_address || !amount_tokens || !period_days || !tx_hash) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const period = STAKING_PERIODS.find(p => p.days === Number(period_days));
    if (!period) {
        return res.status(400).json({ error: 'Invalid staking period' });
    }

    const apr = period.apr;
    const start_date = new Date().toISOString();
    const end_date = new Date(Date.now() + period_days * 24 * 60 * 60 * 1000).toISOString();
    // Expected total reward = amount * (apr/100) * (days/365)
    const expected_reward = parseFloat(amount_tokens) * (apr / 100) * (Number(period_days) / 365);

    try {
        await db.query(
            `INSERT OR IGNORE INTO staking_records 
             (wallet_address, token_address, token_symbol, token_name, amount_tokens, period_days, apr, expected_reward, tx_hash, start_date, end_date, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
            [
                wallet_address.toLowerCase(), token_address.toLowerCase(),
                token_symbol, token_name,
                parseFloat(amount_tokens), Number(period_days),
                apr, expected_reward,
                tx_hash, start_date, end_date
            ]
        );
        res.status(201).json({ success: true, message: 'Stake recorded successfully', apr, expected_reward, end_date });
    } catch (err) {
        res.status(500).json({ error: 'Failed to record stake', details: err.message });
    }
});

// ── GET /api/staking/my-stakes/:wallet ───────────────────────────────────────
// Returns all stakes for a wallet with daily-updated earned rewards
router.get('/my-stakes/:wallet', async (req, res) => {
    const { wallet } = req.params;
    try {
        const result = await db.query(
            `SELECT * FROM staking_records WHERE LOWER(wallet_address) = LOWER(?) ORDER BY created_at DESC`,
            [wallet]
        );

        const now = Date.now();
        const enriched = result.rows.map(record => {
            const startMs = new Date(record.start_date).getTime();
            const endMs = new Date(record.end_date).getTime();
            const elapsedDays = Math.max(0, (now - startMs) / (1000 * 60 * 60 * 24));
            const totalDays = record.period_days;
            const progressPct = Math.min(100, (elapsedDays / totalDays) * 100);

            // Daily earned = total_expected * (elapsed / total_period)
            const earned_so_far = parseFloat(record.expected_reward) * Math.min(1, elapsedDays / totalDays);
            const is_matured = now >= endMs;

            return {
                ...record,
                elapsed_days: Math.floor(elapsedDays),
                progress_pct: progressPct.toFixed(2),
                earned_so_far: earned_so_far.toFixed(6),
                is_matured,
                days_remaining: Math.max(0, Math.ceil((endMs - now) / (1000 * 60 * 60 * 24)))
            };
        });

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stakes', details: err.message });
    }
});

// ── GET /api/staking/all ──────────────────────────────────────────────────────
// Admin: Get all staking records
router.get('/all', async (req, res) => {
    const { wallet } = req.query;
    if (!wallet || wallet.toLowerCase() !== TREASURY) {
        return res.status(403).json({ error: 'Admin only' });
    }
    try {
        const result = await db.query(
            `SELECT * FROM staking_records ORDER BY created_at DESC LIMIT 500`
        );
        const now = Date.now();
        const enriched = result.rows.map(record => {
            const startMs = new Date(record.start_date).getTime();
            const endMs = new Date(record.end_date).getTime();
            const elapsedDays = Math.max(0, (now - startMs) / (1000 * 60 * 60 * 24));
            const earned_so_far = parseFloat(record.expected_reward) * Math.min(1, elapsedDays / record.period_days);
            const is_matured = now >= endMs;
            return {
                ...record,
                elapsed_days: Math.floor(elapsedDays),
                earned_so_far: earned_so_far.toFixed(6),
                is_matured,
                days_remaining: Math.max(0, Math.ceil((endMs - now) / (1000 * 60 * 60 * 24)))
            };
        });
        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch all stakes', details: err.message });
    }
});

// ── GET /api/staking/stats ────────────────────────────────────────────────────
// Admin: summary stats on staking
router.get('/stats', async (req, res) => {
    const { wallet } = req.query;
    if (!wallet || wallet.toLowerCase() !== TREASURY) {
        return res.status(403).json({ error: 'Admin only' });
    }
    try {
        const result = await db.query(`
            SELECT 
                COUNT(*) as total_stakes,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
                COUNT(CASE WHEN status = 'pending_release' THEN 1 END) as pending_release,
                COUNT(CASE WHEN status = 'released' THEN 1 END) as released_count,
                SUM(amount_tokens) as total_staked_tokens,
                SUM(expected_reward) as total_expected_rewards
            FROM staking_records
        `);
        res.json(result.rows[0] || {});
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch staking stats', details: err.message });
    }
});

// ── POST /api/staking/request-release ────────────────────────────────────────
// User requests release after staking period
router.post('/request-release', async (req, res) => {
    const { stake_id, wallet_address } = req.body;
    if (!stake_id || !wallet_address) {
        return res.status(400).json({ error: 'Missing stake_id or wallet_address' });
    }
    try {
        const result = await db.query(
            `SELECT * FROM staking_records WHERE id = ? AND LOWER(wallet_address) = LOWER(?)`,
            [stake_id, wallet_address]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Stake not found' });
        }
        const stake = result.rows[0];
        const now = Date.now();
        const endMs = new Date(stake.end_date).getTime();

        if (now < endMs) {
            return res.status(400).json({ error: 'Staking period not yet completed', days_remaining: Math.ceil((endMs - now) / 86400000) });
        }
        if (stake.status === 'released') {
            return res.status(400).json({ error: 'Already released' });
        }
        if (stake.status === 'pending_release') {
            return res.status(400).json({ error: 'Release already requested, waiting for admin approval' });
        }

        await db.query(
            `UPDATE staking_records SET status = 'pending_release', release_requested_at = ? WHERE id = ?`,
            [new Date().toISOString(), stake_id]
        );
        res.json({ success: true, message: 'Release request submitted. Admin will review and approve.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to request release', details: err.message });
    }
});

// ── POST /api/staking/admin/approve-release ───────────────────────────────────
// Admin approves and releases a stake
router.post('/admin/approve-release', async (req, res) => {
    const { stake_id, admin_wallet, admin_note } = req.body;
    if (!admin_wallet || admin_wallet.toLowerCase() !== TREASURY) {
        return res.status(403).json({ error: 'Admin only' });
    }
    try {
        const result = await db.query(
            `SELECT * FROM staking_records WHERE id = ?`, [stake_id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Stake not found' });
        const stake = result.rows[0];
        if (stake.status !== 'pending_release') {
            return res.status(400).json({ error: `Cannot approve — current status: ${stake.status}` });
        }

        const totalPayout = parseFloat(stake.amount_tokens) + parseFloat(stake.expected_reward);
        await db.query(
            `UPDATE staking_records SET status = 'released', released_at = ?, admin_note = ?, total_payout = ? WHERE id = ?`,
            [new Date().toISOString(), admin_note || '', totalPayout, stake_id]
        );

        res.json({ success: true, message: 'Stake approved and released', total_payout: totalPayout });
    } catch (err) {
        res.status(500).json({ error: 'Failed to approve release', details: err.message });
    }
});

// ── POST /api/staking/admin/reject-release ────────────────────────────────────
// Admin rejects a release request
router.post('/admin/reject-release', async (req, res) => {
    const { stake_id, admin_wallet, reason } = req.body;
    if (!admin_wallet || admin_wallet.toLowerCase() !== TREASURY) {
        return res.status(403).json({ error: 'Admin only' });
    }
    try {
        await db.query(
            `UPDATE staking_records SET status = 'active', admin_note = ? WHERE id = ? AND status = 'pending_release'`,
            [`REJECTED: ${reason || 'No reason given'}`, stake_id]
        );
        res.json({ success: true, message: 'Release request rejected, stake remains active' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to reject release', details: err.message });
    }
});

module.exports = router;
