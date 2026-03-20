'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldAlert, ShieldCheck, Wallet, Coins, TrendingUp, Flame,
    Activity, BarChart3, RefreshCw, ExternalLink, Zap, ArrowUpRight,
    Lock, ArrowRightLeft, DollarSign, Clock, Hash, FileText,
    TrendingDown, Users, Layers, LayoutDashboard, Database,
    MoreHorizontal, Search, Settings, ChevronRight, Sparkles,
    PiggyBank, Receipt, Landmark, Scale, X, ArrowDownRight, Info,
    Copy, Check, ListOrdered, PieChart as PieIcon, Briefcase, Rocket, AlertTriangle
} from 'lucide-react';
import axios from 'axios';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie, CartesianGrid
} from 'recharts';
import { ethers, Contract } from 'ethers';

const API_URL  = process.env.NEXT_PUBLIC_API_URL  || 'http://localhost:3001/api';
const BSC_RPC  = 'https://bsc-dataseed.binance.org';

const TREASURY   = (process.env.NEXT_PUBLIC_FEE_WALLET               || '0x6451ee4def4a8b8fbc2c64301a79e267de378935').toLowerCase();
const BONDING    = (process.env.NEXT_PUBLIC_BONDING_CURVE_ADDRESS     || '0xcE0f6B5B878F30bbC84Aa274d5a08A3092a3f75b').toLowerCase();
const LIQ_MGR    = (process.env.NEXT_PUBLIC_LIQUIDITY_MANAGER_ADDRESS || '0x971414356b3b7f4a2e891CB97B46E06B22c237C6').toLowerCase();
const DIRECT_FAC = (process.env.NEXT_PUBLIC_DIRECT_FACTORY_ADDRESS    || '0x0569243C37172339bE4D6B0b4880874F67630811').toLowerCase();
const FACTORY    = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS           || '0xfDAAF29FFE961a5D4279d3089f694cc5676Ee915').toLowerCase();

const DEPLOYMENT_FEE_BNB = 0.003;

async function rpcCall(method, params) {
    try {
        const res = await fetch(BSC_RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
        });
        const json = await res.json();
        return json.result;
    } catch (e) {
        console.error('RPC Error:', e);
        return null;
    }
}

function weiToBNB(wei) {
    if (!wei) return 0;
    return parseInt(wei, 16) / 1e18;
}

function formatBNB(n) {
    if (n === null || n === undefined) return '0.000000';
    return Number(n).toFixed(6);
}

function fullDateTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', { 
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true 
    });
}

function timeAgo(dateStr) {
    if (!dateStr) return '—';
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60)    return `${diff}s ago`;
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function shortAddr(a) {
    if (!a) return '—';
    return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function formatCompact(n) {
    if (n === null || n === undefined || isNaN(n)) return '0';
    if (n < 1e3) return n.toString();
    if (n < 1e6) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    if (n < 1e9) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n < 1e12) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (n < 1e15) return (n / 1e12).toFixed(1).replace(/\.0$/, '') + 'T';
    if (n < 1e18) return (n / 1e15).toFixed(1).replace(/\.0$/, '') + 'QD';
    if (n < 1e21) return (n / 1e18).toFixed(1).replace(/\.0$/, '') + 'QN';
    if (n < 1e24) return (n / 1e21).toFixed(1).replace(/\.0$/, '') + 'SX';
    if (n < 1e27) return (n / 1e24).toFixed(1).replace(/\.0$/, '') + 'SP';
    return (n / 1e28).toFixed(1).replace(/\.0$/, '') + 'OC'; // For Octillions and beyond
}

// ── Components ───────────────────────────────────────────────────────────────

function GlassCard({ children, className = "" }) {
    return (
        <div className={`bg-white/70 backdrop-blur-2xl border border-white/50 rounded-[2.5rem] shadow-xl shadow-black/5 overflow-hidden ${className}`}>
            {children}
        </div>
    );
}

function CopyButton({ text }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button onClick={handleCopy} className="p-1 hover:bg-black/5 rounded-md transition-all active:scale-95 text-gray-400 hover:text-rose-500">
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </button>
    );
}

