const db = require('./config/db');

async function check() {
    try {
        const tables = await db.query("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('Tables:', tables.rows.map(r => r.name));
        
        for (let table of tables.rows) {
            const schema = await db.query(`PRAGMA table_info(${table.name})`);
            console.log(`Schema for ${table.name}:`, schema.rows);
        }
    } catch (e) {
        console.error(e);
    }
}

check();
