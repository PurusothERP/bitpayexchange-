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
    // Deployed contract emits: TokenCreated(address tokenAddress, string name, string symbol, uint256 supply, address creator, uint256 deploymentFee, uint256 initialBuyBnb)
    factoryContract.on('TokenCreated', async (tokenAddress, name, symbol, supply, creator, deploymentFee, initialBuyBnb, event) => {
        console.log(`New Token Detected at ${tokenAddress} by creator ${creator}`);
        try {
            const txHash = event?.log?.transactionHash || event?.transactionHash || 'unknown';
            
            const query = `
        INSERT INTO tokens (name, symbol, contract_address, creator_wallet, tx_hash)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (contract_address) DO UPDATE SET
          name = EXCLUDED.name,
          symbol = EXCLUDED.symbol
      `;
            await db.query(query, [name, symbol, tokenAddress, creator, txHash]);
            console.log(`Synced token ${tokenAddress} (${name}/${symbol}) to DB`);
        } catch (error) {
            console.error('Error syncing token created event:', error);
        }
    });

    // 2. Listen for LiquidityAdded
    // LiquidityAdded(address indexed token, uint256 tokenAmount, uint256 ethAmount, address lpReceiver)
    liquidityManagerContract.on('LiquidityAdded', async (tokenAddress, tokenAmount, ethAmount, lpReceiver, event) => {
        console.log(`Liquidity Added for ${tokenAddress}: ${ethers.formatEther(ethAmount)} BNB`);
        try {
            const priceBnb = Number(ethers.formatEther(ethAmount)) / Number(ethers.formatUnits(tokenAmount, 18));
            const query = `
        UPDATE tokens 
        SET liquidity_bnb = CAST(COALESCE(liquidity_bnb, '0') AS REAL) + $1, 
            trading_enabled = 1,
            price_bnb = $2
        WHERE contract_address = $3
      `;
            await db.query(query, [ethers.formatEther(ethAmount), priceBnb, tokenAddress]);
            console.log(`Updated liquidity and price for ${tokenAddress}: ${priceBnb} BNB`);
        } catch (error) {
            console.error('Error syncing liquidity added event:', error);
        }
    });

    // 3. Listen for Bonding Curve Trades (Buy/Sell)
    bondingCurveContract.on('Buy', async (tokenAddress, buyer, amountIn, amountOut, event) => {
        console.log(`Buy on Bonding Curve for ${tokenAddress}: ${ethers.formatEther(amountIn)} BNB`);
        try {
            const amountBnb = Number(ethers.formatEther(amountIn));
            const amountTokens = Number(ethers.formatUnits(amountOut, 18));
            const priceBnb = amountTokens > 0 ? (amountBnb / amountTokens) : 0;
            const query = `UPDATE tokens SET price_bnb = $1, liquidity_bnb = CAST(COALESCE(liquidity_bnb, '0') AS REAL) + $2 WHERE contract_address = $3`;
            await db.query(query, [priceBnb, amountBnb, tokenAddress]);
            
            // Also record the trade!
            const txHash = event?.log?.transactionHash || event?.transactionHash || 'unknown';
            await db.query(
                `INSERT OR IGNORE INTO trades (token_address, trader_wallet, trade_type, amount_tokens, amount_bnb, price_bnb, tx_hash)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [tokenAddress, buyer, 'buy', amountTokens, amountBnb, priceBnb, txHash]
            );
        } catch (error) {
            console.error('Error syncing bonding curve buy:', error);
        }
    });

    bondingCurveContract.on('Sell', async (tokenAddress, seller, amountIn, amountOut, event) => {
        console.log(`Sell on Bonding Curve for ${tokenAddress}: ${ethers.formatEther(amountOut)} BNB`);
        try {
            const amountBnb = Number(ethers.formatEther(amountOut));
            const amountTokens = Number(ethers.formatUnits(amountIn, 18));
            const priceBnb = amountTokens > 0 ? (amountBnb / amountTokens) : 0;
            const query = `UPDATE tokens SET price_bnb = $1, liquidity_bnb = CAST(COALESCE(liquidity_bnb, '0') AS REAL) - $2 WHERE contract_address = $3`;
            await db.query(query, [priceBnb, amountBnb, tokenAddress]);

            // Also record the trade!
            const txHash = event?.log?.transactionHash || event?.transactionHash || 'unknown';
            await db.query(
                `INSERT OR IGNORE INTO trades (token_address, trader_wallet, trade_type, amount_tokens, amount_bnb, price_bnb, tx_hash)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [tokenAddress, seller, 'sell', amountTokens, amountBnb, priceBnb, txHash]
            );
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
