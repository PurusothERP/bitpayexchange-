'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '@/components/Navbar';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    ChevronDown, TrendingUp, TrendingDown, Clock, Activity, AlertTriangle, CheckCircle2,
    RefreshCw, Search, ArrowUpRight, ArrowDownRight, ExternalLink, Zap,
    Wallet, TrendingUp as Up, TrendingDown as Down, BarChart3, History, Layers, Info,
    ArrowLeftRight, ArrowRightLeft
} from 'lucide-react';
import { ethers, Contract } from 'ethers';
import { BONDING_CURVE_ABI, TOKEN_TEMPLATE_ABI } from '@/lib/abis';

const BONDING_CURVE_ADDRESS  = process.env.NEXT_PUBLIC_BONDING_CURVE_ADDRESS;
const API_URL                = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const BSC_RPC                = 'https://bsc-dataseed.binance.org';

const PANCAKE_ROUTER_ADDR = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
const WBNB_ADDR           = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const PANCAKE_ROUTER_ABI = [
    'function swapExactETHForTokensSupportingFeeOnTransferTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable',
    'function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external',
    'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
];

function formatNumber(num, dec = 4) { return Number(num).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
function formatPrice(num) {
    if (num === null || num === undefined) return '0.0000';
    const n = Number(num);
    if (n === 0) return '0.0000';
    if (n < 0.000001) return n.toExponential(4);
    if (n < 0.01) return n.toFixed(8);
    return n.toFixed(6);
}
function timeAgo(dateStr) {
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
}

// Custom Light Chart Tooltip
function LightPriceTooltip({ active, payload }) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-gray-100 p-3 rounded-2xl shadow-2xl text-[10px] font-black uppercase tracking-widest">
                <p className="text-gray-400 mb-1">{payload[0].payload.time}</p>
                <p className="font-mono text-gray-900 flex items-center gap-2">
                    <span className="text-rose-500">Price:</span>
                    {formatPrice(payload[0].value)} <span className="text-gray-400">BNB</span>
                </p>
            </div>
        );
    }
    return null;
}

