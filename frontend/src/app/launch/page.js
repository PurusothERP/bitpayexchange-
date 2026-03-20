'use client';

import Navbar from '@/components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp, Clock, Rocket, Search, Flame,
    ArrowRightLeft, Grid, List, Copy, CheckCircle2, Zap, ArrowUpRight, ArrowDownRight,
    Activity, ShieldCheck, Sparkles, Filter, LayoutGrid, BarChart3, ChevronRight,
    Search as SearchIcon
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

function BondingGraph({ progress }) {
    const pct = Math.min(Number(progress) || 0, 100);
    const filled = Math.round((pct / 100) * 10);
    const color = pct >= 90 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#10b981';
    return (
        <div className="flex items-center gap-[4px] bg-white/5 p-1 rounded-lg">
            {Array.from({ length: 10 }, (_, i) => (
                <div key={i}
                    style={{ 
                        backgroundColor: i < filled ? color : 'rgba(255,255,255,0.05)', 
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
    const addr = token.contract_address || token.token_address || '';
    const shortAddr = addr ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : '—';
    const progress = token.bonding_progress || 0;
    const priceBnb = parseFloat(token.price_bnb || 0.0000001);
    
    const progressColor = progress >= 90 ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
        : progress >= 50 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
        : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

    const isPremium = token.trust_status === 'Premium Token';
    const isDelisted = launchType === 'delisted';

    return (
        <Link href={addr ? `/token/${addr}` : '#'}>
            <motion.div
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04 }}
                whileHover={{ x: 8 }}
                className={`group relative backdrop-blur-3xl border rounded-[2rem] px-8 py-6 cursor-pointer transition-all flex items-center gap-8
                    ${isDelisted ? 'bg-white/5 border-white/5 opacity-60 grayscale' : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.05] hover:border-white/20 hover:shadow-2xl hover:shadow-rose-500/10'}
                    ${isPremium && !isDelisted ? 'border-amber-500/30' : ''}
                `}
            >
                {isPremium && !isDelisted && (
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent rounded-[2rem] pointer-events-none" />
                )}

                <div className="relative shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/10 to-transparent p-[1px] shadow-2xl overflow-hidden group-hover:scale-105 transition-transform">
                        <div className="w-full h-full bg-[#0a0a0a] rounded-2xl flex items-center justify-center overflow-hidden">
                            {token.logo_url
                                ? <img src={token.logo_url} alt={token.name} className="w-full h-full object-cover"
                                    onError={e => { e.target.onerror = null; e.target.parentElement.innerHTML = '<span class="text-2xl">✨</span>'; }} />
                                : <span className="text-2xl">✨</span>}
                        </div>
                    </div>
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1.5">
                        <span className="font-black text-white text-lg tracking-tight truncate">{token.name}</span>
                        <span className="text-[10px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20 uppercase tracking-widest">${token.symbol}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="font-mono text-[10px] text-gray-500 font-bold bg-white/5 px-2 py-0.5 rounded-md border border-white/5">{shortAddr}</span>
                        <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest leading-none flex items-center gap-1.5">
                            <Clock className="w-3 h-3" /> {timeAgo(token.created_at)}
                        </span>
                    </div>
                </div>

                <div className="hidden lg:block w-36 shrink-0">
                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.2em] mb-1.5">Market Cap</p>
                    <div className={`font-black text-lg flex items-center gap-1.5 ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-white'}`}>
                        {formatPrice(priceBnb)}
                        <span className="text-[9px] text-gray-600 font-bold">BNB</span>
                    </div>
                </div>

                <div className="w-56 shrink-0 hidden md:block">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.2em]">
                            {isDelisted ? 'Protocol Status' : launchType === 'fair' ? 'PancakeSwap Status' : 'Bonding Evolution'}
                        </p>
                    </div>
                    {isDelisted ? (
                        <div className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black text-gray-600 uppercase tracking-widest">Protocol Delisted</div>
                    ) : launchType === 'bonding' ? (
                        <BondingGraph progress={progress} />
                    ) : (
                        <div className="flex items-center gap-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Active & Verified</span>
                        </div>
                    )}
                </div>

                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-rose-500 group-hover:border-rose-500 transition-all active:scale-90">
                    <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white" />
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
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -8 }}
                className={`relative group rounded-[2.5rem] border overflow-hidden p-6 transition-all duration-500 backdrop-blur-3xl
                    ${isDelisted ? 'bg-white/5 border-white/5 grayscale' : 'bg-white/[0.03] border-white/10 hover:border-white/30 hover:shadow-3xl hover:shadow-rose-500/10'}
                    ${isPremium && !isDelisted ? 'border-amber-500/30' : ''}
                `}
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                
                <div className="flex items-start justify-between mb-8">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-white/15 to-transparent p-[1px] shadow-2xl">
                        <div className="w-full h-full bg-[#0a0a0a] rounded-3xl flex items-center justify-center overflow-hidden">
                            {token.logo_url ? <img src={token.logo_url} alt={token.name} className="w-full h-full object-cover" /> : <span className="text-3xl">🧩</span>}
                        </div>
                    </div>
                    {isPremium && (
                        <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/10">
                            <Sparkles className="w-5 h-5 text-amber-500" />
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="font-black text-xl text-white tracking-tight truncate">{token.name}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[9px] font-black text-rose-500 uppercase tracking-widest">${token.symbol}</div>
                             <div className="text-[9px] text-gray-600 font-black uppercase tracking-widest">• {timeAgo(token.created_at)}</div>
                        </div>
                    </div>

                    <div className="p-5 bg-white/[0.03] border border-white/5 rounded-[1.5rem] shadow-inner">
                        <div className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-2">Protocol Valuation</div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-white tracking-tighter">{formatPrice(priceBnb)}</span>
                            <span className="text-xs font-bold text-gray-600">BNB</span>
                        </div>
                    </div>

                    {!isDelisted && launchType === 'bonding' && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                                <span className="text-gray-600">Evolution</span>
                                <span className="text-emerald-400">{progress.toFixed(1)}%</span>
                            </div>
                            <BondingGraph progress={progress} />
                        </div>
                    )}

                    {!isDelisted && launchType === 'fair' && (
                        <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400"><Zap className="w-4 h-4 fill-current" /></div>
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.15em]">PancakeSwap List</span>
                        </div>
                    )}
                </div>
            </motion.div>
        </Link>
    );
}

