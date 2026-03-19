const { ethers } = require('ethers');

async function checkFactory() {
    const bscProvider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545');
    // We can just query the bytecode
    const bytecode = await bscProvider.getCode('0xF0E3F0DB1a37cc0d7f2945acB934d050FE8E886a');
    console.log("Deployed Bytecode length on Testnet:", bytecode.length);
    if(bytecode.length > 2) {
        // Try signature 1: createToken(string,string,uint256,address) nonpayable
        const abi4 = ["function createToken(string name, string symbol, uint256 a, address b)"];
        const iface4 = new ethers.Interface(abi4);
        console.log("has 4 args?", bytecode.includes(iface4.getFunction("createToken").selector.slice(2)));
        
        const abi1 = ["function createToken(string name, string symbol, uint256 a, address b) payable returns(address)"];
        const iface1 = new ethers.Interface(abi1);
        console.log("has 4 args payable?", bytecode.includes(iface1.getFunction("createToken").selector.slice(2)));
        
        const abi2 = ["function createToken(string name, string symbol)"];
        const iface2 = new ethers.Interface(abi2);
        console.log("has 2 args?", bytecode.includes(iface2.getFunction("createToken").selector.slice(2)));
    }
}
checkFactory().catch(console.error);
