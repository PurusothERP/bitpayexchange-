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
        console.log('[TokenRegistry] Starting massive multi-chain meme & market sync (Target: 500+ per network)...');
        const markets = [];
        const memes = [];
        const seen = new Set();
        const networkCounts = { BNB: 0, Solana: 0, ETH: 0, Base: 0, Tron: 0, OP: 0, ARBITRUM: 0 };

        try {
            // 1. Fetch Top 10,000 Market Tokens (for baseline liquidity assets)
            for (let p = 1; p <= 40; p++) {
                try {
                    console.log(`[TokenRegistry] Syncing Global Market Page ${p}/40...`);
                    const res = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
                        params: {
                            vs_currency: 'usd',
                            order: 'market_cap_desc',
                            per_page: 250,
                            page: p,
                            sparkline: false
                        },
                        headers: { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY },
                        timeout: 20000
                    });
                    
                    if (!res.data || res.data.length === 0) break;

                    for (const t of res.data) {
                        const id = t.id;
                        const addr = (t.contract_address || t.address || id).toLowerCase();
                        if (seen.has(id)) continue;
                        seen.add(id);

                        const network = this.getNetworkFromPlatforms(t.platforms);
                        const formatted = {
                            id,
                            symbol: (t.symbol || '').toUpperCase(),
                            name: t.name,
                            address: t.contract_address || t.address || id,
                            network,
                            image: t.image,
                            decimals: 18,
                            market_cap: t.market_cap || 0,
                            current_price: t.current_price || 0,
                            price_change_percentage_24h: t.price_change_percentage_24h || 0,
                            market_cap_rank: t.market_cap_rank,
                            total_volume: t.total_volume || 0,
                            high_24h: t.high_24h || 0,
                            low_24h: t.low_24h || 0
                        };

                        if (this.checkIfMeme(formatted.symbol, formatted.name)) {
                            memes.push(formatted);
                            if (networkCounts[network] !== undefined) networkCounts[network]++;
                        } else {
                            markets.push(formatted);
                        }
                    }
                    
                    // Periodic save to avoid data loss
                    if (p % 5 === 0) this.saveLocal();
                    await new Promise(r => setTimeout(r, 2000));
                } catch (e) {
                    console.error(`[TokenRegistry] Market Page ${p} failed:`, e.message);
                    if (e.response?.status === 429) break;
                }
            }

            // 2. Specialized Meme Sync (Deep crawl to hit 500 per network)
            // We'll crawl up to 60 pages of specifically meme-token category
            for (let p = 1; p <= 60; p++) {
                try {
                    // Check if we already hit targets for primary networks
                    const targetsMet = ['Solana', 'Base', 'Tron', 'ETH', 'BNB'].every(n => networkCounts[n] >= 600);
                    if (targetsMet && p > 20) {
                        console.log('[TokenRegistry] Network targets met. Finishing meme sync.');
                        break;
                    }

                    console.log(`[TokenRegistry] Syncing Meme Intelligence Page ${p}/60... (${JSON.stringify(networkCounts)})`);
                    const res = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
                        params: {
                            vs_currency: 'usd',
                            category: 'meme-token',
                            order: 'market_cap_desc',
                            per_page: 250,
                            page: p,
                            sparkline: false
                        },
                        headers: { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY },
                        timeout: 20000
                    });
                    
                    if (!res.data || res.data.length === 0) break;

                    for (const t of res.data) {
                        const id = t.id;
                        if (seen.has(id)) continue;
                        seen.add(id);

                        const network = this.getNetworkFromPlatforms(t.platforms);
                        const formatted = {
                            id,
                            symbol: (t.symbol || '').toUpperCase(),
                            name: t.name,
                            address: t.contract_address || t.address || id,
                            network,
                            image: t.image,
                            decimals: 18,
                            market_cap: t.market_cap || 0,
                            current_price: t.current_price || 0,
                            price_change_percentage_24h: t.price_change_percentage_24h || 0,
                            market_cap_rank: t.market_cap_rank,
                            total_volume: t.total_volume || 0,
                            high_24h: t.high_24h || 0,
                            low_24h: t.low_24h || 0
                        };

                        memes.push(formatted);
                        if (networkCounts[network] !== undefined) networkCounts[network]++;
                    }
                    await new Promise(r => setTimeout(r, 1000));
                } catch (e) {
                    console.error(`[TokenRegistry] Meme Page ${p} failed:`, e.message);
                    if (e.response?.status === 429) break;
                }
            }

            // Final Sort and Commit
            this.tokens = { 
                markets: markets.sort((a,b) => (a.market_cap_rank || 99999) - (b.market_cap_rank || 99999)),
                memes: memes.sort((a,b) => (a.market_cap_rank || 99999) - (b.market_cap_rank || 99999))
            };
            this.saveLocal();
            console.log('[TokenRegistry] Sync Complete. Final Counts:', networkCounts);

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
        if (platforms['optimistic-ethereum']) return 'OP';
        if (platforms['arbitrum-one']) return 'ARBITRUM';
        return 'Multi-Chain';
    }

    checkIfMeme(symbol, name) {
        const memeKeywords = [
            'DOGE', 'PEPE', 'SHIB', 'FLOKI', 'BONK', 'INU', 'ELON', 'PUMP', 'MEME', 'SAFE', 'BABY', 
            'WIF', 'POPCAT', 'MEW', 'DOGELON', 'HOGE', 'SAMO', 'WOJAK', 'PEPE2', 'MOG', 'COQ', 
            'MYRO', 'BOME', 'SLERF', 'DEGEN', 'BRETT', 'TOSHI', 'PONKE', 'WEN', 'MANEKI', 
            'TURBO', 'GROK', 'LADYS', 'SMOG', 'MYRO', 'PUPS', 'NPC'
        ];
        const s = (symbol || '').toUpperCase();
        const n = (name || '').toUpperCase();
        const exactMemes = ['AI', 'MOON', 'FROG', 'CAT', 'DOG', 'PEPE', 'TRUMP', 'BIDEN'];
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
