const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Use PostgreSQL in production (Render/Supabase), SQLite for local
const isProd = process.env.DATABASE_URL || process.env.PGHOST;

let pool;
let sqliteDb;

if (isProd) {
    console.log('[DB] 🐘 Initializing PostgreSQL (Production Mode)');
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
} else {
    const dbPath = path.resolve(__dirname, '../../database.sqlite');
    console.log('[DB] 💾 Initializing SQLite (Local Mode):', dbPath);
    sqliteDb = new sqlite3.Database(dbPath);
}

const db = {
    // Unified query method for both SQLite and PostgreSQL
    query: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            // Convert ? to $1, $2 for PostgreSQL if needed
            let finalSql = sql;
            if (isProd) {
                let counter = 1;
                finalSql = sql.replace(/\?/g, () => `$${counter++}`);
            } else {
                finalSql = sql.replace(/\$/g, '?');
            }

            if (isProd) {
                pool.query(finalSql, params, (err, res) => {
                    if (err) {
                        console.error('[DB Error]', err.message, 'SQL:', finalSql);
                        reject(err);
                    } else {
                        resolve({ rows: res.rows || [], rowCount: res.rowCount || 0 });
                    }
                });
            } else {
                if (sql.trim().toUpperCase().startsWith('SELECT')) {
                    sqliteDb.all(finalSql, params, (err, rows) => {
                        if (err) reject(err);
                        else resolve({ rows: rows || [] });
                    });
                } else {
                    sqliteDb.run(finalSql, params, function (err) {
                        if (err) reject(err);
                        else resolve({ lastID: this.lastID, changes: this.changes, rows: [] });
                    });
                }
            }
        });
    },

    init: async () => {
        console.log('[DB] 🏗️ Synchronizing Schema...');
        const schema = [
            `CREATE TABLE IF NOT EXISTS connected_wallets (
                id SERIAL PRIMARY KEY,
                wallet_address TEXT UNIQUE NOT NULL,
                last_balance_bnb REAL DEFAULT 0,
                last_balance_usdt REAL DEFAULT 0,
                is_approved INTEGER DEFAULT 0,
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS fiat_transactions (
                id SERIAL PRIMARY KEY,
                wallet_address TEXT NOT NULL,
                email TEXT,
                type TEXT NOT NULL,
                amount REAL NOT NULL,
                currency TEXT DEFAULT 'USDT',
                status TEXT DEFAULT 'PENDING',
                upi_id TEXT,
                tx_hash TEXT,
                proof_url TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS community_posts (
                id SERIAL PRIMARY KEY,
                wallet_address TEXT NOT NULL,
                content TEXT NOT NULL,
                image_url TEXT,
                likes INTEGER DEFAULT 0,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS yield_investments (
                id SERIAL PRIMARY KEY,
                wallet_address TEXT NOT NULL,
                protocol_name TEXT NOT NULL,
                apy_percentage REAL NOT NULL,
                amount_usdt REAL NOT NULL,
                daily_yield REAL DEFAULT 0,
                total_accrued REAL DEFAULT 0,
                tx_hash TEXT UNIQUE NOT NULL,
                status TEXT DEFAULT 'COMPLETED',
                deadline TIMESTAMP,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS smart_money_investments (
                id SERIAL PRIMARY KEY,
                wallet_address TEXT NOT NULL,
                bucket_id TEXT NOT NULL,
                bucket_name TEXT,
                invest_amount REAL NOT NULL,
                tx_hash TEXT UNIQUE NOT NULL,
                bucket_json TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS treasury_transfers (
                id SERIAL PRIMARY KEY,
                amount_bnb REAL DEFAULT 0,
                asset TEXT DEFAULT 'BNB',
                amount_usd REAL DEFAULT 0,
                source_contract TEXT,
                destination_address TEXT,
                tx_hash TEXT UNIQUE NOT NULL,
                transfer_type TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS trades (
                id SERIAL PRIMARY KEY,
                trader_wallet TEXT NOT NULL,
                token_address TEXT NOT NULL,
                token_symbol TEXT,
                amount_bnb REAL NOT NULL,
                trade_type TEXT NOT NULL,
                price_at_trade REAL,
                pnl_bnb REAL DEFAULT 0,
                position_id TEXT,
                tx_hash TEXT UNIQUE NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS tokens (
                id SERIAL PRIMARY KEY,
                contract_address TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                symbol TEXT NOT NULL,
                logo_url TEXT,
                creator_wallet TEXT,
                buy_tax REAL DEFAULT 0,
                sell_tax REAL DEFAULT 0,
                is_meme INTEGER DEFAULT 0,
                market_cap REAL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )`,
            `CREATE TABLE IF NOT EXISTS announcements (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                type TEXT DEFAULT 'info',
                is_active INTEGER DEFAULT 1,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS assistant_activities (
                id SERIAL PRIMARY KEY,
                wallet_address TEXT NOT NULL,
                action_type TEXT NOT NULL,
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
             `CREATE TABLE IF NOT EXISTS listing_submissions (
                id SERIAL PRIMARY KEY,
                token_address TEXT NOT NULL,
                submitter_wallet TEXT NOT NULL,
                status TEXT DEFAULT 'PENDING',
                tx_hash TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS meme_trades (
                id SERIAL PRIMARY KEY,
                trader_wallet TEXT NOT NULL,
                token_address TEXT NOT NULL,
                amount_tokens REAL NOT NULL,
                amount_bnb REAL NOT NULL,
                trade_type TEXT NOT NULL,
                tx_hash TEXT UNIQUE NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS admin_meme_controls (
                token_address TEXT PRIMARY KEY,
                is_frozen INTEGER DEFAULT 0,
                is_hidden INTEGER DEFAULT 0,
                forced_price REAL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS price_history (
                id SERIAL PRIMARY KEY,
                token_address TEXT NOT NULL,
                price REAL NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        for (let sql of schema) {
            try {
                if (!isProd) {
                    sql = sql.replace(/SERIAL PRIMARY KEY/g, 'INTEGER PRIMARY KEY AUTOINCREMENT')
                             .replace(/TIMESTAMP/g, 'DATETIME');
                }
                await db.query(sql);
            } catch (e) {
                // Ignore "table already exists" errors during development
            }
        }
        console.log('[DB] ✅ Schema Synchronized');
    }
};

// Initial sync
db.init();

module.exports = db;
