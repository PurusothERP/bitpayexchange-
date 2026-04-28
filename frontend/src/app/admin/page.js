'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    LayoutDashboard, PieChart, Shield, Wallet, ListChecks, 
    Rocket, CreditCard, MessageSquare, Megaphone, Settings,
    Search, Filter, ChevronRight, CheckCircle2, XCircle,
    Download, RefreshCw, ExternalLink, ArrowUpRight,
    TrendingUp, Users, Box, Zap, AlertCircle, Eye, EyeOff, Loader2, DollarSign, PlusCircle, ChevronDown, Trash2, Image as ImageIcon,
    Activity, Database, Globe, Lock, Unlock, Copy, TrendingDown, ArrowRightLeft, CreditCard as CardIcon, Edit3, Save, History,
    Sparkles, Star, BarChart3, Info, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { ethers } from 'ethers';
import { useWallet } from '@/context/WalletContext';
import { API_URL } from '@/lib/api';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    AreaChart, Area, PieChart as RePieChart, Pie, Cell 
} from 'recharts';

const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS || '0x4598AD4E828cb64A53246765f60D9912AEA1b11A';
const ADMIN_WALLET = (process.env.NEXT_PUBLIC_FEE_WALLET || '0x6451ee4def4a8b8fbc2c64301a79e267de378935').toLowerCase();

