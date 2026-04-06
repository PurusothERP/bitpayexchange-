const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ── GET /api/bulletin ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM announcements ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Fetch bulletin error:', err);
        res.status(500).json({ error: 'Failed to fetch bulletin' });
    }
});

// ── POST /api/bulletin ───────────────────────────────────────────────────────── (Admin only)
router.post('/', async (req, res) => {
    const { content, image_url, wallet } = req.body;
    const TREASURY = '0x6451ee4def4a8b8fbc2c64301a79e267de378935';
    if (!wallet || wallet.toLowerCase() !== TREASURY.toLowerCase()) {
        return res.status(403).json({ error: 'Admin only' });
    }
    if (!content) return res.status(400).json({ error: 'Content required' });
    try {
        await db.query(
            'INSERT INTO announcements (content, image_url) VALUES (?, ?)',
            [content, image_url || '']
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Post failed' });
    }
});

// ── POST /api/bulletin/like/:id ───────────────────────────────────────────────
router.post('/like/:id', async (req, res) => {
    try {
        await db.query('UPDATE announcements SET likes = likes + 1 WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Like failed' });
    }
});

module.exports = router;
