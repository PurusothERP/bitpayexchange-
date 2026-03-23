const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ── Storage Configuration ─────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '../uploads/fiat_proofs');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'proof-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.test(ext)) cb(null, true);
        else cb(new Error('Only images are allowed (jpeg, jpg, png, webp)'));
    }
});

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/fiat/transaction - Submit a new transaction
router.post('/transaction', upload.single('proof'), async (req, res) => {
    try {
        const {
            user_wallet,
            user_name,
            phone_number,
            email,
            type,
            asset,
            amount,
            inr_amount,
            bank_details
        } = req.body;

        if (!user_wallet || !type || !asset || !amount || !inr_amount) {
            return res.status(400).json({ error: 'Missing mandatory fields' });
        }

        const proof_url = req.file ? `/uploads/fiat_proofs/${req.file.filename}` : null;
        const bank_details_json = bank_details || null;

        const result = await db.query(
            `INSERT INTO fiat_transactions (
                user_wallet, user_name, phone_number, email, type, asset, 
                amount, inr_amount, proof_url, bank_details_json, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
            [user_wallet, user_name, phone_number, email, type, asset, amount, inr_amount, proof_url, bank_details_json]
        );

        res.status(201).json({ 
            success: true, 
            message: 'Transaction submitted successfully', 
            transactionId: result.lastID 
        });
    } catch (err) {
        console.error('[Fiat] Submission Error:', err);
        res.status(500).json({ error: 'Failed to submit transaction', details: err.message });
    }
});

// GET /api/fiat/transactions - Admin: Fetch all transactions
router.get('/transactions', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM fiat_transactions ORDER BY timestamp DESC`
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch transactions', details: err.message });
    }
});

// PATCH /api/fiat/transaction/:id - Admin: Update transaction status
router.patch('/transaction/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['VERIFIED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const result = await db.query(
            `UPDATE fiat_transactions SET status = ? WHERE id = ?`,
            [status, id]
        );

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.json({ success: true, message: `Transaction ${status.toLowerCase()} successfully` });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update transaction', details: err.message });
    }
});

module.exports = router;
