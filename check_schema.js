const db = require('./backend/config/db');

async function checkSchema() {
    try {
        const columns = await new Promise((resolve, reject) => {
            db.all("PRAGMA table_info(trades)", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        console.log('Trades table columns:', columns.map(c => c.name));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
