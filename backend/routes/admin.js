const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAdmin, requireAdminOrAssistant } = require('../middleware/adminAuth');

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

// POST /api/admin/assistants - Create or update assistant (Admin only)
router.post('/assistants', requireAdmin, async (req, res) => {
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

// DELETE /api/admin/assistants/:id (Admin only)
router.delete('/assistants/:id', requireAdmin, async (req, res) => {
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

// GET /api/admin/revenue/export (Admin only)
// Exports a full audit-grade CSV matching the Financial Ledger (including synthesized creation fees)
router.get('/revenue/export', requireAdmin, async (req, res) => {
    try {
        const FEE_BY_TYPE = { MEME: 0.007, FAIR: 0.007, STANDARD: 0.007 };

        const [tokens, treasury, trades] = await Promise.all([
            db.query('SELECT contract_address, name, symbol, launch_type, creator_wallet, tx_hash, created_at FROM tokens ORDER BY created_at DESC'),
            db.query('SELECT * FROM treasury_transfers ORDER BY timestamp DESC'),
            db.query('SELECT * FROM trades WHERE fee_bnb > 0 ORDER BY timestamp DESC')
        ]);

        // Build unified rows — same logic as revenue/full
        const rows = [];

        // 1. Creation fees (one per token)
        tokens.rows.forEach(t => {
            const fee = FEE_BY_TYPE[(t.launch_type || 'MEME').toUpperCase()] ?? 0.007;
            rows.push({
                timestamp:  t.created_at,
                category:   'TOKEN LAUNCH',
                heading:    `Token Launch — ${t.symbol}`,
                type:       `${(t.launch_type || 'MEME').toUpperCase()}_CREATION_FEE`,
                source:     t.creator_wallet || 'Protocol',
                amount:     fee,
                tx_hash:    t.tx_hash || '',
                contract:   t.contract_address
            });
        });

        // 2. Treasury transfers (upgrades, fiat, sweeps — not creation/trading already counted)
        treasury.rows
            .filter(t => !((t.transfer_type||'').toLowerCase().includes('creation') ||
                           (t.transfer_type||'').toLowerCase().includes('trading')))
            .forEach(t => {
                rows.push({
                    timestamp:  t.timestamp,
                    category:   'TREASURY',
                    heading:    t.transfer_type || 'Treasury Transfer',
                    type:       (t.transfer_type || 'SYSTEM_FEE').toUpperCase(),
                    source:     t.source_contract || 'Protocol',
                    amount:     parseFloat(t.amount_bnb || 0),
                    tx_hash:    t.tx_hash || '',
                    contract:   ''
                });
            });

        // 3. Trade fees
        trades.rows.forEach(t => {
            rows.push({
                timestamp:  t.timestamp,
                category:   'EXCHANGE',
                heading:    `${(t.trade_type || 'Trade').toUpperCase()} Fee`,
                type:       (t.trade_type || 'TRADE').toUpperCase() + '_FEE',
                source:     t.trader_wallet || 'Trader',
                amount:     parseFloat(t.fee_bnb || 0),
                tx_hash:    t.tx_hash || '',
                contract:   t.token_address || ''
            });
        });

        // Sort by timestamp desc
        rows.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        let csv = 'TIMESTAMP,CATEGORY,DESCRIPTION,REVENUE TYPE,SOURCE WALLET,AMOUNT (BNB),CONTRACT ADDRESS,TX HASH\n';
        let total = 0;

        rows.forEach(r => {
            const date = new Date(r.timestamp).toISOString().replace('T', ' ').replace(/\.\d+Z/, '');
            total += r.amount;
            csv += `"${date}","${r.category}","${r.heading}","${r.type}","${r.source}",${r.amount.toFixed(6)},"${r.contract}","${r.tx_hash}"\n`;
        });

        csv += `\n,,,,TOTAL REALIZED REVENUE,${total.toFixed(6)} BNB,,\n`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=B20_REVENUE_LEDGER.csv');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(200).send(csv);
    } catch (err) {
        console.error('[Export] Error:', err.message);
        res.status(500).json({ error: 'Export failed', details: err.message });
    }
});

// ── ADMIN ANALYTICS & DASHBOARD ──────────────────────────────────────────────

// GET /api/admin/stats - High-level dashboard metrics
router.get('/stats', requireAdminOrAssistant, async (req, res) => {
    try {
        // ── Known fee schedule (must match on-chain values) ───────────────────
        const FEE_MEME      = 0.007;  // MEME bonding curve creation
        const FEE_FAIR      = 0.007;  // Fair launch (direct DEX)
        const FEE_STANDARD  = 0.007;  // Standard token
        const FEE_UPGRADE   = 0.003;  // Trust upgrade / badge

        const [tCount, wCount, rTreasury, rTrades, dCount, fBreakdown, tokenFees, upgradeFees] = await Promise.all([
            db.query(`SELECT 
                        COUNT(*) as total,
                        SUM(CASE WHEN launch_type IN ('FAIR','STANDARD','EXCHANGE_LISTING') THEN 1 ELSE 0 END) as launchpad,
                        SUM(CASE WHEN launch_type = 'STANDARD' THEN 1 ELSE 0 END) as standard,
                        SUM(CASE WHEN launch_type = 'MEME' THEN 1 ELSE 0 END) as meme_count,
                        SUM(CASE WHEN launch_type = 'FAIR' THEN 1 ELSE 0 END) as fair_count
                      FROM tokens`),
            db.query('SELECT COUNT(*) as total FROM connected_wallets'),
            db.query('SELECT COALESCE(SUM(amount_bnb),0) as total FROM treasury_transfers'),
            db.query('SELECT COALESCE(SUM(fee_bnb),0) as total FROM trades'),
            db.query('SELECT COUNT(*) as total FROM tokens WHERE is_delisted = 1'),
            db.query(`
                SELECT transfer_type, COALESCE(SUM(amount_bnb),0) as total 
                FROM treasury_transfers 
                GROUP BY transfer_type
            `),
            // Count tokens by type for fee calculation
            db.query(`
                SELECT 
                    launch_type,
                    COUNT(*) as cnt
                FROM tokens 
                WHERE is_delisted = 0
                GROUP BY launch_type
            `),
            // Upgrade fee records
            db.query(`SELECT COALESCE(SUM(amount_bnb),0) as total FROM treasury_transfers WHERE transfer_type LIKE '%upgrade%'`)
        ]);

        // ── Base stats ────────────────────────────────────────────────────────
        const total  = tCount.rows[0].total || 0;
        const meme   = tCount.rows[0].meme_count || 0;
        const fair   = tCount.rows[0].fair_count || 0;
        const std    = tCount.rows[0].standard || 0;

        // ── Fee calculation: primary = tokens × known fee ─────────────────────
        // This is the actual revenue generated, even if treasury_transfers is sparse
        const creationFromTokens = (meme * FEE_MEME) + (fair * FEE_FAIR) + (std * FEE_STANDARD);
        const tradeRev           = parseFloat(rTrades.rows[0].total || 0);
        const upgradeRev         = parseFloat(upgradeFees.rows[0]?.total || 0);

        // ── treasury_transfers as supplementary source ────────────────────────
        const treasuryTotal = parseFloat(rTreasury.rows[0].total || 0);
        
        const feeBreakdown = { creation: creationFromTokens, trading: tradeRev, upgrade: upgradeRev, fiat: 0, other: 0 };

        // Layer in any treasury_transfers data (deduplication by type)
        fBreakdown.rows.forEach(r => {
            const type = (r.transfer_type || '').toLowerCase();
            const amt = parseFloat(r.total || 0);
            if (type.includes('fiat')) feeBreakdown.fiat += amt;
            else if (type.includes('sweep') || type.includes('daily')) feeBreakdown.other += amt;
            // creation, trading, upgrade already computed from tokens table — skip
        });

        const totalRevenue = feeBreakdown.creation + feeBreakdown.trading + feeBreakdown.upgrade + feeBreakdown.fiat + feeBreakdown.other;

        res.json({
            total_tokens:     total,
            launchpad_tokens: tCount.rows[0].launchpad || 0,
            standard_tokens:  std,
            total_wallets:    wCount.rows[0].total || 0,
            total_revenue_bnb: totalRevenue,
            fee_breakdown:    feeBreakdown,
            market_inventory: 6140,
            delisted_count:   dCount.rows[0].total || 0
        });
    } catch (err) {
        console.error('[Admin Stats] Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});


// ── WALLET & REGISTRY MANAGEMENT ─────────────────────────────────────────────

// GET /api/admin/wallets - List all connected users and their balances
router.get('/wallets', requireAdminOrAssistant, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM connected_wallets ORDER BY last_seen DESC LIMIT 100');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch wallets' });
    }
});

// GET /api/admin/tokens/registry - Advanced token management (listing/delisting)
router.get('/tokens/registry', requireAdminOrAssistant, async (req, res) => {
    try {
        // Returns both local DB tokens and top Market tokens for visibility control
        const result = await db.query('SELECT * FROM tokens ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch token registry' });
    }
});

// POST /api/admin/tokens/toggle - ON/OFF button for Market visibility
router.post('/tokens/toggle', requireAdmin, async (req, res) => {
    const { address, is_delisted } = req.body;
    try {
        await db.query('UPDATE tokens SET is_delisted = ? WHERE contract_address = ?', [is_delisted ? 1 : 0, address]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Toggle failed' });
    }
});

// ── LISTING APPROVALS (List Your Token) ──────────────────────────────────────

// GET /api/admin/listing-requests - Queue for external token approvals
router.get('/listing-requests', requireAdminOrAssistant, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM listing_submissions WHERE status = "pending" ORDER BY timestamp DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch listing requests' });
    }
});

// POST /api/admin/listing/approve - Migrate request to tokens table
router.post('/listing/approve', requireAdmin, async (req, res) => {
    const { id } = req.body;
    try {
        const reqResult = await db.query('SELECT * FROM listing_submissions WHERE id = ?', [id]);
        if (reqResult.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
        
        const r = reqResult.rows[0];
        
        // Add to main tokens table
        await db.query(`
            INSERT INTO tokens (contract_address, name, symbol, creator_wallet, logo_url, description, launch_type, is_delisted)
            VALUES (?, ?, ?, ?, ?, ?, 'STANDARD', 0)
            ON CONFLICT(contract_address) DO UPDATE SET is_delisted = 0
        `, [r.contract_address, r.token_name, r.token_symbol, r.owner_wallet, r.logo_url, r.description]);
        
        // Mark request as approved
        await db.query('UPDATE listing_submissions SET status = "approved" WHERE id = ?', [id]);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Approval error:', err);
        res.status(500).json({ error: 'Approval failed' });
    }
});

router.post('/listing/reject', requireAdmin, async (req, res) => {
    const { id } = req.body;
    try {
        await db.query('UPDATE listing_submissions SET status = "rejected" WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Rejection failed' });
    }
});

// ── TOKEN UPGRADE MANAGEMENT (Verifications/Badges) ──────────────────────────

// GET /api/admin/upgrades - Full queue for token trust upgrade requests
// Returns ALL requests (pending + processed) so admin can see payment history
router.get('/upgrades', requireAdminOrAssistant, async (req, res) => {
    try {
        const { filter = 'PENDING' } = req.query;
        let sql = 'SELECT * FROM token_upgrade_requests';
        const params = [];
        if (filter !== 'ALL') { sql += ' WHERE status = ?'; params.push(filter); }
        sql += ' ORDER BY created_at DESC';
        const result = await db.query(sql, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch upgrade requests' });
    }
});

// POST /api/admin/upgrades/approve - Approve and apply trust_status change
router.post('/upgrades/approve', requireAdmin, async (req, res) => {
    const { id } = req.body;
    try {
        const reqResult = await db.query('SELECT * FROM token_upgrade_requests WHERE id = ?', [id]);
        if (reqResult.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
        const r = reqResult.rows[0];

        // Apply trust_status to the token (NOT launch_type)
        await db.query(
            'UPDATE tokens SET trust_status = ? WHERE LOWER(contract_address) = LOWER(?)',
            [r.requested_upgrade, r.token_address]
        );
        // Mark request approved + set processed timestamp
        await db.query(
            'UPDATE token_upgrade_requests SET status = \'APPROVED\', processed_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        );
        // Log in treasury transfers so it shows in Financial Ledger
        try {
            const TREASURY = (process.env.FEE_WALLET || '0x6451ee4def4a8b8fbc2c64301a79e267de378935').toLowerCase();
            await db.query(
                'INSERT OR IGNORE INTO treasury_transfers (tx_hash, amount_bnb, transfer_type, source_contract, destination_address) VALUES (?, ?, ?, ?, ?)',
                [r.tx_hash || `upgrade_${id}_${Date.now()}`, r.amount_bnb || 0.01, 'token_upgrade', r.token_address, TREASURY]
            );
        } catch (_) {}
        res.json({ success: true, message: `Token trust_status upgraded to "${r.requested_upgrade}"` });
    } catch (err) {
        console.error('Upgrade approval error:', err.message);
        res.status(500).json({ error: 'Upgrade approval failed' });
    }
});

// POST /api/admin/upgrades/reject - Reject request with optional reason
router.post('/upgrades/reject', requireAdmin, async (req, res) => {
    const { id, reason } = req.body;
    try {
        await db.query(
            'UPDATE token_upgrade_requests SET status = \'REJECTED\', reject_reason = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?',
            [reason || 'Rejected by admin', id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Upgrade rejection failed' });
    }
});

// ── SETTINGS & DYNAMIC FEES ──────────────────────────────────────────────────

// GET /api/admin/settings - Fetch all protocol fees and config
router.get('/settings', requireAdminOrAssistant, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM settings ORDER BY category, key');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// POST /api/admin/settings - Update dynamic protocol parameters
router.post('/settings', requireAdmin, async (req, res) => {
    const { key, value } = req.body;
    try {
        await db.query('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?', [value, key]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Update failed' });
    }
});

// ── EXPANDED REVENUE & LEDGER ────────────────────────────────────────────────

// GET /api/admin/revenue/full - Combined ledger: synthesized creation fees + real tx
// Shows one creation-fee entry per token + all indexed trade/treasury entries.
// Future real transactions from treasury_transfers and trades appear automatically.
router.get('/revenue/full', requireAdminOrAssistant, async (req, res) => {
    try {
        const FEE_BY_TYPE = {
            'MEME':     0.007,
            'FAIR':     0.007,
            'STANDARD': 0.007,
            'EXCHANGE_LISTING': 0.000, // listed externally, no creation fee
        };

        const [tokens, treasury, trades] = await Promise.all([
            // All tokens — each one represents a creation fee revenue event
            db.query(`
                SELECT contract_address, name, symbol, launch_type, creator_wallet, tx_hash, created_at
                FROM tokens
                ORDER BY created_at DESC
            `),
            db.query('SELECT * FROM treasury_transfers ORDER BY timestamp DESC LIMIT 500'),
            db.query('SELECT * FROM trades WHERE fee_bnb > 0 ORDER BY timestamp DESC LIMIT 500')
        ]);

        // ── 1. Synthesize creation fee entries from tokens table ──────────────
        const creationEntries = tokens.rows.map(t => {
            const type = (t.launch_type || 'MEME').toUpperCase();
            const fee  = FEE_BY_TYPE[type] ?? 0.007;
            return {
                id:         `creation_${t.contract_address}`,
                timestamp:  t.created_at,
                amount_bnb: fee,
                heading:    `Token Launch — ${t.symbol || t.name}`,
                type:       type === 'FAIR' ? 'FAIR_LAUNCH_FEE' :
                            type === 'STANDARD' ? 'STANDARD_TOKEN_FEE' :
                            'MEME_CREATION_FEE',
                source:     t.creator_wallet
                                ? `${t.creator_wallet.slice(0,6)}...${t.creator_wallet.slice(-4)}`
                                : 'Protocol',
                tx_hash:    t.tx_hash || '',
                contract:   t.contract_address,
                category:   'creation'
            };
        });

        // ── 2. Real treasury_transfers (sweep, upgrade, fiat, etc.) ─────────
        // Filter out creation/trading fees already covered by synthesized entries
        const treasuryEntries = treasury.rows
            .filter(t => {
                const tp = (t.transfer_type || '').toLowerCase();
                // Include: fiat, daily sweeps, upgrades, liquidity migrations
                // Skip: creation_fee and trading_fee (already in tokens / trades tables)
                return !tp.includes('creation') && !tp.includes('trading');
            })
            .map(t => ({
                id:         `tres_${t.id}`,
                timestamp:  t.timestamp,
                amount_bnb: parseFloat(t.amount_bnb || 0),
                heading:    t.transfer_type === 'token_upgrade'   ? 'Trust Upgrade Fee' :
                            t.transfer_type === 'fiat_spread'     ? 'Fiat Exchange Spread' :
                            t.transfer_type === 'daily_sweep'     ? 'Daily Treasury Sweep' :
                            t.transfer_type === 'migration_fee'   ? 'Liquidity Migration Fee' :
                            (t.source_contract || 'Treasury Transfer'),
                type:       (t.transfer_type || 'SYSTEM_FEE').toUpperCase(),
                source:     t.source_contract || 'PROTOCOL',
                tx_hash:    t.tx_hash || '',
                contract:   '',
                category:   'treasury'
            }));

        // ── 3. Real trade fees ──────────────────────────────────────────────
        const tradeEntries = trades.rows.map(t => ({
            id:         `trade_${t.id}`,
            timestamp:  t.timestamp,
            amount_bnb: parseFloat(t.fee_bnb || 0),
            heading:    `${(t.trade_type || 'Trade').toUpperCase()} Fee — ${t.token_address?.slice(0,6) || ''}...`,
            type:       (t.trade_type || 'trade').toUpperCase() === 'BUY' ? 'EXCHANGE_BUY_FEE' : 'EXCHANGE_SELL_FEE',
            source:     t.trader_wallet
                            ? `${t.trader_wallet.slice(0,6)}...${t.trader_wallet.slice(-4)}`
                            : 'Trader',
            tx_hash:    t.tx_hash || '',
            contract:   t.token_address || '',
            category:   'trade'
        }));

        // ── 4. Merge + sort by timestamp desc ───────────────────────────────
        const fullLedger = [...creationEntries, ...treasuryEntries, ...tradeEntries]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.json(fullLedger);
    } catch (err) {
        console.error('[Revenue Ledger] Error:', err.message);
        res.status(500).json({ error: 'Ledger fetch failed', details: err.message });
    }
});

// ── MARKET REGISTRY (6000+ ASSETS) ──────────────────────────────────────────

// GET /api/admin/tokens/market - Manage global inventory visibility (6,000+)
router.get('/tokens/market', requireAdminOrAssistant, async (req, res) => {
    try {
        const query = (req.query.q || '').toLowerCase();
        
        // Fetch local overrides (delisted tokens)
        const local = await db.query('SELECT contract_address, is_delisted FROM tokens WHERE is_delisted = 1');
        const delistedMap = new Set(local.rows.map(r => r.contract_address.toLowerCase()));

        // Fetch 6000+ Global Inventory from Coingecko
        let globalTokens = [];
        try {
            const axios = require('axios');
            const cgRes = await axios.get('https://tokens.coingecko.com/binance-smart-chain/all.json');
            globalTokens = cgRes.data.tokens || [];
        } catch (e) {
            console.error('Failed to fetch Coingecko list:', e.message);
        }

        // Map CG tokens
        let mappedGlobal = globalTokens.map(t => ({
            name: t.name,
            symbol: t.symbol,
            contract_address: t.address,
            logo_url: t.logoURI,
            is_delisted: delistedMap.has(t.address.toLowerCase())
        }));

        // Fetch local database tokens
        const localTokensRaw = await db.query(`SELECT name, symbol, contract_address, logo_url, is_delisted FROM tokens`);
        const localTokens = localTokensRaw.rows.map(t => ({
            name: t.name,
            symbol: t.symbol,
            contract_address: t.contract_address,
            logo_url: t.logo_url,
            is_delisted: t.is_delisted === 1
        }));

        const combined = [...localTokens];
        const localAddresses = new Set(localTokens.map(t => (t.contract_address || '').toLowerCase()));
        
        for (const gt of mappedGlobal) {
            if (!localAddresses.has((gt.contract_address || '').toLowerCase())) {
                combined.push(gt);
            }
        }

        let finalResult = combined;
        if (query) {
            finalResult = combined.filter(t => 
                (t.name && t.name.toLowerCase().includes(query)) || 
                (t.symbol && t.symbol.toLowerCase().includes(query)) ||
                (t.contract_address && t.contract_address.toLowerCase().includes(query))
            );
        } else {
            finalResult = combined.slice(0, 300); // Prevent browser lockup
        }

        res.json(finalResult);
    } catch (err) {
        console.error('Market fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch global market inventory' });
    }
});

// DELETE /api/admin/wallets/:address - Terminate session / Remove from view
router.delete('/wallets/:address', requireAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM connected_wallets WHERE wallet_address = ?', [req.params.address]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Removal failed' });
    }
});

module.exports = router;
