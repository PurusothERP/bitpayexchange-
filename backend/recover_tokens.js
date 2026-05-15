const { ethers } = require('ethers');
const db = require('./config/db');
require('dotenv').config();

const ERC20_ABI = [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)'
];

async function recoverToken(address) {
    console.log(`[Recovery] Attempting to recover ${address}...`);
    const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org');
    
    try {
        const tokenContract = new ethers.Contract(address, ERC20_ABI, provider);
        const name = await tokenContract.name();
        const symbol = await tokenContract.symbol();
        const decimals = await tokenContract.decimals();
        const supply = await tokenContract.totalSupply();
        
        console.log(`[Recovery] Found Token: ${name} (${symbol})`);
        
        const now = new Date().toISOString();

        // Save to DB with more fields
        await db.query(
            `INSERT INTO tokens (
                contract_address, name, symbol, decimals, total_supply, 
                launch_type, description, is_delisted, is_meme, 
                created_at, trust_status, network, market_cap, liquidity_bnb, price_bnb
            )
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(contract_address) DO UPDATE SET
                name = excluded.name,
                symbol = excluded.symbol,
                decimals = excluded.decimals,
                is_meme = 1,
                is_delisted = 0,
                launch_type = excluded.launch_type`,
            [
                address.toLowerCase(), 
                name, 
                symbol, 
                parseInt(decimals), 
                supply.toString(), 
                'MEME', 
                'Recovered via Institutional Discovery.',
                now,
                'Newly Launched Token',
                'BNB',
                0.00001,
                0.00001,
                0.00000001
            ]
        );
        
        console.log(`[Recovery] ✅ ${symbol} successfully registered in local registry.`);
    } catch (err) {
        console.error(`[Recovery] ❌ Failed to recover ${address}:`, err.message);
    }
}

const addresses = [
    '0x13aa8133b323b320fbd77a3b6f488ea90279c394',
    '0x8bf8aa64b3acd96f322f6cfeac15061a27fad507',
    '0xeb7bfbf8ee2126a80485268407590701cade8cbd',
    '0x124819fe03f37339452a5fc599b54ac47a38e2d7'
];

async function run() {
    for (const addr of addresses) {
        await recoverToken(addr);
    }
    console.log('[Recovery] All tasks complete.');
    process.exit(0);
}

run();
