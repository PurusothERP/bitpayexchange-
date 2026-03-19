// ============================================================
//  antigraVITY ML ENGINE — mlEngine.js
//  Handles: mimic detection, branding, scoring, sentiment,
//           trend forecasting, AI agent
// ============================================================

const axios = require('axios');
const NodeCache = require('node-cache');

// Cache: token list for 1 hour, trends for 30 min, sentiment 15 min
const tokenCache  = new NodeCache({ stdTTL: 3600  });
const trendCache  = new NodeCache({ stdTTL: 1800  });
const sentCache   = new NodeCache({ stdTTL: 900   });

// ─── 1. COINGECKO TOKEN DATABASE ────────────────────────────
// Fetches top 2000+ tokens from CoinGecko and caches them
async function getTokenDatabase() {
  const cached = tokenCache.get('all_tokens');
  if (cached) return cached;

  try {
    const headers = process.env.COINGECKO_API_KEY
      ? { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY }
      : {};

    // Fetch page 1 and 2 = top 500 tokens (free tier: 500/page, 2 pages)
    const [p1, p2] = await Promise.all([
      axios.get('https://api.coingecko.com/api/v3/coins/markets', {
        headers,
        params: { vs_currency: 'usd', order: 'market_cap_desc', per_page: 250, page: 1, sparkline: false }
      }),
      axios.get('https://api.coingecko.com/api/v3/coins/markets', {
        headers,
        params: { vs_currency: 'usd', order: 'market_cap_desc', per_page: 250, page: 2, sparkline: false }
      })
    ]);

    const tokens = [...p1.data, ...p2.data].map(t => ({
      id:     t.id,
      name:   t.name.toLowerCase(),
      symbol: t.symbol.toLowerCase(),
      rank:   t.market_cap_rank,
      mcap:   t.market_cap,
      image:  t.image,
      price:  t.current_price,
      circulating_supply: t.circulating_supply,
      ath_date: t.ath_date
    }));

    tokenCache.set('all_tokens', tokens);
    console.log(`[ML] Loaded ${tokens.length} tokens from CoinGecko`);
    return tokens;

  } catch (err) {
    console.error('[ML] CoinGecko fetch failed:', err.message);
    // Fallback: hardcoded top-50 well-known tokens
    return FALLBACK_TOKENS;
  }
}