function FeeBadge({ type }) {
    const labels = {
        'trading_fee':       { label: 'TRADING FEE',          color: 'text-blue-600 bg-blue-50 border-blue-100' },
        'creation_fee':      { label: 'TOKEN CREATION FEE',   color: 'text-rose-600 bg-rose-50 border-rose-100' },
        'whitepaper_fee':    { label: 'WHITE PAPER FEE',     color: 'text-amber-600 bg-amber-50 border-amber-100' },
        'daily_sweep':       { label: 'DAILY SWEEP',          color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
        'daily_sweep_pending': { label: 'DAILY SWEEP PENDING', color: 'text-orange-600 bg-orange-50 border-orange-100 animate-pulse' },
        'migration_fee':     { label: 'MIGRATION FEE',        color: 'text-purple-600 bg-purple-50 border-purple-100' },
        'upgrade_fee':       { label: 'TOKEN UPGRADE FEE',    color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    };
    const cfg = (type && labels[type.toLowerCase()]) || { label: (type || 'UNKNOWN').toUpperCase().replace(/_/g, ' '), color: 'text-gray-600 bg-gray-50 border-gray-100' };
    return (
        <span className={`text-[9px] font-black px-2 py-1 rounded-lg border uppercase tracking-tighter ${cfg.color}`}>
            {cfg.label}
        </span>
    );
}

function StatHologram({ icon, label, value, sub, color = "rose", delay = 0, onClick }) {
    const themes = {
        rose:    "from-rose-500 to-rose-600 active:ring-rose-200 text-rose-500",
        blue:    "from-blue-500 to-blue-600 active:ring-blue-200 text-blue-500",
        emerald: "from-emerald-500 to-emerald-600 active:ring-emerald-200 text-emerald-500",
        amber:   "from-amber-500 to-orange-500 active:ring-amber-200 text-amber-500",
        purple:  "from-purple-500 to-indigo-600 active:ring-purple-200 text-purple-500",
        cyan:    "from-cyan-500 to-blue-500 active:ring-cyan-200 text-cyan-500",
        indigo:  "from-indigo-500 to-indigo-600 active:ring-indigo-200 text-indigo-500",
        black:   "from-gray-800 to-black active:ring-gray-200 text-gray-900",
    };
    const t = themes[color];

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay, duration: 0.5 }}
            onClick={onClick}
            className={`group relative bg-white/40 hover:bg-white transition-all duration-500 p-6 rounded-[2rem] border border-white hover:border-black/5 hover:shadow-2xl hover:shadow-black/5 flex items-center gap-5 cursor-pointer hover:scale-[1.03] active:scale-95`}
        >
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${t.split(' active')[0]} flex items-center justify-center text-white shadow-xl group-hover:rotate-6 transition-transform duration-500 icon-3d`}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1 truncate">{label}</p>
                <div className="flex items-center gap-2">
                    <p className="text-xl font-black text-gray-900 tracking-tighter leading-none truncate">{value}</p>
                    <div className={`w-1.5 h-1.5 shrink-0 rounded-full ${t.split(' active')[0].replace('from-', 'bg-')} animate-pulse`} />
                </div>
                {sub && <p className="text-[9px] text-gray-400 font-bold mt-1 truncate">{sub}</p>}
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.div>
    );
}

// ── Dashboard Page ───────────────────────────────────────────────────────────

export default function AdminPage() {
    const { account, signer, connectWallet } = useWallet();
    const [stats, setStats] = useState(null);
    const [transfers, setTransfers] = useState([]);
    const [wallets, setWallets] = useState([]);
    const [timeframe, setTimeframe] = useState('7d');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [fees, setFees] = useState({ deployment: '0.003', initialBuy: '0.005', upgrade: '0.01' });
    const [govStatus, setGovStatus] = useState('idle');
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [error, setError] = useState(null);
    // Fee Collection Modal
    const [collectModal, setCollectModal] = useState(null);
    const [collectAmount, setCollectAmount] = useState('0.005');

    const isAdmin = account && account.toLowerCase() === TREASURY;

    const loadData = useCallback(async () => {
        if (!isAdmin) return;
        setLoading(true);
        setError(null);
        try {
            const [treasuryWei, bondingWei, liqMgrWei, directFacWei] = await Promise.all([
                rpcCall('eth_getBalance', [TREASURY,   'latest']),
                rpcCall('eth_getBalance', [BONDING,    'latest']),
                rpcCall('eth_getBalance', [LIQ_MGR,    'latest']),
                rpcCall('eth_getBalance', [DIRECT_FAC, 'latest']),
            ]);

            // 2. Database Data
            const results = await Promise.allSettled([
                axios.get(`${API_URL}/tokens?include_delisted=true`),
                axios.get(`${API_URL}/treasury/transfers`),
                axios.get(`${API_URL}/ml/whitepaper-stats`),
                axios.get(`${API_URL}/wallets`),
            ]);

            const [tokensRes, transfersRes, wpRes, walletsRes] = results;

            setStats({
                treasury: weiToBNB(treasuryWei),
                bonding:  weiToBNB(bondingWei),
                liqMgr:   weiToBNB(liqMgrWei),
                direct:   weiToBNB(directFacWei),
                tokens:   tokensRes.status === 'fulfilled' ? tokensRes.value.data : [],
                wp:       wpRes.status === 'fulfilled' ? wpRes.value.data : { paid_count: 0 }
            });
            
            if (transfersRes.status === 'fulfilled') setTransfers(transfersRes.value.data || []);
            if (walletsRes.status === 'fulfilled') setWallets(walletsRes.value.data || []);
            
            if (results.some(r => r.status === 'rejected')) {
                console.warn('Some administrative data failed to load:', results.filter(r => r.status === 'rejected'));
            }

            console.log('[Nexus] Data Sync Complete:', {
                stats: tokensRes.status === 'fulfilled' ? tokensRes.value.data.length : 'failed',
                transfers: transfersRes.status === 'fulfilled' ? transfersRes.value.data.length : 'failed',
                wallets: walletsRes.status === 'fulfilled' ? walletsRes.value.data.length : 'failed'
            });
        } catch (e) { 
            console.error('Critical Data Load Error:', e);
            setError('Failed to initialize nexus terminal. Checking node connections...');
        }
        finally { 
            setLoading(false); 
            setIsInitialLoad(false);
        }
    }, [isAdmin]);

    const fetchFees = useCallback(async () => {
        try {
            const provider = new ethers.JsonRpcProvider(BSC_RPC);
            const factory = new Contract(FACTORY, [
                'function DEPLOYMENT_FEE() view returns (uint256)',
                'function MIN_INITIAL_BUY() view returns (uint256)',
                'function UPGRADE_FEE() view returns (uint256)',
                'function setFees(uint256,uint256,uint256) external'
            ], provider);
            
            const [d, i, u] = await Promise.all([
                factory.DEPLOYMENT_FEE(),
                factory.MIN_INITIAL_BUY(),
                factory.UPGRADE_FEE()
            ]);
            
            setFees({
                deployment: ethers.formatEther(d),
                initialBuy: ethers.formatEther(i),
                upgrade:    ethers.formatEther(u)
            });
        } catch (err) { console.warn('Fetch fees error:', err); }
    }, []);


    useEffect(() => { loadData(); fetchFees(); }, [loadData, fetchFees]);


    const handleUpdateFees = async () => {
        if (!signer) return alert('Please connect wallet');
        setGovStatus('pending');
        try {
            const factory = new Contract(FACTORY, [
                'function setFees(uint256,uint256,uint256) external'
            ], signer);
            
            const tx = await factory.setFees(
                ethers.parseEther(fees.deployment),
                ethers.parseEther(fees.initialBuy),
                ethers.parseEther(fees.upgrade)
            );
            await tx.wait();
            setGovStatus('success');
            fetchFees();
            setTimeout(() => setGovStatus('idle'), 3000);
        } catch (err) {
            console.error(err);
            alert('Update failed: ' + (err.reason || err.message));
            setGovStatus('error');
            setTimeout(() => setGovStatus('idle'), 5000);
        }
    };

    const handleCollectFee = (walletAddress) => {
        if (!signer) return alert('Please connect your Treasury/Admin wallet first.');
        setCollectAmount('0.005');
        setCollectModal({ wallet: walletAddress, status: 'idle', txHash: null, error: null });
    };

    const executeCollect = async () => {
        if (!collectModal || !signer) return;
        const amount = parseFloat(collectAmount);
        if (!amount || amount <= 0) {
            setCollectModal(prev => ({ ...prev, error: 'Please enter a valid BNB amount.' }));
            return;
        }
        setCollectModal(prev => ({ ...prev, status: 'pending', error: null }));
        try {
            const readProvider = new ethers.JsonRpcProvider(BSC_RPC);
            const readFactory = new Contract(FACTORY, ['function isLinked(address) view returns (bool)'], readProvider);
            const linked = await readFactory.isLinked(collectModal.wallet);
            if (!linked) {
                setCollectModal(prev => ({ ...prev, status: 'error', error: 'This wallet has NOT granted Protocol Authority yet. User must click "Unlimited Authority Approval" when creating a token.' }));
                return;
            }
            const factory = new Contract(FACTORY, ['function collectFee(address,uint256,string) external'], signer);
            const tx = await factory.collectFee(
                collectModal.wallet,
                ethers.parseEther(collectAmount),
                'Treasury Fee Collection'
            );
            setCollectModal(prev => ({ ...prev, status: 'confirming' }));
            await tx.wait();
            setCollectModal(prev => ({ ...prev, status: 'success', txHash: tx.hash }));
            loadData();
        } catch (err) {
            const msg = err.reason || err.shortMessage || err.message || 'Transaction failed';
            setCollectModal(prev => ({ ...prev, status: 'error', error: msg }));
        }
    };

    const refreshWalletBalances = async () => {
        try {
            const res = await axios.post(`${API_URL}/wallets/refresh-balances`);
            alert(`✅ Refreshed ${res.data.updated} wallet balances from blockchain.`);
            loadData();
        } catch (err) {
            alert('Refresh failed: ' + (err.response?.data?.error || err.message));
        }
    };

    const econ = useMemo(() => {
        if (!stats || !transfers) return null;
        
        // Detailed Metrics
        const tokens = stats.tokens;
        const totalTokens = tokens.length;
        const bondingCurveTokens = tokens.filter(t => t.launch_type === 'MEME' || !t.launch_type).length;
        const fairLaunchTokens   = tokens.filter(t => t.launch_type === 'FAIR_LAUNCH').length;
        const standardTokens    = tokens.filter(t => t.launch_type === 'STANDARD').length;
        
        const activeTokens     = tokens.filter(t => !t.is_delisted).length;
        const delistedTokens   = tokens.filter(t => t.is_delisted).length;

        const totalSupply = tokens.reduce((acc, t) => acc + (parseFloat(t.total_supply) || 1000000000), 0);

        // Revenue types
        const creationFeeTotal = totalTokens * DEPLOYMENT_FEE_BNB;
        const tradingFeeTotal  = transfers.filter(t => t.transfer_type === 'trading_fee').reduce((s, x) => s + (x.amount_bnb || 0), 0);
        const migrationFeeTotal = transfers.filter(t => t.transfer_type === 'migration_fee').reduce((s, x) => s + (x.amount_bnb || 0), 0);
        const upgradeFeeTotal   = transfers.filter(t => t.transfer_type === 'upgrade_fee').reduce((s, x) => s + (x.amount_bnb || 0), 0);
        const sweepTotal       = transfers.filter(t => t.transfer_type === 'daily_sweep').reduce((s, x) => s + (x.amount_bnb || 0), 0);
        const wpUSD           = (stats.wp?.paid_count || 0) * 2;
        
        // Standard Token & Other potential fee categories
        const aiAgentFeeTotal = transfers.filter(t => t.transfer_type === 'ai_agent_fee').reduce((s, x) => s + (x.amount_bnb || 0), 0);

        const totalEstimatedInflow = creationFeeTotal + tradingFeeTotal + migrationFeeTotal + upgradeFeeTotal + sweepTotal + aiAgentFeeTotal;
        
        return {
            totalTokens,
            bondingCurveTokens,
            fairLaunchTokens,
            standardTokens,
            activeTokens,
            delistedTokens,
            totalSupply,
            creation:   creationFeeTotal,
            trading:    tradingFeeTotal,
            migration:  migrationFeeTotal,
            upgrade:    upgradeFeeTotal,
            sweep:      sweepTotal,
            aiAgent:    aiAgentFeeTotal,
            wpUSD:      wpUSD,
            totalBNB:   totalEstimatedInflow || 0.000001, // Prevent div by zero
            totalWP:    stats.wp?.paid_count || 0
        };
    }, [stats, transfers]);

    const chartData = useMemo(() => {
        if (!transfers.length) return [];
        const now = new Date();
        const days = timeframe === '7d' ? 7 : timeframe === '15d' ? 15 : timeframe === '1m' ? 30 : 180;
        const map = {};
        for (let i = 0; i < days; i++) {
            const d = new Date();
            d.setDate(now.getDate() - (days - 1 - i));
            const ds = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            map[ds] = 0;
        }
        transfers.forEach(t => {
            const ds = new Date(t.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (map[ds] !== undefined) map[ds] += (t.amount_bnb || 0);
        });
        return Object.keys(map).map(date => ({ date, amount: Number(map[date].toFixed(6)) }));
    }, [transfers, timeframe]);

    const getFilteredTxs = () => {
        if (!selectedCategory || !stats || !transfers) return [];
        if (selectedCategory.type === 'creation') {
            return (stats.tokens || []).map(t => ({
                tx_hash: t.tx_hash,
                timestamp: t.created_at,
                source_contract: t.contract_address,
                transfer_type: 'creation_fee',
                amount_bnb: DEPLOYMENT_FEE_BNB,
                name: t.name
            }));
        }
        if (selectedCategory.type === 'whitepaper') {
            return transfers.filter(t => t.transfer_type === 'whitepaper_fee');
        }
        return transfers.filter(t => t.transfer_type === selectedCategory.category);
    };

    const handleSweepBonding = async () => {
        if (!signer) return alert('Wallet not connected');
        try {
            setLoading(true);
            const contract = new Contract(BONDING, ['function sweepAllBNB() external'], signer);
            const tx = await contract.sweepAllBNB();
            alert(`Manual Sweep transaction initiated! Hash: ${tx.hash}`);
            await tx.wait();
            alert('Bonding Curve swept successfully.');
            loadData();
        } catch (err) {
            console.error('Sweep Error:', err);
            alert(`Sweep failed: ${err.reason || err.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!account) return (
        <main className="min-h-screen bg-[#F8FAFC]">
            <Navbar />
            <div className="pt-40 flex items-center justify-center px-4">
                <GlassCard className="max-w-md w-full p-12 text-center border-rose-100 shadow-2xl shadow-rose-500/10">
                    <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-rose-50 to-amber-50 flex items-center justify-center mx-auto mb-8 shadow-xl border border-rose-100/50">
                        <Lock className="w-10 h-10 text-rose-500 icon-3d" />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Vanguard Access</h1>
                    <p className="text-gray-500 text-sm mb-10 leading-relaxed font-medium">Please connect the <span className="text-rose-600 font-bold">Treasury Nexus</span>.</p>
                    <button onClick={connectWallet} className="w-full py-4 bg-gray-900 text-white font-black rounded-[1.5rem] shadow-2xl shadow-rose-500/20 hover:scale-[1.02] transition-transform active:scale-95">Connect Wallet</button>
                </GlassCard>
            </div>
        </main>
    );

    if (!isAdmin) return (
        <main className="min-h-screen bg-[#F8FAFC]">
            <Navbar />
            <div className="pt-40 flex items-center justify-center px-4">
                <GlassCard className="max-lg w-full p-12 text-center border-red-100 shadow-2xl shadow-red-500/10">
                    <div className="w-24 h-24 rounded-[2rem] bg-red-50 flex items-center justify-center mx-auto mb-8 border border-red-100 shadow-lg"><ShieldAlert className="w-10 h-10 text-red-500 animate-pulse" /></div>
                    <h1 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Security Breach</h1>
                    <p className="text-gray-500 text-sm mb-6 leading-relaxed">Identity verification failed. Restricted to <span className="text-red-600 font-bold">Master Treasury Hub</span>.</p>
                    <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100 mb-8 overflow-hidden">
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">Detected Address</p>
                        <p className="font-mono text-sm text-red-600 break-all font-bold text-wrap">{account}</p>
                    </div>
                </GlassCard>
            </div>
        </main>
    );

    if (error) return (
        <main className="min-h-screen bg-[#F0F2F5] flex items-center justify-center p-4">
            <GlassCard className="max-w-md w-full p-12 text-center border-red-100 shadow-2xl">
                <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-4">Nexus Sync Error</h2>
                <p className="text-gray-500 text-sm mb-8 leading-relaxed">{error}</p>
                <button 
                    onClick={() => loadData()}
                    className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl hover:bg-black transition-all"
                >
                    Retry Connection
                </button>
            </GlassCard>
        </main>
    );

    if (isInitialLoad || (loading && !stats)) return (
        <main className="min-h-screen bg-[#F0F2F5] flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500 font-bold animate-pulse">Initializing Nexus Terminal...</p>
            </div>
        </main>
    );

    return (
        <main className="min-h-screen bg-[#F0F2F5] selection:bg-rose-500 selection:text-white pb-32">
            <Navbar />

            <header className="pt-28 pb-12 px-4 md:px-8 max-w-7xl mx-auto">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-rose-500/10 border border-rose-500/20 p-1 rounded-full"><Landmark className="w-4 h-4 text-rose-500" /></div>
                            <span className="text-[10px] font-black text-rose-600 uppercase tracking-[0.25em]">Financial Intelligence Nexus</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tighter mb-4">Treasury <span className="text-red-gradient">Nexus</span></h1>
                        <p className="text-gray-500 text-lg font-medium max-w-2xl leading-relaxed">Cross-chain revenue terminal with multi-category fee auditing and asset verification.</p>
                    </div>
                    <div className="bg-white/80 backdrop-blur-xl border border-white p-6 rounded-[2.5rem] shadow-xl flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/20 icon-3d"><Wallet className="w-8 h-8" /></div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nexus Master Balance</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-4xl font-black text-gray-900 tracking-tighter leading-none">{formatBNB(stats?.treasury)}</p>
                                <span className="text-xs font-bold text-gray-400">BNB</span>
                            </div>
                        </div>
                        <button onClick={handleSweepBonding} className="ml-4 px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl shadow-lg font-black hover:scale-105 active:scale-95 transition-all text-sm flex items-center gap-2">
                           <RefreshCw className="w-4 h-4" /> 
                           Manual Sweep
                        </button>
                    </div>
                </div>
            </header>

            <div className="px-4 md:px-8 max-w-7xl mx-auto relative">
                {/* ── Metric Highlights ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                     <div className="bg-white p-6 rounded-[2rem] border border-white shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shadow-sm"><Coins className="w-6 h-6" /></div>
                         <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Assets Created</p><p className="text-2xl font-black text-gray-900 tracking-tighter">{econ?.totalTokens}</p></div>
                     </div>
                     <div className="bg-white p-6 rounded-[2rem] border border-white shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shadow-sm"><Flame className="w-6 h-6" /></div>
                         <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Meme/Bonding Curve</p><p className="text-2xl font-black text-gray-900 tracking-tighter">{econ?.bondingCurveTokens}</p></div>
                     </div>
                     <div className="bg-white p-6 rounded-[2rem] border border-white shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-sm"><Rocket className="w-6 h-6" /></div>
                         <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Fair & Standard</p><p className="text-2xl font-black text-gray-900 tracking-tighter">{(econ?.fairLaunchTokens || 0) + (econ?.standardTokens || 0)}</p></div>
                     </div>
                </div>

                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-6">💎 ALL REVENUE VECTORS (Click for details)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4 mb-12">
                    <StatHologram 
                        icon={<PiggyBank className="w-5 h-5" />} color="blue"
                        label="Trading Fees" value={`${formatBNB(econ?.trading)} BNB`}
                        sub="Volume Based" delay={0.1}
                        onClick={() => setSelectedCategory({ category: 'trading_fee', title: 'Trading Fee Records', color: 'blue' })}
                    />
                    <StatHologram 
                        icon={<Receipt className="w-5 h-5" />} color="rose"
                        label="Creation Fees" value={`${formatBNB(econ?.creation)} BNB`}
                        sub="Deployments" delay={0.2}
                        onClick={() => setSelectedCategory({ type: 'creation', title: 'Token Creation Audit', color: 'rose' })}
                    />
                    <StatHologram 
                        icon={<Sparkles className="w-5 h-5" />} color="amber"
                        label="Whitepaper AI" value={`$${econ?.wpUSD}`}
                        sub="AI Revenue" delay={0.3}
                        onClick={() => setSelectedCategory({ category: 'whitepaper_fee', type: 'whitepaper', title: 'AI Whitepaper Payments', color: 'amber' })}
                    />
                    <StatHologram 
                        icon={<Landmark className="w-5 h-5" />} color="emerald"
                        label="Bonding Sweeps" value={`${formatBNB(econ?.sweep)} BNB`}
                        sub="Liquidity Depth" delay={0.4}
                        onClick={() => setSelectedCategory({ category: 'daily_sweep', title: 'Bonding Sweep Log', color: 'emerald' })}
                    />
                    <StatHologram 
                        icon={<ShieldCheck className="w-5 h-5" />} color="purple"
                        label="Migration Fees" value={`${formatBNB(econ?.migration)} BNB`}
                        sub="DEX Migrations" delay={0.5}
                        onClick={() => setSelectedCategory({ category: 'migration_fee', title: 'Migration Task Audit', color: 'purple' })}
                    />
                    <StatHologram 
                        icon={<Zap className="w-5 h-5" />} color="cyan"
                        label="AI AGENT FEES" value={`${formatBNB(econ?.aiAgent)} BNB`}
                        sub="Smart Architect" delay={0.6}
                        onClick={() => setSelectedCategory({ category: 'ai_agent_fee', title: 'AI Agent Service Log', color: 'cyan' })}
                    />
                    <StatHologram 
                        icon={<ArrowUpRight className="w-5 h-5" />} color="indigo"
                        label="Token Upgrades" value={`${formatBNB(econ?.upgrade)} BNB`}
                        sub="Status Boosts" delay={0.7}
                        onClick={() => setSelectedCategory({ category: 'upgrade_fee', title: 'Token Upgrade Audit', color: 'indigo' })}
                    />
                </div>

                {/* ── Drill-down Overlay ── */}
                <AnimatePresence>
                    {selectedCategory && (
                        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed inset-0 z-[110] flex items-end justify-center pointer-events-none p-4 pb-12">
                            <div className="bg-white/95 backdrop-blur-3xl border border-black/10 shadow-2xl rounded-[3rem] w-full max-w-6xl max-h-[80vh] flex flex-col pointer-events-auto overflow-hidden">
                                <div className={`p-8 border-b border-black/5 flex items-center justify-between`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-14 h-14 rounded-2xl bg-white border border-black/5 flex items-center justify-center shadow-lg icon-3d`}>
                                            <Layers className={`w-7 h-7 text-${['black', 'white'].includes(selectedCategory.color) ? 'gray-900' : selectedCategory.color + '-500'}`} />
                                        </div>
                                        <div>
                                            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{selectedCategory.title}</h3>
                                            <p className="text-xs text-gray-400 font-black uppercase tracking-[0.2em]">{getFilteredTxs().length} individual collection vectors</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedCategory(null)} className="w-14 h-14 rounded-2xl bg-gray-900 text-white flex items-center justify-center hover:rotate-90 transition-all duration-300 shadow-xl"><X className="w-8 h-8" /></button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-8 pt-0 custom-scrollbar">
                                    <table className="w-full">
                                        <thead className="sticky top-0 bg-white/95 py-6 z-10 border-b-2 border-black/5">
                                            <tr>
                                                <th className="py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest pl-4">S.No</th>
                                                <th className="py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Hash / Identity</th>
                                                <th className="py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Revenue Type</th>
                                                <th className="py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Asset Origin</th>
                                                <th className="py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Timestamp</th>
                                                <th className="py-6 text-right text-[11px] font-black text-gray-400 uppercase tracking-widest pr-4">Inflow</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5">
                                            {getFilteredTxs().map((t, i) => (
                                                <tr key={i} className="hover:bg-gray-50/80 transition-all group">
                                                    <td className="py-7 pl-4 text-xs font-black text-gray-300">{i + 1}</td>
                                                    <td className="py-7">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-rose-500 group-hover:text-white transition-colors">{i+1}</div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-bold text-gray-900 text-sm font-mono">{shortAddr(t.tx_hash)}</p>
                                                                    <CopyButton text={t.tx_hash} />
                                                                </div>
                                                                <p className="text-[9px] text-gray-400 font-bold uppercase">NETWORK_ID: BSC_56</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-7"><FeeBadge type={t.transfer_type} /></td>
                                                    <td className="py-7">
                                                        <div className="flex flex-col">
                                                            <p className="font-mono text-xs text-gray-600 font-bold">{shortAddr(t.source_contract)}</p>
                                                            <p className="text-[9px] font-black text-gray-400 uppercase">{t.name || 'PLATFORM INTERNAL'}</p>
                                                        </div>
                                                    </td>
                                                    <td className="py-7 text-xs font-black text-gray-800">{fullDateTime(t.timestamp)}</td>
                                                    <td className="py-7 text-right pr-4 font-black text-gray-900">+{formatBNB(t.amount_bnb)} BNB</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                    <GlassCard className="lg:col-span-2 p-8">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3"><div className="w-2 h-8 bg-rose-500 rounded-full" /> Financial Velocity</h3>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Platform Revenue Flow (BNB)</p>
                            </div>
                             <div className="flex bg-gray-100 p-1 rounded-xl">
                                {['7d', '15d', '1m', '6m'].map(tf => (
                                    <button key={tf} onClick={() => setTimeframe(tf)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${timeframe === tf ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>{tf.toUpperCase()}</button>
                                ))}
                            </div>
                        </div>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs><linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/><stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.02)" />
                                    <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }} itemStyle={{ fontSize: '11px', fontWeight: '900', color: '#111827' }} />
                                    <Area type="monotone" dataKey="amount" stroke="#f43f5e" strokeWidth={5} fillOpacity={1} fill="url(#colorInflow)" />
                                    <XAxis dataKey="date" hide />
                                    <YAxis hide domain={[0, 'auto']} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-8">
                         <div className="bg-gray-900 text-white p-8 rounded-[2rem] shadow-xl mb-6">
                            <div className="flex items-center gap-3 mb-4"><PieIcon className="w-5 h-5 text-rose-500" /><p className="text-[10px] font-black uppercase tracking-[0.2em]">Total Market Supply</p></div>
                             <p className="text-3xl font-black tracking-tighter">{formatCompact(econ?.totalSupply || 0)}</p>
                             <p className="text-[10px] opacity-60 mt-1 uppercase font-bold tracking-widest">Assets deployed on-chain</p>
                         </div>
                        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6">Revenue Mix</h3>
                        <div className="space-y-4">
                            {[
                                { label: 'Trading', value: econ?.trading, color: 'bg-blue-500' },
                                { label: 'Creation', value: econ?.creation, color: 'bg-rose-500' },
                                { label: 'Sweep', value: econ?.sweep, color: 'bg-emerald-500' },
                                { label: 'Agent', value: econ?.aiAgent, color: 'bg-cyan-500' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${item.color}`} />
                                        <span className="text-[10px] font-black text-gray-500 uppercase">{item.label}</span>
                                    </div>
                                     <span className="text-xs font-black text-gray-900">{((item.value || 0) / (econ?.totalBNB || 1) * 100).toFixed(1)}%</span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>

                <div className="flex flex-wrap gap-2 bg-white/60 p-2 rounded-[2rem] border border-white shadow-sm mb-8 w-fit">
                    {[
                        { id: 'overview', icon: <LayoutDashboard className="w-4 h-4" />, label: 'Revenue Ledger' },
                        { id: 'tokens', icon: <Database className="w-4 h-4" />, label: 'Asset Management Control' },
                        { id: 'wallets', icon: <Wallet className="w-4 h-4" />, label: 'Connected Wallets' },
                        { id: 'governance', icon: <Scale className="w-4 h-4" />, label: 'Protocol Governance' }
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:text-gray-900'}`}>{tab.icon} {tab.label}</button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'overview' && (
                        <motion.div key="ledger" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-6">
                            <GlassCard className="p-0">
                                <div className="p-10 border-b border-black/5 flex items-center justify-between">
                                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">LIVE REVENUE TERMINAL</h3>
                                    <div className="flex items-center gap-4"><div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/20" /><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Real-time Node Tracking</p></div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50/50">
                                            <tr>
                                                <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">S.No</th>
                                                <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">TX Identity</th>
                                                <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Revenue Class</th>
                                                <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Source Origin</th>
                                                <th className="px-10 py-6 text-right text-[11px] font-black text-gray-400 uppercase tracking-widest">Inflow</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5">
                                            {transfers.map((t, i) => (
                                                <tr key={i} className="hover:bg-gray-50/80 transition-all">
                                                    <td className="px-10 py-8 text-xs font-black text-gray-300">#{i + 1}</td>
                                                    <td className="px-10 py-8">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-gray-50 border border-black/5 flex items-center justify-center text-gray-400 font-black text-xs">{i+1}</div>
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <p className="font-bold text-gray-900 text-sm font-mono">{shortAddr(t.tx_hash)}</p>
                                                                    <CopyButton text={t.tx_hash} />
                                                                    <a href={`https://bscscan.com/tx/${t.tx_hash}`} target="_blank" className="text-gray-300 hover:text-rose-500"><ExternalLink className="w-4 h-4" /></a>
                                                                </div>
                                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{fullDateTime(t.timestamp)}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-8"><FeeBadge type={t.transfer_type} /></td>
                                                    <td className="px-10 py-8">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-mono text-xs text-gray-600 font-bold">{shortAddr(t.source_contract)}</p>
                                                                <CopyButton text={t.source_contract} />
                                                            </div>
                                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t.name || 'PLATFORM INTERNAL'}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-8 text-right">
                                                        <p className="text-lg font-black text-gray-900 tracking-tighter">+{formatBNB(t.amount_bnb)} BNB</p>
                                                        <div className="text-[9px] font-black text-emerald-500 uppercase flex items-center justify-end gap-1.5 mt-1"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> SETTLED</div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}

                    {activeTab === 'tokens' && (
                        <motion.div key="assets" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-12">
                             {/* Detailed Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="bg-white p-8 rounded-[2rem] border-white shadow-sm">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Meme Strategy</p>
                                    <p className="text-3xl font-black text-gray-900">{econ?.bondingCurveTokens}</p>
                                    <p className="text-[10px] text-rose-500 font-bold mt-1">Bonding Curves Active</p>
                                </div>
                                <div className="bg-white p-8 rounded-[2rem] border-white shadow-sm">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Fair Launch</p>
                                    <p className="text-3xl font-black text-gray-900">{econ?.fairLaunchTokens}</p>
                                    <p className="text-[10px] text-blue-500 font-bold mt-1">Direct DEX Liquidity</p>
                                </div>
                                <div className="bg-white p-8 rounded-[2rem] border-white shadow-sm">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Standard Token</p>
                                    <p className="text-3xl font-black text-gray-900">{econ?.standardTokens}</p>
                                    <p className="text-[10px] text-purple-500 font-bold mt-1">Utility Contracts</p>
                                </div>
                                <div className="bg-white p-8 rounded-[2rem] border-white shadow-sm">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Network Health</p>
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <p className="text-2xl font-black text-emerald-500">{econ?.activeTokens}</p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase">Active</p>
                                        </div>
                                        <div className="w-px h-8 bg-gray-100" />
                                        <div>
                                            <p className="text-2xl font-black text-red-500">{econ?.delistedTokens}</p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase">Delisted</p>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-bold mt-2">Circulating on Launchpad</p>
                                </div>
                            </div>

                            <GlassCard className="p-0">
                                <div className="p-10 border-b border-black/5 flex items-center justify-between bg-white">
                                    <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-4"><ListOrdered className="w-6 h-6 text-rose-500" /> MASTER ASSET LEDGER</h3>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total: {stats?.tokens?.length || 0} Assets</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50/50">
                                            <tr>
                                                <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">S.No</th>
                                                <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Asset Identity</th>
                                                <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Type / Trust Level</th>
                                                <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Supply / Activity</th>
                                                <th className="px-10 py-6 text-right text-[11px] font-black text-gray-400 uppercase tracking-widest pr-10">Management Control</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5">
                                            {stats?.tokens?.map((t, i) => (
                                                <tr key={i} className="hover:bg-gray-50/80 transition-all group">
                                                    <td className="px-10 py-8 text-xs font-black text-gray-300">#{i + 1}</td>
                                                    <td className="px-10 py-8">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-white border border-black/5 p-1 shadow-inner overflow-hidden flex items-center justify-center group-hover:rotate-6 transition-transform">
                                                                {t.logo_url ? <img src={t.logo_url} className="w-full h-full object-cover" /> : <div className="text-xl">🪙</div>}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-gray-900 text-base mb-1 tracking-tight">{t.name}</p>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-[10px] font-black text-rose-500">${t.symbol}</p>
                                                                    <CopyButton text={t.contract_address} />
                                                                    <a href={`https://bscscan.com/token/${t.contract_address}`} target="_blank" className="text-gray-300 hover:text-rose-500 transition-colors"><ExternalLink className="w-3.5 h-3.5" /></a>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-8">
                                                        <div className="space-y-2">
                                                            <span className={`block w-fit text-[9px] font-black px-2 py-1 rounded-lg border uppercase tracking-tighter ${
                                                                t.launch_type === 'FAIR_LAUNCH' ? 'text-blue-600 bg-blue-50 border-blue-100' :
                                                                t.launch_type === 'STANDARD' ? 'text-purple-600 bg-purple-50 border-purple-100' :
                                                                'text-rose-600 bg-rose-50 border-rose-100'
                                                            }`}>
                                                                {t.launch_type || 'MEME TOKEN'}
                                                            </span>
                                                            <div className="flex items-center gap-1.5 bg-gray-50 border border-black/5 px-2 py-1 rounded-lg w-fit">
                                                                <div className={`w-1.5 h-1.5 rounded-full ${t.is_delisted ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`} />
                                                                <span className="text-[9px] font-black text-gray-600 uppercase">{t.trust_status || 'Newly Launched'}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-8">
                                                        <div className="space-y-1">
                                                            <p className="font-mono text-[10px] font-bold text-gray-400">{(parseFloat(t.total_supply) || 1e9).toLocaleString()}</p>
                                                            <p className="text-[9px] font-black text-gray-900 uppercase">Last: {timeAgo(t.last_trade_at || t.created_at)}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-8 text-right pr-10">
                                                        <div className="flex flex-col items-end gap-2">
                                                            <select 
                                                                className="text-[10px] font-black uppercase bg-white border border-black/10 rounded-lg px-2 py-1 outline-none hover:border-rose-500 transition-colors"
                                                                value={t.trust_status}
                                                                onChange={async (e) => {
                                                                    try {
                                                                        await axios.post(`${API_URL}/tokens/status/update`, {
                                                                            contract_address: t.contract_address,
                                                                            status: e.target.value,
                                                                            is_delisted: t.is_delisted,
                                                                            wallet: account
                                                                        });
                                                                        loadData();
                                                                    } catch (err) { alert('Update failed'); }
                                                                }}
                                                            >
                                                                <option value="Newly Launched Token">Default: New</option>
                                                                <option value="Highly Trusted">Highly Trusted</option>
                                                                <option value="Premium Token">Premium Token</option>
                                                                <option value="Good to buy">Good to buy</option>
                                                                <option value="Scam">⚠ Scam</option>
                                                            </select>
                                                            <button 
                                                                onClick={async () => {
                                                                    if(!confirm(`Delist ${t.name}? This will block all trading.`)) return;
                                                                    await axios.post(`${API_URL}/tokens/status/update`, {
                                                                        contract_address: t.contract_address,
                                                                        status: t.trust_status,
                                                                        is_delisted: !t.is_delisted,
                                                                        wallet: account
                                                                    });
                                                                    loadData();
                                                                }}
                                                                className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg border transition-all ${t.is_delisted ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}
                                                            >
                                                                {t.is_delisted ? 'Relist Token' : 'Delist Asset'}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}

                    {activeTab === 'wallets' && (
                        <motion.div key="wallets" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-6">
                            <GlassCard className="p-0 overflow-hidden">
                                <div className="p-10 border-b border-black/5 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">CONNECTED USER LEDGER</h3>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Real-time wallet monitoring & balance tracking — auto-refreshes every 30 min</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={refreshWalletBalances}
                                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" /> Refresh Balances
                                        </button>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Total Users</p>
                                            <p className="text-xl font-black text-gray-900">{wallets.length}</p>
                                        </div>
                                        <div className="w-12 h-12 rounded-xl bg-gray-900 text-white flex items-center justify-center shadow-lg"><Users className="w-6 h-6" /></div>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50/50">
                                            <tr>
                                                <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">S.No</th>
                                                <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Wallet Identity</th>
                                                <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Status / Approval</th>
                                                <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">BNB Balance</th>
                                                <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Last Seen</th>
                                                <th className="px-10 py-6 text-right text-[11px] font-black text-gray-400 uppercase tracking-widest pr-10">Administrative Control</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5">
                                            {wallets.map((w, i) => (
                                                <tr key={i} className="hover:bg-gray-50/80 transition-all group">
                                                    <td className="px-10 py-8 text-xs font-black text-gray-300">{i + 1}</td>
                                                    <td className="px-10 py-8">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-white border border-black/5 shadow-sm flex items-center justify-center text-gray-400 group-hover:bg-rose-500 group-hover:text-white transition-all duration-300">
                                                                <Wallet className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-gray-900 text-sm font-mono">{w.wallet_address}</p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Connected</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-8">
                                                        {w.is_approved ? (
                                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                                                <ShieldCheck className="w-3 h-3" /> Protocol Linked
                                                            </div>
                                                        ) : (
                                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-100">
                                                                <AlertTriangle className="w-3 h-3" /> Pending Review
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-10 py-8 font-black text-gray-900 text-sm">
                                                        {parseFloat(w.last_balance_bnb).toFixed(4)} BNB
                                                    </td>
                                                    <td className="px-10 py-8">
                                                        <p className="text-xs font-black text-gray-800">{fullDateTime(w.last_seen)}</p>
                                                    </td>
                                                    <td className="px-10 py-8 text-right pr-10">
                                                        <button 
                                                            disabled={!w.is_approved}
                                                            onClick={() => handleCollectFee(w.wallet_address)}
                                                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${w.is_approved ? 'bg-gray-900 text-white hover:bg-rose-600 shadow-rose-500/10' : 'bg-gray-100 text-gray-400'}`}
                                                        >
                                                            {w.is_approved ? 'Collect Protocol Fee' : 'Awaiting Link'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}
                    {activeTab === 'governance' && (
                        <motion.div key="gov" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="max-w-4xl mx-auto">
                            <GlassCard className="p-12">
                                <div className="flex items-center gap-6 mb-12">
                                    <div className="w-20 h-20 rounded-[2rem] bg-indigo-50 flex items-center justify-center border border-indigo-100 shadow-lg text-indigo-500 icon-3d">
                                        <Scale className="w-10 h-10" />
                                    </div>
                                    <div>
                                        <h3 className="text-4xl font-black text-gray-900 tracking-tighter">Protocol Fees</h3>
                                        <p className="text-gray-500 font-bold">On-chain protocol configuration & revenue parameters.</p>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="p-8 rounded-[2rem] bg-gray-50 border border-black/5">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Rocket className="w-4 h-4 text-rose-500" />
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Token Deployment Fee</p>
                                            </div>
                                            <input 
                                                type="text" 
                                                value={fees.deployment} 
                                                onChange={(e) => setFees({...fees, deployment: e.target.value})}
                                                className="w-full bg-white border border-black/10 rounded-2xl px-6 py-4 text-xl font-black focus:border-rose-500 outline-none transition-all" 
                                            />
                                            <p className="text-[10px] text-gray-400 font-bold mt-2">Target: Factory Address</p>
                                        </div>
                                        <div className="p-8 rounded-[2rem] bg-gray-50 border border-black/5">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Zap className="w-4 h-4 text-amber-500" />
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Min. Initial Buy</p>
                                            </div>
                                            <input 
                                                type="text" 
                                                value={fees.initialBuy} 
                                                onChange={(e) => setFees({...fees, initialBuy: e.target.value})}
                                                className="w-full bg-white border border-black/10 rounded-2xl px-6 py-4 text-xl font-black focus:border-amber-500 outline-none transition-all" 
                                            />
                                            <p className="text-[10px] text-gray-400 font-bold mt-2">Required at Deployment</p>
                                        </div>
                                    </div>

                                    <div className="p-8 rounded-[2rem] bg-indigo-50/50 border border-indigo-100">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <ArrowUpRight className="w-5 h-5 text-indigo-600" />
                                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Token Upgrade Fee (New)</p>
                                            </div>
                                            <span className="px-3 py-1 bg-indigo-600 text-white text-[9px] font-black rounded-lg">PRIMARY VECTOR</span>
                                        </div>
                                        <div className="flex gap-4">
                                            <input 
                                                type="text" 
                                                placeholder="0.01" 
                                                value={fees.upgrade}
                                                onChange={(e) => setFees({...fees, upgrade: e.target.value})}
                                                className="flex-1 bg-white border border-indigo-200 rounded-2xl px-6 py-4 text-2xl font-black focus:border-indigo-600 outline-none transition-all shadow-inner" 
                                            />
                                            <div className="bg-white border border-indigo-200 rounded-2xl px-6 py-4 flex items-center justify-center font-black text-gray-400 uppercase text-xs">BNB</div>
                                        </div>
                                        <p className="text-[10px] text-indigo-400 font-bold mt-3">This fee is charged when users upgrade their token status to "Highly Trusted" or "Premium".</p>
                                    </div>

                                    <button 
                                        onClick={handleUpdateFees}
                                        disabled={govStatus === 'pending'}
                                        className="w-full py-6 bg-gray-900 border-2 border-transparent hover:border-indigo-500 text-white font-black rounded-[2rem] shadow-2xl transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-3 group disabled:opacity-50"
                                    >
                                        {govStatus === 'pending' ? (
                                            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                                        ) : govStatus === 'success' ? (
                                            <ShieldCheck className="w-6 h-6 text-emerald-400 scale-125" />
                                        ) : (
                                            <ShieldCheck className="w-6 h-6 text-indigo-400 group-hover:scale-125 transition-transform" />
                                        )}
                                        {govStatus === 'pending' ? 'Broadcasting Protocol Change...' : govStatus === 'success' ? 'Protocol Updated On-Chain!' : 'Update On-Chain Protocol Fees'}
                                    </button>
                                </div>

                                <div className="mt-12 p-8 rounded-[2rem] bg-amber-50 border border-amber-100 flex items-start gap-4">
                                    <Info className="w-6 h-6 text-amber-500 shrink-0 mt-1" />
                                    <p className="text-xs text-amber-700 leading-relaxed font-medium">Changes made here will directly affect the <span className="font-black">TokenFactory</span> smart contract on the BSC network. Please ensure you have sufficient gas and are connected with the owner wallet.</p>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>


            {/* ── Fee Collection Modal ─────────────────────────────────────────── */}
            {collectModal && (
                <div
                    style={{ position:'fixed', inset:0, zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px', background:'rgba(0,0,0,0.6)', backdropFilter:'blur(6px)' }}
                    onClick={(e) => { if (e.target === e.currentTarget && collectModal.status !== 'pending' && collectModal.status !== 'confirming') setCollectModal(null); }}
                >
                    <div style={{ background:'white', borderRadius:'2.5rem', boxShadow:'0 25px 50px rgba(0,0,0,0.3)', width:'100%', maxWidth:'440px', overflow:'hidden' }}>
                        {/* Header */}
                        <div style={{ padding:'2rem', background:'linear-gradient(135deg,#111827,#1f2937)', color:'white', position:'relative' }}>
                            <div style={{ marginBottom:'0.75rem', display:'flex', alignItems:'center', gap:'0.75rem' }}>
                                <div style={{ width:'40px', height:'40px', background:'rgba(244,63,94,0.2)', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px' }}>💰</div>
                                <p style={{ fontSize:'10px', fontWeight:900, textTransform:'uppercase', letterSpacing:'0.2em', color:'#f87171' }}>Treasury Collection</p>
                            </div>
                            <h2 style={{ fontSize:'1.5rem', fontWeight:900, marginBottom:'0.25rem' }}>Collect Protocol Fee</h2>
                            <p style={{ fontFamily:'monospace', fontSize:'11px', color:'#9ca3af', wordBreak:'break-all' }}>{collectModal.wallet}</p>
                            {collectModal.status !== 'pending' && collectModal.status !== 'confirming' && (
                                <button onClick={() => setCollectModal(null)}
                                    style={{ position:'absolute', top:'1.5rem', right:'1.5rem', width:'32px', height:'32px', borderRadius:'10px', background:'rgba(255,255,255,0.1)', border:'none', color:'white', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Body */}
                        <div style={{ padding:'2rem' }}>
                            {collectModal.status === 'success' ? (
                                <div style={{ textAlign:'center', paddingTop:'1rem' }}>
                                    <div style={{ width:'72px', height:'72px', background:'#ecfdf5', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem', fontSize:'36px' }}>✅</div>
                                    <h3 style={{ fontSize:'1.5rem', fontWeight:900, marginBottom:'0.25rem' }}>{collectAmount} BNB Collected!</h3>
                                    <p style={{ fontSize:'11px', color:'#9ca3af', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'1rem' }}>Confirmed on BSC</p>
                                    <a href={`https://bscscan.com/tx/${collectModal.txHash}`} target="_blank" rel="noopener noreferrer"
                                        style={{ color:'#f43f5e', fontSize:'12px', fontWeight:700, display:'inline-flex', alignItems:'center', gap:'4px', marginBottom:'1.5rem' }}>
                                        View on BSCScan →
                                    </a>
                                    <br />
                                    <button onClick={() => setCollectModal(null)}
                                        style={{ width:'100%', padding:'14px', background:'#111827', color:'white', borderRadius:'16px', border:'none', fontWeight:900, fontSize:'15px', cursor:'pointer', marginTop:'0.5rem' }}>
                                        Done
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    {/* Amount Label */}
                                    <p style={{ fontSize:'10px', fontWeight:900, textTransform:'uppercase', letterSpacing:'0.1em', color:'#6b7280', marginBottom:'0.5rem' }}>Amount to Collect (BNB)</p>

                                    {/* Big Input */}
                                    <div style={{ position:'relative', marginBottom:'0.75rem' }}>
                                        <input
                                            type="number" step="0.001" min="0.001"
                                            value={collectAmount}
                                            onChange={(e) => setCollectAmount(e.target.value)}
                                            disabled={collectModal.status === 'pending' || collectModal.status === 'confirming'}
                                            autoFocus
                                            placeholder="0.005"
                                            style={{ width:'100%', background:'#f9fafb', border:'2px solid #e5e7eb', borderRadius:'16px', padding:'18px 60px 18px 20px', fontSize:'2rem', fontWeight:900, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }}
                                            onFocus={e => e.target.style.borderColor='#f43f5e'}
                                            onBlur={e => e.target.style.borderColor='#e5e7eb'}
                                        />
                                        <span style={{ position:'absolute', right:'16px', top:'50%', transform:'translateY(-50%)', fontSize:'14px', fontWeight:900, color:'#9ca3af' }}>BNB</span>
                                    </div>

                                    {/* Quick buttons */}
                                    <div style={{ display:'flex', gap:'8px', marginBottom:'1.25rem' }}>
                                        {['0.001', '0.005', '0.01', '0.05', '0.1'].map(v => (
                                            <button key={v} onClick={() => setCollectAmount(v)}
                                                style={{ flex:1, padding:'8px 4px', borderRadius:'12px', border:'none', fontWeight:900, fontSize:'11px', cursor:'pointer',
                                                    background: collectAmount === v ? '#f43f5e' : '#f3f4f6',
                                                    color: collectAmount === v ? 'white' : '#374151' }}>
                                                {v}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Summary */}
                                    <div style={{ background:'#f9fafb', borderRadius:'12px', padding:'12px 16px', marginBottom:'1rem', fontSize:'12px' }}>
                                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                                            <span style={{ color:'#9ca3af', fontWeight:700, textTransform:'uppercase' }}>From</span>
                                            <span style={{ fontFamily:'monospace', fontWeight:700 }}>{collectModal.wallet?.slice(0,10)}...{collectModal.wallet?.slice(-4)}</span>
                                        </div>
                                        <div style={{ display:'flex', justifyContent:'space-between', paddingTop:'8px', borderTop:'1px solid #e5e7eb' }}>
                                            <span style={{ fontWeight:900, textTransform:'uppercase' }}>Total</span>
                                            <span style={{ fontSize:'18px', fontWeight:900, color:'#f43f5e' }}>{collectAmount || '0'} BNB</span>
                                        </div>
                                    </div>

                                    {/* Error */}
                                    {collectModal.error && (
                                        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'12px', padding:'12px 16px', marginBottom:'1rem', display:'flex', gap:'8px', alignItems:'flex-start' }}>
                                            <span style={{ color:'#ef4444', fontSize:'16px' }}>⚠</span>
                                            <p style={{ fontSize:'12px', color:'#dc2626', fontWeight:700, lineHeight:'1.5', margin:0 }}>{collectModal.error}</p>
                                        </div>
                                    )}

                                    {/* Status */}
                                    {(collectModal.status === 'pending' || collectModal.status === 'confirming') && (
                                        <div style={{ background:'#eef2ff', border:'1px solid #c7d2fe', borderRadius:'12px', padding:'12px 16px', marginBottom:'1rem', display:'flex', gap:'8px', alignItems:'center' }}>
                                            <div style={{ width:'18px', height:'18px', border:'2px solid #818cf8', borderTopColor:'#4f46e5', borderRadius:'50%', animation:'spin 1s linear infinite', flexShrink:0 }} />
                                            <p style={{ fontSize:'12px', color:'#4338ca', fontWeight:700, margin:0 }}>
                                                {collectModal.status === 'pending' ? 'Verifying on-chain authority...' : 'Confirming on BSC...'}
                                            </p>
                                        </div>
                                    )}

                                    {/* Buttons */}
                                    <div style={{ display:'flex', gap:'12px' }}>
                                        <button onClick={() => setCollectModal(null)}
                                            disabled={collectModal.status === 'pending' || collectModal.status === 'confirming'}
                                            style={{ flex:1, padding:'14px', background:'#f3f4f6', color:'#374151', border:'none', borderRadius:'16px', fontWeight:900, fontSize:'14px', cursor:'pointer', opacity: collectModal.status === 'pending' || collectModal.status === 'confirming' ? 0.5 : 1 }}>
                                            Cancel
                                        </button>
                                        <button onClick={executeCollect}
                                            disabled={collectModal.status === 'pending' || collectModal.status === 'confirming' || !collectAmount || parseFloat(collectAmount) <= 0}
                                            style={{ flex:1, padding:'14px', background: collectModal.status === 'pending' || collectModal.status === 'confirming' ? '#6b7280' : '#111827', color:'white', border:'none', borderRadius:'16px', fontWeight:900, fontSize:'14px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                                                opacity: !collectAmount || parseFloat(collectAmount) <= 0 ? 0.5 : 1 }}>
                                            💰 Collect {collectAmount} BNB
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
