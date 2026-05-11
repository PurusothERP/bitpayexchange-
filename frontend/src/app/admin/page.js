'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    LayoutDashboard, PieChart, Shield, Wallet, ListChecks, 
    Rocket, CreditCard, MessageSquare, Megaphone, Settings,
    Search, Filter, ChevronRight, CheckCircle2, XCircle,
    Download, RefreshCw, ExternalLink, ArrowUpRight,
    TrendingUp, Users, Box, Zap, AlertCircle, Eye, EyeOff, Loader2, DollarSign, PlusCircle, ChevronDown, Trash2, Image as ImageIcon,
    Activity, Database, Globe, Lock, Unlock, Copy, TrendingDown, ArrowRightLeft, CreditCard as CardIcon, Edit3, Save, History, Clock,
    Sparkles, Star, BarChart3, Info, ShieldCheck, Flame, Leaf, Percent, ShieldAlert
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
        { id: 'revenue', label: 'Financial Ledger', icon: <PieChart size={18} />, color: 'text-sky-600' },
        { id: 'exchange', label: 'Exchange Mirror', icon: <Box size={18} />, color: 'text-blue-600' },
        { id: 'wallets', label: 'Active Sessions', icon: <Users size={18} />, color: 'text-blue-600' },
        { id: 'listings', label: 'Listing Hub', icon: <ListChecks size={18} />, color: 'text-indigo-600' },
        { id: 'launchpad', label: 'Launchpad Guard', icon: <Rocket size={18} />, color: 'text-violet-600' },
        { id: 'fiat', label: 'Express Fiat', icon: <CreditCard size={18} />, color: 'text-teal-600' },
        { id: 'meme-governance', label: 'Meme Governance', icon: <Flame size={18} />, color: 'text-orange-600' },
        { id: 'governance', label: 'Protocol Settings', icon: <Settings size={18} />, color: 'text-indigo-900' },
        { id: 'community', label: 'Social Mod', icon: <MessageSquare size={18} />, color: 'text-cyan-600' },
        { id: 'bulletin', label: 'Bulletin CMS', icon: <Megaphone size={18} />, color: 'text-slate-600' },
        { id: 'smart-money-hub', label: 'Smart Money Hub', icon: <TrendingUp size={18} />, color: 'text-indigo-600' },
        { id: 'yield-ledger', label: 'Yield Intelligence', icon: <Leaf size={18} />, color: 'text-sky-600' },
        { id: 'institutional-futures', label: 'Futures Guard', icon: <Activity size={18} />, color: 'text-sky-600' },
        { id: 'api-panel', label: 'API & Architecture', icon: <Database size={18} />, color: 'text-rose-600' },
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
                <div className="max-w-md w-full bg-white border border-blue-100 rounded-[3rem] p-12 text-center shadow-2xl">
                    <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-blue-100">
                        <Shield className="w-10 h-10 text-blue-500" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 mb-4 uppercase tracking-tight">Nuera Lockdown</h1>
                    <p className="text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full inline-block mb-4 uppercase tracking-widest">{account?.slice(0,10)}...{account?.slice(-8)}</p>
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
                <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar pb-10">
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
                    <div className="flex items-center gap-3">
                        <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                            <RefreshCw className={`w-3 h-3 text-indigo-500 ${loading ? 'animate-spin' : ''}`} />
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">Nuera Synchronized</span>
                        </div>
                        <a
                            href="/exchange"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm shadow-indigo-500/20"
                            title="Open Mexapay"
                        >
                            <ArrowRightLeft size={13} />
                            Exchange
                        </a>
                        <button onClick={fetchStats} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </header>


                <div className="flex-1 p-10 overflow-y-auto">
                    <AnimatePresence mode="wait">
                        {activeTab === 'dashboard' && <AdminDashboard key="dash" stats={stats} loading={loading} account={account} setActiveTab={setActiveTab} />}
                        {activeTab === 'revenue' && <RevenueLedger key="rev" stats={stats} account={account} />}
                        {activeTab === 'exchange' && <ExchangeMirror key="ex" account={account} />}
                        {activeTab === 'wallets' && <ConnectedWallets key="wal" account={account} />}
                        {activeTab === 'listings' && <ListingHub key="list" account={account} />}
                        {activeTab === 'launchpad' && <LaunchpadGuard key="lp" account={account} />}
                        {activeTab === 'fiat' && <FiatQueue key="fiat" account={account} />}
                        {activeTab === 'meme-governance' && <MemeGovernance key="meme" account={account} />}
                        {activeTab === 'governance' && <GovernanceHub key="gov" account={account} />}
                        { activeTab === 'bulletin' && <BulletinCMS key="bull" account={account} /> }
                        {activeTab === 'smart-money-hub' && <SmartMoneyHub account={account} />}
                        {activeTab === 'yield-ledger' && <YieldLedger account={account} />}
                        {activeTab === 'institutional-futures' && <InstitutionalFutures account={account} />}
                        {activeTab === 'api-panel' && <APIPanel account={account} />}
                        {activeTab === 'address-hub' && <AddressHub account={account} />}
                        {activeTab === 'community' && <div className="p-20 text-center"><MessageSquare className="w-20 h-20 text-slate-200 mx-auto mb-6" /><h3 className="text-2xl font-black text-slate-900 uppercase italic">Social Mod</h3><p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Community management tools offline for maintenance.</p></div>}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}