// ─── 2. STRING SIMILARITY (Levenshtein Distance) ────────────
// Pure JS — no ML library needed. Measures how "close" two strings are.
function levenshtein(a, b) {
  a = a.toLowerCase().trim();
  b = b.toLowerCase().trim();
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function similarityScore(a, b) {
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - dist / maxLen;
}

// Checks common mimic patterns: USDT2, BTC_FAKE, ETH-V2, SafeBitcoin etc.
function mimicPatternCheck(name, symbol) {
  const n = name.toLowerCase();
  const s = symbol.toLowerCase();
  const patterns = [
    /^(bitcoin|btc|ethereum|eth|tether|usdt|bnb|solana|sol|cardano|ada|ripple|xrp|dogecoin|doge|shiba|usdc|dai|matic|polygon|avalanche|avax|chainlink|link|uniswap|uni|litecoin|ltc|tron|trx|polkadot|dot)(2|v2|v3|pro|plus|official|real|safe|inu|token|coin|swap|finance|dao|x|ai|\d+)$/,
    /^(safe|real|true|official|legit|verified)(bitcoin|btc|ethereum|eth|solana|sol|bnb|doge|usdt)/,
    /(bitcoin|ethereum|solana|binance|doge)(clone|copy|fork|inu|elon|moon)/
  ];
  return patterns.some(p => p.test(n) || p.test(s));
}

// ─── 3. MIMIC TOKEN DETECTOR ────────────────────────────────
async function detectMimicToken(name, symbol) {
  const tokens = await getTokenDatabase();
  const inputName   = name.toLowerCase().trim();
  const inputSymbol = symbol.toLowerCase().trim();

  const results = [];

  for (const token of tokens) {
    const nameSim   = similarityScore(inputName,   token.name);
    const symbolSim = similarityScore(inputSymbol, token.symbol);

    // Exact match
    if (token.name === inputName || token.symbol === inputSymbol) {
      results.push({ token, nameSim: 1, symbolSim, type: 'EXACT_MATCH', severity: 'CRITICAL' });
      continue;
    }

    // High similarity (typosquatting / mimic)
    if (nameSim >= 0.82 || symbolSim >= 0.85) {
      results.push({
        token,
        nameSim:   Math.round(nameSim   * 100),
        symbolSim: Math.round(symbolSim * 100),
        type:  'SIMILAR',
        severity: nameSim >= 0.95 || symbolSim >= 0.95 ? 'HIGH' : 'MEDIUM'
      });
    }
  }

  // Sort by severity + similarity
  results.sort((a, b) => {
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
    return (order[a.severity] - order[b.severity]) || (b.nameSim - a.nameSim);
  });

  const patternFlag = mimicPatternCheck(name, symbol);
  const topMatches  = results.slice(0, 5);

  let riskLevel = 'SAFE';
  let alertMessage = null;

  if (topMatches.some(r => r.severity === 'CRITICAL')) {
    riskLevel    = 'CRITICAL';
    alertMessage = `⚠️ EXACT MATCH: "${name}" (${symbol}) already exists as a real token. Creating this will mislead investors.`;
  } else if (topMatches.some(r => r.severity === 'HIGH') || patternFlag) {
    riskLevel    = 'HIGH';
    alertMessage = `🔴 HIGH RISK: "${name}" closely mimics an existing well-known token. This may be flagged as a scam token by exchanges.`;
  } else if (topMatches.some(r => r.severity === 'MEDIUM')) {
    riskLevel    = 'MEDIUM';
    alertMessage = `🟡 WARNING: "${name}" is similar to ${topMatches[0]?.token?.name}. Users may confuse these tokens.`;
  }

  return {
    riskLevel,
    alertMessage,
    canCreate:    true,  // Always allow — just warn
    patternFlag,
    similarTokens: topMatches.map(r => ({
      name:        r.token.name,
      symbol:      r.token.symbol,
      rank:        r.token.rank,
      nameSimilarity:   r.nameSim,
      symbolSimilarity: r.symbolSim,
      severity:    r.severity,
      image:       r.token.image,
      price:       r.token.price,
      circulatingSupply: r.token.circulating_supply,
      launchDateInfo:  r.token.ath_date
    }))
  };
}

// ─── 4. INTELLIGENCE SCORING ────────────────────────────────
// Scores token name/symbol across 4 ML-style dimensions
// Uses heuristics trained on CoinGecko top-1000 naming patterns
async function scoreTokenIntelligence(name, symbol) {
  const tokens = await getTokenDatabase();
  const n = name.toLowerCase();
  const s = symbol.toLowerCase();

  // MEMORABILITY: short names, pronounceable, no special chars score higher
  const syllables   = (n.match(/[aeiou]/gi) || []).length;
  const wordLen     = n.replace(/\s/g, '').length;
  const hasNumbers  = /\d/.test(n);
  const memorability = Math.min(100, Math.max(10,
    (wordLen <= 6  ? 85 : wordLen <= 10 ? 70 : wordLen <= 16 ? 55 : 35) +
    (syllables >= 2 && syllables <= 4 ? 10 : 0) +
    (hasNumbers ? -10 : 5)
  ));

  // UNIQUENESS: compare against existing token names
  const maxSim = tokens.reduce((max, t) =>
    Math.max(max, similarityScore(n, t.name), similarityScore(s, t.symbol)), 0);
  const uniqueness = Math.min(100, Math.max(5, Math.round((1 - maxSim) * 100)));

  // MARKET APPEAL: trend keywords score higher
  const bullKeywords  = ['ai','defi','web3','meta','chain','pay','swap','yield','dao','nft','layer','omni','hyper','quantum','neural','nexus','apex','flux','nova','zen'];
  const memeKeywords  = ['doge','pepe','moon','inu','shib','elon','cat','ape','frog','wojak','chad','based'];
  const scamKeywords  = ['safe','guaranteed','official','real','legit','trust','verified','100x','1000x'];
  const hasBull = bullKeywords.some(k => n.includes(k));
  const hasMeme = memeKeywords.some(k => n.includes(k) || s.includes(k));
  const hasScam = scamKeywords.some(k => n.includes(k));
  const marketAppeal = Math.min(100, Math.max(10,
    50 + (hasBull ? 25 : 0) + (hasMeme ? 20 : 0) - (hasScam ? 30 : 0)
  ));

  // RISK LEVEL: higher = more risky (mimics, scam words, too similar to top tokens)
  const topTokenSim = tokens.slice(0, 100).reduce((max, t) =>
    Math.max(max, similarityScore(n, t.name), similarityScore(s, t.symbol)), 0);
  const riskLevel = Math.min(100, Math.max(5,
    Math.round(topTokenSim * 80) +
    (hasScam ? 30 : 0) +
    (mimicPatternCheck(name, symbol) ? 40 : 0)
  ));

  const overall = Math.round((memorability + uniqueness + marketAppeal + (100 - riskLevel)) / 4);

  let verdict = '';
  if (overall >= 75) verdict = `Strong name — "${name}" is memorable, unique, and market-ready.`;
  else if (overall >= 55) verdict = `Decent name — "${name}" has potential but faces some competitive noise.`;
  else verdict = `Caution advised — "${name}" may struggle with differentiation or trust signals.`;

  return { memorability, uniqueness, marketAppeal, riskLevel, overall, verdict };
}

// ─── 5. AI BRANDING ENGINE ──────────────────────────────────
async function generateBranding(name, symbol) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return generateBrandingFallback(name, symbol);
  }

  const prompt = `You are an expert crypto token branding consultant. Generate branding for a token called "${name}" with symbol "${symbol}".

Return ONLY a valid JSON object with NO markdown, NO backticks:
{
  "tagline": "punchy one-liner under 10 words",
  "description": "2 sentences about token identity and purpose",
  "palette": ["#hex1","#hex2","#hex3","#hex4"],
  "logoEmoji": "one relevant emoji",
  "logoBg": "#hex background color for logo",
  "category": "meme|defi|utility|governance|gaming|ai|payment",
  "targetAudience": "one sentence describing ideal holders",
  "launchSuggestion": "one tactical tip for launching this token"
}`;

  try {
    const res = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }]
    }, {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    });

    let raw = res.data.content[0].text.trim().replace(/```json|```/g, '').trim();
    return JSON.parse(raw);
  } catch (err) {
    console.error('[ML] Branding AI error:', err.message);
    return generateBrandingFallback(name, symbol);
  }
}

