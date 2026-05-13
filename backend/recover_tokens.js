const { ethers } = require('ethers');
const db = require('./config/db');

const provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');

const FACTORY_ABI = [
  "event TokenCreated(address indexed tokenAddress, string name, string symbol, uint256 supply, address indexed creator, uint256 deploymentFee, uint256 initialBuyBnb)",
  "event StandardTokenCreated(address indexed tokenAddress, string name, string symbol, uint256 supply, uint8 decimals, address indexed creator, uint256 feePaid)"
];
const DIRECT_ABI = [
  "event TokenCreatedDirect(address indexed tokenAddress, string name, string symbol, uint256 supply, address indexed creator, uint256 deploymentFee, uint256 liquidityBnb)"
];

const FACTORY_ADDRESSES = [
    process.env.FACTORY_ADDRESS,
    process.env.FACTORY_ADDRESS
];
const DIRECT_ADDRESSES = [
    '0xbe3EA5f2AE5b278796AbCFbd1078EF88dd0d70F5'
];

async function recover() {
    const currentBlock = await provider.getBlockNumber();
    console.log("Current block:", currentBlock);
    const fromBlock = currentBlock - 50000; // About 2 days
    
    let count = 0;
    for (let f of FACTORY_ADDRESSES) {
        console.log('Querying Factory:', f);
        const contract = new ethers.Contract(f, FACTORY_ABI, provider);
        
        let start = fromBlock;
        while(start <= currentBlock) {
            let end = start + 500;
            if (end > currentBlock) end = currentBlock;
            try {
                const logs1 = await contract.queryFilter('TokenCreated', start, end);
                const logs2 = await contract.queryFilter('StandardTokenCreated', start, end);
                const logs = [...logs1, ...logs2];
                for (let l of logs) {
                    const tokenAddr = l.args.tokenAddress;
                    const res = await db.query('SELECT id FROM tokens WHERE contract_address = ?', [tokenAddr]);
                    if (res.rows.length === 0) {
                        try {
                            console.log('Inserting', tokenAddr);
                            const supply = l.args.supply.toString();
                            const creator = l.args.creator;
                            const ds = l.args.decimals ? Number(l.args.decimals) : 18;
                            const lt = l.eventName === 'TokenCreated' ? 'MEME' : 'STANDARD';
                            await db.query(`INSERT INTO tokens (contract_address, name, symbol, launch_type, creator_wallet, decimals, total_supply) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [tokenAddr, l.args.name, l.args.symbol, lt, creator, ds, supply]);
                            count++;
                        } catch(inner) {
                            console.error('Inner error', inner);
                        }
                    }
                }
            } catch(e) {
                // silentskip
            }
            start = end + 1;
        }
    }
    
    for (let f of DIRECT_ADDRESSES) {
        console.log('Querying Direct Factory:', f);
        const contract = new ethers.Contract(f, DIRECT_ABI, provider);
        
        let start = fromBlock;
        while(start <= currentBlock) {
            let end = start + 500;
            if (end > currentBlock) end = currentBlock;
            try {
                const logs = await contract.queryFilter('TokenCreatedDirect', start, end);
                for (let l of logs) {
                    const tokenAddr = l.args.tokenAddress;
                    const res = await db.query('SELECT id FROM tokens WHERE contract_address = ?', [tokenAddr]);
                    if (res.rows.length === 0) {
                        try {
                            console.log('Inserting Direct', tokenAddr);
                            const supply = l.args.supply.toString();
                            const creator = l.args.creator;
                            await db.query(`INSERT INTO tokens (contract_address, name, symbol, launch_type, creator_wallet, decimals, total_supply) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [tokenAddr, l.args.name, l.args.symbol, 'FAIR', creator, 18, supply]);
                            count++;
                        } catch (inner) {
                            console.error('Inner error', inner);
                        }
                    }
                }
            } catch(e) {
                // silentskip
            }
            start = end + 1;
        }
    }
    console.log('Recovered count:', count);
    process.exit(0);
}
recover();
