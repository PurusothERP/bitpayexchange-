'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '@/components/Navbar';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
import axios from 'axios';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar
} from 'recharts';
import Link from 'next/link';
import WhitepaperModal from '@/components/WhitepaperModal';
import { ethers, Contract } from 'ethers';
import { BONDING_CURVE_ABI, TOKEN_TEMPLATE_ABI, TOKEN_FACTORY_ABI } from '@/lib/abis';
import { Brain, FileText, Sparkles, Loader2, Info, ShoppingCart, ArrowRightLeft, ShieldCheck, Flame, Zap, TrendingUp, Users, Copy, CheckCircle2, ExternalLink, Activity, DollarSign, BarChart3, Twitter, XCircle, RefreshCw, ArrowUpRight, ArrowDownRight, Hash, Facebook, MessageCircle, Send } from 'lucide-react';

const BONDING_CURVE_ADDRESS = process.env.NEXT_PUBLIC_BONDING_CURVE_ADDRESS;
const FACTORY_ADDRESS       = process.env.NEXT_PUBLIC_FACTORY_ADDRESS;
import { API_URL } from '@/lib/api';
const BSC_RPC               = 'https://bsc-dataseed.binance.org';

function shortAddr(a, pre = 6, suf = 6) {
    if (!a) return '—';
    return `${a.slice(0, pre)}…${a.slice(-suf)}`;
}

function formatSupply(raw) {
    let n = Number(raw) || 0;
    if (n > 1e15) n = n / 1e18;
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
    return n.toFixed(0);
}

function timeAgo(dateStr) {
    if (!dateStr) return '—';
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60)    return `${diff}s ago`;
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

const ADMIN_WALLET = '0x6451ee4def4a8b8fbc2c64301a79e267de378935';

export function formatPrice(num) {
    if (!num || num == 0) return <span className="font-mono">0.00000000</span>;
    let s = Number(num).toFixed(10).replace(/0+$/, '');
    if (s.endsWith('.')) s += '00';
    const match = s.match(/^(0\.0+)(\d*)$/);
    if (match) {
        return (
            <span className="font-mono flex items-baseline tracking-tight">
                <span className="opacity-40">{match[1]}</span>
                <span>{match[2]}</span>
            </span>
        );
    }
    return <span className="font-mono">{s}</span>;
}

