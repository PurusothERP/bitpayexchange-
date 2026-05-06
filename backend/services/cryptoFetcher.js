const axios = require('axios');

class CryptoFetcher {
    constructor() {
        // Will evaluate lazily to ensure env vars are loaded
        this.getCmcKey = () => process.env.COINMARKETCAP_API_KEY || '61a5cf295fde46a39ecb614a63cfd73b';
        this.getCgHeaders = () => process.env.COINGECKO_API_KEY 
            ? { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY } 
            : {};
    }

    /**
     * Maps CoinMarketCap data structure to CoinGecko's structure
     * so the frontend doesn't need to know which API was used.
     */
    mapCmcToCg(cmcData) {
        if (!cmcData || !cmcData.data) return [];
        const arr = Array.isArray(cmcData.data) ? cmcData.data : Object.values(cmcData.data);
        return arr.map(c => ({
            id: c.slug,
            symbol: (c.symbol || '').toLowerCase(),
            name: c.name,
            image: `https://s2.coinmarketcap.com/static/img/coins/64x64/${c.id}.png`,
            current_price: c.quote?.USD?.price || 0,
            market_cap: c.quote?.USD?.market_cap || 0,
            market_cap_rank: c.cmc_rank || 999,
            fully_diluted_valuation: c.quote?.USD?.fully_diluted_market_cap || null,
            total_volume: c.quote?.USD?.volume_24h || 0,
            high_24h: c.quote?.USD?.price || 0, // Approx fallback
            low_24h: c.quote?.USD?.price || 0,
            price_change_24h: 0,
            price_change_percentage_24h: c.quote?.USD?.percent_change_24h || 0,
            circulating_supply: c.circulating_supply,
            total_supply: c.total_supply,
            max_supply: c.max_supply,
            ath: 0,
            ath_change_percentage: 0,
            ath_date: null,
            atl: 0,
            atl_change_percentage: 0,
            atl_date: null,
            roi: null,
            last_updated: c.last_updated
        }));
    }

    /**
     * Executes the primary fetcher with retry logic. If it completely fails,
     * logs the error and falls back to the secondary fetcher.
     */
    async fetchWithFallback(primaryName, primaryFn, secondaryName, secondaryFn, maxRetries = 2) {
        let lastError = null;

        // Try primary API with retries
        for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
            try {
                const result = await primaryFn();
                if (attempt > 1) {
                    console.log(`[CryptoFetcher] ${primaryName} succeeded on attempt ${attempt}`);
                }
                return result;
            } catch (err) {
                lastError = err;
                const status = err.response?.status || 'Network/Timeout';
                console.warn(`[CryptoFetcher] ${primaryName} failed (Attempt ${attempt}/${maxRetries + 1}). Status: ${status}. Error: ${err.message}`);
                
                // Don't sleep on the last attempt before fallback
                if (attempt <= maxRetries) {
                    await new Promise(res => setTimeout(res, 1000 * attempt)); // Exponential backoff
                }
            }
        }

        // Primary completely failed, fallback to secondary
        console.error(`[CryptoFetcher] ${primaryName} completely failed after ${maxRetries + 1} attempts. Falling back to ${secondaryName}...`);
        
