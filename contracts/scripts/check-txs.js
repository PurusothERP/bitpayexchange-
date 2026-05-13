const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    const address = deployer.address;
    console.log("Checking transactions for Deployer:", address);
    
    // We can't really get tx history easily via ethers without an explorer API.
    // Let's get the nonce to see if it's skyrocketing.
    const nonce = await hre.ethers.provider.getTransactionCount(address);
    console.log("Current Nonce:", nonce);
    
    const balance = await hre.ethers.provider.getBalance(address);
    console.log("Current Balance:", hre.ethers.formatEther(balance), "BNB");
}

main().catch(console.error);
