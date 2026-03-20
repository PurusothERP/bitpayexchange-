'use client';

import Navbar from '@/components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp, Clock, Rocket, Search, Flame,
    ArrowRightLeft, Grid, List, Copy, CheckCircle2, Zap, ArrowUpRight, ArrowDownRight,
    Activity, ShieldCheck, Sparkles, Filter, LayoutGrid, BarChart3, ChevronRight,
    Search as SearchIcon, Loader2, Info, Users, Wallet
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
    const color = pct >= 90 ? '#f43f5e' : pct >= 60 ? '#f59e0b' : '#10b981'; // Rose, Amber, Emerald
    return (
        <div className="flex items-center gap-[4px] bg-black/5 p-1 rounded-lg w-full max-w-[120px]">
            {Array.from({ length: 10 }, (_, i) => (
                <div key={i}
                    style={{ 
                        backgroundColor: i < filled ? color : 'rgba(0,0,0,0.05)', 
                        height: 8 + (i < filled ? Math.min(i, 2) : 0),
                        boxShadow: i < filled ? `0 0 8px ${color}44` : 'none'
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
    
    const isPremium = token.trust_status === 'Premium Token';
    const isDelisted = launchType === 'delisted';

    return (
        <Link href={addr ? `/token/${addr}` : '#'}>
            <motion.div
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                whileHover={{ y: -4, shadow: '0 10px 40px -10px rgba(0,0,0,0.1)' }}
                className={`group relative bg-white border border-gray-100 rounded-[2.5rem] p-6 cursor-pointer transition-all flex items-center gap-6 shadow-sm hover:border-rose-200
                    ${isDelisted ? 'opacity-60 grayscale' : ''}
                    ${isPremium ? 'border-amber-200' : ''}
                `}
            >
                {/* Premium Gradient bar */}
                {isPremium && (
                    <div className="absolute top-0 left-10 right-10 h-1 bg-gradient-to-r from-rose-400 via-orange-400 to-amber-400 rounded-full" />
                )}

                <div className="relative shrink-0">
                    <div className="w-20 h-20 rounded-[1.75rem] bg-gradient-to-br from-rose-50 to-amber-50 border border-gray-100 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform shadow-md">
                        {token.logo_url
                            ? <img src={token.logo_url} alt={token.name} className="w-full h-full object-cover"
                                onError={e => { e.target.onerror = null; e.target.parentElement.innerHTML = '<span class="text-3xl">🪙</span>'; }} />
                            : <span className="text-3xl">🪙</span>}
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-black text-gray-900 text-lg tracking-tight truncate">{token.name}</h3>
                        <span className="px-2 py-0.5 bg-black/5 rounded-md text-[10px] font-black text-gray-500 uppercase tracking-widest">{token.symbol}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                         <span className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-rose-400" /> {timeAgo(token.created_at)}</span>
                         <span className="flex items-center gap-1.5 font-mono text-gray-400/60 lowercase">{shortAddr}</span>
                    </div>
                </div>

                <div className="hidden lg:flex flex-col items-center gap-2 px-8 border-x border-gray-50">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bonding Curve</span>
                    <BondingGraph progress={progress} />
                    <span className="text-[10px] font-black text-rose-500">{progress}%</span>
                </div>

                <div className="shrink-0 text-right pr-4">
                    <div className="text-xs font-black text-gray-900 mb-1 flex items-center justify-end gap-1.5">
                        <Activity className="w-3 h-3 text-emerald-500" /> {formatPrice(token.price_bnb)} <span className="text-[10px] text-gray-400 font-bold uppercase">BNB</span>
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Market Status: <span className="text-emerald-500">Active</span></p>
                </div>

                <div className="shrink-0 p-3 rounded-full bg-gray-50 text-gray-300 group-hover:bg-rose-500 group-hover:text-white transition-all">
                    <ArrowUpRight className="w-5 h-5" />
                </div>
            </motion.div>
        </Link>
    );
}

export default function Launchpad() {
    const [tokens, setTokens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('all'); // all, premium, fair, delisted
    const [search, setSearch] = useState('');

    useEffect(() => {
        async function fetchTokens() {
            try {
                const res = await axios.get(`${API_URL}/tokens`);
                setTokens(Array.isArray(res.data) ? res.data : []);
            } catch (err) { console.error('Fetch failed:', err); }
            finally { setLoading(false); }
        }
        fetchTokens();
    }, []);

    const filtered = useMemo(() => {
        let list = tokens;
        if (view === 'premium') list = list.filter(t => t.trust_status === 'Premium Token');
        if (view === 'fair') list = list.filter(t => t.launch_type === 'FAIR');
        if (view === 'delisted') list = list.filter(t => t.status === 'delisted');
        else if (view === 'all') list = list.filter(t => t.status !== 'delisted');

        if (search) {
            const q = search.toLowerCase();
            list = list.filter(t => t.name?.toLowerCase().includes(q) || t.symbol?.toLowerCase().includes(q) || t.contract_address?.toLowerCase().includes(q));
        }
        return list;
    }, [tokens, view, search]);

    return (
        <main className="min-h-screen bg-gray-50/50 selection:bg-rose-500 selection:text-white pb-32">
            <Navbar />
            
            {/* Ambient Background Elements matching Logo Theme */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-rose-500/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="pt-24 px-4 md:px-8 max-w-[1400px] mx-auto space-y-20 relative z-10">
                
                {/* ── TOP SECTION: HEADER + METRICS ────────────────────────────── */}
                <div className="space-y-12">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                        <div>
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 mb-4">
                                <span className="px-4 py-1.5 bg-rose-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg shadow-rose-500/20">Discovery HUB</span>
                                <div className="flex items-center gap-1.5 text-amber-500">
                                    <Sparkles className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Global Protocol Registry</span>
                                </div>
                            </motion.div>
                            <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight leading-none mb-4">Nexus <span className="text-rose-500">Terminal</span></h1>
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em]">Institutional Grade Asset Deployment Registry</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            <div className="relative group">
                                <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-rose-500 transition-colors" />
                                <input 
                                    type="text" placeholder="Protocol Hash / Name..." 
                                    value={search} onChange={(e) => setSearch(e.target.value)}
                                    className="pl-16 pr-10 py-5 bg-white border border-gray-100 rounded-[2rem] w-[300px] font-black text-gray-800 outline-none focus:border-rose-500/50 focus:shadow-2xl focus:shadow-rose-500/5 shadow-sm transition-all text-sm"
                                />
                            </div>
                            <Dropdown view={view} setView={setView} />
                        </div>
                    </div>

                    {/* Stats Metric Bar */}
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-white/60 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 flex flex-wrap items-center justify-between gap-8 shadow-xl shadow-gray-200/20"
                    >
                        {[
                            { label: 'Protocols Live', val: tokens.length, color: 'text-gray-900', icon: <Rocket className="w-3 h-3" /> },
                            { label: '24H Market Volume', val: '$2.4M', color: 'text-rose-500', icon: <Activity className="w-3 h-3" /> },
                            { label: 'Global Holders', val: '12.8K', color: 'text-amber-500', icon: <Users className="w-3 h-3" /> },
                            { label: 'Active Wallets', val: '8.4K', color: 'text-blue-500', icon: <Wallet className="w-3 h-3" /> },
                        ].map((s, i) => (
                            <div key={i} className={`flex-1 min-w-[140px] ${i > 0 ? 'lg:border-l lg:border-gray-50 lg:pl-8' : ''}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`p-1.5 rounded-lg bg-gray-50 ${s.color.replace('text-', 'bg-')}/10`}>
                                        <span className={s.color}>{s.icon}</span>
                                    </div>
                                    <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.25em]">{s.label}</h4>
                                </div>
                                <p className={`text-2xl font-black tracking-tighter ${s.color === 'text-gray-900' ? 'text-gray-900' : s.color}`}>{s.val}</p>
                            </div>
                        ))}
                    </motion.div>
                </div>

                {/* ── PARALLEL DISCOVERY TERMINAL ──────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-20">
                    
                    {/* Pillar 1: Trending Protocols (Col 3) */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="bg-white border border-gray-50 rounded-[2rem] shadow-lg p-6 relative overflow-hidden group min-h-[500px]">
                            <h2 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.25em] mb-6 flex items-center gap-2">
                                <Flame className="w-4 h-4 text-rose-500" /> Trending
                            </h2>
                            <div className="space-y-3">
                                {tokens.filter(t => t.price_change > 0).slice(0, 10).map((t, i) => (
                                    <SidebarItem key={i} token={t} type="trending" />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Pillar 2: Recently Launched (Col 3) */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="bg-white border border-gray-50 rounded-[2rem] shadow-lg p-6 relative overflow-hidden group min-h-[500px]">
                            <h2 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.25em] mb-6 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-blue-500" /> Recent
                            </h2>
                            <div className="space-y-3">
                                {tokens.slice(0, 10).map((t, i) => (
                                    <SidebarItem key={i} token={t} type="recent" />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Pillar 3: All Protocols / Full Registry (Col 6 - Parallel to discovery) */}
                    <div className="lg:col-span-6 space-y-6">
                        <div className="bg-white/40 border border-gray-100/50 rounded-[2.5rem] shadow-2xl p-8 backdrop-blur-3xl min-h-[500px]">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.25em] flex items-center gap-2">
                                    <List className="w-4 h-4 text-rose-500" /> Full Registry
                                </h2>
                                <span className="text-[9px] font-black text-gray-400 tracking-widest uppercase">{filtered.length} Protocols Indexed</span>
                            </div>

                            <div className="space-y-4 max-h-[1000px] overflow-y-auto pr-2 custom-scrollbar">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <div className="w-10 h-10 border-2 border-rose-500/10 border-t-rose-500 rounded-full animate-spin" />
                                    </div>
                                ) : filtered.length > 0 ? (
                                    filtered.map((t, i) => <TokenRowMinimal key={t.id} token={t} index={i} />)
                                ) : (
                                    <div className="py-20 text-center opacity-30">
                                        <Search className="w-8 h-8 mx-auto mb-4" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Registry Empty</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </main>
    );
}

function TokenRowMinimal({ token, index }) {
    const addr = token.contract_address || '';
    const shortAddr = addr ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : '—';
    return (
        <Link href={`/token/${addr}`}>
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.02 }}
                className="flex items-center justify-between p-4 rounded-2xl hover:bg-white transition-all group border border-transparent hover:border-gray-100 hover:shadow-xl hover:shadow-gray-100/50">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform shadow-sm">
                        {token.logo_url ? <img src={token.logo_url} className="w-full h-full object-cover" /> : <span className="text-2xl">🪙</span>}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                             <h3 className="font-black text-gray-900 text-sm tracking-tight">{token.name}</h3>
                             <span className="text-[9px] font-black text-gray-400">{token.symbol}</span>
                        </div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{shortAddr} • {timeAgo(token.created_at)}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs font-black text-gray-900">{formatPrice(token.price_bnb)} <span className="text-[9px] opacity-40">BNB</span></p>
                    <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Active</p>
                </div>
            </motion.div>
        </Link>
    );
}

function SidebarItem({ token, type }) {
    const color = type === 'trending' ? 'text-rose-500' : type === 'recent' ? 'text-blue-500' : 'text-emerald-500';
    return (
        <Link href={`/token/${token.contract_address}`}>
            <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden">
                        {token.logo_url ? <img src={token.logo_url} className="w-full h-full object-cover" /> : '🪙'}
                    </div>
                    <div>
                        <p className="text-xs font-black text-gray-900">{token.symbol}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{token.name}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className={`text-[10px] font-black ${color}`}>{type === 'volume' ? `${(parseFloat(token.liquidity_bnb) || 0).toFixed(2)} BNB` : formatPrice(token.price_bnb)}</p>
                    <p className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">{type === 'recent' ? timeAgo(token.created_at) : 'Price Activity'}</p>
                </div>
            </div>
        </Link>
    );
}

function Dropdown({ view, setView }) {
    const [open, setOpen] = useState(false);
    const options = [
        { id: 'all', label: 'All Protocols', icon: <Grid className="w-4 h-4" /> },
        { id: 'premium', label: 'Premium Verified', icon: <ShieldCheck className="w-4 h-4 text-amber-500" /> },
        { id: 'fair', label: 'Fair Launch (DEX)', icon: <Zap className="w-4 h-4 text-emerald-500" /> },
        { id: 'delisted', label: 'Archived / Delisted', icon: <Filter className="w-4 h-4 text-rose-500" /> },
    ];

    const current = options.find(o => o.id === view);

    return (
        <div className="relative">
            <button onClick={() => setOpen(!open)} className="px-8 py-5 bg-white border border-gray-100 rounded-[2rem] flex items-center gap-4 font-black text-gray-800 text-sm shadow-sm hover:border-rose-500/30 transition-all">
                {current.icon}
                {current.label}
                <ChevronRight className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-4 w-[280px] bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl p-4 z-50 backdrop-blur-3xl">
                        {options.map(o => (
                            <button key={o.id} onClick={() => { setView(o.id); setOpen(false); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${view === o.id ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/20' : 'text-gray-500 hover:bg-gray-50'}`}>
                                {o.icon}
                                {o.label}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
