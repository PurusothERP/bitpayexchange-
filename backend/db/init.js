const db = require('../config/db');

async function initDb() {
    try {
        const queries = [
            `CREATE TABLE IF NOT EXISTS tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        symbol TEXT NOT NULL,
        description TEXT,
        logo_url TEXT,
        contract_address TEXT UNIQUE,
        creator_wallet TEXT,
        total_supply TEXT,
        price_bnb REAL DEFAULT 0,
        liquidity_bnb REAL DEFAULT 0,
        trading_enabled BOOLEAN DEFAULT FALSE,
        tx_hash TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token_address TEXT,
        user_wallet TEXT,
        type TEXT,
        amount_token TEXT,
        amount_bnb TEXT,
        tx_hash TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
            `CREATE TABLE IF NOT EXISTS holders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token_address TEXT,
        wallet_address TEXT,
        balance TEXT,
        UNIQUE(token_address, wallet_address)
      )`
        ];

        for (const q of queries) {
            await db.query(q);
        }
        console.log('Database initialized successfully (SQLite)');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

if (require.main === module) {
    initDb();
}

module.exports = initDb;
