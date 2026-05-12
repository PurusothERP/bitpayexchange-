const db = require('./backend/config/db');

async function checkSchema() {
    try {
        const result = await db.query("PRAGMA table_info(yield_investments)");
        console.log('Yield Investments table columns:', result.rows.map(c => c.name));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
