const express = require('express');
const router = express.Router();
const mlEngine = require('../services/mlEngine');
const db = require('../config/db');

/**
 * @route   POST /api/ml/analyze
 * @desc    Full analysis of a token name and symbol (mimic, scoring, branding, trends, sentiment)
 */
router.post('/analyze', async (req, res) => {
    const { name, symbol } = req.body;
    if (!name || !symbol) {
        return res.status(400).json({ error: 'Name and symbol are required' });
    }
    try {
        const result = await mlEngine.fullTokenAnalysis(name, symbol);
        res.json(result);
    } catch (error) {
        console.error('[ML Route] Analyze error:', error.message);
        res.status(500).json({ error: 'Full analysis failed', details: error.message });
    }
});

/**
 * @route   POST /api/ml/mimic-check
 * @desc    Check if a token name/symbol is a mimic or typosquat of a top token
 */
router.post('/mimic-check', async (req, res) => {
    let { name, symbol } = req.body;
    
    // Safety: prevent 400s by providing defaults if user is still typing
    name = (name || '').toString().trim();
    symbol = (symbol || '').toString().trim();
    
    if (name.length < 2 && symbol.length < 1) {
        return res.json({ riskLevel: 'SAFE', alertMessage: 'Enter more details for audit.', similarTokens: [] });
    }

    try {
        const result = await mlEngine.detectMimicToken(name, symbol);
        res.json(result);

    } catch (error) {
        console.error('[ML Route] Mimic check error:', error.message);
        res.status(500).json({ error: 'Mimic check failed', details: error.message });
    }
});

/**
 * @route   POST /api/ml/score
 * @desc    Score token intelligence (memorability, uniqueness, appeal, risk)
 */
router.post('/score', async (req, res) => {
    const { name, symbol } = req.body;
    if (!name || !symbol) {
        return res.status(400).json({ error: 'Name and symbol are required' });
    }
    try {
        const result = await mlEngine.scoreTokenIntelligence(name, symbol);
        res.json(result);
    } catch (error) {
        console.error('[ML Route] Scoring error:', error.message);
        res.status(500).json({ error: 'Scoring failed', details: error.message });
    }
});

/**
 * @route   POST /api/ml/branding
 * @desc    Generate tagline, description, palette, and logo suggestions via AI
 */
router.post('/branding', async (req, res) => {
    const { name, symbol } = req.body;
    if (!name || !symbol) {
        return res.status(400).json({ error: 'Name and symbol are required' });
    }
    try {
        const result = await mlEngine.generateBranding(name, symbol);
        res.json(result);
    } catch (error) {
        console.error('[ML Route] Branding error:', error.message);
        res.status(500).json({ error: 'Branding generation failed', details: error.message });
    }
});

/**
 * @route   GET /api/ml/trends
 * @desc    Get live trending coins and category forecasts
 */
router.get('/trends', async (req, res) => {
    try {
        const result = await mlEngine.getTrendForecast();
        res.json(result);
    } catch (error) {
        console.error('[ML Route] Trend forecast error:', error.message);
        res.status(500).json({ error: 'Trend forecast failed', details: error.message });
    }
});

/**
 * @route   POST /api/ml/sentiment
 * @desc    Analyze social sentiment for a token (CoinGecko + optional Twitter)
 */
router.post('/sentiment', async (req, res) => {
    const { name, symbol } = req.body;
    if (!name || !symbol) {
        return res.status(400).json({ error: 'Name and symbol are required' });
    }
    try {
        const result = await mlEngine.getSocialSentiment(name, symbol);
        res.json(result);
    } catch (error) {
        console.error('[ML Route] Sentiment error:', error.message);
        res.status(500).json({ error: 'Sentiment analysis failed', details: error.message });
    }
});

/**
 * @route   POST /api/ml/ai-agent
 * @desc    One-prompt token creation agent
 */
router.post('/ai-agent', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }
    try {
        const result = await mlEngine.runAIAgent(prompt);
        res.json(result);
    } catch (error) {
        console.error('[ML Route] AI agent error:', error.message);
        res.status(500).json({ error: 'AI agent failed', details: error.message });
    }
});

/**
 * @route   GET /api/ml/market
 * @desc    Get real-time market data for top meme coins
 */
router.get('/market', async (req, res) => {
    try {
        const result = await mlEngine.getMemeMarketData();
        res.json(result);
    } catch (error) {
        console.error('[ML Route] Market error:', error.message);
        res.status(500).json({ error: 'Market data failed' });
    }
});

/**
 * @route   POST /api/ml/whitepaper/generate
 * @desc    Generate a whitepaper draft
 */
router.post('/whitepaper/generate', async (req, res) => {
    try {
        const result = await mlEngine.generateWhitepaper(req.body);
        const temp_id = `wp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        
        if (result.success) {
            // Save draft to DB
            await db.query(
                `INSERT INTO whitepapers (temp_id, token_name, token_symbol, content) VALUES (?, ?, ?, ?)`,
                [temp_id, req.body.name, req.body.symbol, result.content]
            );
            res.json({ success: true, temp_id, content: result.content });
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('[ML Route] Whitepaper error:', error.message);
        res.status(500).json({ error: 'Whitepaper generation failed' });
    }
});

/**
 * @route   GET /api/ml/whitepaper/:id
 * @desc    Get whitepaper by temp_id or contract_address
 */
router.get('/whitepaper/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            `SELECT * FROM whitepapers WHERE temp_id = ? OR token_address = ?`,
            [id, id]
        );
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Whitepaper not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Search failed' });
    }
});

/**
 * @route   POST /api/ml/whitepaper/paid
 * @desc    Mark whitepaper as paid and link to contract
 */
router.post('/whitepaper/paid', async (req, res) => {
    try {
        const { temp_id, contract_address, tx_hash, amount_bnb } = req.body;
        await db.query(
            `UPDATE whitepapers SET is_paid = 1, token_address = ?, tx_hash = ? WHERE temp_id = ?`,
            [contract_address, tx_hash, temp_id]
        );
        
        // Log to treasury_transfers
        await db.query(
            `INSERT INTO treasury_transfers (amount_bnb, source_contract, destination_address, tx_hash, transfer_type) 
             VALUES (?, ?, ?, ?, 'whitepaper_fee')`,
            [amount_bnb || 0, contract_address || 'ADMIN', '0x6451ee4def4a8b8fbc2c64301a79e267de378935', tx_hash, 'whitepaper_fee']
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Payment logging failed' });
    }
});

/**
 * @route   GET /api/ml/whitepaper-stats
 * @desc    Admin stats for whitepaper revenue
 */
router.get('/whitepaper-stats', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT COUNT(*) as total_count, SUM(is_paid) as paid_count FROM whitepapers`
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Stats failed' });
    }
});

/**
 * @route   POST /api/ml/neura-chat
 * @desc    Neura AI intelligent assistant chat
 */
router.post('/neura-chat', async (req, res) => {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages array is required' });
    }
    try {
        const result = await mlEngine.runNeuraChat(messages);
        res.json(result);
    } catch (error) {
        console.error('[ML Route] Neura chat error:', error.message);
        res.status(500).json({ error: 'Neura chat failed' });
    }
});

module.exports = router;
