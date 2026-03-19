const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.resolve(__dirname, '../database.sqlite');

const db = new sqlite3.Database(dbPath);

// Add missing columns if they don't exist, then seed the deployed token
const migrations = [
    `ALTER TABLE tokens ADD COLUMN description TEXT DEFAULT ''`,
    `ALTER TABLE tokens ADD COLUMN logo_url TEXT DEFAULT ''`,
    `ALTER TABLE tokens ADD COLUMN metadata_url TEXT DEFAULT ''`,
    `ALTER TABLE tokens ADD COLUMN price_bnb REAL DEFAULT 0`,
    `ALTER TABLE tokens ADD COLUMN liquidity_bnb TEXT DEFAULT '0'`,
    `ALTER TABLE tokens ADD COLUMN trading_enabled INTEGER DEFAULT 0`,
];

let done = 0;
for (const m of migrations) {
    db.run(m, (err) => {
        // SQLITE_ERROR means column already exists — ignore
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Migration error:', err.message);
        } else {
            console.log('Migration OK (or already applied):', m.split(' ')[3]);
        }
        done++;
        if (done === migrations.length) {
            // Now seed
            const sql = `
                INSERT INTO tokens (name, symbol, contract_address, creator_wallet, total_supply, tx_hash, logo_url, metadata_url, description)
                VALUES (?, ?, ?, ?, ?, ?, '', '', 'First token deployed via B20-LAB')
                ON CONFLICT(contract_address) DO UPDATE SET
                    name = excluded.name,
                    creator_wallet = excluded.creator_wallet,
                    total_supply = excluded.total_supply
            `;
            db.run(sql, [
                'B2LAB',
                'BLAB',
                '0xF2fE42B2E14d45Ab80533d12fe9239f64B5c81F9',
                '0x22AaEd330892d1eb782b54A87191Fb98c1533253',
                '1000000000000000000000000000',
                '0xda5b9394f2c75a192fc6f320253f080bf63ce4130ea0990fe0e78da14fde0e43'
            ], function(err) {
                if (err) console.error('Seed Error:', err.message);
                else console.log('✅ Token B2LAB/BLAB seeded successfully! ID:', this.lastID);
                db.close();
            });
        }
    });
}
