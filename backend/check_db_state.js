const db = require('./config/db');
db.query('SELECT COUNT(*) as count FROM tokens').then(r => console.log('Total tokens:', r.rows[0].count)).catch(e => console.error(e));
db.query('SELECT * FROM tokens LIMIT 5').then(r => console.log('Sample tokens:', r.rows)).catch(e => console.error(e));