export default function Launchpad() {
    const [launchType, setLaunchType] = useState('bonding');
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
                setTokens(fresh);
                setLoading(false);
            } catch { setTokens([]); setLoading(false); }
        };
        fetchTokens();
        const iv = setInterval(fetchTokens, 15000);
        return () => clearInterval(iv);
    }, []);

    const delistedTokens = useMemo(() => tokens.filter(t => t.is_delisted), [tokens]);
    const bondingTokens  = useMemo(() => tokens.filter(t => !t.is_delisted), [tokens]);
    const fairTokens     = useMemo(() => tokens.filter(t => (t.trading_enabled === 1 || t.trading_enabled === true) && !t.is_delisted), [tokens]);
    const displayTokens  = launchType === 'bonding' ? bondingTokens : launchType === 'fair' ? fairTokens : delistedTokens;

    const filtered = useMemo(() => {
        let list = [...displayTokens];
        if (trustFilter !== 'all') {
            list = list.filter(t => (t.trust_status || '').toLowerCase().includes(trustFilter.toLowerCase()));
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

    return (
        <main className="min-h-screen bg-[#050505] selection:bg-rose-500 selection:text-white pb-32">
            <Navbar />

            <section className="pt-32 pb-24 px-4 md:px-8 max-w-7xl mx-auto overflow-hidden">
                {/* Background Atmosphere */}
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-rose-500/5 rounded-full blur-[150px] -z-10 animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[150px] -z-10" />

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12 mb-20 relative z-10">
                    <div className="max-w-2xl">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 mb-6">
                            <div className="px-4 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-full">
                                <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                                    Global Ecosystem Active
                                </span>
                            </div>
                            <div className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">BSC Mainnet</span>
                            </div>
                        </motion.div>
                        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                            className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-8 leading-[0.9]">
                            Autonomous <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500">Launchpad</span>
                        </motion.h1>
                        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                            className="text-gray-500 text-lg font-medium leading-relaxed max-w-lg">
                            Discover high-potential assets algorithmically verified for security. Participate in the future of decentralized finance with zero compromises.
                        </motion.p>
                    </div>

                    <Link href="/create">
                        <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            className="group relative px-12 py-7 bg-white text-black font-black rounded-[2.5rem] shadow-3xl hover:shadow-rose-500/20 transition-all flex items-center gap-4 text-lg overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 opacity-0 group-hover:opacity-10 transition-opacity" />
                            <Rocket className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            DEPLOY PROTOCOL
                        </motion.button>
                    </Link>
                </div>

                {/* ── METRICS HUB ─────────────────────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16 relative z-10">
                    {[
                        { label: 'Active Liquidity', value: tokens.length, icon: <Activity className="w-6 h-6" />, color: 'rose' },
                        { label: 'Growth Curves', value: bondingTokens.length, icon: <BarChart3 className="w-6 h-6" />, color: 'blue' },
                        { label: 'Direct Listings', value: fairTokens.length, icon: <Zap className="w-6 h-6" />, color: 'emerald' },
                        { label: 'Total Verified', value: tokens.filter(t=>t.trust_status).length, icon: <ShieldCheck className="w-6 h-6" />, color: 'amber' },
                    ].map((s, i) => (
                        <div key={i} className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 backdrop-blur-3xl group hover:border-white/20 transition-all cursor-default">
                             <div className={`w-12 h-12 bg-${s.color}-500/10 border border-${s.color}-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                 <div className={`text-${s.color}-500`}>{s.icon}</div>
                             </div>
                             <div className="flex items-baseline gap-2 mb-1">
                                 <span className="text-4xl font-black text-white tracking-tighter">{s.value}</span>
                                 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                             </div>
                             <div className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">{s.label}</div>
                        </div>
                    ))}
                </motion.div>

                <div className="flex flex-col lg:flex-row gap-12 relative z-10">
                    {/* ── MAIN CONTENT ── */}
                    <div className="flex-1 space-y-8">
                        {/* Filters & Controls */}
                        <div className="space-y-6">
                            <div className="flex flex-wrap items-center justify-between gap-6">
                                <div className="p-1 bg-white/5 border border-white/10 rounded-2xl flex gap-1">
                                    {[
                                        { id: 'bonding', label: 'Bonding Curve', icon: <TrendingUp className="w-4 h-4" />, color: 'rose' },
                                        { id: 'fair', label: 'Fair Launch', icon: <Zap className="w-4 h-4" />, color: 'emerald' },
                                        { id: 'delisted', label: 'Archive', icon: <Clock className="w-4 h-4" />, color: 'gray' }
                                    ].map(type => (
                                        <button key={type.id} onClick={() => setLaunchType(type.id)}
                                            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3
                                                ${launchType === type.id ? `bg-white text-black shadow-2xl` : `text-gray-500 hover:text-white hover:bg-white/5`}
                                            `}
                                        >
                                            {type.icon} {type.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-4">
                                     <div className="p-1 bg-white/5 border border-white/10 rounded-xl flex gap-1">
                                        <button onClick={() => setView('list')} className={`p-2.5 rounded-lg transition-all ${view === 'list' ? 'bg-white text-black shadow-lg' : 'text-gray-600'}`}><List className="w-4 h-4" /></button>
                                        <button onClick={() => setView('grid')} className={`p-2.5 rounded-lg transition-all ${view === 'grid' ? 'bg-white text-black shadow-lg' : 'text-gray-600'}`}><LayoutGrid className="w-4 h-4" /></button>
                                     </div>
                                </div>
                            </div>

                            <div className="relative group">
                                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-gray-500 group-focus-within:text-white transition-colors">
                                    <SearchIcon className="w-5 h-5" />
                                </div>
                                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                    placeholder="Search by protocol name or ticker..."
                                    className="w-full pl-16 pr-8 py-6 bg-white/[0.03] border border-white/10 rounded-[2rem] font-black text-white outline-none focus:border-rose-500/50 transition-all placeholder:text-gray-700 shadow-inner" />
                            </div>

                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-xl">
                                    <Filter className="w-4 h-4 text-gray-500" />
                                    <select value={trustFilter} onChange={e => setTrustFilter(e.target.value)}
                                        className="bg-transparent outline-none text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer">
                                        <option value="all" className="bg-[#050505]">All Tiers</option>
                                        <option value="Premium" className="bg-[#050505]">Premium Assets</option>
                                        <option value="Verified" className="bg-[#050505]">Verified Only</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-xl">
                                    <BarChart3 className="w-4 h-4 text-gray-500" />
                                    <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                                        className="bg-transparent outline-none text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer">
                                        <option value="recent" className="bg-[#050505]">Recently Launched</option>
                                        <option value="popular" className="bg-[#050505]">Top Efficiency</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Token List/Grid */}
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-32 gap-6">
                                <Loader2 className="w-12 h-12 text-rose-500 animate-spin" />
                                <p className="text-xs font-black text-gray-600 uppercase tracking-widest">Compiling Assets...</p>
                            </div>
                        ) : (
                            <AnimatePresence mode="wait">
                                {filtered.length === 0 ? (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-20 border border-white/5 rounded-[3rem] bg-white/[0.02] text-center backdrop-blur-3xl">
                                        <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
                                            <SearchIcon className="w-10 h-10 text-gray-700" />
                                        </div>
                                        <h3 className="text-2xl font-black text-white mb-2">No Protocols Found</h3>
                                        <p className="text-gray-600 font-medium mb-10 text-sm">Expand your search parameters or explore other categories.</p>
                                        <button onClick={() => { setSearch(''); setTrustFilter('all'); }} className="px-10 py-4 bg-white text-black font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl">Reset Filters</button>
                                    </motion.div>
                                ) : view === 'list' ? (
                                    <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                                        {filtered.map((token, i) => (
                                            <TokenRow key={i} token={token} index={i} trend={trends[token.contract_address || token.token_address]} launchType={launchType} />
                                        ))}
                                    </motion.div>
                                ) : (
                                    <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {filtered.map((token, i) => (
                                            <TokenGridCard key={i} token={token} index={i} trend={trends[token.contract_address || token.token_address]} launchType={launchType} />
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        )}
                    </div>

                    {/* ── SIDEBAR ── */}
                    <div className="w-full lg:w-80 space-y-8">
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                            className="p-8 rounded-[2.5rem] bg-gradient-to-br from-white/5 to-white/[0.01] border border-white/10 backdrop-blur-3xl"
                        >
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                                <Sparkles className="w-3.5 h-3.5 text-rose-500" /> High Velocity
                            </h3>
                            <div className="space-y-6">
                                {trending.map((t, i) => (
                                    <Link key={i} href={`/token/${t.contract_address || t.token_address}`}>
                                        <div className="flex items-center gap-4 group">
                                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 overflow-hidden shrink-0 group-hover:scale-110 transition-transform">
                                                {t.logo_url ? <img src={t.logo_url} alt={t.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs">🪙</div>}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-black text-white truncate group-hover:text-rose-500 transition-colors uppercase tracking-tight">{t.name}</p>
                                                <div className="h-1 bg-white/5 rounded-full mt-1.5 overflow-hidden">
                                                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${t.bonding_progress || 0}%` }} />
                                                </div>
                                            </div>
                                            <span className="text-[9px] font-black text-rose-500">{Math.round(t.bonding_progress || 0)}%</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                            className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 backdrop-blur-3xl"
                        >
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                                <Clock className="w-3.5 h-3.5 text-blue-500" /> Protocol Drops
                            </h3>
                            <div className="space-y-6">
                                {recent.map((t, i) => (
                                    <Link key={i} href={`/token/${t.contract_address || t.token_address}`}>
                                        <div className="flex items-center gap-4 group">
                                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 overflow-hidden shrink-0 group-hover:scale-110 transition-transform">
                                                {t.logo_url ? <img src={t.logo_url} alt={t.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs">🚀</div>}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-black text-white truncate group-hover:text-blue-500 transition-colors uppercase tracking-tight">{t.name}</p>
                                                <p className="text-[9px] text-gray-600 font-bold uppercase mt-1 tracking-widest">{timeAgo(t.created_at)}</p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </motion.div>

                        <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-rose-500/10 to-blue-500/5 border border-white/5 backdrop-blur-3xl relative overflow-hidden group">
                             <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                             <h4 className="text-sm font-black text-white mb-3 relative z-10">B20 Lab Alpha 🧪</h4>
                             <p className="text-[11px] text-gray-500 font-medium leading-relaxed relative z-10">
                                 Unlock premium trading signals and automated execution tools by holding Lab Credits. The future is autonomous.
                             </p>
                             <button className="mt-6 w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[9px] font-black text-white uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all relative z-10">Upgrade Protocol</button>
                        </div>
                    </div>
                </div>
            </section>

            <style jsx global>{`
                .text-red-gradient {
                    background: linear-gradient(to right, #f43f5e, #fb923c, #fbbf24);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
            `}</style>
        </main>
    );
}
