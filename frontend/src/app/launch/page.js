'use client';

import Navbar from '@/components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp, Clock, Rocket, Search as SearchIcon, Flame,
    ArrowRightLeft, Grid, List, Copy, CheckCircle2, Zap, ArrowUpRight, ArrowDownRight,
    Activity, ShieldCheck, Sparkles, Filter, LayoutGrid, BarChart3, ChevronRight,
    Loader2, Info, Users, Wallet, Share2, Star, TrendingDown, Globe, Droplets, Cpu,
    Coins, DollarSign, Grid3X3
} from 'lucide-react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import axios from 'axios';

import { API_URL } from '@/lib/api';
import TrendingTicker from '@/components/TrendingTicker';
// 
const formatB20Number = (num, prefix = "") => {
    if (!num || isNaN(num)) return prefix + "0";
    const n = Math.abs(num);
    if (n >= 1e12) return prefix + (num / 1e12).toFixed(2) + "T";
    if (n >= 1e9) return prefix + (num / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return prefix + (num / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return prefix + (num / 1e3).toFixed(2) + "K";
    return prefix + num.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

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
                <span className="text-zinc-900 font-bold">{match[2]}</span>
            </span>
        );
    }
    return <span className="font-mono text-zinc-900 font-bold">{s}</span>;
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60)    return `${diff}s`;
    if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
}

