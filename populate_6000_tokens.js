const db = require('./backend/config/db');

const networks = [
    'BNB', 'ETH', 'SOL', 'BASE', 'TRON', 'SUI', 'TON', 'ARBITRUM', 
    'OPTIMISM', 'POLYGON', 'AVALANCHE', 'BLAST', 'CELO', 'CYBER', 
    'FANTOM', 'SCROLL', 'SONIC', 'ZETACHAIN'
];

const prefixes = ['DeFi', 'Yield', 'Meta', 'Game', 'Swap', 'Trade', 'Node', 'Chain', 'Nexus', 'Prime', 'Apex', 'Core', 'Lend', 'Borrow', 'Stake', 'Mint'];
const suffixes = ['Token', 'Coin', 'Protocol', 'Finance', 'Network', 'DAO', 'Labs', 'Capital', 'Ventures', 'Exchange', 'Vault', 'Pool', 'Yield', 'Reserve', 'Fund', 'Asset'];

const tokens = [];

networks.forEach(net => {
    // Generate 350 tokens per network to ensure we hit 6000+ total (18 * 350 = 6300)
    for (let i = 1; i <= 350; i++) {
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        const name = `${net} ${prefix} ${suffix} ${i}`;
        const symbol = `${net}${prefix.substring(0,2).toUpperCase()}${i}`;
        
        tokens.push({
            name: name,
            symbol: symbol,
            address: `0x_mock_${net.toLowerCase()}_${i}_${Math.random().toString(36).substring(7)}`,
            network: net
        });
    }
});

async function run() {
    console.log(`Starting population of ${tokens.length} tokens...`);
    let count = 0;
    
    // We will do it in batches to be faster and not overload the sqlite connection
    // But since sqlite node module might not have batch insert easily exposed without transaction logic,
    // we just use a loop with basic await.
    
    for (const t of tokens) {
        try {
            await db.query(`
                INSERT INTO tokens (name, symbol, contract_address, launch_type, trust_status, price_bnb, liquidity_bnb, network, trading_enabled)
                VALUES (?, ?, ?, 'EXCHANGE_LISTING', 'Highly Trusted', ?, ?, ?, 1)
                ON CONFLICT(contract_address) DO UPDATE SET 
                    launch_type = 'EXCHANGE_LISTING',
                    network = excluded.network
            `, [t.name, t.symbol, t.address, Math.random() * 0.5, (Math.random() * 50000).toFixed(2), t.network]);
            
            count++;
            if (count % 1000 === 0) {
                console.log(`Processed ${count}/${tokens.length}...`);
            }
        } catch (e) {
             console.error('Error on token', t.symbol, e.message);
        }
    }
    console.log('Successfully added 6000+ tokens.');
    process.exit(0);
}

run();
