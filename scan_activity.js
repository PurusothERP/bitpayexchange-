const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');

const ADDRS = [
    '0x4598AD4E828cb64A53246765f60D9912AEA1b11A',
    '0xDB81357038c120072a5c6bFd3091C8F88F67b014',
    '0xbe3EA5f2AE5b278796AbCFbd1078EF88dd0d70F5',
    '0xc57C602d847990138541e21972fAa2476906BaE7' // Bonding Curve
];

async function scan() {
    const current = await provider.getBlockNumber();
    const from = current - 10000;
    console.log(`Scanning last 10k blocks starting from ${from}`);

    for (let addr of ADDRS) {
        console.log(`Checking ${addr}`);
        try {
            const logs = await provider.getLogs({
                address: addr,
                fromBlock: from,
                toBlock: current
            });
            console.log(`  Found ${logs.length} logs`);
            for (let l of logs.slice(0, 5)) {
                console.log(`    Tx: ${l.transactionHash} | Topics: ${l.topics[0]}`);
            }
        } catch (e) {
            console.log(`  Error: ${e.message}`);
        }
    }
}
scan();
