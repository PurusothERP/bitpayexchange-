const hre = require("hardhat");

const PANCAKE_ROUTER = {
    56: "0x10ED43C718714eb63d5aA57B78B54704E256024E", // mainnet
    97: "0xD99D1c33F9fC3444f8101754aBC46c52416550D1", // testnet
    1337: "0x10ED43C718714eb63d5aA57B78B54704E256024E", // local (mocking mainnet)
    31337: "0x10ED43C718714eb63d5aA57B78B54704E256024E", // local (mocking mainnet)
};

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    const network = await hre.ethers.provider.getNetwork();
    const chainIdNum = Number(network.chainId);
    const pancakeRouter = PANCAKE_ROUTER[chainIdNum] || PANCAKE_ROUTER[56];
    const feeWallet = process.env.FEE_WALLET || deployer.address;

    console.log(`Network ID:    ${chainIdNum}`);
    console.log(`PancakeRouter: ${pancakeRouter}`);
    console.log(`Fee Wallet:    ${feeWallet}`);
    console.log("─".repeat(60));

    // 1. Deploy LiquidityManager
    console.log("Deploying LiquidityManager...");
    const LiquidityManager = await hre.ethers.getContractFactory("contracts/LiquidityManager.sol:LiquidityManager");
    const liquidityManager = await LiquidityManager.deploy(pancakeRouter, deployer.address);
    await liquidityManager.waitForDeployment();
    const liquidityManagerAddress = await liquidityManager.getAddress();
    console.log("✅ LiquidityManager deployed to:", liquidityManagerAddress);

    // 2. Deploy BondingCurve
    console.log("Deploying BondingCurve...");
    const BondingCurve = await hre.ethers.getContractFactory("contracts/BondingCurve.sol:BondingCurve");
    const bondingCurve = await BondingCurve.deploy(deployer.address, feeWallet, pancakeRouter);
    await bondingCurve.waitForDeployment();
    const bondingCurveAddress = await bondingCurve.getAddress();
    console.log("✅ BondingCurve deployed to:   ", bondingCurveAddress);

    // 3. Deploy TokenFactory
    console.log("Deploying TokenFactory...");
    const TokenFactory = await hre.ethers.getContractFactory("contracts/TokenFactory.sol:TokenFactory");
    const tokenFactory = await TokenFactory.deploy(
        bondingCurveAddress,
        feeWallet,
        deployer.address
    );
    await tokenFactory.waitForDeployment();
    const tokenFactoryAddress = await tokenFactory.getAddress();
    console.log("✅ TokenFactory deployed to:    ", tokenFactoryAddress);

    // 4. Deploy DirectDexLaunchFactory
    console.log("Deploying DirectDexLaunchFactory...");
    const DirectFactory = await hre.ethers.getContractFactory("contracts/DirectDexLaunchFactory.sol:DirectDexLaunchFactory");
    const directFactory = await DirectFactory.deploy(feeWallet, pancakeRouter, deployer.address);
    await directFactory.waitForDeployment();
    const directFactoryAddress = await directFactory.getAddress();
    console.log("✅ DirectFactory deployed to:   ", directFactoryAddress);

    // 5. Wiring
    console.log("\n⚙️ Wiring contracts...");
    
    // BondingCurve: authorize TokenFactory
    console.log("Authorizing TokenFactory in BondingCurve...");
    await (await bondingCurve.setAuthorizedFactory(tokenFactoryAddress, true)).wait();
    
    // LiquidityManager: authorize BondingCurve (if needed, although current BondingCurve doesn't use it)
    console.log("Authorizing BondingCurve in LiquidityManager...");
    await (await liquidityManager.setAuthorizedCaller(bondingCurveAddress, true)).wait();

    console.log("\n" + "─".repeat(60));
    console.log("📋 DEPLOYMENT SUMMARY");
    console.log(`FACTORY_ADDRESS=${tokenFactoryAddress}`);
    console.log(`LIQUIDITY_MANAGER_ADDRESS=${liquidityManagerAddress}`);
    console.log(`BONDING_CURVE_ADDRESS=${bondingCurveAddress}`);
    console.log(`DIRECT_FACTORY_ADDRESS=${directFactoryAddress}`);
    console.log("─".repeat(60));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
