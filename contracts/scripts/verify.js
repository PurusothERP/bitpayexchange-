const hre = require("hardhat");

async function main() {
    const factoryAddress = process.env.FACTORY_ADDRESS;
    const bondingCurveAddress = process.env.BONDING_CURVE_ADDRESS;
    const liquidityManagerAddress = process.env.LIQUIDITY_MANAGER_ADDRESS;

    console.log("Checking Contracts Setup...");

    const factory = await hre.ethers.getContractAt("TokenFactory", factoryAddress);
    const bondingCurve = await hre.ethers.getContractAt("BondingCurve", bondingCurveAddress);
    const liquidityManager = await hre.ethers.getContractAt("LiquidityManager", liquidityManagerAddress);

    const factoryBC = await factory.bondingCurve();
    console.log(`Factory Bonding Curve: ${factoryBC} === ${bondingCurveAddress}`, factoryBC.toLowerCase() === bondingCurveAddress.toLowerCase());

    const isFactoryAuth = await bondingCurve.authorizedFactories(factoryAddress);
    console.log(`Bonding Curve has authorized Factory:`, isFactoryAuth);

    const bcLM = await bondingCurve.liquidityManager();
    console.log(`Bonding Curve LM: ${bcLM} === ${liquidityManagerAddress}`, bcLM.toLowerCase() === liquidityManagerAddress.toLowerCase());

    const isBCAuth = await liquidityManager.authorizedCallers(bondingCurveAddress);
    console.log(`Liquidity Manager has authorized Bonding Curve:`, isBCAuth);
}

main().catch(console.error);
