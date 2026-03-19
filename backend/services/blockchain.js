const { ethers } = require('ethers');
const { TOKEN_FACTORY_ABI, TOKEN_TEMPLATE_ABI, LIQUIDITY_MANAGER_ABI } = require('../utils/abis');

const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/');
const signer = new ethers.Wallet(process.env.PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001', provider);

const factoryAddress = process.env.FACTORY_ADDRESS || '0x0000000000000000000000000000000000000000';
const liquidityManagerAddress = process.env.LIQUIDITY_MANAGER_ADDRESS || '0x0000000000000000000000000000000000000000';

const factoryContract = new ethers.Contract(factoryAddress, TOKEN_FACTORY_ABI, signer);
const liquidityManagerContract = new ethers.Contract(liquidityManagerAddress, LIQUIDITY_MANAGER_ABI, signer);

async function createToken(name, symbol, supply, ownerAddress) {
    try {
        const tx = await factoryContract.createToken(name, symbol, supply, ownerAddress);
        const receipt = await tx.wait();

        // In ethers v6, we look for events in the receipt
        const event = receipt.logs.find(log => {
            try {
                const parsed = factoryContract.interface.parseLog(log);
                return parsed.name === 'TokenCreated';
            } catch (e) {
                return false;
            }
        });

        if (event) {
            const parsedLog = factoryContract.interface.parseLog(event);
            return {
                tokenAddress: parsedLog.args.tokenAddress,
                transactionHash: receipt.hash
            };
        }

        throw new Error('TokenCreated event not found');
    } catch (error) {
        console.error('Error in createToken service:', error);
        throw error;
    }
}

async function getTokenMetadata(tokenAddress) {
    try {
        const tokenContract = new ethers.Contract(tokenAddress, TOKEN_TEMPLATE_ABI, provider);
        const [name, symbol, decimals, totalSupply] = await Promise.all([
            tokenContract.name(),
            tokenContract.symbol(),
            tokenContract.decimals(),
            tokenContract.totalSupply()
        ]);

        return {
            address: tokenAddress,
            name,
            symbol,
            decimals: Number(decimals),
            totalSupply: ethers.formatUnits(totalSupply, decimals)
        };
    } catch (error) {
        console.error('Error fetching token metadata:', error);
        throw error;
    }
}

module.exports = {
    createToken,
    getTokenMetadata,
    factoryContract,
    liquidityManagerContract
};