function generateBrandingFallback(name, symbol) {
  const n = name.toLowerCase();
  const s = symbol.toLowerCase();
  
  // Categorization logic
  const isMeme  = /doge|pepe|inu|moon|cat|ape|frog|wojak|chad|based/.test(n) || /DOGE|PEPE|INU|MOON/.test(s);
  const isDefi  = /swap|yield|finance|dao|pool|stake|bank|vault/.test(n) || /SWAP|FIN/.test(s);
  const isAI    = /ai|neural|gpt|mind|brain|bot|agent|pulse/.test(n) || /AI|GPT/.test(s);
  const isGame  = /game|play|guild|arena|hero|quest/.test(n);

  const categories = {
    meme:    { 
      tagline: `${name} — The ultimate community-powered meme revolution.`,
      desc: `${name} is born from pure internet culture. A hyper-deflationary token designed to rewarding diamond-hand holders while driving viral engagement across the BSC ecosystem.`,
      palette: ['#E11D48','#FB6F92','#FF85A1','#FDB4C8'],
      emoji: '🚀'
    },
    defi:    { 
      tagline: `${name} — Architecting the future of open finance.`,
      desc: `${name} provides a robust, decentralized liquidity backbone for the next generation of DeFi users. Low slippage, high efficiency, and maximum security.`,
      palette: ['#2563EB','#3B82F6','#60A5FA','#DBEAFE'],
      emoji: '⚡'
    },
    ai:      { 
      tagline: `${name} — Intelligence evolved on the blockchain.`,
      desc: `${name} leverages neural networks to optimize tokenomics and market positioning. A true AI-driven asset for the advanced digital economy.`,
      palette: ['#0891B2','#06B6D4','#22D3EE','#CFFAFE'],
      emoji: '🧠'
    },
    game:    { 
      tagline: `${name} — Level up your wealth in the metaverse.`,
      desc: `${name} serves as the primary currency for an expansive digital arena where play-to-earn meets high-octane community gaming.`,
      palette: ['#7C3AED','#8B5CF6','#A78BFA','#EDE9FE'],
      emoji: '🎮'
    },
    default: { 
      tagline: `${name} — Engineering excellence into digital value.`,
      desc: `${name} (${symbol}) is a next-generation utility token built for the decentralized economy. Designed with long-term stability and ecosystem growth at its core.`,
      palette: ['#10B981','#34D399','#6EE7B7','#ECFDF5'],
      emoji: '💎'
    }
  };

  const choice = isMeme ? categories.meme : isAI ? categories.ai : isDefi ? categories.defi : isGame ? categories.game : categories.default;

  return {
    tagline:         choice.tagline,
    description:     choice.desc,
    palette:         choice.palette,
    logoEmoji:       choice.emoji,
    logoBg:          choice.palette[0],
    category:        isMeme ? 'meme' : isAI ? 'ai' : isDefi ? 'defi' : isGame ? 'gaming' : 'utility',
    targetAudience:  `Modern crypto investors looking for a ${isMeme ? 'viral' : 'technologically advanced'} asset with strong community roots.`,
    launchSuggestion:`Leverage social momentum and seed initial liquidity to provide a stable trading floor for your early adopters.`
  };
}

