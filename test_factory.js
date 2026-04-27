const { ethers } = require('ethers');
const RPCS = [
    'https://data-seed-prebsc-1-s1.binance.org:8545/',
    'https://bsc-testnet.publicnode.com'
];

const ADDRS = [
    '0x4598AD4E828cb64A53246765f60D9912AEA1b11A',
    '0xDB81357038c120072a5c6bFd3091C8F88F67b014',
    '0xbe3EA5f2AE5b278796AbCFbd1078EF88dd0d70F5'
];

const ABI = [
    "function getAllTokens() view returns (address[])",
    "function totalTokens() view returns (uint256)"
];

async function test() {
    for (let rpc of RPCS) {
        console.log(`Testing RPC: ${rpc}`);
        const provider = new ethers.JsonRpcProvider(rpc);
        for (let addr of ADDRS) {
            console.log(`Testing Addr: ${addr}`);
            try {
                const contract = new ethers.Contract(addr, ABI, provider);
                try {
                    const count = await contract.totalTokens();
                    console.log(`  totalTokens: ${count}`);
                    if (count > 0) {
                        const tokens = await contract.getAllTokens();
                        console.log(`  getAllTokens: Found ${tokens.length} tokens`);
                        console.log(`  Addresses: ${tokens.join(', ')}`);
                    }
                } catch (e) {
                     console.log(`  totalTokens fail: ${e.message.split('(')[0]}`);
                }
            } catch (e) { console.log(`  Init fail: ${e.message}`); }
        }
    }
}
test();
