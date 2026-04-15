const axios = require('axios');
const API_KEY = process.env.BSCSCAN_API_KEY || '2X6VV2BKDA4YPFPBZC56X2RIQSWM4M58YW';

async function check(addr) {
    const url = `https://api.bscscan.com/api?module=contract&action=getabi&address=${addr}&apikey=${API_KEY}`;
    try {
        const res = await axios.get(url);
        if (res.data.status === '1') {
            console.log(addr, "is VERIFIED.");
        } else {
            console.log(addr, "is NOT VERIFIED. Message:", res.data.result);
        }
    } catch (e) {
        console.error("Error checking", addr, e.message);
    }
}

async function run() {
    await check('0xf7E5D2791F70051BEe564Ba5AC9896937cdf3d0a'); // old bonding
    await check('0xcE0f6B5B878F30bbC84Aa274d5a08A3092a3f75b'); // new bonding
    await check('0xfDAAF29FFE961a5D4279d3089f694cc5676Ee915'); // new factory
}
run();