export default function TradePage() {
    const { account, connectWallet, isConnecting, signer } = useWallet();

    const [allTokens,     setAllTokens]     = useState([]);
    const [selectedToken, setSelectedToken] = useState(null);
    const [isDropdownOpen,setIsDropdownOpen]= useState(false);
    const [searchQuery,   setSearchQuery]   = useState('');

    const [chartData,     setChartData]     = useState([]);
    const [trades,        setTrades]        = useState([]);
    const [tradeStats,    setTradeStats]    = useState(null);
    const [market,        setMarket]        = useState(null);
    const prevPriceRef = useRef(null);

    const [userBnb,       setUserBnb]       = useState(0);
    const [userTokens,    setUserTokens]    = useState(0);

    const [orderSide,     setOrderSide]     = useState('buy'); // 'buy' | 'sell'
    const [orderAmount,   setOrderAmount]   = useState('');
    const [orderStatus,   setOrderStatus]   = useState('idle');
    const [orderError,    setOrderError]    = useState('');

    const [activeBottomTab, setActiveBottomTab] = useState('positions');

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
            const itv = setInterval(() => { fetchTokenData(); fetchBalances(); }, 15000);
            return () => clearInterval(itv);
        }
    }, [selectedToken, fetchTokenData, fetchBalances]);

    // Implementation for Execute Order...
    const handleExecuteOrder = async () => {
        if (!account) { connectWallet(); return; }
        if (!orderAmount || parseFloat(orderAmount) <= 0) { setOrderError('Invalid amount'); return; }
        
        setOrderStatus('loading');
        setOrderError('');

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const activeSigner = await provider.getSigner();

            if (selectedToken.launch_type === 'MEME') {
                const curveContract = new ethers.Contract(BONDING_CURVE_ADDRESS, BONDING_CURVE_ABI, activeSigner);
                if (orderSide === 'buy') {
                    const tx = await curveContract.buy(selectedToken.contract_address, { value: ethers.parseEther(orderAmount), gasLimit: 500000 });
                    await tx.wait();
                } else {
                    const tokenContract = new ethers.Contract(selectedToken.contract_address, TOKEN_TEMPLATE_ABI, activeSigner);
                    const allowance = await tokenContract.allowance(account, BONDING_CURVE_ADDRESS);
                    const amountWei = ethers.parseEther(orderAmount);
                    if (allowance < amountWei) {
                        setOrderError('Approving Protocol Allowance...');
                        const atx = await tokenContract.approve(BONDING_CURVE_ADDRESS, ethers.MaxUint256);
                        await atx.wait();
                    }
                    const tx = await curveContract.sell(selectedToken.contract_address, amountWei, { gasLimit: 500000 });
                    await tx.wait();
                }
            } else {
                // Fair Launch / Pancake Trading
                const router = new ethers.Contract(PANCAKE_ROUTER_ADDR, PANCAKE_ROUTER_ABI, activeSigner);
                const path = orderSide === 'buy' ? [WBNB_ADDR, selectedToken.contract_address] : [selectedToken.contract_address, WBNB_ADDR];
                const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

                if (orderSide === 'buy') {
                    const tx = await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
                        0, path, account, deadline, { value: ethers.parseEther(orderAmount), gasLimit: 500000 }
                    );
                    await tx.wait();
                } else {
                    const tokenContract = new ethers.Contract(selectedToken.contract_address, TOKEN_TEMPLATE_ABI, activeSigner);
                    const amountWei = ethers.parseEther(orderAmount);
                    const allowance = await tokenContract.allowance(account, PANCAKE_ROUTER_ADDR);
                    if (allowance < amountWei) {
                         const atx = await tokenContract.approve(PANCAKE_ROUTER_ADDR, ethers.MaxUint256);
                         await atx.wait();
                    }
                    const tx = await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
                        amountWei, 0, path, account, deadline, { gasLimit: 500000 }
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
    const filteredTokens = allTokens.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.symbol.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <main className="min-h-screen bg-gray-50/70 selection:bg-rose-500 selection:text-white pb-32 p-pattern">
            <Navbar />
            
            <div className="pt-24 px-4 md:px-8 max-w-[1700px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
                
                {/* ── LEFT: TOKEN LIST ─────────────────────────────────────────── */}
                <div className="lg:col-span-3 space-y-4 h-auto lg:h-[calc(100vh-140px)] flex flex-col order-3 lg:order-1">
                    <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-xl flex flex-col flex-1 overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-sm font-black text-gray-900 tracking-widest uppercase flex items-center gap-2">
                                <Zap className="w-4 h-4 text-rose-500" /> Nexus Registry
                            </h2>
                            <RefreshCw className="w-4 h-4 text-gray-300 hover:text-rose-500 cursor-pointer transition-colors" onClick={() => window.location.reload()} />
                        </div>
                        
                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            <input 
                                type="text" placeholder="Protocol Hash..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold text-gray-800 outline-none focus:border-rose-500/30 transition-all"
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {filteredTokens.map(t => (
                                <button key={t.id} onClick={() => setSelectedToken(t)}
                                    className={`w-full p-4 rounded-3xl border transition-all flex items-center justify-between group
                                        ${selectedToken?.id === t.id ? 'bg-rose-500 border-rose-400 text-white shadow-xl shadow-rose-500/20 scale-[1.02]' : 'bg-white border-transparent hover:border-gray-100 hover:bg-gray-50 text-gray-400'}
                                    `}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-2xl ${selectedToken?.id === t.id ? 'bg-white/20' : 'bg-rose-50'} flex items-center justify-center text-sm font-black`}>
                                            {t.logo_url ? <img src={t.logo_url} className="w-full h-full object-cover rounded-2xl" /> : '🪙'}
                                        </div>
                                        <div className="text-left">
                                            <p className={`text-xs font-black ${selectedToken?.id === t.id ? 'text-white' : 'text-gray-900'}`}>{t.symbol}</p>
                                            <p className={`text-[10px] font-bold ${selectedToken?.id === t.id ? 'text-white/60' : 'text-gray-400'}`}>{t.name}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-xs font-black ${selectedToken?.id === t.id ? 'text-white' : 'text-gray-900'}`}>{formatPrice(t.price_bnb)}</p>
                                        <p className={`text-[10px] font-bold flex items-center justify-end gap-0.5 ${t.price_change < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                            {t.price_change >= 0 ? <Up className="w-2 h-2" /> : <Down className="w-2 h-2" />}
                                            {Math.abs(t.price_change || 0).toFixed(2)}%
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── CENTER: CHART ────────────────────────────────────────────── */}
                <div className="lg:col-span-6 space-y-4 h-auto lg:h-[calc(100vh-140px)] flex flex-col order-1 lg:order-2">
                    {/* Token Header */}
                    <div className="p-6 bg-white border border-gray-100 rounded-[2.5rem] shadow-xl flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-rose-500 to-orange-500 p-[1px]">
                                <div className="w-full h-full bg-white rounded-[1.5rem] p-1">
                                    <img src={selectedToken?.logo_url || '/logo.png'} className="w-full h-full object-cover rounded-[1.2rem]" />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-gray-900 tracking-tighter flex items-center gap-3">
                                    {selectedToken?.name} <span className="text-gray-300 font-bold uppercase text-[10px] tracking-widest px-2 py-1 bg-gray-50 rounded-lg">{selectedToken?.symbol}</span>
                                </h1>
                                <div className="flex items-center gap-6 mt-1 text-[11px] font-black uppercase tracking-widest text-gray-400">
                                    <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-emerald-500" /> Price: <span className="text-gray-900">{formatPrice(selectedToken?.price_bnb)} BNB</span></span>
                                    <span className="flex items-center gap-1.5"><Up className="w-3.5 h-3.5 text-rose-500" /> 24H: <span className={priceChange < 0 ? 'text-rose-500' : 'text-emerald-500'}>{priceChange >= 0 ? '+' : ''}{priceChange}%</span></span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button className="px-5 py-2.5 bg-gray-50 hover:bg-rose-50 text-gray-400 hover:text-rose-500 rounded-xl transition-all"><Upload className="w-4 h-4" /></button>
                            <button className="px-5 py-2.5 bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-500/20 hover:scale-105 transition-all"><Zap className="w-4 h-4" /></button>
                        </div>
                    </div>

                    {/* Chart Container */}
                    <div className="p-8 bg-white border border-gray-100 rounded-[3rem] shadow-2xl flex-1 flex flex-col overflow-hidden relative min-h-[400px]">
                        <div className="absolute top-8 left-8 z-20 flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-300">
                             <span className="px-3 py-1.5 bg-rose-500 text-white rounded-lg shadow-lg">LIVE NEXUS</span>
                             <span>Market Depth (BNB)</span>
                        </div>
                        <div className="flex-1 pt-12">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="time" hide />
                                    <YAxis domain={['auto', 'auto']} vertical={false} orientation="right" tick={{fontSize: 9, fontWeight: 900, fill: '#cbd5e1'}} axisLine={false} tickLine={false} />
                                    <Tooltip content={<LightPriceTooltip />} />
                                    <Area type="monotone" dataKey="price" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" animationDuration={1000} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Bottom Tabs */}
                    <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col h-[280px]">
                         <div className="flex border-b border-gray-50">
                             {['history', 'positions', 'about'].map(t => (
                                 <button key={t} onClick={() => setActiveBottomTab(t)}
                                    className={`px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative
                                        ${activeBottomTab === t ? 'text-gray-900 bg-gray-50' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-50/50'}
                                    `}>
                                    {activeBottomTab === t && <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500" />}
                                    {t}
                                 </button>
                             ))}
                         </div>
                         <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                             {activeBottomTab === 'history' && (
                                 <div className="space-y-4">
                                     <table className="w-full text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                         <thead><tr className="border-b border-gray-50 text-left pb-4"><th className="py-4 px-6">Type</th><th className="py-4">Amount</th><th className="py-4 text-right pr-6">Time</th></tr></thead>
                                         <tbody className="divide-y divide-gray-50">
                                             {trades.map((t,i) => (
                                                 <tr key={i} className="hover:bg-gray-50 transition-colors">
                                                     <td className={`py-4 px-6 font-black ${t.type === 'buy' ? 'text-emerald-500' : 'text-rose-500'}`}>{t.type}</td>
                                                     <td className="text-gray-900">{formatNumber(t.amount, 2)} {selectedToken?.symbol}</td>
                                                     <td className="text-right pr-6 text-gray-300 font-medium">{timeAgo(t.created_at || new Date())}</td>
                                                 </tr>
                                             ))}
                                         </tbody>
                                     </table>
                                 </div>
                             )}
                             {activeBottomTab === 'about' && (
                                 <div className="p-8 text-sm text-gray-500 leading-relaxed font-medium">
                                     {selectedToken?.description || 'Institutional access token for the Nexus protocol.'}
                                 </div>
                             )}
                         </div>
                    </div>
                </div>

                {/* ── RIGHT: ORDER PANEL ────────────────────────────────────────── */}
                <div className="lg:col-span-3 h-auto lg:h-[calc(100vh-140px)] flex flex-col gap-6 order-2 lg:order-3">
                    <div className="bg-white border border-gray-100 rounded-[3rem] shadow-2xl p-8 flex flex-col flex-1 overflow-hidden relative">
                         <div className="absolute top-0 right-[-10%] w-32 h-32 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
                         
                         <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-10 flex items-center gap-3">
                             <ArrowLeftRight className="w-5 h-5 text-rose-500" /> Nexus Terminal
                         </h2>

                         <div className="bg-gray-50 p-2 rounded-[2rem] flex mb-10 shadow-inner">
                             <button onClick={() => setOrderSide('buy')} className={`flex-1 py-4 rounded-[1.75rem] text-[11px] font-black uppercase tracking-widest transition-all ${orderSide === 'buy' ? 'bg-white text-emerald-500 shadow-xl' : 'text-gray-300'}`}>Anchor (Buy)</button>
                             <button onClick={() => setOrderSide('sell')} className={`flex-1 py-4 rounded-[1.75rem] text-[11px] font-black uppercase tracking-widest transition-all ${orderSide === 'sell' ? 'bg-white text-rose-500 shadow-xl' : 'text-gray-300'}`}>Exit (Sell)</button>
                         </div>

                         <div className="space-y-6 flex-1">
                             <div className="space-y-3">
                                 <div className="flex justify-between items-center px-4">
                                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount to {orderSide}</label>
                                     <span className="text-[10px] font-black text-gray-300 cursor-pointer hover:text-rose-500" onClick={() => setOrderAmount(orderSide === 'buy' ? userBnb : userTokens)}>MAX DEPTH</span>
                                 </div>
                                 <div className="relative group">
                                     <input 
                                         type="number" value={orderAmount} onChange={(e) => setOrderAmount(e.target.value)}
                                         placeholder="0.00"
                                         className="w-full bg-gray-50 border border-gray-100 rounded-3xl p-8 font-black text-3xl outline-none focus:bg-white focus:border-rose-500/30 transition-all text-gray-900 shadow-sm"
                                     />
                                     <span className="absolute right-8 top-1/2 -translate-y-1/2 text-xs font-black text-gray-300 uppercase tracking-widest group-focus-within:text-rose-500">{orderSide === 'buy' ? 'BNB' : selectedToken?.symbol}</span>
                                 </div>
                             </div>

                             <div className="p-8 rounded-[2rem] bg-gray-50/50 border border-gray-100 space-y-4 shadow-inner">
                                 <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                                     <span className="flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5 text-emerald-500" /> Nexus Weight</span>
                                     <span className="text-gray-900">{orderSide === 'buy' ? `${formatNumber(userBnb, 4)} BNB` : `${formatNumber(userTokens, 2)} ${selectedToken?.symbol}`}</span>
                                 </div>
                                 <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                                     <span className="flex items-center gap-1.5"><History className="w-3.5 h-3.5 text-rose-500" /> Network Slippage</span>
                                     <span className="text-gray-900">0.5% (OPTIMAL)</span>
                                 </div>
                             </div>
                         </div>

                         <div className="pt-8">
                             <AnimatePresence>
                                 {orderError && (
                                     <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                        className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3">
                                         <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                         <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wide leading-relaxed">{orderError}</p>
                                     </motion.div>
                                 )}
                                 {orderStatus === 'success' && (
                                     <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                        className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                                         <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                         <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Nexus Synchronized!</p>
                                     </motion.div>
                                 )}
                             </AnimatePresence>
                             
                             <button 
                                 onClick={handleExecuteOrder} disabled={orderStatus === 'loading'}
                                 className={`w-full py-8 rounded-[2.5rem] font-black text-2xl tracking-tighter shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-4 relative overflow-hidden group
                                    ${orderSide === 'buy' ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-rose-500 text-white shadow-rose-500/20'}
                                    ${orderStatus === 'loading' ? 'opacity-40 animate-pulse' : 'hover:scale-[1.02]'}
                                 `}>
                                 <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 transform translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                 {orderStatus === 'loading' ? <RefreshCw className="w-8 h-8 animate-spin" /> : (orderSide === 'buy' ? <Up className="w-8 h-8" /> : <Down className="w-8 h-8" />)}
                                 {orderSide === 'buy' ? 'Anchor' : 'Exit'}
                             </button>
                         </div>
                    </div>
                </div>

            </div>

            <style jsx global>{`
                .p-pattern { background-image: radial-gradient(circle at 2px 2px, rgba(0,0,0,0.02) 1px, transparent 0); background-size: 40px 40px; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            `}</style>
        </main>
    );
}
