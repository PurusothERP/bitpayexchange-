const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying DirectDexLaunchFactoryV2 with account:", deployer.address);

    const feeWallet = process.env.FEE_WALLET || "0xa5a5A2B6886A54AA864C82d69AfE9667FEB8C0dE";
    const pancakeRouter = "0x10ED43C718714eb63d5aA57B78B54704E256024E"; // BSC Mainnet Router
    const pancakeFactory = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"; // BSC Mainnet Pancake Factory

    console.log("Network:        BSC Mainnet (chainId 56)");
    console.log("PancakeRouter:  " + pancakeRouter);
    console.log("PancakeFactory: " + pancakeFactory);
    console.log("Fee/Treasury:   " + feeWallet);
    console.log("────────────────────────────────────────────────────────────");

    const Factory = await hre.ethers.getContractFactory("DirectDexLaunchFactoryV2");
    
    // Estimate gas for deployment
    const deployTx = await Factory.getDeployTransaction(feeWallet, pancakeRouter, pancakeFactory);
    const gasEstimate = await hre.ethers.provider.estimateGas(deployTx);
    console.log("Estimated Gas:", gasEstimate.toString());

    const feeData = await hre.ethers.provider.getFeeData();
    console.log("Gas Price:", hre.ethers.formatUnits(feeData.gasPrice, "gwei"), "gwei");

    const estimatedCost = gasEstimate * feeData.gasPrice;
    console.log("Estimated Cost:", hre.ethers.formatEther(estimatedCost), "BNB");

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Deployer Balance:", hre.ethers.formatEther(balance), "BNB");

    if (balance < estimatedCost) {
        console.log("❌ ERROR: Insufficient BNB to deploy on BSC Mainnet!");
        process.exit(1);
    }

    console.log("Deploying contract...");
    const factory = await Factory.deploy(feeWallet, pancakeRouter, pancakeFactory);
    await factory.waitForDeployment();
    
    const factoryAddress = await factory.getAddress();
    console.log("✅ DirectDexLaunchFactoryV2 deployed to:", factoryAddress);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
