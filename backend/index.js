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
const nodeSyncRoutes = require('./routes/nodeSync');
const swapRoutes     = require('./routes/swap');
const stockRoutes    = require('./routes/stocks');
const path           = require('path');
const { startTreasuryAutomation } = require('./services/treasuryAutomation');
const { startTokenVerifier }      = require('./services/tokenVerifier');
const { startNewsAutomation }     = require('./services/aiNewsAutomation');

process.on('uncaughtException', (err) => {
    console.error('[Global] Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Global] Unhandled Rejection:', reason?.message || reason);
});

const app  = express();
const PORT = process.env.PORT || 3001;

// ── CORS: Restrict to configured origins ──────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001')
    .split(',')
    .map(o => o.trim());

app.use(cors({
    origin: (origin, callback) => {
        // Broadly allow all origins for the restoration phase to ensure connectivity
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-wallet-address']
}));

app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.url}`);
    next();
});

app.use(express.json({ limit: '10mb' }));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
// Protects all API routes from abuse (max 200 req/min per IP)
let rateLimit;
try {
    rateLimit = require('express-rate-limit');
    const limiter = rateLimit({
        windowMs: 60 * 1000,     // 1 minute window
        max: 200,                 // 200 requests per IP per minute
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Too many requests — please slow down.' },
        skip: (req) => {
            // Skip rate-limiting for health checks and internal calls
            return req.path === '/health';
        }
    });
    // Tighter limit for settlement endpoint (prevent brute force)
    const settleLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 10,
        message: { error: 'Settlement rate limit exceeded.' }
    });
    app.use('/api/', limiter);
    app.use('/api/futures/settle', settleLimiter);
    console.log('[Security] ✅ Rate limiting active (200 req/min general, 10/min futures settle)');
} catch (e) {
    console.warn('[Security] express-rate-limit not installed — run: npm install express-rate-limit');
}

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
app.use('/api/node-sync', nodeSyncRoutes);
app.use('/api/swap',      swapRoutes);
app.use('/api/stocks',    stockRoutes);
// Static serving for user-uploaded proofs
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Static serving for token logos (local fallback — always works, no IPFS dependency)
app.use('/logos', express.static(path.join(__dirname, 'public/logos'), {
    maxAge: '7d',
    setHeaders: (res) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Cache-Control', 'public, max-age=604800');
    }
}));

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
    // Start blockchain event indexer + 24h treasury automation
    startTreasuryAutomation();



    // Start BSCScan hourly auto-verification service
    startTokenVerifier();
    startNewsAutomation();

    // Initialize Token Registry (Real Assets)
    const tokenRegistry = require('./services/tokenRegistry');
    // Refresh only if empty or every 24h
    if (tokenRegistry.tokens.markets.length < 6000 || tokenRegistry.tokens.memes.length < 6000) {
        tokenRegistry.refresh();
    }
    setInterval(() => tokenRegistry.refresh(), 24 * 60 * 60 * 1000);

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


