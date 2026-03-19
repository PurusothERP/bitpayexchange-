const { ethers } = require('ethers');
const mainnet = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');

const NEW_FACTORY  = '0xfDAAF29FFE961a5D4279d3089f694cc5676Ee915';
const NEW_BONDING  = '0xcE0f6B5B878F30bbC84Aa274d5a08A3092a3f75b';
const NEW_LIQUIDITY = '0x971414356b3b7f4a2e891CB97B46E06B22c237C6';

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

async function verify() {
    const factory = new ethers.Contract(NEW_FACTORY, factoryAbi, mainnet);
    const bonding = new ethers.Contract(NEW_BONDING, bondingAbi, mainnet);

    console.log("=== NEW Factory ===");
    console.log("bondingCurve():", await factory.bondingCurve());
    console.log("feeWallet():", await factory.feeWallet());
    console.log("DEPLOYMENT_FEE:", ethers.formatEther(await factory.DEPLOYMENT_FEE()), "BNB");
    console.log("MIN_INITIAL_BUY:", ethers.formatEther(await factory.MIN_INITIAL_BUY()), "BNB");
    console.log("totalTokens:", (await factory.totalTokens()).toString());

    console.log("\n=== NEW BondingCurve ===");
    console.log("owner():", await bonding.owner());
    console.log("feeWallet():", await bonding.feeWallet());
    console.log("authorizedFactories(factory):", await bonding.authorizedFactories(NEW_FACTORY));
    console.log("liquidityManager():", await bonding.liquidityManager());
    console.log("INITIAL_PRICE:", ethers.formatEther(await bonding.INITIAL_PRICE()), "BNB per token");
    console.log("MIGRATION_THRESHOLD:", ethers.formatEther(await bonding.MIGRATION_THRESHOLD()), "BNB");

    const factoryBC = await factory.bondingCurve();
    console.log("\n=== Wiring Check ===");
    console.log("Factory.bondingCurve === NEW_BONDING:", factoryBC.toLowerCase() === NEW_BONDING.toLowerCase() ? "✅" : "❌");
    console.log("BondingCurve authorizes Factory:", await bonding.authorizedFactories(NEW_FACTORY) ? "✅" : "❌");
    console.log("LiquidityManager set:", (await bonding.liquidityManager()).toLowerCase() === NEW_LIQUIDITY.toLowerCase() ? "✅" : "❌");
}
verify().catch(console.error);
