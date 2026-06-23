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
    await check('0x787288C5D305c9d8e118Ab5d36Ef06eecfEC1258'); // new bonding
    await check('0x28533A2e05eF9e4Fea5d8724f073E967640A6760'); // new factory
}
run();
