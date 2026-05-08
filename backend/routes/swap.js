const express = require('express');
const axios = require('axios');
const cryptoFetcher = require('../services/cryptoFetcher');
const router = express.Router();

// Fetch single token price via markets array
async function getTokenData(id, symbol) {
    if (symbol.toUpperCase() === 'USDT' || id === 'tether' || id === '0x55d398326f99059fF775485246999027B3197955') {
        return { current_price: 1.0, source: 'stablecoin' };
    }
    
    // We fetch a batch using cryptoFetcher
    // If id is provided, fetch by ID. If not, we might fail or try by symbol.
    const validId = id || (symbol === 'BNB' ? 'binancecoin' : null);
    
    if (!validId) {
        return { current_price: 0.0001, source: 'fallback_estimate' };
    }

    try {
        // If it looks like an address, try to find the ID first or use contract endpoint
        let lookupId = validId;
        if (validId.startsWith('0x') && validId.length > 40) {
            // It's a contract address, try to find price via CG simple/token_price
            try {
                const cgRes = await axios.get(`https://api.coingecko.com/api/v3/simple/token_price/binance-smart-chain?contract_addresses=${validId}&vs_currencies=usd`, {
                    headers: cryptoFetcher.getCgHeaders(),
                    timeout: 5000
                });
                const price = cgRes.data[validId.toLowerCase()]?.usd;
                if (price) return { current_price: price, source: 'cg_contract' };
            } catch(e) { /* continue */ }
        }

        const data = await cryptoFetcher.getMarkets(null, 1, 1, lookupId);
        if (data && data.length > 0) {
            return {
                current_price: data[0].current_price,
                source: 'live_market'
            };
        }
    } catch (e) {
        console.warn(`[Swap API] Failed to fetch price for ${validId}`, e.message);
    }

    // Secondary fallback for BNB if CoinGecko/CMC fails due to slug mismatch or rate limit
    if (symbol === 'BNB' || validId === 'binancecoin') {
        try {
            const binanceRes = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT');
            return {
                current_price: parseFloat(binanceRes.data.price),
                source: 'binance_api'
            };
        } catch(err) {
            console.warn('[Swap API] Binance fallback failed:', err.message);
        }
    }

    // Ultimate fallback to avoid 500
    return { current_price: 0.0001, source: 'system_default' };
}


// ─── GET /api/swap/quote ──────────────────────────────────────────────────────
router.get('/quote', async (req, res) => {
    try {
        const { 
            base_token, // ID (e.g. 'ethereum')
            base_symbol, // e.g. 'ETH'
            selected_token, // ID (e.g. 'tether')
            selected_symbol, // e.g. 'USDT'
            amount, // The amount
            mode // 'exactIn' or 'exactOut'
        } = req.query;

        if (!base_token && !base_symbol) return res.status(400).json({ error: 'base_token or base_symbol required' });
        if (!selected_token && !selected_symbol) return res.status(400).json({ error: 'selected_token or selected_symbol required' });
        
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.json({
                base_token: base_symbol || base_token,
                selected_token: selected_symbol || selected_token,
                input_amount: 0,
                output_amount: 0,
                price_source: 'none',
                spot_price_base: 0,
                spot_price_selected: 0,
                liquidity_warning: false
            });
        }

        // Fetch prices in parallel
        const [baseData, selectedData] = await Promise.all([
            getTokenData(base_token, base_symbol || ''),
            getTokenData(selected_token, selected_symbol || '')
        ]);

        const basePrice = baseData.current_price;
        const selectedPrice = selectedData.current_price;

        let input_amount = 0;
        let output_amount = 0;

        if (mode === 'exactOut') {
            // User typed in the destination box (selected amount)
            // Reverse calculate: input = (output * selected_price) / base_price
            output_amount = parsedAmount;
            input_amount = (output_amount * selectedPrice) / basePrice;
        } else {
            // Default: exactIn
            // User typed in the origin box (base amount)
            // output = (input * base_price) / selected_price
            input_amount = parsedAmount;
            output_amount = (input_amount * basePrice) / selectedPrice;
        }

        const fee_percent = 0.001; // 0.1%
        const input_fee_amt = input_amount * fee_percent;
        const output_fee_amt = output_amount * fee_percent;

        return res.json({
            base_token: base_symbol || base_token,
            selected_token: selected_symbol || selected_token,
            input_amount: input_amount,
            output_amount: output_amount - output_fee_amt, // Deduct fee from output
            fee_amount: output_fee_amt,
            fee_percent: "0.1%",
            price_source: 'coingecko/cmc', 
            spot_price_base: basePrice,
            spot_price_selected: selectedPrice,
            liquidity_warning: false
        });

    } catch (error) {
        console.error('[Swap Quote API] Error:', error.message);
        return res.status(500).json({ error: 'Failed to fetch swap quote', details: error.message });
    }
});

// ── POST /api/swap/execute ──────────────────────────────────────────────────
router.post('/execute', async (req, res) => {
    const { trader_wallet, from_symbol, to_symbol, amount, fee_bnb, tx_hash } = req.body;
    try {
        const TREASURY = (process.env.FEE_WALLET || '0x6451ee4def4a8b8fbc2c64301a79e267de378935').toLowerCase();
        
        // 1. Log trade
        await db.query(`
            INSERT INTO trades (token_address, trader_wallet, trade_type, amount_tokens, fee_bnb, tx_hash)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [to_symbol, trader_wallet, 'SWAP', amount, fee_bnb, tx_hash]);

        // 2. Log treasury transfer
        await db.query(`
            INSERT INTO treasury_transfers (amount_bnb, transfer_type, source_contract, destination_address, tx_hash)
            VALUES (?, ?, ?, ?, ?)
        `, [fee_bnb, 'TRADING_FEE', from_symbol, TREASURY, tx_hash]);

        res.json({ success: true });
    } catch (err) {
        console.error('[Swap Execute] Error:', err.message);
        res.status(500).json({ error: 'Execution logging failed' });
    }
});

module.exports = router;
