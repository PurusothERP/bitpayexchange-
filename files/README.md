# antigraVITY ML Engine

Complete ML backend for the antigraVITY no-code token creation platform.

## Features

| Feature | Endpoint | Free? |
|---|---|---|
| Mimic token detection | POST /api/detect-mimic | ✅ Yes (CoinGecko free) |
| Intelligence scoring | POST /api/score | ✅ Yes (no API needed) |
| AI branding engine | POST /api/branding | Needs Anthropic key |
| Token trend forecast | GET /api/trends | ✅ Yes (CoinGecko free) |
| Social sentiment | POST /api/sentiment | Optional Twitter key |
| One-prompt AI agent | POST /api/agent | Needs Anthropic key |
| Full analysis | POST /api/analyze | All of the above |

---

## Setup (5 minutes)

### Step 1 — Install
```bash
npm install
```

### Step 2 — Configure API keys
```bash
cp .env.example .env
```
Edit `.env` and add your keys:
- **ANTHROPIC_API_KEY** — get free at https://console.anthropic.com
- **COINGECKO_API_KEY** — get free at https://coingecko.com/en/api (optional, free tier works without it)
- **TWITTER_BEARER_TOKEN** — optional, for social sentiment

### Step 3 — Run
```bash
node server.js
```

Server starts at http://localhost:3001

---

## API Examples

### Check if a token is a mimic
```bash
curl -X POST http://localhost:3001/api/detect-mimic \
  -H "Content-Type: application/json" \
  -d '{"name":"SafeBitcoin","symbol":"SBTC"}'
```

Response:
```json
{
  "success": true,
  "data": {
    "riskLevel": "HIGH",
    "alertMessage": "🔴 HIGH RISK: SafeBitcoin closely mimics an existing well-known token.",
    "canCreate": true,
    "similarTokens": [
      { "name": "bitcoin", "symbol": "btc", "rank": 1, "nameSimilarity": 87, "severity": "HIGH" }
    ]
  }
}
```

### Get intelligence score
```bash
curl -X POST http://localhost:3001/api/score \
  -H "Content-Type: application/json" \
  -d '{"name":"GravityDoge","symbol":"GRDG"}'
```

### One-prompt AI agent
```bash
curl -X POST http://localhost:3001/api/agent \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Create a meme token for dog lovers on Solana with a fun vibe"}'
```

### Full analysis (all features at once)
```bash
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"name":"MoonRocket","symbol":"MOON"}'
```

---

## Integrate into antigraVITY

### Step 1 — Copy the SDK file
Copy `antigravity-ml-sdk.js` into your antigraVITY frontend source folder.

### Step 2 — Import and use
```javascript
import { detectMimic, getIntelligenceScore, generateBranding, runAgent } from './antigravity-ml-sdk';

// On form submit — check for mimic BEFORE deploying
const mimic = await detectMimic(tokenName, tokenSymbol);
if (mimic.alertMessage) {
  showWarning(mimic.alertMessage); // Show warning but still allow creation
}

// Show intelligence score to user
const score = await getIntelligenceScore(tokenName, tokenSymbol);

// Generate AI branding
const brand = await generateBranding(tokenName, tokenSymbol);

// One-prompt agent — user types one sentence
const plan = await runAgent("Create an AI-powered DeFi token on Ethereum");
if (plan.success) {
  autoFillTokenForm(plan.data); // Auto-fill your form fields
}
```

### Step 3 — Change the ML Engine URL
In `antigravity-ml-sdk.js`, line 7:
```javascript
const ML_ENGINE_URL = 'https://your-deployed-ml-engine.com'; // your production URL
```

---

## Deploy to Production

### Option A — Railway (recommended, free tier)
1. Push this folder to a GitHub repo
2. Go to railway.app → New Project → Deploy from GitHub
3. Add environment variables in Railway dashboard
4. Done — Railway gives you a URL

### Option B — Render (free tier)
1. Push to GitHub
2. Go to render.com → New Web Service
3. Connect repo, set start command: `node server.js`
4. Add environment variables
5. Done

### Option C — Your own server
```bash
npm install -g pm2
pm2 start server.js --name antigravity-ml
pm2 save
```

---

## File Structure
```
antigravity-ml/
├── server.js              ← Express API server (all routes)
├── mlEngine.js            ← All ML logic (mimic detect, scoring, AI, trends)
├── antigravity-ml-sdk.js  ← Drop this in your antigraVITY frontend
├── package.json
├── .env.example           ← Copy to .env and add your keys
└── README.md
```
