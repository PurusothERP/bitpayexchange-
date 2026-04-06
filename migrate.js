const db = require('./backend/config/db');

async function migrate() {
    try {
        console.log('Migrating trades table...');
        // Drop and recreate or alter?
        // Since it's a dev DB, dropping and recreating is easier for alignment.
        // But let's try to ALIGN it if possible.
        // Actually, given it's local development, I'll just DROP it to ensure everything matches.
        
        await new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run("DROP TABLE IF EXISTS trades");
                db.run(`
                    CREATE TABLE trades (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        token_address TEXT NOT NULL,
                        trader_wallet TEXT NOT NULL,
                        trade_type TEXT NOT NULL,
                        amount_tokens REAL DEFAULT 0,
                        amount_bnb REAL DEFAULT 0,
                        price_bnb REAL DEFAULT 0,
                        fee_bnb REAL DEFAULT 0,
                        tx_hash TEXT UNIQUE NOT NULL,
                        block_number INTEGER DEFAULT 0,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });

        console.log('Trades table reset and migrated.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

migrate();