function GlassCard({ children, className = "" }) {
    return (
        <div className={`
            relative overflow-hidden
            bg-white/80
            backdrop-blur-3xl
            border border-black/5
            rounded-[2.5rem]
            shadow-xl shadow-black/5
            transition-all duration-500
            hover:border-black/10
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

    const getNetworkIcon = (net) => {
        const n = String(net || 'BNB').toUpperCase();
        if (n.includes('SOL')) return <img src="https://cryptologos.cc/logos/solana-sol-logo.png" className="w-3.5 h-3.5 rounded-full shadow-sm" />;
        if (n.includes('BASE')) return <img src="https://assets.coingecko.com/coins/images/2518/large/base.png" className="w-3.5 h-3.5 rounded-full shadow-sm" />;
        if (n.includes('TRON')) return <img src="https://cryptologos.cc/logos/tron-trx-logo.png" className="w-3.5 h-3.5 rounded-full shadow-sm" />;
        if (n.includes('ETH')) return <img src="https://cryptologos.cc/logos/ethereum-eth-logo.png" className="w-3.5 h-3.5 rounded-full shadow-sm" />;
        return <img src="https://cryptologos.cc/logos/bnb-bnb-logo.png" className="w-3.5 h-3.5 rounded-full shadow-sm" />;
    };

    return (
        <Link href={`/token/${addr}`}>
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
            >
                <GlassCard className={`group p-6 h-full flex flex-col hover:scale-[1.02] active:scale-95 ${token.price_change >= 0 ? 'animate-pulse-green' : 'animate-pulse-red'}`}>
                    {/* Card Header: Logo + Badges */}
                    <div className="flex items-start justify-between mb-6">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-2xl bg-zinc-100 border-2 border-white overflow-hidden shadow-sm group-hover:shadow-sky-500/10 transition-all duration-500">
                                {token.logo_url ? (
                                    <img src={token.logo_url} className="w-full h-full object-cover" alt={token.name} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-3xl">🪙</div>
                                )}
                            </div>
                            {isPremium && (
                                <div className="absolute -top-3 -right-3 w-8 h-8 bg-sky-500 rounded-xl flex items-center justify-center shadow-lg border-4 border-white">
                                    <CheckCircle2 className="w-4 h-4 text-white fill-current" />
                                </div>
                            )}
                        </div>
                        <div className="text-right">
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                isUp ? 'bg-sky-500/10 text-sky-600' : 'bg-teal-500/10 text-teal-600'
                            }`}>
                                {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {isUp ? '+12.4%' : '-2.1%'}
                            </div>
                            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-2">{timeAgo(token.created_at)} AGO</p>
                        </div>
                    </div>

                    <div className="mb-6 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <p className="text-[10px] font-black text-zinc-400 font-mono uppercase tracking-[0.2em]">{token.symbol}</p>
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-zinc-100 rounded-md">
                                {getNetworkIcon(token.network)}
                                <span className="text-[8px] font-black text-zinc-500 uppercase">{token.network || 'BNB'}</span>
                            </div>
                        </div>
                        <h4 className="text-lg font-black text-zinc-900 leading-none group-hover:text-teal-600 transition-colors">{token.name}</h4>
                    </div>

                    {/* Progress */}
                    <div className="mb-6">
                        <div className="flex justify-between items-end mb-2.5">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Bonding Process</label>
                            <span className="text-[10px] font-black text-teal-600 font-mono italic">{progress.toFixed()}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden border border-black/5">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                className="h-full bg-gradient-to-r from-teal-600 to-teal-700"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="p-3 rounded-2xl bg-zinc-50 border border-black/5">
                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Market Cap</p>
                            <p className="text-sm font-black text-zinc-900 tracking-tight">{formatB20Number((token.market_cap || 0) * 600, "$")}</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-zinc-50 border border-black/5">
                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Bonding</p>
                            <p className="text-sm font-black text-zinc-900 tracking-tight">{progress.toFixed(1)}%</p>
                        </div>
                    </div>

                    <div className="mt-auto pt-6 border-t border-zinc-100 flex items-center justify-between">
                        <div className="flex -space-x-2">
                            {[1,2,3].map(i => (
                                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                                    <Users className="w-3.5 h-3.5" />
                                </div>
                            ))}
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-teal-500 flex items-center justify-center text-[10px] font-black text-white">
                                +{Math.floor(Math.random() * 50)}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-400 font-black text-[10px] uppercase tracking-widest group-hover:text-teal-600 transition-colors">
                            Trade Asset <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </GlassCard>
            </motion.div>
        </Link>
    );
}

function ListView({ tokens }) {
    return (
        <div className="w-full overflow-hidden bg-white border border-zinc-100 rounded-[2.5rem] shadow-sm">
            <table className="w-full text-left">
                <thead>
                    <tr className="border-b border-zinc-100">
                        <th className="px-8 py-6 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest">Asset Parameters</th>
                        <th className="px-8 py-6 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest">Listing Price</th>
                        <th className="px-8 py-6 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest">Market Cap</th>
                        <th className="px-8 py-6 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Navigation</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                    {tokens.map((token, index) => (
                        <tr key={token.contract_address} className={`group hover:bg-zinc-50/50 transition-colors ${token.price_change >= 0 ? 'animate-pulse-green' : 'animate-pulse-red'}`}>
                            <td className="px-8 py-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-zinc-100 border border-black/5 overflow-hidden shadow-sm">
                                        {token.logo_url ? <img src={token.logo_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">🪙</div>}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-zinc-900 italic tracking-tight leading-none mb-1 group-hover:text-teal-600 transition-colors">{token.name}</p>
                                        <p className="text-[10px] font-black text-zinc-400 font-mono uppercase tracking-widest">${token.symbol}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-8 py-6">
                                <p className="text-sm font-bold text-zinc-900 tracking-tight">{formatPrice(token.price_bnb)}</p>
                            </td>
                            <td className="px-8 py-6">
                                <p className="text-sm font-black text-zinc-600">{formatB20Number((token.market_cap || 0) * 600, "$")}</p>
                            </td>
                            <td className="px-8 py-6 text-right">
                                <Link href={`/token/${token.contract_address}`} className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-600 transition-colors uppercase text-[10px] font-black tracking-widest">
                                    Trade <ArrowUpRight className="w-4 h-4" />
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function BubbleView({ tokens }) {
    return (
        <div className="relative w-full h-[700px] bg-zinc-50 border border-zinc-100 rounded-[2.5rem] overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                <BarChart3 className="w-96 h-96 text-zinc-900" />
            </div>
            
            {tokens.map((token, i) => {
                const size = 120 + ((token.bonding_progress || 0) * 2.5);
                const randomX = Math.random() * 80 + 10;
                const randomY = Math.random() * 80 + 10;
                const duration = 10 + Math.random() * 20;

                return (
                    <motion.div
                        key={token.contract_address}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ 
                            scale: 1, 
                            opacity: 1,
                            x: [0, Math.random() * 40 - 20, 0],
                            y: [0, Math.random() * 40 - 20, 0]
                        }}
                        transition={{ 
                            scale: { duration: 0.5, delay: i * 0.1 },
                            x: { duration, repeat: Infinity, ease: "linear" },
                            y: { duration: duration * 1.2, repeat: Infinity, ease: "linear" }
                        }}
                        style={{ 
                            position: 'absolute',
                            left: `${randomX}%`,
                            top: `${randomY}%`,
                            width: size,
                            height: size,
                        }}
                        className="group shrink-0 cursor-pointer"
                    >
                        <Link href={`/token/${token.contract_address}`}>
                            <div className="w-full h-full rounded-full border border-zinc-200 bg-white flex flex-col items-center justify-center p-4 text-center group-hover:scale-110 group-hover:border-teal-500 transition-all shadow-xl">
                                <div className="w-12 h-12 rounded-xl border border-zinc-100 overflow-hidden mb-2 transition-all">
                                    {token.logo_url ? <img src={token.logo_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-zinc-100">🪙</div>}
                                </div>
                                <p className="text-[10px] font-black text-zinc-900 uppercase tracking-widest truncate w-full">{token.name}</p>
                                <p className="text-[8px] font-black text-teal-600 mt-1">{token.bonding_progress || 0}% Sold</p>
                            </div>
                        </Link>
                    </motion.div>
                );
            })}

            {tokens.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-zinc-400 font-black uppercase tracking-[0.4em] text-xs">Awaiting Network Signals...</p>
                </div>
            )}
        </div>
    );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function Launchpad() {
    const [tokens, setTokens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('all'); 
    const [launchType, setLaunchType] = useState('all'); 
    const [networkFilter, setNetworkFilter] = useState('all');
    const [viewMode, setViewMode] = useState('grid'); 
    const [search, setSearch] = useState('');
    const [bnbPrice, setBnbPrice] = useState(600);
    const [dexBoosts, setDexBoosts] = useState([]);

    useEffect(() => {
        const fetchDexBoosts = async () => {
            try {
                const res = await axios.get(`${API_URL}/dex/boosts/latest`);
                setDexBoosts(Array.isArray(res.data) ? res.data.slice(0, 4) : []);
            } catch (e) {
                console.warn('Failed to fetch latest boosts for launchpad:', e.message);
            }
        };
        fetchDexBoosts();
        const interval = setInterval(fetchDexBoosts, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        axios.get('https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd')
            .then(r => setBnbPrice(r.data.binancecoin.usd))
            .catch(() => {});
            
        const fetchTokens = async () => {
            try {
                const res = await axios.get(`${API_URL}/tokens/markets/memes`, { params: { per_page: 6000 } });
                setTokens(Array.isArray(res.data) ? res.data : []);
            } catch (err) { 
                console.error('Fetch failed:', err); 
            } finally { 
                setLoading(false); 
            }
        };

        fetchTokens();
        const interval = setInterval(fetchTokens, 5000); // 5s Real-time polling
        return () => clearInterval(interval);
    }, []);

    const filtered = useMemo(() => {
        let list = [...tokens].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
        if (view === 'trending') {
            list = tokens.filter(t => (t.holders > 0 || t.liquidity_bnb > 0)).sort((a,b) => (b.holders || 0) - (a.holders || 0));
        }
        if (view === 'top') {
            list = [...tokens].sort((a,b) => parseFloat(b.liquidity_bnb || 0) - parseFloat(a.liquidity_bnb || 0));
        }
        if (view === 'new') {
            list = [...tokens].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
        }
        if (launchType === 'bonding') list = list.filter(t => t.launch_type === 'MEME' || !t.launch_type || t.launch_type === 'BONDING_CURVE');
        if (launchType === 'fair') list = list.filter(t => t.launch_type === 'FAIR' || t.launch_type === 'FAIR_LAUNCH');
        if (launchType === 'standard') list = list.filter(t => t.launch_type === 'STANDARD' || t.launch_type === 'EXCHANGE_LISTING');

        if (networkFilter !== 'all') {
            list = list.filter(t => (t.network || 'BNB').toLowerCase().includes(networkFilter.toLowerCase()));
        }

        if (search) {
            const q = search.toLowerCase();
            list = list.filter(t => 
                t.name?.toLowerCase().includes(q) || 
                t.symbol?.toLowerCase().includes(q) || 
                t.contract_address?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [tokens, view, launchType, search]);

    return (
        <main className="min-h-screen bg-[#FDFDFD] selection:bg-teal-500 selection:text-white pb-32">
            <Navbar />
            <div className="pt-20">
                <TrendingTicker />
            </div>
            
            <div className="pt-4 px-4 md:px-8 max-w-[1440px] mx-auto space-y-20 relative z-10">
                
                {/* ── HERO SECTION ────────────────────────────────────────────── */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12">
                    <div className="max-w-2xl">
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            className="flex items-center gap-3 mb-6"
                        >
                            <span className="px-4 py-1.5 bg-teal-500/10 text-teal-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-teal-500/20">Discovery HUB</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Protocol Registry V4.0</span>
                        </motion.div>
                        <h1 className="text-5xl md:text-8xl font-black text-zinc-900 tracking-tighter leading-[0.85] mb-8">
                            Unearth the <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-br from-teal-600 to-teal-700">Next Alpha</span>
                        </h1>
                        <p className="text-xl text-zinc-500 font-medium leading-relaxed italic pr-12">
                            The nexus of <span className="text-zinc-900">Institutional Intelligence</span> and 
                            fair-launch mechanics. Discover assets audited by B20-LAB Nexus.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 w-full lg:max-w-md">
                        {[
                            { label: 'Infrastructure', val: 'Multi-Chain', icon: <Rocket className="w-5 h-5 text-teal-600" /> },
                            { label: 'Nexus Network', val: 'Global Connectivity', icon: <Globe className="w-5 h-5 text-sky-500" /> },
                            { label: 'Liquidity Pool', val: 'Institutional Grade', icon: <Droplets className="w-5 h-5 text-teal-600" /> },
                            { label: 'Node Cluster', val: 'Decentralized', icon: <Cpu className="w-5 h-5 text-purple-500" /> }
                        ].map((stat, i) => (
                            <GlassCard key={i} className="p-6">
                                <div className="flex flex-col gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-black/5 flex items-center justify-center">
                                        {stat.icon}
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                                        <p className="text-sm font-black text-zinc-900 uppercase tracking-tighter">{stat.val}</p>
                                    </div>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                </div>

                {/* ── DEXSCREENER LIVE BOOSTS ── */}
                {dexBoosts.length > 0 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <span className="p-2.5 bg-orange-500 rounded-xl text-white shadow-lg shadow-orange-500/20">
                                <Flame className="w-5 h-5 animate-pulse" />
                            </span>
                            <div>
                                <h3 className="text-lg font-black text-zinc-900 uppercase tracking-wider italic leading-none mb-1">DexScreener Boosted Signals</h3>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Real-time mainnet campaign updates</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                            {dexBoosts.map((b, i) => {
                                const isSol = b.chainId === 'solana';
                                const getIcon = () => {
                                    if (isSol) return 'https://cryptologos.cc/logos/solana-sol-logo.png';
                                    if (b.chainId === 'bsc') return 'https://cryptologos.cc/logos/bnb-bnb-logo.png';
                                    return 'https://assets.coingecko.com/coins/images/2518/large/base.png';
                                };
                                return (
                                    <div key={i} className="p-6 bg-white border border-zinc-100 hover:border-orange-500/30 rounded-[2rem] shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-orange-500/5 to-transparent rounded-full blur-xl" />
                                        <div>
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="w-12 h-12 rounded-2xl bg-zinc-50 border border-zinc-100 overflow-hidden shadow-sm shrink-0">
                                                    <img src={b.icon || `https://api.dicebear.com/7.x/identicon/svg?seed=${b.tokenAddress}`} className="w-full h-full object-cover" onError={e => { e.target.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${b.tokenAddress}`; }} />
                                                </div>
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-100 rounded-md">
                                                    <img src={getIcon()} className="w-3 h-3 rounded-full object-contain" alt="" />
                                                    <span className="text-[8px] font-black text-zinc-500 uppercase">{b.chainId}</span>
                                                </div>
                                            </div>
                                            <h4 className="text-sm font-black text-zinc-900 group-hover:text-orange-600 transition-colors uppercase font-mono truncate">{b.tokenAddress.slice(0, 6)}...{b.tokenAddress.slice(-4)}</h4>
                                            <p className="text-[10px] text-zinc-400 font-bold uppercase mt-2 leading-relaxed line-clamp-2 h-10">{b.description || 'Verified live contract active on DEX pool campaign.'}</p>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between">
                                            <a 
                                                href={b.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[9px] font-black text-teal-600 hover:text-orange-500 transition-colors uppercase tracking-widest hover:underline flex items-center gap-1"
                                            >
                                                View on DEX <ArrowUpRight className="w-3.5 h-3.5" />
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── FILTER & SEARCH ─────────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-2 bg-white/50 backdrop-blur-3xl border border-black/5 rounded-[2.5rem] shadow-sm">
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
                                    ${view === tab.id ? 'bg-teal-500 text-white shadow-xl' : 'text-zinc-500 hover:text-teal-600'}
                                `}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className="relative group w-full md:w-96 p-1">
                        <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-teal-600 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Protocol Signal Search..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-zinc-50 border border-transparent focus:border-teal-500/10 rounded-[1.8rem] text-sm font-black text-zinc-900 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* ── NETWORK FILTER ─────────────────────────────────────────── */}
                <div className="flex flex-wrap items-center gap-3">
                    {[
                        { id: 'all', label: 'All Networks', img: 'https://cdn-icons-png.flaticon.com/512/825/825590.png' },
                        { id: 'bnb', label: 'BNB Chain', img: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' },
                        { id: 'eth', label: 'Ethereum', img: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
                        { id: 'solana', label: 'Solana', img: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
                        { id: 'base', label: 'Base', img: 'https://assets.coingecko.com/coins/images/2518/large/base.png' },
                        { id: 'tron', label: 'Tron', img: 'https://cryptologos.cc/logos/tron-trx-logo.png' }
                    ].map(net => (
                        <button
                            key={net.id}
                            onClick={() => setNetworkFilter(net.id)}
                            className={`
                                flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border
                                ${networkFilter === net.id ? 'bg-zinc-900 text-white border-zinc-900 shadow-lg' : 'bg-white text-zinc-500 border-zinc-100 hover:border-zinc-300'}
                            `}
                        >
                            <img src={net.img} className="w-3.5 h-3.5 rounded-full object-contain" alt="" />
                            {net.label}
                        </button>
                    ))}
                </div>

                {/* ── LAUNCH TYPE & VIEW MODE SWITCHER ─────────────────────────── */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="inline-flex p-1.5 bg-zinc-50 border border-black/5 rounded-2xl">
                        {[
                            { id: 'all', label: 'Global Registry' },
                            { id: 'bonding', label: 'Bonding Curve' },
                            { id: 'fair', label: 'Fair Launch' },
                            { id: 'standard', label: 'Standard Asset' }
                        ].map(type => (
                            <button
                                key={type.id}
                                onClick={() => setLaunchType(type.id)}
                                className={`
                                    px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all
                                    ${launchType === type.id ? 'bg-white text-teal-600 shadow-sm border border-black/5' : 'text-zinc-500 hover:text-zinc-900'}
                                `}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>

                    <div className="inline-flex p-1.5 bg-zinc-50 border border-black/5 rounded-2xl">
                        {[
                            { id: 'grid', icon: <LayoutGrid className="w-4 h-4" /> },
                            { id: 'list', icon: <List className="w-4 h-4" /> },
                            { id: 'bubbles', icon: <Sparkles className="w-4 h-4" /> }
                        ].map(mode => (
                            <button
                                key={mode.id}
                                onClick={() => setViewMode(mode.id)}
                                className={`
                                    p-3 rounded-xl transition-all
                                    ${viewMode === mode.id ? 'bg-white text-teal-600 shadow-sm border border-black/5' : 'text-zinc-500 hover:text-zinc-900'}
                                `}
                            >
                                {mode.icon}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── TOKEN DISPLAY ───────────────────────────────────────────── */}
                <div className="min-h-[400px]">
                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="h-[400px] bg-zinc-100 animate-pulse rounded-[2.5rem]" />
                            ))}
                        </div>
                    ) : filtered.length > 0 ? (
                        <>
                            {viewMode === 'grid' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                    {filtered.map((t, i) => <TokenCard key={t.contract_address} token={t} index={i} />)}
                                </div>
                            )}
                            {viewMode === 'list' && <ListView tokens={filtered} />}
                            {viewMode === 'bubbles' && <BubbleView tokens={filtered} />}
                        </>
                    ) : (
                        <div className="py-40 text-center">
                            <div className="w-20 h-20 bg-zinc-50 border border-black/5 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                                <SearchIcon className="w-8 h-8 text-zinc-300" />
                            </div>
                            <h3 className="text-2xl font-black text-zinc-900 tracking-tight uppercase">No Signals Found</h3>
                            <p className="text-zinc-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-2">Try adjusting your filters or search query.</p>
                        </div>
                    )}
                </div>

            </div>

            {/* Custom Styles */}
            <style jsx global>{`
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
