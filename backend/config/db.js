/**
 * B20 Exchange Protocol Database Management
 * Optimized for real-time institutional storage.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../database.sqlite');
console.log('[DB] Absolute DB Path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('[DB] Connection Error:', err.message);
    else {
        console.log('[DB] ✅ Connected to SQLite (Real-time storage active)');
        db.run('PRAGMA journal_mode=WAL'); 
        console.log('[DB] ✅ WAL mode enabled — concurrent read/write active');
    }
});

// ── DATABASE INITIALIZATION ──────────────────────────────────────────────────
db.init = () => {
    try {
        // Tokens table
        db.run(`
            CREATE TABLE IF NOT EXISTS tokens (
                contract_address TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                symbol TEXT NOT NULL,
                total_supply TEXT DEFAULT '0',
                creator_wallet TEXT NOT NULL,
                owner TEXT,
                description TEXT DEFAULT '',
                logo_url TEXT DEFAULT '',
                launch_type TEXT DEFAULT 'STANDARD',
                trust_status TEXT DEFAULT 'Newly Launched Token',
                is_delisted INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating tokens table:', err);
            else console.log('Tokens table ready.');
        });

        // Treasury transfers log
        db.run(`
            CREATE TABLE IF NOT EXISTS treasury_transfers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                amount_bnb REAL NOT NULL,
                source_contract TEXT DEFAULT '',
                destination_address TEXT DEFAULT '',
                tx_hash TEXT UNIQUE NOT NULL,
                transfer_type TEXT DEFAULT 'fee',
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating treasury_transfers table:', err);
            else console.log('Treasury transfers table ready.');
        });

        // On-chain trade events
        db.run(`
            CREATE TABLE IF NOT EXISTS trades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token_address TEXT NOT NULL,
                trader_wallet TEXT NOT NULL,
                trade_type TEXT NOT NULL,
                amount_tokens REAL DEFAULT 0,
                amount_bnb REAL DEFAULT 0,
                fee_bnb REAL DEFAULT 0,
                tx_hash TEXT UNIQUE NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating trades table:', err);
            else console.log('Trades table ready.');
        });

        // Price history
        db.run(`
            CREATE TABLE IF NOT EXISTS price_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token_address TEXT NOT NULL,
                price_bnb REAL DEFAULT 0,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating price_history table:', err);
            else console.log('Price history table ready.');
        });

        // Connected Wallets tracking
        db.run(`
            CREATE TABLE IF NOT EXISTS connected_wallets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                wallet_address TEXT UNIQUE NOT NULL,
                last_balance_bnb REAL DEFAULT 0,
                last_balance_usdt REAL DEFAULT 0,
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
                type TEXT NOT NULL,
                amount REAL NOT NULL,
                inr_amount REAL NOT NULL,
                proof_url TEXT,
                status TEXT DEFAULT 'PENDING',
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating fiat_transactions table:', err);
            else console.log('Fiat transactions table ready.');
        });

        // Community posts table
        db.run(`
            CREATE TABLE IF NOT EXISTS community_posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                wallet_address TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating community_posts table:', err);
            else console.log('Community posts table ready.');
        });

        // Listing Submissions
        db.run(`
            CREATE TABLE IF NOT EXISTS listing_submissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                contract_address TEXT NOT NULL,
                token_name TEXT NOT NULL,
                token_symbol TEXT NOT NULL,
                description TEXT DEFAULT '',
                logo_url TEXT DEFAULT '',
                owner_wallet TEXT NOT NULL,
                total_supply TEXT DEFAULT '0',
                status TEXT DEFAULT 'pending',
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating listing_submissions table:', err);
            else console.log('Listing submissions table ready.');
        });

        // Dynamic Settings Table
        db.run(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                category TEXT DEFAULT 'general',
                label TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating settings table:', err);
            else {
                console.log('Settings table ready.');
                const defaults = [
                    ['TOKEN_LAUNCH_STANDARD', '0.003', 'fees', 'Standard Token Launch Fee (BNB)'],
                    ['TOKEN_LAUNCH_FAIR', '0.005', 'fees', 'Fair Launch Fee (BNB)'],
                    ['TOKEN_LAUNCH_BONDING', '0.007', 'fees', 'Bonding Curve Fee (BNB)'],
                    ['TOKEN_UPGRADE_FEE', '0.01', 'fees', 'Token Trust/Badge Upgrade (BNB)'],
                    ['WHITEPAPER_GEN_FEE', '0.002', 'fees', 'AI Whitepaper Generation (BNB)'],
                    ['SMART_MONEY_FEE', '0.005', 'fees', 'Smart Money Entry Fee (BNB)'],
                    ['STAKING_CREATION_FEE', '0.01', 'fees', 'Staking Pool Creation (BNB)'],
                    ['TRADING_FEE_PERCENT', '0.1', 'fees', 'Exchange Trading Fee (%)'],
                    ['INR_USDT_BUY', '92.5', 'fiat', 'INR to USDT Buy Rate'],
                    ['INR_USDT_SELL', '88.5', 'fiat', 'USDT to INR Sell Rate']
                ];
                defaults.forEach(([k, v, c, l]) => {
                    db.run('INSERT OR IGNORE INTO settings (key, value, category, label) VALUES (?, ?, ?, ?)', [k, v, c, l]);
                });
            }
        });

        // Announcements
        db.run(`
            CREATE TABLE IF NOT EXISTS announcements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                image_url TEXT,
                token_symbol TEXT,
                token_name TEXT,
                token_logo TEXT,
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating announcements table:', err);
            else console.log('Announcements table ready.');
        });

        db.run(`
            CREATE TABLE IF NOT EXISTS admin_assistants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                wallet_address TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                permissions_json TEXT DEFAULT '[]',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS token_upgrade_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token_address TEXT NOT NULL,
                token_name TEXT NOT NULL,
                current_status TEXT DEFAULT 'STANDARD',
                requested_upgrade TEXT NOT NULL,
                user_wallet TEXT NOT NULL,
                status TEXT DEFAULT 'PENDING',
                tx_hash TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

    } catch (e) {
        console.error('[DB] Critical Initialization Error:', e.message);
    }
};

// ── PROMISE WRAPPER FOR QUERIES ──────────────────────────────────────────────
db.query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        const convertedSql = sql.replace(/\$/g, '?');
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
            db.all(convertedSql, params, (err, rows) => {
                if (err) reject(err);
                else resolve({ rows });
            });
        } else {
            db.run(convertedSql, params, function (err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes, rows: [] });
            });
        }
    });
};

db.init();

module.exports = db;
