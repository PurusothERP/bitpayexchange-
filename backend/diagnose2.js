const { ethers } = require('ethers');
const mainnet = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');

const NEW_FACTORY  = '0x4598AD4E828cb64A53246765f60D9912AEA1b11A';
const NEW_BONDING  = '0xf7E5D2791F70051BEe564Ba5AC9896937cdf3d0a';
const NEW_LIQUIDITY = '0x971414356b3b7f4a2e891CB97B46E06B22c237C6';
const DIRECT_FACTORY = '0xbe3EA5f2AE5b278796AbCFbd1078EF88dd0d70F5';

const factoryAbi = [
    "function bondingCurve() view returns (address)",
    "function feeWallet() view returns (address)",
    "function DEPLOYMENT_FEE() view returns (uint256)",
    "function MIN_INITIAL_BUY() view returns (uint256)",
    "function totalTokens() view returns (uint256)",
];
const bondingAbi = [
    "function authorizedFactories(address) view returns (bool)",
    "function liquidityManager() view returns (address)",
    "function feeWallet() view returns (address)",
    "function INITIAL_PRICE() view returns (uint256)",
    "function MIGRATION_THRESHOLD() view returns (uint256)",
    "function owner() view returns (address)",
];
const directFactoryAbi = [
    "function feeWallet() view returns (address)",
    "function DEX_ROUTER() view returns (address)"
];

async function verify() {
    const factory = new ethers.Contract(NEW_FACTORY, factoryAbi, mainnet);
    const bonding = new ethers.Contract(NEW_BONDING, bondingAbi, mainnet);
    const directFactory = new ethers.Contract(DIRECT_FACTORY, directFactoryAbi, mainnet);

    console.log("=== FACTORY ===");
    console.log("bondingCurve():", await factory.bondingCurve());
    console.log("feeWallet():", await factory.feeWallet());
    console.log("DEPLOYMENT_FEE:", ethers.formatEther(await factory.DEPLOYMENT_FEE()), "BNB");
    console.log("MIN_INITIAL_BUY:", ethers.formatEther(await factory.MIN_INITIAL_BUY()), "BNB");
    console.log("totalTokens:", (await factory.totalTokens()).toString());

    console.log("\n=== BONDING CURVE ===");
    console.log("owner():", await bonding.owner());
    console.log("feeWallet():", await bonding.feeWallet());
    console.log("authorizedFactories(factory):", await bonding.authorizedFactories(NEW_FACTORY));
    console.log("liquidityManager():", await bonding.liquidityManager());
    console.log("INITIAL_PRICE:", ethers.formatEther(await bonding.INITIAL_PRICE()), "BNB per token");
    console.log("MIGRATION_THRESHOLD:", ethers.formatEther(await bonding.MIGRATION_THRESHOLD()), "BNB");
    
    console.log("\n=== DIRECT FACTORY ===");
    console.log("feeWallet():", await directFactory.feeWallet());
    console.log("DEX_ROUTER():", await directFactory.DEX_ROUTER());

    const factoryBC = await factory.bondingCurve();
    console.log("\n=== Wiring Check ===");
    console.log("Factory.bondingCurve === BONDING:", factoryBC.toLowerCase() === NEW_BONDING.toLowerCase() ? "✅" : "❌");
    console.log("BondingCurve authorizes Factory:", await bonding.authorizedFactories(NEW_FACTORY) ? "✅" : "❌");
    console.log("LiquidityManager set:", (await bonding.liquidityManager()).toLowerCase() === NEW_LIQUIDITY.toLowerCase() ? "✅" : "❌");
}
verify().catch(console.error);
