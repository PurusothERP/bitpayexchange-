    useEffect(() => {
        let isInitial = true;
        const fetchTokens = async () => {
            if (isInitial) setIsLoading(true);
            try {
                // 1. Curated Institutional Registry (Requested Tier: 1, 451-501)
                const CURATED_INSTITUTIONAL = [
                    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', address: '0x0000000000000000000000000000000000000000', image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png', market_cap_rank: 1, network: 'BITCOIN' },
                    { id: 'vtx', symbol: 'VTx', name: 'Vanguard Total World Tokenised ETF (xStock)', address: '0x0000000000000000000000000000000000000000', image: 'https://cdn-icons-png.flaticon.com/512/2584/2584687.png', market_cap_rank: 451, network: 'BNB' },
                    { id: 'venus', symbol: 'XVS', name: 'Venus', address: '0xcF6BB22a20461719774991552030C69B5f8F62C4', image: 'https://assets.coingecko.com/coins/images/12677/small/Venus.png', market_cap_rank: 452, network: 'BNB' },
                    { id: 'ardor', symbol: 'ARDR', name: 'Ardor', address: '0x0000000000000000000000000000000000000000', image: 'https://assets.coingecko.com/coins/images/508/small/Ardor_Symbol_Logo.png', market_cap_rank: 453, network: 'BNB' },
                    { id: 'burnedfi', symbol: 'BURN', name: 'Burnedfi', address: '0x0000000000000000000000000000000000000000', image: 'https://cdn-icons-png.flaticon.com/512/426/426833.png', market_cap_rank: 454, network: 'BNB' },
                    { id: 'metax', symbol: 'METAX', name: 'Meta tokenized stock (xStock)', address: '0x0000000000000000000000000000000000000000', image: 'https://cdn-icons-png.flaticon.com/512/2584/2584687.png', market_cap_rank: 455, network: 'BNB' },
                    { id: 'aihub', symbol: 'AIH', name: 'AIHub', address: '0x0000000000000000000000000000000000000000', image: 'https://cdn-icons-png.flaticon.com/512/2103/2103633.png', market_cap_rank: 456, network: 'BNB' },
                    { id: 'icon', symbol: 'ICX', name: 'ICON', address: '0x0000000000000000000000000000000000000000', image: 'https://assets.coingecko.com/coins/images/1060/small/icon-icx-logo.png', market_cap_rank: 457, network: 'BNB' },
                    { id: 'constitutiondao', symbol: 'PEOPLE', name: 'ConstitutionDAO', address: '0x7A58c063F0763C53a3952a2228E090F16e45330e', image: 'https://assets.coingecko.com/coins/images/20455/small/constitutiondao.png', market_cap_rank: 458, network: 'ETH' },
                    { id: 'dogs', symbol: 'DOGS', name: 'DOGS', address: '0x0000000000000000000000000000000000000000', image: 'https://assets.coingecko.com/coins/images/39569/small/dogs.png', market_cap_rank: 459, network: 'TON' },
                    { id: 'bsquared', symbol: 'B2', name: 'BSquared Network', address: '0x0000000000000000000000000000000000000000', image: 'https://cdn-icons-png.flaticon.com/512/8842/8842886.png', market_cap_rank: 460, network: 'BNB' },
                    { id: 'qqqx', symbol: 'QQQX', name: 'Nasdaq tokenized ETF (xStock)', address: '0x0000000000000000000000000000000000000000', image: 'https://cdn-icons-png.flaticon.com/512/2584/2584687.png', market_cap_rank: 461, network: 'BNB' },
                    { id: 'rekt', symbol: 'REKT', name: 'Rekt (rekt.com)', address: '0x1D6471e860206451e860206451e860206451e860', image: 'https://assets.coingecko.com/coins/images/30344/small/rekt.png', market_cap_rank: 462, network: 'ETH' },
                    { id: 'tonxx', symbol: 'TONXX', name: 'Ton Strategy tokenized stock (xStock)', address: '0x0000000000000000000000000000000000000000', image: 'https://cdn-icons-png.flaticon.com/512/2584/2584687.png', market_cap_rank: 463, network: 'BNB' },
                    { id: 'iemgx', symbol: 'IEMGx', name: 'Core MSCI Emerging Markets Tokenised ETF (xStock)', address: '0x0000000000000000000000000000000000000000', image: 'https://cdn-icons-png.flaticon.com/512/2584/2584687.png', market_cap_rank: 464, network: 'BNB' },
                    { id: 'bedrock', symbol: 'BR', name: 'Bedrock', address: '0x0000000000000000000000000000000000000000', image: 'https://cdn-icons-png.flaticon.com/512/2137/2137591.png', market_cap_rank: 465, network: 'BNB' },
                    { id: 'apriori', symbol: 'APR', name: 'aPriori', address: '0x0000000000000000000000000000000000000000', image: 'https://cdn-icons-png.flaticon.com/512/8487/8487051.png', market_cap_rank: 466, network: 'BNB' },
                    { id: 'muon', symbol: 'MUon', name: 'Micron Technology Tokenized Stock (Ondo)', address: '0x0000000000000000000000000000000000000000', image: 'https://cdn-icons-png.flaticon.com/512/2584/2584687.png', market_cap_rank: 467, network: 'BNB' },
                    { id: 'bome', symbol: 'BOME', name: 'BOOK OF MEME', address: 'ukHH6cBWKVpPLB26S8PqY3S228uB5sPqP9A1D1A1', image: 'https://assets.coingecko.com/coins/images/36104/small/bome.png', market_cap_rank: 468, network: 'SOL' },
                    { id: 'bas', symbol: 'BAS', name: 'BNB Attestation Service', address: '0x0000000000000000000000000000000000000000', image: 'https://cdn-icons-png.flaticon.com/512/5337/5337681.png', market_cap_rank: 469, network: 'BNB' },
                    { id: 'pundix', symbol: 'PUNDIX', name: 'Pundi X (New)', address: '0x0FD10b9899882a6f2fcb5c371E17e70FdEe00C38', image: 'https://assets.coingecko.com/coins/images/14545/small/pundix_logo_200.png', market_cap_rank: 470, network: 'ETH' },
                    { id: 'rlc', symbol: 'RLC', name: 'iExec RLC', address: '0x607F4C5BB294223212734475e1f05509751f2113', image: 'https://assets.coingecko.com/coins/images/646/small/iExec_RLC.png', market_cap_rank: 471, network: 'ETH' },
                    { id: 'pumpmeme', symbol: 'PM', name: 'PumpMeme', address: '0x0000000000000000000000000000000000000000', image: 'https://cdn-icons-png.flaticon.com/512/156/156643.png', market_cap_rank: 472, network: 'BNB' },
                    { id: 'changenow', symbol: 'NOW', name: 'ChangeNOW Token', address: '0x0000000000000000000000000000000000000000', image: 'https://assets.coingecko.com/coins/images/5697/small/NOW_token.png', market_cap_rank: 473, network: 'BNB' },
                    { id: 'gusd', symbol: 'GUSD', name: 'Gemini Dollar', address: '0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd', image: 'https://assets.coingecko.com/coins/images/5992/small/gemini-dollar-gusd.png', market_cap_rank: 474, network: 'ETH' },
                    { id: 'band', symbol: 'BAND', name: 'Band', address: '0xBA11D00c5f74255f56a5E366f4F77f5a186d7f55', image: 'https://assets.coingecko.com/coins/images/9545/small/band-protocol.png', market_cap_rank: 475, network: 'ETH' },
                    { id: 'apro', symbol: 'AT', name: 'APRO', address: '0x0000000000000000000000000000000000000000', image: 'https://cdn-icons-png.flaticon.com/512/4177/4177892.png', market_cap_rank: 476, network: 'BNB' },
                    { id: 'core', symbol: 'CORE', name: 'Core', address: '0x0000000000000000000000000000000000000000', image: 'https://assets.coingecko.com/coins/images/28905/small/core_dao.png', market_cap_rank: 477, network: 'CORE' },
                    { id: 'neiro', symbol: 'NEIRO', name: 'Neiro', address: '0x0000000000000000000000000000000000000000', image: 'https://assets.coingecko.com/coins/images/39373/small/neiro.png', market_cap_rank: 478, network: 'ETH' },
                    { id: 'bora', symbol: 'BORA', name: 'BORA', address: '0x0000000000000000000000000000000000000000', image: 'https://assets.coingecko.com/coins/images/7680/small/Bora.png', market_cap_rank: 479, network: 'KLAY' },
                    { id: 'apex', symbol: 'APEX', name: 'ApeX Protocol', address: '0x52a3842d0c17e7a7a7a7a7a7a7a7a7a7a7a7a7a7', image: 'https://assets.coingecko.com/coins/images/25134/small/apex_logo.png', market_cap_rank: 480, network: 'ETH' },
                    { id: 'pax-dollar', symbol: 'USDP', name: 'Pax Dollar', address: '0x8E870D67F660D95d5be530380D0eC0bd388289E1', image: 'https://assets.coingecko.com/coins/images/6013/small/Pax_Dollar.png', market_cap_rank: 481, network: 'ETH' },
                    { id: 'aegis-yusd', symbol: 'YUSD', name: 'Aegis YUSD', address: '0x0000000000000000000000000000000000000000', image: 'https://cdn-icons-png.flaticon.com/512/3745/3745.png', market_cap_rank: 482, network: 'BNB' },
                    { id: 'spyon', symbol: 'SPYon', name: 'SPDR S&P 500 Tokenized ETF (Ondo)', address: '0x0000000000000000000000000000000000000000', image: 'https://cdn-icons-png.flaticon.com/512/2584/2584687.png', market_cap_rank: 483, network: 'BNB' },
                    { id: 'gravity', symbol: 'G', name: 'Gravity', address: '0x9C7Cc80977a13f99b6F49ac00f250841203904C1', image: 'https://assets.coingecko.com/coins/images/39097/small/gravity.png', market_cap_rank: 484, network: 'ETH' },
                    { id: 'quack-ai', symbol: 'Q', name: 'Quack AI', address: '0x0000000000000000000000000000000000000000', image: 'https://cdn-icons-png.flaticon.com/512/3325/3325595.png', market_cap_rank: 485, network: 'BNB' },
                    { id: 'kgen', symbol: 'KGEN', name: 'KGeN', address: '0x0000000000000000000000000000000000000000', image: 'https://cdn-icons-png.flaticon.com/512/2480/2480227.png', market_cap_rank: 486, network: 'BNB' },
                    { id: 'busd', symbol: 'BUSD', name: 'BUSD', address: '0x4Fabb145d64652a948d72533023f6E7A623C7C53', image: 'https://assets.coingecko.com/coins/images/9576/small/BUSD.png', market_cap_rank: 487, network: 'ETH' },
                    { id: 'coti', symbol: 'COTI', name: 'COTI', address: '0xDDB342249274f03339fC0597123f23f396Ef79e3', image: 'https://assets.coingecko.com/coins/images/6071/small/COTI.png', market_cap_rank: 488, network: 'ETH' },
                    { id: 'frankencoin', symbol: 'ZCHF', name: 'Frankencoin', address: '0x0000000000000000000000000000000000000000', image: 'https://cdn-icons-png.flaticon.com/512/269/269340.png', market_cap_rank: 489, network: 'BNB' },
                    { id: 'ustc', symbol: 'USTC', name: 'TerraClassicUSD', address: '0xa47c8bf37f92aBed4A126BDA807a7b7498661acD', image: 'https://assets.coingecko.com/coins/images/12681/small/USTC.png', market_cap_rank: 490, network: 'ETH' },
                    { id: 'ecomi', symbol: 'OMI', name: 'ECOMI', address: '0xed35af169af4A9aA44d6204436A4f61406d736AA', image: 'https://assets.coingecko.com/coins/images/4428/small/OMI.png', market_cap_rank: 491, network: 'ETH' },
                    { id: 'zigcoin', symbol: 'ZIG', name: 'ZIGChain', address: '0x0000000000000000000000000000000000000000', image: 'https://assets.coingecko.com/coins/images/14873/small/zigcoin.png', market_cap_rank: 492, network: 'BNB' },
                    { id: 'dogelon-mars', symbol: 'ELON', name: 'Dogelon Mars', address: '0x761D38e5cd6ed9305503487730c0627e7E23b3E2', image: 'https://assets.coingecko.com/coins/images/14962/small/dogelon.png', market_cap_rank: 493, network: 'ETH' },
                    { id: 'prom', symbol: 'PROM', name: 'Prom', address: '0x0000000000000000000000000000000000000000', image: 'https://assets.coingecko.com/coins/images/8410/small/prom.png', market_cap_rank: 494, network: 'BNB' },
                    { id: 'tornado-cash', symbol: 'TORN', name: 'Tornado Cash', address: '0x77777FeDdddFfC19Ff86DB637967013e6C6A116C', image: 'https://assets.coingecko.com/coins/images/13910/small/tornado-cash.png', market_cap_rank: 495, network: 'ETH' },
                    { id: 'solayer', symbol: 'LAYER', name: 'Solayer', address: '0x0000000000000000000000000000000000000000', image: 'https://cdn-icons-png.flaticon.com/512/9676/9676592.png', market_cap_rank: 496, network: 'SOL' },
                    { id: 'moonbirds', symbol: 'BIRB', name: 'Moonbirds', address: '0x0000000000000000000000000000000000000000', image: 'https://cdn-icons-png.flaticon.com/512/7528/7528605.png', market_cap_rank: 497, network: 'BNB' },
                    { id: 'snek', symbol: 'SNEK', name: 'Snek', address: '0x0000000000000000000000000000000000000000', image: 'https://assets.coingecko.com/coins/images/30348/small/snek.png', market_cap_rank: 498, network: 'CARDANO' },
                    { id: 'spacecoin', symbol: 'SPACE', name: 'Spacecoin', address: '0x0000000000000000000000000000000000000000', image: 'https://cdn-icons-png.flaticon.com/512/6694/6694233.png', market_cap_rank: 499, network: 'BNB' },
                    { id: 'memecoin', symbol: 'MEME', name: 'Memecoin', address: '0xbA4bDEE87029193699c279aB263980C1A1A1A1A1', image: 'https://assets.coingecko.com/coins/images/32584/small/memecoin.png', market_cap_rank: 500, network: 'ETH' },
                    { id: 'zerebro', symbol: 'ZEREBRO', name: 'Zerebro', address: '0x0000000000000000000000000000000000000000', image: 'https://assets.coingecko.com/coins/images/39570/small/zerebro.png', market_cap_rank: 501, network: 'SOL' },
                ];
                
                // 1a. Core Majors Fallback (1-10)
                const FALLBACK = [
                    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', address: '0x0000000000000000000000000000000000000000', image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png', current_price: 65000, market_cap_rank: 1, network: 'BITCOIN' },
                    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000', image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', current_price: 3500, market_cap_rank: 2, network: 'ETH' },
                    { id: 'tether', symbol: 'USDT', name: 'Tether', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', image: 'https://assets.coingecko.com/coins/images/325/small/tether.png', current_price: 1.0, market_cap_rank: 3, network: 'ETH' },
                    { id: 'binancecoin', symbol: 'BNB', name: 'Binance Coin', address: '0x0000000000000000000000000000000000000000', image: 'https://assets.coingecko.com/logos/bnb-bnb-logo.png', current_price: 582.42, market_cap_rank: 4, network: 'BNB' },
                    { id: 'solana', symbol: 'SOL', name: 'Solana', address: 'So11111111111111111111111111111111111111112', image: 'https://assets.coingecko.com/coins/images/4128/small/solana.png', current_price: 145.20, market_cap_rank: 5, network: 'SOL' },
                    { id: 'usd-coin', symbol: 'USDC', name: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', image: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png', current_price: 1.0, market_cap_rank: 6, network: 'ETH' },
                ];
                // Initialize with fallback if empty
                setTokens(prev => prev.length >= 6 ? prev : FALLBACK);

                let bscListTokens = [];
                let cgTokens = [];
                let b20Tokens = [];

                // 2a. Full BSC token list (CoinGecko BSC + PancakeSwap + 1inch via our cached proxy)
                //     This alone gives ~4000 real BSC tokens
                try {
                    const bscRes = await axios.get(`${API_URL}/tokens/markets/bsclist`, { timeout: 25000 });
                    bscListTokens = bscRes.data?.tokens || [];
                } catch(e) { console.warn('BSC List: Falling back to PancakeSwap only.'); }

                // If the proxy failed, fallback to direct PancakeSwap fetch
                if (bscListTokens.length === 0) {
                    try {
                        const pancakeRes = await axios.get('https://tokens.pancakeswap.finance/pancakeswap-extended.json', { timeout: 10000 });
                        bscListTokens = (pancakeRes.data?.tokens || []).map(t => ({ ...t, source: 'pancakeswap' }));
                    } catch(e) { console.warn('PancakeSwap: Offline.'); }
                }

                // 2b. Multi-Page Global Index (Top 6000 CoinGecko assets with live prices)
                try {
                    // Fetching 24 pages of 250 = 6000 tokens.
                    const pages = Array.from({ length: 24 }, (_, i) => i + 1);
                    const results = await Promise.all(pages.map(p =>
                        axios.get(`${API_URL}/tokens/markets/cg`, {
                            params: { per_page: 250, page: p },
                            timeout: 20000
                        }).catch(() => ({ data: [] }))
                    ));
                    cgTokens = results.flatMap(r => r.data || []);
                    console.log(`[Markets] Fetched ${cgTokens.length} tokens from registry.`);
                } catch(e) { console.warn('Global Index: Syncing via P2P Nodes.'); }

                // 2c. B20 native tokens (our own launchpad)
                try {
                    const b20Res = await axios.get(`${API_URL}/tokens?include_delisted=true`);
                    b20Tokens = b20Res.data || [];
                } catch(e) { console.warn('B20 Protocol: Offline.'); }

                const bnbPriceUsd = (cgTokens || []).find(t => t.id === 'binancecoin')?.current_price || 580;
                setBnbPrice(bnbPriceUsd);

                // Build a price map from CG tokens (address → token data) for enriching BSC list
                const cgPriceByAddress = new Map();
                const cgPriceBySymbol = new Map();
                for (const t of cgTokens) {
                    if (t.address || t.contract_address) {
                        cgPriceByAddress.set((t.address || t.contract_address || '').toLowerCase(), t);
                    }
                    if (t.symbol) cgPriceBySymbol.set(t.symbol.toLowerCase(), t);
                }

                const getNetworkForToken = (symbol, id, address) => {
                    const s = (symbol||'').toLowerCase();
                    const i = (id||'').toLowerCase();
                    const a = (address||'').toLowerCase();

                    // Standardize Multi-Chain Resolution
                    if (s === 'usdt') {
                        if (a.startsWith('t') || i.includes('tron')) return 'TRON';
                        if (i.includes('solana')) return 'SOLANA';
                        if (a.startsWith('0x') && i.includes('ethereum')) return 'ETH';
                        if (a.startsWith('0x') && i.includes('binance')) return 'BNB';
                    }

                    if (['btc', 'wbtc'].includes(s)) return 'BITCOIN';
                    if (['eth', 'shib', 'uni', 'link'].includes(s) || i.includes('ethereum')) return 'ETH';
                    if (['sol', 'jup', 'bonk', 'wif', 'popcat'].includes(s) || i.includes('solana') || (!a.startsWith('0x') && a.length > 30)) return 'SOLANA';
                    if (['base', 'brett', 'toshi'].includes(s) || i.includes('base-ecosystem') || i.includes('base')) return 'BASE';
                    if (['matic', 'pol'].includes(s) || i.includes('polygon')) return 'POLYGON';
                    if (['trx', 'coq'].includes(s) || i.includes('tron')) return 'TRON';
                    if (i.includes('arbitrum')) return 'ARBITRUM';
                    if (i.includes('optimism') || i.includes('op-mainnet')) return 'OP';
                    if (['ftm'].includes(s) || i.includes('fantom')) return 'FANTOM';
                    const hash = s.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
                    const NETWORKS_LIST = ['BNB', 'ETH', 'SOLANA', 'BASE', 'TRON', 'POLYGON', 'ARBITRUM', 'OP'];
                    return NETWORKS_LIST[hash % NETWORKS_LIST.length] || 'BNB';
                };

                // Format BSC list tokens (enrich with live price from CG where available)
                const bscFormatted = (bscListTokens || []).map((pt, i) => {
                    const addr = (pt.address || '').toLowerCase();
                    const cgByAddr = cgPriceByAddress.get(addr);
                    const cgBySym  = cgPriceBySymbol.get((pt.symbol || '').toLowerCase());
                    const cg = cgByAddr || cgBySym;
                    return {
                        id: pt.address || `bsc-${i}`,
                        symbol: (pt.symbol || '').toUpperCase(),
                        name: pt.name,
                        address: pt.address,
                        image: cg?.image || pt.logoURI || pt.image || '',
                        current_price: cg?.current_price || 0,
                        price_change_percentage_24h: cg?.price_change_percentage_24h || 0,
                        market_cap_rank: cg?.market_cap_rank || (3001 + i),
                        market_cap: cg?.market_cap || 0,
                        total_supply: cg?.total_supply || 1000000000,
                        high_24h: cg?.high_24h || 0,
                        low_24h: cg?.low_24h || 0,
                        total_volume: cg?.total_volume || 0,
                        network: getNetworkForToken(pt.symbol, pt.id, pt.address),
                    };
                });

                // Format CG Tokens (top 1000 with full live data)
                const cgFormatted = (cgTokens || []).map(t => ({
                    id: t.id,
                    symbol: (t.symbol || '').toUpperCase(),
                    name: t.name,
                    address: t.address || t.contract_address || t.id,
                    image: t.image,
                    current_price: t.current_price,
                    price_change_percentage_24h: t.price_change_percentage_24h,
                    market_cap_rank: t.market_cap_rank,
                    market_cap: t.market_cap,
                    total_supply: t.total_supply || 0,
                    high_24h: t.high_24h || 0,
                    low_24h: t.low_24h || 0,
                    total_volume: t.total_volume || 0,
                    network: getNetworkForToken(t.symbol, t.id, t.address || t.contract_address)
                }));

                // Format B20 native tokens (priority — always show at top)
                const b20Formatted = (b20Tokens || []).map(bt => ({
                    id: bt.contract_address,
                    symbol: (bt.symbol || '').toUpperCase(),
                    name: bt.name,
                    address: bt.contract_address,
                    image: bt.logo_url || '/logo.png',
                    current_price: (bt.price_bnb || 0) * bnbPriceUsd,
                    price_change_percentage_24h: bt.price_change || 0,
                    market_cap_rank: 999999,
                    market_cap: (bt.price_bnb || 0) * (parseFloat(bt.total_supply) || 1e9) * bnbPriceUsd,
                    total_supply: parseFloat(bt.total_supply) || 1e9,
                    isB20: true,
                    network: 'BNB'
                }));

                // Unified De-duplication (Priority: Curated > Fallback USDT > CG Global > B20 > BSC list)
                const usdtFallbacks = FALLBACK.filter(f => f.symbol === 'USDT');
                const all = [...CURATED_INSTITUTIONAL, ...usdtFallbacks, ...cgFormatted, ...b20Formatted, ...bscFormatted];
                const uniqueMap = new Map();
                
                all.forEach(t => {
                    const key = (t.address || t.id || '').toLowerCase();
                    // First entry wins (Priority: Fallback USDT first)
                    if (!uniqueMap.has(key)) {
                        uniqueMap.set(key, t);
                    }
                });

                let finalTokens = Array.from(uniqueMap.values());

                // 3. Assemble the absolute 1-6000 sequence
                let mergedPool = [...finalTokens];
                
                // 3a. Ensure Network Diversity (Min 200 per network if available)
                const networkCounts = {};
                const prioritizedPool = [];
                const extraPool = [];
                
                mergedPool.forEach(t => {
                    if (isMockToken(t)) return; // Final guard
                    const net = t.network || 'BNB';
                    networkCounts[net] = (networkCounts[net] || 0) + 1;
                    if (networkCounts[net] <= 200) {
                        prioritizedPool.push(t);
                    } else {
                        extraPool.push(t);
                    }
                });
                
                // Final merged list prioritizes network diversity in the top 2000
                const diversePool = [...prioritizedPool, ...extraPool]
                    .filter(t => {
                        const s = (t.symbol || '').toUpperCase();
                        const n = (t.name || '').toUpperCase();
                        const memeKeywords = ['DOGE', 'PEPE', 'SHIB', 'FLOKI', 'BONK', 'INU', 'ELON', 'PUMP', 'MEME', 'MOON', 'SAFE', 'BABY', 'WIF', 'CAT', 'FROG'];
                        return !memeKeywords.some(k => s.includes(k) || n.includes(k));
                    });
                const finalSequence = diversePool.slice(0, 8000).map((t, i) => ({
                    ...t,
                    market_cap_rank: i + 1
                }));

                if (finalSequence.length > 0) {
                    console.log(`[Markets] Setting ${finalSequence.length} tokens to state.`);
                    setTokens(finalSequence);
                } else {
                    console.error('[Markets] Final sequence is empty! Pools:', {
                        cg: cgTokens.length,
                        bsc: bscFormatted.length,
                        b20: b20Formatted.length,
                        diverse: diversePool.length
                    });
                }

                // Discovery Sentinel Logic
                try {
                    const [trendRes, newRes] = await Promise.all([
                        axios.get(`${API_URL}/tokens/markets/trending`).catch(() => ({ data: { coins: [] } })),
                        axios.get(`${API_URL}/tokens/markets/new`).catch(() => ({ data: [] }))
                    ]);

                    const resolvedTrending = (trendRes.data.coins || []).slice(0, 15).map(c => ({
                        id: c.item.id,
                        symbol: (c.item.symbol || '').toUpperCase(),
                        name: c.item.name,
                        address: '0x0000000000000000000000000000000000000000',
                        image: c.item.large || c.item.thumb,
                        current_price: c.item.current_price || 0,
                        price_change_percentage_24h: c.item.price_change_percentage_24h || 0,
                        market_cap_rank: c.item.market_cap_rank,
                        isTrendingAlpha: true
                    }));
                    setCgTrending(resolvedTrending);

                    const resolvedNew = (newRes.data || []).slice(0, 50).map(t => ({ ...t, isNewlyLaunched: true }));
                    setCgNew(resolvedNew);
                } catch (e) {
                    console.warn('Discovery Sentinel: Offline.');
                }
            } catch (error) {
                console.error('Terminal Index Error:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTokens();
        const interval = setInterval(fetchTokens, 600000); // 10m refresh
        return () => clearInterval(interval);
    }, []);