        try {
            const fallbackResult = await secondaryFn();
            console.log(`[CryptoFetcher] ${secondaryName} fallback succeeded.`);
            return fallbackResult;
        } catch (fallbackErr) {
            const status = fallbackErr.response?.status || 'Network/Timeout';
            console.error(`[CryptoFetcher] ${secondaryName} fallback also failed. Status: ${status}. Error: ${fallbackErr.message}`);
            throw new Error(`Both ${primaryName} and ${secondaryName} failed to fetch data.`);
        }
    }

    // ─── API SPECIFIC ACTIONS ─────────────────────────────────────────────

    async getMarkets(category, per_page = 250, page = 1, ids) {
        return this.fetchWithFallback(
            'CoinGecko (Markets)',
            async () => {
                const params = {
                    vs_currency: 'usd',
                    order: 'market_cap_desc',
                    per_page,
                    page,
                    sparkline: false
                };
                if (category) params.category = category;
                if (ids) params.ids = ids;

                const res = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
                    headers: this.getCgHeaders(),
                    params,
                    timeout: 15000
                });
                return res.data;
            },
            'CoinMarketCap (Markets)',
            async () => {
                if (ids) {
                    const res = await axios.get('https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest', {
                        headers: { 'X-CMC_PRO_API_KEY': this.getCmcKey() },
                        params: { slug: ids, convert: 'USD' },
                        timeout: 15000
                    });
                    return this.mapCmcToCg(res.data);
                } else {
                    const res = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest', {
                        headers: { 'X-CMC_PRO_API_KEY': this.getCmcKey() },
                        params: {
                            limit: per_page,
                            start: ((page) - 1) * per_page + 1,
                            convert: 'USD'
                        },
                        timeout: 15000
                    });
                    return this.mapCmcToCg(res.data);
                }
            }
        );
    }

    async getNewListings() {
        return this.fetchWithFallback(
            'CoinGecko (New Listings)',
            async () => {
                const res = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
                    headers: this.getCgHeaders(),
                    params: { 
                        vs_currency: 'usd',
                        category: 'newly-listed-coins',
                        per_page: 50,
                        page: 1,
                        sparkline: false
                    },
                    timeout: 15000
                });
                return res.data;
            },
            'CoinMarketCap (New Listings)',
            async () => {
                const res = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest', {
                    headers: { 'X-CMC_PRO_API_KEY': this.getCmcKey() },
                    params: { limit: 50, sort: 'date_added', sort_dir: 'desc', convert: 'USD' },
                    timeout: 15000
                });
                return this.mapCmcToCg(res.data);
            }
        );
    }

    async getTrending() {
        return this.fetchWithFallback(
            'CoinGecko (Trending)',
            async () => {
                // Step 1: get the trending list
                const trendRes = await axios.get('https://api.coingecko.com/api/v3/search/trending', {
                    headers: this.getCgHeaders(),
                    timeout: 15000
                });
                const coins = trendRes.data.coins || [];

                // Step 2: extract coin IDs and fetch full market data for proper images + prices
                const ids = coins.slice(0, 15).map(c => c.item?.id).filter(Boolean).join(',');
                let marketMap = {};
                if (ids) {
                    try {
                        const mktRes = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
                            headers: this.getCgHeaders(),
                            params: {
                                vs_currency: 'usd',
                                ids,
                                order: 'market_cap_desc',
                                sparkline: false,
                                price_change_percentage: '24h'
                            },
                            timeout: 15000
                        });
                        (mktRes.data || []).forEach(c => { marketMap[c.id] = c; });
                    } catch (e) {
                        console.warn('[CryptoFetcher] Trending market enrichment failed:', e.message);
                    }
                }

                // Step 3: merge
                const enrichedCoins = coins.slice(0, 15).map(c => {
                    const item = c.item || {};
                    const mkt  = marketMap[item.id] || {};
                    return {
                        item: {
                            ...item,
                            thumb: mkt.image || item.thumb || item.small || item.large || '',
                            small: mkt.image || item.small || item.thumb || '',
                            large: mkt.image || item.large || item.thumb || '',
                            current_price: mkt.current_price ?? item.data?.price ?? 0,
                            price_change_percentage_24h: mkt.price_change_percentage_24h ?? item.data?.price_change_percentage_24h?.usd ?? 0,
                            data: {
                                ...(item.data || {}),
                                price: mkt.current_price ?? item.data?.price ?? 0,
                                price_change_percentage_24h: {
                                    usd: mkt.price_change_percentage_24h ?? item.data?.price_change_percentage_24h?.usd ?? 0
                                }
                            }
                        }
                    };
                });

                return { ...trendRes.data, coins: enrichedCoins };
            },
            'CoinMarketCap (Trending)',
            async () => {
                const trendRes = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/trending/latest', {
                    headers: { 'X-CMC_PRO_API_KEY': this.getCmcKey() },
                    timeout: 15000
                });
                
                const enrichedCoins = trendRes.data.data.slice(0, 15).map(c => {
                    const price = c.quote?.USD?.price || 0;
                    const change24 = c.quote?.USD?.percent_change_24h || 0;
                    const img = `https://s2.coinmarketcap.com/static/img/coins/64x64/${c.id}.png`;
                    return {
                        item: {
                            id: c.slug,
                            coin_id: c.id,
                            name: c.name,
                            symbol: (c.symbol || '').toLowerCase(),
                            market_cap_rank: c.cmc_rank || 999,
                            thumb: img,
                            small: img,
                            large: img,
                            price_btc: 0,
                            score: 0,
                            current_price: price,
                            price_change_percentage_24h: change24,
                            data: {
                                price: price,
                                price_change_percentage_24h: { usd: change24 }
                            }
                        }
                    };
                });
                return { coins: enrichedCoins };
            }
        );
    }

    /**
     * Bonus: Health check function to test both APIs
     */
    async healthCheck() {
        const results = {
            coingecko: { status: 'unknown', error: null },
            coinmarketcap: { status: 'unknown', error: null }
        };

        try {
            await axios.get('https://api.coingecko.com/api/v3/ping', { 
                headers: this.getCgHeaders(),
                timeout: 5000 
            });
            results.coingecko.status = 'healthy';
        } catch (e) {
            results.coingecko.status = 'unhealthy';
            results.coingecko.error = e.message;
        }

        try {
            await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/map', {
                headers: { 'X-CMC_PRO_API_KEY': this.getCmcKey() },
                params: { limit: 1 },
                timeout: 5000
            });
            results.coinmarketcap.status = 'healthy';
        } catch (e) {
            results.coinmarketcap.status = 'unhealthy';
            results.coinmarketcap.error = e.message;
        }

        return results;
    }
}

module.exports = new CryptoFetcher();
