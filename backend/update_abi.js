const fs = require('fs');

async function compile() {
    const abi = [
      {
        "inputs": [
          { "internalType": "string", "name": "name", "type": "string" },
          { "internalType": "string", "name": "symbol", "type": "string" }
        ],
        "name": "createToken",
        "outputs": [
          { "internalType": "address", "name": "tokenAddress", "type": "address" }
        ],
        "stateMutability": "payable",
        "type": "function"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "tokenAddress", "type": "address" },
          { "indexed": false, "internalType": "string", "name": "name", "type": "string" },
          { "indexed": false, "internalType": "string", "name": "symbol", "type": "string" },
          { "indexed": false, "internalType": "uint256", "name": "supply", "type": "uint256" },
          { "indexed": true, "internalType": "address", "name": "creator", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "deploymentFee", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "initialBuyBnb", "type": "uint256" }
        ],
        "name": "TokenCreated",
        "type": "event"
      },
      {
        "inputs": [],
        "name": "bondingCurve",
        "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "feeWallet",
        "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "getAllTokens",
        "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "address", "name": "creator", "type": "address" }],
        "name": "getTokensByCreator",
        "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "DEPLOYMENT_FEE",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "MIN_INITIAL_BUY",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
      }
    ];

    
    let content = fs.readFileSync('/Users/purusothaman/Desktop/untitled folder 2/frontend/src/lib/abis.js', 'utf8');
    
    // Replace the TOKEN_FACTORY_ABI array with the JSON stringified one
    const startIdx = content.indexOf('export const TOKEN_FACTORY_ABI = [');
    const endIdx = content.indexOf('];\n\n// ─── Bonding Curve ABI') + 2;
    
    const newContent = content.substring(0, startIdx) + 'export const TOKEN_FACTORY_ABI = ' + JSON.stringify(abi, null, 2) + ';\n\n// ─── Bonding Curve ABI' + content.substring(endIdx + 25); // +length of search string
    
    fs.writeFileSync('/Users/purusothaman/Desktop/untitled folder 2/frontend/src/lib/abis.js', newContent);
    console.log("Updated abis.js");
}
compile().catch(console.error);
