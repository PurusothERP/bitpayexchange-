const db = require('../backend/config/db');

async function cleanup() {
    console.log('--- Cleaning Up Launchpad Data ---');
    
    // 1. Remove obvious dummy data
    const dummyPatterns = ['Test', 'Mock', 'Dummy', 'Sample', 'Example', 'Demo', 'Binance USD', 'Tether', 'PancakeSwap', 'Venus', 'Trust Wallet', 'Uniswap', 'Chainlink', 'Pepe', 'Jupiter', 'Raydium', 'Bonk', 'TRON', 'USDT (Tron)', 'Test Token', 'TestBot'];
    
    for (const pattern of dummyPatterns) {
        await db.query("DELETE FROM tokens WHERE name LIKE ? OR symbol LIKE ?", [`%${pattern}%`, `%${pattern}%`]);
    }
    
    // 2. Remove EXCHANGE_LISTING tokens (external tokens used for exchange demo)
    // The user wants the launchpad to only reflect real launches.
    await db.query("DELETE FROM tokens WHERE launch_type = 'EXCHANGE_LISTING'");
    
    // 3. Keep B2LAB (the legitimate one)
    const b2labAddr = '0xF2fE42B2E14d45Ab80533d12fe9239f64B5c81F9'.toLowerCase();
    const existing = await db.query("SELECT * FROM tokens WHERE LOWER(contract_address) = ?", [b2labAddr]);
    
    if (existing.length === 0) {
        console.log('Re-seeding B2LAB...');
        await db.query(`
            INSERT INTO tokens (name, symbol, contract_address, creator_wallet, total_supply, launch_type, is_external, description, trading_enabled, logo_url) 
            VALUES ('B2LAB', 'BLAB', ?, '0x22AaEd330892d1eb782b54A87191Fb98c1533253', '1000000000', 'MEME', 0, 'Official B20 LAB Token', 1, '/logo.png')
        `, [b2labAddr]);
    } else {
        console.log('B2LAB already indexed/seeded.');
    }

    // 4. Recover LSS2 (found on mainnet)
    const lssAddr = '0x972FDE1826A3F1F0672dfe2F8612e78A2dF2256b'.toLowerCase();
    const lssExisting = await db.query("SELECT * FROM tokens WHERE LOWER(contract_address) = ?", [lssAddr]);
    if (lssExisting.length === 0) {
        console.log('Recovering LSS2...');
        await db.query(`
            INSERT INTO tokens (name, symbol, contract_address, creator_wallet, total_supply, launch_type, is_external, description, trading_enabled) 
            VALUES ('LSS2', 'LSS2', ?, '0x22AaEd330892d1eb782b54A87191Fb98c1533253', '1000000000', 'MEME', 0, 'Synchronized early token launch.', 1)
        `, [lssAddr]);
    }

    // 5. Check if any tokens remain
    const finalTokens = await db.query("SELECT name, symbol, contract_address FROM tokens");
    console.log('--- Final Launchpad Tokens ---');
    console.log(finalTokens);
}

cleanup().then(() => {
    console.log('Done.');
    process.exit(0);
}).catch(err => {
    console.error('Cleanup failed:', err);
    process.exit(1);
});
