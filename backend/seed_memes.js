const db = require('./config/db');

const PREFIXES = [
    'Baby', 'Super', 'Mega', 'Laser', 'Space', 'Golden', 'Giga', 'Lil', 'Snoop', 'Rich',
    'Fat', 'Slim', 'Fast', 'Crypto', 'Safe', 'Grok', 'Pepe', 'Doge', 'Shib', 'Floki',
    'Chad', 'Turbo', 'Macho', 'Angry', 'Happy', 'Wild', 'Crazy', 'Drunk', 'Funny', 'Smart',
    'Dumb', 'Silly', 'Lucky', 'Holy', 'Brave', 'Mini', 'Tiny', 'Huge', 'Cool', 'Hot',
    'Red', 'Green', 'Blue', 'Dark', 'Light', 'Neon', 'Cyber', 'Alpha', 'Beta', 'Omega'
];

const MIDDLES = [
    'Cat', 'Dog', 'Frog', 'Ape', 'Bull', 'Bear', 'Panda', 'Koala', 'Lion', 'Tiger',
    'Wolf', 'Fox', 'Owl', 'Duck', 'Pig', 'Cow', 'Sheep', 'Goat', 'Monkey', 'Rabbit',
    'Mouse', 'Rat', 'Shark', 'Whale', 'Fish', 'Bird', 'Eagle', 'Hawk', 'Bat', 'Snake',
    'Dragon', 'Turtle', 'Crab', 'Spider', 'Bee', 'Ant', 'Worm', 'Bug', 'Snail', 'Sloth',
    'Otter', 'Seal', 'Orca', 'Dolphin', 'Penguin', 'Puffin', 'Kiwi', 'Llama', 'Sloth'
];

const SUFFIXES = [
    'Inu', 'Coin', 'Token', 'Mars', 'Moon', 'Pepe', 'Shib', 'Doge', 'Floki', 'Grok',
    'Neiro', 'Ape', 'Gamer', 'Wif', 'Hat', 'Elon', 'Giga', 'Rich', 'Bull', 'Bear',
    'Panda', 'Swap', 'Chain', 'World', 'Verse', 'Gang', 'Club', 'Squad', 'Army', 'Force',
    'Guild', 'DAO', 'Hub', 'Net', 'Lab', 'Space', 'Land', 'City', 'Town', 'Village',
    'Planet', 'Star', 'Galaxy', 'Universe', 'Multiverse', 'Matrix', 'Portal', 'Gate', 'Key'
];

const NETWORKS = ['SOL', 'BNB', 'BASE', 'ETH', 'TRON'];

function generateRandomAddress(network) {
    if (network === 'SOL') {
        const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        let addr = '';
        for (let i = 0; i < 44; i++) {
            addr += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return addr;
    } else if (network === 'TRON') {
        const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        let addr = 'T';
        for (let i = 0; i < 33; i++) {
            addr += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return addr;
    } else {
        // EVM
        const hex = '0123456789abcdef';
        let addr = '0x';
        for (let i = 0; i < 40; i++) {
            addr += hex.charAt(Math.floor(Math.random() * hex.length));
        }
        return addr;
    }
}

async function seed() {
    console.log('[Seeder] Initializing meme generator...');
    
    // Generate 22,500 unique combinations
    const combinations = [];
    for (const p of PREFIXES) {
        for (const m of MIDDLES) {
            for (const s of SUFFIXES) {
                combinations.push({ prefix: p, middle: m, suffix: s });
            }
        }
    }
    
    // Shuffle combinations
    for (let i = combinations.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [combinations[i], combinations[j]] = [combinations[j], combinations[i]];
    }
    
    const countToSeed = 22000;
    const selected = combinations.slice(0, countToSeed);
    
    console.log(`[Seeder] Generated ${selected.length} unique names. Beginning insert...`);
    
    try {
        await db.query('BEGIN TRANSACTION');
        
        let inserted = 0;
        
        for (let i = 0; i < selected.length; i++) {
            const item = selected[i];
            const symbol = (item.prefix.slice(0, 2) + item.middle.slice(0, 2) + item.suffix.slice(0, 2)).toUpperCase();
            const name = `${item.prefix} ${item.middle} ${item.suffix}`;
            
            const netIndex = Math.floor(Math.random() * 100);
            let network = 'SOL';
            if (netIndex >= 50 && netIndex < 80) network = 'BNB';
            else if (netIndex >= 80 && netIndex < 90) network = 'BASE';
            else if (netIndex >= 90 && netIndex < 95) network = 'ETH';
            else if (netIndex >= 95) network = 'TRON';
            
            const address = generateRandomAddress(network);
            const mcap = Math.floor(Math.random() * 4995000) + 5000; // $5k - $5M
            const liquidityBnb = Math.floor(Math.random() * 5000) + 10;
            const priceBnb = (mcap / 600) / 1000000000; // seed realistic price relative to mcap
            
            const description = `${name} (${symbol}) — The most viral community-driven meme on ${network === 'SOL' ? 'Solana' : network === 'BNB' ? 'BNB Chain' : network} network. Built for the community, powered by memes.`;
            const logo = `https://api.dicebear.com/7.x/identicon/svg?seed=${symbol}`;
            
            await db.query(`
                INSERT OR IGNORE INTO tokens (
                    contract_address, name, symbol, logo_url, description,
                    decimals, total_supply, launch_type, is_meme, is_delisted,
                    is_external, trust_status, network, market_cap, liquidity_bnb, price_bnb
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                address, name, symbol, logo, description,
                18, '1000000000', 'MEME', 1, 0,
                1, 'Newly Launched Token', network, mcap, liquidityBnb, priceBnb
            ]);
            
            inserted++;
            if (inserted % 5000 === 0) {
                console.log(`[Seeder] Inserted ${inserted} / ${countToSeed} tokens...`);
            }
        }
        
        await db.query('COMMIT');
        console.log(`[Seeder] ✅ Successfully seeded ${inserted} unique meme tokens into the database!`);
    } catch (err) {
        await db.query('ROLLBACK');
        console.error('[Seeder] Error during seeding:', err.message);
    }
}

seed().then(() => process.exit(0));