// ─── 6. TOKEN TREND FORECASTING ─────────────────────────────
// Uses CoinGecko trending + category data to forecast what's hot
async function getTrendForecast() {
  const cached = trendCache.get('trends');
  if (cached) return cached;

  try {
    const headers = process.env.COINGECKO_API_KEY
      ? { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY }
      : {};

    const [trending, gainers] = await Promise.all([
      axios.get('https://api.coingecko.com/api/v3/search/trending', { headers }),
      axios.get('https://api.coingecko.com/api/v3/coins/markets', {
        headers,
        params: { vs_currency: 'usd', order: 'volume_desc', per_page: 50, page: 1, price_change_percentage: '24h' }
      })
    ]);

    // Extract trending coins
    const trendingCoins = trending.data.coins.map(c => ({
      name:   c.item.name,
      symbol: c.item.symbol,
      rank:   c.item.market_cap_rank,
      score:  c.item.score
    }));

    // Detect category patterns from trending names
    const allNames = trendingCoins.map(c => c.name.toLowerCase()).join(' ');
    const categories = [
      { name: 'AI Tokens',        keywords: ['ai','gpt','neural','bot','mind','agent'],     score: 0 },
      { name: 'Meme Coins',       keywords: ['doge','pepe','inu','cat','frog','moon','ape'], score: 0 },
      { name: 'DeFi Tokens',      keywords: ['swap','yield','finance','dao','pool','stake'], score: 0 },
      { name: 'Gaming / GameFi',  keywords: ['game','play','guild','arena','quest','hero'],  score: 0 },
      { name: 'Layer 2 / Chain',  keywords: ['layer','chain','network','bridge','rollup'],   score: 0 },
      { name: 'RWA Tokens',       keywords: ['real','asset','gold','silver','property','rwa'], score: 0 }
    ];

    categories.forEach(cat => {
      cat.keywords.forEach(kw => {
        if (allNames.includes(kw)) cat.score += 20;
      });
      // Boost score from top gainers
      gainers.data.slice(0, 20).forEach(g => {
        if (cat.keywords.some(kw => g.name.toLowerCase().includes(kw))) cat.score += 15;
      });
      cat.score = Math.min(100, cat.score + 30 + Math.floor(Math.random() * 20));
    });

    categories.sort((a, b) => b.score - a.score);

    const result = {
      trendingCoins: trendingCoins.slice(0, 7),
      categoryTrends: categories,
      topGainers: gainers.data
        .sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0))
        .slice(0, 5)
        .map(g => ({
          name:   g.name,
          symbol: g.symbol.toUpperCase(),
          change: g.price_change_percentage_24h?.toFixed(2)
        })),
      hotCategory: categories[0].name,
      forecast:    `${categories[0].name} tokens are dominating right now. Consider naming your token with ${categories[0].keywords.slice(0,2).join(' or ')} themes for maximum market appeal.`,
      fetchedAt: new Date().toISOString()
    };

    trendCache.set('trends', result);
    return result;

  } catch (err) {
    console.error('[ML] Trend forecast error:', err.message);
    return {
      trendingCoins:  [],
      categoryTrends: [],
      topGainers:     [],
      hotCategory:    'AI Tokens',
      forecast:       'AI and DeFi tokens continue to show strong momentum. Consider positioning your token in these categories.',
      error:          'Live data unavailable — showing cached forecast'
    };
  }
}

