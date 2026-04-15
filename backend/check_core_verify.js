const { checkVerificationStatus } = require('./services/tokenVerifier');
require('dotenv').config();

const contracts = {
    Factory: process.env.FACTORY_ADDRESS,
    BondingCurve: process.env.BONDING_CURVE_ADDRESS,
    LiquidityManager: process.env.LIQUIDITY_MANAGER_ADDRESS,
    DirectFactory: process.env.DIRECT_FACTORY_ADDRESS
};

async function check() {
    for (const [name, addr] of Object.entries(contracts)) {
        if (!addr) continue;
        const status = await checkVerificationStatus(addr);
        console.log(`${name} (${addr}): ${status.verified ? 'VERIFIED ✓' : 'NOT VERIFIED ❌'}`);
    }
}

check().then(() => process.exit(0));
