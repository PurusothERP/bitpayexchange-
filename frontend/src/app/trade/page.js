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
    RefreshCw, Search, ArrowUpRight, ArrowDownRight, ExternalLink
} from 'lucide-react';
import { ethers, Contract } from 'ethers';
import { BONDING_CURVE_ABI, TOKEN_TEMPLATE_ABI } from '@/lib/abis';

const BONDING_CURVE_ADDRESS = process.env.NEXT_PUBLIC_BONDING_CURVE_ADDRESS;
const API_URL               = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const BSC_RPC               = 'https://bsc-dataseed.binance.org';

function formatNumber(num, dec = 4) { return Number(num).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
function formatPrice(num) {
    if (num === 0) return '0.0000';
    if (num < 0.000001) return num.toExponential(4);
    if (num < 0.01) return num.toFixed(8);
    return num.toFixed(6);
}
function timeAgo(dateStr) {
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
}

// Custom Dark Chart Tooltip
function DarkPriceTooltip({ active, payload }) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#1e2329] border border-[#2b3139] p-2.5 rounded shadow-xl text-xs">
                <p className="text-[#848e9c] mb-1">{payload[0].payload.time}</p>
                <p className="font-mono text-white tracking-wider">
                    <span className="text-[#848e9c] mr-2">Price:</span>
                    {formatPrice(payload[0].value)} <span className="text-[10px] text-[#848e9c]">BNB</span>
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

    // ── Fetch active tokens ──────────────────────────────────────────────────
    useEffect(() => {
        axios.get(`${API_URL}/tokens`)
            .then(r => {
                if (Array.isArray(r.data) && r.data.length > 0) {
                    setAllTokens(r.data);
                    setSelectedToken(r.data[0]); // Auto-select first token
                }
            })
            .catch(console.error);
    }, []);

    // ── Fetch User Balances ──────────────────────────────────────────────────
    const fetchBalances = useCallback(async () => {
        if (!account || !selectedToken) return;
        try {
            const provider = new ethers.JsonRpcProvider(BSC_RPC);
            const balBnb = await provider.getBalance(account);
            setUserBnb(parseFloat(ethers.formatEther(balBnb)));

            if (selectedToken.contract_address) {
                const tc = new Contract(selectedToken.contract_address, TOKEN_TEMPLATE_ABI, provider);
                const balT = await tc.balanceOf(account);
                setUserTokens(parseFloat(ethers.formatUnits(balT, 18)));
            }
        } catch (e) {}
    }, [account, selectedToken]);

    useEffect(() => { fetchBalances(); }, [fetchBalances]);

    // ── Fetch Trade Data & Chart ───────────────────────────────────────────
    const fetchTradeData = useCallback(async () => {
        if (!selectedToken?.contract_address) return;
        try {
            const [tradesRes, statsRes, chartRes] = await Promise.allSettled([
                axios.get(`${API_URL}/trades/${selectedToken.contract_address}`),
                axios.get(`${API_URL}/trades/${selectedToken.contract_address}/stats`),
                axios.get(`${API_URL}/trades/${selectedToken.contract_address}/chart`),
            ]);

            if (tradesRes.status === 'fulfilled') setTrades(Array.isArray(tradesRes.value.data) ? tradesRes.value.data : []);
            if (statsRes.status === 'fulfilled') setTradeStats(statsRes.value.data);
            if (chartRes.status === 'fulfilled' && Array.isArray(chartRes.value.data)) {
                setChartData(chartRes.value.data.map(d => ({
                    time: new Date(d.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                    price: parseFloat(d.price_bnb || 0),
                })));
            }
        } catch (e) {}
    }, [selectedToken]);

    // ── Live Bonding Curve Status ──────────────────────────────────────────
    const fetchMarket = useCallback(async () => {
        if (!selectedToken?.contract_address || !BONDING_CURVE_ADDRESS) return;
        try {
            const provider = new ethers.JsonRpcProvider(BSC_RPC);
            const bc = new Contract(BONDING_CURVE_ADDRESS, BONDING_CURVE_ABI, provider);
            
            const [m, VIRTUAL_BNB, LP_INIT_THRESHOLD] = await Promise.all([
                bc.markets(selectedToken.contract_address),
                bc.VIRTUAL_BNB().catch(() => ethers.parseEther('0.5')),
                bc.LP_INIT_THRESHOLD().catch(() => ethers.parseEther('0.3')),
            ]);

            const virtualBnb     = parseFloat(ethers.formatEther(VIRTUAL_BNB));
            const bnbReserve     = parseFloat(ethers.formatEther(m.bnbReserve || m.collateral || 0n));
            const tokenReserve   = parseFloat(ethers.formatUnits(m.tokenReserve || 0n, 18));
            
            const supplyTraded   = m.supply ? parseFloat(ethers.formatUnits(m.supply, 18)) : (1000000000 - tokenReserve);
            const migThreshold   = parseFloat(ethers.formatEther(LP_INIT_THRESHOLD));
            const available      = tokenReserve > 0 ? tokenReserve : (1_000_000_000 - supplyTraded);

            const effectivePrice = tokenReserve > 0 ? ((virtualBnb + bnbReserve) / tokenReserve) : 0.0000005;
            
            const prev = prevPriceRef.current;
            const trend = prev ? (effectivePrice > prev ? 'up' : effectivePrice < prev ? 'down' : 'none') : 'none';
            prevPriceRef.current = effectivePrice;

            setMarket({
                isRegistered: m.token !== ethers.ZeroAddress,
                collateralBnb: bnbReserve, supplyTraded, available,
                migrated: m.migrated,
                priceBnb: effectivePrice,
                trend
            });

            // Fallback chart if brand new
            setChartData(prevData => {
                if (prevData.length === 0 && bnbReserve > 0) {
                    return Array.from({ length: 15 }, (_, i) => ({
                        time: `T-${15-i}`, price: Number((effectivePrice * (0.8 + (0.2*(i/15)))).toFixed(12))
                    }));
                }
                return prevData;
            });
        } catch (e) {}
    }, [selectedToken]);

    useEffect(() => {
        if (!selectedToken) return;
        setChartData([]);
        prevPriceRef.current = null;
        fetchMarket();
        fetchTradeData();
        const iv1 = setInterval(fetchMarket, 5000);
        const iv2 = setInterval(fetchTradeData, 10000);
        return () => { clearInterval(iv1); clearInterval(iv2); };
    }, [selectedToken, fetchMarket, fetchTradeData]);

    // ── Order Execution ────────────────────────────────────────────────────
    const executeTrade = async () => {
        setOrderError('');

        if (!account) {
            connectWallet();
            return;
        }
        if (!selectedToken?.contract_address) {
            setOrderError('No token selected.');
            return;
        }
        if (!orderAmount || isNaN(orderAmount) || Number(orderAmount) <= 0) {
            setOrderError('Enter a valid amount greater than 0.');
            return;
        }

        setOrderStatus('loading');
        try {
            // Get signer — fallback to window.ethereum if Web3Modal signer is null
            let activeSigner = signer;
            if (!activeSigner) {
                if (typeof window !== 'undefined' && window.ethereum) {
                    const { BrowserProvider } = await import('ethers');
                    const browserProvider = new BrowserProvider(window.ethereum);
                    activeSigner = await browserProvider.getSigner();
                } else {
                    throw new Error('Wallet not fully connected. Please disconnect and reconnect your wallet.');
                }
            }

            if (market?.migrated) {
                throw new Error('Token already migrated to DEX. Trade on PancakeSwap directly.');
            }

            if (!BONDING_CURVE_ADDRESS) {
                throw new Error('Bonding Curve contract address not configured.');
            }

            const bc = new Contract(BONDING_CURVE_ADDRESS, BONDING_CURVE_ABI, activeSigner);
            let tx;

            if (orderSide === 'buy') {
                const val = ethers.parseEther(Number(orderAmount).toFixed(18));

                // Gas pre-check to give clear error before wallet popup
                try {
                    await bc.buy.estimateGas(selectedToken.contract_address, { value: val });
                } catch (gasErr) {
                    const reason = gasErr.reason || gasErr.data?.message || gasErr.message;
                    throw new Error('Transaction would fail: ' + reason);
                }

                tx = await bc.buy(selectedToken.contract_address, { value: val });
            } else {
                const val = ethers.parseUnits(Number(orderAmount).toFixed(18), 18);
                const tokenContract = new Contract(selectedToken.contract_address, TOKEN_TEMPLATE_ABI, activeSigner);

                // Check allowance
                const allowance = await tokenContract.allowance(account, BONDING_CURVE_ADDRESS);
                if (allowance < val) {
                    setOrderStatus('approving');
                    const approveTx = await tokenContract.approve(BONDING_CURVE_ADDRESS, ethers.MaxUint256);
                    await approveTx.wait();
                    setOrderStatus('loading');
                }

                // Gas pre-check
                try {
                    await bc.sell.estimateGas(selectedToken.contract_address, val);
                } catch (gasErr) {
                    const reason = gasErr.reason || gasErr.data?.message || gasErr.message;
                    throw new Error('Sell would fail: ' + reason);
                }

                tx = await bc.sell(selectedToken.contract_address, val);
            }

            console.log('[Trade] TX sent:', tx.hash);
            await tx.wait();
            setOrderStatus('success');
            setOrderAmount('');
            fetchMarket();
            fetchTradeData();
            fetchBalances();
            setTimeout(() => setOrderStatus('idle'), 3000);
        } catch (err) {
            console.error('[Trade] Error:', err);
            const msg = err.reason || err.data?.message || err.message || 'Trade failed';
            setOrderError(msg.length > 200 ? msg.slice(0, 200) + '...' : msg);
            setOrderStatus('idle');
        }
    };

    // ── Computed Stats ─────────────────────────────────────────────────────
    const pBnb = market?.priceBnb ?? 0;
    const change24h = tradeStats?.price_change_24h ?? 0;
    const vol24h = tradeStats?.volume_24h_bnb ?? 0;
    
    const userHoldingsBnbVal = userTokens * (pBnb || 0);

    const filteredTokens = allTokens.filter(t => 
        t.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <main className="min-h-screen bg-[#0b0e11] text-gray-200 font-sans selection:bg-rose-500/30">
            {/* The standard Navbar renders in light-mode visually above. Dark trade dash underneath. */}
            <div className="absolute top-0 w-full z-[100]"><Navbar /></div>
            
            <div className="pt-[80px] h-screen flex flex-col">
                
                {/* ── TOP MARKETS BAR ── */}
                <div className="h-[60px] border-b border-[#2b3139] bg-[#181a20] px-4 flex items-center shrink-0">
                    
                    {/* Token Selector */}
                    <div className="relative z-50">
                        <button onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-3 hover:bg-[#2b3139] px-3 py-1.5 rounded-lg transition-colors">
                            <div className="flex items-center gap-2">
                                {selectedToken?.logo_url ? <img src={selectedToken.logo_url} className="w-6 h-6 rounded-full object-cover" /> : <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center text-[10px] font-bold">T</div>}
                                <div>
                                    <h2 className="text-lg font-bold text-white leading-none">{selectedToken?.symbol || '---'}/BNB</h2>
                                    <p className="text-[10px] text-[#848e9c] leading-none truncate w-24 text-left cursor-pointer hover:text-white" onClick={(e) => { e.stopPropagation(); window.open(`https://bscscan.com/token/${selectedToken?.contract_address}`); }}>{selectedToken?.name}</p>
                                </div>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-[#848e9c] transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {isDropdownOpen && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                    className="absolute top-full left-0 mt-2 w-72 bg-[#1e2329] border border-[#2b3139] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[400px]">
                                    <div className="p-3 border-b border-[#2b3139]">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#848e9c]" />
                                            <input type="text" placeholder="Search tokens..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full bg-[#0b0e11] border border-[#2b3139] rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50" />
                                        </div>
                                    </div>
                                    <div className="overflow-y-auto flex-1 p-2">
                                        {filteredTokens.map((t, i) => (
                                            <button key={i} onClick={() => { setSelectedToken(t); setIsDropdownOpen(false); }}
                                                className={`w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#2b3139] transition-colors ${selectedToken?.contract_address === t.contract_address ? 'bg-[#2b3139]' : ''}`}>
                                                <div className="flex items-center gap-2">
                                                    {t.logo_url ? <img src={t.logo_url} className="w-5 h-5 rounded-full" /> : <div className="w-5 h-5 rounded-full bg-gray-700" />}
                                                    <span className="font-bold text-sm text-white">{t.symbol}</span>
                                                </div>
                                            </button>
                                        ))}
                                        {filteredTokens.length === 0 && <p className="text-center text-xs text-[#848e9c] py-4">No tokens found</p>}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="h-8 w-px bg-[#2b3139] mx-4" />

                    {/* Stats Ticker */}
                    <div className="flex items-center gap-8 shrink-0 overflow-x-auto hide-scrollbar">
                        <div>
                            <p className={`text-lg font-bold font-mono ${market?.trend === 'up' ? 'text-[#0ecb81]' : market?.trend === 'down' ? 'text-[#f6465d]' : 'text-white'}`}>
                                {formatPrice(pBnb)}
                            </p>
                            <p className="text-[10px] text-[#848e9c] font-medium tracking-wider">$ {formatPrice(pBnb * 580)} USD</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-[#848e9c] font-medium tracking-wider mb-0.5">24h Change</p>
                            <p className={`text-xs font-mono font-bold ${change24h < 0 ? 'text-[#f6465d]' : 'text-[#0ecb81]'}`}>
                                {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] text-[#848e9c] font-medium tracking-wider mb-0.5">24h Vol(BNB)</p>
                            <p className="text-xs font-mono font-bold text-white">{vol24h.toFixed(4)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-[#848e9c] font-medium tracking-wider mb-0.5">Curve Progress</p>
                            <p className="text-xs font-mono font-bold text-white">{market?.collateralBnb.toFixed(2) || '0.00'} BNB</p>
                        </div>
                        {market?.migrated && (
                            <div className="ml-4 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] font-bold text-[#0ecb81] tracking-widest uppercase">
                                Migrated to DEX
                            </div>
                        )}
                    </div>
                </div>

                {/* ── MAIN WORKSPACE ── */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#0b0e11]">
                    
                    {/* LEFT COLUMN: Chart & Positions */}
                    <div className="flex-1 flex flex-col border-r border-[#2b3139] min-w-0">
                        
                        {/* CHART AREA */}
                        <div className="h-[60%] border-b border-[#2b3139] flex flex-col p-4 bg-[#181a20]">
                            {/* Chart Toolbar */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex gap-4">
                                    <span className="text-xs font-bold text-white border-b-2 border-rose-500 pb-1 cursor-pointer">Time</span>
                                    <span className="text-xs font-bold text-[#848e9c] hover:text-white cursor-pointer transition-colors pb-1">Depth</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] px-2 py-1 bg-[#2b3139] rounded text-white font-mono">1% Treasury Fee Enabled</span>
                                </div>
                            </div>
                            
                            {/* Chart Native */}
                            <div className="flex-1 min-h-0 relative">
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="darkGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#2b3139" vertical={false} />
                                            <XAxis dataKey="time" stroke="#848e9c" fontSize={11} tickLine={false} axisLine={false} minTickGap={30} />
                                            <YAxis orientation="right" stroke="#848e9c" fontSize={11} tickLine={false} axisLine={false} domain={['dataMin * 0.95', 'dataMax * 1.05']} tickFormatter={(val) => val.toFixed(6)} />
                                            <Tooltip content={<DarkPriceTooltip />} cursor={{ stroke: '#848e9c', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                            <Area isAnimationActive={false} type="stepAfter" dataKey="price" stroke="#f43f5e" strokeWidth={2} fill="url(#darkGrad)" dot={false} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-[#848e9c]">
                                        <Activity className="w-10 h-10 mb-3 opacity-20 animate-pulse" />
                                        <p className="text-sm font-bold">Awaiting trades...</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* BOTTOM AREA: Positions / History */}
                        <div className="flex-1 flex flex-col bg-[#181a20]">
                            <div className="flex gap-6 border-b border-[#2b3139] px-4">
                                {['positions', 'orders', 'history'].map(tab => (
                                    <button key={tab} onClick={() => setActiveBottomTab(tab)}
                                        className={`py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${activeBottomTab === tab ? 'text-white border-rose-500' : 'text-[#848e9c] border-transparent hover:text-white'}`}>
                                        {tab === 'positions' ? 'Positions' : tab === 'orders' ? 'Open Orders (0)' : 'Order History'}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
                                {activeBottomTab === 'positions' && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs text-left whitespace-nowrap">
                                            <thead className="text-[#848e9c]">
                                                <tr>
                                                    <th className="font-normal pb-3 pr-4">Symbol</th>
                                                    <th className="font-normal pb-3 pr-4">Size (Tokens)</th>
                                                    <th className="font-normal pb-3 pr-4 text-right">Entry Price</th>
                                                    <th className="font-normal pb-3 pr-4 text-right">Mark Price</th>
                                                    <th className="font-normal pb-3 pr-4 text-right">Unrealized PnL (BNB)</th>
                                                    <th className="font-normal pb-3 text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {userTokens > 0 ? (
                                                    <tr className="border-b border-[#2b3139]/50 hover:bg-[#2b3139]/20 transition-colors">
                                                        <td className="py-3 pr-4 font-bold text-white flex items-center gap-1.5">
                                                            <div className="w-1 h-3 rounded-full bg-[#0ecb81]"></div>
                                                            {selectedToken?.symbol} <span className="text-[#0ecb81] bg-[#0ecb81]/10 px-1 py-0.5 rounded text-[9px]">LONG</span>
                                                        </td>
                                                        <td className="py-3 pr-4 text-white font-mono">{formatNumber(userTokens, 2)}</td>
                                                        <td className="py-3 pr-4 text-white font-mono text-right">-</td>
                                                        <td className="py-3 pr-4 text-white font-mono text-right">{formatPrice(pBnb)}</td>
                                                        <td className="py-3 pr-4 font-mono text-right font-bold text-[#f6465d] blur-[2px] hover:blur-none transition-all cursor-help" title="No Entry trace available on basic spot DB yet">—</td>
                                                        <td className="py-3 text-right">
                                                            <button onClick={() => { setOrderSide('sell'); setOrderAmount(userTokens); }} 
                                                                className="text-[#848e9c] hover:text-[#f6465d] bg-[#f6465d]/10 hover:bg-[#f6465d]/20 px-2 py-1 rounded transition-colors border border-[#f6465d]/20">
                                                                Close All
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    <tr><td colSpan={6} className="text-center py-8 text-[#848e9c]">No open positions.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {activeBottomTab === 'history' && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs text-left whitespace-nowrap">
                                            <thead className="text-[#848e9c]">
                                                <tr>
                                                    <th className="font-normal pb-3 pr-4">Time</th>
                                                    <th className="font-normal pb-3 pr-4">Direction</th>
                                                    <th className="font-normal pb-3 pr-4 text-right">Price (BNB)</th>
                                                    <th className="font-normal pb-3 pr-4 text-right">Amount (Tokens)</th>
                                                    <th className="font-normal pb-3 text-right">Total (BNB)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {trades.slice(0, 15).map((t, i) => (
                                                    <tr key={i} className="hover:bg-[#2b3139]/30 transition-colors">
                                                        <td className="py-2.5 pr-4 text-[#848e9c]">{new Date(t.timestamp).toLocaleTimeString()}</td>
                                                        <td className="py-2.5 pr-4 font-bold">
                                                            {t.trade_type === 'buy' ? <span className="text-[#0ecb81]">Long / Buy</span> : <span className="text-[#f6465d]">Short / Sell</span>}
                                                        </td>
                                                        <td className="py-2.5 pr-4 text-white font-mono text-right">{formatPrice(t.price_bnb)}</td>
                                                        <td className="py-2.5 pr-4 text-white font-mono text-right">{formatNumber(t.amount_tokens, 2)}</td>
                                                        <td className="py-2.5 text-white font-mono text-right">{formatPrice(t.amount_bnb)}</td>
                                                    </tr>
                                                ))}
                                                {trades.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-[#848e9c]">No trades yet.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Orderbook & Order Entry */}
                    <div className="w-full md:w-[320px] lg:w-[350px] flex flex-col shrink-0">
                        
                        {/* ORDER BOOK (Simplified Trade Tape) */}
                        <div className="flex-1 min-h-0 border-b border-[#2b3139] flex flex-col bg-[#0b0e11]">
                            <div className="flex justify-between px-4 py-2 border-b border-[#2b3139]">
                                <span className="text-xs font-bold text-[#848e9c]">Order Book</span>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                                <div className="grid grid-cols-3 gap-2 px-2 pb-2 text-[10px] text-[#848e9c] text-right">
                                    <span className="text-left">Price(BNB)</span> <span>Size(Token)</span> <span>Time</span>
                                </div>
                                {trades.slice(0, 20).map((t, i) => (
                                    <div key={i} className="grid grid-cols-3 gap-2 px-2 py-0.5 text-xs text-right font-mono hover:bg-[#2b3139]/40 cursor-pointer">
                                        <span className={`text-left ${t.trade_type === 'buy' ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>{formatPrice(t.price_bnb)}</span>
                                        <span className="text-white">{formatNumber(t.amount_tokens, 0)}</span>
                                        <span className="text-[#848e9c]">{new Date(t.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ORDER ENTRY PANEL */}
                        <div className="h-auto p-4 bg-[#181a20]">
                            
                            {/* Market / Limit Selector */}
                            <div className="flex gap-4 mb-4">
                                <button className="text-sm font-bold text-white border-b-2 border-rose-500 pb-1">Market</button>
                                <button className="text-sm font-bold text-[#848e9c] hover:text-white pb-1" title="Bonding Curve restricts Limits" onClick={() => alert("Bonding Curve natively executes instantly across the AMM curve.")}>Limit</button>
                            </div>

                            <div className="flex items-center gap-1 bg-[#0b0e11] p-1 rounded-lg mb-5">
                                <button onClick={() => setOrderSide('buy')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${orderSide === 'buy' ? 'bg-[#0ecb81] text-white shadow-[#0ecb81]/20 shadow-lg' : 'text-[#848e9c] hover:text-white'}`}>Open Long</button>
                                <button onClick={() => setOrderSide('sell')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${orderSide === 'sell' ? 'bg-[#f6465d] text-white shadow-[#f6465d]/20 shadow-lg' : 'text-[#848e9c] hover:text-white'}`}>Open Short</button>
                            </div>

                            {market?.migrated && (
                                <div className="p-3 mb-4 rounded bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0" /> Token migrated to DEX. Trade directly on PancakeSwap.
                                </div>
                            )}

                            {/* Avail Balance */}
                            <div className="flex justify-between text-xs text-[#848e9c] mb-2 px-1">
                                <span>Avail</span>
                                <span className="text-white font-mono">{orderSide === 'buy' ? `${formatNumber(userBnb, 4)} BNB` : `${formatNumber(userTokens, 2)} Token`}</span>
                            </div>

                            {/* Input Field */}
                            <div className="relative flex items-center bg-[#2b3139] border border-[#2b3139] focus-within:border-[#848e9c] rounded-lg transition-colors overflow-hidden">
                                <input type="number" step="any" placeholder={orderSide === 'buy' ? 'Enter Amount' : 'Enter Token Size'}
                                    value={orderAmount} onChange={(e) => setOrderAmount(e.target.value)}
                                    className="w-full bg-transparent text-white px-3 py-3 font-mono text-sm focus:outline-none" />
                                <div className="flex items-center gap-2 pr-3 shrink-0">
                                    <button onClick={() => setOrderAmount(orderSide === 'buy' ? userBnb * 0.99 : userTokens)} className="text-[10px] uppercase font-bold text-rose-500 hover:text-rose-400">Max</button>
                                    <span className="text-xs text-[#848e9c] font-bold border-l border-[#848e9c]/30 pl-2">{orderSide === 'buy' ? 'BNB' : selectedToken?.symbol}</span>
                                </div>
                            </div>
                            
                            {/* Estimated output trace */}
                            <div className="flex justify-between text-xs mt-3 px-1">
                                <span className="text-[#848e9c]">Expected Recieve</span>
                                <span className="text-white font-mono">{orderSide === 'buy' ? (orderAmount ? formatNumber(orderAmount / pBnb) : '0') : (orderAmount ? formatNumber(orderAmount * pBnb) : '0')} {orderSide === 'buy' ? selectedToken?.symbol : 'BNB'}</span>
                            </div>

                            {orderError && <div className="mt-3 text-xs text-[#f6465d] p-2 bg-[#f6465d]/10 rounded border border-[#f6465d]/20">{orderError}</div>}

                            <button onClick={executeTrade} disabled={orderStatus === 'loading' || orderStatus === 'approving' || market?.migrated || !account}
                                className={`w-full mt-5 py-3.5 rounded-lg text-sm font-bold text-white shadow-xl transition-all
                                ${!account ? 'bg-[#2b3139] text-[#848e9c]' : market?.migrated ? 'bg-[#2b3139] text-[#848e9c] cursor-not-allowed' : orderSide === 'buy' ? 'bg-[#0ecb81] hover:bg-[#0b9c64] shadow-[#0ecb81]/20' : 'bg-[#f6465d] hover:bg-[#c9364b] shadow-[#f6465d]/20'}`}>
                                {!account ? 'Connect Wallet' : orderStatus === 'loading' ? 'Executing Order...' : orderStatus === 'approving' ? 'Approving Contract...' : orderStatus === 'success' ? 'Order Success!' : orderSide === 'buy' ? 'Buy / Long' : 'Sell / Short'}
                            </button>
                            <p className="text-center text-[10px] text-[#848e9c] mt-3">1% Trading Fee automatically sent to Treasury.</p>
                        </div>
                    </div>
                </div>
            </div>
            {/* Custom inject CSS for scrollbar inside dark theme */}
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #2b3139; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #848e9c; }
                .hide-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>
        </main>
    ); 
}
