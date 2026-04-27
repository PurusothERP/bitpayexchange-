const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ── GET /api/bulletin ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 100');
        res.json(result.rows);
    } catch (err) {
        console.error('Fetch bulletin error:', err);
        res.status(500).json({ error: 'Failed to fetch bulletin' });
    }
});

// ── POST /api/bulletin ───────────────────────────────────────────────────────── (Admin only)
router.post('/', async (req, res) => {
    const { content, token_symbol, token_name, token_logo, metadata } = req.body;
    const adminWallet = req.headers['x-wallet-address'];
    const TREASURY = (process.env.FEE_WALLET || '0x6451ee4def4a8b8fbc2c64301a79e267de378935').toLowerCase();

    // Verification
    if (!adminWallet || adminWallet.toLowerCase() !== TREASURY) {
        return res.status(403).json({ error: 'Protocol Sovereign access required.' });
    }

    if (!content) return res.status(400).json({ error: 'Bulletin content required' });

    try {
        await db.query(
            `INSERT INTO announcements (content, token_symbol, token_name, token_logo, metadata) 
             VALUES (?, ?, ?, ?, ?)`,
            [content, token_symbol || '', token_name || '', token_logo || '', metadata || null]
        );
        res.json({ success: true, message: 'Official Bulletin Deployed' });
    } catch (err) {
        console.error('Bulletin Post Error:', err);
        res.status(500).json({ error: 'Post failed', details: err.message });
    }
});

const { generateAndPostNews } = require('../services/aiNewsAutomation');

// ── POST /api/bulletin/trigger-ai ─────────────────────────────────────────────
router.post('/trigger-ai', async (req, res) => {
    const adminWallet = req.headers['x-wallet-address'];
    const TREASURY = (process.env.FEE_WALLET || '0x6451ee4def4a8b8fbc2c64301a79e267de378935').toLowerCase();

    if (!adminWallet || adminWallet.toLowerCase() !== TREASURY) {
        return res.status(403).json({ error: 'Admin only' });
    }

    try {
        await generateAndPostNews();
        res.json({ success: true, message: 'AI News Cycle Triggered' });
    } catch (err) {
        res.status(500).json({ error: 'AI Generation failed', details: err.message });
    }
});

module.exports = router;
