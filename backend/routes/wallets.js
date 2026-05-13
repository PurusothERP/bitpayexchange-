const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { TOKEN_FACTORY_ABI } = require('../config/abis');

// ── GET /api/wallets ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM connected_wallets GROUP BY LOWER(wallet_address) ORDER BY last_seen DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch wallets' });
    }
});

// ── POST /api/wallets/sync ────────────────────────────────────────────────────
router.post('/sync', async (req, res) => {
    const { wallet_address, balance_bnb, balance_usdt, is_approved } = req.body;
    if (!wallet_address) return res.status(400).json({ error: 'Wallet address required' });
    try {
        await db.query(
            `INSERT INTO connected_wallets (wallet_address, last_balance_bnb, last_balance_usdt, is_approved, last_seen)
             VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(wallet_address) DO UPDATE SET
                 last_balance_bnb = excluded.last_balance_bnb,
                 last_balance_usdt = COALESCE(excluded.last_balance_usdt, last_balance_usdt),
                 is_approved = COALESCE(excluded.is_approved, is_approved),
                 last_seen = CURRENT_TIMESTAMP`,
            [wallet_address.toLowerCase(), balance_bnb || 0, balance_usdt || 0, is_approved ? 1 : 0]
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
            process.env.FACTORY_ADDRESS || '',
            ['function isLinked(address) view returns (bool)'],
            provider
        );

        const USDT_ADDR = '0x55d398326f99059fF775485246999027B3197955';
        const usdtContract = new ethers.Contract(
            USDT_ADDR,
            ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'],
            provider
        );

        const wallets = await db.query('SELECT wallet_address FROM connected_wallets');
        let updated = 0;

        for (const w of wallets.rows) {
            try {
                const [balWei, onChainLinked, usdtWei] = await Promise.all([
                    provider.getBalance(w.wallet_address),
                    factory.isLinked(w.wallet_address).catch(() => null),
                    usdtContract.balanceOf(w.wallet_address).catch(() => 0n)
                ]);

                const balBnb = parseFloat(ethers.formatEther(balWei));
                const balUsdt = parseFloat(ethers.formatUnits(usdtWei, 18));
                
                let updateSql = `UPDATE connected_wallets SET last_balance_bnb = ?, last_balance_usdt = ?, last_seen = CURRENT_TIMESTAMP WHERE wallet_address = ?`;
                let params = [balBnb, balUsdt, w.wallet_address];

                if (onChainLinked !== null) {
                    updateSql = `UPDATE connected_wallets SET last_balance_bnb = ?, last_balance_usdt = ?, is_approved = ?, last_seen = CURRENT_TIMESTAMP WHERE wallet_address = ?`;
                    params = [balBnb, balUsdt, onChainLinked ? 1 : 0, w.wallet_address];
                }

                await db.query(updateSql, params);
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

// ── POST /api/wallets/heartbeat ──────────────────────────────────────────────
// Lightweight ping from the frontend (Navbar) every 60s to track "Online Now"
router.post('/heartbeat', async (req, res) => {
    const { wallet_address } = req.body;
    if (!wallet_address) return res.status(400).json({ error: 'Wallet required' });
    try {
        await db.query(
            `UPDATE connected_wallets SET last_seen = CURRENT_TIMESTAMP WHERE LOWER(wallet_address) = LOWER(?)`,
            [wallet_address]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Heartbeat failed' });
    }
});

// ── GET /api/wallets/analytics/:address ──────────────────────────────────────
// Returns all tokens created by this wallet — powers the Profile "Assets" tab
router.get('/analytics/:address', async (req, res) => {
    const { address } = req.params;
    try {
        const result = await db.query(
            `SELECT * FROM tokens 
             WHERE LOWER(creator_wallet) = LOWER(?) 
             ORDER BY created_at DESC`,
            [address]
        );
        res.json({ tokens: result.rows });
    } catch (err) {
        console.error('Analytics fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch token analytics' });
    }
});

// ── POST /api/wallets/release-tokens ─────────────────────────────────────────
// Called when user releases their token liquidity to a DEX
router.post('/release-tokens', async (req, res) => {
    const { contract_address, wallet_address, tx_hash } = req.body;
    if (!contract_address || !wallet_address) {
        return res.status(400).json({ error: 'contract_address and wallet_address required' });
    }
    try {
        // Mark token as trading_enabled and log the release
        await db.query(
            `UPDATE tokens SET trading_enabled = 1 WHERE LOWER(contract_address) = LOWER(?)`,
            [contract_address]
        );
        // Log to treasury for audit trail
        if (tx_hash) {
            await db.query(
                `INSERT OR IGNORE INTO treasury_transfers 
                 (amount_bnb, asset, amount_usd, source_contract, destination_address, tx_hash, transfer_type)
                 VALUES (0, 'BNB', 0, ?, ?, ?, 'dex_release')`,
                [contract_address, wallet_address.toLowerCase(), tx_hash]
            );
        }
        res.json({ success: true, message: 'Token released to DEX' });
    } catch (err) {
        console.error('Release tokens error:', err);
        res.status(500).json({ error: 'Failed to process token release' });
    }
});

// ── GET /api/wallets/stats/:address ──────────────────────────────────────────
// Returns aggregate trading stats (Total Volume, Profit/Loss)
router.get('/stats/:address', async (req, res) => {
    const { address } = req.params;
    try {
        const stats = await db.query(`
            SELECT 
                COUNT(*) as total_trades,
                COALESCE(SUM(amount_bnb), 0) as total_volume_bnb,
                COALESCE(SUM(pnl_bnb), 0) as total_pnl_bnb
            FROM trades 
            WHERE LOWER(trader_wallet) = LOWER(?)
        `, [address]);
        res.json(stats.rows[0] || { total_trades: 0, total_volume_bnb: 0, total_pnl_bnb: 0 });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// ── GET /api/wallets/trades/:address ──────────────────────────────────────────
// Returns last 200 trades for the profile history and calendar.
// Joined with tokens table; for futures rows where token_address is not in
// tokens, falls back to the token_symbol/trade_type stored on the trade row.
router.get('/trades/:address', async (req, res) => {
    const { address } = req.params;
    try {
        const trades = await db.query(`
            SELECT
                t.*,
                COALESCE(tk.symbol,   t.token_symbol, t.trade_type) AS token_symbol,
                COALESCE(tk.logo_url, '')                             AS token_logo,
                COALESCE(tk.name,     t.token_symbol, 'Unknown')     AS token_name
            FROM trades t
            LEFT JOIN tokens tk ON LOWER(t.token_address) = LOWER(tk.contract_address)
            WHERE LOWER(t.trader_wallet) = LOWER(?)
            ORDER BY t.timestamp DESC LIMIT 200
        `, [address]);
        res.json(trades.rows);
    } catch (err) {
        console.error('Fetch trades error:', err);
        res.status(500).json({ error: 'Failed to fetch trades' });
    }
});

// ── GET /api/futures/active/:address ─────────────────────────────────────────
// Returns currently unclosed futures positions by checking position_id links
router.get('/active/:address', async (req, res) => {
    const { address } = req.params;
    try {
        const active = await db.query(`
            SELECT * FROM trades 
            WHERE LOWER(trader_wallet) = LOWER(?) 
            AND trade_type = 'futures_open'
            AND position_id NOT IN (
                SELECT position_id FROM trades 
                WHERE LOWER(trader_wallet) = LOWER(?) 
                AND trade_type = 'futures_close'
                AND position_id IS NOT NULL
            )
        `, [address, address]);
        res.json(active.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch active positions' });
    }
});

// ── SMART MONEY HUB ENDPOINTS ────────────────────────────────────────────────

// POST /api/wallets/smart-money/invest
router.post('/smart-money/invest', async (req, res) => {
    const { wallet_address, bucket_id, bucket_name, invest_amount, tx_hash, bucket_json } = req.body;
    if (!wallet_address || !bucket_id) return res.status(400).json({ error: 'Incomplete data' });
    try {
        await db.query(
            `INSERT INTO smart_money_investments (wallet_address, bucket_id, bucket_name, invest_amount, tx_hash, bucket_json)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [wallet_address.toLowerCase(), bucket_id, bucket_name, invest_amount, tx_hash, JSON.stringify(bucket_json || [])]
        );

        // Also log fee to treasury for admin visibility
        await db.query(
            `INSERT INTO treasury_transfers (amount_bnb, asset, amount_usd, source_contract, destination_address, tx_hash, transfer_type)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [0, 'USDT', 1.0, 'SMART_MONEY_HUB', '0x279A5618Ff049667234c030792C0594B311A0451', tx_hash, 'smart_money_fee']
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Smart Money Sync Error:', err);
        res.status(500).json({ error: 'Failed to log investment' });
    }
});

// GET /api/wallets/smart-money/investments/:address
router.get('/smart-money/investments/:address', async (req, res) => {
    const { address } = req.params;
    try {
        const result = await db.query(
            'SELECT * FROM smart_money_investments WHERE LOWER(wallet_address) = LOWER(?) ORDER BY timestamp DESC',
            [address]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch investments' });
    }
});

// ── YIELD INTELLIGENCE ENDPOINTS ─────────────────────────────────────────────

// POST /api/wallets/yield/invest
router.post('/yield/invest', async (req, res) => {
    console.log('[Yield] 📥 Incoming Institutional Investment:', req.body);
    const { wallet_address, protocol_name, apy_percentage, amount_usdt, tx_hash } = req.body;
    
    if (!wallet_address || !protocol_name || !amount_usdt || !tx_hash) {
        console.error('[Yield] ❌ Missing required data:', { wallet_address, protocol_name, amount_usdt, tx_hash });
        return res.status(400).json({ error: 'Missing required investment data' });
    }

    try {
        const capital = parseFloat(amount_usdt);
        const apy = parseFloat(apy_percentage);
        
        // Institutional Calculations
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 365);
        // ISO format with space for SQLite/Postgres compatibility
        const deadlineStr = deadline.toISOString().slice(0, 19).replace('T', ' ');

        // Ensure no NaN values
        const safeApy = isNaN(apy) ? 0 : apy;
        const safeCapital = isNaN(capital) ? 0 : capital;
        const daily_yield = (safeCapital * safeApy / 100) / 365;
        const expected_total_yield = (safeCapital * safeApy / 100);
        const expected_balance_365d = safeCapital + expected_total_yield;

        console.log(`[Yield] 📊 Processing: Capital=$${safeCapital}, APY=${safeApy}%, Daily=$${daily_yield.toFixed(4)}`);

        await db.query(
            `INSERT INTO yield_investments (
                wallet_address, protocol_name, apy_percentage, 
                amount_usdt, daily_yield, deadline, tx_hash, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                wallet_address.toLowerCase(), 
                protocol_name, 
                apy, 
                capital, 
                daily_yield, 
                deadlineStr, 
                tx_hash, 
                'ACTIVE'
            ]
        );

        // Log to treasury ledger for institutional audit
        await db.query(
            `INSERT INTO treasury_transfers (amount_bnb, asset, amount_usd, source_contract, destination_address, tx_hash, transfer_type)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [0, 'USDT', capital, protocol_name, 'INSTITUTIONAL_TREASURY', tx_hash, 'yield_deployment']
        );

        console.log(`[Yield] ✅ Investment Logged Successfully: ${tx_hash}`);
        res.json({ 
            success: true, 
            message: 'Institutional yield deployment logged.',
            data: { daily_yield, expected_balance_365d, deadline: deadlineStr }
        });
    } catch (err) {
        console.error('[Yield] ❌ Database Error:', err.message);
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Transaction already registered' });
        }
        res.status(500).json({ error: 'Failed to record institutional yield' });
    }
});

// GET /api/wallets/yield/investments/:address
router.get('/yield/investments/:address', async (req, res) => {
    const { address } = req.params;
    console.log('[Yield] 🔍 Fetching History for:', address);
    try {
        const result = await db.query(
            'SELECT * FROM yield_investments WHERE LOWER(wallet_address) = LOWER(?) ORDER BY timestamp DESC',
            [address]
        );

        const processed = result.rows.map(inv => {
            // Robust date parsing for SQLite
            const ts = inv.timestamp ? inv.timestamp.replace(' ', 'T') : null;
            const start = ts ? new Date(ts) : new Date();
            const now = new Date();
            
            const validStart = isNaN(start.getTime()) ? now : start;
            const diffTime = Math.abs(now - validStart);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            // Interest + Principal accumulation
            const dailyYield = parseFloat(inv.daily_yield || 0);
            const accrued = isNaN(dailyYield) ? 0 : (dailyYield * diffDays);
            const amountUsdt = parseFloat(inv.amount_usdt || 0);
            const safeAmount = isNaN(amountUsdt) ? 0 : amountUsdt;
            
            return {
                ...inv,
                total_accrued: accrued,
                total_balance: safeAmount + accrued
            };
        });

        res.json(processed);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch yield history' });
    }
});

// GET /api/wallets/yield/all (Admin)
router.get('/yield/all', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM yield_investments ORDER BY timestamp DESC');
        
        const processed = result.rows.map(inv => {
            const start = new Date(inv.timestamp);
            const now = new Date();
            const validStart = isNaN(start.getTime()) ? now : start;
            const diffTime = Math.abs(now - validStart);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            const dailyYield = parseFloat(inv.daily_yield || 0);
            const accrued = dailyYield * diffDays;
            const amountUsdt = parseFloat(inv.amount_usdt || 0);

            return {
                ...inv,
                total_accrued: accrued,
                total_balance: amountUsdt + accrued
            };
        });

        res.json(processed);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch global yield ledger' });
    }
});
module.exports = router;
