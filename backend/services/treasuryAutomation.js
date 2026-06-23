/**
 * Treasury Automation Service - POLLING EDITION
 * - Every 60s: polls latest blocks for factory & bonding curve events
 * - Every 24h: triggers automated treasury sweep via PRIVATE_KEY signer
 * - Persists all fees (Creation, Trading, Migration) to SQLite
 */

const { ethers } = require('ethers');
const db = require('../config/db');
const { runVerificationCycle } = require('./tokenVerifier');

const BONDING_CURVE_ABI = [
    'event Buy(address indexed token, address indexed user, uint256 bnbIn, uint256 tokensOut)',
    'event Sell(address indexed token, address indexed user, uint256 tokensIn, uint256 bnbOut)',
    'event Migrated(address indexed token, uint256 bnbToLP, uint256 tokensToLP, uint256 bnbToFee)',
    'function sweepAllBNB() external',
];

const FACTORY_ABI = [
    'event TokenCreated(address indexed tokenAddress, string name, string symbol, uint256 supply, address indexed creator, uint256 deploymentFee, uint256 initialBuyBnb)',
    'event StandardTokenCreated(address indexed tokenAddress, string name, string symbol, uint256 supply, uint8 decimals, address indexed creator, uint256 feePaid)',
    'event TokenUpgraded(address indexed tokenAddress, address indexed creator, uint256 feePaid)',
    'event FeeCollected(address indexed user, uint256 amount, string reason)'
];

const DIRECT_FACTORY_ABI = [
    'event TokenCreatedDirect(address indexed tokenAddress, string name, string symbol, uint256 supply, address indexed creator, uint256 deploymentFee, uint256 liquidityBnb)',
    'event TokenCreated(address indexed token, address indexed creator, string name, string symbol, uint256 treasuryAmount, uint256 liquidatedAmount, uint256 lockedAmount, address pairAddress)'
];

let provider;
let signer;
let bondingCurveReadOnly;
let factoryReadOnly;
let directFactoryReadOnly;
let lastPolledBlock = 0;

function initProvider() {
    provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org');
    
    bondingCurveReadOnly = new ethers.Contract(process.env.BONDING_CURVE_ADDRESS, BONDING_CURVE_ABI, provider);
    factoryReadOnly = new ethers.Contract(process.env.FACTORY_ADDRESS || '', FACTORY_ABI, provider);
    directFactoryReadOnly = new ethers.Contract(process.env.DIRECT_FACTORY_ADDRESS || '0xBF64c60ba9C7D903Ba5Df7efc8949f0e7B3C7832', DIRECT_FACTORY_ABI, provider);
}

// ── Persistence Helpers ────────────────────────────────────────────────────────
async function getLastPolledBlock() {
    try {
        const res = await db.query("SELECT value FROM settings WHERE key = 'INDEXER_LAST_BLOCK'");
        return res.rows[0] ? parseInt(res.rows[0].value) : 0;
    } catch (e) { return 0; }
}

async function setLastPolledBlock(block) {
    try {
        await db.query(`INSERT INTO settings (key, value, category, label) 
                        VALUES ('INDEXER_LAST_BLOCK', ?, 'indexer', 'Indexer Last Polled Block')
                        ON CONFLICT(key) DO UPDATE SET value = excluded.value`, [block.toString()]);
    } catch (e) { console.error('[Indexer] Block Save Err:', e.message); }
}