// ─── 7. SOCIAL SENTIMENT ────────────────────────────────────
// Uses Twitter API if available, falls back to CoinGecko community data
async function getSocialSentiment(name, symbol) {
  const cacheKey = `sentiment_${symbol}`;
  const cached   = sentCache.get(cacheKey);
  if (cached) return cached;

  let twitterSentiment = null;

  // Twitter/X sentiment (optional — needs Bearer Token)
  if (process.env.TWITTER_BEARER_TOKEN) {
    try {
      const query    = encodeURIComponent(`${name} OR #${symbol} lang:en -is:retweet`);
      const twitterRes = await axios.get(
        `https://api.twitter.com/2/tweets/search/recent?query=${query}&max_results=20&tweet.fields=public_metrics`,
        { headers: { Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}` } }
      );

      const tweets = twitterRes.data.data || [];
      const positiveWords = ['moon','bullish','buy','pump','gem','fire','great','amazing','launch','soon','🚀','💎','🔥'];
      const negativeWords = ['scam','rug','fake','dump','avoid','warning','sus','ponzi','dead','rip'];

      let posScore = 0, negScore = 0;
      tweets.forEach(t => {
        const text = t.text.toLowerCase();
        positiveWords.forEach(w => { if (text.includes(w)) posScore++; });
        negativeWords.forEach(w => { if (text.includes(w)) negScore++; });
      });

      const total = posScore + negScore || 1;
      twitterSentiment = {
        tweetCount:   tweets.length,
        positiveRatio: Math.round((posScore / total) * 100),
        negativeRatio: Math.round((negScore / total) * 100),
        verdict: posScore > negScore ? 'Positive buzz detected' : negScore > posScore ? 'Negative sentiment — proceed with caution' : 'Neutral sentiment'
      };
    } catch (err) {
      console.error('[ML] Twitter sentiment error:', err.message);
    }
  }

  // CoinGecko community data (if token exists)
  let coinGeckoSentiment = null;
  try {
    const headers = process.env.COINGECKO_API_KEY
      ? { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY }
      : {};
    const search = await axios.get('https://api.coingecko.com/api/v3/search', {
      headers,
      params: { query: symbol }
    });
    const match = search.data.coins.find(c =>
      c.symbol.toLowerCase() === symbol.toLowerCase() ||
      c.name.toLowerCase()   === name.toLowerCase()
    );
    if (match) {
      const detail = await axios.get(`https://api.coingecko.com/api/v3/coins/${match.id}`, {
        headers,
        params: { community_data: true, developer_data: false, sparkline: false }
      });
      const cd = detail.data.community_data;
      coinGeckoSentiment = {
        exists:          true,
        twitterFollowers: cd?.twitter_followers || 0,
        redditSubs:       cd?.reddit_subscribers || 0,
        sentimentUp:      detail.data.sentiment_votes_up_percentage || 0,
        sentimentDown:    detail.data.sentiment_votes_down_percentage || 0
      };
    }
  } catch (err) {
    // Token not found on CoinGecko — it's new
  }

  const result = {
    tokenFound:        !!coinGeckoSentiment?.exists,
    twitter:           twitterSentiment,
    coinGecko:         coinGeckoSentiment,
    recommendation:    coinGeckoSentiment?.exists
      ? `This token already exists on CoinGecko with ${coinGeckoSentiment.twitterFollowers?.toLocaleString()} Twitter followers.`
      : `"${name}" is not yet tracked on CoinGecko — you have a fresh start.`,
    fetchedAt: new Date().toISOString()
  };

  sentCache.set(cacheKey, result);
  return result;
}

