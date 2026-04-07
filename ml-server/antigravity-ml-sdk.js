// ============================================================
//  antigraVITY ML SDK — antigravity-ml-sdk.js
//  Drop this file into your antigraVITY frontend.
//  Import and call any function — it talks to your ML engine.
// ============================================================

const ML_ENGINE_URL = 'http://localhost:3001'; // Change to your deployed URL

// ─── HELPER ─────────────────────────────────────────────────
async function mlCall(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);

  const res  = await fetch(`${ML_ENGINE_URL}${endpoint}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'ML Engine error');
  return data;
}

// ─── 1. MIMIC TOKEN DETECTION ───────────────────────────────
// Call this BEFORE deploying — always allow creation but show alert if risky
// 
// Usage:
//   const result = await detectMimic('SafeBitcoin', 'SBTC');
//   if (result.alertMessage) showAlert(result.alertMessage);  // show but allow
//
// Returns:
//   { riskLevel: 'SAFE'|'MEDIUM'|'HIGH'|'CRITICAL',
//     alertMessage: string|null,
//     canCreate: true,         <- always true, you decide to block or warn
//     similarTokens: [...] }
export async function detectMimic(name, symbol) {
  const res = await mlCall('/api/detect-mimic', 'POST', { name, symbol });
  return res.data;
}

// ─── 2. INTELLIGENCE SCORE ──────────────────────────────────
// Show this to users before they deploy
//
// Usage:
//   const score = await getIntelligenceScore('GravityDoge', 'GRDG');
//   renderScoreCard(score);
//
// Returns:
//   { memorability: 0-100, uniqueness: 0-100,
//     marketAppeal: 0-100, riskLevel: 0-100,
//     overall: 0-100, verdict: string }
export async function getIntelligenceScore(name, symbol) {
  const res = await mlCall('/api/score', 'POST', { name, symbol });
  return res.data;
}

// ─── 3. AI BRANDING ENGINE ──────────────────────────────────
// Generates full brand identity from just name + symbol
//
// Usage:
//   const brand = await generateBranding('MoonRocket', 'MOON');
//   renderBrandCard(brand);
//
// Returns:
//   { tagline, description, palette: ['#hex',...],
//     logoEmoji, logoBg, category, targetAudience, launchSuggestion }
export async function generateBranding(name, symbol) {
  const res = await mlCall('/api/branding', 'POST', { name, symbol });
  return res.data;
}

// ─── 4. TOKEN TREND FORECASTING ─────────────────────────────
// Show on homepage — "what's trending right now"
//
// Usage:
//   const trends = await getTrends();
//   renderTrendsDashboard(trends);
//
// Returns:
//   { trendingCoins, categoryTrends, topGainers,
//     hotCategory, forecast, fetchedAt }
export async function getTrends() {
  const res = await mlCall('/api/trends', 'GET');
  return res.data;
}

// ─── 5. SOCIAL SENTIMENT ────────────────────────────────────
// Show after token is created — live sentiment tracker
//
// Usage:
//   const sentiment = await getSentiment('MoonRocket', 'MOON');
//   renderSentimentWidget(sentiment);
//
// Returns:
//   { tokenFound, twitter: {...}, coinGecko: {...}, recommendation }
export async function getSentiment(name, symbol) {
  const res = await mlCall('/api/sentiment', 'POST', { name, symbol });
  return res.data;
}

// ─── 6. ONE-PROMPT AI AGENT ─────────────────────────────────
// User types one sentence → complete token creation plan
//
// Usage:
//   const plan = await runAgent('Create a meme token for dog lovers on Solana');
//   if (plan.success) autoFillForm(plan.data);
//
// Returns:
//   { tokenName, tokenSymbol, description, tagline,
//     suggestedChain, initialSupply, features,
//     launchStrategy, palette, estimatedGasCost,
//     riskWarnings, mimicAlert }
export async function runAgent(prompt) {
  const res = await mlCall('/api/agent', 'POST', { prompt });
  return res;
}

// ─── 7. FULL ANALYSIS (all-in-one) ──────────────────────────
// Run all ML checks in one call — use on the review page before deployment
//
// Usage:
//   const analysis = await analyzeToken('GravityDoge', 'GRDG');
//   renderFullReport(analysis);
//
// Returns: { mimic, scores, branding, trends, sentiment }
export async function analyzeToken(name, symbol) {
  const res = await mlCall('/api/analyze', 'POST', { name, symbol });
  return res.data;
}

// ─── 8. READY-MADE UI HELPER ────────────────────────────────
// Call this inside your token creation form onChange handler.
// It checks mimic in real time as the user types.
//
// Usage (React example):
//   const { alert, severity } = await realTimeCheck(name, symbol);
//   setMimicAlert(alert);
//
export async function realTimeCheck(name, symbol) {
  if (!name || name.length < 3 || !symbol || symbol.length < 2)
    return { alert: null, severity: 'SAFE' };

  try {
    const mimic = await detectMimic(name, symbol);
    return {
      alert:    mimic.alertMessage,
      severity: mimic.riskLevel,
      similar:  mimic.similarTokens?.slice(0, 3)
    };
  } catch {
    return { alert: null, severity: 'SAFE' };
  }
}

// ─── REACT HOOK (optional) ───────────────────────────────────
// If antigraVITY uses React, paste this hook into your component:
//
// import { useState, useEffect } from 'react';
// import { realTimeCheck } from './antigravity-ml-sdk';
//
// function useTokenML(name, symbol) {
//   const [mimicAlert, setMimicAlert]   = useState(null);
//   const [severity,   setSeverity]     = useState('SAFE');
//   const [isChecking, setIsChecking]   = useState(false);
//
//   useEffect(() => {
//     const timer = setTimeout(async () => {
//       if (!name || !symbol) return;
//       setIsChecking(true);
//       const { alert, severity } = await realTimeCheck(name, symbol);
//       setMimicAlert(alert);
//       setSeverity(severity);
//       setIsChecking(false);
//     }, 600); // debounce 600ms
//     return () => clearTimeout(timer);
//   }, [name, symbol]);
//
//   return { mimicAlert, severity, isChecking };
// }
