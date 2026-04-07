const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const path = require('path');

// Multer config for uploading announcement image
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, './uploads/'),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'announce-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// ------------- ANNOUNCEMENTS -------------

// GET active announcements (created within last 24h)
router.get('/announcements', async (req, res) => {
    try {
        const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const result = await db.query(
            "SELECT * FROM announcements WHERE created_at >= ? ORDER BY created_at DESC", 
            [cutoffTime]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Fetch announcements error:", err);
        res.status(500).json({ error: "Failed to fetch announcements" });
    }
});

// POST announcement (admin only, but we assume dashboard calls it directly)
router.post('/announcements', upload.single('image'), async (req, res) => {
    try {
        const { content, token_symbol, token_name, token_logo } = req.body;
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';
        // Random likes between 1400 and 1900
        const randomLikes = Math.floor(Math.random() * (1900 - 1400 + 1)) + 1400;

        await db.query(
            "INSERT INTO announcements (image_url, content, likes, token_symbol, token_name, token_logo) VALUES (?, ?, ?, ?, ?, ?)",
            [imageUrl, content, randomLikes, token_symbol || '', token_name || '', token_logo || '']
        );
        res.status(201).json({ success: true, message: "Announcement created" });
    } catch (err) {
        console.error("Create announcement error:", err);
        res.status(500).json({ error: "Failed to create announcement" });
    }
});

// ------------- COMMUNITY POSTS -------------

// Regex to redact emails and phone numbers
const redactBlockedContent = (text) => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
    // Detect typical phone numbers (10+ digits with optional separators)
    const phoneRegex = /(\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/g;
    
    return text
        .replace(emailRegex, "[REDACTED EMAIL]")
        .replace(phoneRegex, "[REDACTED CONTACT]");
};

// GET community posts
router.get('/posts', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM community_posts ORDER BY created_at DESC LIMIT 100");
        res.json(result.rows);
    } catch (err) {
        console.error("Fetch posts error:", err);
        res.status(500).json({ error: "Failed to fetch community posts" });
    }
});

// POST community post (public)
router.post('/posts', async (req, res) => {
    try {
        const { wallet_address, content } = req.body;

        if (!wallet_address || !content) {
            return res.status(400).json({ error: "Missing required fields." });
        }

        // Check if user is blocked
        const blockedCheck = await db.query("SELECT * FROM blocked_users WHERE wallet_address = ?", [wallet_address]);
        if (blockedCheck.rows.length > 0) {
            return res.status(403).json({ error: "This wallet is restricted from posting." });
        }

        // Automatically redact emails and phone numbers
        const sanitizedContent = redactBlockedContent(content);

        await db.query(
            "INSERT INTO community_posts (wallet_address, content) VALUES (?, ?)",
            [wallet_address, sanitizedContent]
        );

        res.status(201).json({ success: true, message: "Post created successfully", content: sanitizedContent });
    } catch (err) {
        console.error("Create post error:", err);
        res.status(500).json({ error: "Failed to create post" });
    }
});

// DELETE community post (admin)
router.delete('/posts/:id', async (req, res) => {
    try {
        await db.query("DELETE FROM community_posts WHERE id = ?", [req.params.id]);
        res.json({ success: true, message: "Post deleted" });
    } catch (err) {
        console.error("Delete post error:", err);
        res.status(500).json({ error: "Failed to delete post" });
    }
});

// BLOCK a user (admin)
router.post('/block', async (req, res) => {
    try {
        const { wallet_address } = req.body;
        if (!wallet_address) return res.status(400).json({ error: "Missing wallet_address" });

        await db.query(
            "INSERT INTO blocked_users (wallet_address) VALUES (?) ON CONFLICT DO NOTHING", 
            [wallet_address]
        );
        res.json({ success: true, message: "User blocked" });
    } catch (err) {
        console.error("Block user error:", err);
        res.status(500).json({ error: "Failed to block user" });
    }
});

// DELETE announcement (admin)
router.delete('/announcements/:id', async (req, res) => {
    try {
        await db.query("DELETE FROM announcements WHERE id = ?", [req.params.id]);
        res.json({ success: true, message: "Announcement deleted" });
    } catch (err) {
        console.error("Delete announcement error:", err);
        res.status(500).json({ error: "Failed to delete announcement" });
    }
});

module.exports = router;