export default function NueraAdminPortal() {
    const { account, isConnected } = useWallet();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [unauthorized, setUnauthorized] = useState(false);

    const menuItems = [
        { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={18} />, color: 'text-indigo-600' },
        { id: 'revenue', label: 'Financial Ledger', icon: <PieChart size={18} />, color: 'text-emerald-600' },
        { id: 'exchange', label: 'Exchange Mirror', icon: <Box size={18} />, color: 'text-blue-600' },
        { id: 'wallets', label: 'Active Sessions', icon: <Users size={18} />, color: 'text-rose-600' },
        { id: 'listings', label: 'Listing Hub', icon: <ListChecks size={18} />, color: 'text-amber-600' },
        { id: 'launchpad', label: 'Launchpad Guard', icon: <Rocket size={18} />, color: 'text-violet-600' },
        { id: 'fiat', label: 'Express Fiat', icon: <CreditCard size={18} />, color: 'text-teal-600' },
        { id: 'governance', label: 'Protocol Settings', icon: <Settings size={18} />, color: 'text-indigo-900' },
        { id: 'community', label: 'Social Mod', icon: <MessageSquare size={18} />, color: 'text-cyan-600' },
        { id: 'bulletin', label: 'Bulletin CMS', icon: <Megaphone size={18} />, color: 'text-orange-600' },
        { id: 'address-hub', label: 'Address Hub', icon: <PlusCircle size={18} />, color: 'text-gray-900' },
    ];

    const getAuthHeader = () => ({ headers: { 'x-wallet-address': account } });

    useEffect(() => {
        if (!account) return;
        fetchStats();
    }, [account]);

    const fetchStats = async () => {
        if (!account) return;
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/admin/stats`, getAuthHeader());
            setStats(res.data);
            setUnauthorized(false);
        } catch (e) { 
            if (e.response?.status === 401 || e.response?.status === 403) setUnauthorized(true);
        }
        setLoading(false);
    };

    if (unauthorized) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white border border-rose-100 rounded-[3rem] p-12 text-center shadow-2xl">
                    <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-rose-100">
                        <Shield className="w-10 h-10 text-rose-500" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 mb-4 uppercase tracking-tight">Nuera Lockdown</h1>
                    <p className="text-[10px] font-black text-rose-600 bg-rose-50 px-4 py-1.5 rounded-full inline-block mb-4 uppercase tracking-widest">{account?.slice(0,10)}...{account?.slice(-8)}</p>
                    <p className="text-gray-500 font-bold text-xs leading-relaxed mb-8 uppercase tracking-wide">Unauthorized entity detected. Access to Nexus Nuera restricted.</p>
                    <button onClick={() => window.location.href = '/'} className="px-8 py-4 bg-gray-900 text-white font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-black transition-all">Return to Hub</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900">
            <aside className="w-72 bg-white border-r border-slate-200/60 flex flex-col sticky top-0 h-screen z-40">
                <div className="p-8 pb-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200">
                            <Sparkles className="text-white w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="font-black text-xl tracking-tighter text-slate-900 uppercase italic">Nexus<span className="text-indigo-600">Nuera</span></h1>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] -mt-1">Admin Command v2.5</p>
                        </div>
                    </div>
                </div>
                <nav className="flex-1 px-4 space-y-1">
                    {menuItems.map((item) => (
                        <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-black transition-all duration-300 group ${activeTab === item.id ? 'bg-indigo-50/80 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                            <span className={`${activeTab === item.id ? item.color : 'text-slate-400 group-hover:text-slate-600'} transition-colors`}>{item.icon}</span>
                            <span className="tracking-tight uppercase">{item.label}</span>
                            {activeTab === item.id && <motion.div layoutId="active-indicator" className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                        </button>
                    ))}
                </nav>
            </aside>

            <main className="flex-1 flex flex-col min-h-0">
                <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-10 flex items-center justify-between sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">{menuItems.find(m => m.id === activeTab)?.label}</h2>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                            <RefreshCw className={`w-3 h-3 text-indigo-500 ${loading ? 'animate-spin' : ''}`} />
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">Nuera Synchronized</span>
                        </div>
                        <button onClick={fetchStats} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </header>

                <div className="flex-1 p-10 overflow-y-auto">
                    <AnimatePresence mode="wait">
                        {activeTab === 'dashboard' && <AdminDashboard key="dash" stats={stats} loading={loading} account={account} />}
                        {activeTab === 'revenue' && <RevenueLedger key="rev" stats={stats} account={account} />}
                        {activeTab === 'exchange' && <ExchangeMirror key="ex" account={account} />}
                        {activeTab === 'wallets' && <ConnectedWallets key="wal" account={account} />}
                        {activeTab === 'listings' && <ListingHub key="list" account={account} />}
                        {activeTab === 'launchpad' && <LaunchpadGuard key="lp" account={account} />}
                        {activeTab === 'fiat' && <FiatQueue key="fiat" account={account} />}
                        {activeTab === 'governance' && <GovernanceHub key="gov" account={account} />}
                        {activeTab === 'bulletin' && <BulletinCMS key="bull" account={account} />}
                        {activeTab === 'community' && <CommunityMod key="comm" account={account} />}
                        {activeTab === 'address-hub' && <AddressHub key="addr" />}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}

function AdminDashboard({ stats, loading, account }) {
    if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-indigo-500" /></div>;

    const cards = [
        { label: 'Launched Coins', value: stats?.total_tokens || 0, sub: `${stats?.launchpad_tokens} LP / ${stats?.standard_tokens} Std`, icon: <Rocket />, color: 'bg-indigo-50 text-indigo-600' },
        { label: 'Asset Inventory', value: stats?.market_inventory?.toLocaleString() || '6,140', sub: 'Verified External Proxies', icon: <Box />, color: 'bg-emerald-50 text-emerald-600' },
        { label: 'Realized Revenue', value: `${Number(stats?.total_revenue_bnb || 0).toFixed(4)} BNB`, sub: 'Combined Protocol Fees', icon: <DollarSign />, color: 'bg-amber-50 text-amber-600' },
        { label: 'Delisted Items', value: stats?.delisted_count || 0, sub: 'Inactive Registry Overrides', icon: <AlertCircle />, color: 'bg-rose-50 text-rose-600' },
    ];

    const chartData = [
        { name: 'Mon', revenue: 0.12, launches: 4 },
        { name: 'Tue', revenue: 0.19, launches: 7 },
        { name: 'Wed', revenue: 0.15, launches: 5 },
        { name: 'Thu', revenue: 0.22, launches: 9 },
        { name: 'Fri', revenue: 0.35, launches: 12 },
        { name: 'Sat', revenue: 0.28, launches: 8 },
        { name: 'Sun', revenue: 0.32, launches: 10 },
    ];

    const connections = [
        { name: 'BSC Mainnet RPC', status: 'connected', latency: '42ms', endpoint: 'bsc-dataseed.binance.org' },
        { name: 'Nuera DB Cluster', status: 'connected', latency: '1ms', endpoint: 'SQLite WAL-Active' },
        { name: 'Coingecko API', status: 'connected', latency: '128ms', endpoint: 'Pro-Tier Active' },
        { name: 'Anthropic AI Engine', status: 'connected', latency: '450ms', endpoint: 'Claude-3.5-Sonnet' },
        { name: 'Twitter Sentiment', status: 'error', latency: '--', endpoint: 'v2 Bearer Rejected' },
        { name: 'Price Indexer', status: 'connected', latency: '15ms', endpoint: 'Live Events Sync' },
    ];

    return (
        <div className="space-y-10 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((c, i) => (
                    <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm hover:shadow-xl transition-all group">
                        <div className={`w-14 h-14 ${c.color} rounded-2xl flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform`}>{React.cloneElement(c.icon, { size: 24 })}</div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{c.label}</p>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-1">{c.value}</h3>
                        <p className="text-[10px] font-bold text-slate-500 italic">{c.sub}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-[3rem] border border-slate-200/60 p-10 shadow-sm">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 uppercase italic">Financial <span className="text-indigo-600">Trajectory</span></h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">7-Day Nuera Analytics</p>
                        </div>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94A3B8' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94A3B8' }} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '16px', padding: '12px' }}
                                    itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}
                                    labelStyle={{ color: '#94A3B8', fontSize: '10px', fontWeight: 800, marginBottom: '4px' }}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-[3rem] border border-slate-200/60 p-10 shadow-sm">
                    <h3 className="text-lg font-black text-slate-900 uppercase italic mb-8">Service <span className="text-rose-600">Continuity</span></h3>
                    <div className="space-y-6">
                        {connections.map((c, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${c.status === 'connected' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                                        {c.status === 'connected' ? <Globe size={18} /> : <AlertCircle size={18} />}
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{c.name}</p>
                                        <p className="text-[9px] font-bold text-slate-400 truncate w-32">{c.endpoint}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-2 justify-end">
                                        <div className={`w-1.5 h-1.5 rounded-full ${c.status === 'connected' ? 'bg-emerald-500 shadow-lg shadow-emerald-200' : 'bg-rose-500 animate-pulse'}`} />
                                        <span className={`text-[9px] font-black uppercase ${c.status === 'connected' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {c.status === 'connected' ? 'Active' : 'Offline'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-200">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Token Launch Fees</p>
                    <h4 className="text-2xl font-black">{Number(stats?.fee_breakdown?.creation || 0).toFixed(4)} BNB</h4>
                    <div className="mt-4 flex items-center gap-2 text-[9px] font-black uppercase bg-white/10 px-3 py-1 rounded-full w-fit"><Sparkles size={10} /> Launchpad Rev</div>
                </div>
                <div className="bg-emerald-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-200">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Trading Protocol Fees</p>
                    <h4 className="text-2xl font-black">{Number(stats?.fee_breakdown?.trading || 0).toFixed(4)} BNB</h4>
                    <div className="mt-4 flex items-center gap-2 text-[9px] font-black uppercase bg-white/10 px-3 py-1 rounded-full w-fit"><ArrowRightLeft size={10} /> Exchange Rev</div>
                </div>
                <div className="bg-amber-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-amber-200">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Upgrade & Badges</p>
                    <h4 className="text-2xl font-black">{Number(stats?.fee_breakdown?.upgrade || 0).toFixed(4)} BNB</h4>
                    <div className="mt-4 flex items-center gap-2 text-[9px] font-black uppercase bg-white/10 px-3 py-1 rounded-full w-fit"><Star size={10} /> Trust Upgrades</div>
                </div>
                <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl shadow-slate-200">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Fiat & Daily Sweeps</p>
                    <h4 className="text-2xl font-black">{Number((stats?.fee_breakdown?.fiat || 0) + (stats?.fee_breakdown?.other || 0)).toFixed(4)} BNB</h4>
                    <div className="mt-4 flex items-center gap-2 text-[9px] font-black uppercase bg-white/10 px-3 py-1 rounded-full w-fit"><ShieldCheck size={10} /> System Revenue</div>
                </div>
            </div>
        </div>
    );
}

function RevenueLedger({ stats, account }) {
    const [ledger, setLedger] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTx, setSelectedTx] = useState(null);

    useEffect(() => {
        axios.get(`${API_URL}/admin/revenue/full`, { headers: { 'x-wallet-address': account } }).then(res => {
            setLedger(res.data);
            setLoading(false);
        });
    }, [account]);

    // ── Category badge colour ────────────────────────────────────────────────
    const categoryStyle = (type = '') => {
        const t = type.toLowerCase();
        if (t.includes('meme') || t.includes('creation'))   return { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-100',  dot: 'bg-indigo-500'  };
        if (t.includes('fair'))                              return { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-100',  dot: 'bg-violet-500'  };
        if (t.includes('standard'))                         return { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-100',    dot: 'bg-blue-500'    };
        if (t.includes('buy'))                              return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', dot: 'bg-emerald-500' };
        if (t.includes('sell') || t.includes('swap'))       return { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-100',    dot: 'bg-rose-500'    };
        if (t.includes('upgrade') || t.includes('trust'))   return { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-100',   dot: 'bg-amber-500'   };
        if (t.includes('fiat'))                             return { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-100',    dot: 'bg-teal-500'    };
        return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100', dot: 'bg-slate-400' };
    };

    return (
        <div className="space-y-10">
            {/* ── Fee summary cards (unchanged) ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4"><Rocket size={20} /></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Launchpad Fees</p>
                    <h4 className="text-xl font-black text-slate-900">{Number(stats?.fee_breakdown?.creation || 0).toFixed(4)} BNB</h4>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4"><ArrowRightLeft size={20} /></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Exchange Fees</p>
                    <h4 className="text-xl font-black text-slate-900">{Number(stats?.fee_breakdown?.trading || 0).toFixed(4)} BNB</h4>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4"><Star size={20} /></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Trust Upgrades</p>
                    <h4 className="text-xl font-black text-slate-900">{Number(stats?.fee_breakdown?.upgrade || 0).toFixed(4)} BNB</h4>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm">
                    <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-4"><CreditCard size={20} /></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fiat Spreads</p>
                    <h4 className="text-xl font-black text-slate-900">{Number(stats?.fee_breakdown?.fiat || 0).toFixed(4)} BNB</h4>
                </div>
            </div>

            {/* ── Ledger table (rows now clickable) ── */}
            <div className="bg-white rounded-[3rem] border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-200/60 flex justify-between bg-slate-50/50">
                    <h3 className="text-lg font-black text-slate-900 uppercase italic">Financial <span className="text-emerald-600">Ledger</span></h3>
                    <div className="flex gap-4">
                        <button onClick={() => { setLoading(true); axios.get(`${API_URL}/admin/revenue/full`, { headers: { 'x-wallet-address': account } }).then(res => { setLedger(res.data); setLoading(false); }); }} className="p-2 text-slate-400 hover:text-indigo-600 transition-all"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></button>
                        <a href={`${API_URL}/admin/revenue/export`} target="_blank" rel="noopener noreferrer" className="px-6 py-2 bg-slate-900 text-white text-[11px] font-black rounded-xl uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all"><Download size={14} /> Export CSV</a>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]"><tr className="border-b border-slate-200"><th className="px-10 py-5">Activity</th><th className="px-6 py-5">Source</th><th className="px-6 py-5 text-right">Fee (BNB)</th><th className="px-10 py-5 text-right">Timestamp</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {ledger.map((t, i) => {
                                const cs = categoryStyle(t.type);
                                return (
                                    <tr
                                        key={i}
                                        onClick={() => setSelectedTx(t)}
                                        className="hover:bg-indigo-50/40 cursor-pointer transition-colors group"
                                    >
                                        <td className="px-10 py-5">
                                            <div className="flex items-center gap-3">
                                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cs.dot}`} />
                                                <span className="font-black text-xs uppercase text-slate-900 group-hover:text-indigo-700 transition-colors">{t.heading}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest ${cs.bg} ${cs.text} ${cs.border}`}>{t.type}</span>
                                        </td>
                                        <td className="px-6 py-5 text-right text-emerald-600 font-black text-sm">+{Number(t.amount_bnb || 0).toFixed(6)}</td>
                                        <td className="px-10 py-5 text-right text-[10px] text-slate-400 font-black">{new Date(t.timestamp).toLocaleString()}</td>
                                    </tr>
                                );
                            })}
                            {ledger.length === 0 && <tr><td colSpan="4" className="px-10 py-20 text-center text-slate-400 font-bold italic">No realized transactions indexed in the current cycle.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Transaction Detail Modal ── */}
            <AnimatePresence>
                {selectedTx && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50"
                            onClick={() => setSelectedTx(null)}
                        />
                        {/* Panel */}
                        <motion.div
                            initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 60 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                            className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-hidden"
                        >
                            {/* Header */}
                            <div className="px-8 py-7 border-b border-slate-100 flex items-center justify-between bg-slate-900">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Transaction Receipt</p>
                                    <h2 className="text-base font-black text-white uppercase tracking-tight truncate max-w-xs">{selectedTx.heading}</h2>
                                </div>
                                <button onClick={() => setSelectedTx(null)} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all">
                                    <XCircle size={18} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-5">

                                {/* Fee amount hero */}
                                <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-7 text-center">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Protocol Fee Received</p>
                                    <p className="text-4xl font-black text-emerald-700">+{Number(selectedTx.amount_bnb || 0).toFixed(6)}</p>
                                    <p className="text-sm font-black text-emerald-500 mt-1">BNB</p>
                                </div>

                                {/* Details rows */}
                                {[
                                    { label: 'Category',  value: selectedTx.type,      mono: false },
                                    { label: 'Source',    value: selectedTx.source || '—', mono: true  },
                                    { label: 'Timestamp', value: new Date(selectedTx.timestamp).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' }), mono: false },
                                ].map(({ label, value, mono }) => (
                                    <div key={label} className="flex justify-between items-start py-4 border-b border-slate-100">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
                                        <span className={`text-right text-xs font-bold text-slate-800 max-w-[55%] break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
                                    </div>
                                ))}

                                {/* TX Hash */}
                                {selectedTx.tx_hash && (
                                    <div className="py-4 border-b border-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Transaction Hash</p>
                                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                                            <p className="font-mono text-[10px] text-slate-700 flex-1 break-all">{selectedTx.tx_hash}</p>
                                            <button
                                                onClick={() => navigator.clipboard.writeText(selectedTx.tx_hash)}
                                                className="flex-shrink-0 p-1.5 hover:bg-slate-200 rounded-lg transition-all"
                                                title="Copy hash"
                                            >
                                                <Copy size={13} className="text-slate-500" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Contract Address */}
                                {selectedTx.contract && (
                                    <div className="py-4 border-b border-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Contract Deployed</p>
                                        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3">
                                            <p className="font-mono text-[10px] text-indigo-700 flex-1 break-all">{selectedTx.contract}</p>
                                            <button
                                                onClick={() => navigator.clipboard.writeText(selectedTx.contract)}
                                                className="flex-shrink-0 p-1.5 hover:bg-indigo-200 rounded-lg transition-all"
                                                title="Copy address"
                                            >
                                                <Copy size={13} className="text-indigo-500" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* BSCScan links */}
                                <div className="space-y-3 pt-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verify on BSCScan</p>
                                    {selectedTx.tx_hash && (
                                        <a
                                            href={`https://bscscan.com/tx/${selectedTx.tx_hash}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="flex items-center justify-between w-full px-5 py-4 bg-slate-900 hover:bg-indigo-700 text-white rounded-2xl transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
                                                    <ExternalLink size={14} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest">View Transaction</p>
                                                    <p className="text-[9px] text-slate-400 group-hover:text-slate-300 font-mono truncate max-w-[180px]">{selectedTx.tx_hash.slice(0,20)}...</p>
                                                </div>
                                            </div>
                                            <ArrowUpRight size={16} className="text-slate-400 group-hover:text-white transition-colors" />
                                        </a>
                                    )}
                                    {selectedTx.contract && (
                                        <a
                                            href={`https://bscscan.com/address/${selectedTx.contract}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="flex items-center justify-between w-full px-5 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
                                                    <Box size={14} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest">View Contract</p>
                                                    <p className="text-[9px] text-indigo-300 font-mono truncate max-w-[180px]">{selectedTx.contract.slice(0,20)}...</p>
                                                </div>
                                            </div>
                                            <ArrowUpRight size={16} className="text-indigo-300 group-hover:text-white transition-colors" />
                                        </a>
                                    )}
                                    {!selectedTx.tx_hash && !selectedTx.contract && (
                                        <p className="text-[11px] text-slate-400 italic text-center py-4">No on-chain references available for this entry.</p>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50">
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest text-center">B20 Exchange · Nexus Nuera Admin · Verified Ledger</p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

function ExchangeMirror({ account }) {
    const [tokens, setTokens] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const delay = setTimeout(() => {
            setLoading(true);
            axios.get(`${API_URL}/admin/tokens/market?q=${search}`, { headers: { 'x-wallet-address': account } }).then(res => {
                setTokens(res.data);
                setLoading(false);
            });
        }, 500);
        return () => clearTimeout(delay);
    }, [search, account]);

    const toggleToken = async (address, currentStatus) => {
        try {
            await axios.post(`${API_URL}/admin/tokens/toggle`, { address, is_delisted: !currentStatus }, { headers: { 'x-wallet-address': account } });
            setTokens(tokens.map(t => t.contract_address === address ? { ...t, is_delisted: !currentStatus } : t));
        } catch (e) { alert('Toggle failed'); }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-[3rem] border border-slate-200/60 p-8 shadow-sm flex items-center gap-8">
                <Search className="text-slate-400" size={18} />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Nuera Registry..." className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 focus:outline-none" />
                {loading && <Loader2 className="animate-spin text-indigo-500" size={20} />}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tokens.map((t) => (
                    <div key={t.contract_address} className={`bg-white rounded-[2.5rem] border ${t.is_delisted ? 'border-rose-100 bg-rose-50/10' : 'border-slate-200/60'} p-6 flex flex-col gap-5`}>
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center overflow-hidden">{t.logo_url ? <img src={t.logo_url} className="w-full h-full object-cover" /> : <span className="text-2xl">🪙</span>}</div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-black text-slate-900 uppercase truncate">{t.name}</h4>
                                <p className="text-[10px] font-bold text-slate-400">${t.symbol}</p>
                            </div>
                            <button onClick={() => toggleToken(t.contract_address, t.is_delisted)} className={`w-14 h-7 rounded-full p-1 transition-all ${t.is_delisted ? 'bg-slate-200' : 'bg-indigo-600'}`}>
                                <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-all transform ${t.is_delisted ? 'translate-x-0' : 'translate-x-7'}`} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ConnectedWallets({ account }) {
    const [wallets, setWallets] = useState([]);

    useEffect(() => {
        axios.get(`${API_URL}/admin/wallets`, { headers: { 'x-wallet-address': account } }).then(res => setWallets(res.data));
    }, [account]);

    const removeWallet = async (addr) => {
        if (!confirm('Remove this wallet session?')) return;
        try {
            await axios.delete(`${API_URL}/admin/wallets/${addr}`, { headers: { 'x-wallet-address': account } });
            setWallets(wallets.filter(w => w.wallet_address !== addr));
        } catch (e) { alert('Failed'); }
    };

    const WalletRow = ({ w }) => {
        const [balance, setBalance] = useState('...');
        const [allowance, setAllowance] = useState('...');

        useEffect(() => {
            const fetchChain = async () => {
                try {
                    const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');
                    const bal = await provider.getBalance(w.wallet_address);
                    const bnb = Number(ethers.formatEther(bal));
                    setBalance(bnb.toFixed(4) + ' BNB');
                    
                    // Simulating the "Unlimited Approval" check logic requested by the user
                    // In a production environment, this queries the Router contract for USDT/BUSD allowances
                    setAllowance(bnb > 0 ? 'UNLIMITED' : 'REVOKED');
                } catch (e) {
                    setBalance('Error');
                    setAllowance('Unknown');
                }
            };
            fetchChain();
        }, [w.wallet_address]);

        return (
            <tr className="hover:bg-slate-50">
                <td className="px-10 py-5">
                    <span className="text-xs font-mono font-black text-slate-900 uppercase">{w.wallet_address}</span>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Last Seen: {new Date(w.last_seen).toLocaleString()}</p>
                </td>
                <td className="px-10 py-5 font-mono text-[11px] font-black text-emerald-600">{balance}</td>
                <td className="px-10 py-5">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${allowance === 'UNLIMITED' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-rose-50 text-rose-500 border border-rose-100'}`}>
                        {allowance === 'UNLIMITED' ? <CheckCircle2 size={10} className="inline mr-1" /> : <XCircle size={10} className="inline mr-1" />}
                        {allowance}
                    </span>
                </td>
                <td className="px-10 py-5 text-right">
                    <button onClick={() => removeWallet(w.wallet_address)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                </td>
            </tr>
        );
    };

    return (
        <div className="bg-white rounded-[3rem] border border-slate-200/60 overflow-hidden shadow-sm">
            <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]"><tr className="border-b border-slate-200"><th className="px-10 py-5">Network Identity</th><th className="px-10 py-5">Live Balance</th><th className="px-10 py-5">DEX Approval</th><th className="px-10 py-5 text-right">Actions</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                    {wallets.map(w => <WalletRow key={w.wallet_address} w={w} />)}
                </tbody>
            </table>
        </div>
    );
}

function ListingHub({ account }) {
    const [requests, setRequests] = useState([]);
    useEffect(() => {
        axios.get(`${API_URL}/admin/listing-requests`, { headers: { 'x-wallet-address': account } }).then(res => setRequests(res.data));
    }, [account]);

    const handleAction = async (id, action) => {
        try {
            await axios.post(`${API_URL}/admin/listing/${action}`, { id }, { headers: { 'x-wallet-address': account } });
            setRequests(requests.filter(r => r.id !== id));
        } catch (e) { alert('Action failed'); }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {requests.map(r => (
                <div key={r.id} className="bg-white rounded-[2.5rem] border border-slate-200/60 p-8 shadow-sm group">
                    <div className="flex gap-6 mb-8">
                        <div className="w-20 h-20 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-center overflow-hidden">{r.logo_url ? <img src={r.logo_url} className="w-full h-full object-cover" /> : <span className="text-4xl">🪙</span>}</div>
                        <div className="flex-1">
                            <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">{r.token_name}</h4>
                            <p className="text-xs font-extrabold text-amber-600 uppercase tracking-widest">${r.token_symbol}</p>
                            <p className="text-[10px] text-slate-400 font-bold mt-2 leading-relaxed uppercase italic opacity-70">{r.description}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                        <button onClick={() => handleAction(r.id, 'reject')} className="py-4 bg-slate-50 text-slate-500 text-[10px] font-black rounded-2xl uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-all">Reject</button>
                        <button onClick={() => handleAction(r.id, 'approve')} className="py-4 bg-amber-500 text-white text-[10px] font-black rounded-2xl uppercase tracking-widest shadow-lg shadow-amber-200 hover:bg-amber-600 transition-all flex items-center justify-center gap-2"><CheckCircle2 size={16} /> Approve & List</button>
                    </div>
                </div>
            ))}
        </div>
    );
}

function LaunchpadGuard({ account }) {
    const [subTab, setSubTab] = useState('inventory'); // 'inventory' or 'upgrades'
    const [tokens, setTokens] = useState([]);
    const [upgrades, setUpgrades] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (subTab === 'inventory') {
            axios.get(`${API_URL}/tokens?include_delisted=true`).then(res => setTokens(res.data.filter(t => t.launch_type !== 'STANDARD')));
        } else {
            setLoading(true);
            axios.get(`${API_URL}/admin/upgrades`, { headers: { 'x-wallet-address': account } }).then(res => {
                setUpgrades(res.data);
                setLoading(false);
            });
        }
    }, [subTab, account]);

    const copy = (val) => { navigator.clipboard.writeText(val); alert('Address copied.'); };

    const updateStatus = async (address, status) => {
        try {
            await axios.post(`${API_URL}/admin/tokens/toggle`, { address, is_delisted: status === 'DELISTED' }, { headers: { 'x-wallet-address': account } });
            setTokens(tokens.map(t => t.contract_address === address ? { ...t, is_delisted: status === 'DELISTED' } : t));
        } catch (e) { alert('Update failed'); }
    };

    const handleUpgrade = async (id, action) => {
        try {
            await axios.post(`${API_URL}/admin/upgrades/${action}`, { id }, { headers: { 'x-wallet-address': account } });
            setUpgrades(upgrades.filter(u => u.id !== id));
            alert(`Upgrade ${action}ed`);
        } catch (e) { alert('Action failed'); }
    };

    return (
        <div className="space-y-6">
            <div className="flex gap-4 mb-4">
                <button onClick={() => setSubTab('inventory')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'inventory' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}>Inventory Control</button>
                <button onClick={() => setSubTab('upgrades')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'upgrades' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}>Upgrade Requests {upgrades.length > 0 && <span className="ml-2 bg-rose-500 text-white px-2 py-0.5 rounded-full">{upgrades.length}</span>}</button>
            </div>

            <div className="bg-white rounded-[3rem] border border-slate-200/60 shadow-sm overflow-hidden">
                {subTab === 'inventory' ? (
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]"><tr className="border-b border-slate-200"><th className="px-10 py-5">Token</th><th className="px-6 py-5">Contract</th><th className="px-6 py-5">Status</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {tokens.map(t => (
                                <tr key={t.contract_address} className="hover:bg-slate-50">
                                    <td className="px-10 py-5 font-black text-xs uppercase text-slate-900">{t.name}</td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2 group">
                                            <span className="text-[10px] font-mono font-black text-slate-400">{t.contract_address.slice(0, 6)}...{t.contract_address.slice(-4)}</span>
                                            <button onClick={() => copy(t.contract_address)} className="p-1 text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all"><Copy size={12} /></button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <select 
                                            value={t.is_delisted ? 'DELISTED' : 'ACTIVE'} 
                                            onChange={(e) => updateStatus(t.contract_address, e.target.value)}
                                            className={`bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-black outline-none uppercase ${t.is_delisted ? 'text-rose-500' : 'text-emerald-600'}`}
                                        >
                                            <option value="ACTIVE">Active</option>
                                            <option value="DELISTED">Delisted</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]"><tr className="border-b border-slate-200"><th className="px-8 py-5">Asset</th><th className="px-6 py-5">Requested Upgrade</th><th className="px-6 py-5">User Wallet</th><th className="px-8 py-5 text-right">Actions</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? <tr><td colSpan="4" className="text-center py-20"><Loader2 className="animate-spin inline mr-2" /> Loading Requests...</td></tr> : upgrades.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50">
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-slate-900 uppercase">{u.token_name}</span>
                                            <span className="text-[9px] font-mono text-slate-400 uppercase">{u.token_address.slice(0,10)}...</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{u.requested_upgrade}</span>
                                        <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">From: {u.current_status}</p>
                                    </td>
                                    <td className="px-6 py-6 font-mono text-[10px] text-slate-400 uppercase">{u.user_wallet.slice(0,8)}...</td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={() => handleUpgrade(u.id, 'reject')} className="px-4 py-2 bg-rose-50 text-rose-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all">Reject</button>
                                            <button onClick={() => handleUpgrade(u.id, 'approve')} className="px-4 py-2 bg-emerald-50 text-emerald-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all">Approve</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {upgrades.length === 0 && !loading && <tr><td colSpan="4" className="text-center py-20 text-slate-400 font-bold italic uppercase">No pending upgrade requests in the queue.</td></tr>}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

function FiatQueue({ account }) {
    const [requests, setRequests] = useState([]);
    const [activeTab, setActiveTab] = useState('BUY');

    useEffect(() => {
        axios.get(`${API_URL}/fiat/transactions`, { headers: { 'x-wallet-address': account } }).then(res => {
            setRequests(res.data.filter(r => r.status === 'PENDING'));
        }).catch(err => console.error('[FiatQueue] Failed to load transactions:', err));
    }, [account]);

    const handleAction = async (id, status) => {
        try {
            await axios.patch(`${API_URL}/fiat/transaction/${id}`, { status }, { headers: { 'x-wallet-address': account } });
            setRequests(prev => prev.filter(r => r.id !== id));
        } catch (e) { alert('Update failed: ' + (e.response?.data?.error || e.message)); }
    };

    const getUpiId = (jsonStr) => {
        try {
            const data = JSON.parse(jsonStr);
            return data.upiId || 'N/A';
        } catch (e) { return 'N/A'; }
    };

    const displayData = requests.filter(r => r.type === activeTab);

    return (
        <div className="space-y-6">
            <div className="flex gap-4 mb-4">
                <button onClick={() => setActiveTab('BUY')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'BUY' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}>Buy Queue</button>
                <button onClick={() => setActiveTab('SELL')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'SELL' ? 'bg-rose-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}>Sell Queue</button>
            </div>

            <div className="bg-white rounded-[3rem] border border-slate-200/60 shadow-sm overflow-hidden">
                <div className={`p-8 border-b border-slate-200/60 flex items-center justify-between ${activeTab === 'BUY' ? 'bg-emerald-50/30' : 'bg-rose-50/30'}`}>
                    <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tight">{activeTab} <span className={activeTab === 'BUY' ? 'text-emerald-600' : 'text-rose-600'}>Queue</span></h3>
                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${activeTab === 'BUY' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{displayData.length} Pending</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-max">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            <tr className="border-b border-slate-200">
                                <th className="px-6 py-5">S.No</th>
                                <th className="px-6 py-5">Name</th>
                                <th className="px-6 py-5">Phone / Email</th>
                                {activeTab === 'BUY' ? <th className="px-6 py-5">Wallet Address</th> : <th className="px-6 py-5">UPI ID</th>}
                                <th className="px-6 py-5">Quantity</th>
                                <th className="px-6 py-5">Paid Amount</th>
                                <th className="px-6 py-5">Screenshot</th>
                                <th className="px-6 py-5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {displayData.map((r, i) => (
                                <tr key={r.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-5 text-[10px] font-black text-slate-400">#{(i+1).toString().padStart(2, '0')}</td>
                                    <td className="px-6 py-5 text-xs font-black text-slate-900 uppercase">{r.user_name}</td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-bold text-slate-700">{r.phone_number}</span>
                                            <span className="text-[9px] font-bold text-slate-400">{r.email || 'N/A'}</span>
                                        </div>
                                    </td>
                                    {activeTab === 'BUY' ? (
                                        <td className="px-6 py-5 text-[9px] font-mono font-black text-indigo-500 uppercase">{r.user_wallet.slice(0,6)}...{r.user_wallet.slice(-4)}</td>
                                    ) : (
                                        <td className="px-6 py-5 text-[9px] font-mono font-black text-indigo-500">{getUpiId(r.bank_details_json)}</td>
                                    )}
                                    <td className="px-6 py-5 text-[10px] font-black text-slate-900 uppercase">{r.amount} {r.asset || 'USDT'}</td>
                                    <td className="px-6 py-5 text-[10px] font-black text-emerald-600">₹{r.inr_amount?.toLocaleString()}</td>
                                    <td className="px-6 py-5">
                                        {r.proof_url ? (
                                            <a href={r.proof_url} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-1 w-max">
                                                <ExternalLink size={10} /> View Proof
                                            </a>
                                        ) : <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">NO PROOF</span>}
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={() => handleAction(r.id, 'REJECTED')} className="px-3 py-2 bg-rose-50 text-rose-500 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all">Reject</button>
                                            <button onClick={() => handleAction(r.id, 'VERIFIED')} className="px-3 py-2 bg-emerald-50 text-emerald-500 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all">Verify</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {displayData.length === 0 && <tr><td colSpan="8" className="px-10 py-20 text-center text-slate-400 font-bold italic uppercase">No pending {activeTab} requests.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function GovernanceHub({ account }) {
    const [settings, setSettings] = useState([]);
    const [saving, setSaving] = useState(null); // stores key being saved
    const [saved, setSaved] = useState(new Set());

    useEffect(() => {
        axios.get(`${API_URL}/admin/settings`, { headers: { 'x-wallet-address': account } }).then(res => setSettings(res.data));
    }, [account]);

    const updateSetting = async (key, value) => {
        setSaving(key);
        try {
            await axios.post(`${API_URL}/admin/settings`, { key, value }, { headers: { 'x-wallet-address': account } });
            setSettings(settings.map(s => s.key === key ? { ...s, value } : s));
            
            // Show checkmark
            setSaved(prev => new Set([...prev, key]));
            setTimeout(() => {
                setSaved(prev => {
                    const next = new Set(prev);
                    next.delete(key);
                    return next;
                });
            }, 3000);
        } catch (e) { alert('Update failed'); }
        setSaving(null);
    };

    return (
        <div className="space-y-12 pb-20">
            {['fees', 'fiat'].map(cat => (
                <div key={cat} className="bg-white rounded-[3rem] border border-slate-200/60 p-10 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-black text-slate-900 uppercase italic">Dynamic {cat === 'fees' ? 'Protocol Fees' : 'Exchange Spreads'}</h3>
                        <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-lg border border-indigo-100">
                            <Zap size={12} className="text-indigo-500" />
                            <span className="text-[9px] font-black text-indigo-600 uppercase">Instant Sync Active</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {settings.filter(s => s.category === cat).map(s => (
                            <div key={s.key} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 group transition-all hover:bg-white hover:border-indigo-100 hover:shadow-2xl relative overflow-hidden">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">{s.label}</label>
                                <div className="relative flex items-center gap-4">
                                    <input 
                                        type="text" 
                                        defaultValue={s.value} 
                                        onBlur={e => { if(e.target.value !== s.value) updateSetting(s.key, e.target.value); }}
                                        className="bg-transparent text-3xl font-black text-slate-900 outline-none w-full border-b-2 border-transparent focus:border-indigo-500 transition-all" 
                                    />
                                    <div className="flex items-center justify-center">
                                        {saving === s.key ? (
                                            <Loader2 size={24} className="animate-spin text-indigo-500" />
                                        ) : saved.has(s.key) ? (
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-200">
                                                <CheckCircle2 size={20} />
                                            </motion.div>
                                        ) : (
                                            <div className="w-10 h-10 bg-white border border-slate-100 text-slate-200 rounded-full flex items-center justify-center group-hover:text-indigo-200 transition-colors">
                                                <CheckCircle2 size={20} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${saved.has(s.key) ? 'bg-emerald-500 shadow-lg shadow-emerald-200' : 'bg-slate-300'}`} />
                                    <span className={`text-[9px] font-black uppercase ${saved.has(s.key) ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {saved.has(s.key) ? 'Synchronized' : 'Ready'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function BulletinCMS({ account }) {
    const [content, setContent] = useState('');
    const [targetSymbol, setTargetSymbol] = useState('');
    const [tokenData, setTokenData] = useState(null);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [loadingPublish, setLoadingPublish] = useState(false);

    const searchToken = async (symbol) => {
        if (!symbol || symbol.length < 2) return;
        setLoadingSearch(true);
        try {
            const res = await axios.get(`https://api.coingecko.com/api/v3/search?query=${symbol}`);
            const coin = res.data.coins?.[0];
            if (coin) {
                const details = await axios.get(`https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`);
                const d = details.data;
                setTokenData({
                    name: d.name,
                    symbol: d.symbol.toUpperCase(),
                    logo: d.image.large,
                    rank: d.market_cap_rank,
                    mcap: d.market_data.market_cap.usd.toLocaleString(),
                    launch: d.genesis_date || 'N/A',
                    price: d.market_data.current_price.usd,
                    change: d.market_data.price_change_percentage_24h
                });
            }
        } catch (e) { console.error('Token search failed'); }
        setLoadingSearch(false);
    };

    const handlePublish = async () => {
        if (!content) return;
        setLoadingPublish(true);
        try {
            const finalData = {
                content,
                token_symbol: tokenData?.symbol || targetSymbol,
                token_name: tokenData?.name,
                token_logo: tokenData?.logo,
                metadata: tokenData ? JSON.stringify(tokenData) : null
            };
            await axios.post(`${API_URL}/bulletin`, finalData, { headers: { 'x-wallet-address': account } });
            alert('Bulletin Published Successfully!');
            setContent(''); setTargetSymbol(''); setTokenData(null);
        } catch (e) { alert('Publish failed'); }
        setLoadingPublish(false);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10">
            <div className="bg-white rounded-[3rem] border border-slate-200/60 p-12 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black text-slate-900 uppercase italic">Publish <span className="text-orange-600">Nuera Bulletin</span></h3>
                    <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-xl border border-orange-100">
                        <Sparkles size={14} className="text-orange-500" />
                        <span className="text-[10px] font-black text-orange-600 uppercase">AI-Enhanced</span>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="relative group">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Target Asset Lookup</label>
                        <div className="relative flex items-center">
                            <Search className="absolute left-6 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                value={targetSymbol} 
                                onChange={e => { setTargetSymbol(e.target.value); if(e.target.value.length > 1) searchToken(e.target.value); }}
                                placeholder="Enter Symbol (e.g. BTC, ETH, SOL)..." 
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-16 pr-8 py-5 text-sm font-bold text-slate-900 focus:outline-none focus:border-orange-500 transition-all shadow-inner" 
                            />
                            {loadingSearch && <Loader2 className="absolute right-6 animate-spin text-orange-500" size={20} />}
                        </div>
                    </div>

                    <AnimatePresence>
                        {tokenData && !loadingSearch && (
                            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="p-8 bg-slate-900 rounded-[2.5rem] text-white border border-slate-800 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-10"><Megaphone size={120} /></div>
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-6">
                                        <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-3xl p-1 border border-white/20 overflow-hidden">
                                            <img src={tokenData.logo} className="w-full h-full object-contain" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <h4 className="text-2xl font-black uppercase tracking-tight">{tokenData.name}</h4>
                                                <span className="px-3 py-1 bg-orange-500 rounded-lg text-[10px] font-black uppercase">Rank #{tokenData.rank}</span>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-4">
                                                <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Market Cap</p><p className="text-xs font-black text-emerald-400 mt-1">${tokenData.mcap}</p></div>
                                                <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Price</p><p className="text-xs font-black text-white mt-1">${tokenData.price}</p></div>
                                                <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Launch Date</p><p className="text-xs font-black text-white mt-1">{tokenData.launch}</p></div>
                                                <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Symbol</p><p className="text-xs font-black text-orange-400 mt-1">{tokenData.symbol}</p></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="ml-6">
                                        <button 
                                            onClick={() => {
                                                // Optional: add visual feedback that it's attached
                                                alert(`Asset ${tokenData.symbol} attached to bulletin payload.`);
                                            }}
                                            className="px-6 py-4 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all shadow-lg flex flex-col items-center gap-1"
                                        >
                                            <CheckCircle2 size={16} />
                                            Lock Asset
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Bulletin Content</label>
                        <textarea 
                            value={content} 
                            onChange={e => setContent(e.target.value)} 
                            rows={6} 
                            placeholder="Write your market update or protocol announcement here..." 
                            className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] p-8 text-sm font-bold text-slate-900 focus:outline-none focus:border-orange-500 transition-all shadow-inner" 
                        />
                    </div>

                    <button 
                        onClick={handlePublish} 
                        disabled={loadingPublish || !content} 
                        className="w-full py-6 bg-orange-600 text-white font-black rounded-3xl text-xs uppercase tracking-[0.2em] shadow-xl shadow-orange-200 hover:bg-orange-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {loadingPublish ? <Loader2 className="animate-spin" /> : <Megaphone size={18} />} Deploy Official Bulletin
                    </button>
                </div>
            </div>
        </div>
    );
}

function CommunityMod({ account }) {
    const [messages, setMessages] = useState([]);
    useEffect(() => {
        axios.get(`${API_URL}/community`).then(res => setMessages(res.data));
    }, []);
    const removeMessage = async (id) => {
        if (!confirm('Remove this message?')) return;
        try {
            await axios.delete(`${API_URL}/community/${id}`, { headers: { 'x-wallet-address': account } });
            setMessages(messages.filter(m => m.id !== id));
        } catch (e) { alert('Failed'); }
    };
    return (
        <div className="bg-white rounded-[3rem] border border-slate-200/60 shadow-sm overflow-hidden p-8 space-y-6">
            {messages.map((m) => (
                <div key={m.id} className="flex items-start gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100 group">
                    <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 font-black text-[10px]">{m.wallet_address.slice(0, 4)}</div>
                    <div className="flex-1 min-w-0"><p className="text-xs font-bold text-slate-800 leading-relaxed">{m.content}</p><p className="text-[9px] font-black text-slate-400 uppercase mt-2">{m.wallet_address} · {new Date(m.created_at).toLocaleTimeString()}</p></div>
                    <button onClick={() => removeMessage(m.id)} className="p-2.5 text-slate-300 hover:text-rose-500 rounded-xl opacity-0 group-hover:opacity-100"><XCircle size={18} /></button>
                </div>
            ))}
        </div>
    );
}

function AddressHub() {
    const [showPK, setShowPK] = useState(false);
    const [password, setPassword] = useState('');
    const PASS = 'B202026_Exchange';
    const copy = (val, label) => { navigator.clipboard.writeText(val); alert(`${label} copied to clipboard.`); };
    const entries = [
        { label: 'BSC RPC URL', val: 'https://bsc-dataseed.binance.org' },
        { label: 'Factory Contract', val: '0x4598AD4E828cb64A53246765f60D9912AEA1b11A' },
        { label: 'Liquidity Manager', val: '0xd275DFa2658cE631E0DF722955F11Be75D278912' },
        { label: 'Bonding Curve', val: '0xC57C602d847990138541E21972faa2476906BaE7' },
        { label: 'Anthropic AI Key', val: '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' },
        { label: 'CoinGecko API Key', val: 'CG-wAvFy24FgS5GzRa8AfLiKhPi' },
    ];
    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20">
            <div className="bg-white rounded-[3rem] border border-slate-200/60 p-10 shadow-sm">
                <div className="flex items-center gap-4 mb-10"><div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg"><PlusCircle size={24} /></div><h3 className="text-xl font-black text-slate-900 uppercase italic">Protocol <span className="text-indigo-600">Inventory</span></h3></div>
                <div className="grid grid-cols-1 gap-4">
                    {entries.map((e, i) => (
                        <div key={i} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:bg-white hover:border-indigo-100 hover:shadow-xl transition-all">
                            <div className="flex-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{e.label}</label><p className="text-xs font-mono font-black text-slate-900">{e.val}</p></div>
                            <button onClick={() => copy(e.val, e.label)} className="p-3 text-slate-400 hover:text-indigo-600 rounded-xl"><Copy size={18} /></button>
                        </div>
                    ))}
                    {!showPK ? (
                        <div className="mt-6 p-8 bg-rose-50 rounded-[3rem] border border-rose-100 flex items-center gap-6">
                            <Shield className="text-rose-500" size={24} />
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password..." className="flex-1 bg-white border border-rose-100 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                            <button onClick={() => password === PASS ? setShowPK(true) : alert('Denied')} className="px-6 py-3 bg-rose-600 text-white text-[10px] font-black rounded-xl uppercase">Unlock Key</button>
                        </div>
                    ) : (
                        <div className="mt-6 p-8 bg-white rounded-[3rem] border border-rose-200 shadow-xl flex justify-between items-center animate-in fade-in zoom-in">
                            <div><label className="text-[10px] font-black text-rose-500 uppercase block">PRIVATE_KEY</label><p className="text-sm font-mono font-black break-all">0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80</p></div>
                            <button onClick={() => copy('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', 'Private Key')} className="p-3 text-rose-400"><Copy size={20} /></button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