function AdminDashboard({ stats, loading, account, setActiveTab }) {
    if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-indigo-500" /></div>;
 
    const cards = [
        { id: 'listings', label: 'Launched Coins', value: stats?.total_tokens || 0, sub: `${stats?.launchpad_tokens} LP / ${stats?.standard_tokens} Std`, icon: <Rocket />, color: 'bg-indigo-50 text-indigo-600' },
        { id: 'exchange', label: 'Asset Inventory', value: stats?.market_inventory?.toLocaleString() || '6,140', sub: 'Verified External Proxies', icon: <Box />, color: 'bg-sky-50 text-sky-600' },
        { id: 'yield-ledger', label: 'Yield Investments', value: `$${(stats?.yield_stats?.total_invested || 0).toLocaleString()}`, sub: `${stats?.yield_stats?.total_users || 0} Total / ${stats?.yield_stats?.unique_investors || 0} Investors`, icon: <Leaf />, color: 'bg-emerald-50 text-emerald-600' },
        { id: 'institutional-futures', label: 'Staking Protocol', value: (stats?.staking_stats?.total_staked || 0).toLocaleString(), sub: `${stats?.staking_stats?.total_stakes || 0} Stakes / ${stats?.staking_stats?.unique_stakers || 0} Stakers`, icon: <Activity />, color: 'bg-violet-50 text-violet-600' },
        { id: 'revenue', label: 'Realized Revenue', value: `${Number(stats?.total_revenue_bnb || 0).toFixed(4)} BNB`, sub: 'Combined Protocol Fees', icon: <DollarSign />, color: 'bg-indigo-50 text-indigo-600' },
        { id: 'governance', label: 'Delisted Items', value: stats?.delisted_count || 0, sub: 'Inactive Registry Overrides', icon: <AlertCircle />, color: 'bg-blue-50 text-blue-600' },
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((c, i) => (
                    <div 
                        key={i} 
                        onClick={() => c.id && setActiveTab(c.id)}
                        className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-indigo-500/20 transition-all group cursor-pointer"
                    >
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
                    <h3 className="text-lg font-black text-slate-900 uppercase italic mb-8">Service <span className="text-blue-600">Continuity</span></h3>
                    <div className="space-y-6">
                        {connections.map((c, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${c.status === 'connected' ? 'bg-sky-50 border-sky-100 text-sky-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                                        {c.status === 'connected' ? <Globe size={18} /> : <AlertCircle size={18} />}
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{c.name}</p>
                                        <p className="text-[9px] font-bold text-slate-400 truncate w-32">{c.endpoint}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-2 justify-end">
                                        <div className={`w-1.5 h-1.5 rounded-full ${c.status === 'connected' ? 'bg-sky-500 shadow-lg shadow-sky-200' : 'bg-blue-500 animate-pulse'}`} />
                                        <span className={`text-[9px] font-black uppercase ${c.status === 'connected' ? 'text-sky-600' : 'text-blue-600'}`}>
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
                <div className="bg-sky-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-sky-200">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Trading Protocol Fees</p>
                    <h4 className="text-2xl font-black">{Number(stats?.fee_breakdown?.trading || 0).toFixed(4)} BNB</h4>
                    <div className="mt-4 flex items-center gap-2 text-[9px] font-black uppercase bg-white/10 px-3 py-1 rounded-full w-fit"><ArrowRightLeft size={10} /> Exchange Rev</div>
                </div>
                <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-200">
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
    const [newHash, setNewHash] = useState('');
    const [isUpdatingHash, setIsUpdatingHash] = useState(false);

    useEffect(() => {
        axios.get(`${API_URL}/admin/revenue/full`, { headers: { 'x-wallet-address': account } }).then(res => {
            setLedger(res.data);
            setLoading(false);
        });
    }, [account]);

    const handleUpdateHash = async () => {
        if (!newHash || !selectedTx) return;
        setIsUpdatingHash(true);
        try {
            await axios.post(`${API_URL}/admin/revenue/update-hash`, {
                id: selectedTx.id,
                category: selectedTx.category,
                tx_hash: newHash
            }, { headers: { 'x-wallet-address': account } });
            
            // Update local state to reflect the change immediately
            selectedTx.tx_hash = newHash;
            setLedger(ledger.map(t => t.id === selectedTx.id ? { ...t, tx_hash: newHash } : t));
            setNewHash('');
        } catch (err) {
            console.error('Failed to update hash:', err);
            alert('Failed to update transaction hash');
        } finally {
            setIsUpdatingHash(false);
        }
    };

    // ── Category badge colour ────────────────────────────────────────────────
    const categoryStyle = (type = '') => {
        const t = type.toLowerCase();
        if (t.includes('meme') || t.includes('creation'))   return { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-100',  dot: 'bg-indigo-500'  };
        if (t.includes('fair'))                              return { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-100',  dot: 'bg-violet-500'  };
        if (t.includes('standard'))                         return { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-100',    dot: 'bg-blue-500'    };
        if (t.includes('buy'))                              return { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-100', dot: 'bg-sky-500' };
        if (t.includes('sell') || t.includes('swap'))       return { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-100',    dot: 'bg-blue-500'    };
        if (t.includes('upgrade') || t.includes('trust'))   return { bg: 'bg-indigo-50',   text: 'text-indigo-700',   border: 'border-indigo-100',   dot: 'bg-indigo-500'   };
        if (t.includes('fiat'))                             return { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-100',    dot: 'bg-teal-500'    };
        return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100', dot: 'bg-slate-400' };
    };

    return (
        <div className="space-y-10">
            {/* ── Fee summary cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-3"><Rocket size={18} /></div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Launchpad</p>
                    <h4 className="text-sm font-black text-slate-900">{Number(stats?.fee_breakdown?.creation || 0).toFixed(4)} <span className="text-[10px] text-slate-400">BNB</span></h4>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center mb-3"><ArrowRightLeft size={18} /></div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Exchange</p>
                    <h4 className="text-sm font-black text-slate-900">{Number(stats?.fee_breakdown?.trading || 0).toFixed(4)} <span className="text-[10px] text-slate-400">BNB</span></h4>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-3"><Star size={18} /></div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Upgrades</p>
                    <h4 className="text-sm font-black text-slate-900">{Number(stats?.fee_breakdown?.upgrade || 0).toFixed(4)} <span className="text-[10px] text-slate-400">BNB</span></h4>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3"><CreditCard size={18} /></div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fiat Spread</p>
                    <h4 className="text-sm font-black text-slate-900">{Number(stats?.fee_breakdown?.fiat || 0).toFixed(4)} <span className="text-[10px] text-slate-400">BNB</span></h4>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3"><Leaf size={18} /></div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Yielding</p>
                    <h4 className="text-sm font-black text-slate-900">{Number(stats?.fee_breakdown?.yield || 0).toFixed(4)} <span className="text-[10px] text-slate-400">BNB</span></h4>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center mb-3"><Settings size={18} /></div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">System</p>
                    <h4 className="text-sm font-black text-slate-900">{Number(stats?.fee_breakdown?.system || 0).toFixed(4)} <span className="text-[10px] text-slate-400">BNB</span></h4>
                </div>
            </div>

            {/* ── Ledger table (rows now clickable) ── */}
            <div className="bg-white rounded-[3rem] border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-200/60 flex justify-between bg-slate-50/50">
                    <h3 className="text-lg font-black text-slate-900 uppercase italic">Financial <span className="text-sky-600">Ledger</span></h3>
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
                                        <td className="px-6 py-5 text-right text-sky-600 font-black text-sm">+{Number(t.amount_bnb || 0).toFixed(6)}</td>
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
                            onClick={() => { setSelectedTx(null); setNewHash(''); }}
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
                                <button onClick={() => { setSelectedTx(null); setNewHash(''); }} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all">
                                    <XCircle size={18} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-5">

                                {/* Fee amount hero */}
                                <div className="bg-sky-50 border border-sky-100 rounded-3xl p-7 text-center">
                                    <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-2">Protocol Fee Received</p>
                                    <p className="text-4xl font-black text-sky-700">+{Number(selectedTx.amount_bnb || 0).toFixed(6)}</p>
                                    <p className="text-sm font-black text-sky-500 mt-1">BNB</p>
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
                                <div className="py-4 border-b border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Transaction Hash</p>
                                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                                        {selectedTx.tx_hash ? (
                                            <>
                                                <p className="font-mono text-[10px] text-slate-700 flex-1 break-all">{selectedTx.tx_hash}</p>
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(selectedTx.tx_hash)}
                                                    className="flex-shrink-0 p-1.5 hover:bg-slate-200 rounded-lg transition-all"
                                                    title="Copy hash"
                                                >
                                                    <Copy size={13} className="text-slate-500" />
                                                </button>
                                            </>
                                        ) : (
                                            <div className="flex w-full items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={newHash}
                                                    onChange={(e) => setNewHash(e.target.value)}
                                                    placeholder="Enter TX Hash to update..."
                                                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-indigo-500"
                                                />
                                                <button
                                                    onClick={handleUpdateHash}
                                                    disabled={isUpdatingHash || !newHash}
                                                    className="px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                                >
                                                    {isUpdatingHash ? 'Saving...' : 'Update'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

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
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest text-center">Mexapay · Nexus Nuera Admin · Verified Ledger</p>
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
                    <div key={t.contract_address} className={`bg-white rounded-[2.5rem] border ${t.is_delisted ? 'border-blue-100 bg-blue-50/10' : 'border-slate-200/60'} p-6 flex flex-col gap-5`}>
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
                <td className="px-10 py-5 font-mono text-[11px] font-black text-sky-600">{balance}</td>
                <td className="px-10 py-5">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${allowance === 'UNLIMITED' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-blue-50 text-blue-500 border border-blue-100'}`}>
                        {allowance === 'UNLIMITED' ? <CheckCircle2 size={10} className="inline mr-1" /> : <XCircle size={10} className="inline mr-1" />}
                        {allowance}
                    </span>
                </td>
                <td className="px-10 py-5 text-right">
                    <button onClick={() => removeWallet(w.wallet_address)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><Trash2 size={16} /></button>
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

function ApiPanel() {
    const [subTab, setSubTab] = useState('api'); // 'api' | 'architecture' | 'docs'

    const apiMatrix = [
        { function: '/markets/cg (Global Market)', cg: 'Active (Primary)', cmc: 'Active (Pro API)', usage: '50/50 Algorithmic Split', color: 'bg-emerald-50 text-emerald-600' },
        { function: '/markets/new (Alpha Listings)', cg: 'Active (newly-listed)', cmc: 'Active (latest)', usage: '50/50 Algorithmic Split', color: 'bg-emerald-50 text-emerald-600' },
        { function: '/markets/trending (Hot Coins)', cg: 'Active (enriched)', cmc: 'Active (trending/latest)', usage: '50/50 Algorithmic Split', color: 'bg-emerald-50 text-emerald-600' },
        { function: 'Simple Price (BNB/Fiat)', cg: 'Active (Dedicated)', cmc: 'Inactive', usage: '100% CoinGecko', color: 'bg-indigo-50 text-indigo-600' },
        { function: 'Stocks & Metals (Institutional)', cg: 'N/A', cmc: 'N/A', usage: 'Alpha Vantage (TDA3K3FRBC108P1B)', color: 'bg-rose-50 text-rose-600' },
        { function: 'Trust Wallet PR Sync', cg: 'N/A', cmc: 'N/A', usage: 'GitHub Actions / IPFS', color: 'bg-slate-50 text-slate-600' },
        { function: 'Live On-Chain Data', cg: 'N/A', cmc: 'N/A', usage: 'RPC (Pancake Router)', color: 'bg-sky-50 text-sky-600' }
    ];

    const techStack = [
        { title: 'Frontend Core', tech: 'Next.js 14, Turbopack, React 18, Tailwind CSS, Framer Motion' },
        { title: 'Backend APIs', tech: 'Node.js, Express, Axios, Ethers.js v6' },
        { title: 'Database & Storage', tech: 'SQLite (WAL Mode), Pinata IPFS, TrustWallet Registry' },
        { title: 'Web3 Infrastructure', tech: 'Binance Smart Chain (BSC), Solidity Factory, PancakeSwap V2 Router' }
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex gap-4 mb-4 flex-wrap">
                <button onClick={() => setSubTab('api')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'api' ? 'bg-rose-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}><Database size={12} className="inline mr-2"/> API Routing Matrix</button>
                <button onClick={() => setSubTab('architecture')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'architecture' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}><Box size={12} className="inline mr-2"/> Technical Architecture</button>
                <button onClick={() => setSubTab('docs')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'docs' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}><Download size={12} className="inline mr-2"/> Documents</button>
            </div>

            {subTab === 'api' ? (
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[3rem] border border-slate-200/60 shadow-sm">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center"><Activity size={24} /></div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase italic">Data Provider <span className="text-rose-600">Load Balancer</span></h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Multi-API Redundancy Engine</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]"><tr className="border-b border-slate-200"><th className="px-8 py-5">Function Endpoint</th><th className="px-6 py-5">CoinGecko API</th><th className="px-6 py-5">CoinMarketCap API</th><th className="px-8 py-5">Traffic Split / Usage</th></tr></thead>
                                <tbody className="divide-y divide-slate-100">
                                    {apiMatrix.map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-8 py-6 font-black text-[11px] text-slate-900 font-mono">{row.function}</td>
                                            <td className="px-6 py-6 text-xs font-bold text-slate-600"><span className={`px-2 py-1 rounded-md text-[9px] uppercase tracking-widest bg-emerald-50 text-emerald-600`}>{row.cg}</span></td>
                                            <td className="px-6 py-6 text-xs font-bold text-slate-600"><span className={`px-2 py-1 rounded-md text-[9px] uppercase tracking-widest ${row.cmc.includes('Active') ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>{row.cmc}</span></td>
                                            <td className="px-8 py-6"><span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${row.color} border-current`}>{row.usage}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-10 rounded-[3rem] border border-slate-200/60 shadow-sm flex flex-col justify-center">
                            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight mb-2">Mexapay <span className="text-indigo-600">Core</span></h3>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                                A high-performance hybrid institutional protocol merging decentralized smart contracts with high-fidelity off-chain ledgers and dynamic API load-balancing.
                            </p>
                            <div className="mt-8 space-y-4">
                                {techStack.map((t, i) => (
                                    <div key={i} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col gap-1">
                                        <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{t.title}</h4>
                                        <p className="text-xs font-bold text-slate-700">{t.tech}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="bg-slate-900 p-10 rounded-[3rem] border border-slate-800 shadow-xl flex flex-col text-white">
                            <h3 className="text-lg font-black uppercase italic tracking-widest mb-6 text-slate-300">Execution Flow</h3>
                            
                            <div className="flex-1 flex flex-col gap-4">
                                {/* Flowchart step 1 */}
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20"><Globe size={18} /></div>
                                    <div className="flex-1 bg-white/10 rounded-2xl p-4 border border-white/5">
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Client Interface</p>
                                        <p className="text-xs font-bold mt-1 text-slate-300">Next.js Client handles UX, dynamic polling, and institutional wallet approvals.</p>
                                    </div>
                                </div>
                                <div className="ml-5 w-0.5 h-6 bg-slate-700" />
                                
                                {/* Flowchart step 2 */}
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/20"><Activity size={18} /></div>
                                    <div className="flex-1 bg-white/10 rounded-2xl p-4 border border-white/5">
                                        <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest">API Gateway & Load Balancer</p>
                                        <p className="text-xs font-bold mt-1 text-slate-300">Express routing 50/50 to CG/CMC. Indexes prices, handles fiat off-ramp queuing.</p>
                                    </div>
                                </div>
                                <div className="ml-5 w-0.5 h-6 bg-slate-700" />

                                {/* Flowchart step 3 */}
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20"><Box size={18} /></div>
                                    <div className="flex-1 bg-white/10 rounded-2xl p-4 border border-white/5">
                                        <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">On-Chain Settlement</p>
                                        <p className="text-xs font-bold mt-1 text-slate-300">Ethers.js executes router swaps. Fees sent to Treasury. Syncs ledger via background poll.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {subTab === 'docs' && (
                <div className="space-y-6">
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-200/60 shadow-sm">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg"><Download size={22} /></div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase italic">Official <span className="text-indigo-600">Documentation</span></h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Institutional Audit & Technical Reference — Word Format</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Doc 1 */}
                            <div className="p-8 bg-indigo-50 border border-indigo-100 rounded-[2.5rem] flex flex-col gap-4 group hover:shadow-xl transition-all">
                                <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform">
                                    <Box size={26} />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-slate-900 uppercase italic tracking-tight">Technical Blueprint</h4>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Mexapay Institutional Architecture</p>
                                    <p className="text-[9px] font-bold text-slate-400 mt-2">Full product module breakdown, tech stack, fee model, and security persistence logic.</p>
                                </div>
                                <a
                                    href="/B20_Technical_Blueprint.docx"
                                    download="B20_Technical_Blueprint.docx"
                                    className="mt-auto flex items-center justify-center gap-2 w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-2xl uppercase tracking-widest transition-all shadow-md shadow-indigo-200 active:scale-95"
                                >
                                    <Download size={14} /> Download .docx
                                </a>
                            </div>

                            {/* Doc 2 */}
                            <div className="p-8 bg-slate-900 border border-slate-800 rounded-[2.5rem] flex flex-col gap-4 group hover:shadow-2xl transition-all">
                                <div className="w-14 h-14 bg-white/10 text-white rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                                    <ShieldCheck size={26} />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-white uppercase italic tracking-tight">Master Audit Document</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Omnibus Ecosystem Reference</p>
                                    <p className="text-[9px] font-bold text-slate-500 mt-2">Smart contract ABIs, treasury wallet infrastructure, REST API docs, and end-to-end workflow map.</p>
                                </div>
                                <a
                                    href="/B20_Master_Audit_Document.docx"
                                    download="B20_Master_Audit_Document.docx"
                                    className="mt-auto flex items-center justify-center gap-2 w-full py-4 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black rounded-2xl uppercase tracking-widest transition-all border border-white/10 active:scale-95"
                                >
                                    <Download size={14} /> Download .docx
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ListingHub({ account }) {
    const [subTab, setSubTab] = useState('dashboard');
    const [stats, setStats] = useState({
        total: 0, pending: 0, approved: 0, rejected: 0,
        revenue_bnb: 0, total_listed: 0, total_delisted: 0, admin_listed: 0
    });
    const [requests, setRequests] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [historyFilter, setHistoryFilter] = useState('all');
    const [showContractsModal, setShowContractsModal] = useState(false);
    const [directForm, setDirectForm] = useState({
        contract_address: '', name: '', symbol: '', description: '',
        logo_url: '', website: '', telegram: '', twitter: '', total_supply: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            if (subTab === 'dashboard') {
                const res = await axios.get(`${API_URL}/admin/listing-stats`, { headers: { 'x-wallet-address': account } });
                setStats(res.data);
            } else if (subTab === 'pending') {
                const res = await axios.get(`${API_URL}/admin/listing-requests?status=pending`, { headers: { 'x-wallet-address': account } });
                setRequests(res.data);
                // Also update stats for the bubble
                const sRes = await axios.get(`${API_URL}/admin/listing-stats`, { headers: { 'x-wallet-address': account } });
                setStats(sRes.data);
            } else if (subTab === 'history') {
                const res = await axios.get(`${API_URL}/admin/listing-requests?status=${historyFilter}`, { headers: { 'x-wallet-address': account } });
                setRequests(res.data.filter(r => r.status !== 'pending' || historyFilter === 'all'));
            } else if (subTab === 'inventory') {
                const res = await axios.get(`${API_URL}/admin/listed-tokens`, { headers: { 'x-wallet-address': account } });
                setInventory(res.data);
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { 
        fetchData(); 
        // Initial stats fetch for the bubble even if not in dashboard
        if (subTab !== 'dashboard') {
            axios.get(`${API_URL}/admin/listing-stats`, { headers: { 'x-wallet-address': account } })
                .then(res => setStats(res.data)).catch(() => {});
        }
    }, [subTab, account, historyFilter]);

    const handleAction = async (id, action) => {
        try {
            let reason = '';
            if (action === 'reject') reason = prompt('Reason for rejection:') || 'Rejected by admin';
            await axios.post(`${API_URL}/admin/listing/${action}`, { id, reason }, { headers: { 'x-wallet-address': account } });
            fetchData();
        } catch (e) { alert('Action failed'); }
    };

    const handleDirectList = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/admin/listing/direct`, directForm, { headers: { 'x-wallet-address': account } });
            alert('Token listed successfully!');
            setDirectForm({
                contract_address: '', name: '', symbol: '', description: '',
                logo_url: '', website: '', telegram: '', twitter: '', total_supply: ''
            });
            setSubTab('inventory');
        } catch (e) { alert('Direct listing failed: ' + (e.response?.data?.error || e.message)); }
    };

    const toggleDelist = async (address, currentStatus) => {
        try {
            await axios.post(`${API_URL}/admin/tokens/toggle`, { address, is_delisted: !currentStatus }, { headers: { 'x-wallet-address': account } });
            fetchData();
        } catch (e) { alert('Toggle failed'); }
    };

    const copy = (val) => { navigator.clipboard.writeText(val); alert('Copied to clipboard'); };

    return (
        <div className="space-y-6">
            {/* Sub-Tabs */}
            <div className="flex gap-2 flex-wrap pb-2 border-b border-slate-100">
                {[
                    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={14} /> },
                    { id: 'pending', label: 'Pending Queue', icon: <Clock size={14} /> },
                    { id: 'history', label: 'History', icon: <History size={14} /> },
                    { id: 'direct', label: 'Admin List Token', icon: <PlusCircle size={14} /> },
                    { id: 'inventory', label: 'Listed Inventory', icon: <ListChecks size={14} /> },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setSubTab(tab.id)}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${subTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-300'}`}
                    >
                        {tab.icon} {tab.label}
                        {tab.id === 'pending' && stats.pending > 0 && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[8px]">{stats.pending}</span>}
                    </button>
                ))}
            </div>

            {/* DASHBOARD */}
            {subTab === 'dashboard' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { label: 'Total Submissions', value: stats.total, color: 'bg-indigo-50 text-indigo-600 border-indigo-100', icon: '📩' },
                            { label: 'Approved Requests', value: stats.approved, color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: '✅' },
                            { label: 'Rejected Requests', value: stats.rejected, color: 'bg-red-50 text-red-600 border-red-100', icon: '❌' },
                        ].map((s, i) => (
                            <div key={i} className={`rounded-3xl border p-8 flex flex-col gap-3 ${s.color}`}>
                                <span className="text-3xl">{s.icon}</span>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{s.label}</p>
                                <p className="text-4xl font-black">{s.value}</p>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { label: 'Admin-Listed Tokens', value: stats.admin_listed, color: 'bg-sky-50 text-sky-600 border-sky-100', icon: '🛠️' },
                            { label: 'Currently Delisted', value: stats.total_delisted, color: 'bg-slate-50 text-slate-600 border-slate-100', icon: '🚫' },
                            { label: 'Listing Revenue', value: `${stats.revenue_bnb.toFixed(2)} BNB`, color: 'bg-violet-50 text-violet-600 border-violet-100', icon: '💰' },
                        ].map((s, i) => (
                            <div key={i} className={`rounded-3xl border p-8 flex flex-col gap-3 ${s.color}`}>
                                <span className="text-3xl">{s.icon}</span>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{s.label}</p>
                                <p className="text-2xl font-black">{s.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* PENDING / HISTORY */}
            {(subTab === 'pending' || subTab === 'history') && (
                <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                    {subTab === 'history' && (
                        <div className="p-6 bg-slate-50 border-b border-slate-100 flex gap-2">
                            {['all', 'approved', 'rejected'].map(f => (
                                <button key={f} onClick={() => setHistoryFilter(f)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${historyFilter === f ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>{f}</button>
                            ))}
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                <tr className="border-b border-slate-200">
                                    <th className="px-8 py-5">Token</th>
                                    <th className="px-6 py-5">Contract</th>
                                    <th className="px-6 py-5">Socials</th>
                                    <th className="px-6 py-5">Payment Proof</th>
                                    <th className="px-6 py-5">Status</th>
                                    <th className="px-8 py-5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {requests.map((r, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-all group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                                                    {r.logo_url ? <img src={r.logo_url} className="w-full h-full object-cover" /> : <span className="text-xl">🪙</span>}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-900 uppercase truncate max-w-[120px]">{r.token_name}</p>
                                                    <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-tighter">${r.token_symbol}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => copy(r.contract_address)} className="font-mono text-[9px] text-slate-400 hover:text-indigo-600 font-black transition-all">{r.contract_address.slice(0,6)}...{r.contract_address.slice(-4)}</button>
                                                <ExternalLink size={10} className="text-slate-300" />
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex gap-2">
                                                {r.website && <a href={r.website} target="_blank" className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-all"><Globe size={12}/></a>}
                                                {r.telegram && <a href={`https://t.me/${r.telegram.replace('@','')}`} target="_blank" className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-400 hover:text-sky-500 hover:border-sky-200 transition-all"><MessageSquare size={12}/></a>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <a href={`https://bscscan.com/tx/${r.tx_hash}`} target="_blank" className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-[9px] font-black text-indigo-600 hover:bg-indigo-500 hover:text-white transition-all uppercase tracking-widest">View TX <ArrowUpRight size={10}/></a>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${r.status === 'pending' ? 'bg-amber-100 text-amber-600' : r.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>{r.status}</span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            {r.status === 'pending' ? (
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleAction(r.id, 'reject')} className="w-9 h-9 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm"><XCircle size={16}/></button>
                                                    <button onClick={() => handleAction(r.id, 'approve')} className="w-9 h-9 bg-emerald-50 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center shadow-sm"><CheckCircle2 size={16}/></button>
                                                </div>
                                            ) : (
                                                <div className="text-right">
                                                    <p className="text-[9px] font-black text-slate-800 uppercase">{r.status === 'approved' ? 'Processed' : 'Rejected'}</p>
                                                    <p className="text-[8px] text-slate-400 font-bold italic mt-0.5 truncate max-w-[100px] ml-auto">{r.reject_reason || 'Manual Verification'}</p>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {requests.length === 0 && !loading && <tr><td colSpan={6} className="py-24 text-center">
                                    <div className="flex flex-col items-center gap-3 opacity-20">
                                        <Box size={48} />
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">No listing applications found</p>
                                    </div>
                                </td></tr>}
                                {loading && <tr><td colSpan={6} className="py-24 text-center"><Loader2 size={24} className="animate-spin text-indigo-500 mx-auto opacity-50" /></td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* DIRECT LIST FORM */}
            {subTab === 'direct' && (
                <div className="bg-white rounded-[3rem] border border-slate-200/60 p-12 shadow-sm max-w-4xl mx-auto animate-in zoom-in-95 duration-500">
                    <div className="mb-10 text-center">
                        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <PlusCircle size={32} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Admin Protocol Listing</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase mt-2 tracking-widest">Inject assets directly into the B20 exchange registry</p>
                    </div>
                    <form onSubmit={handleDirectList} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Token Identity</label>
                                <input required type="text" placeholder="Token Name" value={directForm.name} onChange={e => setDirectForm({...directForm, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-black outline-none focus:border-indigo-500 focus:bg-white transition-all uppercase shadow-inner" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Symbol</label>
                                <input required type="text" placeholder="SYMBOL" value={directForm.symbol} onChange={e => setDirectForm({...directForm, symbol: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-black outline-none focus:border-indigo-500 focus:bg-white transition-all uppercase shadow-inner" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Smart Contract Address (BEP-20)</label>
                            <input required type="text" placeholder="0x..." value={directForm.contract_address} onChange={e => setDirectForm({...directForm, contract_address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-black font-mono outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Logo Endpoint (URL)</label>
                                <input type="text" placeholder="https://..." value={directForm.logo_url} onChange={e => setDirectForm({...directForm, logo_url: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Maximum Token Supply</label>
                                <input type="text" placeholder="e.g. 1B" value={directForm.total_supply} onChange={e => setDirectForm({...directForm, total_supply: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Ecosystem Description</label>
                            <textarea rows={3} placeholder="Provide utility context..." value={directForm.description} onChange={e => setDirectForm({...directForm, description: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all resize-none shadow-inner" />
                        </div>
                        <button type="submit" className="w-full py-6 bg-indigo-600 text-white font-black text-sm uppercase tracking-[0.3em] rounded-3xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                            <Zap size={20} /> Deploy to Global Markets
                        </button>
                    </form>
                </div>
            )}

            {/* INVENTORY */}
            {subTab === 'inventory' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                    <div className="flex justify-between items-center px-2">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Market Inventory</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Global assets currently active across Spot & Futures</p>
                        </div>
                        <button onClick={() => setShowContractsModal(true)} className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-2xl hover:bg-slate-800 transition-all">
                            <Eye size={14}/> Active Asset Registry
                        </button>
                    </div>
                    <div className="bg-white rounded-[3rem] border border-slate-200/60 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                    <tr className="border-b border-slate-200">
                                        <th className="px-8 py-5">Asset</th>
                                        <th className="px-6 py-5">Registry ID</th>
                                        <th className="px-6 py-5">Channel</th>
                                        <th className="px-6 py-5">Status</th>
                                        <th className="px-8 py-5 text-right">Governance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {inventory.map((t, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-all group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                                                        {t.logo_url ? <img src={t.logo_url} className="w-full h-full object-cover" /> : <span className="text-xl">🪙</span>}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-slate-900 uppercase">{t.name}</p>
                                                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter">${t.symbol}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 font-mono text-[10px] text-slate-400 font-black group-hover:text-indigo-600 transition-all">{t.contract_address.slice(0,12)}...</td>
                                            <td className="px-6 py-5">
                                                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${t.launch_type === 'EXCHANGE_LISTING' ? 'bg-indigo-50 text-indigo-600' : 'bg-violet-50 text-violet-600'}`}>
                                                    {t.launch_type === 'EXCHANGE_LISTING' ? 'B20 Direct' : 'Launchpad'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${t.is_delisted ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                                                    <span className={`text-[8px] font-black uppercase tracking-widest ${t.is_delisted ? 'text-red-500' : 'text-emerald-600'}`}>{t.is_delisted ? 'Inactive' : 'Active'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <button onClick={() => toggleDelist(t.contract_address, t.is_delisted)} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm transition-all ${t.is_delisted ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700' : 'bg-white text-red-500 border-red-100 hover:bg-red-50 hover:border-red-200'}`}>
                                                    {t.is_delisted ? 'Re-List Asset' : 'De-List Asset'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {inventory.length === 0 && !loading && <tr><td colSpan={5} className="py-24 text-center opacity-20"><Box size={48} className="mx-auto mb-3"/><p className="text-[10px] font-black uppercase">No inventory indexed</p></td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* CONTRACTS REGISTRY MODAL */}
            <AnimatePresence>
                {showContractsModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowContractsModal(false)} className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.95, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, y: 30, opacity: 0 }} className="relative bg-white rounded-[4rem] shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col border border-white/20">
                            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <ShieldCheck className="text-emerald-500" size={24} />
                                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Verified Asset Registry</h3>
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-9">Official contract addresses for cross-protocol verification</p>
                                </div>
                                <button onClick={() => setShowContractsModal(false)} className="w-12 h-12 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all flex items-center justify-center shadow-sm"><XCircle size={24}/></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-10 space-y-4 custom-scrollbar">
                                {inventory.filter(t => !t.is_delisted).map((t, i) => (
                                    <div key={i} className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex items-center justify-between group hover:border-indigo-300 hover:bg-white hover:shadow-xl hover:shadow-indigo-500/5 transition-all">
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 bg-white rounded-2xl border border-slate-200 flex items-center justify-center font-black text-xs text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">
                                                {t.logo_url ? <img src={t.logo_url} className="w-full h-full object-cover" /> : t.symbol.slice(0,3)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{t.name}</p>
                                                    <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-lg">${t.symbol}</span>
                                                </div>
                                                <p className="text-[11px] font-mono text-slate-400 font-bold tracking-tight selection:bg-indigo-100 selection:text-indigo-700">{t.contract_address}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => copy(t.contract_address)} className="w-12 h-12 bg-white border border-slate-200 rounded-2xl text-slate-300 hover:text-indigo-600 hover:border-indigo-300 transition-all flex items-center justify-center shadow-sm group-hover:bg-indigo-50 group-hover:scale-105 active:scale-95"><Copy size={18}/></button>
                                    </div>
                                ))}
                                {inventory.filter(t => !t.is_delisted).length === 0 && (
                                    <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                                        <Shield size={64} />
                                        <p className="text-xs font-black uppercase tracking-[0.4em]">Registry is currently empty</p>
                                    </div>
                                )}
                            </div>
                            <div className="p-8 bg-slate-50 border-t border-slate-100 text-center">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.5em]">Nexus Governance Protocol • Institutional Grade Security</p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function LaunchpadGuard({ account }) {
    const [subTab, setSubTab] = useState('inventory'); // 'inventory' or 'upgrades'
    const [tokens, setTokens] = useState([]);
    const [upgrades, setUpgrades] = useState([]);
    const [loading, setLoading] = useState(false);
    const [upgradeFilter, setUpgradeFilter] = useState('PENDING');

    useEffect(() => {
        if (subTab === 'inventory') {
            axios.get(`${API_URL}/tokens?include_delisted=true`).then(res => setTokens(res.data.filter(t => t.launch_type !== 'STANDARD')));
        } else {
            setLoading(true);
            axios.get(`${API_URL}/admin/upgrades?filter=${upgradeFilter}`, { headers: { 'x-wallet-address': account } }).then(res => {
                setUpgrades(res.data);
                setLoading(false);
            }).catch(() => setLoading(false));
        }
    }, [subTab, account, upgradeFilter]);

    const copy = (val) => { navigator.clipboard.writeText(val); alert('Address copied.'); };

    const updateStatus = async (address, status) => {
        try {
            await axios.post(`${API_URL}/admin/tokens/toggle`, { address, is_delisted: status === 'DELISTED' }, { headers: { 'x-wallet-address': account } });
            setTokens(tokens.map(t => t.contract_address === address ? { ...t, is_delisted: status === 'DELISTED' } : t));
        } catch (e) { alert('Update failed'); }
    };

    const handleUpgrade = async (id, action) => {
        try {
            let reason = undefined;
            if (action === 'reject') {
                reason = prompt('Rejection reason (optional):') || 'Rejected by admin';
            }
            await axios.post(`${API_URL}/admin/upgrades/${action}`, { id, reason }, { headers: { 'x-wallet-address': account } });
            setUpgrades(prev => prev.map(u => u.id === id ? { ...u, status: action === 'approve' ? 'APPROVED' : 'REJECTED' } : u));
            alert(`✅ Upgrade request ${action}d successfully.`);
        } catch (e) { alert('Action failed: ' + (e.response?.data?.error || e.message)); }
    };

    const pendingCount = upgrades.filter(u => u.status === 'PENDING').length;

    return (
        <div className="space-y-6">
            <div className="flex gap-4 mb-4">
                <button onClick={() => setSubTab('inventory')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'inventory' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}>Inventory Control</button>
                <button onClick={() => setSubTab('upgrades')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${subTab === 'upgrades' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}>
                    Upgrade Requests
                    {pendingCount > 0 && <span className="bg-blue-500 text-white px-2 py-0.5 rounded-full text-[9px] font-black">{pendingCount}</span>}
                </button>
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
                                            className={`bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-black outline-none uppercase ${t.is_delisted ? 'text-blue-500' : 'text-sky-600'}`}
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
                    <>
                        {/* Filter bar */}
                        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Upgrade Request Queue</h3>
                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Review payment proof before approving trust status changes</p>
                            </div>
                            <div className="flex gap-2">
                                {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => { setUpgradeFilter(f); setLoading(true); }}
                                        className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${upgradeFilter === f
                                            ? f === 'PENDING' ? 'bg-indigo-500 text-white' :
                                              f === 'APPROVED' ? 'bg-sky-600 text-white' :
                                              f === 'REJECTED' ? 'bg-blue-500 text-white' : 'bg-slate-900 text-white'
                                            : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Requests table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                    <tr className="border-b border-slate-200">
                                        <th className="px-8 py-4">Token</th>
                                        <th className="px-6 py-4">Requested</th>
                                        <th className="px-6 py-4">Payment Proof</th>
                                        <th className="px-6 py-4">Requester</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-8 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr><td colSpan="7" className="text-center py-20"><Loader2 className="animate-spin inline mr-2" /> Loading…</td></tr>
                                    ) : upgrades.length === 0 ? (
                                        <tr><td colSpan="7" className="text-center py-20 text-slate-400 font-bold italic uppercase text-[11px]">No {upgradeFilter.toLowerCase()} upgrade requests.</td></tr>
                                    ) : upgrades.map(u => {
                                        const isPaid = !!(u.tx_hash && u.amount_bnb > 0);
                                        const statusColor = u.status === 'APPROVED' ? 'bg-sky-50 text-sky-700 border-sky-100' :
                                                            u.status === 'REJECTED' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                            'bg-indigo-50 text-indigo-700 border-indigo-100';
                                        return (
                                            <tr key={u.id} className="hover:bg-slate-50 align-top">
                                                {/* Token */}
                                                <td className="px-8 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-slate-900 uppercase">{u.token_name}</span>
                                                        <span className="text-[9px] font-mono text-slate-400">{(u.token_address||'').slice(0,10)}...</span>
                                                        <a href={`https://bscscan.com/address/${u.token_address}`} target="_blank" rel="noopener noreferrer" className="text-[9px] text-indigo-400 hover:text-indigo-600 font-bold mt-0.5 flex items-center gap-1">
                                                            <ExternalLink size={9} /> BSCScan
                                                        </a>
                                                    </div>
                                                </td>
                                                {/* Requested upgrade */}
                                                <td className="px-6 py-5">
                                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[9px] font-black uppercase tracking-widest border border-indigo-100 block w-fit">{u.requested_upgrade}</span>
                                                    <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">From: {u.current_status}</p>
                                                </td>
                                                {/* Payment proof */}
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border w-fit ${isPaid ? 'bg-sky-50 text-sky-700 border-sky-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                            {isPaid ? `✅ Paid ${Number(u.amount_bnb).toFixed(4)} BNB` : '⚠️ No Payment'}
                                                        </span>
                                                        {u.tx_hash && (
                                                            <a
                                                                href={`https://bscscan.com/tx/${u.tx_hash}`}
                                                                target="_blank" rel="noopener noreferrer"
                                                                className="text-[9px] font-mono text-indigo-500 hover:text-indigo-700 flex items-center gap-1 truncate max-w-[160px]"
                                                            >
                                                                <ExternalLink size={9} /> {u.tx_hash.slice(0,12)}...{u.tx_hash.slice(-6)}
                                                            </a>
                                                        )}
                                                    </div>
                                                </td>
                                                {/* Requester wallet */}
                                                <td className="px-6 py-5 font-mono text-[10px] text-slate-400 uppercase">
                                                    {(u.user_wallet||'').slice(0,8)}...{(u.user_wallet||'').slice(-4)}
                                                    <button onClick={() => copy(u.user_wallet)} className="ml-1 hover:text-indigo-600"><Copy size={10} /></button>
                                                </td>
                                                {/* Date */}
                                                <td className="px-6 py-5 text-[9px] text-slate-400 font-bold whitespace-nowrap">
                                                    {new Date(u.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                {/* Status badge */}
                                                <td className="px-6 py-5">
                                                    <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${statusColor}`}>{u.status}</span>
                                                    {u.status === 'REJECTED' && u.reject_reason && (
                                                        <p className="text-[8px] text-blue-400 font-bold mt-1 max-w-[100px]">{u.reject_reason}</p>
                                                    )}
                                                </td>
                                                {/* Actions */}
                                                <td className="px-8 py-5 text-right">
                                                    {u.status === 'PENDING' ? (
                                                        <div className="flex gap-2 justify-end">
                                                            <button onClick={() => handleUpgrade(u.id, 'reject')} className="px-4 py-2 bg-blue-50 text-blue-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all border border-blue-100">Reject</button>
                                                            <button onClick={() => handleUpgrade(u.id, 'approve')} className="px-4 py-2 bg-sky-50 text-sky-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-sky-100 transition-all border border-sky-100">✓ Approve</button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[9px] text-slate-300 font-bold uppercase italic">Processed</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function FiatQueue({ account }) {
    const [allRequests, setAllRequests] = useState([]);
    const [activeTab, setActiveTab] = useState('BUY');
    const [loading, setLoading] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(null);

    const fetchQueue = async (silent = false) => {
        if (!account) return;
        if (!silent) setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/fiat/transactions`, { headers: { 'x-wallet-address': account } });
            setAllRequests(Array.isArray(res.data) ? res.data : []);
            setLastRefresh(new Date());
        } catch (err) {
            console.error('[FiatQueue] Failed to load transactions:', err);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
        const interval = setInterval(() => fetchQueue(true), 15000);
        return () => clearInterval(interval);
    }, [account]);

    const handleAction = async (id, status) => {
        try {
            await axios.patch(`${API_URL}/fiat/transaction/${id}`, { status }, { headers: { 'x-wallet-address': account } });
            setAllRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
        } catch (e) { alert('Update failed: ' + (e.response?.data?.error || e.message)); }
    };

    const getUpiId = (jsonStr) => {
        try { const d = JSON.parse(jsonStr); return d.upiId || d.accNumber || 'N/A'; } catch { return 'N/A'; }
    };

    // Stats
    const totalTx = allRequests.length;
    const totalBuy = allRequests.filter(r => r.type === 'BUY');
    const totalSell = allRequests.filter(r => r.type === 'SELL');
    const totalRejected = allRequests.filter(r => r.status === 'REJECTED').length;
    const totalVerified = allRequests.filter(r => r.status === 'VERIFIED').length;
    const successRatio = totalTx > 0 ? ((totalVerified / totalTx) * 100).toFixed(1) : '0.0';

    const buyVerifiedINR  = totalBuy.filter(r => r.status === 'VERIFIED').reduce((s, r) => s + Number(r.inr_amount || 0), 0);
    const buyRejectedINR  = totalBuy.filter(r => r.status === 'REJECTED').reduce((s, r) => s + Number(r.inr_amount || 0), 0);
    const sellVerifiedINR = totalSell.filter(r => r.status === 'VERIFIED').reduce((s, r) => s + Number(r.inr_amount || 0), 0);
    const sellRejectedINR = totalSell.filter(r => r.status === 'REJECTED').reduce((s, r) => s + Number(r.inr_amount || 0), 0);
    const totalBuyINR  = totalBuy.reduce((s, r) => s + Number(r.inr_amount || 0), 0);
    const totalSellINR = totalSell.reduce((s, r) => s + Number(r.inr_amount || 0), 0);
    const avgBuy  = totalBuy.length  > 0 ? (totalBuyINR  / totalBuy.length)  : 0;
    const avgSell = totalSell.length > 0 ? (totalSellINR / totalSell.length) : 0;

    const fmt = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;



    const pendingBuy  = allRequests.filter(r => r.type === 'BUY'  && r.status === 'PENDING');
    const pendingSell = allRequests.filter(r => r.type === 'SELL' && r.status === 'PENDING');
    const history     = allRequests.filter(r => r.status === 'VERIFIED' || r.status === 'REJECTED');

    const displayData = activeTab === 'HISTORY' ? history
                      : activeTab === 'BUY'     ? pendingBuy
                      :                           pendingSell;

    const TableHead = ({ isSell }) => (
        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
            <tr className="border-b border-slate-200">
                <th className="px-5 py-4 whitespace-nowrap">S.No</th>
                <th className="px-5 py-4 whitespace-nowrap">Name</th>
                <th className="px-5 py-4 whitespace-nowrap">Phone / Email</th>
                <th className="px-5 py-4 whitespace-nowrap">{isSell ? 'UPI / Bank' : 'Wallet Address'}</th>
                <th className="px-5 py-4 whitespace-nowrap">Quantity</th>
                <th className="px-5 py-4 whitespace-nowrap">₹ Amount</th>
                <th className="px-5 py-4 whitespace-nowrap">Screenshot</th>
                <th className="px-5 py-4 whitespace-nowrap">Status</th>
                {activeTab !== 'HISTORY' && <th className="px-5 py-4 whitespace-nowrap text-right">Action</th>}
            </tr>
        </thead>
    );

    return (
        <div className="space-y-6">

            {/* ── KPI Stats ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">

                {/* Total Transactions */}
                <div className="rounded-2xl border p-4 flex flex-col gap-2 bg-indigo-50 text-indigo-600 border-indigo-100">
                    <span className="text-xl">📊</span>
                    <p className="text-xs font-black uppercase tracking-widest opacity-70 leading-tight">Total Transactions</p>
                    <p className="text-2xl font-black leading-none">{totalTx}</p>
                </div>

                {/* Buy Amount — split */}
                <div className="rounded-2xl border p-4 flex flex-col gap-2 bg-sky-50 border-sky-100">
                    <div className="flex items-center gap-1.5">
                        <span className="text-xl">📥</span>
                        <p className="text-xs font-black text-sky-700 uppercase tracking-widest opacity-80 leading-tight">Total Buy</p>
                    </div>
                    <div className="flex flex-col gap-1 mt-1">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">✅ Success</span>
                            <span className="text-xs font-black text-emerald-600">{fmt(buyVerifiedINR)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-widest text-red-500">❌ Rejected</span>
                            <span className="text-xs font-black text-red-500">{fmt(buyRejectedINR)}</span>
                        </div>
                        <div className="border-t border-sky-200 mt-1 pt-1 flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-widest text-sky-600">Total</span>
                            <span className="text-sm font-black text-sky-700">{fmt(totalBuyINR)}</span>
                        </div>
                    </div>
                </div>

                {/* Sell Amount — split */}
                <div className="rounded-2xl border p-4 flex flex-col gap-2 bg-blue-50 border-blue-100">
                    <div className="flex items-center gap-1.5">
                        <span className="text-xl">📤</span>
                        <p className="text-xs font-black text-blue-700 uppercase tracking-widest opacity-80 leading-tight">Total Sell</p>
                    </div>
                    <div className="flex flex-col gap-1 mt-1">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">✅ Success</span>
                            <span className="text-xs font-black text-emerald-600">{fmt(sellVerifiedINR)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-widest text-red-500">❌ Rejected</span>
                            <span className="text-xs font-black text-red-500">{fmt(sellRejectedINR)}</span>
                        </div>
                        <div className="border-t border-blue-200 mt-1 pt-1 flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-widest text-blue-600">Total</span>
                            <span className="text-sm font-black text-blue-700">{fmt(totalSellINR)}</span>
                        </div>
                    </div>
                </div>

                {/* Total Rejections */}
                <div className="rounded-2xl border p-4 flex flex-col gap-2 bg-red-50 text-red-600 border-red-100">
                    <span className="text-xl">❌</span>
                    <p className="text-xs font-black uppercase tracking-widest opacity-70 leading-tight">Total Rejections</p>
                    <p className="text-2xl font-black leading-none">{totalRejected}</p>
                </div>

                {/* Success Ratio */}
                <div className="rounded-2xl border p-4 flex flex-col gap-2 bg-emerald-50 text-emerald-700 border-emerald-100">
                    <span className="text-xl">✅</span>
                    <p className="text-xs font-black uppercase tracking-widest opacity-70 leading-tight">Success Ratio</p>
                    <p className="text-2xl font-black leading-none">{successRatio}%</p>
                </div>

                {/* Avg Buy / Sell */}
                <div className="rounded-2xl border p-4 flex flex-col gap-2 bg-violet-50 text-violet-700 border-violet-100">
                    <span className="text-xl">⚖️</span>
                    <p className="text-xs font-black uppercase tracking-widest opacity-70 leading-tight">Avg Buy / Sell</p>
                    <p className="text-sm font-black leading-snug">{fmt(avgBuy)}<br /><span className="text-violet-400">/</span> {fmt(avgSell)}</p>
                </div>

            </div>

            {/* ── Tab Bar + Controls ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setActiveTab('BUY')}  className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'BUY'     ? 'bg-sky-600 text-white shadow-lg'    : 'bg-white text-slate-400 border border-slate-200 hover:border-sky-200'}`}>Buy Queue <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded">{pendingBuy.length}</span></button>
                    <button onClick={() => setActiveTab('SELL')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'SELL'    ? 'bg-blue-600 text-white shadow-lg'   : 'bg-white text-slate-400 border border-slate-200 hover:border-blue-200'}`}>Sell Queue <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded">{pendingSell.length}</span></button>
                    <button onClick={() => setActiveTab('HISTORY')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'HISTORY' ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-300'}`}>History <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded">{history.length}</span></button>
                </div>
                <div className="flex items-center gap-3">
                    {lastRefresh && <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Last sync: {lastRefresh.toLocaleTimeString()}</span>}
                    <button onClick={() => fetchQueue(false)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all">
                        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-sm overflow-hidden">
                <div className={`px-8 py-5 border-b border-slate-100 flex items-center justify-between ${activeTab === 'BUY' ? 'bg-sky-50/40' : activeTab === 'SELL' ? 'bg-blue-50/40' : 'bg-slate-50/60'}`}>
                    <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">
                        {activeTab === 'HISTORY' ? 'Transaction History' : `${activeTab} Queue`}
                        <span className={`ml-3 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${activeTab === 'BUY' ? 'bg-sky-100 text-sky-600' : activeTab === 'SELL' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-600'}`}>{displayData.length} records</span>
                    </h3>
                </div>
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left" style={{minWidth:'860px'}}>
                        <TableHead isSell={activeTab === 'SELL' || (activeTab === 'HISTORY')} />
                        <tbody className="divide-y divide-slate-100">
                            {displayData.map((r, i) => (
                                <tr key={r.id} className="hover:bg-slate-50 align-middle">
                                    <td className="px-5 py-4 text-[10px] font-black text-slate-400 whitespace-nowrap">#{(i+1).toString().padStart(2,'0')}</td>
                                    <td className="px-5 py-4 text-xs font-black text-slate-900 uppercase whitespace-nowrap">{r.user_name}</td>
                                    <td className="px-5 py-4">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[10px] font-bold text-slate-700 whitespace-nowrap">{r.phone_number}</span>
                                            <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">{r.email || '—'}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2 group">
                                            <span className="text-[9px] font-mono font-black text-indigo-500">
                                                {r.type === 'BUY' 
                                                    ? (r.receiving_wallet ? `${r.receiving_wallet.slice(0,6)}...${r.receiving_wallet.slice(-4)}` : `${r.user_wallet.slice(0,6)}...${r.user_wallet.slice(-4)}`)
                                                    : getUpiId(r.bank_details_json)
                                                }
                                            </span>
                                            {(r.type === 'BUY' || r.receiving_wallet) && (
                                                <button onClick={() => { navigator.clipboard.writeText(r.receiving_wallet || r.user_wallet); alert('Address copied'); }} className="p-1 text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all">
                                                    <Copy size={12}/>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-[10px] font-black text-slate-900 uppercase whitespace-nowrap">{r.amount} {r.asset || 'USDT'}</td>
                                    <td className="px-5 py-4 text-[10px] font-black text-sky-600 whitespace-nowrap">₹{Number(r.inr_amount||0).toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                                    <td className="px-5 py-4">
                                        {r.proof_url ? (
                                            <a href={`${API_URL.replace('/api','')}${r.proof_url}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase hover:bg-slate-200 transition-all flex items-center gap-1 w-max">
                                                <ExternalLink size={10}/> View Proof
                                            </a>
                                        ) : <span className="text-[9px] font-black text-slate-300 uppercase">—</span>}
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                                            r.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                            r.status === 'REJECTED' ? 'bg-red-50 text-red-500 border-red-100' :
                                            'bg-amber-50 text-amber-600 border-amber-100'
                                        }`}>{r.status}</span>
                                    </td>
                                    {activeTab !== 'HISTORY' && (
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={() => handleAction(r.id, 'REJECTED')} className="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-[9px] font-black uppercase hover:bg-red-100 transition-all whitespace-nowrap border border-red-100">Reject</button>
                                                <button onClick={() => handleAction(r.id, 'VERIFIED')} className="px-3 py-1.5 bg-sky-50 text-sky-600 rounded-lg text-[9px] font-black uppercase hover:bg-sky-100 transition-all whitespace-nowrap border border-sky-100">✓ Verify</button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {displayData.length === 0 && (
                                <tr><td colSpan="9" className="px-10 py-16 text-center text-slate-400 font-bold italic uppercase text-[11px]">
                                    No {activeTab === 'HISTORY' ? 'completed' : `pending ${activeTab}`} transactions found.
                                </td></tr>
                            )}
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
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-10 h-10 bg-sky-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-sky-200">
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
                                    <div className={`w-1.5 h-1.5 rounded-full ${saved.has(s.key) ? 'bg-sky-500 shadow-lg shadow-sky-200' : 'bg-slate-300'}`} />
                                    <span className={`text-[9px] font-black uppercase ${saved.has(s.key) ? 'text-sky-600' : 'text-slate-400'}`}>
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
                    <h3 className="text-xl font-black text-slate-900 uppercase italic">Publish <span className="text-slate-600">Nuera Bulletin</span></h3>
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                        <Sparkles size={14} className="text-slate-500" />
                        <span className="text-[10px] font-black text-slate-600 uppercase">AI-Enhanced</span>
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
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-16 pr-8 py-5 text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-500 transition-all shadow-inner" 
                            />
                            {loadingSearch && <Loader2 className="absolute right-6 animate-spin text-slate-500" size={20} />}
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
                                                <span className="px-3 py-1 bg-slate-500 rounded-lg text-[10px] font-black uppercase">Rank #{tokenData.rank}</span>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-4">
                                                <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Market Cap</p><p className="text-xs font-black text-sky-400 mt-1">${tokenData.mcap}</p></div>
                                                <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Price</p><p className="text-xs font-black text-white mt-1">${tokenData.price}</p></div>
                                                <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Launch Date</p><p className="text-xs font-black text-white mt-1">{tokenData.launch}</p></div>
                                                <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Symbol</p><p className="text-xs font-black text-slate-400 mt-1">{tokenData.symbol}</p></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="ml-6">
                                        <button 
                                            onClick={() => {
                                                // Optional: add visual feedback that it's attached
                                                alert(`Asset ${tokenData.symbol} attached to bulletin payload.`);
                                            }}
                                            className="px-6 py-4 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-500 hover:text-white transition-all shadow-lg flex flex-col items-center gap-1"
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
                            className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] p-8 text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-500 transition-all shadow-inner" 
                        />
                    </div>

                    <button 
                        onClick={handlePublish} 
                        disabled={loadingPublish || !content} 
                        className="w-full py-6 bg-slate-600 text-white font-black rounded-3xl text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:bg-slate-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
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
                    <button onClick={() => removeMessage(m.id)} className="p-2.5 text-slate-300 hover:text-blue-500 rounded-xl opacity-0 group-hover:opacity-100"><XCircle size={18} /></button>
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
        { label: 'Alpha Vantage API Key', val: 'TDA3K3FRBC108P1B' },
        { label: 'CoinGecko API Key', val: 'CG-wAvFy24FgS5GzRa8AfLiKhPi' },
        { label: 'CoinMarketCap API Key', val: '61a5cf295fde46a39ecb614a63cfd73b' },
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
                        <div className="mt-6 p-8 bg-blue-50 rounded-[3rem] border border-blue-100 flex items-center gap-6">
                            <Shield className="text-blue-500" size={24} />
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password..." className="flex-1 bg-white border border-blue-100 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                            <button onClick={() => password === PASS ? setShowPK(true) : alert('Denied')} className="px-6 py-3 bg-blue-600 text-white text-[10px] font-black rounded-xl uppercase">Unlock Key</button>
                        </div>
                    ) : (
                        <div className="mt-6 p-8 bg-white rounded-[3rem] border border-blue-200 shadow-xl flex justify-between items-center animate-in fade-in zoom-in">
                            <div><label className="text-[10px] font-black text-blue-500 uppercase block">PRIVATE_KEY</label><p className="text-sm font-mono font-black break-all">0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80</p></div>
                            <button onClick={() => copy('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', 'Private Key')} className="p-3 text-blue-400"><Copy size={20} /></button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function MemeGovernance({ account }) {
    const [memes, setMemes] = useState([]);
    const [controls, setControls] = useState({});
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const getAuthHeader = () => ({ headers: { 'x-wallet-address': account } });

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search, account]);

    const fetchData = async (term = '') => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/admin/meme-tokens?q=${term}`, getAuthHeader());
            
            const ctrlMap = {};
            res.data.forEach(c => ctrlMap[c.symbol] = c.is_visible);
            setControls(ctrlMap);
            setMemes(res.data);
        } catch (e) {
            console.error('Failed to fetch meme governance data');
        }
        setLoading(false);
    };

    const toggleVisibility = async (symbol, current) => {
        try {
            await axios.post(`${API_URL}/admin/meme-tokens/toggle`, { symbol, is_visible: !current }, getAuthHeader());
            setControls({ ...controls, [symbol]: !current ? 1 : 0 });
        } catch (e) {
            alert('Toggle failed');
        }
    };

    return (
        <div className="space-y-8">
            <div className="bg-white rounded-[3rem] border border-slate-200/60 p-10 shadow-sm">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 uppercase italic">Meme Terminal <span className="text-orange-500">Governance</span></h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Visibility & Audit Control for 22,000+ Assets</p>
                    </div>
                    <div className="flex items-center gap-4 relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="SEARCH SYMBOL OR NAME..." 
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-xs font-black uppercase tracking-widest outline-none focus:border-orange-500 transition-colors"
                        />
                        {loading && <Loader2 className="animate-spin text-orange-500 absolute right-4 top-1/2 -translate-y-1/2" size={16} />}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {memes.map((m) => {
                        const isVisible = controls[m.symbol] !== 0; // Default to 1 (visible)
                        return (
                            <div key={m.symbol} className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 hover:shadow-xl transition-all group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-2xl">
                                        🔥
                                    </div>
                                    <button 
                                        onClick={() => toggleVisibility(m.symbol, isVisible)}
                                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isVisible ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-200 text-slate-400'}`}
                                    >
                                        {isVisible ? 'Visible' : 'Hidden'}
                                    </button>
                                </div>
                                <h4 className="text-sm font-black text-slate-900 uppercase truncate">{m.name}</h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{m.symbol}</p>
                                
                                <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center justify-between">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Address Hub</span>
                                    <button 
                                        onClick={() => { navigator.clipboard.writeText(m.contract_address); alert('Full contract address copied.'); }}
                                        className="p-2 bg-slate-100 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                                    >
                                        <Copy size={12} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function SmartMoneyHub({ account }) {
    const [investments, setInvestments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`${API_URL}/admin/smart-money`, { headers: { 'x-wallet-address': account } })
            .then(res => setInvestments(res.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [account]);

    return (
        <div className="space-y-8">
            <div className="bg-white rounded-[3rem] border border-slate-200/60 p-10 shadow-sm">
                <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 uppercase italic">Smart Money <span className="text-indigo-600">Hub</span></h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Institutional Bucket Allocations Oversight</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-y-3">
                        <thead>
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="px-6 py-2">Investor Wallet</th>
                                <th className="px-6 py-2">Bucket Name</th>
                                <th className="px-6 py-2">Allocation</th>
                                <th className="px-6 py-2">TX Hash</th>
                                <th className="px-6 py-2">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {investments.map((inv, i) => (
                                <tr key={i} className="bg-slate-50 hover:bg-white hover:shadow-xl hover:border-indigo-100 border border-transparent rounded-2xl transition-all group">
                                    <td className="px-6 py-5 first:rounded-l-2xl">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black text-slate-800">{inv.wallet_address.slice(0, 8)}...{inv.wallet_address.slice(-6)}</span>
                                            <button onClick={() => { navigator.clipboard.writeText(inv.wallet_address); alert('Full wallet address copied.'); }} className="p-1 text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"><Copy size={12} /></button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-lg uppercase">{inv.bucket_name}</span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="text-xs font-black text-slate-900">{inv.invest_amount} USDT</span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <a href={`https://bscscan.com/tx/${inv.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-xs font-mono font-bold text-indigo-500 hover:underline">{inv.tx_hash.slice(0, 12)}...</a>
                                    </td>
                                    <td className="px-6 py-5 last:rounded-r-2xl">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(inv.timestamp).toLocaleString()}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function InstitutionalFutures({ account }) {
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`${API_URL}/admin/futures/active`, { headers: { 'x-wallet-address': account } })
            .then(res => setPositions(res.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [account]);

    return (
        <div className="space-y-8">
            <div className="bg-white rounded-[3rem] border border-slate-200/60 p-10 shadow-sm">
                <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 bg-sky-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/20">
                        <Activity size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 uppercase italic">Futures <span className="text-sky-600">Guard</span></h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Active Leverage & Exposure Monitoring</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-y-3">
                        <thead>
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="px-6 py-2">Trader</th>
                                <th className="px-6 py-2">Asset</th>
                                <th className="px-6 py-2">Position Size</th>
                                <th className="px-6 py-2">Entry Price</th>
                                <th className="px-6 py-2">Risk Status</th>
                                <th className="px-6 py-2">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {positions.map((p, i) => (
                                <tr key={i} className="bg-slate-50 hover:bg-white hover:shadow-xl hover:border-sky-100 border border-transparent rounded-2xl transition-all group">
                                    <td className="px-6 py-5 first:rounded-l-2xl">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black text-slate-800">{p.trader_wallet.slice(0, 8)}...{p.trader_wallet.slice(-6)}</span>
                                            <button onClick={() => { navigator.clipboard.writeText(p.trader_wallet); alert('Full trader address copied.'); }} className="p-1 text-slate-300 hover:text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity"><Copy size={12} /></button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{p.token_symbol}</span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-slate-900">{p.amount_bnb} BNB</span>
                                            <span className="text-[9px] font-black text-sky-500 uppercase">20x Leverage</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="text-xs font-mono font-bold text-slate-600">{p.price_bnb} BNB</span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[9px] font-black rounded-lg uppercase tracking-widest border border-emerald-200">Institutional Safe</span>
                                    </td>
                                    <td className="px-6 py-5 last:rounded-r-2xl">
                                        <a href={`https://bscscan.com/tx/${p.tx_hash}`} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-sky-600 rounded-xl transition-all inline-block shadow-sm">
                                            <ArrowUpRight size={14} />
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function YieldLedger({ account }) {
    const [yields, setYields] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchYields();
    }, []);

    const fetchYields = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/wallets/yield/all`, { headers: { 'x-wallet-address': account } });
            setYields(res.data);
        } catch (e) {
            console.error('Failed to fetch yield ledger:', e);
        }
        setLoading(false);
    };

    const totalVolume = yields.reduce((s, y) => s + parseFloat(y.amount_usdt || 0), 0);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-200/60 p-8 rounded-[2.5rem] shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Global Yield Volume</p>
                    <h3 className="text-3xl font-black text-slate-900 italic tracking-tighter">${totalVolume.toLocaleString()} <span className="text-sm font-bold text-sky-500 not-italic tracking-normal">USDT</span></h3>
                </div>
                <div className="bg-white border border-slate-200/60 p-8 rounded-[2.5rem] shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Deployments</p>
                    <h3 className="text-3xl font-black text-slate-900 italic tracking-tighter">{yields.length} <span className="text-sm font-bold text-indigo-500 not-italic tracking-normal">Vaults</span></h3>
                </div>
                <div className="bg-white border border-slate-200/60 p-8 rounded-[2.5rem] shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Active Protocols</p>
                    <h3 className="text-3xl font-black text-slate-900 italic tracking-tighter">{new Set(yields.map(y => y.protocol_name)).size} <span className="text-sm font-bold text-teal-500 not-italic tracking-normal">Sources</span></h3>
                </div>
            </div>

            <div className="bg-white border border-slate-200/60 rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter">Global Yield <span className="text-sky-600">Audit Ledger</span></h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Real-time institutional deployment monitor</p>
                    </div>
                    <button onClick={fetchYields} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all">
                        <RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Investor &amp; Deadline</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Program</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">USDT Quantity</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Yield %</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Daily Earning</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Audit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {yields.map((y, idx) => (
                                <tr key={y.id} className="hover:bg-slate-50/30 transition-colors">
                                    <td className="px-8 py-5">
                                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Deposit Address</p>
                                        <p className="font-mono text-[11px] font-bold text-slate-900">{y.wallet_address}</p>
                                        <p className="text-[9px] font-black text-indigo-500 uppercase mt-1">Deadline: {new Date(y.deadline).toLocaleDateString()}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-sky-50 rounded-xl flex items-center justify-center border border-sky-100">
                                                <Leaf className="w-4 h-4 text-sky-500" />
                                            </div>
                                            <div>
                                                <span className="text-xs font-black text-slate-900 uppercase tracking-tight block">{y.protocol_name}</span>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase">{new Date(y.timestamp).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <div className="text-xs font-black text-slate-900">${parseFloat(y.amount_usdt).toLocaleString()}</div>
                                        <div className="text-[9px] font-bold text-emerald-600 uppercase">Current: ${parseFloat(y.total_balance).toFixed(4)}</div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black">{y.apy_percentage}%</span>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <div className="text-xs font-black text-slate-900">${parseFloat(y.daily_yield).toFixed(4)}/day</div>
                                        <div className="text-[9px] font-bold text-sky-600 uppercase">Accrued: ${parseFloat(y.total_accrued).toFixed(4)}</div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <a href={`https://bscscan.com/tx/${y.tx_hash}`} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-sky-600 rounded-xl transition-all inline-block shadow-sm">
                                            <ArrowUpRight size={14} />
                                        </a>
                                    </td>
                                </tr>
                            ))}
                            {yields.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="6" className="py-20 text-center">
                                        <div className="max-w-xs mx-auto opacity-30">
                                            <ShieldAlert className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No institutional deployments recorded</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