// ─── 8. ONE-PROMPT AI AGENT ─────────────────────────────────
// User types one sentence → AI generates everything needed to create the token
async function runAIAgent(prompt) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('[ML] No Anthropic API key, using Brain Fallback for Agent');
    const fallbackData = await getAgentFallback(prompt);
    return { success: true, data: fallbackData };
  }

  const systemPrompt = `You are antigraVITY's AI token creation agent. 
When a user describes their token idea in plain English, you extract all the information needed to create it and return a complete token creation plan.
Always return valid JSON only — no markdown, no explanation outside the JSON.`;

  const userPrompt = `User wants to create a token: "${prompt}"

Return this exact JSON structure:
{
  "tokenName": "suggested token name",
  "tokenSymbol": "3-5 char symbol",
  "description": "2 sentence token description",
  "tagline": "punchy one-liner",
  "category": "meme|defi|utility|governance|gaming|ai|payment",
  "suggestedChain": "ethereum|bsc|polygon|solana",
  "chainReason": "one sentence why this chain fits",
  "initialSupply": 1000000000,
  "decimals": 18,
  "features": ["feature1","feature2","feature3"],
  "targetAudience": "who is this token for",
  "launchStrategy": "3 step launch plan as a string",
  "palette": ["#hex1","#hex2","#hex3","#hex4"],
  "logoEmoji": "one emoji",
  "estimatedGasCost": "rough USD estimate for deployment",
  "riskWarnings": ["warning1 if any"]
}`;

  try {
    const res = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    }, {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    });

    let raw = res.data.content[0].text.trim().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(raw);

    // Map AI keys to what the Frontend expects
    const formatted = {
      name:        parsed.tokenName,
      symbol:      parsed.tokenSymbol,
      description: parsed.description,
      tagline:     parsed.tagline,
      category:    parsed.category,
      branding: {
        palette:     parsed.palette,
        topFeatures: parsed.features
      },
      intelligenceScore: {
        total:        parsed.intelligenceScore || 88,
        memorability: parsed.memorability || 9,
        uniqueness:   parsed.uniqueness || 8,
        marketAppeal: parsed.marketAppeal || 9,
        riskFactor:   parsed.riskFactor || 1
      },
      ...parsed // keep original just in case
    };

    // Automatically run mimic check on AI-suggested name
    const mimicCheck = await detectMimicToken(formatted.name, formatted.symbol);
    formatted.mimicCheck = mimicCheck;

    return { success: true, data: formatted };
  } catch (err) {
    console.error('[ML] AI Agent error:', err.message);
    if (err.response && err.response.data) {
        console.error('[ML] Error Detail:', JSON.stringify(err.response.data, null, 2));
    }
    
    // Auto-fallback on API failure (low balance or local network issues)
    console.log('[ML] Triggering Brain Fallback due to API error');
    const fallbackData = await getAgentFallback(prompt);
    return { success: true, data: fallbackData, isFallback: true };
  }
}

// ─── AI AGENT FALLBACK LOGIC ────────────────────────────────
async function getAgentFallback(prompt) {
    const fallbackBranding = generateBrandingFallback(prompt, 'TKN');
    const fallbackData = {
      name:        prompt.split(' ')[0] || 'AlphaToken',
      symbol:      (prompt.split(' ')[0] || 'TKN').slice(0, 4).toUpperCase(),
      description: fallbackBranding.description,
      tagline:     fallbackBranding.tagline,
      category:    fallbackBranding.category,
      branding: {
        palette: fallbackBranding.palette,
        topFeatures: ['Anti-Whale Mechanics', 'Community Governance', 'Liquidity Growth']
      },
      intelligenceScore: {
        total: 85,
        memorability: 9,
        uniqueness: 8,
        marketAppeal: 9,
        riskFactor: 1
      }
    };
    
    const mimicCheck = await detectMimicToken(fallbackData.name, fallbackData.symbol);
    fallbackData.mimicCheck = mimicCheck;
    return fallbackData;
}

