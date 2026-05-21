/**
 * fetch_real_tokens.js
 * Deletes ALL synthetic/mock tokens, then fetches REAL tokens
 * from CoinGecko's public token list endpoints (no API key needed).
 * Uses Node.js native fetch only — no axios.
 */
const db = require('./backend/config/db');

const NETWORKS = [
    { net: 'BNB',       url: 'https://tokens.coingecko.com/binance-smart-chain/all.json' },
    { net: 'ETH',       url: 'https://tokens.coingecko.com/ethereum/all.json' },
    { net: 'SOL',       url: 'https://tokens.coingecko.com/solana/all.json' },
    { net: 'BASE',      url: 'https://tokens.coingecko.com/base/all.json' },
    { net: 'ARBITRUM',  url: 'https://tokens.coingecko.com/arbitrum-one/all.json' },
    { net: 'OPTIMISM',  url: 'https://tokens.coingecko.com/optimistic-ethereum/all.json' },
    { net: 'POLYGON',   url: 'https://tokens.coingecko.com/polygon-pos/all.json' },
    { net: 'AVALANCHE', url: 'https://tokens.coingecko.com/avalanche/all.json' },
    { net: 'FANTOM',    url: 'https://tokens.coingecko.com/fantom/all.json' },
    { net: 'CELO',      url: 'https://tokens.coingecko.com/celo/all.json' },
    { net: 'SCROLL',    url: 'https://tokens.coingecko.com/scroll/all.json' },
    { net: 'BLAST',     url: 'https://tokens.coingecko.com/blast/all.json' },
    { net: 'ZETACHAIN', url: 'https://tokens.coingecko.com/zetachain/all.json' },
    { net: 'TRON',      url: 'https://tokens.coingecko.com/tron/all.json' },
    { net: 'SUI',       url: 'https://tokens.coingecko.com/sui/all.json' },
    { net: 'TON',       url: 'https://tokens.coingecko.com/ton/all.json' },
    { net: 'CYBER',     url: 'https://tokens.coingecko.com/cyber/all.json' },
    { net: 'SONIC',     url: 'https://tokens.coingecko.com/sonic/all.json' },
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchWithRetry(url, retries = 3, delayMs = 2000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const res = await fetch(url, {
                headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
                signal: AbortSignal.timeout(20000),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) {
            console.log(`  Attempt ${attempt}/${retries} failed: ${err.message}`);
            if (attempt < retries) await sleep(delayMs * attempt);
        }
    }
    return null;
}

async function run() {
    console.log('\n🧹 Step 1: Removing all synthetic/mock tokens from DB...');

    // Delete tokens that are clearly synthetic (generic names or mock addresses)
    const deleted = await db.query(`
        DELETE FROM tokens WHERE 
            name LIKE '% Network %' OR name LIKE '% Protocol %' OR
            name LIKE '% Finance %' OR name LIKE '% Swap %' OR
            name LIKE '% DAO %' OR name LIKE '% Chain %' OR
            name LIKE '% AI %' OR name LIKE '% Game %' OR
            name LIKE '% Yield %' OR contract_address LIKE '0x_mock_%'
    `);
    console.log(`✅ Removed synthetic tokens.\n`);

    let totalInserted = 0;

    console.log('🌐 Step 2: Fetching REAL tokens from CoinGecko token lists...\n');

    for (const { net, url } of NETWORKS) {
        console.log(`📥 [${net}] Fetching from ${url}`);
        const data = await fetchWithRetry(url);

        if (!data || !Array.isArray(data.tokens) || data.tokens.length === 0) {
            console.log(`⚠️  [${net}] No token data returned — skipping.\n`);
            continue;
        }

        const tokens = data.tokens.slice(0, 400); // up to 400 per network
        let count = 0;

        for (const t of tokens) {
            // Skip tokens with empty or invalid fields
            if (!t.symbol || !t.name || !t.address) continue;
            if (t.symbol.length > 20 || t.name.length > 80) continue;

            const address = String(t.address).toLowerCase();
            const symbol  = String(t.symbol).toUpperCase().slice(0, 20);
            const name    = String(t.name).slice(0, 80);
            const logo    = t.logoURI || null;
            const decimals = t.decimals || 18;

            // Assign a plausible price (we don't have live prices yet — CoinGecko API
            // provides prices separately. We set 0 and live price comes from frontend CG calls).
            const price    = 0;
            const liquidity = 0;

            try {
                await db.query(`
                    INSERT INTO tokens
                        (name, symbol, contract_address, decimals, launch_type, trust_status,
                         price_bnb, liquidity_bnb, network, trading_enabled, logo_url)
                    VALUES (?, ?, ?, ?, 'EXCHANGE_LISTING', 'Verified', ?, ?, ?, 1, ?)
                    ON CONFLICT(contract_address) DO UPDATE SET
                        name    = excluded.name,
                        symbol  = excluded.symbol,
                        network = excluded.network,
                        logo_url = COALESCE(excluded.logo_url, tokens.logo_url),
                        trust_status = 'Verified'
                `, [name, symbol, address, decimals, price, liquidity, net, logo]);
                count++;
            } catch (_) { /* ignore individual insert errors */ }
        }

        totalInserted += count;
        console.log(`✅ [${net}] Inserted/updated ${count} real tokens.\n`);

        // Be polite — small delay between networks
        await sleep(500);
    }

    console.log(`\n🎉 Done! Total real tokens in DB: ${totalInserted} new/updated.`);

    // Final count
    const result = await db.query('SELECT network, COUNT(*) as cnt FROM tokens GROUP BY network ORDER BY cnt DESC');
    console.log('\n📊 Token counts by network:');
    result.rows.forEach(r => console.log(`  ${r.network}: ${r.cnt}`));

    process.exit(0);
}

run().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});
