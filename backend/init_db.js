const db = require('./config/db');
console.log('Initializing Database...');
db.init();
setTimeout(() => {
    console.log('Initialization complete.');
    process.exit(0);
}, 2000);
