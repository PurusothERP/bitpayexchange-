const fs = require('fs');
const path = require('path');
const axios = require('axios');

const REGISTRY_PATH = path.join(__dirname, '../data/token_registry.json');
const REGISTRY_DIR = path.dirname(REGISTRY_PATH);

class TokenRegistry {
    constructor() {
        this.tokens = { markets: [], memes: [] };
        this.ensureDir();
        this.loadLocal();
    }

    ensureDir() {
        if (!fs.existsSync(REGISTRY_DIR)) {
            fs.mkdirSync(REGISTRY_DIR, { recursive: true });
        }
    }

    loadLocal() {
        if (fs.existsSync(REGISTRY_PATH)) {
            try {
                this.tokens = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
                console.log(`[TokenRegistry] Loaded ${this.tokens.markets.length} market tokens and ${this.tokens.memes.length} memes from disk.`);
            } catch (e) {
                console.error('[TokenRegistry] Failed to load local registry:', e.message);
            }
        }
    }

    saveLocal() {
        try {
            fs.writeFileSync(REGISTRY_PATH, JSON.stringify(this.tokens, null, 2));
            console.log(`[TokenRegistry] Saved ${this.tokens.markets.length} market tokens and ${this.tokens.memes.length} memes to disk.`);
        } catch (e) {
            console.error('[TokenRegistry] Failed to save registry:', e.message);
        }
    }

    async refresh() {
        console.log('[TokenRegistry] Starting deep sync of 12,000+ ranked assets...');
        const markets = [];
        const memes = [];
        const seen = new Set();

        try {
            // 1. Fetch Top 10,000 Market Tokens (to ensure 6000+ non-meme assets)
            // Fetching 40 pages of 250 = 10,000 tokens
            for (let p = 1; p <= 40; p++) {
                try {
                    console.log(`[TokenRegistry] Syncing Market Page ${p}/40...`);
                    const res = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
                        params: {
                            vs_currency: 'usd',
                            order: 'market_cap_desc',
                            per_page: 250,
                            page: p,
                            sparkline: false
                        },
                        headers: {
                            'x-cg-demo-api-key': process.env.COINGECKO_API_KEY
                        },
                        timeout: 20000
                    });
                    
                    if (!res.data || res.data.length === 0) break;

                    for (const t of res.data) {
                        const id = t.id;
                        const addr = (t.address || t.contract_address || id).toLowerCase();
                        if (seen.has(addr)) continue;
                        seen.add(addr);

                        const formatted = {
                            id,
                            symbol: (t.symbol || '').toUpperCase(),
                            name: t.name,
                            address: t.contract_address || t.address || id,
                            network: this.getNetworkFromPlatforms(t.platforms),
                            image: t.image,
                            decimals: 18,
                            market_cap: t.market_cap || 0,
                            current_price: t.current_price || 0,
                            price_change_percentage_24h: t.price_change_percentage_24h || 0,
                            market_cap_rank: t.market_cap_rank,
                            total_volume: t.total_volume || 0
                        };

                        if (this.checkIfMeme(formatted.symbol, formatted.name)) {
                            memes.push(formatted);
                        } else {
                            markets.push(formatted);
                        }
                    }
                    
                    // Progressive Save
                    this.tokens.markets = Array.from(new Map([...this.tokens.markets, ...markets].map(t => [t.id, t])).values());
                    this.tokens.memes = Array.from(new Map([...this.tokens.memes, ...memes].map(t => [t.id, t])).values());
                    this.saveLocal();

                    // Small delay to avoid 429
                    await new Promise(r => setTimeout(r, 2000));
                } catch (e) {
                    console.error(`[TokenRegistry] Market Page ${p} failed:`, e.message);
                    if (e.response?.status === 429) {
                        console.log('[TokenRegistry] Rate limit hit, stopping market sync.');
                        break; 
                    }
                }
            }

            // 2. Fetch Dedicated Memes (to ensure 6000+ memes)
            for (let p = 1; p <= 40; p++) {
                try {
                    console.log(`[TokenRegistry] Syncing Meme Page ${p}/40...`);
                    const res = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
                        params: {
                            vs_currency: 'usd',
                            category: 'meme-token',
                            order: 'market_cap_desc',
                            per_page: 250,
                            page: p,
                            sparkline: false
                        },
                        headers: {
                            'x-cg-demo-api-key': process.env.COINGECKO_API_KEY
                        },
                        timeout: 20000
                    });
                    
                    if (!res.data || res.data.length === 0) break;

                    for (const t of res.data) {
                        const id = t.id;
                        const addr = (t.address || t.contract_address || id).toLowerCase();
                        if (seen.has(addr)) continue;
                        seen.add(addr);

                        memes.push({
                            id,
                            symbol: (t.symbol || '').toUpperCase(),
                            name: t.name,
                            address: t.contract_address || t.address || id,
                            network: this.getNetworkFromPlatforms(t.platforms),
                            image: t.image,
                            decimals: 18,
                            market_cap: t.market_cap || 0,
                            current_price: t.current_price || 0,
                            price_change_percentage_24h: t.price_change_percentage_24h || 0,
                            market_cap_rank: t.market_cap_rank,
                            total_volume: t.total_volume || 0
                        });
                    }
                    await new Promise(r => setTimeout(r, 1000));
                } catch (e) {
                    console.error(`[TokenRegistry] Meme Page ${p} failed:`, e.message);
                    if (e.response?.status === 429) break;
                }
            }

            if (markets.length > 0 || memes.length > 0) {
                this.tokens = { 
                    markets: markets.sort((a,b) => (a.market_cap_rank || 99999) - (b.market_cap_rank || 99999)),
                    memes: memes.sort((a,b) => (a.market_cap_rank || 99999) - (b.market_cap_rank || 99999))
                };
                this.saveLocal();
            }

        } catch (e) {
            console.error('[TokenRegistry] Deep sync critical failure:', e.message);
        }
    }

    getNetworkFromPlatforms(platforms = {}) {
        if (platforms['binance-smart-chain']) return 'BNB';
        if (platforms['solana']) return 'Solana';
        if (platforms['ethereum']) return 'ETH';
        if (platforms['base']) return 'Base';
        if (platforms['tron']) return 'Tron';
        return 'Multi-Chain';
    }

    checkIfMeme(symbol, name) {
        const memeKeywords = ['DOGE', 'PEPE', 'SHIB', 'FLOKI', 'BONK', 'INU', 'ELON', 'PUMP', 'MEME', 'SAFE', 'BABY', 'WIF', 'POPCAT', 'MEW', 'DOGELON', 'HOGE', 'SAMO', 'WOJAK', 'PEPE2', 'MOG'];
        const s = (symbol || '').toUpperCase();
        const n = (name || '').toUpperCase();
        const exactMemes = ['AI', 'MOON', 'FROG', 'CAT', 'DOG'];
        if (exactMemes.includes(s)) return true;
        return memeKeywords.some(k => s.includes(k) || n.includes(k));
    }

    getMarkets(page = 1, perPage = 250) {
        const start = (page - 1) * perPage;
        return this.tokens.markets.slice(start, start + perPage);
    }

    getMemes(page = 1, perPage = 250) {
        const start = (page - 1) * perPage;
        return this.tokens.memes.slice(start, start + perPage);
    }
}

module.exports = new TokenRegistry();
