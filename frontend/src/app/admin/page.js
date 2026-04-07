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
    Copy, Check, ListOrdered, PieChart as PieIcon, Briefcase, Rocket, AlertTriangle, Image as ImageIcon,
    Unlock, Calendar, Gift, Target, MessageSquare, Megaphone, ShieldBan, Trash2, Brain
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
const DIRECT_FAC = (process.env.NEXT_PUBLIC_DIRECT_FACTORY_ADDRESS    || '0xd2f602536605CAed0C30a2DA05B24B8F0E59197E').toLowerCase();
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
        'smart_money_fee':   { label: 'SMART MONEY FEE',     color: 'text-cyan-600 bg-cyan-50 border-cyan-100' },
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
            className="group relative bg-[#0b0f19] overflow-hidden hover:bg-[#111827] transition-all duration-500 p-7 rounded-[2.5rem] border border-white/5 hover:border-white/10 hover:shadow-2xl flex flex-col gap-3 cursor-pointer hover:-translate-y-2 active:scale-95"
        >
            {/* Background Glow */}
            <div className={`absolute -right-8 -top-8 w-40 h-40 rounded-full bg-gradient-to-br ${t.split(' active')[0]} opacity-[0.15] group-hover:opacity-30 blur-3xl transition-opacity duration-700 pointer-events-none`} />
            
            <div className="flex items-start justify-between z-10 mb-2">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${t.split(' active')[0]} flex items-center justify-center text-white shadow-lg group-hover:rotate-12 group-hover:scale-110 transition-transform duration-500 border border-white/20`}>
                    {icon}
                </div>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-md">
                    <div className={`w-1.5 h-1.5 rounded-full bg-current ${t.replace(/from-|to-/g, '')} animate-pulse`} />
                    <span className="text-[8px] font-black text-white/70 uppercase tracking-widest leading-none">Live</span>
                </div>
            </div>
            
            <div className="z-10 mt-1">
                <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.25em] mb-1.5 truncate">{label}</p>
                <div className="flex items-baseline gap-1.5">
                    <p className={`text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r ${t.split(' active')[0]} tracking-tighter leading-none group-hover:scale-[1.02] origin-left transition-transform duration-300`}>
                        {value.split(' ')[0]}
                    </p>
                    {value.includes('BNB') && <span className="text-xs font-bold text-white/40 mb-1">BNB</span>}
                    {value.includes('USDT') && <span className="text-xs font-bold text-white/40 mb-1">USDT</span>}
                </div>
            </div>

            {sub && (
                <div className="z-10 mt-3 pt-4 border-t border-white/5 flex items-center justify-between group-hover:border-white/10 transition-colors">
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest truncate">{sub}</p>
                    <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-white transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                </div>
            )}
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
    const [ledgerSearch, setLedgerSearch] = useState('');
    const [assetSearch, setAssetSearch] = useState('');
    const [walletSearch, setWalletSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [fees, setFees] = useState({ deployment: '0.003', initialBuy: '0.005', upgrade: '0.01' });
    const [govStatus, setGovStatus] = useState('idle');
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [error, setError] = useState(null);
    const [fiatTransactions, setFiatTransactions] = useState([]);
    const [fiatSearch, setFiatSearch] = useState('');
    const [stakingRecords, setStakingRecords] = useState([]);
    const [stakingStats, setStakingStats] = useState(null);
    const [stakingSearch, setStakingSearch] = useState('');
    const [stakingFilter, setStakingFilter] = useState('all');
    const [approvingStake, setApprovingStake] = useState(null);
    const [rejectingStake, setRejectingStake] = useState(null);
    // Fee Collection Modal
    const [collectModal, setCollectModal] = useState(null);
    const [collectAmount, setCollectAmount] = useState('0.005');
    const [isVerifying, setIsVerifying] = useState(false);
    const [assistants, setAssistants] = useState([]);
    const [isAssistant, setIsAssistant] = useState(false);
    const [assistantPermissions, setAssistantPermissions] = useState([]);
    const [newAssistant, setNewAssistant] = useState({ wallet: '', name: '', permissions: [] });
    
    // Manual Token Listing
    const [listTokenData, setListTokenData] = useState({ name: '', symbol: '', contract_address: '', total_supply: '1000000000', liquidity_bnb: '10', bnb_price: '0.00001', logo_url: '' });
    const [isListingToken, setIsListingToken] = useState(false);
    
    // Auto Import System
    const [isImporting, setIsImporting] = useState(false);
    const [importAddress, setImportAddress] = useState('');
    const importTokenDetails = async () => {
        if (!importAddress || importAddress.length !== 42) {
            alert('Please enter a valid BSC contract address (0x...)');
            return;
        }
        setIsImporting(true);
        try {
            const dexRes = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${importAddress}`);
            if (dexRes.data && dexRes.data.pairs && dexRes.data.pairs.length > 0) {
                const pair = dexRes.data.pairs.find(p => p.chainId === 'bsc') || dexRes.data.pairs[0];
                const tokenBase = pair.baseToken.address.toLowerCase() === importAddress.toLowerCase() ? pair.baseToken : pair.quoteToken;
                
                // Calculate supply if FDV exists: FDV (USD) / Price (USD)
                let calculatedSupply = '1000000000';
                if (pair.fdv && pair.priceUsd) {
                    calculatedSupply = Math.floor(pair.fdv / parseFloat(pair.priceUsd)).toString();
                }

                setListTokenData(prev => ({
                    ...prev,
                    name: tokenBase.name || '',
                    symbol: tokenBase.symbol || '',
                    contract_address: tokenBase.address || importAddress,
                    bnb_price: pair.priceNative || '0', 
                    liquidity_bnb: (pair.liquidity && pair.liquidity.quote) ? pair.liquidity.quote.toString() : '0',
                    total_supply: calculatedSupply,
                    logo_url: pair.info?.imageUrl || prev.logo_url
                }));
                // Try to infer logo from trust wallet if missing
                if (!pair.info?.imageUrl) {
                    setListTokenData(prev => ({...prev, logo_url: `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/assets/${importAddress}/logo.png`}));
                }
                alert(`Successfully imported: ${tokenBase.name} (${tokenBase.symbol}) from PancakeSwap details!`);
            } else {
                alert('Could not find active PancakeSwap liquidity pools for this token on DexScreener. Please fill details manually or verify address.');
            }
        } catch (error) {
            console.error('Import error:', error);
            alert('Error scanning blockchain for token details.');
        } finally {
            setIsImporting(false);
        }
    };
    
    const handleListToken = async (e) => {
        e.preventDefault();
        setIsListingToken(true);
        try {
            await axios.post(`${API_URL}/tokens/admin/list`, { ...listTokenData, wallet: account });
            alert('Token successfully listed to Exchange & Perpetuals!');
            setListTokenData({ name: '', symbol: '', contract_address: '', total_supply: '1000000000', liquidity_bnb: '10', bnb_price: '0.00001', logo_url: '' });
            loadData();
            setActiveTab('tokens');
        } catch (err) {
            alert('Failed to list token: ' + (err.response?.data?.error || err.message));
        } finally {
            setIsListingToken(false);
        }
    };

    const isAdmin = account && account.toLowerCase() === TREASURY;
    const hasAccess = isAdmin || isAssistant;

    const checkAccess = (permission) => {
        if (isAdmin) return true;
        return assistantPermissions.includes(permission);
    };

    const loadData = useCallback(async () => {
        if (!account) return;
        setLoading(true);
        setError(null);
        try {
            // Only perform contract balance calls if fully authorized
            let treasuryWei = '0', bondingWei = '0', liqMgrWei = '0', directFacWei = '0';
            
            if (isAdmin) {
                [treasuryWei, bondingWei, liqMgrWei, directFacWei] = await Promise.all([
                    rpcCall('eth_getBalance', [TREASURY,   'latest']),
                    rpcCall('eth_getBalance', [BONDING,    'latest']),
                    rpcCall('eth_getBalance', [LIQ_MGR,    'latest']),
                    rpcCall('eth_getBalance', [DIRECT_FAC, 'latest']),
                ]);
            }

            // 2. Database Data
            const results = await Promise.allSettled([
                axios.get(`${API_URL}/tokens?include_delisted=true`),
                axios.get(`${API_URL}/treasury/transfers`),
                axios.get(`${API_URL}/ml/whitepaper-stats`),
                axios.get(`${API_URL}/wallets`),
                axios.get(`${API_URL}/fiat/transactions`),
                axios.get(`${API_URL}/staking/all?wallet=${account}`),
                axios.get(`${API_URL}/staking/stats?wallet=${account}`),
                axios.get(`${API_URL}/admin/assistants`),
                axios.get(`${API_URL}/admin/assistants/${account}/activities`),
            ]);

            const [tokensRes, transfersRes, wpRes, walletsRes, fiatRes, stakingRes, stakingStatsRes, teamRes, activityRes] = results.map(r => r.status === 'fulfilled' ? r.value : { data: [] });

            const onlineThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 mins ago
            const allWallets = walletsRes.data || [];
            const onlineNowCount = allWallets.filter(w => new Date(w.last_seen) > onlineThreshold).length;

            setStats({
                treasury: weiToBNB(treasuryWei),
                bonding:  weiToBNB(bondingWei),
                liqMgr:   weiToBNB(liqMgrWei),
                direct:   weiToBNB(directFacWei),
                tokens:   tokensRes.data || [],
                wp:       wpRes.data || { paid_count: 0 },
                onlineNow: onlineNowCount,
                totalUsers: allWallets.length,
                pendingKYC: allWallets.filter(w => !w.is_approved).length
            });
            
            setTransfers(transfersRes.data || []);
            setWallets(allWallets);
            setFiatTransactions(fiatRes.data || []);
            setStakingRecords(stakingRes.data || []);
            setStakingStats(stakingStatsRes.data || null);
            setAssistants(teamRes.data || []);
            
            // Check if current account is an assistant
            const myAssistant = (teamRes.data || []).find(a => a.wallet_address.toLowerCase() === account.toLowerCase());
            if (myAssistant) {
                 setIsAssistant(true);
                 setAssistantPermissions(JSON.parse(myAssistant.permissions_json || '[]'));
                 // Log login activity
                 axios.post(`${API_URL}/admin/assistants/login`, { wallet_address: account });
            }
            
            if (results.some(r => r.status === 'rejected')) {
                console.warn('Some administrative data failed to load:', results.filter(r => r.status === 'rejected'));
            }

            console.log('[Nexus] Data Sync Complete');
        } catch (e) { 
            console.error('Critical Data Load Error:', e);
            setError('Failed to initialize nexus terminal. Checking node connections...');
        }
        finally { 
            setLoading(false); 
            setIsInitialLoad(false);
        }
    }, [isAdmin, account]);

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


    useEffect(() => { 
        loadData(); 
        fetchFees(); 
        const intervalId = setInterval(() => {
            loadData();
            fetchFees();
        }, 15000);
        return () => clearInterval(intervalId);
    }, [loadData, fetchFees]);

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

    const handleUpdateFiatStatus = async (id, status) => {
        if (!confirm(`Are you sure you want to mark this transaction as ${status}?`)) return;
        console.log(`[Admin] Updating Fiat Status: ID=${id}, NewStatus=${status}`);
        try {
            const res = await axios.patch(`${API_URL}/fiat/transaction/${id}`, { status });
            console.log('[Admin] Update Response:', res.data);
            alert(`Transaction ${status.toLowerCase()}!`);
            loadData();
        } catch (err) {
            console.error('[Admin] Update Failed:', err);
            alert('Failed to update status: ' + (err.response?.data?.error || err.message));
        }
    };

    const econ = useMemo(() => {
        if (!stats || !transfers) return null;
        
        // Detailed Metrics
        const tokens = stats.tokens;
        const totalTokens = tokens.length;
        const bondingCurveTokens = tokens.filter(t => t.launch_type === 'MEME' || !t.launch_type).length;
        const fairLaunchTokens   = tokens.filter(t => t.launch_type === 'FAIR').length;
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
        const smartMoneyFee    = transfers.filter(t => t.transfer_type === 'smart_money_fee').length; // $1.00 each
        const wpUSD           = (stats.wp?.paid_count || 0) * 2;
        
        // Standard Token & Other potential fee categories
        const aiAgentFeeTotal = transfers.filter(t => t.transfer_type === 'ai_agent_fee').reduce((s, x) => s + (x.amount_bnb || 0), 0);
        const futuresFeeTotal = transfers.filter(t => t.transfer_type === 'futures_fee').reduce((s, x) => s + (x.amount_bnb || 0), 0);

        const totalEstimatedInflow = creationFeeTotal + tradingFeeTotal + migrationFeeTotal + upgradeFeeTotal + sweepTotal + aiAgentFeeTotal + futuresFeeTotal;
        
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
            futures:    futuresFeeTotal,
            smartMoney: smartMoneyFee,
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

    const triggerVerifyCycle = async () => {
        if (!confirm('Trigger manual BSCScan/PR verification cycle? This runs in background.')) return;
        setIsVerifying(true);
        try {
            await axios.post(`${API_URL}/tokens/admin/verify-cycle`, { wallet: account });
            logActivity('Triggered Scanner Cycle');
            alert('Verification cycle triggered in the background. Statuses will update shortly.');
        } catch (err) { 
            console.error('Trigger failed:', err);
            alert('Trigger failed: ' + (err.response?.data?.error || err.message)); 
        }
        finally { setIsVerifying(false); }
    };

    const logActivity = (activity) => {
        if (!isAssistant) return;
        axios.post(`${API_URL}/admin/activities/log`, { wallet_address: account, activity });
    };

    const downloadRevenueCSV = () => {
        window.open(`${API_URL}/admin/revenue/export`, '_blank');
        logActivity('Exported Revenue Ledger');
    };

    if (isInitialLoad && loading) return (
        <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <RefreshCw className="w-12 h-12 text-rose-500 animate-spin" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Waking Nexus Core...</p>
            </div>
        </main>
    );

    if (!hasAccess) return (
        <main className="min-h-screen bg-[#F8FAFC]">
            <Navbar />
            <div className="pt-40 max-w-7xl mx-auto px-6 text-center">
                <GlassCard className="p-20 flex flex-col items-center gap-6 border-rose-100">
                    <ShieldAlert className="w-20 h-20 text-rose-500" />
                    <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">Administrative Access Required</h2>
                    <p className="text-gray-500 font-bold max-w-md">Your wallet {account} is not registered in the Governance Registry. Contact the Master Treasury to request access nodes.</p>
                </GlassCard>
            </div>
        </main>
    );

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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-6 mb-16">
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
                        icon={<BarChart3 className="w-5 h-5" />} color="black"
                        label="Futures Fees" value={`${formatBNB(econ?.futures)} BNB`}
                        sub="Pro Trading" delay={0.65}
                        onClick={() => setSelectedCategory({ category: 'futures_fee', title: 'Futures Trading Audit', color: 'black' })}
                    />
                    <StatHologram 
                        icon={<ArrowUpRight className="w-5 h-5" />} color="indigo"
                        label="Token Upgrades" value={`${formatBNB(econ?.upgrade)} BNB`}
                        sub="Status Boosts" delay={0.7}
                        onClick={() => setSelectedCategory({ category: 'upgrade_fee', title: 'Token Upgrade Audit', color: 'indigo' })}
                    />
                    <StatHologram 
                        icon={<Brain className="w-5 h-5" />} color="cyan"
                        label="Smart Money Hub" value={`${econ?.smartMoney}.00 USDT`}
                        sub="Strategic Fees" delay={0.8}
                        onClick={() => setSelectedCategory({ category: 'smart_money_fee', title: 'Smart Money Audit', color: 'cyan' })}
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
                                                    <td className="py-7 text-right pr-4 font-black text-gray-900">
                                                        +{t.transfer_type === 'smart_money_fee' ? '1.00 USDT' : `${formatBNB(t.amount_bnb)} BNB`}
                                                    </td>
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
                        { id: 'overview', icon: <LayoutDashboard className="w-4 h-4" />, label: 'Revenue Overview', show: checkAccess('view_revenue') },
                        { id: 'revenue_table', icon: <Receipt className="w-4 h-4" />, label: 'Excel Ledger (Revenue)', show: checkAccess('view_revenue') },
                        { id: 'tokens', icon: <Database className="w-4 h-4" />, label: 'Master Asset Ledger', show: checkAccess('manage_tokens') },
                        { id: 'list_token', icon: <Rocket className="w-4 h-4" />, label: 'List to Exchange', show: checkAccess('manage_tokens') },
                        { id: 'maintenance', icon: <Settings className="w-4 h-4" />, label: 'Exchange Maintenance', show: checkAccess('manage_tokens') },
                        { id: 'launchpad', icon: <Rocket className="w-4 h-4" />, label: 'Launchpad Manager', show: checkAccess('manage_tokens') },
                        { id: 'wallets', icon: <Users className="w-4 h-4" />, label: 'Connected Wallets', show: checkAccess('manage_wallets') },
                        { id: 'fiat', icon: <DollarSign className="w-4 h-4" />, label: 'Fiat Management', show: checkAccess('manage_fiat') },
                        { id: 'staking', icon: <Lock className="w-4 h-4" />, label: 'Staking Management', show: checkAccess('manage_staking') },
                        { id: 'bulletin', icon: <Megaphone className="w-4 h-4" />, label: 'Bulletin Hub', show: checkAccess('manage_social') },
                        { id: 'community', icon: <MessageSquare className="w-4 h-4" />, label: 'Community Feed', show: checkAccess('manage_social') },
                        { id: 'team', icon: <Settings className="w-4 h-4" />, label: 'Team Settings', show: isAdmin },
                    ].filter(t => t.show).map((tab) => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:text-gray-900'}`}>{tab.icon} {tab.label}</button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'overview' && (
                        <motion.div key="ledger" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-6">
                            {/* ── LIVE NEXUS OVERVIEW (Active Data) ─────────────────────────── */}
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10">
                                <GlassCard className="p-7 bg-[#0b0f19] border-l-4 border-l-emerald-500 overflow-hidden relative group">
                                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                            <Activity className="w-6 h-6 animate-pulse" />
                                        </div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Online Now</p>
                                    </div>
                                    <h4 className="text-4xl font-black text-gray-900 tracking-tighter mb-1">{stats?.onlineNow || 0}</h4>
                                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /><p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Live Pulse Active</p></div>
                                </GlassCard>

                                <GlassCard className="p-7 bg-[#0b0f19] border-l-4 border-l-blue-500 overflow-hidden relative group">
                                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all" />
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                            <Users className="w-6 h-6" />
                                        </div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Total Registered</p>
                                    </div>
                                    <h4 className="text-4xl font-black text-gray-900 tracking-tighter mb-1">{stats?.totalUsers || 0}</h4>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Global Ecosystem Reach</p>
                                </GlassCard>

                                <GlassCard className="p-7 bg-[#0b0f19] border-l-4 border-l-amber-500 overflow-hidden relative group">
                                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all" />
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                            <ShieldAlert className="w-6 h-6" />
                                        </div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Awaiting Link</p>
                                    </div>
                                    <h4 className="text-4xl font-black text-gray-900 tracking-tighter mb-1">{stats?.pendingKYC || 0}</h4>
                                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Pending Protocol Access</p>
                                </GlassCard>

                                <GlassCard className="p-7 bg-[#0b0f19] border-l-4 border-l-violet-500 overflow-hidden relative group">
                                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-violet-500/10 rounded-full blur-2xl group-hover:bg-violet-500/20 transition-all" />
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                                            <TrendingUp className="w-6 h-6" />
                                        </div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Market Activity</p>
                                    </div>
                                    <h4 className="text-4xl font-black text-gray-900 tracking-tighter mb-1">{stats?.tokens?.length || 0}</h4>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Assets Index</p>
                                </GlassCard>
                            </div>

                            <GlassCard className="p-0">
                                <div className="p-10 border-b border-black/5 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">LIVE REVENUE TERMINAL</h3>
                                        <div className="flex items-center gap-4 mt-1"><div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/20" /><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Real-time Node Tracking</p></div>
                                    </div>
                                    <div className="relative group w-full lg:max-w-md">
                                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-rose-500 transition-colors" />
                                        <input 
                                            type="text" 
                                            placeholder="Audit by Hash, Address or Asset Name..." 
                                            value={ledgerSearch}
                                            onChange={(e) => setLedgerSearch(e.target.value)}
                                            className="w-full pl-14 pr-6 py-4 bg-gray-50 border border-transparent focus:border-rose-500/30 focus:bg-white rounded-[1.5rem] text-sm font-bold text-gray-900 shadow-inner transition-all outline-none" 
                                        />
                                    </div>
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
                                            {transfers
                                                .filter(t => {
                                                    const q = ledgerSearch.toLowerCase();
                                                    return (t.tx_hash || '').toLowerCase().includes(q) || 
                                                           (t.source_contract || '').toLowerCase().includes(q) || 
                                                           (t.name || '').toLowerCase().includes(q);
                                                })
                                                .map((t, i) => (
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

                    {activeTab === 'list_token' && (
                        <motion.div key="list_token" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-6">
                            <GlassCard className="p-10 border-cyan-100 flex flex-col items-center">
                                <div className="w-20 h-20 rounded-[2rem] bg-cyan-50 flex items-center justify-center mb-6 shadow-xl border border-cyan-100">
                                    <Rocket className="w-10 h-10 text-cyan-500 icon-3d" />
                                </div>
                                <h2 className="text-3xl font-black text-gray-900 tracking-tighter mb-2">List Token to Exchange</h2>
                                <p className="text-gray-500 font-bold mb-8 max-w-lg text-center">Manually add external or custom tokens to the B20 Exchange and Perpetual Futures platforms instantly.</p>
                                
                                {/* Auto-Import Box */}
                                <div className="w-full max-w-3xl mb-10 p-6 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 rounded-[2rem]">
                                    <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-2 text-left">Auto-Import from PancakeSwap 🥞</label>
                                    <div className="flex gap-4">
                                        <input 
                                            type="text" 
                                            value={importAddress} 
                                            onChange={e => setImportAddress(e.target.value)} 
                                            className="w-full p-4 bg-white border border-blue-100 rounded-2xl outline-none focus:border-blue-500 font-mono font-bold text-gray-900 shadow-inner" 
                                            placeholder="Paste Contract Address (0x...)" 
                                        />
                                        <button 
                                            onClick={importTokenDetails} 
                                            disabled={isImporting || !importAddress}
                                            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 uppercase tracking-widest transition-all whitespace-nowrap"
                                        >
                                            {isImporting ? 'Scanning...' : 'Fetch Details'}
                                        </button>
                                    </div>
                                    <p className="text-[9px] font-bold text-blue-400 mt-3 text-left">Powered by DexScreener On-Chain Engine.</p>
                                </div>

                                <form onSubmit={handleListToken} className="w-full max-w-3xl space-y-6 text-left">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Token Name</label>
                                            <input required type="text" value={listTokenData.name} onChange={e => setListTokenData({...listTokenData, name: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-cyan-500 font-bold text-gray-900" placeholder="e.g. Wrapped BNB" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Token Symbol</label>
                                            <input required type="text" value={listTokenData.symbol} onChange={e => setListTokenData({...listTokenData, symbol: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-cyan-500 font-bold text-gray-900" placeholder="e.g. WBNB" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Contract Address</label>
                                        <input required type="text" value={listTokenData.contract_address} onChange={e => setListTokenData({...listTokenData, contract_address: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-cyan-500 font-mono font-bold text-gray-900" placeholder="0x..." />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Circulating Supply</label>
                                            <input type="number" value={listTokenData.total_supply} onChange={e => setListTokenData({...listTokenData, total_supply: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-cyan-500 font-bold text-gray-900" placeholder="e.g. 1000000000" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Pancake Liquidity (BNB)</label>
                                            <input type="number" step="0.01" value={listTokenData.liquidity_bnb} onChange={e => setListTokenData({...listTokenData, liquidity_bnb: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-cyan-500 font-bold text-gray-900" placeholder="e.g. 10" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Current BNB Price</label>
                                            <input type="number" step="0.00000001" value={listTokenData.bnb_price} onChange={e => setListTokenData({...listTokenData, bnb_price: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-cyan-500 font-bold text-gray-900" placeholder="e.g. 0.00001" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Logo URL (Optional)</label>
                                            <input type="url" value={listTokenData.logo_url} onChange={e => setListTokenData({...listTokenData, logo_url: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-cyan-500 font-bold text-gray-900" placeholder="https://..." />
                                        </div>
                                    </div>
                                    <button disabled={isListingToken} type="submit" className="w-full py-5 bg-cyan-500 hover:bg-cyan-600 text-white font-black rounded-2xl shadow-xl shadow-cyan-500/20 uppercase tracking-widest transition-all mt-4 disabled:opacity-50">
                                        {isListingToken ? 'Deploying to Exchange...' : 'Confirm Listing'}
                                    </button>
                                </form>
                            </GlassCard>
                        </motion.div>
                    )}

                    {activeTab === 'maintenance' && (
                        <motion.div key="maintenance" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-6">
                            <GlassCard className="p-0 border-rose-100 flex flex-col">
                                <div className="p-10 border-b border-black/5 bg-white">
                                    <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-4"><Settings className="w-6 h-6 text-gray-900" /> EXCHANGE MAINTENANCE</h3>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Manage external assets listed to B20 Exchange and Perpetuals</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50/50">
                                            <tr>
                                                <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Coin Identity</th>
                                                <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Base Price</th>
                                                <th className="px-10 py-6 text-right text-[11px] font-black text-gray-400 uppercase tracking-widest pr-10">Visibility Control (ON/OFF)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5">
                                            {stats?.tokens
                                                ?.filter(t => t.launch_type === 'EXCHANGE_LISTING')
                                                ?.map((t, i) => (
                                                <tr key={i} className="hover:bg-gray-50/80 transition-all">
                                                    <td className="px-10 py-8">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-white border border-black/5 p-1 shadow-inner overflow-hidden flex items-center justify-center">
                                                                {t.logo_url ? <img src={t.logo_url} className="w-full h-full object-cover" /> : <div className="text-xl">🪙</div>}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-gray-900 text-base mb-1 tracking-tight">{t.name}</p>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-[10px] font-black text-rose-500">${t.symbol}</p>
                                                                    <CopyButton text={t.contract_address} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-8">
                                                        <p className="font-mono text-[14px] font-bold text-gray-900">{t.price_bnb} BNB</p>
                                                    </td>
                                                    <td className="px-10 py-8 text-right pr-10">
                                                        <button 
                                                            onClick={async () => {
                                                                await axios.post(`${API_URL}/tokens/status/update`, {
                                                                    contract_address: t.contract_address,
                                                                    status: t.trust_status,
                                                                    is_delisted: !t.is_delisted, // toggle
                                                                    wallet: account
                                                                });
                                                                loadData();
                                                            }}
                                                            className={`text-[11px] font-black uppercase px-6 py-3 rounded-xl border transition-all ${t.is_delisted ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 border-emerald-600'}`}
                                                        >
                                                            {t.is_delisted ? 'OFF (Hidden)' : 'ON (Visible)'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(stats?.tokens?.filter(t => t.launch_type === 'EXCHANGE_LISTING').length || 0) === 0 && (
                                                <tr><td colSpan="3" className="px-10 py-12 text-center text-gray-400 font-bold text-sm">No external listings yet.</td></tr>
                                            )}
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
                                <div className="p-10 border-b border-black/5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white">
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-4"><ListOrdered className="w-6 h-6 text-rose-500" /> MASTER ASSET LEDGER</h3>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Found {stats?.tokens?.filter(t => (t.name || '').toLowerCase().includes(assetSearch.toLowerCase()) || (t.symbol || '').toLowerCase().includes(assetSearch.toLowerCase()) || (t.contract_address || '').toLowerCase().includes(assetSearch.toLowerCase())).length} Assets</p>
                                    </div>
                                    <div className="relative group w-full lg:max-w-md">
                                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-rose-500 transition-colors" />
                                        <input 
                                            type="text" 
                                            placeholder="Search by Name, Symbol or Address..." 
                                            value={assetSearch}
                                            onChange={(e) => setAssetSearch(e.target.value)}
                                            className="w-full pl-14 pr-6 py-4 bg-gray-50 border border-transparent focus:border-rose-500/30 focus:bg-white rounded-[1.5rem] text-sm font-bold text-gray-900 shadow-inner transition-all outline-none" 
                                        />
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50/50">
                                            <tr>
                                                <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">S.No</th>
                                                <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Asset Identity</th>
                                                <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Type / Trust Level</th>
                                                <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Supply / Market Cap</th>
                                                <th className="px-10 py-6 text-right text-[11px] font-black text-gray-400 uppercase tracking-widest pr-10">Management Control</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5">
                                            {stats?.tokens
                                                ?.filter(t => {
                                                    const q = assetSearch.toLowerCase();
                                                    return (t.name || '').toLowerCase().includes(q) || 
                                                           (t.symbol || '').toLowerCase().includes(q) || 
                                                           (t.contract_address || '').toLowerCase().includes(q);
                                                })
                                                ?.map((t, i) => (
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
                                                            <p className="font-mono text-[10px] font-bold text-gray-400">{(parseFloat(t.total_supply) || 1e9).toLocaleString()} · {formatCompact(t.market_cap || 0)} CAP</p>
                                                            <p className="text-[9px] font-black text-gray-900 uppercase">Last Activity: {timeAgo(t.last_trade_at || t.created_at)}</p>
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

                    {activeTab === 'launchpad' && (
                        <motion.div key="launchpad-mgmt" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-12">
                            
                            {/* Launchpad Quick Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white p-8 rounded-[2.5rem] border border-white shadow-xl shadow-black/5 flex items-center justify-between group">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Launchpad Depth</p>
                                        <p className="text-3xl font-black text-gray-900 tracking-tighter">{(stats?.tokens?.length || 0)} Assets</p>
                                        <p className="text-[10px] text-rose-500 font-bold mt-1 uppercase tracking-widest">Across all engines</p>
                                    </div>
                                    <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform"><Layers className="w-8 h-8" /></div>
                                </div>
                                <GlassCard className="p-8 flex items-center justify-between group cursor-pointer" onClick={triggerVerifyCycle}>
                                     <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Scanner Engine</p>
                                        <p className="text-3xl font-black text-gray-900 tracking-tighter">{isVerifying ? 'Verifying...' : 'Ready'}</p>
                                        <p className="text-[10px] text-emerald-500 font-bold mt-1 uppercase tracking-widest">Auto-Verify Service</p>
                                    </div>
                                    <div className={`w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center ${isVerifying ? 'animate-spin' : 'group-hover:rotate-12'} transition-all`}><RefreshCw className="w-8 h-8" /></div>
                                </GlassCard>
                                <div className="bg-gray-900 p-8 rounded-[2.5rem] shadow-2xl flex items-center justify-between group">
                                     <div>
                                        <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Release Protocol</p>
                                        <p className="text-3xl font-black text-white tracking-tighter">Active</p>
                                        <p className="text-[10px] text-blue-400 font-bold mt-1 uppercase tracking-widest">DEX Sync Enabled</p>
                                    </div>
                                    <div className="w-16 h-16 rounded-2xl bg-white/10 text-white flex items-center justify-center group-hover:scale-110 transition-transform"><ShieldCheck className="w-8 h-8" /></div>
                                </div>
                            </div>

                            {/* Bonding Curve Section */}
                            <GlassCard className="p-0 overflow-hidden">
                                <div className="p-10 border-b border-black/5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gradient-to-r from-rose-50/30 to-white">
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-4"><Zap className="w-6 h-6 text-rose-500" /> BONDING CURVE PIPELINE</h3>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Meme Engines Progress to PancakeSwap (Target: 20 BNB)</p>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50/50">
                                            <tr>
                                                <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Asset</th>
                                                <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Curve Depth</th>
                                                <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Progress</th>
                                                <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Verification</th>
                                                <th className="px-10 py-6 text-right text-[11px] font-black text-gray-400 uppercase tracking-widest pr-10">Last Trade</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5">
                                            {(stats?.tokens?.filter(t => t.launch_type === 'MEME' || !t.launch_type) || []).length === 0 ? (
                                                <tr><td colSpan="5" className="py-20 text-center text-gray-400 font-bold">No tracks on curve yet</td></tr>
                                            ) : stats.tokens.filter(t => t.launch_type === 'MEME' || !t.launch_type).map((t, i) => {
                                                const curveBnb = parseFloat(t.liquidity_bnb || 0) / 1e18;
                                                const progress = Math.min(100, (curveBnb / 20) * 100);
                                                return (
                                                    <tr key={i} className="hover:bg-gray-50/80 transition-all">
                                                        <td className="px-10 py-8">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl bg-white border border-black/5 shadow-sm overflow-hidden"><img src={t.logo_url} className="w-full h-full object-cover" /></div>
                                                                <div>
                                                                    <p className="font-black text-gray-900 text-sm tracking-tight">{t.name}</p>
                                                                    <p className="text-[10px] text-rose-500 font-black tracking-widest">${t.symbol}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-10 py-8 font-mono text-sm font-black text-gray-900">{curveBnb.toFixed(4)} BNB</td>
                                                        <td className="px-10 py-8">
                                                            <div className="w-40 flex flex-col gap-1.5">
                                                                <div className="flex justify-between text-[8px] font-black uppercase text-gray-400"><span>Target: 20</span> <span>{progress.toFixed(1)}%</span></div>
                                                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden border border-black/5">
                                                                    <div className="h-full bg-gradient-to-r from-rose-500 to-amber-500" style={{ width: `${progress}%` }} />
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-10 py-8">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className={`w-2 h-2 rounded-full ${t.bscscan_verified ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                                    <span className="text-[10px] font-black uppercase text-gray-600">{t.bscscan_verified ? 'BSCScan Verified' : 'Scan Pending'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className={`w-2 h-2 rounded-full ${t.tw_pr_status === 'success' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                                                    <span className="text-[10px] font-black uppercase text-gray-400">{t.tw_pr_status === 'success' ? 'Trust Wallet Approved' : 'TW Pending'}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-10 py-8 text-right pr-10 text-[10px] font-black text-gray-300 uppercase tracking-widest">{timeAgo(t.last_trade_at || t.created_at)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </GlassCard>

                            {/* ── Fair Launch Management Panel (Moved here) ────────────────────────── */}
                            <GlassCard className="p-0 overflow-hidden">
                                <div className="p-10 border-b border-black/5 bg-gradient-to-r from-blue-50 to-white flex items-center justify-between">
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-4">
                                            <Rocket className="w-6 h-6 text-blue-500" /> FAIR LAUNCH PIPELINE
                                        </h3>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                                            {stats?.tokens?.filter(t => t.launch_type === 'FAIR' || t.launch_type === 'FAIR_LAUNCH').length || 0} Assets Deployed · Liquidity Management Hub
                                        </p>
                                    </div>
                                    <div className="px-5 py-2.5 bg-blue-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-500/20">DEX Sync Protocol Active</div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-blue-50/40">
                                            <tr>
                                                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Token</th>
                                                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Released to DEX</th>
                                                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status / Link</th>
                                                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Market Cap</th>
                                                <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest pr-10">Last Trade</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5">
                                            {(stats?.tokens?.filter(t => t.launch_type === 'FAIR' || t.launch_type === 'FAIR_LAUNCH') || []).length === 0 ? (
                                                <tr><td colSpan="5" className="py-16 text-center text-sm text-gray-400 font-bold">No active fair launches</td></tr>
                                            ) : stats.tokens.filter(t => t.launch_type === 'FAIR' || t.launch_type === 'FAIR_LAUNCH').map((t, i) => {
                                                const totalSup = parseFloat(t.total_supply) || 1_000_000_000;
                                                const maxReleasable = totalSup * 0.9;
                                                const releasedEst = t.tokens_released || maxReleasable;
                                                return (
                                                    <tr key={i} className="hover:bg-blue-50/30 transition-all">
                                                        <td className="px-8 py-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl bg-white border border-black/5 p-1 shadow-inner overflow-hidden flex items-center justify-center text-sm">
                                                                    {t.logo_url ? <img src={t.logo_url} className="w-full h-full object-cover" /> : '🚀'}
                                                                </div>
                                                                <div>
                                                                    <p className="font-black text-gray-900 text-sm tracking-tight">{t.name}</p>
                                                                    <p className="text-[10px] text-blue-500 font-black tracking-widest">${t.symbol}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <div className="space-y-1">
                                                                <p className="font-mono text-[10px] font-black text-emerald-600">{(releasedEst / 1e6).toFixed(0)}M Supply</p>
                                                                <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden border border-black/5">
                                                                    <div className="h-full rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" style={{width: Math.min(100, (releasedEst / maxReleasable) * 100) + '%'}} />
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-[9px] font-black text-blue-500 uppercase flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> PancakeSwap V2</span>
                                                                <p className="font-mono text-[10px] text-gray-400 font-bold">{shortAddr(t.contract_address)}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6 font-mono text-sm font-black text-gray-900">{formatCompact(t.market_cap || 0)}</td>
                                                        <td className="px-8 py-6 text-right pr-10 text-[10px] font-black text-gray-300 uppercase tracking-widest">{timeAgo(t.last_trade_at || t.created_at)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}


                    {activeTab === 'wallets' && (

                        <motion.div key="wallets" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-6">
                            <GlassCard className="p-0 overflow-hidden">
                                <div className="p-10 border-b border-black/5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gradient-to-r from-gray-50 to-white">
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">CONNECTED USER LEDGER</h3>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Found {wallets.filter(w => (w.wallet_address || '').toLowerCase().includes(walletSearch.toLowerCase())).length} Active Wallets</p>
                                    </div>
                                    <div className="flex flex-col lg:flex-row items-center gap-6 w-full lg:max-w-2xl">
                                        <div className="relative group flex-1 w-full">
                                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-rose-500 transition-colors" />
                                            <input 
                                                type="text" 
                                                placeholder="Track by Wallet Address..." 
                                                value={walletSearch}
                                                onChange={(e) => setWalletSearch(e.target.value)}
                                                className="w-full pl-14 pr-6 py-4 bg-white border border-transparent focus:border-rose-500/30 rounded-[1.5rem] text-sm font-bold text-gray-900 shadow-inner transition-all outline-none" 
                                            />
                                        </div>
                                        <button
                                            onClick={refreshWalletBalances}
                                            className="whitespace-nowrap flex items-center gap-2 px-6 py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" /> Refresh Balances
                                        </button>
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
                                            {wallets
                                                .filter(w => (w.wallet_address || '').toLowerCase().includes(walletSearch.toLowerCase()))
                                                .map((w, i) => (
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
                    {activeTab === 'staking' && (() => {
                        const filteredStaking = stakingRecords.filter(s => {
                            const q = stakingSearch.toLowerCase();
                            const matchQ = !q || (s.wallet_address || '').toLowerCase().includes(q) || (s.token_symbol || '').toLowerCase().includes(q) || (s.token_name || '').toLowerCase().includes(q);
                            const matchF = stakingFilter === 'all' || s.status === stakingFilter;
                            return matchQ && matchF;
                        });
                        const handleApprove = async (stakeId) => {
                            if (!confirm('Approve this release? Tokens + rewards will be marked as released.')) return;
                            setApprovingStake(stakeId);
                            try {
                                await axios.post(`${API_URL}/staking/admin/approve-release`, { stake_id: stakeId, admin_wallet: account, admin_note: 'Approved by admin' });
                                alert('✅ Release approved successfully!');
                                loadData();
                            } catch (err) { alert('❌ ' + (err.response?.data?.error || err.message)); }
                            finally { setApprovingStake(null); }
                        };
                        const handleReject = async (stakeId) => {
                            const reason = prompt('Reason for rejection:');
                            if (!reason) return;
                            setRejectingStake(stakeId);
                            try {
                                await axios.post(`${API_URL}/staking/admin/reject-release`, { stake_id: stakeId, admin_wallet: account, reason });
                                alert('✅ Release rejected — stake remains active.');
                                loadData();
                            } catch (err) { alert('❌ ' + (err.response?.data?.error || err.message)); }
                            finally { setRejectingStake(null); }
                        };
                        return (
                            <motion.div key="staking" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-6">
                                {/* Stats */}
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                    {[
                                        { label: 'Total Stakes', value: stakingStats?.total_stakes || 0, color: 'text-violet-600', bg: 'bg-violet-50', icon: <Lock className="w-5 h-5" /> },
                                        { label: 'Active', value: stakingStats?.active_count || 0, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <Activity className="w-5 h-5" /> },
                                        { label: 'Pending Release', value: stakingStats?.pending_release || 0, color: 'text-amber-600', bg: 'bg-amber-50', icon: <Clock className="w-5 h-5" /> },
                                        { label: 'Released', value: stakingStats?.released_count || 0, color: 'text-blue-600', bg: 'bg-blue-50', icon: <Unlock className="w-5 h-5" /> },
                                        { label: 'Total Staked', value: formatCompact(stakingStats?.total_staked_tokens || 0), color: 'text-rose-600', bg: 'bg-rose-50', icon: <Coins className="w-5 h-5" /> },
                                        { label: 'Total Rewards', value: formatCompact(stakingStats?.total_expected_rewards || 0), color: 'text-purple-600', bg: 'bg-purple-50', icon: <Gift className="w-5 h-5" /> },
                                    ].map((s, i) => (
                                        <div key={i} className={`bg-white border border-white rounded-[1.5rem] p-5 shadow-sm flex items-center gap-3`}>
                                            <div className={`w-10 h-10 rounded-xl ${s.bg} ${s.color} flex items-center justify-center shrink-0`}>{s.icon}</div>
                                            <div>
                                                <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{s.label}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <GlassCard className="p-0">
                                    <div className="p-8 border-b border-black/5 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                                        <div>
                                            <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                                <Lock className="w-6 h-6 text-violet-500" /> Staking Records Management
                                            </h3>
                                            <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-widest">
                                                Approve releases, monitor positions, and manage vault
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            {/* Filter buttons */}
                                            <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
                                                {['all', 'active', 'pending_release', 'released'].map(f => (
                                                    <button key={f} onClick={() => setStakingFilter(f)}
                                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${stakingFilter === f ? 'bg-white shadow text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
                                                        {f === 'all' ? 'All' : f === 'pending_release' ? '⏳ Pending' : f.charAt(0).toUpperCase() + f.slice(1)}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="relative">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input type="text" placeholder="Search wallet, token..."
                                                    value={stakingSearch} onChange={e => setStakingSearch(e.target.value)}
                                                    className="pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent focus:border-violet-500/30 rounded-xl text-sm font-bold text-gray-900 outline-none w-56" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50/50">
                                                <tr>
                                                    {['#', 'Wallet', 'Token', 'Amount', 'APR', 'Period', 'Progress', 'Earned', 'Status', 'Actions'].map(h => (
                                                        <th key={h} className="px-5 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-black/5">
                                                {filteredStaking.length === 0 ? (
                                                    <tr><td colSpan={10} className="text-center py-12 text-gray-400 font-bold">No staking records found</td></tr>
                                                ) : filteredStaking.map((stake, i) => {
                                                    const progress = ((stake.elapsed_days / stake.period_days) * 100).toFixed(1);
                                                    const statusCfg = {
                                                        active: { label: '● Active', cls: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
                                                        pending_release: { label: '⏳ Pending', cls: 'text-amber-600 bg-amber-50 border-amber-200 animate-pulse' },
                                                        released: { label: '✓ Released', cls: 'text-blue-600 bg-blue-50 border-blue-200' },
                                                    }[stake.status] || { label: stake.status, cls: 'text-gray-600 bg-gray-50 border-gray-200' };
                                                    return (
                                                        <tr key={stake.id} className="hover:bg-gray-50/80 transition-all group">
                                                            <td className="px-5 py-5 text-xs font-black text-gray-300">{i + 1}</td>
                                                            <td className="px-5 py-5">
                                                                <p className="font-mono text-xs font-bold text-gray-700">{shortAddr(stake.wallet_address)}</p>
                                                                <p className="text-[9px] text-gray-400">{stake.is_matured ? '✅ Matured' : `${stake.days_remaining}d left`}</p>
                                                            </td>
                                                            <td className="px-5 py-5">
                                                                <p className="font-bold text-gray-900 text-sm">{stake.token_symbol}</p>
                                                                <p className="text-[9px] text-gray-400">{stake.token_name}</p>
                                                            </td>
                                                            <td className="px-5 py-5">
                                                                <p className="font-black text-gray-900 text-sm">{formatCompact(stake.amount_tokens)}</p>
                                                            </td>
                                                            <td className="px-5 py-5">
                                                                <span className="text-violet-600 font-black">{stake.apr}%</span>
                                                            </td>
                                                            <td className="px-5 py-5">
                                                                <p className="text-sm font-bold text-gray-700">{stake.period_days}d</p>
                                                                <p className="text-[9px] text-gray-400">{new Date(stake.end_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                            </td>
                                                            <td className="px-5 py-5 min-w-[100px]">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                        <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                                                                            style={{ width: `${Math.min(100, progress)}%` }} />
                                                                    </div>
                                                                    <span className="text-[10px] font-black text-gray-500 shrink-0">{Math.min(100, parseFloat(progress)).toFixed(0)}%</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-5 py-5">
                                                                <p className="font-black text-emerald-600 text-sm">{parseFloat(stake.earned_so_far).toFixed(4)}</p>
                                                                <p className="text-[9px] text-gray-400">of {parseFloat(stake.expected_reward).toFixed(4)}</p>
                                                            </td>
                                                            <td className="px-5 py-5">
                                                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${statusCfg.cls}`}>
                                                                    {statusCfg.label}
                                                                </span>
                                                            </td>
                                                            <td className="px-5 py-5">
                                                                {stake.status === 'pending_release' && (
                                                                    <div className="flex items-center gap-2">
                                                                        <button onClick={() => handleApprove(stake.id)}
                                                                            disabled={approvingStake === stake.id}
                                                                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black rounded-lg flex items-center gap-1 transition-all disabled:opacity-50">
                                                                            {approvingStake === stake.id ? '...' : <><Unlock className="w-3 h-3" /> Approve</>}
                                                                        </button>
                                                                        <button onClick={() => handleReject(stake.id)}
                                                                            disabled={rejectingStake === stake.id}
                                                                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-black rounded-lg border border-rose-200 flex items-center gap-1 transition-all disabled:opacity-50">
                                                                            {rejectingStake === stake.id ? '...' : <><X className="w-3 h-3" /> Reject</>}
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                {stake.status === 'released' && (
                                                                    <span className="text-[10px] text-blue-600 font-bold">
                                                                        Payout: {parseFloat(stake.total_payout).toFixed(2)}
                                                                    </span>
                                                                )}
                                                                {stake.status === 'active' && (
                                                                    <span className="text-[10px] text-gray-400 font-bold">
                                                                        {stake.is_matured ? '🔓 Awaiting request' : `🔒 Locked`}
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    {filteredStaking.filter(s => s.status === 'pending_release').length > 0 && (
                                        <div className="p-6 border-t border-amber-100 bg-amber-50 flex items-start gap-3">
                                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                            <p className="text-sm text-amber-800 font-bold">
                                                {filteredStaking.filter(s => s.status === 'pending_release').length} stake(s) pending release approval.
                                                Please review and approve/reject each request to maintain user trust.
                                            </p>
                                        </div>
                                    )}
                                </GlassCard>
                            </motion.div>
                        );
                    })()}
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
                    {activeTab === 'fiat' && (
                        <motion.div key="fiat" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            <GlassCard className="p-0">
                                <div className="p-10 border-b border-black/5 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Fiat Buy & Sell Ledger</h3>
                                        <div className="flex items-center gap-4 mt-1"><div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-lg" /><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Awaiting Verification</p></div>
                                    </div>
                                    <div className="relative group w-full lg:max-w-md">
                                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-500" />
                                        <input 
                                            type="text" 
                                            placeholder="Search by wallet, name, or asset..." 
                                            value={fiatSearch}
                                            onChange={(e) => setFiatSearch(e.target.value)}
                                            className="w-full pl-14 pr-6 py-4 bg-gray-50 border border-transparent focus:border-emerald-500/30 focus:bg-white rounded-[1.5rem] text-sm font-bold shadow-inner outline-none transition-all" 
                                        />
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50/50">
                                            <tr>
                                                <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">S.No</th>
                                                <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">User Details</th>
                                                <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Type / Asset</th>
                                                <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">INR Amount</th>
                                                <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Status / Proof</th>
                                                <th className="px-10 py-6 text-right text-[11px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/5">
                                            {fiatTransactions
                                                .filter(t => {
                                                    const q = (fiatSearch || '').toLowerCase();
                                                    return (t.user_wallet || '').toLowerCase().includes(q) || 
                                                           (t.user_name || '').toLowerCase().includes(q) || 
                                                           (t.asset || '').toLowerCase().includes(q);
                                                })
                                                .map((t, i) => (
                                                <tr key={i} className="hover:bg-gray-50/80 transition-all group">
                                                    <td className="px-10 py-8 text-xs font-black text-gray-300">#{i + 1}</td>
                                                    <td className="px-10 py-8">
                                                        <div className="flex flex-col gap-1">
                                                            <p className="font-black text-gray-900 text-sm whitespace-nowrap">{t.user_name}</p>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-mono text-[10px] text-gray-400 font-bold">{t.user_wallet.slice(0,6)}...{t.user_wallet.slice(-4)}</p>
                                                            </div>
                                                            <p className="text-[9px] text-gray-400 font-bold">{t.phone_number} | {t.email}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-8 text-xs font-black text-gray-800">
                                                        <span className={`px-2 py-1 rounded-lg text-[10px] mr-2 ${t.type === 'BUY' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{t.type}</span>
                                                        {t.amount} {t.asset}
                                                    </td>
                                                    <td className="px-10 py-8">
                                                        <p className="font-black text-gray-900">₹{t.inr_amount?.toLocaleString()}</p>
                                                        <p className="text-[9px] text-gray-400 font-bold">{new Date(t.timestamp).toLocaleString()}</p>
                                                    </td>
                                                    <td className="px-10 py-8">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`text-[10px] font-black px-3 py-1.5 rounded-full border shadow-sm ${
                                                                t.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                t.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                                'bg-amber-50 text-amber-600 border-amber-100 animate-pulse'
                                                            }`}>
                                                                {t.status}
                                                            </span>
                                                            {t.proof_url && (
                                                                <a href={`${API_URL.replace('/api', '')}${t.proof_url}`} target="_blank" className="p-2 bg-gray-50 hover:bg-emerald-50 text-gray-400 hover:text-emerald-500 rounded-xl transition-all border border-transparent hover:border-emerald-100">
                                                                    <ImageIcon className="w-4 h-4" />
                                                                </a>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-8 text-right">
                                                        {t.status === 'PENDING' && (
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button onClick={() => handleUpdateFiatStatus(t.id, 'VERIFIED')} className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg hover:scale-105 transition-all"><Check className="w-4 h-4" /></button>
                                                                <button onClick={() => handleUpdateFiatStatus(t.id, 'REJECTED')} className="p-3 bg-rose-500 text-white rounded-xl shadow-lg hover:scale-105 transition-all"><X className="w-4 h-4" /></button>
                                                            </div>
                                                        )}
                                                        {t.bank_details && (
                                                            <button 
                                                                onClick={() => alert(`Details: ${t.bank_details}`)}
                                                                className="mt-2 text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-rose-500 transition-colors"
                                                            >
                                                                View Details
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}
                    {/* ── EXCEL STYLE REVENUE TABLE ───────────────────────────── */}
                    {activeTab === 'revenue_table' && (
                        <motion.div key="revenue-table" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-3xl font-black text-gray-900 tracking-tighter">FINANCIAL REVENUE LEDGER</h3>
                                <button 
                                    onClick={downloadRevenueCSV}
                                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
                                >
                                    <FileText className="w-4 h-4" /> Download Excel (CSV)
                                </button>
                            </div>
                            
                            <GlassCard className="p-0 overflow-hidden border border-gray-200">
                                <div className="overflow-x-auto min-h-[500px]">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-100/80 sticky top-0 z-10 backdrop-blur-md">
                                            <tr>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">#</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200 whitespace-nowrap">Timestamp</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">Category</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">Source Asset</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">Revenue (BNB)</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">TX Proof</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 font-mono text-xs">
                                            {transfers && transfers.length > 0 ? transfers.map((r, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                                                    <td className="px-6 py-4 text-gray-300 font-bold">{transfers.length - idx}</td>
                                                    <td className="px-6 py-4 text-gray-400 whitespace-nowrap">{fullDateTime(r.timestamp)}</td>
                                                    <td className="px-6 py-4 capitalize font-black text-gray-700">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${
                                                                r.transfer_type === 'creation_fee' ? 'bg-purple-500' :
                                                                r.transfer_type === 'trading_fee' ? 'bg-emerald-500' :
                                                                r.transfer_type === 'upgrade_fee' ? 'bg-rose-500' :
                                                                r.transfer_type === 'booster_fee' ? 'bg-amber-500' :
                                                                'bg-blue-500'
                                                            }`} />
                                                            {r.transfer_type?.replace('_', ' ') || 'Protocol Fee'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-500 font-bold">{shortAddr(r.source_contract)}</td>
                                                    <td className="px-6 py-4 font-black text-gray-900 text-sm">+{parseFloat(r.amount_bnb).toFixed(4)} BNB</td>
                                                    <td className="px-6 py-4">
                                                        <a href={`https://bscscan.com/tx/${r.tx_hash}`} target="_blank" className="text-gray-300 hover:text-rose-500 transition-colors"><ExternalLink className="w-4 h-4" /></a>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan="6" className="py-20 text-center text-gray-400">Searching financial records...</td></tr>
                                            )}
                                        </tbody>
                                        <tfoot className="bg-gray-900 text-white font-black">
                                            <tr>
                                                <td colSpan="4" className="px-6 py-6 text-right uppercase tracking-[0.2em] text-[10px]">On-Chain BNB Revenue</td>
                                                <td className="px-6 py-6 text-xl tracking-tighter text-emerald-400">
                                                    {transfers?.reduce((acc, curr) => acc + (parseFloat(curr.amount_bnb) || 0), 0).toFixed(4)} BNB
                                                </td>
                                                <td className="px-6 py-6"></td>
                                            </tr>
                                            <tr className="border-t border-white/10">
                                                <td colSpan="4" className="px-6 py-6 text-right uppercase tracking-[0.2em] text-[10px]">Off-Chain Fiat Revenue (Settled)</td>
                                                <td className="px-6 py-6 text-xl tracking-tighter text-emerald-400">
                                                    ₹{fiatTransactions?.filter(t => t.status === 'VERIFIED')?.reduce((acc, curr) => acc + (parseFloat(curr.inr_amount) || 0), 0).toLocaleString()} INR
                                                </td>
                                                <td className="px-6 py-6"></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}

                    {/* ── TEAM SETTINGS (ASSISTANTS) ───────────────────────────── */}
                    {activeTab === 'team' && (
                        <motion.div key="team" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-black/5">
                                <div>
                                    <h3 className="text-3xl font-black text-gray-900 tracking-tighter">GOVERNANCE TEAM & RBAC</h3>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Manage up to 10 administrative assistants with granular control</p>
                                </div>
                            <GlassCard className="p-10 mb-10 border-2 border-dashed border-gray-100">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">Deploy New Administrative Node</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Wallet Address</label>
                                        <input 
                                            value={newAssistant.wallet}
                                            onChange={(e) => setNewAssistant({...newAssistant, wallet: e.target.value})}
                                            placeholder="0x..." 
                                            className="w-full bg-white border border-gray-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:border-amber-500/50" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Identity/Name</label>
                                        <input 
                                            value={newAssistant.name}
                                            onChange={(e) => setNewAssistant({...newAssistant, name: e.target.value})}
                                            placeholder="e.g. Lead Moderator" 
                                            className="w-full bg-white border border-gray-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:border-amber-500/50" 
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <button 
                                            onClick={async () => {
                                                if(!newAssistant.wallet || !newAssistant.name) return alert('Enter details');
                                                await axios.post(`${API_URL}/admin/assistants`, { 
                                                    wallet_address: newAssistant.wallet, 
                                                    name: newAssistant.name,
                                                    permissions_json: '[]' // defaults to none, they can enable below
                                                });
                                                setNewAssistant({ wallet: '', name: '', permissions: [] });
                                                loadData();
                                            }}
                                            className="w-full px-8 py-4 bg-gray-900 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
                                        >
                                            + Confirm Recruitment
                                        </button>
                                    </div>
                                </div>
                            </GlassCard>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {assistants.map((a, i) => (
                                    <GlassCard key={i} className="p-8 group hover:shadow-2xl transition-all border border-gray-100">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-rose-500 group-hover:text-white transition-all">
                                                    <Users className="w-8 h-8" />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-gray-900 text-lg uppercase">{a.name}</h4>
                                                    <p className="text-[10px] font-mono text-gray-400 font-bold">{a.wallet_address}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg uppercase tracking-widest">Active</span>
                                                <button className="text-gray-300 hover:text-red-500 transition-colors" onClick={() => {
                                                    if(confirm('Revoke access for this teammate?')) axios.delete(`${API_URL}/admin/assistants/${a.id}`).then(() => loadData());
                                                }}><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>

                                        <div className="mt-8 pt-8 border-t border-black/5">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Last 5 Activities</p>
                                            <div className="space-y-2">
                                                {/* Note: In a real app we'd fetch this per assistant, but here we can show from a local sub-state if available or use a placeholder */}
                                                <p className="text-[10px] font-bold text-gray-500 bg-gray-50 p-2 rounded-lg border border-black/5">
                                                    {a.last_activity || 'No recent activity recorded in this session.'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-8 pt-8 border-t border-black/5">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Functional Permissions</p>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    { id: 'manage_tokens',  label: 'Tokens & Launch' },
                                                    { id: 'manage_fiat',    label: 'Fiat Gateways' },
                                                    { id: 'manage_staking', label: 'Staking' },
                                                    { id: 'manage_social',  label: 'Bulletin & Community' },
                                                    { id: 'manage_wallets', label: 'User Ledger' },
                                                    { id: 'view_revenue',   label: 'Financials' },
                                                ].map(p => {
                                                    const perms = JSON.parse(a.permissions_json || '[]');
                                                    const has = perms.includes(p.id);
                                                    return (
                                                        <button key={p.id} 
                                                            onClick={async () => {
                                                                const newPerms = has ? perms.filter(item => item !== p.id) : [...perms, p.id];
                                                                await axios.post(`${API_URL}/admin/assistants`, { 
                                                                    assistant_id: a.id, 
                                                                    wallet_address: a.wallet_address, 
                                                                    name: a.name, 
                                                                    permissions_json: JSON.stringify(newPerms) 
                                                                });
                                                                loadData();
                                                            }}
                                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${
                                                            has ? 'bg-gray-900 text-white shadow-lg' : 'bg-gray-100 text-gray-400 border border-gray-200 hover:border-gray-400'
                                                        }`}>
                                                            {p.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="mt-8 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                                            <span>Last Pulse: {a.last_login ? timeAgo(a.last_login) : 'Never'}</span>
                                            <span className="text-rose-500 italic">RBAC Linked</span>
                                        </div>
                                    </GlassCard>
                                ))}
                                {assistants.length === 0 && (
                                    <div className="col-span-1 lg:col-span-2 text-center py-20 border-2 border-dashed border-gray-200 rounded-[2.5rem]">
                                        <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                        <p className="text-gray-400 font-bold uppercase tracking-widest">No Governance Teammates Found</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                    {activeTab === 'bulletin' && (
                        <motion.div key="bulletin" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-6">
                            <AdminAnnouncements />
                        </motion.div>
                    )}
                    {activeTab === 'community' && (
                        <motion.div key="community" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-6">
                            <AdminCommunity />
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

// ── Admin Components ─────────────────────────────────────────────────────────

function AdminAnnouncements() {
    const [content, setContent] = useState('');
    const [image, setImage] = useState(null);
    const [status, setStatus] = useState('idle');
    const [activeBulletins, setActiveBulletins] = useState([]);
    
    // CG Search states
    const [tokenSearch, setTokenSearch] = useState('');
    const [cgList, setCgList] = useState([]);
    const [selectedToken, setSelectedToken] = useState(null);

    const fetchBulletins = async () => {
        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/community/announcements`);
            setActiveBulletins(res.data);
        } catch (err) {
            console.error('Fetch bulletins failed:', err);
        }
    };

    const handleSearch = async (val) => {
        setTokenSearch(val);
        if (val.length < 2) { setCgList([]); return; }
        try {
            const res = await axios.get('https://api.coingecko.com/api/v3/search', { params: { query: val } });
            setCgList(res.data.coins?.slice(0, 7) || []);
        } catch (err) { console.warn('CG Search Limit'); }
    };

    useEffect(() => {
        fetchBulletins();
        const intervalId = setInterval(fetchBulletins, 15000);
        return () => clearInterval(intervalId);
    }, []);

    const handlePost = async () => {
        if (!content) return alert('Content required');
        setStatus('loading');
        try {
            const formData = new FormData();
            formData.append('content', content);
            if (image) formData.append('image', image);
            
            if (selectedToken) {
                formData.append('token_symbol', selectedToken.symbol);
                formData.append('token_name', selectedToken.name);
                formData.append('token_logo', selectedToken.large || selectedToken.thumb);
            }
            
            await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/community/announcements`, formData);
            alert('Bulletin Broadcast Hosted Successfully!');
            setContent('');
            setImage(null);
            setSelectedToken(null);
            setTokenSearch('');
            fetchBulletins();
        } catch (err) {
            console.error(err);
            alert('Failed to post announcement.');
        } finally {
            setStatus('idle');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Recall this broadcast from all nodes?')) return;
        try {
            await axios.delete(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/community/announcements/${id}`);
            fetchBulletins();
        } catch (err) {
            alert('Recall failed.');
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-12">
                 <GlassCard className="p-10">
                    <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-6">
                         <div className="w-12 h-12 bg-purple-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-purple-500/20">
                             <Megaphone className="w-6 h-6" />
                         </div>
                         <div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Broadcast Bulletin</h3>
                             <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Pin globally to Exchange Hub (24H Timer)</p>
                         </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Bulletin Content</label>
                                <textarea 
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Announce partnerships, AMAs, listings..." 
                                    className="w-full h-40 bg-gray-50 border border-gray-200 rounded-2xl p-6 font-medium text-sm outline-none focus:bg-white focus:border-purple-500/50 transition-all resize-none shadow-sm"
                                />
                            </div>
                            
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Attach Banner (Optional)</label>
                                <div className="relative group">
                                    <div className="w-full h-32 bg-gray-50 border border-dashed border-gray-300 rounded-2xl flex items-center justify-center overflow-hidden transition-all group-hover:border-purple-500/50 cursor-pointer text-gray-400 group-hover:text-purple-500">
                                        {image ? (
                                            <img src={URL.createObjectURL(image)} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
                                                <ImageIcon className="w-6 h-6" />
                                                <span className="text-[10px] uppercase font-bold tracking-widest">Click to Upload JPG/PNG</span>
                                            </div>
                                        )}
                                        <input type="file" onChange={(e) => setImage(e.target.files[0])} accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Spotlight Asset (CoinGecko Search)</label>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input 
                                        type="text" 
                                        value={tokenSearch}
                                        onChange={(e) => handleSearch(e.target.value)}
                                        placeholder="e.g. BTC, ETH, PEPE..."
                                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm outline-none focus:bg-white focus:border-purple-500/50" 
                                    />
                                    
                                    {cgList.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl p-2 flex flex-col gap-1 max-h-[300px] overflow-y-auto">
                                            {cgList.map(c => (
                                                <div key={c.id} onClick={() => { setSelectedToken(c); setCgList([]); setTokenSearch(c.name); }} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-all border border-transparent hover:border-gray-100 group">
                                                    <div className="flex items-center gap-3">
                                                        <img src={c.thumb} className="w-8 h-8 rounded-lg" alt="" />
                                                        <div>
                                                            <p className="text-xs font-black text-gray-900">{c.symbol}</p>
                                                            <p className="text-[10px] font-bold text-gray-400">{c.name}</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] font-black text-gray-300 group-hover:text-purple-500">Pick</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedToken && (
                                <div className="p-6 bg-purple-50 border border-purple-100 rounded-3xl flex items-center justify-between shadow-xl shadow-purple-500/5 animate-in fade-in zoom-in duration-300">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-white p-2 rounded-2xl shadow-inner border border-purple-100">
                                            <img src={selectedToken.large || selectedToken.thumb} className="w-full h-full object-contain" alt="" />
                                        </div>
                                        <div>
                                            <p className="text-xl font-black text-gray-900 tracking-tighter">{selectedToken.symbol}</p>
                                            <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest">{selectedToken.name}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedToken(null)} className="p-2 text-gray-300 hover:text-rose-500 transition-colors"><X className="w-5 h-5" /></button>
                                </div>
                            )}

                            <div className="pt-4">
                                <button onClick={handlePost} disabled={status === 'loading'} className="px-10 py-5 bg-purple-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-purple-500/20 hover:bg-purple-600 transition-all w-full flex items-center justify-center gap-2 disabled:opacity-50 h-[70px]">
                                    {status === 'loading' ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <>Broadcasting Global Bulletin <Rocket className="w-4 h-4 ml-2" /></>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </GlassCard>
            </div>

            <div className="lg:col-span-12">
                <GlassCard className="p-0 border-t-4 border-purple-500/30 overflow-hidden">
                    <div className="p-10 border-b border-black/5 bg-white">
                        <h4 className="text-xl font-black text-gray-900 tracking-tight uppercase">Master Broadcast Ledger</h4>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Found {activeBulletins.length} Active Global Announcements</p>
                    </div>
                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">#</th>
                                    <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Announcement Content</th>
                                    <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Spotlight Asset</th>
                                    <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Engagement</th>
                                    <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Inception</th>
                                    <th className="px-10 py-6 text-right text-[11px] font-black text-gray-400 uppercase tracking-widest pr-10">Control</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                                {activeBulletins.length === 0 ? (
                                    <tr><td colSpan="6" className="px-10 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">No Active Broadcasts</td></tr>
                                ) : (
                                    activeBulletins.map((b, i) => (
                                        <tr key={b.id} className="hover:bg-gray-50/80 transition-all group">
                                            <td className="px-10 py-8 text-xs font-black text-gray-300">#{i + 1}</td>
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-4">
                                                    {b.image_url && <img src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${b.image_url}`} className="w-12 h-12 rounded-xl object-cover shadow-sm" />}
                                                    <p className="text-xs font-bold text-gray-900 line-clamp-2 max-w-sm">{b.content}</p>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                {b.token_symbol ? (
                                                    <div className="flex items-center gap-3">
                                                        <img src={b.token_logo} className="w-8 h-8 rounded-lg shadow-sm" />
                                                        <div>
                                                            <p className="text-[10px] font-black text-gray-900">{b.token_symbol}</p>
                                                            <p className="text-[9px] font-bold text-gray-400">{b.token_name}</p>
                                                        </div>
                                                    </div>
                                                ) : <span className="text-[10px] text-gray-300 font-bold">NONE</span>}
                                            </td>
                                            <td className="px-10 py-8">
                                                <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest bg-purple-100 px-3 py-1 rounded-full">{b.likes} LIKES</span>
                                            </td>
                                            <td className="px-10 py-8 text-xs font-black text-gray-400 uppercase">{timeAgo(b.created_at)}</td>
                                            <td className="px-10 py-8 text-right pr-10">
                                                <button onClick={() => handleDelete(b.id)} className="p-3 bg-red-50 text-red-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all shadow-sm">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}

function AdminCommunity() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchPosts = () => {
        setLoading(true);
        axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/community/posts`)
            .then(res => setPosts(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchPosts();
        const intervalId = setInterval(() => {
            fetchPosts();
        }, 15000);
        return () => clearInterval(intervalId);
    }, []);

    const handleDelete = async (id) => {
        if (!confirm('Eradicate post from all nodes?')) return;
        try {
            await axios.delete(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/community/posts/${id}`);
            fetchPosts();
        } catch (err) {
            alert('Failed to delete');
        }
    };

    const handleBlock = async (wallet) => {
        if (!confirm('Revoke community transmission protocol for this wallet?')) return;
        try {
            await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/community/block`, { wallet_address: wallet });
            alert('Wallet transmission blocked globally.');
            fetchPosts();
        } catch (err) {
            alert('Failed to block.');
        }
    };

    return (
        <GlassCard className="p-0">
            <div className="p-10 border-b border-black/5 flex items-center gap-4">
                 <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                     <ShieldBan className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Community Moderation</h3>
                     <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Global Post Control & Bans</p>
                 </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">S.No</th>
                            <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Author Identity</th>
                            <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Content Transmission</th>
                            <th className="px-10 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Timestamp</th>
                            <th className="px-10 py-6 text-right text-[11px] font-black text-gray-400 uppercase tracking-widest pr-10">Protocol Override</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                        {loading ? (
                            <tr><td colSpan="5" className="px-10 py-20 text-center text-gray-400 font-bold animate-pulse">Scanning Transmission Nodes...</td></tr>
                        ) : posts.length === 0 ? (
                            <tr><td colSpan="5" className="px-10 py-20 text-center text-gray-400 font-bold">Zero Global Transmissions Found.</td></tr>
                        ) : (
                            posts.map((p, i) => (
                                <tr key={p.id} className="hover:bg-gray-50/80 transition-all group">
                                    <td className="px-10 py-8 text-xs font-black text-gray-300">#{i + 1}</td>
                                    <td className="px-10 py-8">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-xs text-blue-600 bg-blue-100 px-3 py-1 rounded-full">{p.wallet_address.slice(0,6)}...{p.wallet_address.slice(-4)}</span>
                                            <CopyButton text={p.wallet_address} />
                                        </div>
                                    </td>
                                    <td className="px-10 py-8">
                                        <p className="text-xs font-bold text-gray-800 line-clamp-3 max-w-lg">{p.content}</p>
                                    </td>
                                    <td className="px-10 py-8">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{new Date(p.created_at).toLocaleString()}</span>
                                    </td>
                                    <td className="px-10 py-8 text-right pr-10">
                                        <div className="flex items-center justify-end gap-2 text-[10px]">
                                            <button onClick={() => handleDelete(p.id)} className="p-2.5 bg-red-50 text-red-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all shadow-sm">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleBlock(p.wallet_address)} className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-lg font-black uppercase tracking-widest transition-all">
                                                BAN
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </GlassCard>
    );
}
