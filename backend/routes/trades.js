const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { ethers } = require('ethers');

// ── GET /api/trades/history/:tokenAddress ──────────────────────────────────────
router.get('/history/:tokenAddress', async (req, res) => {
    const { tokenAddress } = req.params;
    if (!tokenAddress || tokenAddress.length < 3) {
        return res.status(400).json({ error: 'Invalid token identifier' });
    }
    
    try {
        // 1. Fetch Local DB Trades
        const result = await db.query(
            `SELECT * FROM trades WHERE LOWER(token_address) = LOWER(?) ORDER BY timestamp DESC LIMIT 200`,
            [tokenAddress]
        );
        let finalTrades = result.rows || [];

        // 2. Real-Time On-Chain Proxy Fallback (If local data is sparse or for non-B20 assets)
        if (finalTrades.length < 20 && tokenAddress !== '0x0000000000000000000000000000000000000000') {
            try {
                const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org');
                const PANCAKE_FACTORY = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73';
                const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
                
                const factory = new ethers.Contract(PANCAKE_FACTORY, ['function getPair(address,address) view returns (address)'], provider);
                const pairAddress = await factory.getPair(tokenAddress, WBNB);

                if (pairAddress && pairAddress !== ethers.ZeroAddress) {
                    const pairContract = new ethers.Contract(pairAddress, [
                        'event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)',
                        'function token0() view returns (address)',
                        'function token1() view returns (address)'
                    ], provider);

                    const currentBlock = await provider.getBlockNumber();
                    const swaps = await pairContract.queryFilter('Swap', currentBlock - 500, currentBlock);
                    const token0 = await pairContract.token0();
                    const isToken0 = token0.toLowerCase() === tokenAddress.toLowerCase();

                    const chainTrades = swaps.map(s => {
                        const { amount0In, amount1In, amount0Out, amount1Out } = s.args;
                        const buy = isToken0 ? amount0Out > 0 : amount1Out > 0;
                        const tokenVol = isToken0 ? (amount0In > 0 ? amount0In : amount0Out) : (amount1In > 0 ? amount1In : amount1Out);
                        const bnbVol = isToken0 ? (amount1In > 0 ? amount1In : amount1Out) : (amount0In > 0 ? amount0In : amount0Out);
                        
                        const amountTokens = parseFloat(ethers.formatUnits(tokenVol, 18));
                        const amountBnb = parseFloat(ethers.formatEther(bnbVol));

                        return {
                            token_address: tokenAddress,
                            trader_wallet: s.args.to,
                            trade_type: buy ? 'buy' : 'sell',
                            amount_tokens: amountTokens,
                            amount_bnb: amountBnb,
                            price_bnb: amountTokens > 0 ? (amountBnb / amountTokens) : 0,
                            tx_hash: s.transactionHash,
                            timestamp: Date.now(), // approximation for performance
                            is_on_chain_proxy: true
                        };
                    }).reverse();

                    // Merge and de-duplicate by txHash
                    const txMap = new Map();
                    [...finalTrades, ...chainTrades].forEach(t => {
                        if (!txMap.has(t.tx_hash)) txMap.set(t.tx_hash, t);
                    });
                    finalTrades = Array.from(txMap.values()).slice(0, 200);
                }
            } catch (chainErr) {
                console.warn('[Trade Proxy] Failed to fetch on-chain history:', chainErr.message);
            }
        }

        res.json(finalTrades);
    } catch (err) {
        console.error('Trade history fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch trade history' });
    }
});

// ── GET /api/trades/chart/:tokenAddress ───────────────────────────────────────
router.get('/chart/:tokenAddress', async (req, res) => {
    const { tokenAddress } = req.params;
    try {
        const result = await db.query(
            `SELECT price_bnb as price, timestamp as time FROM price_history
             WHERE LOWER(token_address) = LOWER(?) ORDER BY timestamp ASC LIMIT 500`,
            [tokenAddress]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch chart data' });
    }
});

// ── GET /api/trades/market/:tokenAddress ──────────────────────────────────────
router.get('/market/:tokenAddress', async (req, res) => {
    const { tokenAddress } = req.params;
    try {
        const stats = await db.query(`
            SELECT
                SUM(amount_bnb) as volume_24h,
                MAX(price_bnb) as high_24h,
                MIN(price_bnb) as low_24h
            FROM trades
            WHERE LOWER(token_address) = LOWER(?) AND timestamp >= DATETIME('now', '-1 day')
        `, [tokenAddress]);

        const priceResult = await db.query(`
            SELECT price_bnb FROM price_history WHERE LOWER(token_address) = LOWER(?) ORDER BY timestamp DESC LIMIT 1
        `, [tokenAddress]);

        res.json({
            ...stats.rows[0],
            current_price: priceResult.rows[0]?.price_bnb || 0
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch market stats' });
    }
});

router.get('/:tokenAddress/stats', async (req, res) => {
    // Existing stats logic...
});

// ── POST /api/trades/sync ────────────────────────────────────────────────────
// Sync on-chain trade with DB
router.post('/sync', async (req, res) => {
    const { tokenAddress, tokenSymbol, buyerWallet, amount, amountBNB, priceBNB, txHash, tradeType, pnl_bnb, positionId } = req.body;
    
    try {
        // 1. Check if token is delisted
        const tokenCheck = await db.query('SELECT is_delisted FROM tokens WHERE LOWER(contract_address) = LOWER(?)', [tokenAddress]);
        if (tokenCheck.rows[0]?.is_delisted === 1) {
            return res.status(403).json({ error: 'TOKEN DELISTED: Trading is permanently disabled for this asset.' });
        }

        // 2. Insert trade
        const feePercent = (tradeType === 'futures' || tradeType === 'spot_exchange' || tradeType === 'futures_open') ? 0.00001 : 0.01;
        const fee = parseFloat(amountBNB || 0) * feePercent;
        
        await db.query(`
            INSERT INTO trades (token_address, token_symbol, trader_wallet, amount_tokens, amount_bnb, price_bnb, tx_hash, trade_type, fee_bnb, pnl_bnb, position_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [tokenAddress, tokenSymbol || 'BNB', buyerWallet, amount, amountBNB, priceBNB, txHash, tradeType || 'buy', fee, pnl_bnb || 0, positionId]);

        // 2.5 Log to treasury_transfers for Admin Dashboard Inflow
        if (fee > 0) {
            await db.query(`
                INSERT INTO treasury_transfers (amount_bnb, asset, amount_usd, source_contract, destination_address, tx_hash, transfer_type)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [fee, 'BNB', 0, tokenAddress, process.env.FEE_WALLET || '0x6451ee4def4a8b8fbc2c64301a79e267de378935', txHash, tradeType === 'futures' ? 'futures_fee' : 'trading_fee']);
        }

        // 3. Update token's last trade activity
        await db.query(`
            UPDATE tokens SET last_trade_at = CURRENT_TIMESTAMP WHERE LOWER(contract_address) = LOWER(?)
        `, [tokenAddress]);

        res.json({ success: true, fee_logged: fee });
    } catch (err) {
        console.error('Trade sync error:', err);
        res.status(500).json({ error: 'Failed to sync trade' });
    }
});

module.exports = router;
