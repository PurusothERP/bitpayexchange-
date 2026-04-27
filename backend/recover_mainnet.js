/**
 * recover_mainnet.js
 * Scans ALL B20 factory contracts on BSC MAINNET and inserts any missing tokens into the DB.
 * Uses chunked log queries to avoid RPC limits.
 * Run: node recover_mainnet.js
 */

const { ethers } = require('ethers');
const db = require('./config/db');

const BSC_MAINNET_RPC = 'https://bsc-dataseed.binance.org';
const provider = new ethers.JsonRpcProvider(BSC_MAINNET_RPC);

// ── All known factory / direct-factory addresses (mainnet) ───────────────────
const MEME_FACTORY_ADDRESSES = [
    '0x4598AD4E828cb64A53246765f60D9912AEA1b11A',  // Backend env factory
    '0xDB81357038c120072a5c6bFd3091C8F88F67b014',  // Frontend factory
    '0xc4F46f4ee4F48498f8243D63b026d321e5C2aCe2',  // Missing factory found in test-deploy.js
];

const DIRECT_FACTORY_ADDRESSES = [
    '0xd2f602536605CAed0C30a2DA05B24B8F0E59197E',  // Direct factory (from admin page constants)
    '0xbe3EA5f2AE5b278796AbCFbd1078EF88dd0d70F5',  // Old direct factory
];

const MEME_FACTORY_ABI = [
    'event TokenCreated(address indexed tokenAddress, string name, string symbol, uint256 supply, address indexed creator, uint256 deploymentFee, uint256 initialBuyBnb)',
    'event StandardTokenCreated(address indexed tokenAddress, string name, string symbol, uint256 supply, uint8 decimals, address indexed creator, uint256 feePaid)',
    'function getAllTokens() view returns (address[])',
];

const DIRECT_FACTORY_ABI = [
    'event TokenCreatedDirect(address indexed tokenAddress, string name, string symbol, uint256 supply, address indexed creator, uint256 deploymentFee, uint256 liquidityBnb)',
    'function getAllTokens() view returns (address[])',
];

const TOKEN_ABI = [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function totalSupply() view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function owner() view returns (address)',
];

const CHUNK_SIZE = 2000; // blocks per RPC call
const SCAN_DEPTH = 5000000; // Increased to 5M blocks (~6 months+)

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchTokenOnChain(addr) {
    try {
        const c = new ethers.Contract(addr, TOKEN_ABI, provider);
        const [name, symbol, supply, decimals, owner] = await Promise.allSettled([
            c.name(), c.symbol(), c.totalSupply(), c.decimals(), c.owner()
        ]);
        return {
            name:    name.status    === 'fulfilled' ? name.value    : 'Unknown',
            symbol:  symbol.status  === 'fulfilled' ? symbol.value  : 'UNKN',
            supply:  supply.status  === 'fulfilled' ? supply.value.toString() : '1000000000',
            decimals: decimals.status === 'fulfilled' ? Number(decimals.value) : 18,
            owner:   owner.status   === 'fulfilled' ? owner.value   : '',
        };
    } catch (e) {
        return { name: 'Unknown', symbol: 'UNKN', supply: '1000000000', decimals: 18, owner: '' };
    }
}

async function tryGetAllTokens(factoryAddr, abi) {
    try {
        const c = new ethers.Contract(factoryAddr, abi, provider);
        const all = await c.getAllTokens();
        return all;
    } catch (e) {
        return null; // contract may not have this function
    }
}

