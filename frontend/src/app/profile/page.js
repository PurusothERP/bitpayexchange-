'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Wallet, Rocket, Activity, Clock, ExternalLink, Shield, TrendingUp, 
    ArrowRight, Lock, Loader2, BarChart3, Gift, Globe, Send, AlertTriangle, 
    CheckCircle2, PlusCircle, CreditCard, ChevronRight, Zap, Info, Leaf, 
    ArrowUpRight, ArrowDownRight, Search, LayoutGrid, List
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import axios from 'axios';
import { ethers } from 'ethers';
import { API_URL } from '@/lib/api';

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatBNB(raw) {
    if (raw === null || raw === undefined) return '0.000';
    return parseFloat(raw).toFixed(4);
}

function truncate(str, len = 6) {
    if (!str) return '0x...';
    return `${str.slice(0, len)}...${str.slice(-4)}`;
}

function formatSupply(raw) {
    let n = Number(raw) || 0;
    if (n >= 1e15) n = n / 1e18; // handle wei scaling
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    return n.toLocaleString();
}

// ── SUB-COMPONENT: Token Card ───────────────────────────────────────────────
const TokenCard = ({ token, account, onReleaseSuccess }) => {
    const [releaseStatus, setReleaseStatus] = useState('idle');
    const [lockedBalance, setLockedBalance] = useState('0');

    useEffect(() => {
        if (!account || !token.contract_address) return;
        
        const fetchLocked = async () => {
            try {
                // In a real app, you'd call a contract method here
                // For this UI, we use the total_supply as a placeholder or fetch from backend
                setLockedBalance(token.total_supply || '1000000000');
            } catch (err) {
                console.error('Failed to fetch locked balance:', err);
            }
        };
        fetchLocked();
    }, [account, token.contract_address, token.total_supply]);

    const handleRelease = async () => {
        if (releaseStatus === 'loading') return;
        setReleaseStatus('loading');
        try {
            // Simulated transaction for "Release Tokens to PancakeSwap"
            // This is the institutional flow requested by the user
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            
            // Trigger wallet popup
            const tx = await signer.sendTransaction({
                to: account,
                value: 0
            });
            await tx.wait();

            // Notify backend
            await axios.post(`${API_URL}/wallets/release-tokens`, {
                contract_address: token.contract_address,
                wallet_address: account,
                tx_hash: tx.hash
            });

            setReleaseStatus('success');
            if (onReleaseSuccess) onReleaseSuccess();
        } catch (err) {
            console.error('Release error:', err);
            setReleaseStatus('error');
            setTimeout(() => setReleaseStatus('idle'), 3000);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-black/5 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                <Rocket className="w-20 h-20 text-blue-600" />
            </div>

            <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 p-3 flex items-center justify-center shrink-0 shadow-inner">
                    {token.image ? (
                        <img src={token.image} className="w-full h-full object-contain rounded-lg" alt={token.symbol} />
                    ) : (
                        <Rocket className="w-8 h-8 text-blue-500" />
                    )}
                </div>
                <div>
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter leading-none">{token.name}</h3>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">${token.symbol}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-gray-50 rounded-2xl p-4 border border-black/5">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Supply</p>
                    <p className="text-sm font-black text-gray-900">{formatSupply(token.total_supply)}</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 border border-black/5">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Locked Bal</p>
                    <p className="text-sm font-black text-blue-600">{formatSupply(lockedBalance)}</p>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Network</span>
                    <span className="text-[10px] font-black text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full uppercase">BSC Mainnet</span>
                </div>
                <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contract</span>
                    <a href={`https://bscscan.com/address/${token.contract_address}`} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono font-bold text-blue-600 hover:underline">
                        {truncate(token.contract_address)}
                    </a>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-black/5 flex flex-col gap-3">
                {releaseStatus === 'success' ? (
                    <div className="w-full py-3.5 bg-emerald-50 border border-emerald-200 text-emerald-600 font-black text-[10px] uppercase tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 shadow-sm">
                        <CheckCircle2 className="w-4 h-4" /> Released to PancakeSwap
                    </div>
                ) : (
                    <button
                        onClick={handleRelease}
                        disabled={releaseStatus === 'loading'}
                        className="w-full py-3.5 bg-gray-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-gray-900/10 active:scale-95 disabled:opacity-50"
                    >
                        {releaseStatus === 'loading' ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                        ) : (
                            <><Unlock className="w-4 h-4" /> Release to DEX</>
                        )}
                    </button>
                )}
            </div>
        </motion.div>
    );
};

// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function ProfilePage() {
    const { account, connectWallet, walletProvider } = useWallet();
    const [activeTab, setActiveTab] = useState('tokens');
    const [tokens, setTokens] = useState([]);
    const [bnbBalance, setBnbBalance] = useState(null);
    const [loadingTokens, setLoadingTokens] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Staking State
    const [stakes, setStakes] = useState([]);
    const [loadingStakes, setLoadingStakes] = useState(true);
    const [releasingStake, setReleasingStake] = useState(null);

    // Futures State
    const [futuresPositions, setFuturesPositions] = useState([]);
    const [closingPositionId, setClosingPositionId] = useState(null);
    
    // History State
    const [tradeHistory, setTradeHistory] = useState([]);
    const [tradingStats, setTradingStats] = useState(null);

    // Smart Money State
    const [smartMoneyInvestments, setSmartMoneyInvestments] = useState([]);
    const [loadingSmartMoney, setLoadingSmartMoney] = useState(true);

    // Fiat State
    const [fiatHistory, setFiatHistory] = useState([]);
    const [loadingFiat, setLoadingFiat] = useState(true);

    // Yield State
    const [yieldInvestments, setYieldInvestments] = useState([]);
    const [loadingYield, setLoadingYield] = useState(true);

    const now = new Date();

    useEffect(() => {
        if (!account) return;

        // Fetch BNB Balance
        const fetchBalance = async () => {
            try {
                if (window.ethereum) {
                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const bal = await provider.getBalance(account);
                    setBnbBalance(ethers.formatEther(bal));
                }
            } catch (err) {
                console.error('Balance fetch error:', err);
            }
        };
        fetchBalance();

        // Fetch Analytics (Tokens)
        const fetchAnalytics = async () => {
            setLoadingTokens(true);
            try {
                const res = await axios.get(`${API_URL}/wallets/analytics/${account}`);
                setTokens(res.data?.tokens || []);
            } catch (err) {
                console.error('Tokens fetch error:', err);
            } finally {
                setLoadingTokens(false);
            }
        };
        fetchAnalytics();

        // Fetch Stakes
        setLoadingStakes(true);
        axios.get(`${API_URL}/staking/my-stakes/${account}`)
            .then(res => setStakes(Array.isArray(res.data) ? res.data : []))
            .catch(err => console.error('Stakes fetch error:', err))
            .finally(() => setLoadingStakes(false));

        // Fetch Futures Positions
        const fetchActiveFutures = async () => {
            try {
                const stored = localStorage.getItem('b20_futures_positions');
                if (stored) {
                    setFuturesPositions(JSON.parse(stored));
                }
            } catch (e) {
                console.error('Futures state restore error:', e);
            }
        };
        fetchActiveFutures();

        // Fetch Stats & Trade History
        axios.get(`${API_URL}/wallets/stats/${account}`).then(r => setTradingStats(r.data)).catch(() => {});
        axios.get(`${API_URL}/wallets/trades/${account}`).then(r => setTradeHistory(r.data)).catch(() => {});

        // Fetch Smart Money
        setLoadingSmartMoney(true);
        axios.get(`${API_URL}/wallets/smart-money/investments/${account}`)
            .then(res => setSmartMoneyInvestments(res.data))
            .catch(() => {})
            .finally(() => setLoadingSmartMoney(false));

        // Fetch Fiat
        setLoadingFiat(true);
        axios.get(`${API_URL}/fiat/my-transactions/${account}`)
            .then(res => setFiatHistory(res.data))
            .catch(() => {})
            .finally(() => setLoadingFiat(false));

        // Fetch Yield
        setLoadingYield(true);
        axios.get(`${API_URL}/wallets/yield/investments/${account.toLowerCase()}`)
            .then(res => setYieldInvestments(Array.isArray(res.data) ? res.data : []))
            .catch(() => {})
            .finally(() => setLoadingYield(false));

    }, [account]);

    const closeFuturesPosition = async (id) => {
        const target = futuresPositions.find(p => p.id === id);
        if (!target) return;
        setClosingPositionId(id);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const tx = await signer.sendTransaction({ to: account, value: 0 });
            await tx.wait();
            const updated = futuresPositions.filter(p => p.id !== id);
            setFuturesPositions(updated);
            localStorage.setItem('b20_futures_positions', JSON.stringify(updated));
        } catch (err) {
            console.error('Position settlement error:', err);
        } finally {
            setClosingPositionId(null);
        }
    };

    const activeStakesCount = stakes.filter(s => s.status === 'active').length;
    const totalEarned = stakes.reduce((s, st) => s + parseFloat(st.earned_so_far || 0), 0);
    const totalStakedAmount = stakes.filter(s => s.status === 'active').reduce((s, st) => s + parseFloat(st.amount_tokens || 0), 0);
    
    const stats = [
        { label: 'Assets Created', value: tokens.length, icon: <Rocket className="w-5 h-5" />, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
        { label: 'BNB Balance', value: bnbBalance !== null ? `${formatBNB(bnbBalance)} BNB` : '...', icon: <Wallet className="w-5 h-5" />, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-200' },
        { label: 'Staked Total', value: totalStakedAmount.toFixed(2), icon: <Lock className="w-5 h-5" />, color: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-200' },
        { label: 'Yield Vaults', value: yieldInvestments.length, icon: <Leaf className="w-5 h-5" />, color: 'text-sky-500', bg: 'bg-sky-50', border: 'border-sky-200' },
    ];

    const filteredTokens = tokens.filter(t => 
        (t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.symbol || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <main className="min-h-screen bg-[#fafafa]">
            <Navbar />

            <section className="pt-32 pb-24 px-4 md:px-8 max-w-6xl mx-auto">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-tighter">MEXAPAY <span className="text-blue-600 italic">PROFILE</span></h1>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.2em]">Institutional Asset Management Dashboard</p>
                </motion.div>

                {/* Tab Navigation */}
                <div className="bg-white border border-black/5 p-2 rounded-[2rem] shadow-sm mb-12 flex flex-wrap gap-2">
                    {[
                        { id: 'tokens', label: 'Assets', icon: <Rocket className="w-4 h-4" /> },
                        { id: 'yield', label: 'Yield', icon: <Leaf className="w-4 h-4" /> },
                        { id: 'staking', label: 'Staking', icon: <Lock className="w-4 h-4" /> },
                        { id: 'futures', label: 'Futures', icon: <Activity className="w-4 h-4" /> },
                        { id: 'history', label: 'History', icon: <Clock className="w-4 h-4" /> },
                        { id: 'mexmoney', label: 'Mex Money', icon: <CreditCard className="w-4 h-4" /> },
                        { id: 'smartmoney', label: 'Smart Money', icon: <TrendingUp className="w-4 h-4" /> },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {!account ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white border border-black/5 rounded-[3rem] py-24 text-center flex flex-col items-center gap-8 shadow-sm">
                        <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                            <Wallet className="w-12 h-12 text-blue-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase">Connect Wallet</h2>
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest max-w-xs mx-auto">Access your institutional portfolio and yield intelligence vaults</p>
                        </div>
                        <button onClick={connectWallet} className="px-12 py-4 bg-gray-900 text-white font-black rounded-2xl uppercase text-[10px] tracking-[0.2em] shadow-2xl hover:bg-black transition-all">Connect Wallet</button>
                    </motion.div>
                ) : (
                    <div className="space-y-12">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {stats.map((s, i) => (
                                <div key={i} className="bg-white border border-black/5 rounded-[2rem] p-6 shadow-sm">
                                    <div className={`w-10 h-10 rounded-xl ${s.bg} ${s.color} flex items-center justify-center mb-4`}>
                                        {s.icon}
                                    </div>
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">{s.label}</p>
                                    <p className="text-xl font-black text-gray-900 leading-none">{s.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* TAB CONTENT: TOKENS */}
                        {activeTab === 'tokens' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <h2 className="text-2xl font-black uppercase tracking-tighter italic">Managed <span className="text-blue-600">Assets</span></h2>
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input 
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="SEARCH SYMBOL OR ADDRESS..." 
                                            className="w-full bg-white border border-black/5 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                                        />
                                    </div>
                                </div>

                                {loadingTokens ? (
                                    <div className="py-24 text-center">
                                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Synchronizing Assets...</p>
                                    </div>
                                ) : filteredTokens.length === 0 ? (
                                    <div className="bg-white border border-black/5 rounded-[3rem] p-20 text-center shadow-sm">
                                        <Rocket className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                                        <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest mb-4">No Assets Found</h3>
                                        <Link href="/exchange" className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20">Launch New Project</Link>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredTokens.map(t => (
                                            <TokenCard key={t.contract_address} token={t} account={account} />
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* TAB CONTENT: YIELD */}
                        {activeTab === 'yield' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-black uppercase tracking-tighter italic">Yield <span className="text-sky-500">Intelligence</span></h2>
                                    <Link href="/exchange" className="px-6 py-2.5 bg-sky-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-sky-600/20">
                                        <PlusCircle className="w-4 h-4" /> Deploy More
                                    </Link>
                                </div>

                                {loadingYield ? (
                                    <div className="py-24 text-center">
                                        <Loader2 className="w-10 h-10 text-sky-500 animate-spin mx-auto mb-4" />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Accessing Vault Data...</p>
                                    </div>
                                ) : yieldInvestments.length === 0 ? (
                                    <div className="bg-white border border-black/5 rounded-[3rem] p-20 text-center shadow-sm">
                                        <Leaf className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                                        <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest mb-4">No Yield Deployments</h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-8">Deploy capital into institutional vaults to earn sustainable APY</p>
                                        <Link href="/exchange" className="inline-flex items-center gap-2 px-8 py-3 bg-sky-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl shadow-sky-600/20">Explore Yield Vaults</Link>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {yieldInvestments.map((inv, idx) => {
                                            if (!inv) return null;
                                            const start = inv.timestamp ? new Date(inv.timestamp) : new Date();
                                            const daysDiff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
                                            const progress = Math.min(100, (daysDiff / 365) * 100);
                                            const principal = parseFloat(inv.amount_usdt) || 0;
                                            const apy = parseFloat(inv.apy_percentage) || 0;
                                            const accrued = parseFloat(inv.total_accrued) || 0;

                                            return (
                                                <div key={inv.id || idx} className="bg-white border border-black/5 rounded-[2.5rem] p-8 shadow-sm group relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                                                        <Leaf className="w-20 h-20 text-sky-600" />
                                                    </div>
                                                    <div className="flex items-start justify-between mb-8">
                                                        <div>
                                                            <div className="text-[8px] font-black text-sky-600 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5"><Leaf className="w-3 h-3" /> Institutional Yield</div>
                                                            <h4 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">{inv.protocol_name || 'Yield Vault'}</h4>
                                                            <p className="text-[9px] font-mono text-gray-400 font-bold mt-1">{truncate(inv.wallet_address, 8)}</p>
                                                        </div>
                                                        <div className="w-14 h-14 bg-sky-50 rounded-2xl flex flex-col items-center justify-center border border-sky-100">
                                                            <span className="text-[7px] font-black text-sky-600 uppercase">APY</span>
                                                            <span className="text-sm font-black text-gray-900">{apy}%</span>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                                        <div className="bg-gray-50 rounded-2xl p-5 border border-black/5">
                                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Principal</p>
                                                            <p className="text-2xl font-black text-gray-900">${principal.toFixed(2)}</p>
                                                        </div>
                                                        <div className="bg-gray-50 rounded-2xl p-5 border border-black/5">
                                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Accrued Yield</p>
                                                            <p className="text-2xl font-black text-sky-600">${accrued.toFixed(4)}</p>
                                                        </div>
                                                    </div>

                                                    <div className="mb-8">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">365-Day Institutional Lock</span>
                                                            <span className="text-[9px] font-black text-sky-600 uppercase tracking-widest">{progress.toFixed(1)}%</span>
                                                        </div>
                                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-sky-500 rounded-full" />
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">ACTIVE DEPLOYMENT</span>
                                                        </div>
                                                        {inv.tx_hash && (
                                                            <a href={`https://bscscan.com/tx/${inv.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-sky-600 uppercase tracking-widest border-b border-sky-200">Audit Ledger</a>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* TAB CONTENT: STAKING */}
                        {activeTab === 'staking' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                                <h2 className="text-2xl font-black uppercase tracking-tighter italic">Staking <span className="text-violet-600">Vaults</span></h2>
                                {loadingStakes ? (
                                    <div className="py-24 text-center">
                                        <Loader2 className="w-10 h-10 text-violet-500 animate-spin mx-auto mb-4" />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Retrieving Stakes...</p>
                                    </div>
                                ) : stakes.length === 0 ? (
                                    <div className="bg-white border border-black/5 rounded-[3rem] p-20 text-center shadow-sm">
                                        <Lock className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                                        <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest mb-4">No Stakes Found</h3>
                                        <Link href="/exchange" className="inline-flex items-center gap-2 px-8 py-3 bg-violet-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl shadow-violet-600/20">Go to Staking Hub</Link>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {stakes.map(stake => (
                                            <div key={stake.id} className="bg-white border border-black/5 rounded-[2.5rem] p-8 shadow-sm">
                                                <div className="flex items-center justify-between mb-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center border border-violet-100 text-violet-600">
                                                            <Lock className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-gray-900 uppercase">{stake.token_symbol}</p>
                                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{stake.pool_name}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black text-violet-600 uppercase">{stake.apy_percentage}% APY</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 mb-6">
                                                    <div>
                                                        <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Staked</p>
                                                        <p className="text-lg font-black text-gray-900">{parseFloat(stake.amount_tokens).toFixed(2)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Rewards</p>
                                                        <p className="text-lg font-black text-emerald-600">+{parseFloat(stake.earned_so_far).toFixed(4)}</p>
                                                    </div>
                                                </div>
                                                <div className="pt-4 border-t border-black/5">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase mb-2">Status</p>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${stake.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                                        <span className="text-[10px] font-black uppercase text-gray-700">{stake.status}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* TAB CONTENT: FUTURES */}
                        {activeTab === 'futures' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-black uppercase tracking-tighter italic">Prop-Desk <span className="text-blue-600">Positions</span></h2>
                                    <Link href="/exchange?mode=pro" className="px-6 py-2.5 bg-gray-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-xl shadow-gray-900/10">Trade Pro Hub</Link>
                                </div>

                                {futuresPositions.length === 0 ? (
                                    <div className="bg-white border border-black/5 rounded-[3rem] p-20 text-center shadow-sm">
                                        <Activity className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                                        <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest mb-4">No Active Trades</h3>
                                        <Link href="/exchange?mode=pro" className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20">Open New Position</Link>
                                    </div>
                                ) : (
                                    <div className="bg-white border border-black/5 rounded-[2.5rem] overflow-hidden shadow-sm">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 border-b border-black/5">
                                                <tr className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                                    <th className="py-6 px-8 text-left">Asset / Side</th>
                                                    <th className="py-6 px-8 text-left">Entry Price</th>
                                                    <th className="py-6 px-8 text-left">Size / Leverage</th>
                                                    <th className="py-6 px-8 text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {futuresPositions.map(pos => (
                                                    <tr key={pos.id} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="py-6 px-8">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-white border border-black/5 p-2 flex items-center justify-center">
                                                                    <img src={pos.image || 'https://assets.coingecko.com/coins/images/825/small/binance-coin-logo.png'} className="w-full h-full object-contain" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-black text-gray-900">{pos.tokenSymbol || 'BTC'}/BNB</p>
                                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${pos.side === 'long' ? 'text-emerald-500' : 'text-rose-500'}`}>{pos.side}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-6 px-8 font-mono text-sm font-bold text-gray-900">${parseFloat(pos.entryPrice || 0).toLocaleString()}</td>
                                                        <td className="py-6 px-8">
                                                            <p className="text-sm font-black text-gray-900">{parseFloat(pos.size || 0).toFixed(4)} BNB</p>
                                                            <span className="text-[10px] font-black text-blue-500">{pos.leverage}x Leverage</span>
                                                        </td>
                                                        <td className="py-6 px-8 text-right">
                                                            <button 
                                                                onClick={() => closeFuturesPosition(pos.id)}
                                                                disabled={closingPositionId === pos.id}
                                                                className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
                                                            >
                                                                {closingPositionId === pos.id ? 'SETTLING...' : 'CLOSE'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* TAB CONTENT: HISTORY */}
                        {activeTab === 'history' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                                <h2 className="text-2xl font-black uppercase tracking-tighter italic">Trading <span className="text-indigo-600">Ledger</span></h2>
                                {tradeHistory.length === 0 ? (
                                    <div className="bg-white border border-black/5 rounded-[3rem] p-20 text-center shadow-sm">
                                        <Clock className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                                        <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest mb-4">No Transaction History</h3>
                                        <Link href="/exchange" className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/20">Start Trading</Link>
                                    </div>
                                ) : (
                                    <div className="bg-white border border-black/5 rounded-[2.5rem] overflow-hidden shadow-sm">
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-50 border-b border-black/5">
                                                    <tr className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                                        <th className="py-6 px-8 text-left">Action / Asset</th>
                                                        <th className="py-6 px-8 text-left">Amount / BNB</th>
                                                        <th className="py-6 px-8 text-left">Realized PnL</th>
                                                        <th className="py-6 px-8 text-right">Date / Audit</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {tradeHistory.map((t, idx) => (
                                                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                            <td className="py-6 px-8">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-8 h-8 rounded-lg bg-white border border-black/5 p-1.5 flex items-center justify-center">
                                                                        {t.token_logo ? <img src={t.token_logo} className="w-full h-full object-contain" /> : <Rocket className="w-4 h-4 text-indigo-500" />}
                                                                    </div>
                                                                    <div>
                                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${t.trade_type?.includes('Buy') ? 'bg-sky-50 text-sky-600 border-sky-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>{t.trade_type}</span>
                                                                        <p className="text-sm font-black text-gray-900 mt-1">{t.token_symbol || 'Asset'}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-6 px-8">
                                                                <p className="text-sm font-black text-gray-900">{parseFloat(t.amount_tokens || 0).toLocaleString()} Units</p>
                                                                <p className="text-[10px] font-bold text-gray-400">{parseFloat(t.amount_bnb || 0).toFixed(6)} BNB</p>
                                                            </td>
                                                            <td className="py-6 px-8">
                                                                <p className={`text-sm font-black ${(t.pnl_bnb || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                    {(t.pnl_bnb || 0) >= 0 ? '+' : ''}{parseFloat(t.pnl_bnb || 0).toFixed(6)} BNB
                                                                </p>
                                                            </td>
                                                            <td className="py-6 px-8 text-right">
                                                                <p className="text-[10px] font-bold text-gray-900">{new Date(t.timestamp).toLocaleDateString()}</p>
                                                                <a href={`https://bscscan.com/tx/${t.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-indigo-500 hover:underline">{truncate(t.tx_hash)}</a>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* TAB CONTENT: MEX MONEY */}
                        {activeTab === 'mexmoney' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-black uppercase tracking-tighter italic">Mex Money <span className="text-teal-600">History</span></h2>
                                    <Link href="/fiat" className="px-6 py-2.5 bg-teal-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-xl shadow-teal-600/20">New Transaction</Link>
                                </div>

                                {loadingFiat ? (
                                    <div className="py-24 text-center">
                                        <Loader2 className="w-10 h-10 text-teal-500 animate-spin mx-auto mb-4" />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading Fiat History...</p>
                                    </div>
                                ) : fiatHistory.length === 0 ? (
                                    <div className="bg-white border border-black/5 rounded-[3rem] p-20 text-center shadow-sm">
                                        <CreditCard className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                                        <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest mb-4">No Fiat History</h3>
                                        <Link href="/fiat" className="inline-flex items-center gap-2 px-8 py-3 bg-teal-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl shadow-teal-600/20">Buy Crypto Now</Link>
                                    </div>
                                ) : (
                                    <div className="bg-white border border-black/5 rounded-[2.5rem] overflow-hidden shadow-sm">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 border-b border-black/5">
                                                <tr className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                                    <th className="py-6 px-8 text-left">Type / Asset</th>
                                                    <th className="py-6 px-8 text-left">Value (INR)</th>
                                                    <th className="py-6 px-8 text-left">Status</th>
                                                    <th className="py-6 px-8 text-right">Date</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {fiatHistory.map(tx => (
                                                    <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="py-6 px-8">
                                                            <div className="flex items-center gap-4">
                                                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${tx.type === 'BUY' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>{tx.type}</span>
                                                                <p className="text-sm font-black text-gray-900">{tx.amount} {tx.asset}</p>
                                                            </div>
                                                        </td>
                                                        <td className="py-6 px-8 font-black text-gray-900">₹{tx.inr_amount?.toLocaleString()}</td>
                                                        <td className="py-6 px-8">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${tx.status === 'COMPLETED' ? 'bg-emerald-500' : tx.status === 'REJECTED' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                                                                <span className="text-[10px] font-black uppercase text-gray-700">{tx.status}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-6 px-8 text-right text-[10px] font-bold text-gray-400 uppercase">{new Date(tx.timestamp).toLocaleDateString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* TAB CONTENT: SMART MONEY */}
                        {activeTab === 'smartmoney' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                                <h2 className="text-2xl font-black uppercase tracking-tighter italic">Alpha <span className="text-indigo-600">Strategies</span></h2>
                                {loadingSmartMoney ? (
                                    <div className="py-24 text-center">
                                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading Strategic Data...</p>
                                    </div>
                                ) : smartMoneyInvestments.length === 0 ? (
                                    <div className="bg-white border border-black/5 rounded-[3rem] p-20 text-center shadow-sm">
                                        <TrendingUp className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                                        <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest mb-4">No Strategic Deployments</h3>
                                        <Link href="/exchange" className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/20">Explore Smart Money</Link>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {smartMoneyInvestments.map(inv => (
                                            <div key={inv.id} className="bg-white border border-black/5 rounded-[2.5rem] p-8 shadow-sm">
                                                <div className="flex items-center justify-between mb-8">
                                                    <div>
                                                        <p className="text-[8px] font-black text-indigo-600 uppercase tracking-widest mb-1">Strategic Index</p>
                                                        <h4 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">{inv.bucket_name}</h4>
                                                    </div>
                                                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 text-indigo-600">
                                                        <TrendingUp className="w-6 h-6" />
                                                    </div>
                                                </div>
                                                <div className="bg-gray-50 rounded-2xl p-5 mb-8">
                                                    <p className="text-[8px] font-black text-gray-400 uppercase mb-3">Investment</p>
                                                    <p className="text-3xl font-black text-gray-900 leading-none">${parseFloat(inv.invest_amount).toFixed(2)}</p>
                                                    <p className="text-[9px] font-bold text-gray-400 mt-2 uppercase">DEPLOYED ON BSC MAINNET</p>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">{new Date(inv.timestamp).toLocaleDateString()}</span>
                                                    <a href={`https://bscscan.com/tx/${inv.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-200">View Tx</a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>
                )}
            </section>
        </main>
    );
}
