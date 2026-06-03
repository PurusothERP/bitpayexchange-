'use client';
import { API_URL } from '@/lib/api';
import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Rocket, AlertTriangle, ShieldCheck, Brain, Palette,
  CheckCircle, ExternalLink, Zap, ArrowRight, BarChart3, Shield,
  Star, PlusCircle, Megaphone, RefreshCw, Loader2
} from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

const RISK_COLOR = {
  SAFE:     { bg: 'bg-sky-50',   border: 'border-sky-200',   text: 'text-sky-700',   badge: 'bg-sky-500' },
  MEDIUM:   { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-500' },
  HIGH:     { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', badge: 'bg-slate-500' },
  CRITICAL: { bg: 'bg-red-50',   border: 'border-red-200',   text: 'text-red-700',   badge: 'bg-red-600' },
};

export default function AIAgent() {
  const [tokenName,   setTokenName]   = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [prompt,      setPrompt]      = useState('');

  const [suggestions, setSuggestions] = useState(null);
  const [mimicAlert,  setMimicAlert]  = useState(null);

  const [autoLoading, setAutoLoading] = useState(false);   // live suggestion spinner
  const [loading,     setLoading]     = useState(false);   // full analysis spinner
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState('');
  const [selectedLogo, setSelectedLogo] = useState('');
  const [showHype,     setShowHype]     = useState(false);
  const [descriptionMode, setDescriptionMode] = useState('manual');
  const [generatingDesc, setGeneratingDesc] = useState(false);

  const debounceRef = useRef(null);
  const router = useRouter();

  // ── Auto-fetch suggestions whenever name/symbol/idea changes (debounced 900ms) ──
  const fetchSuggestions = useCallback(async (name, symbol, idea) => {
    if (!name && !symbol && !idea) return;
    setAutoLoading(true);
    setError('');
    setSuggestions(null);
    setMimicAlert(null);
    setResult(null);
    try {
      const res = await axios.post(`${API_URL}/ml/ai-agent-suggest`, { name, symbol, idea });
      if (res.data.success) {
        setMimicAlert(res.data.data.mimicCheck);
        setSuggestions(res.data.data.suggestions);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'AI generation failed.');
    } finally {
      setAutoLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Only trigger if at least name OR idea has content
    if (!tokenName.trim() && !prompt.trim()) return;
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(tokenName, tokenSymbol, prompt);
    }, 900);
    return () => clearTimeout(debounceRef.current);
  }, [tokenName, tokenSymbol, prompt, fetchSuggestions]);

  // ── Manual refresh ──
  const handleRefresh = () => fetchSuggestions(tokenName, tokenSymbol, prompt);

  // ── Generate AI Description ──
  const handleGenerateAIDescription = async () => {
    if (!tokenName || !tokenSymbol) {
      setError('Please provide Token Name and Symbol first.');
      return;
    }
    setGeneratingDesc(true);
    setError('');
    try {
      const res = await axios.post(`${API_URL}/ml/ai-description`, { name: tokenName, symbol: tokenSymbol });
      if (res.data.success) {
        setPrompt(res.data.description);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to generate AI description.');
    } finally {
      setGeneratingDesc(false);
    }
  };

  // ── Select a suggestion → run full analysis ──
  const handleSelectToken = async (selected) => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { name, symbol, description } = selected;
      const [brandingRes, mimicRes, scoreRes, sentRes] = await Promise.allSettled([
        axios.post(`${API_URL}/ml/branding`,     { name, symbol }),
        axios.post(`${API_URL}/ml/mimic-check`,  { name, symbol }),
        axios.post(`${API_URL}/ml/score`,        { name, symbol }),
        axios.post(`${API_URL}/ml/sentiment`,    { name, symbol }),
      ]);

      const branding  = brandingRes.status  === 'fulfilled' ? brandingRes.value.data  : {};
      const mimic     = mimicRes.status     === 'fulfilled' ? mimicRes.value.data     : { riskLevel: 'SAFE' };
      const scores    = scoreRes.status     === 'fulfilled' ? scoreRes.value.data     : {};
      const sentiment = sentRes.status      === 'fulfilled' ? sentRes.value.data      : {};

      setResult({
        name, symbol, description,
        category:   branding.category  || 'utility',
        tagline:    branding.tagline    || `${name} — Intelligence evolved.`,
        logoEmoji:  branding.logoEmoji  || '💎',
        branding:   { palette: branding.palette || ['#0891B2','#CFFAFE'], topFeatures: branding.features || [] },
        mimic, scores, sentiment
      });
      setSuggestions(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  const importTo = (type) => {
    if (!result) return;
    const params = new URLSearchParams({ name: result.name, symbol: result.symbol, desc: result.description });
    const routes = { bonding: `/create?${params}`, fairlaunch: `/fair-launch?${params}`, standard: `/create?${params}&mode=standard` };
    router.push(routes[type]);
  };

  const riskColors = RISK_COLOR[result?.mimic?.riskLevel] || RISK_COLOR.SAFE;
  const hasInput   = tokenName.trim() || prompt.trim();

  return (
    <main className="min-h-screen paw-pattern overflow-x-hidden">
      <Navbar />

      <section className="pt-32 pb-20 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">

          {/* ── Header ── */}
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="text-center mb-10">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-600/10 border border-teal-600/20 text-teal-600 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
              <Sparkles className="w-3.5 h-3.5" /> Nuera AI · Instant Token Architect
            </span>
            <h1 className="text-4xl md:text-5xl font-black mb-4">
              Describe Your Token —{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-slate-500">
                AI Does the Rest
              </span>
            </h1>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Just start typing. Suggestions appear automatically. No button needed.
            </p>
          </motion.div>

          {/* ── Input Card ── */}
          <motion.div initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }} className="glass-card mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-teal-500/5 blur-3xl -z-10" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Token Name</label>
                <input
                  type="text"
                  placeholder="e.g. BurgerCoin"
                  value={tokenName}
                  onChange={e => setTokenName(e.target.value)}
                  className="w-full bg-black/5 border border-black/10 rounded-2xl px-5 py-3 focus:outline-none focus:border-teal-500/50 transition-all text-gray-900 text-base"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Token Symbol</label>
                <input
                  type="text"
                  placeholder="e.g. BRGR"
                  value={tokenSymbol}
                  onChange={e => setTokenSymbol(e.target.value.toUpperCase())}
                  className="w-full bg-black/5 border border-black/10 rounded-2xl px-5 py-3 focus:outline-none focus:border-teal-500/50 transition-all text-gray-900 text-base uppercase tracking-widest font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center justify-between gap-2 mb-2">
                <span className="flex items-center gap-2"><Brain className="w-3.5 h-3.5 text-teal-600" /> Describe your token idea</span>
                <div className="flex bg-black/5 rounded-lg p-0.5">
                  <button 
                    onClick={() => setDescriptionMode('manual')}
                    className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${descriptionMode === 'manual' ? 'bg-white shadow-sm text-teal-600' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Manual
                  </button>
                  <button 
                    onClick={() => setDescriptionMode('ai')}
                    className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${descriptionMode === 'ai' ? 'bg-white shadow-sm text-teal-600' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    AI Description
                  </button>
                </div>
              </label>

              <div className="relative flex flex-col gap-3">
                {descriptionMode === 'ai' && (
                  <button
                    onClick={handleGenerateAIDescription}
                    disabled={generatingDesc || !tokenName || !tokenSymbol}
                    className="w-full py-3 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                  >
                    {generatingDesc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {generatingDesc ? 'Generating AI Description...' : 'Generate 4-5 Lines with AI'}
                  </button>
                )}
                
                <div className="relative">
                  <textarea
                    rows="4"
                    placeholder="e.g. A fast-food themed meme coin on BSC that rewards holders with burger NFTs and builds a community of food lovers in DeFi..."
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    className="w-full bg-black/5 border border-black/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-teal-500/50 transition-all text-gray-900 text-base resize-none shadow-inner"
                  />
                  {/* Live status indicator */}
                  <div className="absolute bottom-3 right-4 flex items-center gap-2">
                    {autoLoading ? (
                      <span className="flex items-center gap-1.5 text-[10px] font-black text-teal-600 uppercase tracking-widest">
                        <Loader2 className="w-3 h-3 animate-spin" /> Generating…
                      </span>
                    ) : hasInput ? (
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-teal-500" /> GPT-4o-mini + CoinGecko
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-300 font-medium">Start typing to generate…</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Refresh button — manual re-trigger */}
            {hasInput && (
              <button
                onClick={handleRefresh}
                disabled={autoLoading}
                className="mt-4 w-full py-3 flex items-center justify-center gap-2 border border-teal-200 text-teal-600 hover:bg-teal-50 rounded-2xl font-black text-sm transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${autoLoading ? 'animate-spin' : ''}`} />
                Regenerate Suggestions
              </button>
            )}
          </motion.div>

          {error && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
              className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm mb-6 flex items-center gap-2 justify-center">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </motion.div>
          )}

          {/* ── Suggestion Skeleton ── */}
          <AnimatePresence>
            {autoLoading && !suggestions && (
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="glass-card h-48 animate-pulse bg-gray-100/60 rounded-2xl" />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Suggestions Grid ── */}
          <AnimatePresence>
            {suggestions && !result && (
              <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:20 }} className="space-y-5">

                {/* Mimic alert */}
                {mimicAlert && mimicAlert.riskLevel !== 'SAFE' && (
                  <div className={`p-5 rounded-2xl border flex items-start gap-4 shadow-sm
                    ${mimicAlert.riskLevel === 'CRITICAL' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                    <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-black text-sm mb-1">{mimicAlert.alertMessage}</p>
                      <p className="text-xs font-medium opacity-80">Your name/symbol closely matches an existing token. We recommend choosing one of the AI-generated alternatives below.</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <h3 className="font-black text-xl text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-teal-500" /> AI Suggestions
                  </h3>
                  <button onClick={handleRefresh} disabled={autoLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50">
                    <RefreshCw className={`w-3 h-3 ${autoLoading ? 'animate-spin' : ''}`} /> Refresh
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* User's own input card (if they typed a name + symbol) */}
                  {tokenName && tokenSymbol && (
                    <motion.div
                      initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
                      onClick={() => handleSelectToken({ name: tokenName, symbol: tokenSymbol, description: prompt || 'Custom user token.' })}
                      className="glass-card p-6 cursor-pointer hover:border-slate-400 hover:shadow-lg transition-all flex flex-col bg-slate-50 border-2 border-slate-200"
                    >
                      <span className="px-2 py-1 bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-widest mb-4 self-start">Your Input</span>
                      <h4 className="text-2xl font-black text-gray-900">{tokenName}
                        <span className="text-teal-600 ml-2 font-mono">${tokenSymbol}</span>
                      </h4>
                      <p className="text-sm text-gray-500 mt-3 leading-relaxed flex-1 line-clamp-3">{prompt || 'Click to analyze your custom token.'}</p>
                      {mimicAlert && mimicAlert.riskLevel !== 'SAFE' && (
                        <span className={`mt-4 self-start px-2 py-1 rounded text-[10px] font-black uppercase
                          ${mimicAlert.riskLevel === 'CRITICAL' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                          ⚠️ {mimicAlert.riskLevel} Risk
                        </span>
                      )}
                    </motion.div>
                  )}

                  {/* AI suggestions */}
                  {suggestions.map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * 0.06 }}
                      onClick={() => handleSelectToken(s)}
                      className="glass-card p-6 cursor-pointer hover:border-teal-500 hover:shadow-xl transition-all flex flex-col bg-white border-2 border-transparent group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <span className="px-2 py-1 bg-teal-50 group-hover:bg-teal-100 text-teal-700 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors">
                          AI Pick {i + 1}
                        </span>
                        <Sparkles className="w-4 h-4 text-teal-400 opacity-40 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h4 className="text-xl font-black text-gray-900 group-hover:text-teal-900 transition-colors">
                        {s.name}
                        <span className="text-teal-600 ml-2 font-mono text-lg">${s.symbol.toUpperCase()}</span>
                      </h4>
                      <p className="text-sm text-gray-500 mt-3 leading-relaxed whitespace-pre-line flex-1">{s.description}</p>
                      <span className="mt-4 self-start px-2 py-1 rounded text-[10px] font-black uppercase bg-sky-50 text-sky-600">✓ Unique & Safe</span>
                    </motion.div>
                  ))}
                </div>

                <p className="text-center text-xs text-gray-400 font-medium">
                  Click any card above to run the full intelligence analysis →
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Full analysis loading ── */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-14 h-14 rounded-full border-4 border-teal-500/30 border-t-teal-500 animate-spin" />
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Running Intelligence Analysis…</p>
            </div>
          )}

          {/* ════════ RESULTS DASHBOARD ════════ */}
          <AnimatePresence>
            {result && !loading && (
              <motion.div initial={{ opacity:0, y:40 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:40 }} className="space-y-5 mt-4">

                {/* ── Token Identity ── */}
                <div className="glass-card overflow-hidden">
                  <div className="p-7 bg-gradient-to-br from-gray-900 to-gray-800 text-white relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 blur-3xl" />
                    <div className="relative flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <Brain size={11} className="text-teal-500" /> Nuera AI · Institutional Identity
                        </p>
                        <h2 className="text-4xl font-black mb-1">{result.name}</h2>
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <p className="text-2xl font-black font-mono text-teal-400">${result.symbol}</p>
                          <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[8px] font-black rounded-lg uppercase tracking-widest flex items-center gap-1.5">
                            <Shield size={9} /> Nuera Guard Verified
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm italic">"{result.tagline}"</p>
                      </div>
                      <div className="text-5xl shrink-0 flex flex-col items-center gap-1">
                        <span>{result.logoEmoji}</span>
                        <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest">Logo</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line mb-5">{result.description}</p>
                    {result.category && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-xs font-black uppercase tracking-widest">{result.category}</span>
                    )}
                  </div>
                </div>

                {/* ── Mimic Detection ── */}
                <div className={`glass-card border-2 ${riskColors.border} ${riskColors.bg}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${result.mimic?.riskLevel === 'SAFE' ? 'bg-sky-100' : 'bg-red-100'}`}>
                      {result.mimic?.riskLevel === 'SAFE'
                        ? <ShieldCheck className="w-6 h-6 text-sky-600" />
                        : <AlertTriangle className="w-6 h-6 text-red-600" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-black text-gray-900">CoinGecko Mimic Detection</h3>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black text-white uppercase ${riskColors.badge}`}>
                          {result.mimic?.riskLevel || 'SAFE'}
                        </span>
                      </div>
                      <p className={`text-sm font-bold ${riskColors.text}`}>
                        {result.mimic?.alertMessage || `✅ "${result.name}" (${result.symbol}) passed. No copycat patterns found.`}
                      </p>
                      {result.mimic?.similarTokens?.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Similar Tokens:</p>
                          {result.mimic.similarTokens.slice(0, 3).map((t, i) => (
                            <div key={i} className="flex items-center justify-between bg-white/70 rounded-xl px-4 py-3 border border-black/5 text-xs">
                              <div className="flex items-center gap-2">
                                {t.image && <img src={t.image} alt={t.name} className="w-6 h-6 rounded-full" />}
                                <span className="font-bold">{t.name} <span className="text-gray-400">({t.symbol?.toUpperCase()})</span></span>
                                <span className="text-gray-400">#{t.rank}</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded font-black text-[10px] ${t.severity === 'CRITICAL' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                                {t.nameSimilarity}% match
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Intelligence Scores ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label:'Memorability', value:result.scores?.memorability, color:'from-teal-600 to-teal-700',   icon:'🧠' },
                    { label:'Uniqueness',   value:result.scores?.uniqueness,   color:'from-sky-500 to-teal-500',   icon:'💎' },
                    { label:'Market Appeal',value:result.scores?.marketAppeal, color:'from-teal-600 to-slate-500', icon:'📈' },
                    { label:'Risk Score',   value:result.scores?.riskLevel,    color:'from-teal-600 to-red-500',   icon:'🛡️', invert:true },
                  ].map(s => (
                    <div key={s.label} className="glass-card text-center p-5">
                      <div className="text-2xl mb-2">{s.icon}</div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{s.label}</p>
                      <div className={`text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r ${s.color}`}>
                        {s.value ?? '—'}
                      </div>
                      <div className="mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full bg-gradient-to-r ${s.color}`}
                          style={{ width:`${s.invert ? 100-(s.value||0) : (s.value||0)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Verdict ── */}
                {result.scores?.verdict && (
                  <div className="glass-card p-5 bg-gradient-to-r from-teal-50 to-purple-50 border-teal-200">
                    <div className="flex items-start gap-3">
                      <Star className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-black text-gray-900 mb-1">AI Verdict</p>
                        <p className="text-sm text-teal-700 font-medium">{result.scores.verdict}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-gray-400 font-black uppercase">Overall</p>
                        <p className="text-3xl font-black text-teal-600">{result.scores?.overall ?? '—'}<span className="text-sm text-gray-400">/100</span></p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Sentiment ── */}
                {result.sentiment?.recommendation && (
                  <div className="glass-card">
                    <h3 className="font-black text-gray-900 mb-3 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-teal-600" /> CoinGecko Market Sentiment
                    </h3>
                    <p className="text-sm text-gray-600 font-medium">{result.sentiment.recommendation}</p>
                  </div>
                )}

                {/* ── Hype Engine ── */}
                <div className="glass-card bg-gray-900 text-white overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-56 h-56 bg-teal-500/10 blur-3xl" />
                  <div className="relative flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                        <Megaphone size={18} className="text-teal-400" />
                      </div>
                      <div>
                        <h3 className="font-black text-sm uppercase tracking-widest">Nuera Hype Engine</h3>
                        <p className="text-[10px] text-teal-400 font-bold">Automated Social Propagation</p>
                      </div>
                    </div>
                    <button onClick={() => setShowHype(!showHype)}
                      className="px-4 py-2 bg-teal-500 hover:bg-teal-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                      {showHype ? 'Hide' : 'Generate Pack'}
                    </button>
                  </div>
                  <AnimatePresence>
                    {showHype && (
                      <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} className="space-y-3 relative overflow-hidden">
                        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                          <p className="text-[9px] font-black text-teal-400 uppercase tracking-widest mb-2">Twitter Thread Draft</p>
                          <p className="text-xs text-white/80 leading-relaxed italic">
                            "1/ Introducing ${result.symbol} — {result.tagline} 🚀
Built on the B20-LAB backbone, we're redefining {result.category}. Thread below. 🧵 #BSC #B20"
                          </p>
                        </div>
                        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                          <p className="text-[9px] font-black text-teal-400 uppercase tracking-widest mb-2">Community Pitch</p>
                          <p className="text-xs text-white/80 leading-relaxed italic">
                            "Attention Alpha Hunters! 🎯 ${result.symbol} is now LIVE on B20-LAB. AI-verified, liquidity locked, community-first. Join the movement."
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ── Branding ── */}
                {(result.branding?.palette?.length > 0 || result.branding?.topFeatures?.length > 0) && (
                  <div className="glass-card">
                    <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                      <Palette className="w-5 h-5 text-teal-600" /> Brand Palette & Features
                    </h3>
                    <div className="flex gap-3 mb-4">
                      {result.branding.palette.map((c, i) => (
                        <div key={i} className="text-center">
                          <div className="w-10 h-10 rounded-full shadow-md border-2 border-white" style={{ background:c }} />
                          <p className="text-[9px] font-mono text-gray-400 mt-1">{c}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.branding.topFeatures.map((f, i) => (
                        <span key={i} className="px-3 py-1 bg-gray-100 rounded-xl text-xs font-bold text-gray-700">✓ {f}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Deploy ── */}
                <div className="glass-card bg-gradient-to-br from-gray-900 to-gray-800 text-white relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-40 h-40 bg-teal-500/10 blur-3xl" />
                  <div className="relative">
                    <h3 className="font-black text-lg mb-1">Ready to Deploy?</h3>
                    <p className="text-gray-400 text-sm mb-6">Name, symbol, and description will be pre-filled in your chosen launch method.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button onClick={() => importTo('bonding')}
                        className="py-4 px-4 bg-teal-500 hover:bg-teal-600 rounded-2xl font-black text-sm transition-all flex flex-col items-center gap-2 active:scale-95">
                        <Zap className="w-5 h-5" />
                        <span>Bonding Curve</span>
                        <span className="text-[10px] text-teal-200 font-normal">Fair launch + gradual price</span>
                      </button>
                      <button onClick={() => importTo('fairlaunch')}
                        className="py-4 px-4 bg-sky-500 hover:bg-sky-600 rounded-2xl font-black text-sm transition-all flex flex-col items-center gap-2 active:scale-95">
                        <Rocket className="w-5 h-5" />
                        <span>Fair Launch DEX</span>
                        <span className="text-[10px] text-sky-200 font-normal">Instant PancakeSwap listing</span>
                      </button>
                      <button onClick={() => importTo('standard')}
                        className="py-4 px-4 bg-slate-600 hover:bg-slate-700 rounded-2xl font-black text-sm transition-all flex flex-col items-center gap-2 active:scale-95">
                        <Shield className="w-5 h-5" />
                        <span>Standard Token</span>
                        <span className="text-[10px] text-slate-300 font-normal">Full control + custom tax</span>
                      </button>
                    </div>
                    <button
                      onClick={() => { setResult(null); setPrompt(''); setTokenName(''); setTokenSymbol(''); setSuggestions(null); }}
                      className="mt-4 w-full py-3 border border-white/10 text-gray-400 hover:text-white hover:border-white/30 rounded-2xl font-bold text-sm transition-all">
                      ← Start Over with New Idea
                    </button>
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </section>
    </main>
  );
}
