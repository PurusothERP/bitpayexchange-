const express = require('express');
const axios = require('axios');
const cryptoFetcher = require('../services/cryptoFetcher');
const router = express.Router();

// Fetch single token price via markets array
async function getTokenData(id, symbol) {
    if (symbol.toUpperCase() === 'USDT' || id === 'tether') {
        return { current_price: 1.0, source: 'stablecoin' };
    }
    
    // We fetch a batch using cryptoFetcher
    // If id is provided, fetch by ID. If not, we might fail or try by symbol.
    const validId = id || (symbol === 'BNB' ? 'binancecoin' : null);
    
    if (!validId) {
        throw new Error(`Cannot determine ID for token ${symbol}`);
    }

    try {
        const data = await cryptoFetcher.getMarkets(null, 1, 1, validId);
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

    throw new Error(`Price not found for ${symbol || id}`);
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

        return res.json({
            base_token: base_symbol || base_token,
            selected_token: selected_symbol || selected_token,
            input_amount: input_amount,
            output_amount: output_amount,
            price_source: 'coingecko/cmc', // Handled by cryptoFetcher
            spot_price_base: basePrice,
            spot_price_selected: selectedPrice,
            liquidity_warning: false
        });

    } catch (error) {
        console.error('[Swap Quote API] Error:', error.message);
        return res.status(500).json({ error: 'Failed to fetch swap quote', details: error.message });
    }
});

module.exports = router;
