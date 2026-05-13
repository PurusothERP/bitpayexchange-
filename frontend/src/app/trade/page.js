'use client';
import { API_URL } from '@/lib/api';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import {
    ChevronDown, TrendingUp, TrendingDown, Clock, Activity, AlertTriangle, CheckCircle2,
    RefreshCw, Search, ArrowUpRight, ArrowDownRight, ExternalLink, Zap,
    Wallet, TrendingUp as Up, TrendingDown as Down, BarChart3, History, Layers, Info,
    ArrowLeftRight, ArrowRightLeft, Upload, ArrowRightLeft as Swap, Shield, Globe
} from 'lucide-react';
import { ethers, Contract } from 'ethers';
import { BONDING_CURVE_ABI, TOKEN_TEMPLATE_ABI } from '@/lib/abis';

const BONDING_CURVE_ADDRESS = process.env.NEXT_PUBLIC_BONDING_CURVE_ADDRESS;

const BSC_RPC = 'https://bsc-dataseed.binance.org';

const PANCAKE_ROUTER_ADDR = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
const WBNB_ADDR = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const PANCAKE_ROUTER_ABI = [
    'function swapExactETHForTokensSupportingFeeOnTransferTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable',
    'function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external',
    'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
];

function formatNumber(num, dec = 4) { return Number(num).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
function formatPrice(num) {
    if (num === null || num === undefined) return '0.00000000';
    const n = Number(num);
    if (n === 0) return '0.00000000';
    if (n < 0.0001) return n.toFixed(10);
    if (n < 0.01) return n.toFixed(8);
    return n.toFixed(6);
}
function timeAgo(dateStr) {
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
}

// Ultra-Modern Glass Tooltip
function NeonPriceTooltip({ active, payload }) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-2xl shadow-teal-200/20 text-xs font-bold uppercase tracking-widest text-white">
                <p className="text-gray-400 mb-2 font-mono">{payload[0].payload.time}</p>
                <p className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                    <span className="text-teal-500">Price:</span>
                    <span className="font-mono text-lg">{formatPrice(payload[0].value)}</span>
                    <span className="text-gray-500">BNB</span>
                </p>
            </div>
        );
    }
    return null;
}

