const { runVerificationCycle } = require('./services/tokenVerifier');
require('dotenv').config();

runVerificationCycle()
    .then(() => {
        console.log('Verification cycle finished');
        process.exit(0);
    })
    .catch(err => {
        console.error('Verification cycle failed:', err);
        process.exit(1);
    });