async function scanFactoryLogs(factoryAddr, abi, eventNames, launch_type, currentBlock) {
    const contract = new ethers.Contract(factoryAddr, abi, provider);
    const fromBlock = Math.max(0, currentBlock - SCAN_DEPTH);
    let inserted = 0;
    let start = fromBlock;

    console.log(`  Scanning logs from block ${fromBlock} → ${currentBlock} in chunks of ${CHUNK_SIZE}...`);

    while (start <= currentBlock) {
        const end = Math.min(start + CHUNK_SIZE - 1, currentBlock);
        try {
            for (const eventName of eventNames) {
                const logs = await contract.queryFilter(eventName, start, end);
                for (const log of logs) {
                    const tokenAddr = log.args.tokenAddress?.toLowerCase();
                    if (!tokenAddr) continue;

                    const existing = await db.query('SELECT id FROM tokens WHERE LOWER(contract_address) = ?', [tokenAddr]);
                    if (existing.rows.length === 0) {
                        const name = log.args.name || 'Unknown';
                        const symbol = log.args.symbol || 'UNKN';
                        const supply = log.args.supply?.toString() || '1000000000';
                        const creator = log.args.creator?.toLowerCase() || '';
                        const decimals = log.args.decimals ? Number(log.args.decimals) : 18;
                        const lt = eventName === 'StandardTokenCreated' ? 'STANDARD' :
                                   eventName === 'TokenCreatedDirect'   ? 'FAIR'     : launch_type;

                        try {
                            await db.query(
                                `INSERT OR IGNORE INTO tokens 
                                 (contract_address, name, symbol, launch_type, creator_wallet, decimals, total_supply, description)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                                [tokenAddr, name, symbol, lt, creator, decimals, supply, 'Recovered from BSC Mainnet blockchain events']
                            );
                            console.log(`    ✅ Recovered [${lt}] ${name} (${symbol}) @ ${tokenAddr}`);
                            inserted++;
                        } catch (dbErr) {
                            console.warn(`    ⚠️  DB insert failed for ${tokenAddr}:`, dbErr.message);
                        }
                    }
                }
            }
        } catch (e) {
            // Chunk too large or RPC error — silently skip
        }
        start = end + 1;
        await sleep(100); // slight delay to avoid rate limiting
    }

    return inserted;
}

async function recoverViaGetAllTokens(factoryAddr, abi, launch_type) {
    console.log(`  Trying getAllTokens() on ${factoryAddr}...`);
    const all = await tryGetAllTokens(factoryAddr, abi);
    if (!all || all.length === 0) {
        console.log(`  getAllTokens() returned nothing or failed.`);
        return 0;
    }
    console.log(`  getAllTokens() found ${all.length} tokens.`);

    let inserted = 0;
    for (const tokenAddr of all) {
        const addr = tokenAddr.toLowerCase();
        const existing = await db.query('SELECT id FROM tokens WHERE LOWER(contract_address) = ?', [addr]);
        if (existing.rows.length === 0) {
            const info = await fetchTokenOnChain(addr);
            try {
                await db.query(
                    `INSERT OR IGNORE INTO tokens 
                     (contract_address, name, symbol, launch_type, creator_wallet, decimals, total_supply, description)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [addr, info.name, info.symbol, launch_type, info.owner, info.decimals, info.supply, 'Recovered via getAllTokens() from BSC Mainnet']
                );
                console.log(`    ✅ Recovered [${launch_type}] ${info.name} (${info.symbol}) @ ${addr}`);
                inserted++;
            } catch (dbErr) {
                console.warn(`    ⚠️  DB insert failed for ${addr}:`, dbErr.message);
            }
        }
    }
    return inserted;
}

async function main() {
    console.log('\n══════════════════════════════════════════════════');
    console.log('  B20 Mainnet Token Recovery — BSC Mainnet');
    console.log('══════════════════════════════════════════════════\n');

    // Give DB time to initialize
    await sleep(2000);

    const currentBlock = await provider.getBlockNumber();
    console.log(`Current BSC Mainnet Block: ${currentBlock}\n`);

    let totalRecovered = 0;

    // ── 1. Meme/Standard Factories ──────────────────────────────────────────
    for (const factoryAddr of MEME_FACTORY_ADDRESSES) {
        console.log(`\n📦 Meme Factory: ${factoryAddr}`);
        
        // Try getAllTokens first (fast)
        const got = await recoverViaGetAllTokens(factoryAddr, MEME_FACTORY_ABI, 'MEME');
        totalRecovered += got;

        // Also scan logs for any missed ones
        const logCount = await scanFactoryLogs(
            factoryAddr,
            MEME_FACTORY_ABI,
            ['TokenCreated', 'StandardTokenCreated'],
            'MEME',
            currentBlock
        );
        totalRecovered += logCount;
    }

    // ── 2. Direct/Fair Launch Factories ─────────────────────────────────────
    for (const factoryAddr of DIRECT_FACTORY_ADDRESSES) {
        console.log(`\n🚀 Direct Factory: ${factoryAddr}`);

        const got = await recoverViaGetAllTokens(factoryAddr, DIRECT_FACTORY_ABI, 'FAIR');
        totalRecovered += got;

        const logCount = await scanFactoryLogs(
            factoryAddr,
            DIRECT_FACTORY_ABI,
            ['TokenCreatedDirect'],
            'FAIR',
            currentBlock
        );
        totalRecovered += logCount;
    }

    // ── Summary ──────────────────────────────────────────────────────────────
    const totalInDb = await db.query('SELECT COUNT(*) as cnt FROM tokens');
    console.log('\n══════════════════════════════════════════════════');
    console.log(`✅ Recovery complete!`);
    console.log(`   Newly added tokens : ${totalRecovered}`);
    console.log(`   Total in DB now    : ${totalInDb.rows[0]?.cnt || 0}`);
    console.log('══════════════════════════════════════════════════\n');

    process.exit(0);
}

main().catch(e => {
    console.error('Fatal recovery error:', e);
    process.exit(1);
});