export default function TradePage() {
    const { account, connectWallet, isConnecting, signer } = useWallet();

    const [allTokens, setAllTokens] = useState([]);
    const [selectedToken, setSelectedToken] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [chartData, setChartData] = useState([]);
    const [trades, setTrades] = useState([]);
    const [market, setMarket] = useState(null);

    const [userBnb, setUserBnb] = useState(0);
    const [userTokens, setUserTokens] = useState(0);

    const [orderSide, setOrderSide] = useState('buy');
    const [orderAmount, setOrderAmount] = useState('');
    const [orderStatus, setOrderStatus] = useState('idle');
    const [orderError, setOrderError] = useState('');

    const [activeBottomTab, setActiveBottomTab] = useState('history');

    // Live Heart-beat Simulation for empty charts
    const liveChartData = useMemo(() => {
        if (chartData && chartData.length > 5) return chartData;
        const basePrice = Number(selectedToken?.price_bnb) || 0.00000001;
        const dummyPoints = [];
        const now = Date.now();
        for (let i = 0; i < 30; i++) {
            const jitter = 1 + (Math.random() * 0.006 - 0.003);
            dummyPoints.push({
                time: now - (30 - i) * 5000,
                price: basePrice * jitter
            });
        }
        return dummyPoints;
    }, [chartData, selectedToken]);

    useEffect(() => {
        axios.get(`${API_URL}/tokens`)
            .then(r => {
                if (Array.isArray(r.data) && r.data.length > 0) {
                    setAllTokens(r.data);
                    setSelectedToken(r.data[0]);
                }
            })
            .catch(console.error);
    }, []);

    const fetchBalances = useCallback(async () => {
        if (!account || !selectedToken) return;
        try {
            const rpcProvider = new ethers.JsonRpcProvider(BSC_RPC);
            const bnbVal = await rpcProvider.getBalance(account);
            setUserBnb(ethers.formatEther(bnbVal));

            const tokenContract = new ethers.Contract(selectedToken.contract_address, TOKEN_TEMPLATE_ABI, rpcProvider);
            const tokenVal = await tokenContract.balanceOf(account);
            setUserTokens(ethers.formatUnits(tokenVal, 18));
        } catch (e) { console.warn('Balance check failed:', e); }
    }, [account, selectedToken]);

    const fetchTokenData = useCallback(async () => {
        if (!selectedToken) return;
        try {
            const [cRes, hRes, mRes] = await Promise.all([
                axios.get(`${API_URL}/trades/chart/${selectedToken.contract_address}`),
                axios.get(`${API_URL}/trades/history/${selectedToken.contract_address}`),
                axios.get(`${API_URL}/trades/market/${selectedToken.contract_address}`)
            ]);
            setChartData(cRes.data || []);
            setTrades(hRes.data || []);
            setMarket(mRes.data || null);
        } catch (e) { console.error('Token data fetch error:', e); }
    }, [selectedToken]);

    useEffect(() => {
        if (selectedToken) {
            fetchTokenData();
            fetchBalances();
            const itv = setInterval(() => { fetchTokenData(); fetchBalances(); }, 10000);
            return () => clearInterval(itv);
        }
    }, [selectedToken, fetchTokenData, fetchBalances]);

    const handleExecuteOrder = async () => {
        if (!account) { connectWallet(); return; }
        if (!orderAmount || parseFloat(orderAmount) <= 0) { setOrderError('Invalid amount'); return; }

        setOrderStatus('loading');
        setOrderError('');

        try {
            const activeSigner = signer;
            if (!activeSigner) throw new Error("Wallet not fully initialized. Please try again.");

            const FEE_WALLET = '0x279A5618Ff049667234c030792C0594B311A0451';
            const PROTOCOL_FEE_BPS = 10; // 0.1%

            const amountIn = ethers.parseEther(orderAmount);
            const feeAmount = (amountIn * BigInt(PROTOCOL_FEE_BPS)) / BigInt(10000);
            const tradeAmount = amountIn - feeAmount;

            if (selectedToken.launch_type === 'MEME') {
                const curveContract = new ethers.Contract(BONDING_CURVE_ADDRESS, BONDING_CURVE_ABI, activeSigner);
                if (orderSide === 'buy') {
                    // Send Fee first
                    const feeTx = await activeSigner.sendTransaction({ to: FEE_WALLET, value: feeAmount });
                    await feeTx.wait();
                    // Then Trade
                    const tx = await curveContract.buy(selectedToken.contract_address, { value: tradeAmount, gasLimit: 500000 });
                    await tx.wait();
                } else {
                    const tokenContract = new ethers.Contract(selectedToken.contract_address, TOKEN_TEMPLATE_ABI, activeSigner);
                    const allowance = await tokenContract.allowance(account, BONDING_CURVE_ADDRESS);
                    if (allowance < amountIn) {
                        setOrderError('Approving Protocol Allowance...');
                        const atx = await tokenContract.approve(BONDING_CURVE_ADDRESS, ethers.MaxUint256);
                        await atx.wait();
                    }
                    // Transfer Fee first
                    const feeTx = await tokenContract.transfer(FEE_WALLET, feeAmount);
                    await feeTx.wait();
                    // Then Trade
                    const tx = await curveContract.sell(selectedToken.contract_address, tradeAmount, { gasLimit: 500000 });
                    await tx.wait();
                }
            } else {
                const router = new ethers.Contract(PANCAKE_ROUTER_ADDR, PANCAKE_ROUTER_ABI, activeSigner);
                const path = orderSide === 'buy' ? [WBNB_ADDR, selectedToken.contract_address] : [selectedToken.contract_address, WBNB_ADDR];
                const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

                if (orderSide === 'buy') {
                    const feeTx = await activeSigner.sendTransaction({ to: FEE_WALLET, value: feeAmount });
                    await feeTx.wait();
                    const tx = await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
                        0, path, account, deadline, { value: tradeAmount, gasLimit: 500000 }
                    );
                    await tx.wait();
                } else {
                    const tokenContract = new ethers.Contract(selectedToken.contract_address, TOKEN_TEMPLATE_ABI, activeSigner);
                    const allowance = await tokenContract.allowance(account, PANCAKE_ROUTER_ADDR);
                    if (allowance < amountIn) {
                        const atx = await tokenContract.approve(PANCAKE_ROUTER_ADDR, ethers.MaxUint256);
                        await atx.wait();
                    }
                    const feeTx = await tokenContract.transfer(FEE_WALLET, feeAmount);
                    await feeTx.wait();
                    const tx = await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
                        tradeAmount, 0, path, account, deadline, { gasLimit: 500000 }
                    );
                    await tx.wait();
                }
            }
            setOrderStatus('success');
            setOrderAmount('');
            fetchTokenData();
            fetchBalances();
            setTimeout(() => setOrderStatus('idle'), 3000);
        } catch (e) {
            setOrderError(e.reason || e.message || 'Transaction Failed');
            setOrderStatus('idle');
        }
    };

    const priceChange = selectedToken?.price_change || 0;
    const isPositive = priceChange >= 0;
    const filteredTokens = allTokens.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.symbol.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <main className="min-h-screen bg-[#050511] text-white selection:bg-teal-500 selection:text-white pb-32 cyber-grid font-sans">
            <Navbar />

            <div className="pt-28 px-4 md:px-6 max-w-[1800px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6 relative z-10">
                {/* ── LEFT AMBIENT LIGHT ── */}
                <div className="fixed top-20 left-0 w-[800px] h-[800px] bg-teal-600/10 rounded-full blur-[150px] pointer-events-none -z-10" />
                <div className="fixed bottom-0 right-0 w-[800px] h-[800px] bg-sky-600/10 rounded-full blur-[150px] pointer-events-none -z-10" />

                {/* ── LEFT: MARKET BROWSER ─────────────────────────────────────────── */}
                <div className="xl:col-span-3 space-y-4 h-auto xl:h-[calc(100vh-140px)] flex flex-col order-3 xl:order-1 relative z-20">
                    <div className="p-5 bg-black/40 backdrop-blur-xl border border-white/5 rounded-[2rem] shadow-2xl flex flex-col flex-1 overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                        <div className="flex items-center justify-between mb-6 px-1">
                            <h2 className="text-sm font-black text-white tracking-widest uppercase flex items-center gap-2">
                                <Globe className="w-4 h-4 text-teal-600" /> Nexus Markets
                            </h2>
                        </div>

                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                            <input
                                type="text" placeholder="Search tokens..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-[11px] font-bold text-white placeholder:text-white/30 outline-none focus:border-teal-500/50 transition-all shadow-inner"
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-dark-scroll">
                            {filteredTokens.map(t => {
                                const tPos = (t.price_change || 0) >= 0;
                                return (
                                    <button key={t.id} onClick={() => setSelectedToken(t)}
                                        className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between group relative overflow-hidden
                                        ${selectedToken?.id === t.id ? 'bg-white/10 border-white/20 shadow-lg glow-active scale-[1.02]' : 'bg-transparent border-transparent hover:border-white/10 hover:bg-white/5 text-white/50'}
                                    `}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black border ${selectedToken?.id === t.id ? 'border-white/20' : 'border-white/5'}`}>
                                                {t.logo_url ? <img src={t.logo_url} className="w-full h-full object-cover rounded-xl" /> : '🪙'}
                                            </div>
                                            <div className="text-left">
                                                <p className={`text-xs font-black ${selectedToken?.id === t.id ? 'text-white' : 'text-white/80'}`}>{t.symbol}</p>
                                                <p className="text-[10px] font-bold text-white/40">{t.name}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-xs font-mono font-bold ${selectedToken?.id === t.id ? 'text-white' : 'text-white/80'}`}>{formatPrice(t.price_bnb)}</p>
                                            <p className={`text-[10px] font-black flex items-center justify-end gap-1 mt-0.5 ${tPos ? 'text-sky-400' : 'text-teal-500'}`}>
                                                {tPos ? <Up className="w-3 h-3" /> : <Down className="w-3 h-3" />}
                                                {Math.abs(t.price_change || 0).toFixed(2)}%
                                            </p>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* ── CENTER: WORKSTATION ────────────────────────────────────────────── */}
                <div className="xl:col-span-6 space-y-5 h-auto xl:h-[calc(100vh-140px)] flex flex-col order-1 xl:order-2">

                    {/* Header Panel */}
                    <div className="p-6 bg-black/40 backdrop-blur-xl border border-white/5 rounded-[2rem] shadow-2xl flex items-center justify-between relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-transparent via-teal-600/50 to-transparent" />
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-[1.25rem] border border-white/10 bg-white/5 p-1 relative shadow-inner">
                                <img src={selectedToken?.logo_url || '/logo.png'} className="w-full h-full object-cover rounded-xl" />
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-sky-500 rounded-full border-2 border-[#050511] animate-pulse" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-white tracking-widest flex items-center gap-4">
                                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">{selectedToken?.symbol}</span>
                                    <span className="text-white/20 font-light">/</span>
                                    <span className="text-teal-500 font-mono text-xl">BNB</span>
                                </h1>
                                <a href={'https://bscscan.com/token/' + (selectedToken?.contract_address || '')} target="_blank" className="flex items-center gap-2 mt-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors">
                                    {selectedToken?.name} <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </div>

                        <div className="flex gap-8 text-right pr-4">
                            <div>
                                <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1.5 flex items-center gap-1 justify-end"><Activity className="w-3 h-3 text-teal-600" /> Price</p>
                                <p className="text-lg font-mono font-bold text-white">{formatPrice(selectedToken?.price_bnb)}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1.5 flex items-center gap-1 justify-end"><History className="w-3 h-3 text-white/50" /> 24h Change</p>
                                <p className={`text-lg font-black flex items-center justify-end gap-1 ${isPositive ? 'text-sky-400' : 'text-teal-500'}`}>
                                    {isPositive ? '+' : ''}{priceChange}%
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Chart Panel */}
                    <div className="p-2 bg-black/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] shadow-2xl flex-1 flex flex-col relative min-h-[450px]">
                        <div className="absolute top-6 left-8 z-20 flex gap-4 text-[10px] font-black uppercase tracking-widest text-white/30">
                            <div className="px-3 py-1.5 border border-white/10 rounded-lg bg-white/5 text-white/70 shadow-inner flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-ping" /> Live Sync
                            </div>
                            <div className="px-3 py-1.5">Depth Curve</div>
                        </div>

                        <div className="flex-1 w-full mt-10 p-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={liveChartData}>
                                    <defs>
                                        <linearGradient id="cyberGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.4} />
                                            <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff" strokeOpacity={0.03} />
                                    <XAxis dataKey="time" hide />
                                    <YAxis domain={['auto', 'auto']} vertical={false} orientation="right" tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} dx={10} />
                                    <RechartsTooltip content={<NeonPriceTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                                    <Area type="monotone" dataKey="price" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#cyberGradient)" animationDuration={1500} isAnimationActive={true} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Bottom Orderbook Tabs */}
                    <div className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-[2rem] shadow-2xl flex flex-col h-[280px] overflow-hidden">
                        <div className="flex border-b border-white/5 bg-white/5">
                            {['history', 'positions', 'info'].map(t => (
                                <button key={t} onClick={() => setActiveBottomTab(t)}
                                    className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative
                                        ${activeBottomTab === t ? 'text-white bg-white/5' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}
                                    `}>
                                    {activeBottomTab === t && <div className="absolute top-0 left-0 right-0 h-[2px] bg-teal-500 shadow-[0_0_10px_#f43f5e]" />}
                                    {t}
                                </button>
                            ))}
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 custom-dark-scroll">
                            {activeBottomTab === 'history' && (
                                <div className="space-y-1">
                                    <table className="w-full text-[10px] font-black uppercase tracking-widest text-white/40">
                                        <thead><tr className="border-b border-white/5 text-left"><th className="py-3 px-6">Side</th><th className="py-3">Executed</th><th className="py-3 text-right pr-6">Time</th></tr></thead>
                                        <tbody className="divide-y divide-white/5">
                                            {trades.length === 0 ? (
                                                <tr><td colSpan="3" className="py-10 text-center text-white/20 uppercase tracking-widest">No terminal data broadcasted</td></tr>
                                            ) : trades.map((t, i) => (
                                                <tr key={i} className="hover:bg-white/5 transition-colors group">
                                                    <td className={`py-4 px-6 flex items-center gap-2 ${t.type === 'buy' ? 'text-sky-400' : 'text-teal-500'}`}>
                                                        {t.type === 'buy' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />} {t.type}
                                                    </td>
                                                    <td className="text-white group-hover:text-white transition-colors">{formatNumber(t.amount, 2)} {selectedToken?.symbol}</td>
                                                    <td className="text-right pr-6 font-mono text-white/40">{timeAgo(t.created_at || new Date())}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {activeBottomTab === 'info' && (
                                <div className="p-8 text-xs font-medium text-white/50 leading-relaxed font-mono">
                                    <Shield className="w-5 h-5 text-sky-500 mb-4" />
                                    <span className="text-white block mb-2 text-sm font-sans font-black tracking-widest uppercase">Verified Contract</span>
                                    {selectedToken?.description || 'No advanced description provided for this specific protocol interface.'}
                                    <div className="mt-4 p-4 bg-white/5 border border-white/5 rounded-xl break-all select-all hover:border-teal-500/30 transition-colors">
                                        {selectedToken?.contract_address}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── RIGHT: EXECUTION TERMINAL ────────────────────────────────────────── */}
                <div className="xl:col-span-3 h-auto xl:h-[calc(100vh-140px)] flex flex-col gap-6 order-2 xl:order-3">
                    <div className="bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-2xl p-6 flex flex-col flex-1 overflow-hidden relative">
                        {/* Ambient glow */}
                        <div className={`absolute top-0 right-0 w-[300px] h-[300px] rounded-full blur-[100px] pointer-events-none transition-colors duration-1000 ${orderSide === 'buy' ? 'bg-sky-500/10' : 'bg-teal-500/10'}`} />

                        <div className="flex justify-between items-center mb-10 mt-2 px-2">
                            <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
                                <Swap className="w-4 h-4 text-white/50" /> Operations
                            </h2>
                            <div className="text-[9px] px-3 py-1 bg-white/5 rounded-lg border border-white/10 text-white/40 font-black uppercase tracking-widest">
                                Slippage: 0.5%
                            </div>
                        </div>

                        {/* Buy / Sell Selector */}
                        <div className="bg-white/5 p-1.5 rounded-2xl flex mb-10 shadow-inner relative z-10">
                            <button onClick={() => setOrderSide('buy')} className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${orderSide === 'buy' ? 'bg-sky-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'text-white/40 hover:text-white/80'}`}>Protocol Buy</button>
                            <button onClick={() => setOrderSide('sell')} className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${orderSide === 'sell' ? 'bg-teal-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)]' : 'text-white/40 hover:text-white/80'}`}>Protocol Sell</button>
                        </div>

                        <div className="space-y-8 flex-1 relative z-10">
                            {/* Input Box */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center px-2">
                                    <label className="text-[10px] font-black text-white/50 uppercase tracking-widest">Execution Quantity</label>
                                    <span className="text-[10px] font-black text-teal-600 cursor-pointer hover:text-teal-500 flex items-center gap-1 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20"
                                        onClick={() => setOrderAmount(orderSide === 'buy' ? userBnb : userTokens)}>
                                        <Wallet className="w-3 h-3" /> MAX
                                    </span>
                                </div>
                                <div className="relative group">
                                    <input
                                        type="number" value={orderAmount} onChange={(e) => setOrderAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full bg-black/50 border border-white/10 rounded-2xl p-6 font-mono font-bold text-3xl outline-none focus:bg-white/5 focus:border-white/30 transition-all text-white placeholder:text-white/10 shadow-inner text-right pr-20"
                                    />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-black text-white/30 uppercase tracking-widest group-focus-within:text-white transition-colors">{orderSide === 'buy' ? 'BNB' : selectedToken?.symbol}</span>
                                </div>
                            </div>

                            {/* Balances */}
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-white/40">Available BNB</span>
                                    <span className="text-white font-mono bg-black/50 px-2 py-1 rounded border border-white/5">{formatNumber(userBnb, 4)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-white/40">Available {selectedToken?.symbol}</span>
                                    <span className="text-white font-mono bg-black/50 px-2 py-1 rounded border border-white/5">{formatNumber(userTokens, 2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 relative z-10">
                            <AnimatePresence>
                                {orderError && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                        className="mb-6 p-4 bg-teal-500/10 border border-teal-500/30 rounded-xl flex items-start gap-3 backdrop-blur-xl">
                                        <AlertTriangle className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                                        <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wide leading-relaxed">{orderError}</p>
                                    </motion.div>
                                )}
                                {orderStatus === 'success' && (
                                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                        className="mb-6 p-4 bg-sky-500/10 border border-sky-500/30 rounded-xl flex items-center gap-3 backdrop-blur-xl">
                                        <CheckCircle2 className="w-5 h-5 text-sky-400" />
                                        <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Execution Confirmed</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <button
                                onClick={handleExecuteOrder} disabled={orderStatus === 'loading'}
                                className={`w-full py-6 rounded-2xl font-black text-xl tracking-widest uppercase shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-4 relative overflow-hidden group
                                    ${orderSide === 'buy' ? 'bg-sky-500 hover:bg-sky-400 text-black' : 'bg-teal-500 hover:bg-teal-400 text-white'}
                                    ${orderStatus === 'loading' ? 'opacity-40 animate-pulse pointer-events-none' : ''}
                                 `}>
                                <div className="absolute inset-0 bg-white/20 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                                {orderStatus === 'loading' ? <RefreshCw className="w-6 h-6 animate-spin" /> : (orderSide === 'buy' ? <Up className="w-6 h-6" /> : <Down className="w-6 h-6" />)}
                                {orderStatus === 'loading' ? 'Transmitting' : `Execute ${orderSide}`}
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            <style jsx global>{`
                .cyber-grid {
                    background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                                    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
                    background-size: 40px 40px;
                }
                .glow-active {
                    box-shadow: 0 0 20px rgba(255, 255, 255, 0.1), inset 0 0 20px rgba(255, 255, 255, 0.05);
                }
                .custom-dark-scroll::-webkit-scrollbar { width: 4px; }
                .custom-dark-scroll::-webkit-scrollbar-track { background: transparent; }
                .custom-dark-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                .custom-dark-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
            `}</style>
        </main>
    );
}