const axios = require('axios');

// Alpha Vantage Institutional Integration Service
const API_KEY = 'TDA3K3FRBC108P1B';
const BASE_URL = 'https://www.alphavantage.co/query';

// In-memory cache to respect Alpha Vantage free tier limits (5 calls/min)
const cache = {
    price: {},
    history: {}
};

const CACHE_DURATION = 90 * 1000; // 90 seconds - Optimal balance for B20 Terminal

const stockService = {
    /**
     * Fetches real-time price data using Alpha Vantage GLOBAL_QUOTE
     */
    async getStockPrice(symbol) {
        const now = Date.now();
        const cachedSymbol = symbol.toUpperCase();

        if (cache.price[cachedSymbol] && (now - cache.price[cachedSymbol].timestamp < CACHE_DURATION)) {
            console.log(`[StockService] Serving cached price for ${cachedSymbol}`);
            return cache.price[cachedSymbol].data;
        }

        try {
            console.log(`[StockService] Fetching real-time price for ${cachedSymbol} from Alpha Vantage...`);
            const response = await axios.get(BASE_URL, {
                params: {
                    function: 'GLOBAL_QUOTE',
                    symbol: cachedSymbol,
                    apikey: API_KEY
                }
            });

            // Alpha Vantage returns 'Note' if rate limited
            if (response.data.Note) {
                console.warn('[StockService] API Rate limit reached');
                throw new Error('API Rate limit reached (5 calls/min). Please try again in 60 seconds.');
            }

            const data = response.data['Global Quote'];
            if (!data || Object.keys(data).length === 0) {
                console.error('[StockService] Invalid symbol or empty response:', cachedSymbol);
                throw new Error(`Symbol ${cachedSymbol} not found or invalid.`);
            }

            const result = {
                symbol: data['01. symbol'],
                price: parseFloat(data['05. price']),
                volume: parseInt(data['06. volume']),
                change: parseFloat(data['09. change']),
                change_percent: data['10. change percent'],
                last_updated: data['07. latest trading day']
            };

            // Update cache
            cache.price[cachedSymbol] = {
                timestamp: now,
                data: result
            };

            return result;
        } catch (error) {
            console.error(`[StockService] Price Fetch Error [${cachedSymbol}]:`, error.message);
            throw error;
        }
    },

    /**
     * Fetches historical daily data for charting using TIME_SERIES_DAILY
     */
    async getStockHistory(symbol) {
        const now = Date.now();
        const cachedSymbol = symbol.toUpperCase();

        if (cache.history[cachedSymbol] && (now - cache.history[cachedSymbol].timestamp < CACHE_DURATION)) {
            console.log(`[StockService] Serving cached history for ${cachedSymbol}`);
            return cache.history[cachedSymbol].data;
        }

        try {
            console.log(`[StockService] Fetching daily history for ${cachedSymbol} from Alpha Vantage...`);
            const response = await axios.get(BASE_URL, {
                params: {
                    function: 'TIME_SERIES_DAILY',
                    symbol: cachedSymbol,
                    apikey: API_KEY
                }
            });

            if (response.data.Note) {
                throw new Error('API Rate limit reached. Please try again in 60 seconds.');
            }

            const timeSeries = response.data['Time Series (Daily)'];
            if (!timeSeries) {
                throw new Error(`Historical data for ${cachedSymbol} not available.`);
            }

            // Map to frontend chart format: [{ time, open, high, low, close, volume }]
            const result = Object.entries(timeSeries).map(([date, values]) => ({
                time: date,
                open: parseFloat(values['1. open']),
                high: parseFloat(values['2. high']),
                low: parseFloat(values['3. low']),
                close: parseFloat(values['4. close']),
                volume: parseInt(values['5. volume'])
            })).slice(0, 30).reverse(); // Return last 30 trading days

            // Update cache
            cache.history[cachedSymbol] = {
                timestamp: now,
                data: result
            };

            return result;
        } catch (error) {
            console.error(`[StockService] History Fetch Error [${cachedSymbol}]:`, error.message);
            throw error;
        }
    },

    /**
     * Fetches fundamental institutional data using Alpha Vantage OVERVIEW
     */
    async getStockFundamentals(symbol) {
        const now = Date.now();
        const cachedSymbol = symbol.toUpperCase();

        if (cache.history[cachedSymbol + '_FUND'] && (now - cache.history[cachedSymbol + '_FUND'].timestamp < CACHE_DURATION * 10)) {
            return cache.history[cachedSymbol + '_FUND'].data;
        }

        try {
            console.log(`[StockService] Fetching fundamentals for ${cachedSymbol}...`);
            const response = await axios.get(BASE_URL, {
                params: {
                    function: 'OVERVIEW',
                    symbol: cachedSymbol,
                    apikey: API_KEY
                }
            });

            if (response.data.Note) throw new Error('API Rate limit reached.');

            const data = response.data;
            if (!data || !data.Symbol) {
                // If overview fails (common for commodities in free tier), return empty
                return null;
            }

            const result = {
                description: data.Description,
                marketCap: data.MarketCapitalization,
                peRatio: data.PERatio,
                dividendYield: data.DividendYield,
                high52: data['52WeekHigh'],
                low52: data['52WeekLow'],
                exchange: data.Exchange,
                currency: data.Currency,
                sector: data.Sector
            };

            cache.history[cachedSymbol + '_FUND'] = {
                timestamp: now,
                data: result
            };

            return result;
        } catch (error) {
            console.warn(`[StockService] Fundamental Fetch Error [${cachedSymbol}]:`, error.message);
            return null;
        }
    }
};

module.exports = stockService;
