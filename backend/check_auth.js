const { ethers } = require('ethers');

async function checkAuth() {
    const u = 'https://data-seed-prebsc-1-s1.binance.org:8545';
    try {
        const provider = new ethers.JsonRpcProvider(u);
        const bondingCurveAddr = '0xaC08B7Fa36fB3c628F0d0847974C36606AC0B647';
        const factoryAddr = '0xF0E3F0DB1a37cc0d7f2945acB934d050FE8E886a';
        const abi = ["function authorizedFactories(address) view returns (bool)", "function owner() view returns (address)"];
        const bc = new ethers.Contract(bondingCurveAddr, abi, provider);
        
        const isAuth = await bc.authorizedFactories(factoryAddr);
        const owner = await bc.owner();
        console.log(`[${u}] Is Auth:`, isAuth, "Owner:", owner);
    } catch(e) { console.error(e) }
}
checkAuth().catch(console.error);