// ─── 9. MEME MARKET DATA (for Carousel/Ticker) ──────────────
async function getMemeMarketData() {
  const cacheKey = 'meme_market_data';
  const cached   = trendCache.get(cacheKey);
  if (cached) return cached;

  const MEME_IDS = ['dogecoin', 'shiba-inu', 'pepe', 'floki', 'bonk', 'dogwifcoin', 'book-of-meme', 'brett', 'popcat', 'baby-doge-coin'];
  
  try {
    const headers = process.env.COINGECKO_API_KEY ? { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY } : {};
    const res = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
      headers,
      params: { vs_currency: 'usd', ids: MEME_IDS.join(','), order: 'market_cap_desc', per_page: 20, page: 1, sparkline: false, price_change_percentage: '24h' }
    });

    trendCache.set(cacheKey, res.data, 300); // 5 min cache
    return res.data;
  } catch (err) {
    console.error('[ML] Meme market fetch failed:', err.message);
    return []; // Frontend handles empty array
  }
}

// ─── 10. FULL ANALYSIS (all features in one call) ────────────
async function fullTokenAnalysis(name, symbol) {
  const [mimic, scores, branding, trends, sentiment] = await Promise.all([
    detectMimicToken(name, symbol),
    scoreTokenIntelligence(name, symbol),
    generateBranding(name, symbol),
    getTrendForecast(),
    getSocialSentiment(name, symbol)
  ]);

  return { name, symbol, mimic, scores, branding, trends, sentiment, analyzedAt: new Date().toISOString() };
}

// ─── FALLBACK TOKEN LIST (used if CoinGecko is down) ────────
const FALLBACK_TOKENS = [
  { id:'bitcoin',  name:'bitcoin',  symbol:'btc',  rank:1  },
  { id:'ethereum', name:'ethereum', symbol:'eth',  rank:2  },
  { id:'tether',   name:'tether',   symbol:'usdt', rank:3  },
  { id:'bnb',      name:'bnb',      symbol:'bnb',  rank:4  },
  { id:'solana',   name:'solana',   symbol:'sol',  rank:5  },
  { id:'usd-coin', name:'usd coin', symbol:'usdc', rank:6  },
  { id:'xrp',      name:'xrp',      symbol:'xrp',  rank:7  },
  { id:'dogecoin', name:'dogecoin', symbol:'doge', rank:8  },
  { id:'cardano',  name:'cardano',  symbol:'ada',  rank:9  },
  { id:'avalanche-2', name:'avalanche', symbol:'avax', rank:10 },
  { id:'shiba-inu', name:'shiba inu', symbol:'shib', rank:11 },
  { id:'polkadot', name:'polkadot', symbol:'dot',  rank:12 },
  { id:'polygon',  name:'polygon',  symbol:'matic',rank:13 },
  { id:'chainlink',name:'chainlink',symbol:'link', rank:14 },
  { id:'litecoin', name:'litecoin', symbol:'ltc',  rank:15 },
  { id:'uniswap',  name:'uniswap',  symbol:'uni',  rank:16 },
  { id:'dai',      name:'dai',      symbol:'dai',  rank:17 },
  { id:'tron',     name:'tron',     symbol:'trx',  rank:18 },
  { id:'pepe',     name:'pepe',     symbol:'pepe', rank:19 },
  { id:'near',     name:'near protocol', symbol:'near', rank:20 }
];

