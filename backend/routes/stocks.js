const express = require('express');
const router = express.Router();
const stockService = require('../services/stockService');

/**
 * GET /api/stocks/price?ticker=AAPL
 * Fetches real-time institutional stock price
 */
router.get('/price', async (req, res) => {
    const { ticker } = req.query;
    if (!ticker) {
        return res.status(400).json({ 
            success: false, 
            error: 'Stock ticker symbol is required (e.g. AAPL, TSLA)' 
        });
    }

    try {
        const data = await stockService.getStockPrice(ticker);
        res.json({ 
            success: true, 
            data,
            source: 'Alpha Vantage Institutional Feed'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * GET /api/stocks/history?ticker=AAPL
 * Fetches historical daily data for terminal charting
 */
router.get('/history', async (req, res) => {
    const { ticker } = req.query;
    if (!ticker) {
        return res.status(400).json({ 
            success: false, 
            error: 'Stock ticker symbol is required' 
        });
    }

    try {
        const data = await stockService.getStockHistory(ticker);
        res.json({ 
            success: true, 
            data,
            points: data.length
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * GET /api/stocks/fundamentals?ticker=AAPL
 */
router.get('/fundamentals', async (req, res) => {
    const { ticker } = req.query;
    if (!ticker) return res.status(400).json({ success: false, error: 'Ticker required' });

    try {
        const data = await stockService.getStockFundamentals(ticker);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
