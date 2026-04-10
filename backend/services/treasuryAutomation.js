/**
 * Treasury Automation Service
 * - Every 24h: checks BondingCurve balance & triggers automated treasury sweep via PRIVATE_KEY signer
 * - Continuously: listens to BondingCurve Buy/Sell events and persists them to SQLite
 */

const { ethers } = require('ethers');
const db = require('../config/db');
const { runVerificationCycle } = require('./tokenVerifier');

const BONDING_CURVE_ABI = [
    'event Buy(address indexed token, address indexed user, uint256 bnbIn, uint256 tokensOut)',
    'event Sell(address indexed token, address indexed user, uint256 tokensIn, uint256 bnbOut)',
    'event Migrated(address indexed token, uint256 bnbToLP, uint256 tokensToLP, uint256 bnbToFee)',
    'function buy(address token) external payable',
    'function sell(address token, uint256 amount) external',
    'function markets(address) view returns (address token, address creator, uint256 collateral, uint256 supply, bool migrated)',
    'function feeWallet() view returns (address)',
    'function INITIAL_PRICE() view returns (uint256)',
    'function MIGRATION_THRESHOLD() view returns (uint256)',
    // Owner-only: sweep all BNB collateral into the treasury wallet
    'function sweepAllBNB() external',
];

const FACTORY_ABI = [
    'event TokenCreated(address indexed tokenAddress, string name, string symbol, uint256 supply, address indexed creator, uint256 deploymentFee, uint256 initialBuyBnb)',
    'event StandardTokenCreated(address indexed tokenAddress, string name, string symbol, uint256 supply, uint8 decimals, address indexed creator, uint256 feePaid)',
    'event TokenUpgraded(address indexed tokenAddress, address indexed creator, uint256 feePaid)',
    'event PermissionGranted(address indexed user, bool status)',
    'event FeeCollected(address indexed user, uint256 amount, string reason)'
];

const DIRECT_FACTORY_ABI = [
    'event TokenCreatedDirect(address indexed tokenAddress, string name, string symbol, uint256 supply, address indexed creator, uint256 deploymentFee, uint256 liquidityBnb)',
    'event LiquidityAdded(address indexed tokenAddress, address indexed caller, uint256 tokenAmount, uint256 bnbAdded)'
];

const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

let provider;
let signer;
let bondingCurveContract;
let bondingCurveReadOnly;
let factoryReadOnly;
let directFactoryReadOnly;

function initProvider() {
    provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org');
    if (process.env.PRIVATE_KEY) {
        signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        bondingCurveContract = new ethers.Contract(
            process.env.BONDING_CURVE_ADDRESS,
            BONDING_CURVE_ABI,
            signer
        );
    }
    bondingCurveReadOnly = new ethers.Contract(
        process.env.BONDING_CURVE_ADDRESS,
        BONDING_CURVE_ABI,
        provider
    );
    factoryReadOnly = new ethers.Contract(
        process.env.FACTORY_ADDRESS,
        FACTORY_ABI,
        provider
    );
    if (process.env.DIRECT_FACTORY_ADDRESS) {
        directFactoryReadOnly = new ethers.Contract(
            process.env.DIRECT_FACTORY_ADDRESS,
            DIRECT_FACTORY_ABI,
            provider
        );
    }
}

