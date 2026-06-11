const db = require('./backend/config/db');
db.query('SELECT launch_type, is_delisted, COUNT(*) as count FROM tokens GROUP BY launch_type, is_delisted').then(res => {
    console.log('Token counts:', res.rows);
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