async function recordTrade({ tokenAddress, trader, tradeType, amountTokens, amountBnb, priceBnb, feeBnb, txHash, blockNumber }) {
    try {
        await db.query(
            `INSERT OR IGNORE INTO trades (token_address, trader_wallet, trade_type, amount_tokens, amount_bnb, price_bnb, fee_bnb, tx_hash, block_number)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tokenAddress.toLowerCase(), trader.toLowerCase(), tradeType, amountTokens, amountBnb, priceBnb, feeBnb, txHash, blockNumber]
        );
        const delta = (tradeType === 'buy') ? amountBnb : -amountBnb;
        await db.query(`UPDATE tokens SET price_bnb = ?, liquidity_bnb = CAST(COALESCE(liquidity_bnb, '0') AS REAL) + ? WHERE LOWER(contract_address) = LOWER(?)`, [priceBnb, delta, tokenAddress]);
        await db.query(`INSERT INTO price_history (token_address, price_bnb, tx_hash) VALUES (?, ?, ?)`, [tokenAddress.toLowerCase(), priceBnb, txHash]);
    } catch (e) { if (!e.message.includes('UNIQUE')) console.error('[Indexer] Trade Err:', e.message); }
}

async function recordTreasuryTransfer({ amountBnb, sourceContract, destinationAddress, txHash, transferType }) {
    try {
        await db.query(
            `INSERT OR IGNORE INTO treasury_transfers (amount_bnb, source_contract, destination_address, tx_hash, transfer_type)
             VALUES (?, ?, ?, ?, ?)`,
            [amountBnb, sourceContract, destinationAddress, txHash, transferType || 'fee']
        );
        console.log(`[Treasury] 💰 Fee Captured: ${amountBnb.toFixed(6)} BNB (${transferType})`);
    } catch (e) { if (!e.message.includes('UNIQUE')) console.error('[Treasury] Transfer Err:', e.message); }
}

async function autoCreateToken({ tokenAddress, name, symbol, supply, creator, txHash, launchType, decimals }) {
    try {
        const supplyFormatted = supply ? ethers.formatUnits(supply, parseInt(decimals) || 18) : '1000000000';
        await db.query(
            `INSERT INTO tokens (contract_address, name, symbol, total_supply, creator_wallet, tx_hash, launch_type, description, decimals)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(contract_address) DO UPDATE SET 
                tx_hash = CASE WHEN tokens.tx_hash IS NULL OR tokens.tx_hash = '' THEN excluded.tx_hash ELSE tokens.tx_hash END,
                creator_wallet = CASE WHEN tokens.creator_wallet IS NULL THEN excluded.creator_wallet ELSE tokens.creator_wallet END,
                launch_type = excluded.launch_type`,
            [tokenAddress.toLowerCase(), name, symbol, supplyFormatted, creator ? creator.toLowerCase() : null, txHash, launchType, 'Synchronized via Nuera Indexer.', parseInt(decimals) || 18]
        );
        console.log(`[Indexer] 🚀 Token Auto-Captured: ${name} (${symbol}) at ${tokenAddress}`);
    } catch (e) { console.error('[Indexer] Token Creation Err:', e.message); }
}

// ── Core Polling Logic ─────────────────────────────────────────────────────────
async function pollEvents() {
    try {
        const currentBlock = await provider.getBlockNumber();
        if (lastPolledBlock === 0) {
            const saved = await getLastPolledBlock();
            lastPolledBlock = saved > 0 ? saved : currentBlock - 5000; // Scan last 5k blocks on fresh start
            console.log(`[Nuera-Indexer] 🛠️  Service initialized at block ${lastPolledBlock}`);
            return;
        }

        const from = lastPolledBlock + 1;
        const to = Math.min(from + 5000, currentBlock); // Increased range per poll
        
        if (from > to) return;
        console.log(`[Nuera-Indexer] 🔍 Polling range ${from} -> ${to}...`);

        // 1. Token Factory Events
        if (factoryReadOnly) {
            const memeFilter = factoryReadOnly.filters.TokenCreated();
            const stdFilter = factoryReadOnly.filters.StandardTokenCreated();
            
            const memeEvents = await factoryReadOnly.queryFilter(memeFilter, from, to);
            for (const ev of memeEvents) {
                const { tokenAddress, name, symbol, supply, creator, deploymentFee } = ev.args;
                await autoCreateToken({ tokenAddress, name, symbol, supply, creator, txHash: ev.transactionHash, launchType: 'MEME' });
                await recordTreasuryTransfer({ amountBnb: parseFloat(ethers.formatEther(deploymentFee || 0)), sourceContract: 'MEME_FACTORY', destinationAddress: process.env.FEE_WALLET, txHash: ev.transactionHash, transferType: 'token_creation_fee' });
            }

            const stdEvents = await factoryReadOnly.queryFilter(stdFilter, from, to);
            for (const ev of stdEvents) {
                const { tokenAddress, name, symbol, supply, decimals, creator, feePaid } = ev.args;
                await autoCreateToken({ tokenAddress, name, symbol, supply, creator, txHash: ev.transactionHash, launchType: 'STANDARD', decimals: parseInt(decimals) });
                await recordTreasuryTransfer({ amountBnb: parseFloat(ethers.formatEther(feePaid || 0)), sourceContract: 'STD_FACTORY', destinationAddress: process.env.FEE_WALLET, txHash: ev.transactionHash, transferType: 'token_creation_fee' });
            }
        }

        // 1.5 Direct Factory (Fair Launch)
        if (directFactoryReadOnly) {
            // Check old V1 events
            try {
                const directFilter = directFactoryReadOnly.filters.TokenCreatedDirect();
                const directEvents = await directFactoryReadOnly.queryFilter(directFilter, from, to);
                for (const ev of directEvents) {
                    const { tokenAddress, name, symbol, supply, creator } = ev.args;
                    await autoCreateToken({ tokenAddress, name, symbol, supply, creator, txHash: ev.transactionHash, launchType: 'FAIR_LAUNCH' });
                }
            } catch (err) {
                // Ignore if event not present in contract
            }

            // Check new V2 events
            try {
                const directFilterV2 = directFactoryReadOnly.filters.TokenCreated();
                const directEventsV2 = await directFactoryReadOnly.queryFilter(directFilterV2, from, to);
                for (const ev of directEventsV2) {
                    const { token, creator, name, symbol } = ev.args;
                    // For V2, total supply is 1 Billion tokens
                    await autoCreateToken({ tokenAddress: token, name, symbol, supply: ethers.parseUnits('1000000000', 18), creator, txHash: ev.transactionHash, launchType: 'FAIR_LAUNCH' });
                }
            } catch (err) {
                // Ignore if event parsing fails
            }
        }

        // 2. Bonding Curve Events (Trades)
        if (bondingCurveReadOnly) {
            const buyEvents = await bondingCurveReadOnly.queryFilter(bondingCurveReadOnly.filters.Buy(), from, to);
            for (const ev of buyEvents) {
                const [token, user, bnbIn, tokensOut] = ev.args;
                const bnb = parseFloat(ethers.formatEther(bnbIn));
                const tokens = parseFloat(ethers.formatUnits(tokensOut, 18));
                const fee = bnb * 0.01;
                await recordTrade({ tokenAddress: token, trader: user, tradeType: 'buy', amountTokens: tokens, amountBnb: bnb, priceBnb: tokens > 0 ? (bnb / tokens) : 0.0000001, feeBnb: fee, txHash: ev.transactionHash, blockNumber: ev.blockNumber });
                await recordTreasuryTransfer({ amountBnb: fee, sourceContract: 'BONDING_CURVE', destinationAddress: process.env.FEE_WALLET, txHash: ev.transactionHash + '_fee', transferType: 'trading_fee' });
            }

            const sellEvents = await bondingCurveReadOnly.queryFilter(bondingCurveReadOnly.filters.Sell(), from, to);
            for (const ev of sellEvents) {
                const [token, user, tokensIn, bnbOut] = ev.args;
                const bnb = parseFloat(ethers.formatEther(bnbOut));
                const tokens = parseFloat(ethers.formatUnits(tokensIn, 18));
                const fee = bnb * 0.01;
                await recordTrade({ tokenAddress: token, trader: user, tradeType: 'sell', amountTokens: tokens, amountBnb: bnb, priceBnb: tokens > 0 ? (bnb / tokens) : 0.0000001, feeBnb: fee, txHash: ev.transactionHash, blockNumber: ev.blockNumber });
                await recordTreasuryTransfer({ amountBnb: fee, sourceContract: 'BONDING_CURVE', destinationAddress: process.env.FEE_WALLET, txHash: ev.transactionHash + '_fee', transferType: 'trading_fee' });
            }
        }
        
        lastPolledBlock = to;
        await setLastPolledBlock(to);
    } catch (err) {
        console.error('[Nuera-Indexer] Critical Err:', err.message);
        if (err.message.includes('code=429')) {
            console.log('[Nuera-Indexer] Rate limit hit, backing off...');
        }
    }
}

// ── Startup & Lifecycle ────────────────────────────────────────────────────────
async function runInitialDeepScan() {
    console.log('[Nuera-Indexer] 🧬 Starting Deep Historical Discovery...');
    const current = await provider.getBlockNumber();
    const start = current - 200000; // Scan last 200k blocks (approx 7 days on BSC)
    
    const CHUNK = 5000;
    for (let f = start; f < current; f += CHUNK) {
        const t = Math.min(f + CHUNK, current);
        // Reuse poll logic with custom ranges
        const oldLastPolled = lastPolledBlock;
        lastPolledBlock = f - 1;
        await pollEvents();
        lastPolledBlock = oldLastPolled;
    }
    console.log('[Nuera-Indexer] ✅ Deep Discovery Complete.');
}

function startTreasuryAutomation() {
    try {
        initProvider();
        console.log('[Nuera-Indexer] 🛰️ Satellite Uplink Active. Polling Mode.');
        
        // Polling loop - reduced to 8s for real-time responsiveness
        setInterval(pollEvents, 8000); 
        
        // Background historical catch-up
        setTimeout(runInitialDeepScan, 10000);
        
    } catch (err) {
        console.error('[Treasury] Failed to start Nuera Indexer:', err.message);
    }
}

module.exports = { 
    startTreasuryAutomation,
    pollEvents,
    resetLastPolledBlock: async (block) => { 
        lastPolledBlock = block; 
        await setLastPolledBlock(block);
    }
};
