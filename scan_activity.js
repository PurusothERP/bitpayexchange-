const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');

const ADDRS = [
    '0x28533A2e05eF9e4Fea5d8724f073E967640A6760',
    '0xDB81357038c120072a5c6bFd3091C8F88F67b014',
    '0xBF64c60ba9C7D903Ba5Df7efc8949f0e7B3C7832',
    '0x787288C5D305c9d8e118Ab5d36Ef06eecfEC1258' // Bonding Curve
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
