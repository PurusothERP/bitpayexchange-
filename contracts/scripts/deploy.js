const hre = require("hardhat");

// PancakeSwap Router — testnet vs mainnet
const PANCAKE_ROUTER = {
    56: "0x10ED43C718714eb63d5aA57B78B54704E256024E", // mainnet
    97: "0xD99D1c33F9fC3444f8101754aBC46c52416550D1", // testnet
};

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    const { chainId } = await hre.ethers.provider.getNetwork();
    const chainIdNum = Number(chainId);
    const isTestnet = chainIdNum === 97;
    const pancakeRouter = PANCAKE_ROUTER[chainIdNum] || PANCAKE_ROUTER[97];
    const feeWallet = process.env.FEE_WALLET || deployer.address;

    console.log(`Network:       ${isTestnet ? "BSC Testnet" : "BSC Mainnet"} (chainId ${chainIdNum})`);
    console.log(`PancakeRouter: ${pancakeRouter}`);
    console.log(`Fee Wallet:    ${feeWallet}`);
    console.log("─".repeat(60));

    // ─── Step 1: Deploy BondingCurve ──────────────────────────────────────
    const BondingCurve = await hre.ethers.getContractFactory("BondingCurve");
    const bondingCurve = await BondingCurve.deploy(deployer.address, feeWallet, pancakeRouter);
    await bondingCurve.waitForDeployment();
    const bondingCurveAddress = await bondingCurve.getAddress();
    console.log("✅ BondingCurve deployed to:    ", bondingCurveAddress);


    // ─── Step 3: Deploy TokenFactory ──────────────────────────────────────
    //    Constructor: TokenFactory(bondingCurve, feeWallet, owner)
    const TokenFactory = await hre.ethers.getContractFactory("TokenFactory");
    const tokenFactory = await TokenFactory.deploy(
        bondingCurveAddress,
        feeWallet,
        deployer.address
    );
    await tokenFactory.waitForDeployment();
    const tokenFactoryAddress = await tokenFactory.getAddress();
    console.log("✅ TokenFactory deployed to:    ", tokenFactoryAddress);

    // ─── Step 4: Wire contracts together ──────────────────────────────────
    console.log("\n⚙️  Wiring contracts...");

    // BondingCurve: allow TokenFactory to call launchToken() and buy()
    const tx1 = await bondingCurve.setAuthorizedFactory(tokenFactoryAddress, true);
    await tx1.wait();
    console.log("   BondingCurve.setAuthorizedFactory(TokenFactory) ✓");


    // ─── Output .env values ───────────────────────────────────────────────
    console.log("\n" + "─".repeat(60));
    console.log("📋 Update your .env files with these values:\n");
    console.log("# contracts/.env");
    console.log(`FACTORY_ADDRESS=${tokenFactoryAddress}`);
    console.log(`BONDING_CURVE_ADDRESS=${bondingCurveAddress}`);
    console.log(`FEE_WALLET=${feeWallet}`);
    console.log("\n# frontend/.env.local");
    console.log(`NEXT_PUBLIC_FACTORY_ADDRESS=${tokenFactoryAddress}`);
    console.log(`NEXT_PUBLIC_BONDING_CURVE_ADDRESS=${bondingCurveAddress}`);
    console.log("─".repeat(60));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