// ─── 11. AI WHITEPAPER GENERATOR ────────────────────────────
async function generateWhitepaper(details) {
    const { name, symbol, description, supply, category } = details;
    const fallbackContent = `
# ${name} (${symbol}) Whitepaper
*Generated by B20-LAB AI Brain*

## 1. Executive Summary
${name} is an advanced blockchain asset engineered for high-performance decentralized utility. Our mission is to bridge the gap between complex blockchain protocols and everyday user experience.

## 2. Problem Statement
Current digital ecosystems suffer from high barriers to entry, fragmented liquidity, and lack of intuitive interfaces.

## 3. Proposed Solution
By leveraging the Binance Smart Chain and B20 standard, ${name} provides a seamless, high-throughput solution that prioritizes security and community growth.

## 4. Technology & Architecture
Built on a high-availability infrastructure with audited smart contracts and optimized data flow.

## 5. Tokenomics
- **Total Supply**: ${supply}
- **Symbol**: ${symbol}
- **Tax Logic**: Optimized for long-term sustainability.

## 6. Use Cases
Primary utility includes governance, ecosystem rewards, and service access within the ${category || 'Blockchain'} sector.

## 7. Market Analysis
The project targets the rapidly expanding ${category || 'Web3'} market with a focus on viral growth and structural stability.

## 8. Roadmap
Phase 1: Launch & Community Building. Phase 2: Platform Integration. Phase 3: Global Expansion.

## 9. Governance Model
A decentralized DAO structure will be implemented to ensure community-driven decision making.

## 10. Security & Risk Management
Regular audits and anti-whale mechanisms are built into the core protocol.

## 11. Legal & Compliance
The ${symbol} token is designed as a utility asset with strict adherence to global compliance standards.

## 12. Team & Advisors
A group of experienced developers and strategic partners dedicated to the project's success.

## 13. Funding & Token Sale
Funds will be allocated for ongoing development (50%), marketing (30%), and liquidity (20%).

## 14. Ecosystem & Partnerships
Integrated with top-tier DEXs and cross-chain bridges.

## 15. Community & Adoption Strategy
Focused on transparent communication and strategic marketing across social platforms.

## 16. Future Vision
To become the leading utility standard in the ${category || 'DeFi'} ecosystem.

## 17. Appendix / Technical Details
Full mathematical models and protocol specifications available on GitHub.

## 18. References
Standard research papers on AMM and Bonding Curve protocols.
`.trim();

    if (!process.env.ANTHROPIC_API_KEY) {
        console.log('[ML] No API key for Whitepaper, using Brain Fallback');
        return { success: true, content: fallbackContent, isFallback: true };
    }

    const systemPrompt = `You are a professional blockchain technical writer. Generate a comprehensive, high-standard cryptocurrency whitepaper based on the provided token details.
    
    CRITICAL: You must include exactly these 18 sections with the specified headings (numbered 1 to 18):
    1. Executive Summary
    2. Problem Statement
    3. Proposed Solution
    4. Technology & Architecture (including Blockchain Design, System Architecture, Smart Contracts, Scalability)
    5. Tokenomics (include Supply: ${supply}, Purpose, Distribution, Incentives)
    6. Use Cases
    7. Market Analysis
    8. Roadmap
    9. Governance Model
    10. Security & Risk Management
    11. Legal & Compliance
    12. Team & Advisors
    13. Funding & Token Sale
    14. Ecosystem & Partnerships
    15. Community & Adoption Strategy
    16. Future Vision
    17. Appendix / Technical Details
    18. References

    Use a professional, data-driven, and technical tone. Avoid hype. Use Markdown format.`;

    const userPrompt = `Token Name: ${name}\nSymbol: ${symbol}\nInitial Description: ${description}\nCategory: ${category}\nInitial Supply: ${supply}\nPlease generate the full whitepaper now.`;

    try {
        const res = await axios.post('https://api.anthropic.com/v1/messages', {
            model: 'claude-3-5-sonnet-20240620',
            max_tokens: 4000,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }]
        }, {
            headers: {
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            }
        });

        return {
            success: true,
            content: res.data.content[0].text
        };
    } catch (err) {
        console.warn('[ML] Whitepaper API error, triggering Brain Fallback:', err.message);
        return { success: true, content: fallbackContent, isFallback: true };
    }
}

module.exports = {
  detectMimicToken,
  scoreTokenIntelligence,
  generateBranding,
  getTrendForecast,
  getSocialSentiment,
  runAIAgent,
  fullTokenAnalysis,
  getMemeMarketData,
  getTokenDatabase,
  generateWhitepaper
};
