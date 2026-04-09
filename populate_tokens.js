const db = require('./backend/config/db');

const networks = ['BNB', 'ETHEREUM', 'SOLANA', 'BASE', 'BITCOIN', 'POLYGON', 'TON', 'TRON', 'SUI'];
const tokens = [
    // BNB
    { name: 'PancakeSwap', symbol: 'CAKE', address: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82', network: 'BNB' },
    { name: 'Venus', symbol: 'XVS', address: '0xcf6bb5389c92bdda8a3747ddb454cb7a64626c63', network: 'BNB' },
    { name: 'Trust Wallet Token', symbol: 'TWT', address: '0x4b0f1812e5df2a09796481ff14017e6005508003', network: 'BNB' },
    // ETHEREUM
    { name: 'Uniswap', symbol: 'UNI', address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', network: 'ETHEREUM' },
    { name: 'Chainlink', symbol: 'LINK', address: '0x514910771af9ca656af840dff83e8264ecf986ca', network: 'ETHEREUM' },
    { name: 'Pepe', symbol: 'PEPE', address: '0x6982508145454ce325ddbe47a25d4ec3d2311933', network: 'ETHEREUM' },
    // SOLANA
    { name: 'Jupiter', symbol: 'JUP', address: 'jup3ptvssvvlzvyecm1k2tstshsmpxdhtf9f8sk7nsc', network: 'SOLANA' },
    { name: 'Raydium', symbol: 'RAY', address: '4k3dyjpyvwwfuycmh8thhyvunf8vmpclvjrt99mrehm6', network: 'SOLANA' },
    { name: 'Bonk', symbol: 'BONK', address: 'DezXAZ8z7Pnrn9vz7M4zWtW6aGncsscyQMnyatFubPRF', network: 'SOLANA' },
    // TRON
    { name: 'TRON', symbol: 'TRX', address: 'T9yD63P1vRk5n662Meb6k8n2412n2lne44', network: 'TRON' },
    { name: 'USDT (Tron)', symbol: 'USDT', address: 'TR7NHqJEH2S671umxCYm9jRShXpBtMdTfc', network: 'TRON' },
];

networks.forEach(net => {
    for (let i = 1; i <= 50; i++) {
        tokens.push({
            name: `${net} Asset ${i}`,
            symbol: `${net}${i}`,
            address: `0x_mock_${net.toLowerCase()}_${i}_${Math.random().toString(36).substring(7)}`,
            network: net
        });
    }
});

async function run() {
    console.log(`Starting population of ${tokens.length} tokens...`);
    for (const t of tokens) {
        try {
            await db.query(`
                INSERT INTO tokens (name, symbol, contract_address, launch_type, trust_status, price_bnb, liquidity_bnb, network, trading_enabled)
                VALUES (?, ?, ?, 'EXCHANGE_LISTING', 'Highly Trusted', ?, ?, ?, 1)
                ON CONFLICT(contract_address) DO UPDATE SET 
                    launch_type = 'EXCHANGE_LISTING',
                    network = excluded.network
            `, [t.name, t.symbol, t.address, Math.random() * 0.1, (Math.random() * 100).toFixed(2), t.network]);
        } catch (e) {
             console.error('Error on token', t.symbol, e.message);
        }
    }
    console.log('Done.');
    process.exit(0);
}

run();
