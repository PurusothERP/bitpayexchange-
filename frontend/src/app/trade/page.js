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
    RefreshCw, Search, ArrowUpRight, ArrowDownRight, ExternalLink, Zap
} from 'lucide-react';
import { ethers, Contract } from 'ethers';
import { BONDING_CURVE_ABI, TOKEN_TEMPLATE_ABI } from '@/lib/abis';

const BONDING_CURVE_ADDRESS  = process.env.NEXT_PUBLIC_BONDING_CURVE_ADDRESS;
const API_URL                = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const BSC_RPC                = 'https://bsc-dataseed.binance.org';

// PancakeSwap V2 Router — BSC Mainnet
const PANCAKE_ROUTER_ADDR = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
const WBNB_ADDR           = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
// Minimal PancakeSwap Router ABI for swaps & quotes
const PANCAKE_ROUTER_ABI = [
    'function swapExactETHForTokensSupportingFeeOnTransferTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable',
    'function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external',
    'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
];


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

    // ── DEX Price Feed (for Fair Launch / Migrated tokens) ─────────────────
    const fetchDexMarket = useCallback(async () => {
        if (!selectedToken?.contract_address) return;
        try {
            const provider = new ethers.JsonRpcProvider(BSC_RPC);
            const router   = new Contract(PANCAKE_ROUTER_ADDR, PANCAKE_ROUTER_ABI, provider);
            const path     = [WBNB_ADDR, selectedToken.contract_address];

            // Get how many tokens you'd get for 1 BNB
            let effectivePrice = 0;
            try {
                const amounts = await router.getAmountsOut(ethers.parseEther('1'), path);
                const tokensPerBnb = parseFloat(ethers.formatUnits(amounts[1], 18));
                effectivePrice = tokensPerBnb > 0 ? 1 / tokensPerBnb : 0;
            } catch (_) {}

            const prev  = prevPriceRef.current;
            const trend = prev ? (effectivePrice > prev ? 'up' : effectivePrice < prev ? 'down' : 'none') : 'none';
            prevPriceRef.current = effectivePrice;

            setMarket({
                isRegistered: true,
                collateralBnb: 0,
                supplyTraded: 0,
                available: 0,
                migrated: true,
                isDex: true,
                priceBnb: effectivePrice,
                trend
            });
        } catch (e) { console.warn('[DEX Market]', e.message); }
    }, [selectedToken]);

    // ── Live Bonding Curve Status ──────────────────────────────────────────
    const fetchMarket = useCallback(async () => {
        if (!selectedToken?.contract_address) return;

        // ── Fair Launch or already-migrated: read from PancakeSwap ──
        const isFairLaunch = selectedToken?.launch_type === 'FAIR_LAUNCH';
        if (isFairLaunch) { await fetchDexMarket(); return; }

        if (!BONDING_CURVE_ADDRESS) return;
        try {
            const provider = new ethers.JsonRpcProvider(BSC_RPC);
            const bc = new Contract(BONDING_CURVE_ADDRESS, BONDING_CURVE_ABI, provider);
            
            const [m, LP_INIT_THRESHOLD] = await Promise.all([
                bc.markets(selectedToken.contract_address),
                bc.LP_INIT_THRESHOLD().catch(() => ethers.parseEther('0.01')),
            ]);

            const virtualBnb   = m.virtualBnb ? parseFloat(ethers.formatEther(m.virtualBnb)) : 0.5;
            const bnbReserve   = parseFloat(ethers.formatEther(m.bnbReserve || 0n));
            const tokenReserve = parseFloat(ethers.formatUnits(m.tokenReserve || 0n, 18));
            const supplyTraded = 1000000000 - tokenReserve;
            const available    = tokenReserve;

            const effectivePrice = tokenReserve > 0 ? ((virtualBnb + bnbReserve) / tokenReserve) : 0.0000005;
            
            const prev  = prevPriceRef.current;
            const trend = prev ? (effectivePrice > prev ? 'up' : effectivePrice < prev ? 'down' : 'none') : 'none';
            prevPriceRef.current = effectivePrice;

            const isMigrated = m.migrated;

            // If bonding curve has migrated, switch to DEX pricing
            if (isMigrated) { await fetchDexMarket(); return; }

            setMarket({
                isRegistered: m.token !== ethers.ZeroAddress,
                collateralBnb: bnbReserve, supplyTraded, available,
                migrated: false,
                isDex: false,
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
    }, [selectedToken, fetchDexMarket]);

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

        if (!account) { connectWallet(); return; }
        if (!selectedToken?.contract_address) { setOrderError('No token selected.'); return; }
        if (!orderAmount || isNaN(orderAmount) || Number(orderAmount) <= 0) {
            setOrderError('Enter a valid amount greater than 0.');
            return;
        }

        setOrderStatus('loading');
        try {
            // Resolve signer
            let activeSigner = signer;
            if (!activeSigner) {
                if (typeof window !== 'undefined' && window.ethereum) {
                    const { BrowserProvider } = await import('ethers');
                    activeSigner = await new BrowserProvider(window.ethereum).getSigner();
                } else {
                    throw new Error('Wallet not fully connected. Please reconnect.');
                }
            }

            const tokenAddr = selectedToken.contract_address;
            const isDex     = market?.isDex || selectedToken?.launch_type === 'FAIR_LAUNCH' || market?.migrated;

            // ══════════════════════════════════════════════════
            //  DEX PATH — PancakeSwap Router swap
            // ══════════════════════════════════════════════════
            if (isDex) {
                const router = new Contract(PANCAKE_ROUTER_ADDR, PANCAKE_ROUTER_ABI, activeSigner);
                const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 min
                let tx;

                if (orderSide === 'buy') {
                    const bnbIn  = ethers.parseEther(Number(orderAmount).toFixed(18));
                    const path   = [WBNB_ADDR, tokenAddr];
                    // Get expected output and set 1% slippage minimum
                    let amountOutMin = 0n;
                    try {
                        const amounts = await router.getAmountsOut(bnbIn, path);
                        amountOutMin  = amounts[1] * 99n / 100n; // 1% slippage
                    } catch (_) {}

                    tx = await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
                        amountOutMin, path, account, deadline,
                        { value: bnbIn, gasLimit: 300000 }
                    );
                } else {
                    // SELL: approve router first
                    const tokenAmt = ethers.parseUnits(Number(orderAmount).toFixed(18), 18);
                    const path     = [tokenAddr, WBNB_ADDR];
                    const tokenContract = new Contract(tokenAddr, TOKEN_TEMPLATE_ABI, activeSigner);

                    const allowance = await tokenContract.allowance(account, PANCAKE_ROUTER_ADDR);
                    if (allowance < tokenAmt) {
                        setOrderStatus('approving');
                        const approveTx = await tokenContract.approve(PANCAKE_ROUTER_ADDR, ethers.MaxUint256);
                        await approveTx.wait();
                        setOrderStatus('loading');
                    }

                    let amountOutMin = 0n;
                    try {
                        const amounts = await router.getAmountsOut(tokenAmt, path);
                        amountOutMin  = amounts[1] * 99n / 100n;
                    } catch (_) {}

                    tx = await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
                        tokenAmt, amountOutMin, path, account, deadline,
                        { gasLimit: 300000 }
                    );
                }

                console.log('[DEX Trade] TX sent:', tx.hash);
                await tx.wait();

            // ══════════════════════════════════════════════════
            //  BONDING CURVE PATH
            // ══════════════════════════════════════════════════
            } else {
                if (!BONDING_CURVE_ADDRESS) throw new Error('Bonding Curve not configured.');
                const bc = new Contract(BONDING_CURVE_ADDRESS, BONDING_CURVE_ABI, activeSigner);
                let tx;

                if (orderSide === 'buy') {
                    const val = ethers.parseEther(Number(orderAmount).toFixed(18));
                    try { await bc.buy.estimateGas(tokenAddr, { value: val }); }
                    catch (gasErr) { throw new Error('Transaction would fail: ' + (gasErr.reason || gasErr.message)); }
                    tx = await bc.buy(tokenAddr, { value: val });
                } else {
                    const val = ethers.parseUnits(Number(orderAmount).toFixed(18), 18);
                    const tokenContract = new Contract(tokenAddr, TOKEN_TEMPLATE_ABI, activeSigner);
                    const allowance = await tokenContract.allowance(account, BONDING_CURVE_ADDRESS);
                    if (allowance < val) {
                        setOrderStatus('approving');
                        const approveTx = await tokenContract.approve(BONDING_CURVE_ADDRESS, ethers.MaxUint256);
                        await approveTx.wait();
                        setOrderStatus('loading');
                    }
                    try { await bc.sell.estimateGas(tokenAddr, val); }
                    catch (gasErr) { throw new Error('Sell would fail: ' + (gasErr.reason || gasErr.message)); }
                    tx = await bc.sell(tokenAddr, val);
                }

                console.log('[BC Trade] TX sent:', tx.hash);
                await tx.wait();
            }

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
                                <span className="text-[10px] px-2 py-1 bg-[#2b3139] rounded text-white font-mono">5% Fee: 60% to LP · 40% to Treasury</span>
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
                            {/* Mode Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex gap-4">
                                    <button className="text-sm font-bold text-white border-b-2 border-rose-500 pb-1">Market</button>
                                    <button className="text-sm font-bold text-[#848e9c] hover:text-white pb-1">Limit</button>
                                </div>
                                {market?.isDex ? (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full">
                                        <Zap className="w-3 h-3 text-amber-400" />
                                        <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">DEX Route</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-rose-500/10 border border-rose-500/30 rounded-full">
                                        <Activity className="w-3 h-3 text-rose-400" />
                                        <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Bonding Curve</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-1 bg-[#0b0e11] p-1 rounded-lg mb-4">
                                <button onClick={() => setOrderSide('buy')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${orderSide === 'buy' ? 'bg-[#0ecb81] text-white shadow-[#0ecb81]/20 shadow-lg' : 'text-[#848e9c] hover:text-white'}`}>Buy / Long</button>
                                <button onClick={() => setOrderSide('sell')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${orderSide === 'sell' ? 'bg-[#f6465d] text-white shadow-[#f6465d]/20 shadow-lg' : 'text-[#848e9c] hover:text-white'}`}>Sell / Short</button>
                            </div>

                            {market?.isDex && (
                                <div className="p-2.5 mb-4 rounded-lg bg-amber-500/5 border border-amber-500/15 text-[10px] text-amber-400/80 flex items-center gap-2">
                                    <Zap className="w-3 h-3 shrink-0" />
                                    <span>Routed via PancakeSwap V2 · 1% slippage tolerance · Instant on-chain execution</span>
                                </div>
                            )}

                            <div className="flex justify-between text-xs text-[#848e9c] mb-2 px-1">
                                <span>Available</span>
                                <span className="text-white font-mono">{orderSide === 'buy' ? `${formatNumber(userBnb, 4)} BNB` : `${formatNumber(userTokens, 2)} ${selectedToken?.symbol || 'Token'}`}</span>
                            </div>

                            <div className="relative flex items-center bg-[#2b3139] border border-[#2b3139] focus-within:border-[#848e9c] rounded-lg transition-colors overflow-hidden">
                                <input type="number" step="any" placeholder={orderSide === 'buy' ? 'Enter BNB amount' : 'Enter token amount'}
                                    value={orderAmount} onChange={(e) => setOrderAmount(e.target.value)}
                                    className="w-full bg-transparent text-white px-3 py-3 font-mono text-sm focus:outline-none" />
                                <div className="flex items-center gap-2 pr-3 shrink-0">
                                    <button onClick={() => setOrderAmount(orderSide === 'buy' ? (userBnb * 0.99).toFixed(6) : userTokens.toFixed(2))} className="text-[10px] uppercase font-bold text-rose-500 hover:text-rose-400">Max</button>
                                    <span className="text-xs text-[#848e9c] font-bold border-l border-[#848e9c]/30 pl-2">{orderSide === 'buy' ? 'BNB' : selectedToken?.symbol}</span>
                                </div>
                            </div>
                            
                            <div className="flex justify-between text-xs mt-3 px-1">
                                <span className="text-[#848e9c]">Expected Receive</span>
                                <span className="text-white font-mono">
                                    {pBnb > 0 ? orderSide === 'buy' ? `${formatNumber(orderAmount / pBnb)} ${selectedToken?.symbol || ''}` : `${formatNumber(orderAmount * pBnb)} BNB` : '—'}
                                </span>
                            </div>

                            {orderError && <div className="mt-3 text-xs text-[#f6465d] p-2 bg-[#f6465d]/10 rounded border border-[#f6465d]/20">{orderError}</div>}

                            <button onClick={executeTrade} disabled={orderStatus === 'loading' || orderStatus === 'approving' || !account}
                                className={`w-full mt-5 py-3.5 rounded-lg text-sm font-bold text-white shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed
                                ${!account ? 'bg-[#2b3139] text-[#848e9c]' : orderSide === 'buy' ? 'bg-[#0ecb81] hover:bg-[#0b9c64] shadow-[#0ecb81]/20' : 'bg-[#f6465d] hover:bg-[#c9364b] shadow-[#f6465d]/20'}`}>
                                {!account ? 'Connect Wallet' : orderStatus === 'loading' ? 'Executing...' : orderStatus === 'approving' ? 'Approving Token...' : orderStatus === 'success' ? '✓ Order Filled!' : orderSide === 'buy' ? 'Buy / Long' : 'Sell / Short'}
                            </button>

                            <div className="flex items-center justify-between mt-3">
                                <p className="text-[10px] text-[#848e9c]">
                                    {market?.isDex ? 'Via PancakeSwap Router · ~1% slippage' : '5% fee · 60% LP · 40% Treasury'}
                                </p>
                                <a href={`https://pancakeswap.finance/swap?outputCurrency=${selectedToken?.contract_address}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="text-[10px] text-[#848e9c] hover:text-amber-400 flex items-center gap-1 transition-colors">
                                    <ExternalLink className="w-2.5 h-2.5" /> PancakeSwap
                                </a>
                            </div>
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
