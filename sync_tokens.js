const { ethers } = require('ethers');
const db = require('./backend/config/db');

const FACTORY_ABI = [
    'event TokenCreated(address indexed tokenAddress, string name, string symbol, uint256 supply, address indexed creator, uint256 deploymentFee, uint256 initialBuyBnb)',
    'event StandardTokenCreated(address indexed tokenAddress, string name, string symbol, uint256 supply, uint8 decimals, address indexed creator, uint256 feePaid)',
    'event TokenCreatedDirect(address indexed tokenAddress, string name, string symbol, uint256 supply, address indexed creator, uint256 deploymentFee, uint256 liquidityBnb)',
];

const RPCS = [
    'https://bsc-testnet.publicnode.com',
    'https://bsc-testnet-rpc.publicnode.com',
    'https://endpoints.omniatech.io/v1/bsc/testnet/public',
    'https://data-seed-prebsc-1-s1.binance.org:8545/'
];

const FACTORY = '0x4598AD4E828cb64A53246765f60D9912AEA1b11A';
const DIRECT_FACTORY = '0xeEBC10420F486F8357c2efaBd6F5F44Ac9a568a9';

async function sync() {
    let currentRpcIdx = 0;
    let provider = new ethers.JsonRpcProvider(RPCS[currentRpcIdx]);

    const factory = new ethers.Contract(FACTORY, FACTORY_ABI, provider);
    const directFactory = new ethers.Contract(DIRECT_FACTORY, FACTORY_ABI, provider);

    const currentBlock = await provider.getBlockNumber();
    const startBlock = 102000000;
    const CHUNK = 5000; 

    console.log(`Starting resilient sync from ${startBlock} to ${currentBlock}`);

    for (let i = startBlock; i < currentBlock; i += CHUNK) {
        const to = Math.min(i + CHUNK, currentBlock);
        if ((i - startBlock) % 10000 === 0) console.log(`Progress: ${i}...`);

        try {
            const filters = [
                { f: factory.filters.TokenCreated(), type: 'MEME' },
                { f: factory.filters.StandardTokenCreated(), type: 'STANDARD' },
                { f: directFactory.filters.TokenCreatedDirect(), type: 'FAIR' }
            ];

            for (const {f, type} of filters) {
                const logs = await provider.getLogs({
                   ...f,
                   fromBlock: i,
                   toBlock: to
                });

                for (const log of logs) {
                    try {
                        const parsed = type === 'FAIR' 
                            ? directFactory.interface.parseLog(log)
                            : factory.interface.parseLog(log);
                        
                        if (parsed) {
                            const { tokenAddress, name, symbol, supply, creator, decimals } = parsed.args;
                            await db.query(`INSERT INTO tokens (contract_address, name, symbol, total_supply, creator_wallet, tx_hash, launch_type, decimals) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
                            [tokenAddress.toLowerCase(), name, symbol, supply.toString(), creator, log.transactionHash, type, decimals || 18]);
                            console.log(`[FOUND] ${symbol} at ${tokenAddress} (${type})`);
                        }
                    } catch(pe) { }
                }
            }
        } catch (e) {
            console.warn(`RPC Fail [${RPCS[currentRpcIdx]}]:`, e.message);
            currentRpcIdx = (currentRpcIdx + 1) % RPCS.length;
            provider = new ethers.JsonRpcProvider(RPCS[currentRpcIdx]);
            console.log(`Switching to ${RPCS[currentRpcIdx]}`);
            i -= CHUNK; // Retry
            await new Promise(r => setTimeout(r, 1000));
        }
        await new Promise(r => setTimeout(r, 200));
    }
    console.log('Sync complete');
    process.exit(0);
}

sync();
