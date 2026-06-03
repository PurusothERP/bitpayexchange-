const db = require('./backend/config/db');

const prefixes = ['DeFi', 'Yield', 'Meta', 'Game', 'Swap', 'Trade', 'Node', 'Chain', 'Nexus', 'Prime', 'Apex', 'Core', 'Lend', 'Borrow', 'Stake', 'Mint'];
const suffixes = ['Token', 'Coin', 'Protocol', 'Finance', 'Network', 'DAO', 'Labs', 'Capital', 'Ventures', 'Exchange', 'Vault', 'Pool', 'Yield', 'Reserve', 'Fund', 'Asset'];

async function addTronTokens() {
    console.log('Generating additional TRON tokens...');
    let count = 0;
    for (let i = 1; i <= 150; i++) {
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        const name = `TRON ${prefix} ${suffix} ${i + 500}`;
        const symbol = `TRX${prefix.substring(0,2).toUpperCase()}${i + 500}`;
        const address = `0x_mock_tron_${i + 500}_${Math.random().toString(36).substring(7)}`;

        try {
            await db.query(`
                INSERT INTO tokens (name, symbol, contract_address, launch_type, trust_status, price_bnb, liquidity_bnb, network, trading_enabled)
                VALUES (?, ?, ?, 'EXCHANGE_LISTING', 'Highly Trusted', ?, ?, ?, 1)
                ON CONFLICT(contract_address) DO NOTHING
            `, [name, symbol, address, Math.random() * 0.5, (Math.random() * 50000).toFixed(2), 'TRON']);
            
            count++;
        } catch (e) {
             console.error('Error on token', symbol, e.message);
        }
    }
    console.log(`Successfully added ${count} TRON tokens.`);
    process.exit(0);
}

addTronTokens();
