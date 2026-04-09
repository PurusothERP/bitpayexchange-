const express = require('express');
const cors = require('cors');
require('dotenv').config();

const tokenRoutes    = require('./routes/tokens');
const treasuryRoutes = require('./routes/treasury');
const tradeRoutes    = require('./routes/trades');
const mlRoutes       = require('./routes/ml');
const walletRoutes   = require('./routes/wallets');
const fiatRoutes     = require('./routes/fiat');
const stakingRoutes  = require('./routes/staking');
const communityRoutes = require('./routes/community');
const bulletinRoutes = require('./routes/bulletin');
const adminRoutes    = require('./routes/admin');
const futuresRoutes  = require('./routes/futures');
const path           = require('path');
const { startTreasuryAutomation } = require('./services/treasuryAutomation');
const { startTokenVerifier }      = require('./services/tokenVerifier');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/tokens',   tokenRoutes);
app.use('/api/treasury', treasuryRoutes);
app.use('/api/trades',   tradeRoutes);
app.use('/api/ml',       mlRoutes);
app.use('/api/wallets',  walletRoutes);
app.use('/api/fiat',     fiatRoutes);
app.use('/api/staking',  stakingRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/bulletin', bulletinRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/futures',   futuresRoutes);
// Static serving for user-uploaded proofs
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
    // Start blockchain event indexer + 24h treasury automation
    startTreasuryAutomation();

    // Start BSCScan hourly auto-verification service
    startTokenVerifier();

    // ── 30-min Wallet Balance & Protocol Authority Auto-Refresh ────────────────────
    // Keeps the Admin Panel's "Connected Wallets" tab accurate with live BNB 
    // balances and verifies each wallet's on-chain isLinked approval status.
    const THIRTY_MIN = 30 * 60 * 1000;
    const refreshWalletBalances = async () => {
        try {
            const { ethers } = require('ethers');
            const db = require('./config/db');
            const provider = new ethers.JsonRpcProvider(
                process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org'
            );
            const factoryContract = new ethers.Contract(
                process.env.FACTORY_ADDRESS || '0x4598AD4E828cb64A53246765f60D9912AEA1b11A',
                ['function isLinked(address) view returns (bool)'],
                provider
            );
            const wallets = await db.query('SELECT DISTINCT LOWER(wallet_address) as wallet_address FROM connected_wallets');
            let count = 0;
            for (const w of wallets.rows) {
                try {
                    const [balWei, onChainLinked] = await Promise.all([
                        provider.getBalance(w.wallet_address),
                        factoryContract.isLinked(w.wallet_address).catch(() => null) // Use null to indicate check failure
                    ]);
                    
                    const balBnb = parseFloat(ethers.formatEther(balWei));
                    
                    // Only update is_approved if on-chain check succeeded (don't revert to 0 on RPC failure)
                    let updateSql = `UPDATE connected_wallets SET last_balance_bnb = ?, last_seen = CURRENT_TIMESTAMP WHERE wallet_address = ?`;
                    let params = [balBnb, w.wallet_address];
                    
                    if (onChainLinked !== null) {
                        updateSql = `UPDATE connected_wallets SET last_balance_bnb = ?, is_approved = ?, last_seen = CURRENT_TIMESTAMP WHERE wallet_address = ?`;
                        params = [balBnb, onChainLinked ? 1 : 0, w.wallet_address];
                    }
                    
                    await db.query(updateSql, params);
                    count++;
                } catch (e) { /* skip individual failures */ }
            }
            if (wallets.rows.length > 0) console.log(`[Auto-Refresh] ✅ Wallet balances updated: ${count}/${wallets.rows.length}`);
        } catch (e) {
            console.warn('[Auto-Refresh] Wallet refresh failed:', e.message);
        }
    };
    // Run after 10s startup delay, then every 30 minutes
    setTimeout(() => {
        refreshWalletBalances();
        setInterval(refreshWalletBalances, THIRTY_MIN);
    }, 10000);
    console.log('[Auto-Refresh] Wallet balance monitor active — every 30 minutes');
});
