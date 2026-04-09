const db = require('./backend/config/db');
db.query('SELECT name, symbol, launch_type, is_delisted FROM tokens LIMIT 5').then(res => {
    console.log('Recent tokens:', res.rows);
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
