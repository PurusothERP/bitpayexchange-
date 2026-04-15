const axios = require('axios');
const fs = require('fs');
const qs = require('querystring');
const ethers = require('ethers');

const API_KEY = process.env.BSCSCAN_API_KEY || '2X6VV2BKDA4YPFPBZC56X2RIQSWM4M58YW';
const API_URL = 'https://api.etherscan.io/v2/api?chainid=56';
const abiCoder = new ethers.AbiCoder();

async function doVerify(addr, contractName, sourcePath, constructorArgs) {
    const src = fs.readFileSync(sourcePath, 'utf8');
    const payload = {
        chainid: 56,
        apikey: API_KEY,
        module: 'contract',
        action: 'verifysourcecode',
        contractaddress: addr,
        sourceCode: src,
        codeformat: 'solidity-single-file',
        contractname: contractName,
        compilerversion: 'v0.8.20+commit.a1b79de6', // standard compiler
        optimizationUsed: 1,
        runs: 200,
        constructorArguements: constructorArgs,
        evmversion: 'paris',
        licenseType: 3
    };
    try {
        console.log('Submitting ' + contractName + ' at ' + addr + '...');
        const res = await axios.post(API_URL, qs.stringify(payload), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 20000
        });
        
        console.log(res.data);
        if (res.data.status === '1') {
            const guid = res.data.result;
            console.log('GUID received:', guid);
            // wait 5 seconds and poll
            await new Promise(resolve => setTimeout(resolve, 5000));
            const checkUrl = `${API_URL}&module=contract&action=checkverifystatus&guid=${guid}&apikey=${API_KEY}`;
            const checkRes = await axios.get(checkUrl);
            console.log('Verification status:', checkRes.data.result);
        }
    } catch (e) {
        console.error('Error on', addr, e.response ? e.response.data : e.message);
    }
}

async function run() {
    const owner = '0x6451EE4DEf4a8b8FbC2c64301A79e267De378935';
    const feeWallet = '0x6451EE4DEf4a8b8FbC2c64301A79e267De378935';
    const router = '0x10ED43C718714eb63d5aA57B78B54704E256024E';

    // 1. BondingCurve
    const bcArgs = abiCoder.encode(
        ['address', 'address', 'address'], 
        [owner, feeWallet, router]
    ).slice(2);
    // 2. TokenFactory
    const tfArgs = abiCoder.encode(
        ['address', 'address', 'address'], 
        ['0xcE0f6B5B878F30bbC84Aa274d5a08A3092a3f75b', feeWallet, owner]
    ).slice(2);
    // 3. DirectDexLaunchFactory
    const dlfArgs = abiCoder.encode(
        ['address', 'address', 'address'], 
        [feeWallet, router, owner]
    ).slice(2);

    await doVerify('0xcE0f6B5B878F30bbC84Aa274d5a08A3092a3f75b', 'BondingCurve', 'contracts/contracts/BondingCurve.flattened.sol', bcArgs);
    await doVerify('0xfDAAF29FFE961a5D4279d3089f694cc5676Ee915', 'TokenFactory', 'contracts/contracts/TokenFactory.flattened.sol', tfArgs);
    await doVerify('0xbe3EA5f2AE5b278796AbCFbd1078EF88dd0d70F5', 'DirectDexLaunchFactory', 'contracts/contracts/DirectDexLaunchFactory.flattened.sol', dlfArgs);
}

run();