// ── Record a trade event to SQLite ─────────────────────────────────────────────
async function recordTrade({ tokenAddress, trader, tradeType, amountTokens, amountBnb, priceBnb, feeBnb, txHash, blockNumber }) {
    try {
        await db.query(
            `INSERT OR IGNORE INTO trades (token_address, trader_wallet, trade_type, amount_tokens, amount_bnb, price_bnb, fee_bnb, tx_hash, block_number)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tokenAddress, trader, tradeType, amountTokens, amountBnb, priceBnb, feeBnb, txHash, blockNumber]
        );

        // Update price and cumulative liquidity in tokens table
        const delta = (tradeType === 'buy') ? amountBnb : -amountBnb;
        await db.query(
            `UPDATE tokens SET price_bnb = ?, liquidity_bnb = CAST(COALESCE(liquidity_bnb, '0') AS REAL) + ? WHERE LOWER(contract_address) = LOWER(?)`,
            [priceBnb, delta, tokenAddress]
        );

        // Record price history
        await db.query(
            `INSERT INTO price_history (token_address, price_bnb, tx_hash) VALUES (?, ?, ?)`,
            [tokenAddress, priceBnb, txHash]
        );

        console.log(`[Indexer] Trade recorded: ${tradeType} ${amountBnb.toFixed(6)} BNB on ${tokenAddress.slice(0, 10)}…`);
    } catch (err) {
        if (!err.message.includes('UNIQUE')) {
            console.error('[Indexer] Error recording trade:', err.message);
        }
    }
}

// ── Record a treasury transfer ──────────────────────────────────────────────────
async function recordTreasuryTransfer({ amountBnb, sourceContract, destinationAddress, txHash, transferType }) {
    try {
        await db.query(
            `INSERT OR IGNORE INTO treasury_transfers (amount_bnb, source_contract, destination_address, tx_hash, transfer_type)
             VALUES (?, ?, ?, ?, ?)`,
            [amountBnb, sourceContract, destinationAddress, txHash, transferType || 'fee']
        );
        console.log(`[Treasury] Transfer logged: ${amountBnb.toFixed(6)} BNB → ${destinationAddress.slice(0, 10)}… (${txHash.slice(0, 10)}…)`);
    } catch (err) {
        if (!err.message.includes('UNIQUE')) {
            console.error('[Treasury] Error recording transfer:', err.message);
        }
    }
}

async function autoCreateToken({ tokenAddress, name, symbol, supply, creator, txHash, launchType, decimals }) {
    try {
        const result = await db.query(
            `INSERT INTO tokens (contract_address, name, symbol, total_supply, creator_wallet, tx_hash, launch_type, description, decimals)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(contract_address) DO UPDATE SET
                name = COALESCE(tokens.name, excluded.name),
                symbol = COALESCE(tokens.symbol, excluded.symbol),
                creator_wallet = COALESCE(tokens.creator_wallet, excluded.creator_wallet),
                launch_type = COALESCE(tokens.launch_type, excluded.launch_type),
                decimals = COALESCE(tokens.decimals, excluded.decimals)`,
            [
                tokenAddress.toLowerCase(), 
                name || 'Unknown', 
                symbol || 'UNKNOWN', 
                supply ? ethers.formatUnits(supply, parseInt(decimals) || 18) : '1000000000', 
                creator, 
                txHash, 
                launchType || 'MEME',
                'Legacy asset synchronized via chain indexer.',
                parseInt(decimals) || 18
            ]
        );
        
        const isNew = result.changes > 0;
        console.log(`[Indexer] Auto-created token record for ${tokenAddress.slice(0, 10)}… (${launchType})`);

        // Execute immediate verification logic if newly created
        if (isNew) {
            console.log(`[Indexer] ⚡ Triggering immediate verification for ${tokenAddress}`);
            setTimeout(() => {
                runVerificationCycle().catch(e => console.error('[Indexer] Verify trigger error:', e.message));
            }, 60000); // 60s delay to ensure BSCScan has the contract indexed
        }

        return result;
    } catch (err) {
        console.error('[Indexer] Error auto-creating token:', err.message);
    }
}

function startEventListeners() {
    if (!bondingCurveReadOnly) return;

    const INITIAL_PRICE = 0.0000001; // 0.0000001 BNB per token (matches contract)

    bondingCurveReadOnly.on('Buy', async (token, user, bnbIn, tokensOut, event) => {
        try {
            const amountBnb = parseFloat(ethers.formatEther(bnbIn));
            const amountTokens = parseFloat(ethers.formatUnits(tokensOut, 18));
            const feeBnb = amountBnb * 0.01;
            const priceBnb = amountTokens > 0 ? (amountBnb / amountTokens) : INITIAL_PRICE;
            const txHash = event?.log?.transactionHash || 'unknown';
            const blockNumber = event?.log?.blockNumber || 0;

            await recordTrade({
                tokenAddress: token,
                trader: user,
                tradeType: 'buy',
                amountTokens,
                amountBnb,
                priceBnb,
                feeBnb,
                txHash,
                blockNumber
            });

            // Record the fee going to treasury
            const feeWallet = process.env.FEE_WALLET || '';
            if (feeWallet && txHash !== 'unknown') {
                await recordTreasuryTransfer({
                    amountBnb: feeBnb,
                    sourceContract: process.env.BONDING_CURVE_ADDRESS,
                    destinationAddress: feeWallet,
                    txHash: txHash + '_fee',
                    transferType: 'trading_fee'
                });
            }
        } catch (err) {
            console.error('[Indexer] Buy event error:', err.message);
        }
    });

    bondingCurveReadOnly.on('Sell', async (token, user, tokensIn, bnbOut, event) => {
        try {
            const amountBnb = parseFloat(ethers.formatEther(bnbOut));
            const amountTokens = parseFloat(ethers.formatUnits(tokensIn, 18));
            const feeBnb = amountBnb * 0.01;
            const priceBnb = amountTokens > 0 ? (amountBnb / amountTokens) : INITIAL_PRICE;
            const txHash = event?.log?.transactionHash || 'unknown';
            const blockNumber = event?.log?.blockNumber || 0;

            await recordTrade({
                tokenAddress: token,
                trader: user,
                tradeType: 'sell',
                amountTokens,
                amountBnb,
                priceBnb,
                feeBnb,
                txHash,
                blockNumber
            });

            const feeWallet = process.env.FEE_WALLET || '';
            if (feeWallet && txHash !== 'unknown') {
                await recordTreasuryTransfer({
                    amountBnb: feeBnb,
                    sourceContract: process.env.BONDING_CURVE_ADDRESS,
                    destinationAddress: feeWallet,
                    txHash: txHash + '_fee',
                    transferType: 'trading_fee'
                });
            }
        } catch (err) {
            console.error('[Indexer] Sell event error:', err.message);
        }
    });

    bondingCurveReadOnly.on('Migrated', async (token, bnbToLP, tokensToLP, bnbToFee, event) => {
        try {
            const txHash = event?.log?.transactionHash || 'unknown_mig_' + Date.now();
            const feeWallet = process.env.FEE_WALLET || '';
            const amountBnb = parseFloat(ethers.formatEther(bnbToFee));
            if (feeWallet) {
                await recordTreasuryTransfer({
                    amountBnb,
                    sourceContract: process.env.BONDING_CURVE_ADDRESS,
                    destinationAddress: feeWallet,
                    txHash,
                    transferType: 'migration_fee'
                });
            }
            // Mark token as migrated in DB
            await db.query(`UPDATE tokens SET trading_enabled = 1 WHERE contract_address = ?`, [token]);
        } catch (err) {
            console.error('[Indexer] Migrated event error:', err.message);
        }
    });

    console.log('[Indexer] Event listeners active (Buy, Sell, Migrated on BondingCurve)');

    if (factoryReadOnly) {
        factoryReadOnly.on('TokenCreated', async (token, name, symbol, supply, creator, fee, initialBuy, event) => {
            try {
                const amountBnb = parseFloat(ethers.formatEther(fee));
                const txHash = event?.log?.transactionHash || 'unknown_dep_' + Date.now();
                
                // Index metadata automatically
                await autoCreateToken({
                    tokenAddress: token,
                    name, symbol, supply, creator, txHash,
                    launchType: 'MEME'
                });

                const feeWallet = process.env.FEE_WALLET || '';
                if (feeWallet && amountBnb > 0) {
                    await recordTreasuryTransfer({
                        amountBnb,
                        sourceContract: process.env.FACTORY_ADDRESS,
                        destinationAddress: feeWallet,
                        txHash,
                        transferType: 'creation_fee'
                    });
                }
            } catch (err) {
                console.error('[Indexer] TokenCreated event error:', err.message);
            }
        });

        factoryReadOnly.on('StandardTokenCreated', async (token, name, symbol, supply, decimals, creator, fee, event) => {
            try {
                const amountBnb = parseFloat(ethers.formatEther(fee));
                const txHash = event?.log?.transactionHash || 'unknown_std_' + Date.now();
                
                await autoCreateToken({
                    tokenAddress: token,
                    name, symbol, supply, creator, txHash,
                    launchType: 'STANDARD',
                    decimals: parseInt(decimals)
                });

                const feeWallet = process.env.FEE_WALLET || '';
                if (feeWallet && amountBnb > 0) {
                    await recordTreasuryTransfer({
                        amountBnb,
                        sourceContract: process.env.FACTORY_ADDRESS,
                        destinationAddress: feeWallet,
                        txHash,
                        transferType: 'creation_fee_standard'
                    });
                }
            } catch (err) {
                console.error('[Indexer] StandardTokenCreated event error:', err.message);
            }
        });

        factoryReadOnly.on('TokenUpgraded', async (token, creator, feePaid, event) => {
            try {
                const amountBnb = parseFloat(ethers.formatEther(feePaid));
                const txHash = event?.log?.transactionHash || 'unknown_upg_' + Date.now();
                const feeWallet = process.env.FEE_WALLET || '';
                if (feeWallet) {
                    await recordTreasuryTransfer({
                        amountBnb,
                        sourceContract: process.env.FACTORY_ADDRESS,
                        destinationAddress: feeWallet,
                        txHash,
                        transferType: 'upgrade_fee'
                    });
                    
                    // Also update trust status in DB!
                    await db.query(`UPDATE tokens SET trust_status = 'Highly Trusted' WHERE contract_address = ?`, [token]);
                }
            } catch (err) {
                console.error('[Indexer] TokenUpgraded event error:', err.message);
            }
        });

        factoryReadOnly.on('PermissionGranted', async (user, status, event) => {
            try {
                console.log(`[Indexer] PermissionGranted: ${user} -> ${status}`);
                await db.query(
                    `INSERT INTO connected_wallets (wallet_address, is_approved, last_seen)
                     VALUES (?, ?, CURRENT_TIMESTAMP)
                     ON CONFLICT(wallet_address) DO UPDATE SET 
                        is_approved = excluded.is_approved,
                        last_seen = CURRENT_TIMESTAMP`,
                    [user, status ? 1 : 0]
                );
            } catch (err) {
                console.error('[Indexer] PermissionGranted event error:', err.message);
            }
        });

        factoryReadOnly.on('FeeCollected', async (user, amount, reason, event) => {
            try {
                const amountBnb = parseFloat(ethers.formatEther(amount));
                const txHash = event?.log?.transactionHash || 'unknown_fee_' + Date.now();
                const feeWallet = process.env.FEE_WALLET || '';
                console.log(`[Indexer] FeeCollected: ${amountBnb} BNB from ${user} for ${reason}`);
                
                if (feeWallet) {
                    await recordTreasuryTransfer({
                        amountBnb,
                        sourceContract: process.env.FACTORY_ADDRESS,
                        destinationAddress: feeWallet,
                        txHash,
                        transferType: 'protocol_collection'
                    });
                }
            } catch (err) {
                console.error('[Indexer] FeeCollected event error:', err.message);
            }
        });

        console.log('[Indexer] Event listeners active (TokenCreated, TokenUpgraded, Permission, FeeCollected on Factory)');
    }

    if (directFactoryReadOnly) {
        directFactoryReadOnly.on('TokenCreatedDirect', async (token, name, symbol, supply, creator, fee, liquidity, event) => {
            try {
                const amountBnb = parseFloat(ethers.formatEther(fee));
                const txHash = event?.log?.transactionHash || 'unknown_direct_' + Date.now();
                
                // Index metadata automatically
                await autoCreateToken({
                    tokenAddress: token,
                    name, symbol, supply, creator, txHash,
                    launchType: 'FAIR'
                });

                const feeWallet = process.env.FEE_WALLET || '';
                if (feeWallet && amountBnb > 0) {
                    await recordTreasuryTransfer({
                        amountBnb,
                        sourceContract: process.env.DIRECT_FACTORY_ADDRESS,
                        destinationAddress: feeWallet,
                        txHash,
                        transfer_type: 'creation_fee_direct'
                    });
                }
            } catch (err) {
                console.error('[Indexer] TokenCreatedDirect event error:', err.message);
            }
        });

        directFactoryReadOnly.on('LiquidityAdded', async (token, caller, tokens, bnb, event) => {
             // Optional: Log liquidity additions if needed for analytics
             console.log(`[Indexer] Liquidity Added: ${ethers.formatEther(bnb)} BNB for ${token}`);
        });

        console.log('[Indexer] Event listeners active (TokenCreatedDirect, LiquidityAdded on Direct Factory)');
    }
}

// ── 24h automated treasury sweep ─────────────────────────────────────────────
async function sweepBondingCurveToTreasury() {
    if (!signer || !bondingCurveContract) {
        console.warn('[Treasury] No signer configured — skipping automated sweep');
        return;
    }
    try {
        const balance = await provider.getBalance(process.env.BONDING_CURVE_ADDRESS);
        const balanceBnb = parseFloat(ethers.formatEther(balance));
        console.log(`[Treasury] BondingCurve balance: ${balanceBnb.toFixed(6)} BNB`);

        if (balanceBnb < 0.001) {
            console.log('[Treasury] Balance too small to sweep, skipping.');
            return;
        }

        // Attempt owner sweepAllBNB() to execute the 24h sweep
        try {
            const tx = await bondingCurveContract.sweepAllBNB({ gasLimit: 300000 });
            const receipt = await tx.wait();
            const feeWallet = process.env.FEE_WALLET || '';
            await recordTreasuryTransfer({
                amountBnb: balanceBnb,
                sourceContract: process.env.BONDING_CURVE_ADDRESS,
                destinationAddress: feeWallet,
                txHash: receipt.hash,
                transferType: 'daily_sweep'
            });
            console.log(`[Treasury] ✅ 24h Sweep complete: ${balanceBnb.toFixed(6)} BNB → treasury (tx: ${receipt.hash})`);
        } catch (contractErr) {
            console.warn('[Treasury] sweepAllBNB() failed:', contractErr.message);
            // Log as pending treasury transfer so admin is aware of the balance
            await recordTreasuryTransfer({
                amountBnb: balanceBnb,
                sourceContract: process.env.BONDING_CURVE_ADDRESS,
                destinationAddress: process.env.FEE_WALLET || 'pending',
                txHash: 'pending_sweep_' + Date.now(),
                transferType: 'daily_sweep_pending'
            });
        }
    } catch (err) {
        console.error('[Treasury] Sweep error:', err.message);
    }
}

// ── Startup Scan (Historical Context) ───────────────────────────────────────
async function scanRecentEvents() {
    if (!provider) return;
    try {
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = currentBlock - 2000; // Scan last 2000 blocks (~2 hours)
        console.log(`[Indexer] 🔍 Scanning historical events from block ${fromBlock} to ${currentBlock}…`);

        // Scan Factory (MEME)
        if (factoryReadOnly) {
            const factoryFilter = factoryReadOnly.filters.TokenCreated();
            const factoryEvents = await factoryReadOnly.queryFilter(factoryFilter, fromBlock, currentBlock);
            for (const ev of factoryEvents) {
                const [token, name, symbol, supply, creator] = ev.args;
                await autoCreateToken({
                    tokenAddress: token,
                    name, symbol, supply, creator,
                    txHash: ev.transactionHash,
                    launchType: 'MEME'
                });
            }

            // Scan Factory (STANDARD)
            const standardFilter = factoryReadOnly.filters.StandardTokenCreated();
            const standardEvents = await factoryReadOnly.queryFilter(standardFilter, fromBlock, currentBlock);
            for (const ev of standardEvents) {
                const [token, name, symbol, supply, decimals, creator] = ev.args;
                await autoCreateToken({
                    tokenAddress: token,
                    name, symbol, supply, creator,
                    txHash: ev.transactionHash,
                    launchType: 'STANDARD'
                });
            }
        }

        // Scan Direct Factory (FAIR)
        if (directFactoryReadOnly) {
            const directFilter = directFactoryReadOnly.filters.TokenCreatedDirect();
            const directEvents = await directFactoryReadOnly.queryFilter(directFilter, fromBlock, currentBlock);
            for (const ev of directEvents) {
                const [token, name, symbol, supply, creator] = ev.args;
                await autoCreateToken({
                    tokenAddress: token,
                    name, symbol, supply, creator,
                    txHash: ev.transactionHash,
                    launchType: 'FAIR'
                });
            }
        }

        // Scan Bonding Curve (Trades)
        if (bondingCurveReadOnly) {
            console.log(`[Indexer] 🔍 Scanning historical trades...`);
            try {
                const buyFilter = bondingCurveReadOnly.filters.Buy();
                const buyEvents = await bondingCurveReadOnly.queryFilter(buyFilter, fromBlock, currentBlock);
                for (const ev of buyEvents) {
                    const [token, user, bnbIn, tokensOut] = ev.args;
                    const amountBnb = parseFloat(ethers.formatEther(bnbIn));
                    const amountTokens = parseFloat(ethers.formatUnits(tokensOut, 18));
                    const priceBnb = amountTokens > 0 ? (amountBnb / amountTokens) : 0.0000001;
                    await recordTrade({
                        tokenAddress: token,
                        trader: user,
                        tradeType: 'buy',
                        amountTokens,
                        amountBnb,
                        priceBnb,
                        feeBnb: amountBnb * 0.01,
                        txHash: ev.transactionHash,
                        blockNumber: ev.blockNumber
                    });
                }
            } catch (e) {
                console.warn('[Indexer] Buy scan error:', e.message);
            }

            try {
                const sellFilter = bondingCurveReadOnly.filters.Sell();
                const sellEvents = await bondingCurveReadOnly.queryFilter(sellFilter, fromBlock, currentBlock);
                for (const ev of sellEvents) {
                    const [token, user, tokensIn, bnbOut] = ev.args;
                    const amountBnb = parseFloat(ethers.formatEther(bnbOut));
                    const amountTokens = parseFloat(ethers.formatUnits(tokensIn, 18));
                    const priceBnb = amountTokens > 0 ? (amountBnb / amountTokens) : 0.0000001;
                    await recordTrade({
                        tokenAddress: token,
                        trader: user,
                        tradeType: 'sell',
                        amountTokens,
                        amountBnb,
                        priceBnb,
                        feeBnb: amountBnb * 0.01,
                        txHash: ev.transactionHash,
                        blockNumber: ev.blockNumber
                    });
                }
            } catch (e) {
                console.warn('[Indexer] Sell scan error:', e.message);
            }
        }
        console.log(`[Indexer] ✅ Startup scan complete.`);
    } catch (err) {
        console.warn('[Indexer] Historical scan error:', err.message);
    }
}

// ── Start everything ────────────────────────────────────────────────────────────
function startTreasuryAutomation() {
    try {
        initProvider();
        startEventListeners();

        // Background historical scan
        setTimeout(scanRecentEvents, 5000);

        // Automated sweep disabled. Execute manually via Admin Panel.
        // setTimeout(sweepBondingCurveToTreasury, 5000);
        // setInterval(sweepBondingCurveToTreasury, INTERVAL_MS);

        console.log('[Treasury] Automation started — events indexed live. Auto-sweep disabled.');
    } catch (err) {
        console.error('[Treasury] Failed to start automation:', err.message);
    }
}

module.exports = {
    startTreasuryAutomation,
    recordTrade,
    recordTreasuryTransfer
};
