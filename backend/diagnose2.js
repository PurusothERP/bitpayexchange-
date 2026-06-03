const { ethers } = require('ethers');
const mainnet = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');

const NEW_FACTORY  = process.env.FACTORY_ADDRESS;
const NEW_BONDING  = process.env.BONDING_CURVE_ADDRESS;
const NEW_LIQUIDITY = process.env.LIQUIDITY_MANAGER_ADDRESS;
const DIRECT_FACTORY = process.env.DIRECT_FACTORY_ADDRESS;

const factoryAbi = [
    "function bondingCurve() view returns (address)",
    "function feeWallet() view returns (address)",
    "function DEPLOYMENT_FEE() view returns (uint256)",
    "function MIN_INITIAL_BUY() view returns (uint256)",
    "function totalTokens() view returns (uint256)",
];

const bondingAbi = [
    "function owner() view returns (address)",
    "function feeWallet() view returns (address)",
    "function authorizedFactories(address) view returns (bool)",
    "function MIGRATION_THRESHOLD() view returns (uint256)",
    "function TREASURY_SHARE() view returns (uint256)",
    "function PANCAKE_LP_SHARE() view returns (uint256)",
    "function pancakeRouter() view returns (address)"
];

const directFactoryAbi = [
    "function owner() view returns (address)",
    "function treasuryWallet() view returns (address)",
    "function pancakeRouter() view returns (address)",
    "function pancakeFactory() view returns (address)"
];

async function verify() {
    console.log("Checking Mainnet Contracts...");
    console.log(`Factory (Bonding Curve): ${NEW_FACTORY}`);
    console.log(`Bonding Curve Contract:  ${NEW_BONDING}`);
    console.log(`Liquidity Manager:        ${NEW_LIQUIDITY}`);
    console.log(`Direct Launch Factory V2: ${DIRECT_FACTORY}`);
    console.log("─".repeat(50));

    const factory = new ethers.Contract(NEW_FACTORY, factoryAbi, mainnet);
    const bonding = new ethers.Contract(NEW_BONDING, bondingAbi, mainnet);
    const directFactory = new ethers.Contract(DIRECT_FACTORY, directFactoryAbi, mainnet);

    try {
        console.log("=== FACTORY ===");
        console.log("bondingCurve():", await factory.bondingCurve());
        console.log("feeWallet():", await factory.feeWallet());
        console.log("DEPLOYMENT_FEE:", ethers.formatEther(await factory.DEPLOYMENT_FEE()), "BNB");
        console.log("MIN_INITIAL_BUY:", ethers.formatEther(await factory.MIN_INITIAL_BUY()), "BNB");
        console.log("totalTokens:", (await factory.totalTokens()).toString());
    } catch (e) {
        console.error("Factory Check Error:", e.message);
    }

    try {
        console.log("\n=== BONDING CURVE ===");
        console.log("owner():", await bonding.owner());
        console.log("feeWallet():", await bonding.feeWallet());
        console.log("authorizedFactories(factory):", await bonding.authorizedFactories(NEW_FACTORY));
        console.log("MIGRATION_THRESHOLD:", ethers.formatEther(await bonding.MIGRATION_THRESHOLD()), "BNB");
        console.log("TREASURY_SHARE:", ethers.formatEther(await bonding.TREASURY_SHARE()), "BNB");
        console.log("PANCAKE_LP_SHARE:", ethers.formatEther(await bonding.PANCAKE_LP_SHARE()), "BNB");
        console.log("pancakeRouter():", await bonding.pancakeRouter());
    } catch (e) {
        console.error("Bonding Curve Check Error:", e.message);
    }
    
    try {
        console.log("\n=== DIRECT FACTORY ===");
        console.log("owner():", await directFactory.owner());
        console.log("treasuryWallet():", await directFactory.treasuryWallet());
        console.log("pancakeRouter():", await directFactory.pancakeRouter());
        console.log("pancakeFactory():", await directFactory.pancakeFactory());
    } catch (e) {
        console.error("Direct Factory V2 Check Error:", e.message);
    }

    try {
        const factoryBC = await factory.bondingCurve();
        console.log("\n=== Wiring Check ===");
        console.log("Factory.bondingCurve === BONDING:", factoryBC.toLowerCase() === NEW_BONDING.toLowerCase() ? "✅" : "❌");
        console.log("BondingCurve authorizes Factory:", await bonding.authorizedFactories(NEW_FACTORY) ? "✅" : "❌");
    } catch (e) {
        console.error("Wiring Check Error:", e.message);
    }
}

verify().catch(console.error);
