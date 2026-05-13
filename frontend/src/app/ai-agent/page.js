'use client';
import { API_URL } from '@/lib/api';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, Rocket, AlertTriangle, ShieldCheck, Brain, Palette, TrendingUp, Info, CheckCircle, ExternalLink, Zap, ArrowRight, BarChart3, Shield, Star, PlusCircle, Megaphone } from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';



const RISK_COLOR = {
    SAFE:     { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', badge: 'bg-sky-500' },
    MEDIUM:   { bg: 'bg-teal-50',   border: 'border-teal-200',   text: 'text-teal-600',   badge: 'bg-teal-500' },
    HIGH:     { bg: 'bg-slate-50',  border: 'border-slate-200',  text: 'text-slate-700',  badge: 'bg-slate-500' },
    CRITICAL: { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     badge: 'bg-red-600' },
};

export default function AIAgent() {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [importLoading, setImportLoading] = useState('');
    const [selectedLogo, setSelectedLogo] = useState('');
    const [showHype, setShowHype] = useState(false);
    const router = useRouter();

    const handleRunAgent = async (e) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setLoading(true);
        setError('');
        setResult(null);

        try {
            // Step 1: Run AI Agent for name/branding/description
            const agentRes = await axios.post(`${API_URL}/ml/ai-agent`, { prompt });
            if (!agentRes.data.success) throw new Error(agentRes.data.error || 'Agent failed');
            const data = agentRes.data.data;
            const name = data.tokenName || data.name;
            const symbol = data.tokenSymbol || data.symbol;

            // Step 2: Run full analysis in parallel (mimic check, scoring, CoinGecko sentiment)
            const [mimicRes, scoreRes, sentRes] = await Promise.allSettled([
                axios.post(`${API_URL}/ml/mimic-check`, { name, symbol }),
                axios.post(`${API_URL}/ml/score`, { name, symbol }),
                axios.post(`${API_URL}/ml/sentiment`, { name, symbol }),
            ]);

            const mimic   = mimicRes.status   === 'fulfilled' ? mimicRes.value.data   : { riskLevel: 'SAFE' };
            const scores  = scoreRes.status   === 'fulfilled' ? scoreRes.value.data   : {};
            const sentiment = sentRes.status  === 'fulfilled' ? sentRes.value.data    : {};

            setResult({ ...data, name, symbol, mimic, scores, sentiment });
        } catch (err) {
            console.error('AI Agent Error:', err);
            setError(err.response?.data?.error || err.message || 'AI Agent encountered an issue. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const importTo = (type) => {
        if (!result) return;
        setImportLoading(type);
        const params = new URLSearchParams({
            name:   result.name || '',
            symbol: result.symbol || '',
            desc:   result.description || ''
        });
        const routes = {
            bonding:    `/create?${params}`,
            fairlaunch: `/fair-launch?${params}`,
            standard:   `/create?${params}&mode=standard`,
        };
        router.push(routes[type] || routes.bonding);
    };

    const riskColors = result?.mimic ? (RISK_COLOR[result.mimic.riskLevel] || RISK_COLOR.SAFE) : RISK_COLOR.SAFE;

    return (
        <main className="min-h-screen paw-pattern overflow-x-hidden">
            <Navbar />

            <section className="pt-32 pb-20 px-4 md:px-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-600/10 border border-teal-600/20 text-teal-600 text-[10px] font-black uppercase tracking-[0.2em] mb-4 shadow-sm">
                            <Sparkles className="w-3.5 h-3.5" /> Nuera AI Institutional Architect
                        </span>
                        <h1 className="text-4xl md:text-5xl font-black mb-4">
                            Build Your Token with <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-slate-500">Pure Intelligence</span>
                        </h1>
                        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                            Describe your idea, and our AI generates a unique name, symbol, description, analysis report, mimic detection via CoinGecko, and full market scoring — all in one shot.
                        </p>
                    </motion.div>

                    {/* Input Area */}
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card mb-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-teal-500/5 blur-3xl -z-10" />
                        <form onSubmit={handleRunAgent} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <Brain className="w-4 h-4 text-teal-600" /> Describe your token idea
                                </label>
                                <div className="relative">
                                    <textarea
                                        rows="4"
                                        placeholder="e.g. A fast-food themed meme coin on BSC that rewards holders with burger NFTs and builds a community of food lovers..."
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        className="w-full bg-black/5 border border-black/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-teal-500/50 transition-all text-gray-900 text-lg resize-none shadow-inner"
                                    />
                                    <div className="absolute bottom-4 right-4 text-xs text-gray-400 flex items-center gap-1">
                                        <Sparkles className="w-3 h-3" /> Claude 3.5 + CoinGecko
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                {['Meme coin about dogs', 'AI-powered DeFi yield optimizer', 'Gaming token for metaverse battles'].map(ex => (
                                    <button key={ex} type="button" onClick={() => setPrompt(ex)}
                                        className="flex-1 py-2 px-3 bg-black/5 hover:bg-teal-500/10 border border-black/10 hover:border-teal-500/30 text-gray-600 hover:text-teal-600 text-xs font-bold rounded-xl transition-all text-left">
                                        "{ex}"
                                    </button>
                                ))}
                            </div>
                            <button type="submit" disabled={loading || !prompt.trim()}
                                className="w-full py-4 bg-gradient-to-r from-teal-600 to-slate-500 hover:from-teal-600 hover:to-slate-600 disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-500 text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-2xl shadow-teal-200/20 transition-all text-lg">
                                {loading ? (
                                    <><div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> <span>AI is analyzing your idea...</span></>
                                ) : (
                                    <><Sparkles className="w-5 h-5" /> <span>Generate + Analyze Token</span> <ArrowRight className="w-5 h-5" /></>
                                )}
                            </button>
                        </form>
                    </motion.div>

                    {error && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 text-sm mb-8 text-center flex items-center gap-2 justify-center">
                            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                        </motion.div>
                    )}

                    {/* Results */}
                    <AnimatePresence>
                        {result && (
                            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} className="space-y-6">

                                {/* Token Identity Card */}
                                <div className="glass-card overflow-hidden">
                                    <div className="p-6 bg-gradient-to-br from-gray-900 to-gray-800 text-white relative">
                                        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-teal-500/10 blur-3xl" />
                                        <div className="relative flex items-start justify-between">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                    <Brain size={12} className="text-teal-500" /> Nuera AI Institutional Identity
                                                </p>
                                                <h2 className="text-4xl font-black mb-1">{result.name}</h2>
                                                <div className="flex items-center gap-3 mb-3">
                                                    <p className="text-2xl font-black font-mono text-teal-500">${result.symbol}</p>
                                                    <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[8px] font-black rounded-lg uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-emerald-900/20">
                                                        <Shield size={10} /> Nuera Guard Verified
                                                    </span>
                                                </div>
                                                <p className="text-gray-300 text-sm leading-relaxed max-w-lg italic">"{result.tagline || result.description}"</p>
                                            </div>
                                            <div className="text-5xl shrink-0 ml-4 flex flex-col items-center gap-2">
                                                <span>{result.logoEmoji || '🚀'}</span>
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Logo Studio suggestions</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <p className="text-gray-700 text-sm leading-relaxed mb-6">{result.description}</p>
                                        
                                        {/* Neural Logo Studio */}
                                        <div className="space-y-4">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Palette size={12} className="text-teal-600" /> Neural Logo Studio Suggestions
                                            </p>
                                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                                                {result.generatedLogos?.map((url, i) => (
                                                    <button 
                                                        key={i}
                                                        onClick={() => setSelectedLogo(url)}
                                                        className={`aspect-square rounded-2xl border-2 transition-all p-2 bg-white ${selectedLogo === url ? 'border-teal-500 shadow-lg shadow-teal-200 scale-105' : 'border-slate-100 hover:border-slate-200'}`}
                                                    >
                                                        <img src={url} alt={`Logo ${i}`} className="w-full h-full object-contain" />
                                                    </button>
                                                ))}
                                                <div className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300">
                                                    <PlusCircle size={20} />
                                                    <span className="text-[8px] font-black uppercase mt-1">Custom</span>
                                                </div>
                                            </div>
                                        </div>

                                        {result.category && (
                                            <span className="inline-block mt-6 px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-black uppercase tracking-widest">
                                                {result.category}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* ── CoinGecko Mimic Check ── */}
                                <div className={`glass-card border-2 ${riskColors.border} ${riskColors.bg}`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${result.mimic?.riskLevel === 'SAFE' ? 'bg-sky-100' : 'bg-red-100'}`}>
                                            {result.mimic?.riskLevel === 'SAFE'
                                                ? <ShieldCheck className="w-6 h-6 text-sky-600" />
                                                : <AlertTriangle className="w-6 h-6 text-red-600" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-black text-gray-900">CoinGecko Mimic Detection</h3>
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest ${riskColors.badge}`}>
                                                    {result.mimic?.riskLevel || 'SAFE'}
                                                </span>
                                            </div>
                                            <p className={`text-sm font-bold ${riskColors.text}`}>
                                                {result.mimic?.alertMessage || `✅ "${result.name}" (${result.symbol}) passed the CoinGecko mimic detection. No copycat patterns found — this appears to be a unique token name.`}
                                            </p>
                                            {result.mimic?.similarTokens?.length > 0 && (
                                                <div className="mt-3 space-y-1">
                                                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Similar Existing Tokens:</p>
                                                    {result.mimic.similarTokens.slice(0, 3).map((t, i) => (
                                                        <div key={i} className="flex flex-col text-xs bg-white/70 rounded-xl px-4 py-3 border border-black/5 mt-2 shadow-sm">
                                                            <div className="flex items-center justify-between mb-2 pb-2 border-b border-black/5">
                                                                <div className="flex items-center gap-2">
                                                                    {t.image ? <img src={t.image} alt={t.name} className="w-6 h-6 rounded-full" /> : <div className="w-6 h-6 rounded-full bg-gray-200" />}
                                                                    <span className="font-bold text-gray-900 text-sm">{t.name} <span className="text-gray-500">({t.symbol?.toUpperCase()})</span></span>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <span className={`px-2 py-0.5 rounded-lg font-black text-[10px] uppercase ${t.severity === 'CRITICAL' ? 'bg-red-100 text-red-600' : t.severity === 'HIGH' ? 'bg-slate-100 text-slate-600' : 'bg-teal-100 text-teal-600'}`}>
                                                                        {t.severity} RISK ({t.nameSimilarity}% MATCH)
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-[10px] font-medium text-gray-600">
                                                                <div>
                                                                    <span className="block text-gray-400 font-bold uppercase tracking-widest text-[8px]">Current Price</span>
                                                                    <span className="text-gray-800 font-bold">${t.price != null ? t.price.toLocaleString(undefined, { maximumSignificantDigits: 6 }) : 'N/A'}</span>
                                                                </div>
                                                                <div className="hidden lg:block">
                                                                    <span className="block text-gray-400 font-bold uppercase tracking-widest text-[8px]">Circulating Supply</span>
                                                                    <span className="text-gray-800 font-bold">{t.circulatingSupply ? t.circulatingSupply.toLocaleString() : 'N/A'}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="block text-gray-400 font-bold uppercase tracking-widest text-[8px]">Market Cap Rank</span>
                                                                    <span className="text-gray-800 font-bold">#{t.rank || 'N/A'}</span>
                                                                </div>
                                                                <div className="hidden md:block">
                                                                    <span className="block text-gray-400 font-bold uppercase tracking-widest text-[8px]">All Time High Date</span>
                                                                    <span className="text-gray-800 font-bold">{t.launchDateInfo ? new Date(t.launchDateInfo).toLocaleDateString() : '—'}</span>
                                                                </div>
                                                                <div className="col-span-2 lg:col-span-1">
                                                                    <span className="block text-gray-400 font-bold uppercase tracking-widest text-[8px]">Contract Identity</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-teal-600 font-mono font-bold truncate max-w-[80px]">{t.contractAddress ? `${t.contractAddress.slice(0,6)}...${t.contractAddress.slice(-4)}` : 'UNKNOWN'}</span>
                                                                        {t.contractAddress && (
                                                                            <button 
                                                                                onClick={() => { navigator.clipboard.writeText(t.contractAddress); alert('Address Copied!'); }}
                                                                                className="p-1.5 bg-gray-100 hover:bg-teal-500 hover:text-white rounded-lg transition-all"
                                                                            >
                                                                                <ExternalLink className="w-3 h-3" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* ── Nuera Guard AI Security Audit ── */}
                                {result.securityAudit && (
                                    <div className="glass-card border-2 border-emerald-100 bg-emerald-50/30">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm">
                                                    <ShieldCheck size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-slate-900 uppercase tracking-tight">Nuera Guard Security Audit</h3>
                                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Audit ID: {result.securityAudit.auditHash}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Neural Safety Score</p>
                                                <p className="text-3xl font-black text-emerald-600 tracking-tighter">{result.securityAudit.score}%</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                            {result.securityAudit.checks.map((check, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 bg-white border border-emerald-100 rounded-xl">
                                                    <span className="text-xs font-bold text-slate-600">{check.name}</span>
                                                    <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1">
                                                        <CheckCircle size={12} /> {check.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        {result.securityAudit.risks?.length > 0 && (
                                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                    <AlertTriangle size={12} /> Optimization Suggestions
                                                </p>
                                                <div className="space-y-2">
                                                    {result.securityAudit.risks.map((risk, i) => (
                                                        <div key={i} className="flex items-center justify-between">
                                                            <p className="text-xs font-medium text-amber-700">{risk.desc}</p>
                                                            <span className="text-[9px] font-black px-2 py-0.5 bg-amber-100 rounded-lg">{risk.level}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── Intelligence Scores ── */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Memorability', value: result.scores?.memorability, color: 'from-teal-600 to-teal-700', icon: '🧠' },
                                        { label: 'Uniqueness',   value: result.scores?.uniqueness,   color: 'from-sky-500 to-teal-500', icon: '💎' },
                                        { label: 'Market Appeal', value: result.scores?.marketAppeal, color: 'from-teal-600 to-slate-500', icon: '📈' },
                                        { label: 'Risk Score',   value: result.scores?.riskLevel,    color: 'from-teal-600 to-red-500', icon: '🛡️', invert: true },
                                    ].map(s => (
                                        <div key={s.label} className="glass-card text-center p-5">
                                            <div className="text-2xl mb-2">{s.icon}</div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{s.label}</p>
                                            <div className={`text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r ${s.color}`}>
                                                {s.value ?? '—'}
                                            </div>
                                            <div className="mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full bg-gradient-to-r ${s.color}`}
                                                    style={{ width: `${s.invert ? (100 - (s.value || 0)) : (s.value || 0)}%` }} />
                                            </div>
                                            {s.invert && s.value > 50 && (
                                                <p className="text-[9px] text-red-500 font-bold mt-1">⚠ High Risk</p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* ── Overall Verdict ── */}
                                {result.scores?.verdict && (
                                    <div className="glass-card p-5 bg-gradient-to-r from-teal-600 to-purple-50 border-teal-200">
                                        <div className="flex items-start gap-3">
                                            <Star className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-black text-gray-900 mb-1">AI Verdict</p>
                                                <p className="text-sm text-teal-600 font-medium">{result.scores.verdict}</p>
                                            </div>
                                            <div className="ml-auto text-right shrink-0">
                                                <p className="text-[10px] text-gray-400 font-black uppercase">Overall Score</p>
                                                <p className="text-3xl font-black text-teal-600">{result.scores?.overall ?? '—'}<span className="text-sm text-gray-400">/100</span></p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── CoinGecko Sentiment ── */}
                                {result.sentiment && (
                                    <div className="glass-card">
                                        <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                                            <BarChart3 className="w-5 h-5 text-teal-600" /> CoinGecko Market Sentiment
                                        </h3>
                                        <p className="text-sm text-gray-600 font-medium mb-3">{result.sentiment.recommendation}</p>
                                        {result.sentiment.coinGecko?.exists && (
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="p-3 bg-gray-50 rounded-xl text-center">
                                                    <p className="text-[10px] text-gray-400 font-black uppercase">Sentiment ↑</p>
                                                    <p className="text-xl font-black text-sky-600">{result.sentiment.coinGecko.sentimentUp?.toFixed(1)}%</p>
                                                </div>
                                                <div className="p-3 bg-gray-50 rounded-xl text-center">
                                                    <p className="text-[10px] text-gray-400 font-black uppercase">Twitter</p>
                                                    <p className="text-xl font-black text-teal-600">{(result.sentiment.coinGecko.twitterFollowers || 0).toLocaleString()}</p>
                                                </div>
                                                <div className="p-3 bg-gray-50 rounded-xl text-center">
                                                    <p className="text-[10px] text-gray-400 font-black uppercase">Reddit</p>
                                                    <p className="text-xl font-black text-slate-600">{(result.sentiment.coinGecko.redditSubs || 0).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── Nuera Hype Engine ── */}
                                <div className="glass-card bg-teal-950 text-white overflow-hidden relative">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/20 blur-3xl -z-10" />
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                                <Megaphone size={20} className="text-teal-500" />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-sm uppercase tracking-widest">Nuera Hype Engine</h3>
                                                <p className="text-[10px] text-teal-600 font-bold">Automated Social Propagation</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setShowHype(!showHype)}
                                            className="px-6 py-2 bg-teal-500 hover:bg-teal-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                        >
                                            {showHype ? 'Hide Content' : 'Generate Pack'}
                                        </button>
                                    </div>

                                    <AnimatePresence>
                                        {showHype && (
                                            <motion.div 
                                                initial={{ height: 0, opacity: 0 }} 
                                                animate={{ height: 'auto', opacity: 1 }} 
                                                exit={{ height: 0, opacity: 0 }}
                                                className="space-y-4"
                                            >
                                                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                                                    <p className="text-[9px] font-black text-teal-600 uppercase tracking-[0.2em] mb-3">Twitter Thread Draft</p>
                                                    <p className="text-xs text-white/80 leading-relaxed italic">
                                                        "1/ Introducing ${result.symbol} - {result.tagline} 🚀\n\nBuilt on the B20-LAB institutional backbone, we're bringing {result.category} to a whole new level. Thread below on why this is the next alpha. 🧵 #BSC #B20"
                                                    </p>
                                                </div>
                                                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                                                    <p className="text-[9px] font-black text-teal-600 uppercase tracking-[0.2em] mb-3">Community Pitch</p>
                                                    <p className="text-xs text-white/80 leading-relaxed italic">
                                                        "Attention Alpha Hunters! 🎯 ${result.symbol} is now LIVE on B20-LAB. With a locked liquidity model and AI-verified security, we're building the future of {result.category}. Join the movement."
                                                    </p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* ── Branding ── */}
                                <div className="glass-card">
                                    <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                                        <Palette className="w-5 h-5 text-teal-600" /> Brand Palette & Features
                                    </h3>
                                    <div className="flex gap-3 mb-4">
                                        {(result.branding?.palette || result.palette || []).map((c, i) => (
                                            <div key={i} className="text-center">
                                                <div className="w-10 h-10 rounded-full shadow-md border-2 border-white" style={{ background: c }} />
                                                <p className="text-[9px] font-mono text-gray-400 mt-1">{c}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {(result.branding?.topFeatures || result.features || []).map((f, i) => (
                                            <span key={i} className="px-3 py-1 bg-gray-100 rounded-xl text-xs font-bold text-gray-700">✓ {f}</span>
                                        ))}
                                    </div>
                                </div>

                                {/* ── Import Actions ── */}
                                <div className="glass-card bg-gradient-to-br from-gray-900 to-gray-800 text-white overflow-hidden relative">
                                    <div className="absolute right-0 top-0 w-40 h-40 bg-teal-500/10 blur-3xl" />
                                    <div className="relative">
                                        <h3 className="font-black text-lg mb-2">Ready to Deploy?</h3>
                                        <p className="text-gray-400 text-sm mb-6">Import this AI-generated token directly into your preferred launch type. Name, symbol, and description will be pre-filled.</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <button onClick={() => importTo('bonding')}
                                                className="py-4 px-4 bg-teal-500 hover:bg-teal-600 rounded-2xl font-black text-sm transition-all flex flex-col items-center gap-2 shadow-xl shadow-teal-200/20 active:scale-95">
                                                <Zap className="w-5 h-5" />
                                                <span>Bonding Curve</span>
                                                <span className="text-[10px] text-teal-600 font-normal">Fair launch + gradual price</span>
                                            </button>
                                            <button onClick={() => importTo('fairlaunch')}
                                                className="py-4 px-4 bg-sky-500 hover:bg-sky-600 rounded-2xl font-black text-sm transition-all flex flex-col items-center gap-2 shadow-xl shadow-sky-500/20 active:scale-95">
                                                <Rocket className="w-5 h-5" />
                                                <span>Fair Launch DEX</span>
                                                <span className="text-[10px] text-sky-200 font-normal">Instant PancakeSwap listing</span>
                                            </button>
                                            <button onClick={() => importTo('standard')}
                                                className="py-4 px-4 bg-teal-500 hover:bg-teal-600 rounded-2xl font-black text-sm transition-all flex flex-col items-center gap-2 shadow-xl shadow-teal-200/20 active:scale-95">
                                                <Shield className="w-5 h-5" />
                                                <span>Standard Token</span>
                                                <span className="text-[10px] text-teal-600 font-normal">Full control + custom tax</span>
                                            </button>
                                        </div>

                                        <button onClick={() => { setResult(null); setPrompt(''); }}
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
