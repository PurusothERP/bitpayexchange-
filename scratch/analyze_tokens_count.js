const NETWORKS_MAP = {
    // CoinGecko platforms to DB networks
    'binance-smart-chain': 'BNB',
    'ethereum': 'ETH',
    'solana': 'SOL',
    'base': 'BASE',
    'arbitrum-one': 'ARBITRUM',
    'optimistic-ethereum': 'OPTIMISM',
    'polygon-pos': 'POLYGON',
    'avalanche': 'AVALANCHE',
    'fantom': 'FANTOM',
    'celo': 'CELO',
    'scroll': 'SCROLL',
    'blast': 'BLAST',
    'zetachain': 'ZETACHAIN',
    'tron': 'TRON',
    'sui': 'SUI',
    'the-open-network': 'TON',
    'cyber': 'CYBER',
    'sonic': 'SONIC'
};

const CMC_PLATFORMS_MAP = {
    // CMC platform name/slug to DB networks
    'ethereum': 'ETH',
    'ethereum-classic': 'ETH',
    'bnb': 'BNB',
    'binance-smart-chain-bep20': 'BNB',
    'solana': 'SOL',
    'base': 'BASE',
    'arbitrum': 'ARBITRUM',
    'optimism': 'OPTIMISM',
    'polygon': 'POLYGON',
    'avalanche': 'AVALANCHE',
    'fantom': 'FANTOM',
    'celo': 'CELO',
    'scroll': 'SCROLL',
    'blast': 'BLAST',
    'zetachain': 'ZETACHAIN',
    'tron': 'TRON',
    'sui': 'SUI',
    'ton': 'TON',
    'cyber': 'CYBER',
    'sonic': 'SONIC'
};

async function run() {
    const cgKey = 'CG-wAvFy24FgS5GzRa8AfLiKhPi';
    const cmcKey = '61a5cf295fde46a39ecb614a63cfd73b';

    console.log('Fetching CoinGecko coin list...');
    let cgCoins = [];
    try {
        const res = await fetch('https://api.coingecko.com/api/v3/coins/list?include_platform=true', {
            headers: { 'x-cg-demo-api-key': cgKey, 'Accept': 'application/json' }
        });
        cgCoins = await res.json();
        console.log(`CoinGecko returned ${cgCoins.length} coins.`);
    } catch (e) {
        console.error('Error fetching CoinGecko:', e.message);
    }

    console.log('Fetching CoinMarketCap map...');
    let cmcCoins = [];
    try {
        const res = await fetch('https://pro-api.coinmarketcap.com/v1/cryptocurrency/map', {
            headers: { 'X-CMC_PRO_API_KEY': cmcKey, 'Accept': 'application/json' }
        });
        const data = await res.json();
        cmcCoins = data.data || [];
        console.log(`CoinMarketCap returned ${cmcCoins.length} coins.`);
    } catch (e) {
        console.error('Error fetching CoinMarketCap:', e.message);
    }

    // Now analyze mapping
    const uniqueTokens = new Map(); // address -> token details

    // 1. Process CoinGecko
    let cgMappedCount = 0;
    for (const coin of cgCoins) {
        if (!coin.platforms || Object.keys(coin.platforms).length === 0) continue;
        for (const [platform, addr] of Object.entries(coin.platforms)) {
            if (!addr) continue;
            const net = NETWORKS_MAP[platform];
            if (net) {
                const address = addr.toLowerCase().trim();
                if (address) {
                    uniqueTokens.set(address, {
                        name: coin.name,
                        symbol: coin.symbol.toUpperCase(),
                        address: address,
                        network: net,
                        source: 'CoinGecko'
                    });
                    cgMappedCount++;
                }
            }
        }
    }
    console.log(`CoinGecko mapped to supported networks: ${cgMappedCount} token instances.`);

    // 2. Process CoinMarketCap
    let cmcMappedCount = 0;
    for (const coin of cmcCoins) {
        if (!coin.platform || !coin.platform.token_address) continue;
        const platformSlug = coin.platform.slug || coin.platform.name.toLowerCase();
        const net = CMC_PLATFORMS_MAP[platformSlug];
        if (net) {
            const address = coin.platform.token_address.toLowerCase().trim();
            if (address) {
                if (!uniqueTokens.has(address)) {
                    uniqueTokens.set(address, {
                        name: coin.name,
                        symbol: coin.symbol.toUpperCase(),
                        address: address,
                        network: net,
                        source: 'CoinMarketCap'
                    });
                }
                cmcMappedCount++;
            }
        }
    }
    console.log(`CoinMarketCap mapped to supported networks: ${cmcMappedCount} token instances.`);
    console.log(`Total unique contract addresses on supported networks: ${uniqueTokens.size}`);
}

run();
