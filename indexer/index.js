const { ethers } = require('ethers');
const db = require('../backend/config/db');
const { TOKEN_FACTORY_ABI, LIQUIDITY_MANAGER_ABI, TOKEN_TEMPLATE_ABI, BONDING_CURVE_ABI } = require('../backend/utils/abis');
require('dotenv').config({ path: '../backend/.env' });

const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL);

const factoryAddress = process.env.FACTORY_ADDRESS;
const liquidityManagerAddress = process.env.LIQUIDITY_MANAGER_ADDRESS;
const bondingCurveAddress = process.env.BONDING_CURVE_ADDRESS;

async function startIndexer() {
    console.log('Starting Blockchain Indexer...');

    if (!factoryAddress || !liquidityManagerAddress) {
        console.error('Factory or LiquidityManager address not configured');
        return;
    }

    const factoryContract = new ethers.Contract(factoryAddress, TOKEN_FACTORY_ABI, provider);
    const liquidityManagerContract = new ethers.Contract(liquidityManagerAddress, LIQUIDITY_MANAGER_ABI, provider);
    const bondingCurveContract = new ethers.Contract(bondingCurveAddress, BONDING_CURVE_ABI, provider);

    // 1. Listen for TokenCreated
    // Deployed contract emits: TokenCreated(address tokenAddress, address creator) — both non-indexed
    factoryContract.on('TokenCreated', async (tokenAddress, creator, event) => {
        console.log(`New Token Detected at ${tokenAddress} by creator ${creator}`);
        try {
            // Fetch name/symbol from the token contract itself
            let name = 'Unknown';
            let symbol = 'UNKNOWN';
            try {
                const tokenContract = new ethers.Contract(tokenAddress, [
                    'function name() view returns (string)',
                    'function symbol() view returns (string)',
                    'function totalSupply() view returns (uint256)'
                ], provider);
                name = await tokenContract.name();
                symbol = await tokenContract.symbol();
            } catch (e) { console.warn('Could not fetch token metadata:', e.message); }

            const query = `
        INSERT INTO tokens (name, symbol, contract_address, creator_wallet, tx_hash)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (contract_address) DO UPDATE SET
          name = EXCLUDED.name,
          symbol = EXCLUDED.symbol
      `;
            await db.query(query, [name, symbol, tokenAddress, creator, event.log.transactionHash]);
            console.log(`Synced token ${tokenAddress} (${name}/${symbol}) to DB`);
        } catch (error) {
            console.error('Error syncing token created event:', error);
        }
    });

    // 2. Listen for LiquidityAdded
    liquidityManagerContract.on('LiquidityAdded', async (tokenAddress, tokenAmount, ethAmount, event) => {
        console.log(`Liquidity Added for ${tokenAddress}: ${ethers.formatEther(ethAmount)} BNB`);
        try {
            const priceBnb = Number(ethers.formatEther(ethAmount)) / Number(ethers.formatUnits(tokenAmount, 18));
            const query = `
        UPDATE tokens 
        SET liquidity_bnb = liquidity_bnb + $1, 
            trading_enabled = TRUE,
            price_bnb = $2
        WHERE contract_address = $3
      `;
            await db.query(query, [ethAmount.toString(), priceBnb, tokenAddress]);
            console.log(`Updated liquidity and price for ${tokenAddress}: ${priceBnb} BNB`);
        } catch (error) {
            console.error('Error syncing liquidity added event:', error);
        }
    });

    // 3. Listen for Bonding Curve Trades (Buy/Sell)
    bondingCurveContract.on('Buy', async (tokenAddress, buyer, amountIn, amountOut, event) => {
        console.log(`Buy on Bonding Curve for ${tokenAddress}: ${ethers.formatEther(amountIn)} BNB`);
        try {
            const priceBnb = Number(ethers.formatEther(amountIn)) / Number(ethers.formatUnits(amountOut, 18));
            const query = `UPDATE tokens SET price_bnb = $1, liquidity_bnb = liquidity_bnb + $2 WHERE contract_address = $3`;
            await db.query(query, [priceBnb, amountIn.toString(), tokenAddress]);
        } catch (error) {
            console.error('Error syncing bonding curve buy:', error);
        }
    });

    bondingCurveContract.on('Sell', async (tokenAddress, seller, amountIn, amountOut, event) => {
        console.log(`Sell on Bonding Curve for ${tokenAddress}: ${ethers.formatEther(amountOut)} BNB`);
        try {
            const priceBnb = Number(ethers.formatEther(amountOut)) / Number(ethers.formatUnits(amountIn, 18));
            const query = `UPDATE tokens SET price_bnb = $1, liquidity_bnb = liquidity_bnb - $2 WHERE contract_address = $3`;
            await db.query(query, [priceBnb, amountOut.toString(), tokenAddress]);
        } catch (error) {
            console.error('Error syncing bonding curve sell:', error);
        }
    });

    console.log('Indexer is running and listening for events...');
}

if (require.main === module) {
    startIndexer().catch(error => {
        console.error('Indexer failed to start:', error);
        process.exit(1);
    });
}

module.exports = { startIndexer };
