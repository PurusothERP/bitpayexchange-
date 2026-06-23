const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');

async function check() {
    const addresses = [process.env.FACTORY_ADDRESS, process.env.FACTORY_ADDRESS, '0xBF64c60ba9C7D903Ba5Df7efc8949f0e7B3C7832'];
    const current = await provider.getBlockNumber();
    console.log("Current block:", current);
    
    for (let addr of addresses) {
        try {
            const logs = await provider.getLogs({
                address: addr,
                fromBlock: current - 15000,
                toBlock: current
            });
            console.log(`Found ${logs.length} total raw logs on address ${addr} in last 15000 blocks`);
            if (logs.length > 0) {
                console.log("First log topics:", logs[0].topics);
            }
        } catch(e) {
            console.log("Error querying logs for", addr, e.code || e.message);
        }
    }
}
check();
