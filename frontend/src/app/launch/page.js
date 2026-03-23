'use client';

import Navbar from '@/components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp, Clock, Rocket, Search as SearchIcon, Flame,
    ArrowRightLeft, Grid, List, Copy, CheckCircle2, Zap, ArrowUpRight, ArrowDownRight,
    Activity, ShieldCheck, Sparkles, Filter, LayoutGrid, BarChart3, ChevronRight,
    Loader2, Info, Users, Wallet, Share2, Star, TrendingDown
} from 'lucide-react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// ── Components ───────────────────────────────────────────────────────────────

function formatPrice(num) {
    if (!num) return '0.00000000';
    let s = Number(num).toFixed(10).replace(/0+$/, '');
    if (s.endsWith('.')) s += '00';
    const match = s.match(/^(0\.0+)(\d*)$/);
    if (match) {
        return (
            <span className="flex items-baseline font-mono tracking-tight">
                <span className="opacity-30">{match[1]}</span>
                <span className="text-white font-bold">{match[2]}</span>
            </span>
        );
    }
    return <span className="font-mono text-white font-bold">{s}</span>;
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60)    return `${diff}s`;
    if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
}

function Sparkline({ data = [10, 25, 15, 40, 30, 60, 45], color = "#10b981" }) {
    const points = data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - (d / 100) * 80}`).join(' ');
    
    return (
        <svg viewBox="0 0 100 100" className="w-20 h-10 stroke-current opacity-80" preserveAspectRatio="none">
            <polyline points={points} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function GlassCard({ children, className = "" }) {
    return (
        <div className={`
            relative overflow-hidden
            bg-zinc-900/40
            backdrop-blur-3xl
            border border-white/5
            rounded-[2.5rem]
            shadow-2xl shadow-black/50
            transition-all duration-500
            hover:border-white/10
            ${className}
        `}>
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10">{children}</div>
        </div>
    );
}

function TokenCard({ token, index }) {
    const isPremium = token.trust_status === 'Premium Token';
    const progress = token.bonding_progress || 0;
    const addr = token.contract_address || '';
    
    // Mock Trend
    const isUp = index % 2 === 0;

    return (
        <Link href={`/token/${addr}`}>
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
            >
                <GlassCard className="group p-6 h-full flex flex-col hover:scale-[1.02] active:scale-95">
                    {/* Card Header: Logo + Badges */}
                    <div className="flex items-start justify-between mb-6">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-2xl bg-zinc-800 border-2 border-white/5 overflow-hidden shadow-2xl group-hover:shadow-emerald-500/20 transition-all duration-500">
                                {token.logo_url ? (
                                    <img src={token.logo_url} className="w-full h-full object-cover" alt={token.name} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-3xl">🪙</div>
                                )}
                            </div>
                            {isPremium && (
                                <div className="absolute -top-3 -right-3 w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg border-4 border-[#09090B]">
                                    <Star className="w-4 h-4 text-white fill-current" />
                                </div>
                            )}
                        </div>
                        <div className="text-right">
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                isUp ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                            }`}>
                                {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {isUp ? '+12.4%' : '-2.1%'}
                            </div>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-2">{timeAgo(token.created_at)} AGO</p>
                        </div>
                    </div>

                    {/* Name & Symbol */}
                    <div className="mb-6 flex-1">
                        <h3 className="text-xl font-black text-white tracking-tight leading-none mb-2 truncate group-hover:text-emerald-400 transition-colors">{token.name}</h3>
                        <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black text-zinc-400 bg-white/5 px-2 py-0.5 rounded-md tracking-widest">{token.symbol}</span>
                             <span className="text-[9px] font-mono text-zinc-600 lowercase">{addr.slice(0, 6)}...{addr.slice(-4)}</span>
                        </div>
                    </div>

                    {/* Features Row */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Market Cap</p>
                            <p className="text-sm font-black text-white tracking-tight">$82.4K</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Bonding</p>
                            <p className="text-sm font-black text-emerald-400 tracking-tight">{progress}%</p>
                        </div>
                    </div>

                    {/* Price & Chart Row */}
                    <div className="flex items-center justify-between pt-6 border-t border-white/5">
                        <div>
                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Current Price</p>
                            <p className="text-sm">{formatPrice(token.price_bnb)} <span className="text-[10px] text-zinc-600 ml-0.5">BNB</span></p>
                        </div>
                        <Sparkline color={isUp ? "#10b981" : "#f43f5e"} data={isUp ? [10, 40, 20, 80] : [80, 20, 40, 10]} />
                    </div>
                </GlassCard>
            </motion.div>
        </Link>
    );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function Launchpad() {
    const [tokens, setTokens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('all'); // all, trending, top, new
    const [launchType, setLaunchType] = useState('all'); // all, bonding, fair
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
        
        // Filter by View
        if (view === 'trending') list = list.filter(t => t.price_change > 0).sort((a,b) => b.holders - a.holders);
        if (view === 'top') list = [...list].sort((a,b) => b.price_bnb - a.price_bnb);
        if (view === 'new') list = [...list].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

        // Filter by Launch Type
        if (launchType === 'bonding') list = list.filter(t => t.launch_type === 'MEME' || !t.launch_type);
        if (launchType === 'fair') list = list.filter(t => t.launch_type === 'FAIR');

        if (search) {
            const q = search.toLowerCase();
            list = list.filter(t => t.name?.toLowerCase().includes(q) || t.symbol?.toLowerCase().includes(q) || t.contract_address?.toLowerCase().includes(q));
        }
        return list;
    }, [tokens, view, launchType, search]);

    return (
        <main className="min-h-screen bg-[#030303] selection:bg-emerald-500 selection:text-white pb-32">
            <Navbar />
            
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[160px] animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[160px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 contrast-150 brightness-100 mix-blend-overlay" />
            </div>

            <div className="pt-32 px-4 md:px-8 max-w-[1440px] mx-auto space-y-20 relative z-10">
                
                {/* ── HERO SECTION ────────────────────────────────────────────── */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12">
                    <div className="max-w-2xl">
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            className="flex items-center gap-3 mb-6"
                        >
                            <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-emerald-500/20">Discovery HUB</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Protocol Registry V4.0</span>
                        </motion.div>
                        <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-[0.85] mb-8">
                            Unearth the <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-indigo-500 font-outline-2">Next Alpha</span>
                        </h1>
                        <p className="text-zinc-400 font-bold uppercase text-[10px] tracking-[0.4em] max-w-md">Nexus Real-Time Institutional Registry</p>
                    </div>

                    {/* Global Stats Sidebar */}
                    <div className="grid grid-cols-2 gap-4 w-full lg:max-w-md">
                        {[
                            { label: 'Protocols', val: tokens.length, icon: <Rocket className="w-5 h-5 text-zinc-400" /> },
                            { label: 'Market Cap', val: '$12.4M', icon: <Activity className="w-5 h-5 text-emerald-400" /> },
                            { label: 'Holder Alpha', val: '82.1K', icon: <Users className="w-5 h-5 text-zinc-400" /> },
                            { label: 'Trade Pulse', val: '928/min', icon: <BarChart3 className="w-5 h-5 text-zinc-400" /> }
                        ].map((stat, i) => (
                            <GlassCard key={i} className="p-6">
                                <div className="flex flex-col gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
                                        {stat.icon}
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                                        <p className="text-2xl font-black text-white tracking-tighter">{stat.val}</p>
                                    </div>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                </div>

                {/* ── FILTER & SEARCH ─────────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-2 bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] shadow-2xl">
                    <div className="flex items-center gap-2 p-1 w-full md:w-auto overflow-x-auto no-scrollbar">
                        {[
                            { id: 'all', label: 'All Protocols', icon: <Grid className="w-4 h-4" /> },
                            { id: 'trending', label: 'Trending', icon: <Flame className="w-4 h-4" /> },
                            { id: 'top', label: 'Top Market', icon: <Activity className="w-4 h-4" /> },
                            { id: 'new', label: 'Fresh Launches', icon: <Clock className="w-4 h-4" /> }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setView(tab.id)}
                                className={`
                                    flex items-center gap-3 px-8 py-3 rounded-full text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all
                                    ${view === tab.id ? 'bg-white text-black shadow-xl' : 'text-zinc-500 hover:text-white'}
                                `}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className="relative group w-full md:w-96 p-1">
                        <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Protocol Signal Search..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-white/5 border border-transparent focus:border-white/10 rounded-[1.8rem] text-sm font-black text-white outline-none transition-all"
                        />
                    </div>
                </div>

                {/* ── LAUNCH TYPE SWITCHER ────────────────────────────────────── */}
                <div className="flex justify-center">
                    <div className="inline-flex p-1.5 bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-2xl shadow-2xl">
                        {[
                            { id: 'all', label: 'Global Registry' },
                            { id: 'bonding', label: 'Bonding Curve' },
                            { id: 'fair', label: 'Fair Launch' }
                        ].map(type => (
                            <button
                                key={type.id}
                                onClick={() => setLaunchType(type.id)}
                                className={`
                                    px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all
                                    ${launchType === type.id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-zinc-500 hover:text-zinc-300'}
                                `}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── TOKEN GRID ──────────────────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {loading ? (
                        Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="h-[400px] bg-zinc-900/40 animate-pulse rounded-[2.5rem] border border-white/5" />
                        ))
                    ) : filtered.length > 0 ? (
                        filtered.map((t, i) => <TokenCard key={t.id} token={t} index={i} />)
                    ) : (
                        <div className="col-span-full py-40 text-center">
                            <div className="w-20 h-20 bg-zinc-900 border border-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl">
                                <SearchIcon className="w-8 h-8 text-zinc-700" />
                            </div>
                            <h3 className="text-2xl font-black text-white tracking-tight uppercase">No Signals Found</h3>
                            <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-2">Try adjusting your filters or search query.</p>
                        </div>
                    )}
                </div>

            </div>

            {/* Custom Styles */}
            <style jsx global>{`
                .font-outline-2 {
                    -webkit-text-stroke: 1px rgba(255, 255, 255, 0.2);
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </main>
    );
}
