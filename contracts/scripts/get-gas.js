const hre = require("hardhat");
async function main() {
    const gasPrice = await hre.ethers.provider.getFeeData();
    console.log("Current Gas Price:", hre.ethers.formatUnits(gasPrice.gasPrice, 'gwei'), "gwei");
}
main().catch(console.error);
