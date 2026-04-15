const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org');

router.get('/stats', async (req, res) => {
    try {
        const [blockNumber, feeData] = await Promise.all([
            provider.getBlockNumber(),
            provider.getFeeData()
        ]);

        res.json({
            blockHeight: blockNumber,
            gasPrice: ethers.formatUnits(feeData.gasPrice, 'gwei'),
            network: 'BNB Smart Chain',
            status: 'Synced',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        // Fallback for offline/rate-limit
        res.json({
            blockHeight: '92,271,000+',
            gasPrice: '1.0',
            network: 'BSC',
            status: 'Connecting...',
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
