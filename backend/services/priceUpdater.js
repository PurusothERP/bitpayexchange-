const axios = require('axios');
const db = require('../config/db');
require('dotenv').config();

async function updateTokenPrices() {
    console.log('[PriceSync] Starting institutional price synchronization...');
    try {
        // 1. Get all local tokens that need price updates
        const { rows: localTokens } = await db.query('SELECT contract_address, symbol FROM tokens WHERE is_delisted = 0');
        if (localTokens.length === 0) return;

        const addresses = localTokens.map(t => t.contract_address).join(',');
        
        // 2. Fetch live prices from CoinGecko
        // We use the simple/token_price endpoint for BSC tokens
        const url = `https://api.coingecko.com/api/v3/simple/token_price/binance-smart-chain`;
        const res = await axios.get(url, {
            params: {
                contract_addresses: addresses,
                vs_currencies: 'usd',
                include_market_cap: 'true',
                include_24hr_vol: 'true',
                include_24hr_change: 'true'
            },
            headers: { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY },
            timeout: 15000
        });

        const data = res.data;
        let updateCount = 0;

        for (const [addr, stats] of Object.entries(data)) {
            const priceUsd = stats.usd;
            const mcap = stats.usd_market_cap || 0;
            const change = stats.usd_24h_change || 0;
            
            // Convert USD price back to BNB approx (for the UI which expects price_bnb)
            // Assuming 1 BNB = $600 for simple internal tracking
            const priceBnb = priceUsd / 600;

            await db.query(
                `UPDATE tokens SET 
                    price_bnb = ?, 
                    market_cap = ?, 
                    price_change_percentage_24h = ?,
                    last_trade_at = CURRENT_TIMESTAMP
                 WHERE contract_address = ?`,
                [priceBnb, mcap, change, addr.toLowerCase()]
            );
            updateCount++;
        }

        console.log(`[PriceSync] ✅ Successfully updated ${updateCount} tokens from CoinGecko.`);
    } catch (err) {
        console.error('[PriceSync] ❌ Sync failed:', err.message);
    }
}

// Export for use in index.js
module.exports = {
    startPriceSync: () => {
        updateTokenPrices();
        setInterval(updateTokenPrices, 10 * 60 * 1000); // Every 10 minutes
    }
};
