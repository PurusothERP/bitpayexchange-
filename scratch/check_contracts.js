const { ethers } = require('ethers');
require('dotenv').config({ path: '../backend/.env' });

const BSC_RPC = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org';
const FACTORY = '0xbe1E871a4578Cf98c7791C7Cd308d1855A9a0494';
const BONDING_CURVE = '0xF13184CB8026DcbCD6832cA2DBDdd928077Cd619';
const LIQUIDITY_MANAGER = '0x676c96A6dE82474674ECa28B75f93e90021908da';
const DIRECT_LAUNCH_FACTORY = '0xeEBC10420F486F8357c2efaBd6F5F44Ac9a568a9';

async function main() {
    console.log(`Connecting to BSC RPC: ${BSC_RPC}...`);
    const provider = new ethers.JsonRpcProvider(BSC_RPC);

    const contracts = [
        { name: 'Meme Token Factory', address: FACTORY },
        { name: 'Bonding Curve Contract', address: BONDING_CURVE },
        { name: 'Liquidity Manager', address: LIQUIDITY_MANAGER },
        { name: 'Direct/Fair Launch Factory V2', address: DIRECT_LAUNCH_FACTORY }
    ];

    for (const c of contracts) {
        try {
            const bytecode = await provider.getCode(c.address);
            if (bytecode === '0x' || bytecode === '0x00') {
                console.log(`❌ ${c.name} (${c.address}): NOT DEPLOYED or not a contract!`);
            } else {
                console.log(`✅ ${c.name} (${c.address}): Deployed (Bytecode size: ${bytecode.length} chars)`);
            }
        } catch (err) {
            console.log(`❌ ${c.name} (${c.address}): Query failed: ${err.message}`);
        }
    }

    // ── Contract parameter cross-checks ──
    try {
        console.log('\n--- Cross-Checking Configurations On-Chain ---');
        
        // 1. Check Factory bondingCurve address
        const factoryContract = new ethers.Contract(FACTORY, [
            'function bondingCurve() view returns (address)',
            'function feeWallet() view returns (address)'
        ], provider);
        const onChainCurve = await factoryContract.bondingCurve();
        const onChainFeeWallet = await factoryContract.feeWallet();
        console.log(`Factory -> BondingCurve configured: ${onChainCurve}`);
        console.log(`Factory -> FeeWallet configured:     ${onChainFeeWallet}`);

        if (onChainCurve.toLowerCase() === BONDING_CURVE.toLowerCase()) {
            console.log('✅ Factory bondingCurve matches Bonding Curve address!');
        } else {
            console.log('⚠️ Factory bondingCurve MISMATCH!');
        }

        // 2. Check Bonding Curve settings
        const curveContract = new ethers.Contract(BONDING_CURVE, [
            'function feeWallet() view returns (address)',
            'function pancakeRouter() view returns (address)'
        ], provider);
        const curveFeeWallet = await curveContract.feeWallet();
        const curveRouter = await curveContract.pancakeRouter();
        console.log(`Bonding Curve -> FeeWallet:          ${curveFeeWallet}`);
        console.log(`Bonding Curve -> Pancake Router:      ${curveRouter}`);

        // 3. Check Direct Dex Launch Factory V2 settings
        const directFactoryContract = new ethers.Contract(DIRECT_LAUNCH_FACTORY, [
            'function feeWallet() view returns (address)',
            'function pancakeRouter() view returns (address)',
            'function pancakeFactory() view returns (address)'
        ], provider);
        const directFee = await directFactoryContract.feeWallet();
        const directRouter = await directFactoryContract.pancakeRouter();
        const directFactory = await directFactoryContract.pancakeFactory();
        console.log(`Direct Factory -> FeeWallet:          ${directFee}`);
        console.log(`Direct Factory -> Pancake Router:      ${directRouter}`);
        console.log(`Direct Factory -> Pancake Factory:     ${directFactory}`);

    } catch (crossErr) {
        console.log(`⚠️ Configuration cross-check skipped/failed: ${crossErr.message}`);
    }
}

main().catch(console.error);
