'use client';

import Navbar from '@/components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp, Clock, Rocket, Search, Flame,
    ArrowRightLeft, Grid, List, Copy, CheckCircle2, Zap, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export function formatPrice(num) {
    if (!num) return <span className="font-mono">0.00000000</span>;
    let s = Number(num).toFixed(10).replace(/0+$/, '');
    if (s.endsWith('.')) s += '00';
    const match = s.match(/^(0\.0+)(\d*)$/);
    if (match) {
        return (
            <span className="font-mono flex items-baseline tracking-tight">
                <span className="opacity-40">{match[1]}</span>
                <span>{match[2]}</span>
            </span>
        );
    }
    return <span className="font-mono">{s}</span>;
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60)    return `${diff}s ago`;
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function formatSupply(raw) {
    let n = Number(raw) || 0;
    if (n > 1e15) n = n / 1e18;
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return n.toString();
}

function BondingGraph({ progress }) {
    const pct = Math.min(Number(progress) || 0, 100);
    const filled = Math.round((pct / 100) * 10);
    const color = pct >= 90 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#10b981';
    return (
        <div className="flex items-center gap-[4px] bg-black/5 p-1 rounded-lg">
            {Array.from({ length: 10 }, (_, i) => (
                <div key={i}
                    style={{ 
                        backgroundColor: i < filled ? color : 'rgba(0,0,0,0.05)', 
                        height: 8 + (i < filled ? Math.min(i, 2) : 0),
                        boxShadow: i < filled ? `0 0 10px ${color}44` : 'none'
                    }}
                    className="w-full rounded-full transition-all duration-500"
                />
            ))}
        </div>
    );
}

