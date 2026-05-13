const { ethers } = require('ethers');

// Free public BSC RPC
const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');

const TREASURY = process.env.FEE_WALLET;
const FACTORY = '0xfDAAF29FFE961a5D4279d3089f694cc5676Ee915';
const BONDING = '0xcE0f6B5B878F30bbC84Aa274d5a08A3092a3f75b';

async function checkFees() {
    console.log(`Checking balances for Treasury Wallet: ${TREASURY}`);
    
    // Check ETH balance
    const balance = await provider.getBalance(TREASURY);
    console.log(`Treasury BNB Balance: ${ethers.formatEther(balance)} BNB`);

    // Fetch the factory configuration parameters to verify
    const factoryAbi = ["function DEPLOYMENT_FEE() view returns (uint256)", "function feeWallet() view returns (address)"];
    const factory = new ethers.Contract(FACTORY, factoryAbi, provider);

    const feeWalletFound = await factory.feeWallet();
    const deploymentFee = await factory.DEPLOYMENT_FEE();

    console.log(`\nFactory Fee Config:`);
    console.log(`Registered Fee Wallet: ${feeWalletFound}`);
    console.log(`Deployment Fee: ${ethers.formatEther(deploymentFee)} BNB`);

    if (feeWalletFound.toLowerCase() === TREASURY.toLowerCase()) {
        console.log(`✅ Factory directs fees correctly to the treasury.`);
    } else {
        console.log(`❌ Factory is sending fees to: ${feeWalletFound}`);
    }

    const bondingAbi = ["function feeWallet() view returns (address)"];
    const curve = new ethers.Contract(BONDING, bondingAbi, provider);
    const curveFeeWallet = await curve.feeWallet();

    if (curveFeeWallet.toLowerCase() === TREASURY.toLowerCase()) {
        console.log(`✅ Bonding Curve directs protocol fees correctly to the treasury.`);
    } else {
        console.log(`❌ Bonding Curve is sending fees to: ${curveFeeWallet}`);
    }
}

checkFees().catch(console.error);
