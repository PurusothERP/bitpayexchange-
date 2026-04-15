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
                decimals INTEGER DEFAULT 18,
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
                // Handle schema evolution for existing DBs — covers ALL columns referenced in code
                const tokenCols = [
                    ['decimals',             'INTEGER DEFAULT 18'],
                    ['trust_status',         'TEXT DEFAULT "Newly Launched Token"'],
                    ['is_delisted',          'INTEGER DEFAULT 0'],
                    ['last_trade_at',        'DATETIME'],
                    ['launch_type',          'TEXT DEFAULT "MEME"'],
                    ['is_boosted',           'INTEGER DEFAULT 0'],
                    ['is_external',          'INTEGER DEFAULT 0'],
                    ['network',              'TEXT DEFAULT "BNB"'],
                    ['bscscan_verified',     'INTEGER DEFAULT 0'],
                    ['verification_status',  'TEXT DEFAULT "pending"'],
                    ['tw_pr_url',            'TEXT DEFAULT ""'],
                    ['tw_pr_status',         'TEXT DEFAULT "pending"'],
                    ['ipfs_logo_url',        'TEXT DEFAULT ""'],
                    ['price_change',         'REAL DEFAULT 0'],
                ];
                tokenCols.forEach(([col, def]) => {
                    db.run(`ALTER TABLE tokens ADD COLUMN ${col} ${def}`, () => {});
                });
            }
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
                asset TEXT DEFAULT 'BNB',
                amount_usd REAL DEFAULT 0,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating treasury_transfers table:', err);
            else {
                console.log('Treasury transfers table ready.');
                // Schema evolution for older DBs
                ['asset', 'amount_usd', 'source_contract', 'destination_address'].forEach(col => {
                    const def = col === 'amount_usd' ? 'REAL DEFAULT 0' : 'TEXT DEFAULT ""';
                    db.run(`ALTER TABLE treasury_transfers ADD COLUMN ${col} ${def}`, () => {});
                });
            }
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
            else {
                console.log('Trades table ready.');
                // Schema evolution: every column referenced in routes
                const tradeCols = [
                    ['token_symbol', 'TEXT DEFAULT ""'],
                    ['pnl_bnb',      'REAL DEFAULT 0'],
                    ['position_id',  'TEXT'],
                    ['is_settled',   'INTEGER DEFAULT 0'],
                ];
                tradeCols.forEach(([col, def]) => {
                    db.run(`ALTER TABLE trades ADD COLUMN ${col} ${def}`, () => {});
                });
            }
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
                last_balance_usdt REAL DEFAULT 0,
                is_approved INTEGER DEFAULT 0,
                last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating connected_wallets table:', err);
            else {
                console.log('Connected wallets table ready.');
                // Schema evolution
                const walletCols = ['last_balance_usdt'];
                walletCols.forEach(col => {
                    db.run(`ALTER TABLE connected_wallets ADD COLUMN ${col} REAL DEFAULT 0`, (err) => {});
                });
            }
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

        // Staking records table
        db.run(`
            CREATE TABLE IF NOT EXISTS staking_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                wallet_address TEXT NOT NULL,
                token_address TEXT NOT NULL,
                token_symbol TEXT NOT NULL,
                token_name TEXT DEFAULT '',
                amount_tokens REAL NOT NULL,
                period_days INTEGER NOT NULL,
                apr REAL NOT NULL,
                expected_reward REAL NOT NULL,
                total_payout REAL DEFAULT 0,
                tx_hash TEXT UNIQUE NOT NULL,
                start_date DATETIME NOT NULL,
                end_date DATETIME NOT NULL,
                status TEXT DEFAULT 'active',
                release_requested_at DATETIME,
                released_at DATETIME,
                admin_note TEXT DEFAULT '',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating staking_records table:', err);
            else console.log('Staking records table ready.');
        });
        // Announcements table
        db.run(`
            CREATE TABLE IF NOT EXISTS announcements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                image_url TEXT DEFAULT '',
                content TEXT NOT NULL,
                likes INTEGER DEFAULT 0,
                token_symbol TEXT DEFAULT '',
                token_name TEXT DEFAULT '',
                token_logo TEXT DEFAULT '',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating announcements table:', err);
            else {
                console.log('Announcements table ready.');
                // Schema evolution
                ['token_symbol', 'token_name', 'token_logo'].forEach(col => {
                    db.run(`ALTER TABLE announcements ADD COLUMN ${col} TEXT DEFAULT ''`, () => {});
                });
            }
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

        // Blocked users table
        db.run(`
            CREATE TABLE IF NOT EXISTS blocked_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                wallet_address TEXT UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating blocked_users table:', err);
            else console.log('Blocked users table ready.');
        });

        // Admin Assistants (RBAC)
        db.run(`
            CREATE TABLE IF NOT EXISTS admin_assistants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                wallet_address TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                permissions_json TEXT DEFAULT '[]',
                last_login DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating admin_assistants table:', err);
            else console.log('Admin assistants table ready.');
        });

        // Assistant Activity Log
        db.run(`
            CREATE TABLE IF NOT EXISTS assistant_activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                assistant_wallet TEXT NOT NULL,
                activity TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating assistant_activities table:', err);
            else console.log('Assistant activities table ready.');
        });

        // Smart Money Strategic Investments
        db.run(`
            CREATE TABLE IF NOT EXISTS smart_money_investments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                wallet_address TEXT NOT NULL,
                bucket_id TEXT NOT NULL,
                bucket_name TEXT NOT NULL,
                invest_amount REAL NOT NULL,
                asset_currency TEXT DEFAULT 'USDT',
                tx_hash TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating smart_money_investments table:', err);
            else {
                console.log('Smart money investments table ready.');
                // Schema evolution
                ['bucket_json', 'network', 'status'].forEach(col => {
                    const def = col === 'status' ? 'TEXT DEFAULT "active"' : 'TEXT DEFAULT "[]"';
                    db.run(`ALTER TABLE smart_money_investments ADD COLUMN ${col} ${def}`, () => {});
                });
            }
        });

        // ── Listing Submissions ────────────────────────────────────────────
        db.run(`
            CREATE TABLE IF NOT EXISTS listing_submissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                contract_address TEXT NOT NULL,
                name TEXT NOT NULL,
                symbol TEXT NOT NULL,
                description TEXT DEFAULT '',
                logo_url TEXT DEFAULT '',
                whitepaper_url TEXT DEFAULT '',
                circulation_supply TEXT DEFAULT '',
                total_liquidity TEXT DEFAULT '',
                paired_token TEXT DEFAULT 'BNB',
                pancake_url TEXT DEFAULT '',
                email TEXT DEFAULT '',
                checks_json TEXT DEFAULT '{}',
                submitter_wallet TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                admin_note TEXT DEFAULT '',
                submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating listing_submissions table:', err);
            else console.log('Listing submissions table ready.');
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
