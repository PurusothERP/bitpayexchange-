// ============================================================
//  antigraVITY ML ENGINE — server.js
//  Express API server — all ML endpoints
//  Run: node server.js
// ============================================================

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const {
  detectMimicToken,
  scoreTokenIntelligence,
  generateBranding,
  getTrendForecast,
  getSocialSentiment,
  runAIAgent,
  fullTokenAnalysis,
  getTokenDatabase
} = require('./mlEngine');

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ─── HEALTH CHECK ────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status:  'ok',
    engine:  'antigraVITY ML Engine v1.0',
    apis: {
      anthropic:  !!process.env.ANTHROPIC_API_KEY  ? 'connected' : 'missing — add to .env',
      coingecko:  !!process.env.COINGECKO_API_KEY  ? 'connected' : 'using free tier',
      twitter:    !!process.env.TWITTER_BEARER_TOKEN ? 'connected' : 'optional — not set'
    }
  });
});

// ─── ROUTE 1: MIMIC TOKEN DETECTION ─────────────────────
// POST /api/detect-mimic
// Body: { name: "SafeBitcoin", symbol: "SBTC" }
// Returns: risk level, alert message, similar tokens list
app.post('/api/detect-mimic', async (req, res) => {
  const { name, symbol } = req.body;
  if (!name || !symbol)
    return res.status(400).json({ error: 'name and symbol are required' });

  try {
    const result = await detectMimicToken(name, symbol);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── ROUTE 2: INTELLIGENCE SCORE ────────────────────────
// POST /api/score
// Body: { name: "MoonDoge", symbol: "MDOGE" }
// Returns: memorability, uniqueness, marketAppeal, riskLevel, overall, verdict
app.post('/api/score', async (req, res) => {
  const { name, symbol } = req.body;
  if (!name || !symbol)
    return res.status(400).json({ error: 'name and symbol are required' });

  try {
    const result = await scoreTokenIntelligence(name, symbol);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── ROUTE 3: AI BRANDING ENGINE ────────────────────────
// POST /api/branding
// Body: { name: "GravityDoge", symbol: "GRDG" }
// Returns: tagline, description, color palette, logo emoji, category
app.post('/api/branding', async (req, res) => {
  const { name, symbol } = req.body;
  if (!name || !symbol)
    return res.status(400).json({ error: 'name and symbol are required' });

  try {
    const result = await generateBranding(name, symbol);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── ROUTE 4: TOKEN TREND FORECASTING ───────────────────
// GET /api/trends
// No body needed
// Returns: trending coins, hot categories, top gainers, forecast
app.get('/api/trends', async (_req, res) => {
  try {
    const result = await getTrendForecast();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── ROUTE 5: SOCIAL SENTIMENT ──────────────────────────
// POST /api/sentiment
// Body: { name: "MoonRocket", symbol: "MOON" }
// Returns: Twitter sentiment, CoinGecko community data
app.post('/api/sentiment', async (req, res) => {
  const { name, symbol } = req.body;
  if (!name || !symbol)
    return res.status(400).json({ error: 'name and symbol are required' });

  try {
    const result = await getSocialSentiment(name, symbol);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── ROUTE 6: ONE-PROMPT AI AGENT ───────────────────────
// POST /api/agent
// Body: { prompt: "Create a meme token for dog lovers on Solana with a fun vibe" }
// Returns: complete token creation plan — name, symbol, chain, supply, features, etc.
app.post('/api/agent', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt)
    return res.status(400).json({ error: 'prompt is required' });

  try {
    const result = await runAIAgent(prompt);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── ROUTE 7: FULL ANALYSIS (all-in-one) ────────────────
// POST /api/analyze
// Body: { name: "GravityDoge", symbol: "GRDG" }
// Returns: mimic check + score + branding + trends + sentiment in one call
app.post('/api/analyze', async (req, res) => {
  const { name, symbol } = req.body;
  if (!name || !symbol)
    return res.status(400).json({ error: 'name and symbol are required' });

  try {
    const result = await fullTokenAnalysis(name, symbol);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── ROUTE 8: PRELOAD TOKEN DATABASE ────────────────────
// GET /api/preload
// Call this once on startup to warm the cache
app.get('/api/preload', async (_req, res) => {
  try {
    const tokens = await getTokenDatabase();
    res.json({ success: true, message: `${tokens.length} tokens loaded into cache` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── START SERVER ────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\n🚀 antigraVITY ML Engine running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`\n📡 Available endpoints:`);
  console.log(`   POST /api/detect-mimic  — mimic token detection`);
  console.log(`   POST /api/score         — intelligence scoring`);
  console.log(`   POST /api/branding      — AI branding engine`);
  console.log(`   GET  /api/trends        — token trend forecasting`);
  console.log(`   POST /api/sentiment     — social sentiment`);
  console.log(`   POST /api/agent         — one-prompt AI agent`);
  console.log(`   POST /api/analyze       — full analysis (all-in-one)`);
  console.log(`\n🔑 API Keys:`);
  console.log(`   Anthropic:  ${process.env.ANTHROPIC_API_KEY  ? '✅ connected' : '❌ missing'}`);
  console.log(`   CoinGecko:  ${process.env.COINGECKO_API_KEY  ? '✅ connected' : '⚠️  free tier'}`);
  console.log(`   Twitter:    ${process.env.TWITTER_BEARER_TOKEN ? '✅ connected' : '⚠️  optional'}`);

  // Warm the token cache on startup
  console.log('\n⏳ Pre-loading token database...');
  try {
    const tokens = await getTokenDatabase();
    console.log(`✅ ${tokens.length} tokens loaded.\n`);
  } catch {
    console.log('⚠️  Token database will load on first request.\n');
  }
});
