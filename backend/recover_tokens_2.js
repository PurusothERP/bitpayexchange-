const { ethers } = require('ethers');
const db = require('./config/db');

const FACTORY_ABI = [
  "function getAllTokens() view returns (address[])"
];
const TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function owner() view returns (address)",
  "function decimals() view returns (uint8)"
];
const TESTNET_RPC = 'https://data-seed-prebsc-1-s1.binance.org:8545/';

async function run() {
    const provider = new ethers.JsonRpcProvider(TESTNET_RPC);
    const factories = [
        process.env.FACTORY_ADDRESS, // Backend configured
        process.env.FACTORY_ADDRESS, // Frontend configured
    ];
    let count = 0;
    
    for (const factoryAddress of factories) {
        console.log(`Checking factory: ${factoryAddress}`);
        const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);
        try {
            const allTokens = await factory.getAllTokens();
            console.log(`Found ${allTokens.length} tokens in factory.`);
            for (const tokenAddr of allTokens) {
                const res = await db.query('SELECT id FROM tokens WHERE LOWER(contract_address) = LOWER(?)', [tokenAddr]);
                if (res.rows.length === 0) {
                    console.log(`Missing token found: ${tokenAddr}. recovering...`);
                    const tokenContract = new ethers.Contract(tokenAddr, TOKEN_ABI, provider);
                    try {
                        const name = await tokenContract.name();
                        const symbol = await tokenContract.symbol();
                        // Assume MEME type for factory
                        await db.query(`INSERT INTO tokens (contract_address, name, symbol, launch_type, creator_wallet, decimals, description, total_supply) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                        [tokenAddr, name, symbol, 'MEME', '0x2222', 18, 'Recovered from chain manually', '1000000000']);
                        console.log(`Recovered ${name} (${symbol})`);
                        count++;
                    } catch (e) {
                         console.error(`Failed to read token ${tokenAddr}:`, e.message);
                    }
                }
            }
        } catch(e) {
            console.error(`Failed to read factory ${factoryAddress}:`, e.message);
        }
    }
    console.log(`Recovery complete. Added ${count} missing tokens.`);
    process.exit(0);
}
run();