function TokenRow({ token, index, trend, launchType }) {
    const [copied, setCopied] = useState(false);
    const addr = token.contract_address || token.token_address || '';
    const shortAddr = addr ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : '—';
    const progress = token.bonding_progress || 0;
    const priceBnb = parseFloat(token.price_bnb || 0.0000001);
    const progressColor = progress >= 90 ? 'text-red-500 bg-red-50 border-red-200'
        : progress >= 50 ? 'text-amber-500 bg-amber-50 border-amber-200'
        : 'text-emerald-600 bg-emerald-50 border-emerald-200';

    const isPremium = token.trust_status === 'Premium Token';
    const isDelisted = launchType === 'delisted';

    return (
        <Link href={addr ? `/token/${addr}` : '#'}>
            <motion.div
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04 }}
                whileHover={{ x: 8, scale: 1.01 }}
                className={`backdrop-blur-md border rounded-[2rem] px-6 py-5 cursor-pointer transition-all shadow-sm flex items-center gap-6 group
                    ${isDelisted ? 'bg-gray-100/50 border-gray-300 opacity-60 grayscale hover:grayscale-0 hover:opacity-100' : 'bg-white/80 border-black/5 hover:shadow-2xl hover:shadow-rose-500/10 hover:border-rose-300'}
                    ${isPremium && !isDelisted ? 'border-amber-300 shadow-amber-500/20 bg-gradient-to-r from-amber-50/50 to-white/80' : ''}
                `}
            >
                <div className="relative shrink-0">
                    <motion.div whileHover={{ rotate: 12, scale: 1.1 }}
                        className="w-16 h-16 rounded-[1.2rem] bg-gradient-to-br from-rose-500 to-orange-500 p-[2px] shadow-xl shadow-rose-500/20">
                        <div className="w-full h-full bg-white rounded-[1.1rem] flex items-center justify-center overflow-hidden">
                            {token.logo_url
                                ? <img src={token.logo_url} alt={token.name} className="w-full h-full object-cover"
                                    onError={e => { e.target.onerror = null; e.target.parentElement.innerHTML = '<span class="text-2xl">✨</span>'; }} />
                                : <span className="text-2xl">✨</span>}
                        </div>
                    </motion.div>
                    <div className="absolute -top-1 -right-1 flex gap-1">
                        {isDelisted ? (
                             <div className="w-6 h-6 bg-gray-600 rounded-full border-2 border-white flex items-center justify-center shadow-lg icon-3d">
                                 <span className="text-[10px]">💀</span>
                             </div>
                        ) : launchType === 'fair' ? (
                            <div className="w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg icon-3d">
                                <Zap className="w-3 h-3 text-white fill-current" />
                            </div>
                        ) : (
                            <div className="w-6 h-6 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg icon-3d">
                                <Flame className="w-3 h-3 text-white fill-current" />
                            </div>
                        )}
                        {isPremium && !isDelisted && (
                            <div className="w-6 h-6 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg animate-bounce icon-3d absolute -top-4 -right-3">
                                <span className="text-[10px]">👑</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="font-black text-gray-900 text-lg tracking-tight truncate">{token.name}</span>
                        <span className="text-xs font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200/50">${token.symbol}</span>
                        {token.trust_status && (
                            <div className={`px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-tighter ${
                                token.trust_status === 'Premium Token' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                token.trust_status === 'Highly Trusted' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                token.trust_status === 'Scam' ? 'bg-red-500 text-white border-red-500' :
                                'bg-blue-500/10 text-blue-600 border-blue-500/20'
                            }`}>
                                {token.trust_status}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 overflow-hidden">
                        <span className="font-mono text-[10px] text-gray-400 font-bold bg-gray-50 px-2 py-0.5 rounded-md border border-black/5">{shortAddr}</span>
                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none">• {timeAgo(token.created_at)}</span>
                    </div>
                </div>

                <div className="hidden lg:block w-32 shrink-0">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1.5 opacity-60 italic">Market Value</p>
                    <div className={`font-black text-lg flex items-center gap-1.5 transition-colors duration-500 ${trend === 'up' ? 'text-emerald-500 animate-pulse' : trend === 'down' ? 'text-red-500' : 'text-gray-900'}`}>
                        {formatPrice(priceBnb)}
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">BNB</p>
                </div>

                <div className="w-48 shrink-0">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest opacity-60 italic">
                            {isDelisted ? 'Delisted' : launchType === 'fair' ? 'Listing Info' : 'Bonding Status'}
                        </p>
                        {!isDelisted && launchType !== 'fair' && (
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${progressColor}`}>
                                {progress.toFixed(1)}%
                            </span>
                        )}
                    </div>
                    {isDelisted ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-200 border border-gray-300 rounded-xl">
                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-tighter">Inactive Protocol</span>
                        </div>
                    ) : launchType === 'bonding' ? (
                        <BondingGraph progress={progress} />
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200/50 rounded-xl">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">PancakeSwap Listed</span>
                        </div>
                    )}
                </div>

                <div className="hidden sm:flex w-12 h-12 rounded-full border border-black/5 items-center justify-center group-hover:bg-rose-500 group-hover:text-white group-hover:border-rose-500 transition-all shadow-sm">
                    <ArrowRightLeft className="w-4 h-4" />
                </div>
            </motion.div>
        </Link>
    );
}

function TokenGridCard({ token, index, trend, launchType }) {
    const addr = token.contract_address || token.token_address || '';
    const progress = token.bonding_progress || 0;
    const priceBnb = parseFloat(token.price_bnb || 0.0000001);

    const isPremium = token.trust_status === 'Premium Token';
    const isDelisted = launchType === 'delisted';

    return (
        <Link href={addr ? `/token/${addr}` : '#'}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className={`relative border rounded-[3rem] overflow-hidden cursor-pointer transition-all group p-6 shadow-sm
                    ${isDelisted ? 'bg-gray-100 border-gray-300 opacity-70 grayscale hover:grayscale-0 hover:opacity-100' : 'bg-white border-black/5 hover:shadow-3xl hover:shadow-rose-500/10'}
                    ${isPremium && !isDelisted ? 'border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.2)] bg-gradient-to-b from-amber-50/30 to-white' : ''}
                `}
            >
                <div className={`absolute top-0 left-0 w-full h-24 -z-10 ${isDelisted ? 'bg-gradient-to-br from-gray-500/10 to-transparent' : 'bg-gradient-to-br from-rose-500/10 via-orange-500/5 to-transparent'}`} />
                
                <div className="flex items-start justify-between mb-6">
                    <div className="relative">
                        <motion.div whileHover={{ scale: 1.1, rotate: -5 }}
                            className="w-20 h-20 rounded-[2rem] bg-white border-4 border-white shadow-2xl overflow-hidden flex items-center justify-center">
                            {token.logo_url ? <img src={token.logo_url} alt={token.name} className="w-full h-full object-cover"
                                onError={e => { e.target.onerror = null; e.target.parentElement.innerHTML = '<span class="text-3xl">🧩</span>'; }} />
                                : <span className="text-3xl">🧩</span>}
                        </motion.div>
                        <div className={`absolute -bottom-2 -right-2 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-lg transition-colors
                            ${isDelisted ? 'bg-gray-700' : launchType === 'fair' ? 'bg-emerald-600' : 'bg-black group-hover:bg-rose-500'}
                        `}>
                            {isDelisted ? 'Delisted' : launchType === 'fair' ? 'Live' : 'Seed'}
                        </div>
                        {isPremium && !isDelisted && (
                            <div className="absolute -top-4 -right-4 bg-amber-500 border-2 border-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg animate-bounce z-10">
                                <span className="text-xs">👑</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-black text-xl text-gray-900 tracking-tight truncate">{token.name}</h3>
                            <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">${token.symbol}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                             {token.trust_status && (
                                <div className={`px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-tighter ${
                                    token.trust_status === 'Premium Token' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                    token.trust_status === 'Highly Trusted' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                    token.trust_status === 'Scam' ? 'bg-red-500 text-white border-red-500' :
                                    'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                }`}>
                                    {token.trust_status}
                                </div>
                            )}
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-loose">Joined {timeAgo(token.created_at)}</p>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 border border-black/5 rounded-2xl">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Market Value</span>
                            {trend === 'up' && <span className="text-[10px] font-black text-emerald-500 flex items-center gap-1">Trend UP <ArrowUpRight className="w-3 h-3" /></span>}
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-gray-900 tracking-tighter">{formatPrice(priceBnb)}</span>
                            <span className="text-xs font-bold text-gray-400">BNB</span>
                        </div>
                    </div>

                    {isDelisted && (
                        <div className="flex items-center gap-3 p-3 bg-gray-200 border border-gray-300 rounded-2xl">
                            <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center shrink-0">
                                <span className="text-[10px]">💀</span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black text-gray-700 uppercase tracking-tighter leading-none">Delisted</p>
                                <p className="text-[9px] text-gray-500 truncate mt-0.5">Trading is suspended</p>
                            </div>
                        </div>
                    )}
                    
                    {!isDelisted && launchType === 'bonding' && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Growth Curve</p>
                                <span className={`text-[10px] font-black flex items-center gap-1 ${progress >= 90 ? 'text-red-500' : 'text-emerald-500'}`}>
                                    <TrendingUp className="w-3 h-3" /> {progress.toFixed(1)}%
                                </span>
                            </div>
                            <BondingGraph progress={progress} />
                        </div>
                    )}
                    
                    {!isDelisted && launchType === 'fair' && (
                        <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30">
                                <Zap className="w-4 h-4 text-white fill-current" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter leading-none">PancakeSwap Listed</p>
                                <p className="text-[9px] text-emerald-500/70 truncate mt-0.5">Ready for high-volume trade</p>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </Link>
    );
}

export default function Launchpad() {
    const [launchType, setLaunchType] = useState('bonding'); // 'bonding' | 'fair' | 'delisted'
    const [view, setView]         = useState('list');
    const [search, setSearch]     = useState('');
    const [sortBy, setSortBy]     = useState('recent');
    const [tokens, setTokens]     = useState([]);
    const [loading, setLoading]   = useState(true);
    const [trends, setTrends]     = useState({});
    const [trustFilter, setTrustFilter] = useState('all');

    useEffect(() => {
        const fetchTokens = async () => {
            try {
                const { data } = await axios.get(`${API_URL}/tokens`);
                const fresh = Array.isArray(data) ? data : [];
                setTokens(prev => {
                    setTrends(tr => {
                        const newTr = { ...tr };
                        fresh.forEach(ft => {
                            const addr = ft.contract_address || ft.token_address;
                            const pt = prev.find(p => (p.contract_address || p.token_address) === addr);
                            if (pt) {
                                const oldP = parseFloat(pt.price_bnb || 0);
                                const newP = parseFloat(ft.price_bnb || 0);
                                if (newP > oldP) newTr[addr] = 'up';
                                else if (newP < oldP) newTr[addr] = 'down';
                            }
                        });
                        return newTr;
                    });
                    return fresh;
                });
            } catch { setTokens([]); } finally { setLoading(false); }
        };
        fetchTokens();
        const iv = setInterval(fetchTokens, 10000);
        return () => clearInterval(iv);
    }, []);

    // All non-delisted tokens go to bonding tab (they're on the curve)
    // Tokens with trading_enabled=1 also show in the PancakeSwap/Fair tab
    const delistedTokens = useMemo(() => tokens.filter(t => t.is_delisted), [tokens]);
    const bondingTokens  = useMemo(() => tokens.filter(t => !t.is_delisted), [tokens]);
    const fairTokens     = useMemo(() => tokens.filter(t => (t.trading_enabled === 1 || t.trading_enabled === true) && !t.is_delisted), [tokens]);
    const displayTokens  = launchType === 'bonding' ? bondingTokens : launchType === 'fair' ? fairTokens : delistedTokens;

    const filtered = useMemo(() => {
        let list = [...displayTokens];
        if (trustFilter !== 'all') {
            list = list.filter(t => (t.trust_status || 'Newly Launched Token').toLowerCase().includes(trustFilter.toLowerCase()));
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(t => t.name?.toLowerCase().includes(q) || t.symbol?.toLowerCase().includes(q));
        }
        if (sortBy === 'recent') list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        else list.sort((a, b) => (b.bonding_progress || 0) - (a.bonding_progress || 0));
        return list;
    }, [displayTokens, search, sortBy, trustFilter]);

    const trending = [...bondingTokens].sort((a, b) => (b.bonding_progress || 0) - (a.bonding_progress || 0)).slice(0, 4);
    const recent   = [...tokens].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4);
    const nearMig  = bondingTokens.filter(t => (t.bonding_progress || 0) >= 70);

    return (
        <main className="min-h-screen paw-pattern">
            <Navbar />

            <section className="pt-28 pb-24 px-4 md:px-8 max-w-7xl mx-auto">

                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-12 text-center md:text-left relative">
                    <div className="absolute -top-24 -left-24 w-64 h-64 bg-rose-500/10 blur-[100px] rounded-full pointer-events-none" />
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                        <div>
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-rose-500/5 border border-rose-500/10 rounded-full mb-4">
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Live Ecosystem</span>
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tighter text-gray-900">
                                Trade the <span className="text-red-gradient">Future</span>
                            </h1>
                            <p className="text-gray-500 text-lg font-medium max-w-xl leading-relaxed">
                                Join the next generation of tokens on BSC. AI-verified, secondary-market ready, and 100% fair. Discover premium assets today.
                            </p>
                        </div>
                        <Link href="/create">
                            <motion.button 
                                whileHover={{ scale: 1.05, y: -4 }} 
                                whileTap={{ scale: 0.95 }}
                                className="group relative px-10 py-5 bg-gray-900 text-white font-black rounded-[2rem] flex items-center gap-3 overflow-hidden shadow-2xl transition-all hover:shadow-rose-500/20"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-rose-600 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <Rocket className="w-5 h-5 relative z-10 icon-3d" /> 
                                <span className="relative z-10">Launch Your Asset</span>
                            </motion.button>
                        </Link>
                    </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    {/* ── HOLOGRAPHIC STATUS HUB ─────────────────────────────────────────── */}
                    <div className="relative mb-12">
                        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 via-amber-500/5 to-emerald-500/5 blur-3xl opacity-50" />
                        
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            transition={{ delay: 0.2 }}
                            className="relative bg-white/60 backdrop-blur-3xl border border-white/50 rounded-[3.5rem] p-2 shadow-2xl shadow-black/5"
                        >
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                                {[
                                    { label: 'Total Active',   value: tokens.filter(t=>!t.is_delisted).length,       icon: '💎', color: 'bg-rose-500', glow: 'shadow-rose-500/40' },
                                    { label: 'Bonding Curve',  value: bondingTokens.length, icon: '📈', color: 'bg-blue-500', glow: 'shadow-blue-500/40' },
                                    { label: 'Fair Launch',    value: fairTokens.length,    icon: '⚡', color: 'bg-emerald-500', glow: 'shadow-emerald-500/40' },
                                    { label: 'Delisted', value: delistedTokens.length,       icon: '💀', color: 'bg-gray-800', glow: 'shadow-gray-900/40' },
                                ].map((s, i) => (
                                    <div key={i} className="group relative flex items-center gap-6 p-6 rounded-[3rem] hover:bg-white transition-all duration-500 border border-transparent hover:border-black/5 hover:shadow-xl hover:shadow-black/5">
                                        <div className={`w-16 h-16 rounded-[1.8rem] ${s.color.includes('from') ? 'bg-gradient-to-br ' + s.color : s.color} flex items-center justify-center text-3xl shadow-2xl ${s.glow} group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 icon-3d`}>
                                            {s.icon}
                                        </div>
                                        <div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-4xl font-black text-gray-900 tracking-tighter leading-none mb-1">{s.value}</span>
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            </div>
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none">{s.label}</div>
                                        </div>
                                        {i < 3 && <div className="hidden lg:block absolute -right-1 top-1/2 -translate-y-1/2 w-px h-12 bg-black/5" />}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* ── Toggle: Bonding Curve / Fair Launch / Delisted ── */}
                    <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                        <div className="bg-white/80 backdrop-blur-md border border-black/10 rounded-2xl p-1.5 flex flex-wrap gap-1 shadow-sm">
                            <button
                                onClick={() => setLaunchType('bonding')}
                                className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
                                    launchType === 'bonding'
                                        ? 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/30'
                                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                                }`}
                            >
                                <TrendingUp className="w-4 h-4" /> Bonding Curve
                                {launchType === 'bonding' && <motion.div layoutId="toggle-indicator" className="absolute inset-0 rounded-xl" />}
                            </button>
                            <button
                                onClick={() => setLaunchType('fair')}
                                className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
                                    launchType === 'fair'
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30'
                                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                                }`}
                            >
                                <Zap className="w-4 h-4" /> Fair Launch
                                {launchType === 'fair' && <motion.div layoutId="toggle-indicator" className="absolute inset-0 rounded-xl" />}
                            </button>
                            <button
                                onClick={() => setLaunchType('delisted')}
                                className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
                                    launchType === 'delisted'
                                        ? 'bg-gradient-to-r from-gray-700 to-gray-900 text-white shadow-lg shadow-gray-900/30'
                                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                                }`}
                            >
                                <Clock className="w-4 h-4" /> Delisted
                                {launchType === 'delisted' && <motion.div layoutId="toggle-indicator" className="absolute inset-0 rounded-xl" />}
                            </button>
                        </div>
                    </div>



                    {/* Search + view controls */}
                    <div className="relative mb-5">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder={`Search ${launchType === 'bonding' ? 'bonding curve' : 'fair launch'} tokens…`}
                            className="w-full pl-12 pr-10 py-3.5 bg-white border border-black/10 rounded-2xl shadow-sm focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/10 transition-all text-gray-900 placeholder-gray-400 font-medium" />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-800 text-xl">×</button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 mb-6">
                        <select value={trustFilter} onChange={e => setTrustFilter(e.target.value)}
                            className="px-4 py-2.5 text-xs font-black text-gray-600 border border-black/10 rounded-xl bg-white focus:outline-none shadow-sm uppercase tracking-widest">
                            <option value="all">🛡️ Filter: All Trust Levels</option>
                            <option value="Premium">💎 Premium Only</option>
                            <option value="Trusted">✅ Highly Trusted</option>
                            <option value="Newly">🆕 Newly Launched</option>
                            <option value="Good">👍 Good To Buy</option>
                            <option value="Scam">⚠ Potential Scam</option>
                        </select>
                        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                            className="px-4 py-2.5 text-xs font-black text-gray-600 border border-black/10 rounded-xl bg-white focus:outline-none shadow-sm uppercase tracking-widest">
                            <option value="recent">Sort: Most Recent</option>
                            <option value="popular">Sort: Most Progress</option>
                        </select>
                        <div className="flex bg-black/5 p-1 rounded-xl border border-black/10 gap-0.5">
                            <button onClick={() => setView('list')} className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-gray-500'}`}><List className="w-4 h-4" /></button>
                            <button onClick={() => setView('grid')} className={`p-2 rounded-lg transition-all ${view === 'grid' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-gray-500'}`}><Grid className="w-4 h-4" /></button>
                        </div>
                    </div>
                </motion.div>

                {/* Main layout */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-24 gap-3">
                                <div className="w-10 h-10 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin" />
                                <p className="text-sm text-gray-400 font-semibold">Loading tokens…</p>
                            </div>
                        ) : (
                            <AnimatePresence mode="wait">
                                {filtered.length === 0 ? (
                                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                        className="bg-white border border-black/8 rounded-2xl py-24 text-center shadow-sm">
                                        <Rocket className="w-12 h-12 mx-auto mb-4 text-gray-200" />
                                        <p className="font-black text-xl text-gray-700">{search ? 'No tokens found' : `No ${launchType} tokens yet`}</p>
                                        <p className="text-sm text-gray-400 mt-1 mb-6">{search ? 'Try a different name or symbol' : 'Be the first to launch!'}</p>
                                        {!search && launchType !== 'delisted' && (
                                            <Link href={launchType === 'fair' ? '/fair-launch' : '/create'}>
                                                <button className="px-8 py-3 bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold rounded-xl shadow-lg">
                                                    🚀 {launchType === 'bonding' ? 'Launch Bonding Curve Token' : 'Create Fair Launch Token'}
                                                </button>
                                            </Link>
                                        )}
                                    </motion.div>
                                ) : view === 'list' ? (
                                    <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                                        {filtered.map((token, i) => (
                                            <TokenRow key={i} token={token} index={i}
                                                trend={trends[token.contract_address || token.token_address]}
                                                launchType={launchType} />
                                        ))}
                                    </motion.div>
                                ) : (
                                    <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {filtered.map((token, i) => (
                                            <TokenGridCard key={i} token={token} index={i}
                                                trend={trends[token.contract_address || token.token_address]}
                                                launchType={launchType} />
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <motion.div 
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                            className="bg-white/70 backdrop-blur-xl border border-black/5 rounded-[2.5rem] p-7 shadow-xl shadow-black/5 overflow-hidden relative"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <TrendingUp className="w-24 h-24 rotate-12" />
                            </div>
                            <h3 className="text-xs font-black mb-6 flex items-center gap-3 uppercase tracking-[0.2em] text-gray-400">
                                <div className="w-6 h-6 rounded-lg bg-rose-500 flex items-center justify-center icon-3d">
                                    <TrendingUp className="w-3.5 h-3.5 text-white" />
                                </div>
                                Top Velocity
                            </h3>
                            {trending.length === 0
                                ? <p className="text-xs text-gray-400 italic">Scanning tokens…</p>
                                : trending.map((t, i) => (
                                    <Link key={i} href={`/token/${t.contract_address || t.token_address}`}>
                                        <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-rose-500/5 transition-all cursor-pointer mb-3 border border-transparent hover:border-rose-500/10 group">
                                            <span className="text-xl font-black text-gray-200 group-hover:text-rose-500 transition-colors w-6">0{i + 1}</span>
                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center overflow-hidden border border-black/5 shadow-sm shrink-0">
                                                {t.logo_url ? <img src={t.logo_url} alt={t.name} className="w-full h-full object-cover" /> : <span className="text-sm">🪙</span>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-sm text-gray-900 truncate tracking-tight">{t.name}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-rose-500 rounded-full" style={{ width: `${t.bonding_progress || 0}%` }} />
                                                    </div>
                                                    <span className="text-[10px] font-black text-rose-500">{t.bonding_progress || 0}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                            className="bg-amber-500/5 border border-amber-500/10 rounded-[2.5rem] p-7"
                        >
                            <h3 className="text-xs font-black mb-6 flex items-center gap-3 uppercase tracking-[0.2em] text-amber-600">
                                <div className="w-6 h-6 rounded-lg bg-amber-500 flex items-center justify-center icon-3d">
                                    <Clock className="w-3.5 h-3.5 text-white" />
                                </div>
                                Just Dropped
                            </h3>
                            {recent.length === 0 ? <p className="text-xs text-amber-400 italic">Waiting for launches…</p>
                                : recent.map((t, i) => (
                                    <Link key={i} href={`/token/${t.contract_address || t.token_address}`}>
                                        <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-amber-500/10 transition-all cursor-pointer mb-3">
                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-amber-500/10">
                                                {t.logo_url ? <img src={t.logo_url} alt={t.name} className="w-full h-full object-cover" /> : <span className="text-sm">🚀</span>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-sm text-gray-900 truncate tracking-tight">{t.name}</p>
                                                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">{timeAgo(t.created_at)}</p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                        </motion.div>

                        <div className="bg-white/50 backdrop-blur-md border border-black/5 rounded-[2.5rem] p-8 shadow-sm">
                            <h3 className="font-black text-rose-500 mb-4 text-xs uppercase tracking-widest">Master the Lab 💡</h3>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-gray-900">Bonding Curve</p>
                                    <p className="text-[11px] text-gray-500 leading-relaxed font-medium">Price rises algorithmically. Reaches 0.01 BNB target to auto-verify & list on PancakeSwap.</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-gray-900">Fair Launch</p>
                                    <p className="text-[11px] text-gray-500 leading-relaxed font-medium">Instant DEX deployment. 100% tokens in liquidity from block zero.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
