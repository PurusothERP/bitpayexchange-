const { ethers } = require('ethers');

const sigs = [
    "TokenCreated(address,address)",
    "TokenCreated(address,address,string,string,uint256)",
    "TokenLaunched(address,address)",
    "TokenCreated(address)",
    "Created(address,address)"
];

for(const s of sigs) {
    if(ethers.id(s) === "0xd5f9bdf12adf29dab0248c349842c3822d53ae2bb4f36352f301630d018c8139") {
        console.log("MATCH:", s);
    }
}
