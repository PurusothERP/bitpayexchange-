const { ethers } = require('ethers');
const db = require('../backend/config/db');
const { TOKEN_FACTORY_ABI, LIQUIDITY_MANAGER_ABI, TOKEN_TEMPLATE_ABI, BONDING_CURVE_ABI } = require('../backend/utils/abis');
require('dotenv').config({ path: '../backend/.env' });

const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL);

const factoryAddress = process.env.FACTORY_ADDRESS;
const liquidityManagerAddress = process.env.LIQUIDITY_MANAGER_ADDRESS;
const bondingCurveAddress = process.env.BONDING_CURVE_ADDRESS;

async function syncHistoricalEvents(contract, eventName, startBlock, handler) {
    console.log(`[Indexer] Syncing history for ${eventName}...`);
    try {
        const filter = contract.filters[eventName]();
        const latestBlock = await provider.getBlockNumber();
        const CHUNK_SIZE = 500;
        let fromBlock = startBlock;

        while (fromBlock <= latestBlock) {
            const toBlock = Math.min(fromBlock + CHUNK_SIZE, latestBlock);
            console.log(`[Indexer] Scanning ${eventName} [${fromBlock} -> ${toBlock}]`);
            const logs = await contract.queryFilter(filter, fromBlock, toBlock);
            for (const log of logs) {
                await handler(...log.args, log);
            }
            fromBlock = toBlock + 1;
            await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit protection
        }
        console.log(`[Indexer] ✅ ${eventName} history sync complete.`);
    } catch (e) {
        console.error(`[Indexer] Error syncing historical ${eventName}:`, e.message);
    }
}

async function handleTokenCreated(tokenAddress, name, symbol, supply, creator, deploymentFee, initialBuyBnb, event) {
    try {
        const txHash = event?.transactionHash || 'unknown';
        const query = `
            INSERT INTO tokens (name, symbol, contract_address, creator_wallet, tx_hash)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (contract_address) DO UPDATE SET
                name = EXCLUDED.name,
                symbol = EXCLUDED.symbol
        `;
        await db.query(query, [name, symbol, tokenAddress, creator, txHash]);
    } catch (error) {
        console.error('Error syncing token created event:', error.message);
    }
}

async function handleBuy(tokenAddress, buyer, amountIn, amountOut, event) {
    try {
        const amountBnb = Number(ethers.formatEther(amountIn));
        const amountTokens = Number(ethers.formatUnits(amountOut, 18));
        const priceBnb = amountTokens > 0 ? (amountBnb / amountTokens) : 0;
        const txHash = event?.transactionHash || 'unknown';
        const blockNum = event?.blockNumber || 0;

        await db.query(`UPDATE tokens SET price_bnb = $1, liquidity_bnb = CAST(COALESCE(liquidity_bnb, '0') AS REAL) + $2 WHERE contract_address = $3`, [priceBnb, amountBnb, tokenAddress]);
        
        await db.query(
            `INSERT OR IGNORE INTO trades (token_address, trader_wallet, trade_type, amount_tokens, amount_bnb, price_bnb, tx_hash, block_number)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [tokenAddress, buyer, 'Swap Completed', amountTokens, amountBnb, priceBnb, txHash, blockNum]
        );
    } catch (error) {
        console.error('Error syncing bonding curve buy:', error.message);
    }
}

async function handleSell(tokenAddress, seller, amountIn, amountOut, event) {
    try {
        const amountBnb = Number(ethers.formatEther(amountOut));
        const amountTokens = Number(ethers.formatUnits(amountIn, 18));
        const priceBnb = amountTokens > 0 ? (amountBnb / amountTokens) : 0;
        const txHash = event?.transactionHash || 'unknown';
        const blockNum = event?.blockNumber || 0;

        await db.query(`UPDATE tokens SET price_bnb = $1, liquidity_bnb = CAST(COALESCE(liquidity_bnb, '0') AS REAL) - $2 WHERE contract_address = $3`, [priceBnb, amountBnb, tokenAddress]);

        await db.query(
            `INSERT OR IGNORE INTO trades (token_address, trader_wallet, trade_type, amount_tokens, amount_bnb, price_bnb, tx_hash, block_number)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [tokenAddress, seller, 'Swap Completed', amountTokens, amountBnb, priceBnb, txHash, blockNum]
        );
    } catch (error) {
        console.error('Error syncing bonding curve sell:', error.message);
    }
}

async function startIndexer() {
    console.log('Starting Blockchain Indexer with Historical Sync...');
    
    if (!factoryAddress || !liquidityManagerAddress || !bondingCurveAddress) {
        console.error('Essential addresses not configured');
        return;
    }

    const factoryContract = new ethers.Contract(factoryAddress, TOKEN_FACTORY_ABI, provider);
    const bondingCurveContract = new ethers.Contract(bondingCurveAddress, BONDING_CURVE_ABI, provider);

    // Sync History (Go back ~100k blocks or from a specific start block)
    const START_BLOCK = 43000000; // Reasonable starting block for these contracts
    
    await syncHistoricalEvents(factoryContract, 'TokenCreated', START_BLOCK, handleTokenCreated);
    await syncHistoricalEvents(bondingCurveContract, 'Buy', START_BLOCK, handleBuy);
    await syncHistoricalEvents(bondingCurveContract, 'Sell', START_BLOCK, handleSell);

    // Live Listening
    console.log('[Indexer] Transitioning to Real-Time Surveillance...');
    factoryContract.on('TokenCreated', handleTokenCreated);
    bondingCurveContract.on('Buy', handleBuy);
    bondingCurveContract.on('Sell', handleSell);

    console.log('Indexer is now running (Live + Historical History Active)');
}

if (require.main === module) {
    startIndexer().catch(error => {
        console.error('Indexer failed to start:', error);
        process.exit(1);
    });
}

module.exports = { startIndexer };