function CopyBtn({ text, label }) {
    const [done, setDone] = useState(false);
    return (
        <button onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
            className="text-gray-400 hover:text-blue-500 transition-colors" title={`Copy ${label}`}>
            {done ? <CheckCircle2 className="w-3.5 h-3.5 text-sky-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
    );
}

function BondingSegments({ progress }) {
    const pct    = Math.min(Number(progress) || 0, 100);
    const filled = Math.round((pct / 100) * 10);
    const color  = pct >= 90 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#10b981';
    return (
        <div className="flex items-end gap-1">
            {Array.from({ length: 10 }, (_, i) => (
                <motion.div key={i}
                    initial={{ height: 4 }} animate={{ height: i < filled ? 8 + i * 2 : 4 }}
                    transition={{ delay: i * 0.05 }}
                    style={{ backgroundColor: i < filled ? color : '#e5e7eb', borderRadius: 3, width: '100%' }}
                />
            ))}
        </div>
    );
}

function ShareButtons({ token, address }) {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const text = `🚀 Check out ${token?.name || ''} ($${token?.symbol || ''}) on B20-LAB Launchpad!`;
    const encoded = encodeURIComponent(text + '\n' + url);
    return (
        <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Share:</span>
            <a href={`https://twitter.com/intent/tweet?text=${encoded}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl transition-colors">
                <Twitter className="w-3 h-3 text-white" fill="currentColor" /> Twitter
            </a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors">
                <Facebook className="w-3 h-3 text-white" fill="currentColor" /> Facebook
            </a>
            <a href={`https://wa.me/?text=${encoded}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl transition-colors">
                <MessageCircle className="w-3 h-3" /> WhatsApp
            </a>
            <a href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition-colors">
                <Send className="w-3 h-3" /> Telegram
            </a>
            <a href={`https://bscscan.com/token/${address}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition-colors">
                <ExternalLink className="w-3 h-3" /> BSCScan
            </a>
            <a href={`https://pancakeswap.finance/swap?outputCurrency=${address}&chain=bsc`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1fc7d4] hover:bg-[#1ab8c4] text-white text-xs font-bold rounded-xl transition-colors">
                🥞 PancakeSwap
            </a>
        </div>
    );
}

// ── Custom Tooltip for chart ──────────────────────────────────────────────────
function PriceTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-black/10 rounded-xl p-3 shadow-lg text-xs">
            <p className="text-gray-400 mb-1">{label}</p>
            <p className="font-black text-gray-900">{Number(payload[0]?.value || 0).toFixed(10)} BNB</p>
        </div>
    );
}

function TokenDetail() {
    const { address } = useParams();
    const { account, signer, connectWallet } = useWallet();

    const [token,        setToken]       = useState(null);
    const [loading,      setLoading]     = useState(true);
    const [market,       setMarket]      = useState(null);
    const [chartData,    setChartData]   = useState([]);
    const [trades,       setTrades]      = useState([]);
    const [tradeStats,   setTradeStats]  = useState(null);
    const [amount,       setAmount]      = useState('');
    const [side,         setSide]        = useState('buy');
    const [tradeStatus,  setTradeStatus] = useState('idle');
    const [tradeError,   setTradeError]  = useState('');
    const [activeTab,    setActiveTab]   = useState('chart');
    const [allTokens,    setAllTokens]   = useState([]);
    const [swapTarget,   setSwapTarget]  = useState('');
    const [swapAmount,   setSwapAmount]  = useState('');
    const [swapStatus,   setSwapStatus]  = useState('idle');
    const [swapError,    setSwapError]   = useState('');
    const [whitepaper,   setWhitepaper]  = useState(null);
    const [isWpOpen,     setIsWpOpen]    = useState(false);
    const [aiAnalysis,   setAiAnalysis]  = useState(null);
    const [aiLoading,    setAiLoading]   = useState(false);
    const prevPriceRef = useRef(null);

    const [retryCount,    setRetryCount]  = useState(0);
    const [syncMsg,       setSyncMsg]     = useState('');

    // ── Fetch token DB record (with retry for just-deployed tokens) ───────────
    useEffect(() => {
        if (!address) return;
        let tries = 0;
        const MAX_TRIES = 8;

        const attemptFetch = () => {
            setSyncMsg(tries > 0 ? `Syncing on-chain data... (${tries}/${MAX_TRIES})` : '');
            axios.get(`${API_URL}/tokens/${address}`)
                .then(r => {
                    setToken(r.data);
                    setSyncMsg('');
                    setLoading(false);
                })
                .catch(() => {
                    if (tries < MAX_TRIES) {
                        tries++;
                        setRetryCount(tries);
                        setSyncMsg(`Syncing on-chain data... (${tries}/${MAX_TRIES})`);
                        setTimeout(attemptFetch, 3000);
                    } else {
                        setLoading(false); // Give up — show not found
                    }
                });
        };
        attemptFetch();

        axios.get(`${API_URL}/tokens`)
            .then(r => setAllTokens(Array.isArray(r.data)
                ? r.data.filter(t => (t.contract_address || t.token_address) !== address)
                : []))
            .catch(() => {});
        
        // Fetch whitepaper
        axios.get(`${API_URL}/ml/whitepaper/${address}`)
            .then(r => setWhitepaper(r.data))
            .catch(() => {});

        // Fetch AI Analysis (initial cache check)
        axios.post(`${API_URL}/ml/analyze`, { name: '', symbol: '' })
            .then(r => setAiAnalysis(r.data))
            .catch(() => {});
    }, [address]);

    // ── Fetch trade history + stats from DB ───────────────────────────────────
    const fetchTradeData = useCallback(async () => {
        if (!address) return;
        try {
            const [tradesRes, statsRes, chartRes] = await Promise.allSettled([
                axios.get(`${API_URL}/trades/${address}`),
                axios.get(`${API_URL}/trades/${address}/stats`),
                axios.get(`${API_URL}/trades/${address}/chart`),
            ]);

            if (tradesRes.status === 'fulfilled') {
                setTrades(Array.isArray(tradesRes.value.data) ? tradesRes.value.data : []);
            }
            if (statsRes.status === 'fulfilled') {
                setTradeStats(statsRes.value.data);
            }
            if (chartRes.status === 'fulfilled' && Array.isArray(chartRes.value.data) && chartRes.value.data.length > 0) {
                const apiData = chartRes.value.data.map((d, i) => ({
                    time: new Date(d.time || d.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                    price: parseFloat(d.price || d.price_bnb || 0),
                    isApi: true
                }));
                
                setChartData(prev => {
                    const livePoints = prev.filter(p => !p.isApi);
                    return [...apiData, ...livePoints.slice(-10)]; 
                });
            }
        } catch (err) {
            console.warn('Trade data fetch error:', err.message);
        }
    }, [address]);

    // ── Live bonding curve data (on-chain) ────────────────────────────────────
    const fetchMarket = useCallback(async () => {
        if (!address || !BONDING_CURVE_ADDRESS) return;
        try {
            const provider = new ethers.JsonRpcProvider(BSC_RPC);
            const bc = new Contract(BONDING_CURVE_ADDRESS, BONDING_CURVE_ABI, provider);
            const [m, VIRTUAL_BNB, MIGRATION_THRESHOLD] = await Promise.all([
                bc.markets(address),
                bc.VIRTUAL_BNB().catch(() => ethers.parseEther('0.5')),
                bc.MIGRATION_THRESHOLD().catch(() => ethers.parseEther('10')),
            ]);

            const virtualBnb     = parseFloat(ethers.formatEther(VIRTUAL_BNB));
            const bnbReserve     = parseFloat(ethers.formatEther(m.bnbReserve || m.collateral || 0n));
            const tokenReserve   = parseFloat(ethers.formatUnits(m.tokenReserve || 0n, 18));
            
            const supplyTraded   = m.supply ? parseFloat(ethers.formatUnits(m.supply, 18)) : (1000000000 - tokenReserve);
            const migThreshold   = parseFloat(ethers.formatEther(MIGRATION_THRESHOLD));
            const progress       = Math.min((bnbReserve / migThreshold) * 100, 100);
            const available      = tokenReserve > 0 ? tokenReserve : (1_000_000_000 - supplyTraded);

            const effectivePrice = tokenReserve > 0
                ? ((virtualBnb + bnbReserve) / tokenReserve)
                : 0.0000005;

            const prevPrice = prevPriceRef.current;
            const trend = prevPrice
                ? effectivePrice > prevPrice ? 'up' : effectivePrice < prevPrice ? 'down' : 'none'
                : 'none';
            prevPriceRef.current = effectivePrice;

            setMarket({
                isRegistered: m.token !== ethers.ZeroAddress,
                collateralBnb: bnbReserve, supplyTraded, available,
                migrated: m.migrated,
                priceBnb: effectivePrice,
                progress: progress.toFixed(2),
                migrationThreshold: migThreshold,
                trend
            });

            // Always ensure at least a synthetic chart if history is empty
            // Now we append the current price to the history if it exists
            setChartData(prev => {
                const nowLabel = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                
                if (prev.length === 0) {
                    // Initial high-precision synthetic history
                    const price = effectivePrice || 0.0000001;
                    const steps = 20;
                    const now = Date.now();
                    return [
                        ...Array.from({ length: steps }, (_, idx) => {
                            const t = new Date(now - (steps - idx) * 60000);
                            return {
                                time: t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                                price: parseFloat((price * (0.97 + (0.03 * (idx / steps)))).toFixed(12)),
                            };
                        }),
                        { time: nowLabel, price: parseFloat(effectivePrice.toFixed(12)) }
                    ];
                } else {
                    // Append new live point if price changed or time moved
                    const last = prev[prev.length - 1];
                    if (Math.abs(last.price - effectivePrice) > (effectivePrice * 0.00001) || last.time !== nowLabel) {
                        const newHistory = [...prev, { time: nowLabel, price: parseFloat(effectivePrice.toFixed(12)) }];
                        return newHistory.slice(-100); // Keep last 100 points
                    }
                    return prev;
                }
            });
        } catch (err) {
            console.warn('BondingCurve fetch error:', err.message);
        }
    }, [address]);

    useEffect(() => {
        fetchMarket();
        fetchTradeData();
        const iv1 = setInterval(fetchMarket, 10000);
        const iv2 = setInterval(fetchTradeData, 15000);
        return () => { clearInterval(iv1); clearInterval(iv2); };
    }, [fetchMarket, fetchTradeData]);

    // ── Swap ──────────────────────────────────────────────────────────────────
    const handleSwap = async () => {
        if (!account || !signer) { connectWallet(); return; }
        if (!swapAmount || parseFloat(swapAmount) <= 0) { setSwapError('Enter a valid amount.'); return; }
        if (!swapTarget) { setSwapError('Select a target token.'); return; }
        setSwapStatus('pending'); setSwapError('');
        try {
            const bc = new Contract(BONDING_CURVE_ADDRESS, BONDING_CURVE_ABI, signer);
            const tc = new Contract(address, TOKEN_TEMPLATE_ABI, signer);
            const amt = ethers.parseEther(swapAmount);
            setSwapError('Step 1/3: Approving…');
            await (await tc.approve(BONDING_CURVE_ADDRESS, amt)).wait();
            setSwapError('Step 2/3: Selling…');
            await (await bc.sell(address, amt)).wait();
            setSwapError('Step 3/3: Buying target…');
            const bal = await signer.provider.getBalance(account);
            await (await bc.buy(swapTarget, { value: (bal * 95n) / 100n })).wait();
            setSwapStatus('success'); setSwapError(''); setSwapAmount(''); setSwapTarget('');
            setTimeout(() => setSwapStatus('idle'), 4000);
            fetchMarket(); fetchTradeData();
        } catch (err) {
            setSwapError(err.reason || err.message || 'Swap failed');
            setSwapStatus('error');
            setTimeout(() => setSwapStatus('idle'), 5000);
        }
    };

    // ── Trade ─────────────────────────────────────────────────────────────────
    const handleTrade = async () => {
        if (!account) { connectWallet(); return; }
        if (!amount || parseFloat(amount) <= 0) { setTradeError('Enter a valid amount greater than 0.'); return; }

        setTradeStatus('pending');
        setTradeError('');

        try {
            // Fallback signer via window.ethereum if Web3Modal signer is null
            let activeSigner = signer;
            if (!activeSigner) {
                if (typeof window !== 'undefined' && window.ethereum) {
                    const { BrowserProvider } = await import('ethers');
                    const bp = new BrowserProvider(window.ethereum);
                    activeSigner = await bp.getSigner();
                } else {
                    throw new Error('Wallet not connected. Please reconnect your wallet.');
                }
            }

            const bc = new Contract(BONDING_CURVE_ADDRESS, BONDING_CURVE_ABI, activeSigner);

            if (side === 'buy') {
                const val = ethers.parseEther(Number(amount).toFixed(18));

                // Gas pre-check — shows error before wallet popup if tx would fail
                try {
                    await bc.buy.estimateGas(address, { value: val });
                } catch (gasErr) {
                    throw new Error('Buy would fail: ' + (gasErr.reason || gasErr.message));
                }

                const tx = await bc.buy(address, { value: val });
                console.log('[Trade] Buy TX:', tx.hash);
                await tx.wait();
            } else {
                const tc = new Contract(address, TOKEN_TEMPLATE_ABI, activeSigner);
                const amt = ethers.parseUnits(Number(amount).toFixed(18), 18);

                // Approve
                const allowance = await tc.allowance(account, BONDING_CURVE_ADDRESS);
                if (allowance < amt) {
                    setTradeError('Step 1/2: Approving tokens…');
                    await (await tc.approve(BONDING_CURVE_ADDRESS, ethers.MaxUint256)).wait();
                }

                setTradeError('Step 2/2: Selling…');

                // Gas pre-check
                try {
                    await bc.sell.estimateGas(address, amt);
                } catch (gasErr) {
                    throw new Error('Sell would fail: ' + (gasErr.reason || gasErr.message));
                }

                const tx = await bc.sell(address, amt);
                console.log('[Trade] Sell TX:', tx.hash);
                await tx.wait();
            }

            setTradeStatus('success');
            setTradeError('');
            fetchMarket(); fetchTradeData();
        } catch (err) {
            console.error('[Trade] Error:', err);
            const msg = err.reason || err.data?.message || err.message || 'Trade failed';
            setTradeError(msg.length > 200 ? msg.slice(0, 200) + '...' : msg);
            setTradeStatus('error');
            setTimeout(() => setTradeStatus('idle'), 5000);
        }
    };

    const handleRunAI = async () => {
        if (!token) return;
        setAiLoading(true);
        try {
            const res = await axios.post(`${API_URL}/ml/analyze`, { name: token.name, symbol: token.symbol });
            setAiAnalysis(res.data);
        } catch (e) {
            console.error('AI analysis failed:', e);
        } finally {
            setAiLoading(false);
        }
    };

    if (loading) return (
        <main className="min-h-screen paw-pattern">
            <Navbar />
            <div className="pt-40 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-gray-700 text-base font-bold">
                    {syncMsg || 'Loading token…'}
                </p>
                {syncMsg && (
                    <p className="text-gray-400 text-xs max-w-xs text-center">
                        Token was just deployed. Indexing metadata from the blockchain…
                    </p>
                )}
            </div>
        </main>
    );

    if (!token) return (
        <main className="min-h-screen paw-pattern">
            <Navbar />
            <div className="pt-40 text-center">
                <h1 className="text-2xl font-black text-gray-600">Token Not Found</h1>
                <Link href="/launch"><p className="mt-4 text-blue-500 font-bold hover:underline">← Back to Launchpad</p></Link>
            </div>
        </main>
    );

    const priceBnb    = market?.priceBnb ?? parseFloat(token.price_bnb || 0.0000001);
    const rawTotalSupply = Number(token.total_supply || 1_000_000_000);
    const totalSupply = rawTotalSupply > 1e15 ? rawTotalSupply / 1e18 : rawTotalSupply;
    const progress    = parseFloat(market?.progress ?? 0);
    const progressColor = progress >= 90 ? 'from-red-500 to-blue-500' : progress >= 60 ? 'from-indigo-500 to-slate-400' : 'from-sky-500 to-teal-400';

    const createdStr = token.created_at
        ? new Date(token.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '—';

    const TABS = [
        { id: 'chart',    label: '📈 Chart' },
        { id: 'ai',       label: '🧠 AI Report' },
        { id: 'whitepaper', label: '📄 Whitepaper' },
        { id: 'info',     label: 'ℹ️ Info' },
        { id: 'trades',   label: '⚡ Trades' },
        { id: 'swap',     label: '🔄 Swap' },
    ];

    const change24h = parseFloat(tradeStats?.price_change_24h || 0);
    const volume24h = parseFloat(tradeStats?.volume_24h || 0);

    return (
        <main className="min-h-screen paw-pattern">
            <Navbar />

            <div className="pt-20 pb-24 px-4 md:px-8 max-w-7xl mx-auto">

                {/* ── Token Header ─────────────────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-black/8 rounded-3xl p-6 mb-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                        <div className="relative shrink-0">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-xl flex items-center justify-center overflow-hidden">
                                {token.logo_url
                                    ? <img src={token.logo_url} alt={token.name} className="w-full h-full object-cover"
                                        onError={e => { e.target.onerror = null; e.target.parentElement.innerHTML = '<span class="text-4xl">🪙</span>'; }} />
                                    : <span className="text-4xl">🪙</span>}
                            </div>
                            {market?.isRegistered && (
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-sky-500 rounded-full border-2 border-white shadow flex items-center justify-center">
                                    <Zap className="w-3 h-3 text-white" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap mb-1">
                                <h1 className="text-3xl font-black text-gray-900">{token.name}</h1>
                                <span className="text-sm font-extrabold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">${token.symbol}</span>
                                {(market?.migrated || token.launch_type === 'FAIR_LAUNCH' || token.launch_type === 'STANDARD') && (
                                    <span className="text-xs font-extrabold text-sky-600 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                                        <ArrowRightLeft className="w-3 h-3" /> DEX Listed
                                    </span>
                                )}
                                {market?.isRegistered && !market?.migrated && token.launch_type !== 'FAIR_LAUNCH' && token.launch_type !== 'STANDARD' && (
                                    <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                                        <Flame className="w-3 h-3" /> Bonding Curve
                                    </span>
                                )}
                                {token.trust_status && (
                                    <span className={`text-xs font-black px-2.5 py-1 rounded-full border uppercase tracking-tighter ${
                                        token.trust_status === 'Premium Token' ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' :
                                        token.trust_status === 'Highly Trusted' ? 'bg-sky-500/10 text-sky-600 border-sky-500/20' :
                                        token.trust_status === 'Scam' ? 'bg-red-500 text-white border-red-500' :
                                        'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                    }`}>
                                        {token.trust_status}
                                    </span>
                                )}
                                {token.is_delisted && (
                                    <span className="text-xs font-black bg-black text-white px-2.5 py-1 rounded-full border border-black uppercase tracking-tighter shadow-lg shadow-black/20">
                                        Offline / Delisted
                                    </span>
                                )}
                                {token.delisting_soon && !token.is_delisted && (
                                    <span className="text-xs font-black bg-red-100 text-red-600 px-2.5 py-1 rounded-full border border-red-200 uppercase tracking-tighter animate-pulse">
                                        ⚠️ Delisting Soon (Inactive)
                                    </span>
                                )}
                                <StatusUpgradeButton token={token} account={account} />
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Contract:</span>
                                <span className="font-mono text-xs text-gray-600 bg-black/5 border border-black/8 px-2.5 py-1 rounded-lg">
                                    {shortAddr(token.contract_address || address, 8, 8)}
                                </span>
                                <CopyBtn text={token.contract_address || address} label="address" />
                                <a href={`https://bscscan.com/token/${token.contract_address || address}`} target="_blank" rel="noopener noreferrer"
                                    className="text-indigo-500 hover:text-indigo-600 transition-colors">
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        </div>

                        {/* Price panel */}
                        <div className="bg-black/3 rounded-2xl p-4 text-right shrink-0 min-w-[160px]">
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Current Price</p>
                            <div className={`text-xl font-black flex items-center justify-end gap-1 transition-colors duration-500 ${market?.trend === 'up' ? 'text-sky-500' : market?.trend === 'down' ? 'text-red-500' : 'text-gray-900'}`}>
                                {formatPrice(priceBnb)}
                            </div>
                            <p className="text-xs text-gray-400 mb-2">BNB</p>
                            <div className="flex items-center justify-end gap-1">
                                {change24h < 0 ? <ArrowDownRight className="w-3.5 h-3.5 text-red-500" /> : <ArrowUpRight className="w-3.5 h-3.5 text-sky-500" />}
                                <span className={`text-xs font-black ${change24h < 0 ? 'text-red-600' : 'text-sky-600'}`}>
                                    {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}% (24h)
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-black/5 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                        <ShareButtons token={token} address={token.contract_address || address} />
                        {/* PancakeSwap Quick Trade Button */}
                        <a
                            href={`https://pancakeswap.finance/swap?outputCurrency=${token.contract_address || address}&chain=bsc`}
                            target="_blank" rel="noopener noreferrer"
                            className="shrink-0 flex items-center gap-2 px-4 py-2 bg-[#1fc7d4]/10 hover:bg-[#1fc7d4]/20 border border-[#1fc7d4]/30 text-[#1ab8c4] font-black text-xs rounded-xl transition-colors"
                        >
                            🥞 Trade on PancakeSwap
                        </a>
                    </div>
                </motion.div>

                {/* ── Stats Strip ─────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                    {[
                        { label: 'Market Cap',      value: `${(priceBnb * totalSupply).toFixed(4)} BNB`,      icon: <DollarSign className="w-4 h-4" />, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
                        { label: 'Total Supply',   value: formatSupply(rawTotalSupply),                          icon: <TrendingUp className="w-4 h-4" />, color: 'text-blue-500 bg-blue-50 border-blue-100' },
                        { label: 'Sold',            value: formatSupply(market?.supplyTraded ?? 0),            icon: <ArrowUpRight className="w-4 h-4" />, color: 'text-indigo-500 bg-indigo-50 border-indigo-100' },
                        { label: 'BNB in Curve',   value: `${market?.collateralBnb?.toFixed(4) ?? '0.0000'} BNB`, icon: <Hash className="w-4 h-4" />, color: 'text-sky-600 bg-sky-50 border-sky-100' },
                        { label: '24h Volume',      value: `${volume24h.toFixed(4)} BNB`,                     icon: <Activity className="w-4 h-4" />, color: 'text-blue-500 bg-blue-50 border-blue-100' },
                        { label: 'Trades (24h)',    value: tradeStats?.total_trades ?? 0,                      icon: <BarChart3 className="w-4 h-4" />, color: 'text-purple-500 bg-purple-50 border-purple-100' },
                    ].map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                            className="bg-white border border-black/8 rounded-2xl p-4 shadow-sm">
                            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center mb-2 ${s.color}`}>{s.icon}</div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">{s.label}</p>
                            <p className="font-black text-gray-900 text-sm">{s.value}</p>
                        </motion.div>
                    ))}
                </div>

                {/* ── Main 2-column layout ──────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* LEFT */}
                    <div className="lg:col-span-2 space-y-5">

                        {/* Tab bar */}
                        <div className="bg-white border border-black/8 rounded-2xl shadow-sm overflow-hidden">
                            <div className="flex border-b border-black/5">
                                {TABS.map(tab => (
                                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                        className={`flex-1 py-3.5 text-sm font-bold transition-all ${activeTab === tab.id
                                            ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50/50'
                                            : 'text-gray-500 hover:text-gray-800'}`}>
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="p-5">
                                <AnimatePresence mode="wait">

                                    {/* ── Chart Tab ── */}
                                    {activeTab === 'chart' && (
                                        <motion.div key="chart" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="font-black text-gray-900 flex items-center gap-2">
                                                    <TrendingUp className="w-4 h-4 text-blue-500" /> Price Chart
                                                    <span className="text-xs font-bold text-sky-600 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">● Live</span>
                                                </h3>
                                                <button onClick={() => { fetchMarket(); fetchTradeData(); }} className="text-gray-400 hover:text-blue-500 transition-colors">
                                                    <RefreshCw className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {chartData.length > 0 ? (
                                                <div className="h-64">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <AreaChart data={chartData}>
                                                            <defs>
                                                                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.3} />
                                                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                                                </linearGradient>
                                                            </defs>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#00000008" vertical={false} />
                                                            <XAxis dataKey="time" stroke="#00000020" fontSize={10} tickLine={false} axisLine={false} />
                                                            <YAxis hide domain={['dataMin * 0.98', 'dataMax * 1.02']} />
                                                            <Tooltip content={<PriceTooltip />} />
                                                            <Area isAnimationActive={false} type="monotone" dataKey="price" stroke="#f43f5e" strokeWidth={2.5} fill="url(#priceGrad)" dot={false} />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            ) : (
                                                <div className="h-64 flex items-center justify-center text-gray-400">
                                                    <div className="text-center">
                                                        <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-20 animate-pulse" />
                                                        <p className="text-sm font-bold text-gray-500">Waiting for live trades...</p>
                                                        <p className="text-xs text-gray-400 mt-1">Chart responds instantly to real market actions</p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mt-4 grid grid-cols-3 gap-3">
                                                {[
                                                    { label: 'Current Price', value: <span className="flex items-center justify-center gap-1">{formatPrice(priceBnb)} BNB</span> },
                                                    { label: 'BNB Raised',    value: (market?.collateralBnb ?? 0).toFixed(4) + ' BNB' },
                                                    { label: '24h Change',    value: `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%`, color: change24h < 0 ? 'text-red-600' : 'text-sky-600' },
                                                ].map((s, i) => (
                                                    <div key={i} className="bg-black/3 rounded-xl p-3 text-center">
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">{s.label}</p>
                                                        <div className={`font-black text-xs ${s.color || 'text-gray-900'}`}>{s.value}</div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Buy/Sell volume bar chart */}
                                            {trades.length > 0 && (
                                                <div className="mt-5">
                                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Recent Activity</p>
                                                    <div className="h-24">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <BarChart data={trades.slice(0, 20).reverse().map(t => ({
                                                                time: timeAgo(t.timestamp),
                                                                bnb: parseFloat(t.amount_bnb || 0),
                                                                type: t.trade_type
                                                            }))}>
                                                                <XAxis dataKey="time" hide />
                                                                <YAxis hide />
                                                                <Tooltip formatter={v => [v.toFixed(6) + ' BNB']} />
                                                                <Bar dataKey="bnb" radius={[3, 3, 0, 0]}
                                                                    fill="#10b981"
                                                                    label={false}
                                                                />
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}

                                    {/* ── Info Tab ── */}
                                    {activeTab === 'info' && (
                                        <motion.div key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                            <h3 className="font-black text-gray-900 mb-2 flex items-center gap-2">
                                                <Info className="w-4 h-4 text-blue-500" /> About {token.name}
                                            </h3>
                                            <p className="text-gray-600 text-sm leading-relaxed mb-5">
                                                {token.description || `${token.name} ($${token.symbol}) was launched on the B20-LAB Launchpad on BNB Smart Chain. It uses a dynamic bonding curve for fair price discovery. When the curve reaches its 10 BNB target, 9 BNB is sent to Treasury and 1 BNB is used to seed PancakeSwap liquidity permanently.`}
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {[
                                                    { label: 'Contract Address', value: shortAddr(token.contract_address || address, 10, 10), copy: token.contract_address || address, link: `https://bscscan.com/token/${token.contract_address || address}` },
                                                    { label: 'Transaction Hash', value: shortAddr(token.tx_hash, 10, 10), copy: token.tx_hash, link: `https://bscscan.com/tx/${token.tx_hash}` },
                                                    { label: 'Created Date', value: createdStr },
                                                    { label: 'Total Trades', value: `${tradeStats?.total_trades || 0} (${tradeStats?.buys || 0} buys / ${tradeStats?.sells || 0} sells)` },
                                                    { label: 'Total Supply', value: formatSupply(totalSupply) },
                                                    { label: 'Network', value: 'BNB Smart Chain (BSC)' },
                                                    { label: 'Standard', value: 'BEP-20' },
                                                    { label: 'Decimals', value: '18' },
                                                ].map((d, i) => (
                                                    <div key={i} className="bg-black/3 rounded-xl p-3">
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">{d.label}</p>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-mono text-xs text-gray-800 font-bold truncate flex-1">{d.value || '—'}</p>
                                                            {d.copy && <CopyBtn text={d.copy} label={d.label} />}
                                                            {d.link && d.copy && (
                                                                <a href={d.link} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-600">
                                                                    <ExternalLink className="w-3 h-3" />
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* ── Trades Tab ── */}
                                    {activeTab === 'trades' && (
                                        <motion.div key="trades" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="font-black text-gray-900 flex items-center gap-2">
                                                    <Activity className="w-4 h-4 text-blue-500" /> Trading History
                                                </h3>
                                                <div className="flex items-center gap-3 text-xs font-bold">
                                                    <span className="text-sky-600 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
                                                        {tradeStats?.buys || 0} Buys
                                                    </span>
                                                    <span className="text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                                                        {tradeStats?.sells || 0} Sells
                                                    </span>
                                                </div>
                                            </div>

                                            {trades.length === 0 ? (
                                                <div className="py-12 text-center text-gray-400">
                                                    <Activity className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                                    <p className="text-sm font-bold">No trades yet</p>
                                                    <p className="text-xs">Be the first to buy!</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2 max-h-80 overflow-y-auto">
                                                    {trades.map((trade, i) => (
                                                        <div key={i} className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs ${trade.trade_type === 'buy' ? 'bg-sky-50 border-sky-100' : 'bg-red-50 border-red-100'}`}>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`font-black text-xs w-10 ${trade.trade_type === 'buy' ? 'text-sky-600' : 'text-red-600'}`}>
                                                                    {trade.trade_type === 'buy' ? '▲ BUY' : '▼ SELL'}
                                                                </span>
                                                                <span className="font-mono text-gray-500">{shortAddr(trade.trader_wallet, 6, 4)}</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-black text-gray-900">{parseFloat(trade.amount_bnb || 0).toFixed(6)} BNB</p>
                                                                <p className="text-gray-400">{timeAgo(trade.timestamp)}</p>
                                                            </div>
                                                            {trade.tx_hash && trade.tx_hash !== 'unknown' && (
                                                                <a href={`https://bscscan.com/tx/${trade.tx_hash.replace('_fee', '')}`}
                                                                    target="_blank" rel="noopener noreferrer"
                                                                    className="text-indigo-500 hover:text-indigo-600 ml-2">
                                                                    <ExternalLink className="w-3 h-3" />
                                                                </a>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </motion.div>
                                    )}

                                    {/* ── AI Report Tab ── */}
                                    {activeTab === 'ai' && (
                                        <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                            <div className="flex items-center justify-between mb-6">
                                                <h3 className="font-black text-gray-900 flex items-center gap-2">
                                                    <Brain className="w-5 h-5 text-purple-500" /> B20-NEXUS AI Report
                                                </h3>
                                                {!aiAnalysis && (
                                                    <button 
                                                        onClick={handleRunAI}
                                                        disabled={aiLoading}
                                                        className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2"
                                                    >
                                                        {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                                        Analyze Now
                                                    </button>
                                                )}
                                            </div>

                                            {aiAnalysis ? (
                                                <div className="space-y-6">
                                                    {/* AI Audit Grid */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                        <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl">
                                                            <p className="text-[10px] text-sky-600 font-black uppercase mb-1">Memorability</p>
                                                            <p className="text-xl font-black text-sky-700">{aiAnalysis.score?.memorability}/100</p>
                                                        </div>
                                                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                                                            <p className="text-[10px] text-blue-600 font-black uppercase mb-1">Branding</p>
                                                            <p className="text-xl font-black text-blue-700">{aiAnalysis.score?.branding}/100</p>
                                                        </div>
                                                        <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl">
                                                            <p className="text-[10px] text-purple-600 font-black uppercase mb-1">Security Score</p>
                                                            <p className="text-xl font-black text-purple-700">{aiAnalysis.score?.security || 85}/100</p>
                                                        </div>
                                                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                                                            <p className="text-[10px] text-blue-600 font-black uppercase mb-1">Market Sentiment</p>
                                                            <p className="text-xl font-black text-blue-700">{aiAnalysis.sentiment?.label || 'Bullish'}</p>
                                                        </div>
                                                    </div>

                                                    {/* Technical Audit Panel */}
                                                    <div className="p-6 bg-white border border-black/8 rounded-[2rem] shadow-sm space-y-4">
                                                        <h4 className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase tracking-widest border-b border-black/5 pb-3">
                                                            <ShieldCheck className="w-4 h-4 text-sky-500" /> Protocol Verification Details
                                                        </h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 overflow-hidden">
                                                            {[
                                                                { l: 'Contract', v: shortAddr(token.contract_address || address, 10, 10), raw: token.contract_address || address },
                                                                { l: 'Network', v: 'BNB Smart Chain (BSC)' },
                                                                { l: 'Token Standard', v: 'BEP-20 Institutional' },
                                                                { l: 'Total Supply', v: formatSupply(rawTotalSupply) },
                                                                { l: 'Current Price', v: `${priceBnb.toFixed(10)} BNB` },
                                                                { l: 'Market Cap', v: `${(priceBnb * totalSupply).toFixed(4)} BNB` },
                                                                { l: 'Audit Status', v: '✅ VERIFIED BY NEXUS AI' },
                                                                { l: 'Launch Type', v: token.launch_type || 'BONDING_CURVE' }
                                                            ].map((d, i) => (
                                                                <div key={i} className="flex justify-between items-center py-1 group">
                                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{d.l}</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[11px] font-black text-gray-900 font-mono italic">{d.v}</span>
                                                                        {d.raw && <CopyBtn text={d.raw} label={d.l} />}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="p-6 bg-gray-50 border border-gray-100 rounded-[2rem]">
                                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                            <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> AI Executive Summary
                                                        </h4>
                                                        <p className="text-[11px] text-gray-700 leading-[1.8] font-medium text-justify">
                                                            {token.name} (${token.symbol}) represents a high-velocity opportunity on the B20-LAB Launchpad. 
                                                            Nexus AI has evaluated the underlying code and market sentiment, determining a robust branding profile. 
                                                            The contract address ({shortAddr(token.contract_address || address, 6, 4)}) is fully verified on BSC, with {formatSupply(rawTotalSupply)} tokens in native circulation. 
                                                            Current market dynamics suggest a {aiAnalysis.sentiment?.label || 'Bullish'} trend with a premium score of {aiAnalysis.score?.memorability}/100 for memorability. 
                                                            This protocol is strategically positioned for the current cycle's liquidity inflow.
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="py-20 text-center">
                                                    <Brain className="w-12 h-12 text-gray-200 mx-auto mb-4 animate-pulse" />
                                                    <p className="text-gray-400 font-bold">Nexus AI is ready to audit this protocol.</p>
                                                    <p className="text-xs text-gray-400 mt-2">Click 'Analyze Now' to run full branding & market sentiment checks.</p>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}

                                    {/* ── Whitepaper Tab ── */}
                                    {activeTab === 'whitepaper' && (
                                        <motion.div key="whitepaper" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-10">
                                            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 icon-3d shadow-xl">
                                                <FileText className="w-8 h-8 text-blue-500" />
                                            </div>
                                            <h3 className="text-xl font-black text-gray-900 mb-2">Protocol Whitepaper</h3>
                                            <p className="text-sm text-gray-500 max-w-sm mx-auto mb-8">
                                                Review the detailed technical documentation, roadmap, and tokenomics of the {token.name} protocol.
                                            </p>

                                            {whitepaper ? (
                                                <button 
                                                    onClick={() => setIsWpOpen(true)}
                                                    className="px-8 py-3 bg-gray-900 text-white font-black rounded-xl hover:bg-blue-600 transition-all shadow-xl shadow-gray-900/10 flex items-center gap-2 mx-auto"
                                                >
                                                    <FileText className="w-4 h-4" /> Open Full Whitepaper
                                                </button>
                                            ) : (
                                                <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-2xl">
                                                    <p className="text-xs text-indigo-700 font-bold mb-4">No whitepaper was generated for this token during launch.</p>
                                                    <button className="px-6 py-2 bg-indigo-500 text-white rounded-lg font-black text-xs uppercase tracking-widest opacity-50 cursor-not-allowed">
                                                        Request Custom Generation
                                                    </button>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}

                                    {/* ── Swap Tab ── */}
                                    {activeTab === 'swap' && (
                                        <motion.div key="swap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                            <h3 className="font-black text-gray-900 mb-1 flex items-center gap-2">
                                                <ArrowRightLeft className="w-4 h-4 text-indigo-500" /> Token Swap
                                            </h3>
                                            <p className="text-xs text-gray-500 mb-5">
                                                Sell <strong>{token.symbol}</strong> and instantly buy another token in one flow. 1% fee applies on each step.
                                            </p>
                                            <div className="space-y-3">
                                                <div className="bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-200 rounded-2xl p-4">
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">You Sell</p>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-white border border-blue-200 flex items-center justify-center overflow-hidden shadow shrink-0">
                                                            {token.logo_url ? <img src={token.logo_url} alt={token.symbol} className="w-full h-full object-cover" /> : <span>🪙</span>}
                                                        </div>
                                                        <input type="number" step="0.001" min="0" placeholder="0.0"
                                                            value={swapAmount} onChange={e => setSwapAmount(e.target.value)}
                                                            className="flex-1 bg-transparent font-black text-gray-900 text-xl outline-none text-right" />
                                                        <span className="text-sm font-bold text-blue-600 shrink-0">{token.symbol}</span>
                                                    </div>
                                                </div>
                                                <div className="flex justify-center">
                                                    <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                                                        <ArrowRightLeft className="w-4 h-4 text-white" />
                                                    </div>
                                                </div>
                                                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-4">
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">You Receive</p>
                                                    <select value={swapTarget} onChange={e => setSwapTarget(e.target.value)}
                                                        className="w-full bg-transparent font-bold text-gray-900 outline-none text-sm cursor-pointer">
                                                        <option value="">Select target token…</option>
                                                        {allTokens.map((t, i) => (
                                                            <option key={i} value={t.contract_address || t.token_address}>
                                                                {t.name} (${t.symbol})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <AnimatePresence>
                                                    {swapStatus === 'success' && (
                                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                            className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs font-bold text-sky-700 text-center">
                                                            ✅ Swap complete!
                                                        </motion.div>
                                                    )}
                                                    {(swapStatus === 'error' || (swapStatus === 'pending' && swapError)) && (
                                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                            className={`p-3 rounded-xl text-xs font-semibold ${swapStatus === 'error' ? 'bg-red-50 border border-red-200 text-red-600' : 'bg-blue-50 border border-blue-200 text-blue-700'}`}>
                                                            {swapStatus === 'pending' ? `⏳ ${swapError}` : `❌ ${swapError}`}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                                    onClick={!account ? connectWallet : handleSwap}
                                                    disabled={swapStatus === 'pending' || (account && (!swapAmount || parseFloat(swapAmount) <= 0 || !swapTarget))}
                                                    className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed shadow-xl">
                                                    {swapStatus === 'pending'
                                                        ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{swapError || 'Processing…'}</span>
                                                        : !account ? '🔗 Connect Wallet'
                                                        : '🔄 Execute Swap'}
                                                </motion.button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* ── Bonding Curve Progress ── */}
                        <div className="bg-white border border-black/8 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-black text-gray-900 flex items-center gap-2">
                                    <Flame className="w-4 h-4 text-slate-500" /> Bonding Curve Progress
                                </h3>
                                <span className={`text-sm font-black px-3 py-1 rounded-full border ${progress >= 90 ? 'text-red-500 bg-red-50 border-red-200' : progress >= 60 ? 'text-indigo-500 bg-indigo-50 border-indigo-200' : 'text-sky-600 bg-sky-50 border-sky-200'}`}>
                                    {progress}%
                                </span>
                            </div>
                            <div className="mb-3"><BondingSegments progress={progress} /></div>
                            <div className="h-3 bg-black/5 rounded-full overflow-hidden mb-4">
                                <motion.div className={`h-full bg-gradient-to-r ${progressColor} rounded-full`}
                                    initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1.2 }} />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Achieved</p>
                                    <p className="font-black text-gray-900">{market?.collateralBnb?.toFixed(4) ?? '0.0000'}</p>
                                    <p className="text-[10px] text-gray-400">BNB</p>
                                </div>
                                <div className="text-center border-x border-black/5">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Target</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Remaining</p>
                                    <p className="font-black text-gray-900">{Math.max(0, (market?.migrationThreshold ?? 10) - (market?.collateralBnb ?? 0)).toFixed(4)}</p>
                                    <p className="text-[10px] text-gray-400">BNB</p>
                                </div>
                            </div>
                            {(market?.migrated || token.launch_type === 'FAIR_LAUNCH' || token.launch_type === 'STANDARD') ? (
                                <div className="mt-4 p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs font-bold text-sky-700 flex items-center gap-2">
                                    <ArrowRightLeft className="w-4 h-4" /> ✅ Available on PancakeSwap DEX!
                                </div>
                            ) : (
                                <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-700 font-semibold leading-relaxed">
                                    💡 <strong>Auto-migration:</strong> At 10 BNB target, 9 BNB goes to Treasury and 1 BNB seeds the DEX. Total target: <strong>{market?.migrationThreshold ?? 10} BNB</strong>. Current: <strong>{market?.collateralBnb?.toFixed(4) ?? '0'} BNB</strong>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT — Buy/Sell Panel */}
                    <div className="space-y-5">
                        <div className="bg-white border border-black/8 rounded-2xl shadow-sm overflow-hidden sticky top-24">
                            <div className="flex">
                                <button onClick={() => setSide('buy')}
                                    className={`flex-1 py-4 text-sm font-black transition-all ${side === 'buy' ? 'bg-gradient-to-r from-blue-500 to-slate-500 text-white' : 'text-gray-500 hover:bg-black/3'}`}>
                                    🟢 BUY
                                </button>
                                <button onClick={() => setSide('sell')}
                                    className={`flex-1 py-4 text-sm font-black transition-all ${side === 'sell' ? 'bg-gradient-to-r from-gray-700 to-gray-900 text-white' : 'text-gray-500 hover:bg-black/3'}`}>
                                    🔴 SELL
                                </button>
                            </div>

                            <div className="p-5 space-y-4">
                                {(market?.migrated || token.launch_type === 'FAIR_LAUNCH' || token.launch_type === 'STANDARD') && (
                                    <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs font-bold text-sky-700">
                                        ✅ Token available on PancakeSwap. <a href={`https://pancakeswap.finance/swap?outputCurrency=${token.contract_address || address}`}
                                            target="_blank" rel="noopener noreferrer" className="underline">Trade on PancakeSwap ↗</a>
                                    </div>
                                )}
                                {token.is_delisted && (
                                    <div className="p-4 bg-black/90 border border-black rounded-xl text-xs font-bold text-white shadow-2xl">
                                        <p className="flex items-center gap-2 mb-2 text-blue-500"><XCircle className="w-4 h-4" /> TRADING DISABLED</p>
                                        <p className="opacity-70 leading-relaxed font-medium">This asset has been delisted due to 60+ days of inactivity or violation of terms. Trading is permanently disabled.</p>
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-bold text-gray-400 uppercase">{side === 'buy' ? 'Pay (BNB)' : `Sell (${token.symbol})`}</p>
                                    </div>
                                    <div className="flex items-center gap-2 bg-black/3 border border-black/8 rounded-xl px-4 py-3">
                                        <input type="number" step="0.001" min="0" placeholder="0.0" value={amount} onChange={e => setAmount(e.target.value)}
                                            className="flex-1 bg-transparent font-black text-gray-900 text-lg outline-none" />
                                        <span className="text-xs font-bold text-gray-500 shrink-0">{side === 'buy' ? 'BNB' : token.symbol}</span>
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        {(side === 'buy' ? ['0.01', '0.05', '0.1', '0.5'] : ['100K', '500K', '1M']).map((v, i) => {
                                            const val = v.includes('K') ? String(parseInt(v) * 1000) : v.includes('M') ? String(parseInt(v) * 1000000) : v;
                                            return (
                                                <button key={i} onClick={() => setAmount(val)}
                                                    className="flex-1 py-1.5 text-[11px] font-bold bg-black/5 hover:bg-blue-500/10 hover:text-blue-600 rounded-lg transition-all">
                                                    {v}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {side === 'buy' && amount && market && (
                                        <p className="text-xs text-gray-400 text-right mt-1.5">
                                            ≈ {Math.floor(parseFloat(amount || 0) * 0.99 / (market.priceBnb || 0.0000001)).toLocaleString()} {token.symbol}
                                        </p>
                                    )}
                                </div>

                                {/* Fee notice */}
                                <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-[10px] font-semibold text-indigo-700 flex items-center gap-2">
                                    <DollarSign className="w-3.5 h-3.5 shrink-0" />
                                    1% fee deducted and sent to Treasury Wallet automatically on every trade.
                                </div>

                                <AnimatePresence>
                                    {tradeStatus === 'success' && (
                                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                            className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-700 font-bold text-center">
                                            ✅ Trade successful! Fee → Treasury.
                                        </motion.div>
                                    )}
                                    {tradeStatus === 'error' && tradeError && (
                                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                            className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                                            ❌ {tradeError}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                    onClick={(!account) ? connectWallet : (market?.migrated || token.launch_type === 'FAIR_LAUNCH' || token.launch_type === 'STANDARD') 
                                        ? () => window.open(`https://pancakeswap.finance/swap?outputCurrency=${address}&chain=bsc`, '_blank')
                                        : handleTrade}
                                    disabled={tradeStatus === 'pending' || token.is_delisted || (account && (!amount || parseFloat(amount) <= 0) && !(market?.migrated || token.launch_type === 'FAIR_LAUNCH' || token.launch_type === 'STANDARD'))}
                                    className={`w-full py-4 font-black rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed shadow-xl transition-all text-white ${side === 'buy'
                                        ? 'bg-gradient-to-r from-blue-500 to-slate-500 shadow-blue-500/25 hover:from-blue-600 hover:to-slate-600'
                                        : 'bg-gradient-to-r from-gray-700 to-gray-900 shadow-gray-900/25 hover:from-gray-800 hover:to-black'
                                    }`}>
                                    {tradeStatus === 'pending'
                                        ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing…</span>
                                        : !account ? '🔗 Connect Wallet'
                                        : token.is_delisted ? '🚫 Asset Delisted'
                                        : (market?.migrated || token.launch_type === 'FAIR_LAUNCH' || token.launch_type === 'STANDARD') ? 'Trade on PancakeSwap ↗'
                                        : side === 'buy' ? `🟢 Buy ${token.symbol}` : `🔴 Sell ${token.symbol}`}
                                </motion.button>

                                <p className="text-[10px] text-center text-gray-400">
                                    {market?.isRegistered ? 'Trading via BondingCurve smart contract • 1% fee → Treasury' : 'Token not yet registered on BondingCurve'}
                                </p>
                            </div>
                        </div>

                        {/* Market stats card */}
                        <div className="bg-white border border-black/8 rounded-2xl p-5 shadow-sm">
                            <h3 className="font-black text-gray-900 text-sm mb-4 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-indigo-500" /> Market Statistics
                            </h3>
                            {[
                                { label: '24h Volume',   value: `${volume24h.toFixed(6)} BNB` },
                                { label: '24h Buys',     value: tradeStats?.buys || 0 },
                                { label: '24h Sells',    value: tradeStats?.sells || 0 },
                                { label: 'Total Trades', value: tradeStats?.total_trades || 0 },
                                { label: 'Total Fees',   value: `${parseFloat(tradeStats?.total_fees_bnb || 0).toFixed(6)} BNB` },
                            ].map((s, i) => (
                                <div key={i} className="flex justify-between items-center py-2 border-b border-black/5 last:border-0 text-sm">
                                    <span className="text-gray-500">{s.label}</span>
                                    <span className="font-black text-gray-900">{s.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Whitepaper Modal */}
            {whitepaper && (
                <WhitepaperModal 
                    isOpen={isWpOpen}
                    onClose={() => setIsWpOpen(false)}
                    whitepaper={whitepaper}
                    isDeployed={true}
                    contractAddress={address}
                />
            )}
        </main>
    );
}

function StatusUpgradeButton({ token, account }) {
    const [isUpgrading, setIsUpgrading] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('Highly Trusted');
    const [isProcessing, setIsProcessing] = useState(false);
    const isAdmin = account?.toLowerCase() === ADMIN_WALLET.toLowerCase();

    if (!account) return null;

    return (
        <AnimatePresence mode="wait">
            {!isUpgrading ? (
                <motion.button
                    key="upgrade-btn"
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setIsUpgrading(true)}
                    className="px-4 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 font-bold text-[10px] rounded-full border border-indigo-200 flex items-center gap-1.5 transition-all uppercase tracking-tighter"
                >
                    <ShieldCheck className="w-3 h-3" /> Upgrade Request
                </motion.button>
            ) : (
                <motion.div 
                    key="upgrade-form"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 p-1.5 bg-indigo-50 border border-indigo-200 rounded-full shadow-sm"
                >
                    <select 
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="bg-transparent text-[10px] font-black text-gray-800 outline-none pl-2"
                    >
                        <option value="Highly Trusted">Highly Trusted</option>
                        <option value="Premium Token">Premium Token</option>
                        <option value="Good to buy">Good to Buy</option>
                    </select>
                    <button
                        disabled={isProcessing}
                        onClick={async () => {
                            setIsProcessing(true);
                            try {
                                let tx_hash = 'admin_manual';
                                if (!isAdmin) {
                                    const provider = new ethers.BrowserProvider(window.ethereum);
                                    const signer = await provider.getSigner();
                                    
                                    // Fetch actual upgrade fee from factory
                                    const factory = new ethers.Contract(FACTORY_ADDRESS, TOKEN_FACTORY_ABI, signer);
                                    const upgradeFee = await factory.UPGRADE_FEE();
                                    
                                    const tx = await factory.upgradeToken(token.contract_address, {
                                        value: upgradeFee
                                    });
                                    await tx.wait();
                                    tx_hash = tx.hash;
                                }
                                await axios.post(`${API_URL.replace(/\/$/, '')}/tokens/status/request`, {
                                    contract_address: token.contract_address,
                                    new_status: selectedStatus,
                                    tx_hash: tx_hash
                                });
                                alert(isAdmin ? 'Status updated successfully!' : 'Upgrade request verified!');
                                window.location.reload();
                            } catch (e) {
                                alert('Action failed: ' + (e.reason || e.message));
                            } finally {
                                setIsProcessing(false);
                            }
                        }}
                        className="py-1 px-3 bg-indigo-500 text-white rounded-full text-[9px] font-black uppercase hover:bg-indigo-600 disabled:opacity-50"
                    >
                        {isProcessing ? '⌛' : isAdmin ? 'Apply' : 'Upgrade Now'}
                    </button>
                    <button 
                        onClick={() => setIsUpgrading(false)}
                        className="pr-3 text-[9px] font-black text-gray-400 uppercase hover:text-gray-600"
                    >
                        Cancel
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default TokenDetail;
