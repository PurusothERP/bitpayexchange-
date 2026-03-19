const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying DirectDexLaunchFactory with account:", deployer.address);

    const feeWallet = process.env.FEE_WALLET;
    const pancakeRouter = "0x10ED43C718714eb63d5aA57B78B54704E256024E"; // BSC Mainnet Router

    console.log("Network:       BSC Mainnet (chainId 56)");
    console.log("PancakeRouter: " + pancakeRouter);
    console.log("Fee Wallet:    " + feeWallet);
    console.log("────────────────────────────────────────────────────────────");

    const Factory = await hre.ethers.getContractFactory("DirectDexLaunchFactory");
    const factory = await Factory.deploy(feeWallet, pancakeRouter, deployer.address);
    await factory.waitForDeployment();
    
    const factoryAddress = await factory.getAddress();
    console.log("✅ DirectDexLaunchFactory deployed to:", factoryAddress);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
