const db = require('./config/db');

async function seed() {
    try {
        console.log('[NFT-Sync] 🚀 Generating 500+ Institutional NFT Collections for local registry...');
        
        // Wait for DB to be ready
        await new Promise(r => setTimeout(r, 1000));

        let total = 0;
        
        const prefixes = ["Bored", "Mutant", "Crypto", "Pudgy", "Azuki", "Doodles", "Clone", "Meebits", "Cool", "World", "DeGods", "Invisible", "Cyber", "Milady", "Pixel", "Meta", "Omni", "Nexus", "Quantum", "Hyper"];
        const suffixes = ["Apes", "Punks", "Cats", "Penguins", "Beanz", "Friends", "X", "Kongz", "Women", "Aliens", "Goblins", "Spirits", "Ghosts", "Dragons", "Bots", "Lions", "Tigers", "Bears", "Wolves", "Owls"];
        const themes = ["Club", "Yacht Club", "Syndicate", "Society", "Labs", "Collective", "Network", "DAO", "Protocol", "Foundation"];

        for (let i = 1; i <= 600; i++) {
            const p = prefixes[Math.floor(Math.random() * prefixes.length)];
            const s = suffixes[Math.floor(Math.random() * suffixes.length)];
            const t = Math.random() > 0.5 ? " " + themes[Math.floor(Math.random() * themes.length)] : "";
            
            const name = `${p} ${s}${t} #${i}`;
            const symbol = (p.slice(0, 2) + s.slice(0, 2)).toUpperCase();
            
            // Random floor price between 0.001 and 5.0 (skewed lower)
            const floorPrice = parseFloat((Math.pow(Math.random(), 3) * 5 + 0.001).toFixed(4));
            // Market cap proportional to floor price
            const cap = parseFloat((floorPrice * 10000 * (0.8 + Math.random() * 0.4)).toFixed(2));
            const address = '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('');
            
            // Random image from placeholder API
            const imgId = Math.floor(Math.random() * 1000);
            const img = `https://picsum.photos/seed/${imgId}/400/400`;
            
            const holders = Math.floor(Math.random() * 5000) + 100;
            const vol24h = Math.floor(Math.random() * 500);

            await db.query(
                `INSERT INTO nfts 
                    (name, symbol, contract_address, image_url, last_sell_price, market_cap,
                     risk_factor, popularity, liquidity_changes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(contract_address) DO UPDATE SET
                    last_sell_price  = excluded.last_sell_price,
                    market_cap       = excluded.market_cap,
                    image_url        = CASE WHEN excluded.image_url != '' THEN excluded.image_url ELSE nfts.image_url END,
                    popularity       = excluded.popularity`,
                [
                    name,
                    symbol,
                    address,
                    img,
                    floorPrice,
                    cap,
                    parseFloat((1 + Math.random() * 3).toFixed(2)),
                    holders,
                    vol24h
                ]
            );
            total++;
            if (total % 100 === 0) {
                console.log(`[NFT-Sync] ✅ Inserted ${total} collections...`);
            }
        }
        
        console.log(`[NFT-Sync] 🏁 Sync complete — ${total} NFTs indexed.`);
    } catch (err) {
        console.error('[NFT-Sync] Fatal Error:', err.message);
    }
}

seed().then(() => process.exit(0));
