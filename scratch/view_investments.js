const db = require('../backend/config/db');
db.query('SELECT * FROM smart_money_investments').then(res => {
    console.log('Investments list:');
    res.rows.forEach(row => {
        console.log(`ID: ${row.id}, Bucket: ${row.bucket_name}, Amount: ${row.invest_amount}, JSON: ${row.bucket_json}`);
    });
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
