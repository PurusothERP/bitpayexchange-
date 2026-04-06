const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ── ASSISTANT MANAGEMENT ─────────────────────────────────────────────────────

// GET /api/admin/assistants - List all assistants with their last activity
router.get('/assistants', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT a.*, 
                   (SELECT activity FROM assistant_activities 
                    WHERE LOWER(assistant_wallet) = LOWER(a.wallet_address) 
                    ORDER BY timestamp DESC LIMIT 1) as last_activity
            FROM admin_assistants a
            ORDER BY a.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch assistants' });
    }
});

// POST /api/admin/assistants - Create or update assistant
router.post('/assistants', async (req, res) => {
    const { wallet_address, name, permissions_json, assistant_id } = req.body;
    if (!wallet_address || !name) return res.status(400).json({ error: 'Missing wallet/name' });

    try {
        // Enforce limit of 10
        const count = await db.query('SELECT COUNT(*) as active FROM admin_assistants');
        if (!assistant_id && count.rows[0].active >= 10) {
            return res.status(400).json({ error: 'Maximum limit of 10 assistants reached.' });
        }

        if (assistant_id) {
             await db.query(
                `UPDATE admin_assistants SET wallet_address = ?, name = ?, permissions_json = ? 
                 WHERE id = ?`,
                [wallet_address.toLowerCase(), name, permissions_json || '[]', assistant_id]
            );
        } else {
            await db.query(
                `INSERT INTO admin_assistants (wallet_address, name, permissions_json)
                 VALUES (?, ?, ?)`,
                [wallet_address.toLowerCase(), name, permissions_json || '[]']
            );
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Assistant update error:', err);
        res.status(500).json({ error: 'Update failed' });
    }
});

// POST /api/admin/assistants/login - Capture last login
router.post('/assistants/login', async (req, res) => {
    const { wallet_address } = req.body;
    try {
        await db.query(
            `UPDATE admin_assistants SET last_login = CURRENT_TIMESTAMP WHERE LOWER(wallet_address) = LOWER(?)`,
            [wallet_address]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Login capture failed' });
    }
});

// DELETE /api/admin/assistants/:id
router.delete('/assistants/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM admin_assistants WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Deletion failed' });
    }
});

// GET /api/admin/assistants/:wallet/activities - Last 5 activities
router.get('/assistants/:wallet/activities', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM assistant_activities WHERE LOWER(assistant_wallet) = LOWER(?) ORDER BY timestamp DESC LIMIT 5`,
            [req.params.wallet]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch activities' });
    }
});

// POST /api/admin/activities/log - Log activity for RBAC tracking
router.post('/activities/log', async (req, res) => {
    const { wallet_address, activity } = req.body;
    try {
        await db.query(
            `INSERT INTO assistant_activities (assistant_wallet, activity) VALUES (?, ?)`,
            [wallet_address.toLowerCase(), activity]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Logging failed' });
    }
});

// ── REVENUE EXPORT ───────────────────────────────────────────────────────────

// GET /api/admin/revenue/export - Professional Excel/CSV format
router.get('/revenue/export', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM treasury_transfers ORDER BY timestamp DESC');
        const rows = result.rows;
        
        // Detailed Headings for Professional Auditing
        let csv = 'TRANSACTION ID,TIMESTAMP,SERVICE CATEGORY,DESTINATION TREASURY,REVENUE TYPE,AMOUNT (BNB),BLOCKCHAIN TX HASH\n';
        
        let totalBNB = 0;
        rows.forEach(r => {
            const date = new Date(r.timestamp).toISOString().replace(/T/, ' ').replace(/\..+/, '');
            const service = r.source_contract === 'PLATFORM_FEE' ? 'CORE PROTOCOL' : 
                          r.source_contract === 'TOKEN_CREATION' ? 'TOKEN LAUNCH' :
                          r.source_contract === 'COIN_BOOSTER' ? 'MARKETING' : 'TRADING';
            
            const amount = parseFloat(r.amount_bnb) || 0;
            totalBNB += amount;

            csv += `${r.id},"${date}",${service},"${r.destination_address}",${r.transfer_type || 'fee'},${amount.toFixed(6)},${r.tx_hash}\n`;
        });

        // Add Summary Row at the bottom
        csv += `\n,,,TOTAL REALIZED REVENUE,,${totalBNB.toFixed(6)} BNB,\n`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=B20_REVENUE_REPORT.csv');
        res.status(200).send(csv);
    } catch (err) {
        res.status(500).json({ error: 'Export failed' });
    }
});

module.exports = router;
