const { ethers } = require('ethers');
const mainnet = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');

const NEW_FACTORY  = '0x28533A2e05eF9e4Fea5d8724f073E967640A6760';
const NEW_BONDING  = '0x787288C5D305c9d8e118Ab5d36Ef06eecfEC1258';
const NEW_LIQUIDITY = '0x0C19DF362892024b907dF223F70199f68D30521F';

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
