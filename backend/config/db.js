const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('[DB] CRITICAL: SQLite connection failed:', err);
    } else {
        console.log('[DB] ✅ Connected to SQLite (Real-time storage active)');
        // Ensure tables exist
        db.run(`
            CREATE TABLE IF NOT EXISTS tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                symbol TEXT NOT NULL,
                contract_address TEXT UNIQUE NOT NULL,
                creator_wallet TEXT,
                logo_url TEXT DEFAULT '',
                metadata_url TEXT DEFAULT '',
                description TEXT DEFAULT '',
                total_supply TEXT DEFAULT '1000000000',
                tx_hash TEXT DEFAULT '',
                price_bnb REAL DEFAULT 0,
                liquidity_bnb TEXT DEFAULT '0',
                trading_enabled INTEGER DEFAULT 0,
                trust_status TEXT DEFAULT 'Newly Launched Token',
                is_delisted INTEGER DEFAULT 0,
                last_trade_at DATETIME,
                launch_type TEXT DEFAULT 'MEME',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating tokens table:', err);
            else {
                console.log('Tokens table ready.');
                // Handle schema evolution for existing DBs
                const cols = ['trust_status', 'is_delisted', 'last_trade_at', 'launch_type'];
                cols.forEach(col => {
                    db.run(`ALTER TABLE tokens ADD COLUMN ${col} ${col === 'is_delisted' ? 'INTEGER DEFAULT 0' : 'TEXT'}`, (err) => {
                        // ignore error if column already exists
                    });
                });
            }
        });

        // Treasury transfers log
        db.run(`
            CREATE TABLE IF NOT EXISTS treasury_transfers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                amount_bnb REAL NOT NULL,
                source_contract TEXT NOT NULL,
                destination_address TEXT NOT NULL,
                tx_hash TEXT UNIQUE NOT NULL,
                transfer_type TEXT DEFAULT 'fee',
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating treasury_transfers table:', err);
            else console.log('Treasury transfers table ready.');
        });

        // On-chain trade events (Buy / Sell)
        db.run(`
            CREATE TABLE IF NOT EXISTS trades (
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
            if (err) console.error('Error creating trades table:', err);
            else console.log('Trades table ready.');
        });

        // Price history per trade tick
        db.run(`
            CREATE TABLE IF NOT EXISTS price_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token_address TEXT NOT NULL,
                price_bnb REAL DEFAULT 0,
                collateral_bnb REAL DEFAULT 0,
                supply_traded REAL DEFAULT 0,
                tx_hash TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating price_history table:', err);
            else console.log('Price history table ready.');
        });

        // AI Whitepapers table
        db.run(`
            CREATE TABLE IF NOT EXISTS whitepapers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token_address TEXT DEFAULT '',
                temp_id TEXT UNIQUE,
                token_name TEXT NOT NULL,
                token_symbol TEXT NOT NULL,
                content TEXT NOT NULL,
                is_paid INTEGER DEFAULT 0,
                tx_hash TEXT DEFAULT '',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating whitepapers table:', err);
            else console.log('Whitepapers table ready.');
        });

        // Connected Wallets tracking
        db.run(`
            CREATE TABLE IF NOT EXISTS connected_wallets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                wallet_address TEXT UNIQUE NOT NULL,
                last_balance_bnb REAL DEFAULT 0,
                is_approved INTEGER DEFAULT 0,
                last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating connected_wallets table:', err);
            else console.log('Connected wallets table ready.');
        });

        // Fiat Transactions (Buy/Sell)
        db.run(`
            CREATE TABLE IF NOT EXISTS fiat_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_wallet TEXT NOT NULL,
                user_name TEXT NOT NULL,
                phone_number TEXT NOT NULL,
                email TEXT NOT NULL,
                type TEXT NOT NULL, -- 'BUY' or 'SELL'
                asset TEXT NOT NULL, -- 'BNB' or 'USDT'
                amount REAL NOT NULL,
                inr_amount REAL NOT NULL,
                proof_url TEXT,
                bank_details_json TEXT, -- JSON string for Bank/UPI details
                status TEXT DEFAULT 'PENDING', -- 'PENDING', 'VERIFIED', 'REJECTED'
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating fiat_transactions table:', err);
            else console.log('Fiat transactions table ready.');
        });
    }
});

// Promisify query — using ? SQLite-compatible placeholders
// Converts $1, $2, ... to ? for compatibility with any Postgres-style calls
db.query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        // Convert Postgres-style $1 $2 ... to SQLite ? placeholders
        const convertedSql = sql.replace(/\$\d+/g, '?');
        const cleanSql = convertedSql.trim().toUpperCase();

        if (cleanSql.startsWith('SELECT')) {
            db.all(convertedSql, params, (err, rows) => {
                if (err) reject(err);
                else resolve({ rows: rows || [] });
            });
        } else if (cleanSql.startsWith('INSERT')) {
            // Handle ON CONFLICT DO UPDATE (UPSERT)
            db.run(convertedSql, params, function (err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes, rows: [{ id: this.lastID }] });
            });
        } else {
            db.run(convertedSql, params, function (err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes, rows: [] });
            });
        }
    });
};

module.exports = db;
