'use client';
import { API_URL } from '@/lib/api';

import { useState, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import axios from 'axios';
import { Wallet, Rocket, Activity, Image as ImageIcon, Menu, X, FileText, ArrowRightLeft, ChevronDown, Coins, ShieldCheck, Shield, Sparkles, DollarSign, CreditCard, Lock, Brain, LayoutGrid, TrendingUp, BarChart3, Zap, Target, Flame, Building2, Globe, PlusCircle, Diamond } from 'lucide-react';
import Logo from './Logo';

export default function Navbar() {
    const { account, connectWallet, disconnectWallet, isConnecting } = useWallet();
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCreateDropdownOpen, setIsCreateDropdownOpen] = useState(false);
    const [isExchangeDropdownOpen, setIsExchangeDropdownOpen] = useState(false);
    const TREASURY_WALLETS = {
        EVM: process.env.NEXT_PUBLIC_FEE_WALLET,
        BTC: process.env.NEXT_PUBLIC_TREASURY_BTC,
        SOL: process.env.NEXT_PUBLIC_TREASURY_SOL,
        TRON: process.env.NEXT_PUBLIC_TREASURY_TRON
    };
    const TREASURY = TREASURY_WALLETS.EVM;
    const isAdmin = account && Object.values(TREASURY_WALLETS).some(w => w && w.toLowerCase() === account.toLowerCase());
    const SHOW_SERVICE = false; // Set to true to reveal Service tab in navigation

    // ── Auto-Disconnect Session Safety + Live Heartbeat ────────────────────────
    useEffect(() => {
        if (!account) return;

        // Use the same standardized API detection as api.js
        const isProd = typeof window !== 'undefined' && window.location.hostname === 'mexapay.net';
        

        // 1. Session Heartbeat (Pulse Online Status Every 60s)
        const heartbeatInterval = setInterval(() => {
            axios.post(`${API_URL}/wallets/heartbeat`, { wallet_address: account })
                .catch(() => {}); // silent fail if network temp down
        }, 60000);

        // 2. Inactivity Monitor (Disconnect after 15m)
        let timeoutId;
        const SESSION_TIMEOUT = 15 * 60 * 1000; 

        const resetTimer = () => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                disconnectWallet();
                // console.log("Session expired due to inactivity. Wallet disconnected for protocol security.");
            }, SESSION_TIMEOUT);
        };

        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        events.forEach(evt => document.addEventListener(evt, resetTimer));
        resetTimer();

        // Immediate initial heartbeat
        axios.post(`${API_URL}/wallets/heartbeat`, { wallet_address: account }).catch(() => {});

        return () => {
            clearInterval(heartbeatInterval);
            if (timeoutId) clearTimeout(timeoutId);
            events.forEach(evt => document.removeEventListener(evt, resetTimer));
        };
    }, [account, disconnectWallet]);

    const truncateAddress = (address) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const handleExchangeLinkClick = (e, href) => {
        if (pathname === '/exchange') {
            const url = new URL(href, window.location.origin);
            const queryMode = url.searchParams.get('mode');
            if (queryMode) {
                e.preventDefault();
                setIsExchangeDropdownOpen(false);
                window.history.pushState(null, '', href);
                window.dispatchEvent(new CustomEvent('exchange-mode-change', { detail: queryMode }));
            }
        } else {
            setIsExchangeDropdownOpen(false);
        }
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-[1000] border-b border-black/5 paw-pattern/80 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    <div className="flex items-center gap-8">
                        <Link href="/exchange" className="flex items-center gap-2 group shrink-0">
                            <div className="flex flex-col">
                                <span className="text-2xl font-black tracking-tighter text-gray-900 text-premium-gradient drop-shadow-md whitespace-nowrap leading-none">
                                    BITPAY EXCHANGE
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-tight mt-0.5" style={{color:'#009393'}}>
                                    Intelligence Hub
                                </span>
                            </div>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-6 text-sm font-semibold">
                            
                            {/* Create Dropdown (Restored) */}
                            <div 
                                className="relative"
                                onMouseEnter={() => setIsCreateDropdownOpen(true)}
                                onMouseLeave={() => setIsCreateDropdownOpen(false)}
                            >
                                <button className="nav-link flex items-center gap-1.5 transition-colors py-2" style={{}} onMouseEnter={e=>e.currentTarget.style.color='#009393'} onMouseLeave={e=>e.currentTarget.style.color=''}>
                                    <Rocket className="w-4 h-4" /> Create Token <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isCreateDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                
                                <AnimatePresence>
                                    {isCreateDropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            transition={{ duration: 0.2 }}
                                            className="absolute top-full left-0 w-80 bg-white/90 backdrop-blur-xl border border-black/10 shadow-2xl rounded-2xl p-3 z-50 overflow-hidden"
                                        >
                                            <div className="flex flex-col gap-2">
                                                <Link href="/ai-agent" className="flex items-start gap-3 p-3 rounded-xl transition-colors group" style={{}} onMouseEnter={e=>{e.currentTarget.style.background='#e6fafa';e.currentTarget.style.color='#009393'}} onMouseLeave={e=>{e.currentTarget.style.background='';e.currentTarget.style.color=''}}>
                                                    <div className="p-2 rounded-[12px] transition-colors" style={{background:'#ccf5f5'}}>
                                                        <Sparkles className="w-5 h-5" style={{color:'#009393'}} />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-sm" style={{color:'#009393'}}>Nuera AI Brainstorm</p>
                                                        <p className="text-xs text-gray-500 font-medium">Let AI draft your token plan</p>
                                                    </div>
                                                </Link>
                                                <Link href="/create" className="flex items-start gap-3 p-3 rounded-xl transition-colors group" onMouseEnter={e=>e.currentTarget.style.background='#e6fafa'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                                                    <div className="p-2 rounded-[12px] transition-colors" style={{background:'#e6fafa'}}>
                                                        <Rocket className="w-5 h-5" style={{color:'#009393'}} />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-gray-900 text-sm">BondingCurve Launch</p>
                                                        <p className="text-xs text-gray-500 font-medium whitespace-nowrap">Fair launch via bonding curve</p>
                                                    </div>
                                                </Link>
                                                <Link href="/fair-launch" className="flex items-start gap-3 p-3 rounded-xl transition-colors group" onMouseEnter={e=>e.currentTarget.style.background='#e6fafa'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                                                    <div className="p-2 rounded-[12px] transition-colors" style={{background:'#e6fafa'}}>
                                                        <Activity className="w-5 h-5" style={{color:'#009393'}} />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-gray-900 text-sm">Fair-Launch DEX</p>
                                                        <p className="text-xs text-gray-500 font-medium">Presale + PancakeSwap Listing</p>
                                                    </div>
                                                </Link>
                                                <Link href="/standard" className="flex items-start gap-3 p-3 rounded-xl transition-colors group" onMouseEnter={e=>e.currentTarget.style.background='#e6fafa'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                                                    <div className="p-2 rounded-[12px] transition-colors" style={{background:'#e6fafa'}}>
                                                        <ShieldCheck className="w-5 h-5" style={{color:'#009393'}} />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-gray-900 text-sm">Standard Token</p>
                                                        <p className="text-xs text-gray-500 font-medium">Simple fixed-supply ERC-20</p>
                                                    </div>
                                                </Link>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            
                            <Link href="/launch" className="nav-link flex items-center gap-2 transition-colors">
                                <Coins className="w-4 h-4" /> Meme Hub
                            </Link>



                            <div 
                                className="relative"
                                onMouseEnter={() => setIsExchangeDropdownOpen(true)}
                                onMouseLeave={() => setIsExchangeDropdownOpen(false)}
                            >
                                <Link href="/exchange" className="group relative flex items-center gap-2 px-5 py-2 rounded-full font-black border transition-all duration-300 hover:-translate-y-1 active:scale-95" style={{background:'linear-gradient(135deg,#009393,#007a7a)',color:'white',borderColor:'rgba(0,147,147,0.3)',boxShadow:'0 8px 24px rgba(0,147,147,0.3)'}}>
                                    <div className="p-1.5 rounded-full border transition-colors duration-300" style={{background:'rgba(255,255,255,0.15)',borderColor:'rgba(255,255,255,0.1)'}}>
                                        <Activity className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <span className="tracking-wide text-xs">Exchange</span>
                                    <ChevronDown className={`w-3 h-3 text-white/80 transition-transform duration-300 ${isExchangeDropdownOpen ? 'rotate-180' : ''}`} />
                                </Link>
                                
                                <AnimatePresence>
                                    {isExchangeDropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            transition={{ duration: 0.2 }}
                                            className="absolute top-full left-1/2 -translate-x-1/2 w-[980px] bg-white/98 backdrop-blur-3xl border border-rose-500/10 shadow-[0_25px_60px_-15px_rgba(220,20,60,0.12)] rounded-[2rem] p-6 z-[1100] mt-3 overflow-hidden grid grid-cols-3 gap-6"
                                        >
                                            {/* Column 1: Trade Core */}
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 border-b border-rose-50 pb-2.5 mb-1">
                                                    <TrendingUp className="w-4 h-4 text-[#dc143c]" />
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Trade Core</span>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    {[
                                                        { label: 'Markets', desc: 'Real-time token trackers & data', href: '/exchange?mode=markets', icon: LayoutGrid },
                                                        { label: 'Spot Exchange', desc: 'Professional Spot Trading Terminal', href: '/exchange?mode=spot', icon: TrendingUp },
                                                        { label: 'Futures Terminal', desc: 'Up to 50x Perpetual Leverage', href: '/exchange?mode=pro', icon: BarChart3 },
                                                        { label: 'Meme Futures', desc: 'High volatility meme contracts', href: '/exchange?mode=meme-futures', icon: Zap },
                                                        { label: 'List Your Token', desc: 'Submit fair launches & curves', href: '/exchange?mode=list', icon: PlusCircle }
                                                    ].map((item, idx) => (
                                                        <Link 
                                                            key={idx}
                                                            href={item.href}
                                                            onClick={(e) => handleExchangeLinkClick(e, item.href)}
                                                            className="flex items-center gap-3 p-2 bg-slate-50/20 hover:bg-[#dc143c] border border-slate-100/40 hover:border-[#dc143c] rounded-xl transition-all duration-200 group active:scale-[0.98]"
                                                        >
                                                            <div className="w-9 h-9 rounded-lg bg-white border border-slate-100 text-slate-500 group-hover:bg-white/10 group-hover:text-white group-hover:border-transparent transition-all flex items-center justify-center shrink-0">
                                                                <item.icon className="w-4 h-4" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-[11px] font-black uppercase text-slate-800 group-hover:text-white transition-colors tracking-tight leading-none">{item.label}</p>
                                                                <p className="text-[8px] font-bold text-slate-400 group-hover:text-white/70 transition-colors uppercase tracking-wider mt-1 leading-none truncate">{item.desc}</p>
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Column 2: Yield & Assets */}
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 border-b border-rose-50 pb-2.5 mb-1">
                                                    <Lock className="w-4 h-4 text-[#dc143c]" />
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Yield & Assets</span>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    {[
                                                        { label: 'MEX Yield Program', desc: 'Passive stable earnings on RWA debt', href: '/exchange?mode=mex-money', icon: DollarSign },
                                                        { label: 'Smart Money Index', desc: 'Diversified 10-token index buckets', href: '/exchange?mode=smart-money', icon: Target },
                                                        { label: 'Staking Vaults', desc: 'Lock assets to earn high-yield APY', href: '/staking', icon: Lock },
                                                        { label: 'Lending & Borrowing', desc: 'Borrow assets via collateralized pools', href: '/lending', icon: ArrowRightLeft },
                                                        { label: 'NFT Hub', desc: 'Mint & trade digital collectibles', href: '/nft', icon: Diamond }
                                                    ].map((item, idx) => (
                                                        <Link 
                                                            key={idx}
                                                            href={item.href}
                                                            onClick={(e) => handleExchangeLinkClick(e, item.href)}
                                                            className="flex items-center gap-3 p-2 bg-slate-50/20 hover:bg-[#dc143c] border border-slate-100/40 hover:border-[#dc143c] rounded-xl transition-all duration-200 group active:scale-[0.98]"
                                                        >
                                                            <div className="w-9 h-9 rounded-lg bg-white border border-slate-100 text-slate-500 group-hover:bg-white/10 group-hover:text-white group-hover:border-transparent transition-all flex items-center justify-center shrink-0">
                                                                <item.icon className="w-4 h-4" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-[11px] font-black uppercase text-slate-800 group-hover:text-white transition-colors tracking-tight leading-none">{item.label}</p>
                                                                <p className="text-[8px] font-bold text-slate-400 group-hover:text-white/70 transition-colors uppercase tracking-wider mt-1 leading-none truncate">{item.desc}</p>
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Column 3: Intelligence & Portals */}
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 border-b border-rose-50 pb-2.5 mb-1">
                                                    <Globe className="w-4 h-4 text-[#dc143c]" />
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Intelligence & Portals</span>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    {[
                                                        { label: 'Web3 Portal', desc: 'Interact with dApps and smart contracts', href: '/exchange?mode=web3', icon: Globe },
                                                        { label: 'Meme Hub', desc: 'Trending coins, launches & sentiment', href: '/exchange?mode=meme', icon: Flame },
                                                        { label: 'Tokenized Stocks', desc: 'On-chain tokenized global equity shares', href: '/exchange?mode=stocks', icon: Building2 },
                                                        { label: 'Fiat Desk', desc: 'Secure bank deposits & gateways', href: '/exchange?mode=fiat', icon: CreditCard },
                                                        { label: 'Nuera AI Core', desc: 'Machine learning analytics & brainstorming', href: '/exchange?mode=b20ai', icon: Brain }
                                                    ].map((item, idx) => (
                                                        <Link 
                                                            key={idx}
                                                            href={item.href}
                                                            onClick={(e) => handleExchangeLinkClick(e, item.href)}
                                                            className="flex items-center gap-3 p-2 bg-slate-50/20 hover:bg-[#dc143c] border border-slate-100/40 hover:border-[#dc143c] rounded-xl transition-all duration-200 group active:scale-[0.98]"
                                                        >
                                                            <div className="w-9 h-9 rounded-lg bg-white border border-slate-100 text-slate-500 group-hover:bg-white/10 group-hover:text-white group-hover:border-transparent transition-all flex items-center justify-center shrink-0">
                                                                <item.icon className="w-4 h-4" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-[11px] font-black uppercase text-slate-800 group-hover:text-white transition-colors tracking-tight leading-none">{item.label}</p>
                                                                <p className="text-[8px] font-bold text-slate-400 group-hover:text-white/70 transition-colors uppercase tracking-wider mt-1 leading-none truncate">{item.desc}</p>
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>



                            <Link href="/cards" className="nav-link flex items-center gap-2 text-slate-900 font-bold transition-colors">
                                <CreditCard className="w-4 h-4" /> Card
                            </Link>

                            <Link href="/fiat" className="nav-link flex items-center gap-2 text-slate-900 font-bold transition-colors">
                                <DollarSign className="w-4 h-4" /> Fiat
                            </Link>

                            {SHOW_SERVICE && (
                                <Link href="/services" className="nav-link flex items-center gap-2 transition-colors">
                                    <FileText className="w-4 h-4" /> Service
                                </Link>
                            )}

                            {account && (
                                <Link href="/profile" className="nav-link flex items-center gap-2 transition-colors">
                                    <Wallet className="w-4 h-4" /> Profile
                                </Link>
                            )}

                            {isAdmin && (
                                <Link href="/admin" className="nav-link flex items-center gap-2 font-black transition-colors rounded-lg px-3 py-1" style={{color:'#009393',borderColor:'#9ed8d8',background:'#e6fafa',border:'1px solid #9ed8d8'}}>
                                    <Shield className="w-3 h-3" /> Admin
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Desktop Wallet Button */}
                        <div className="hidden md:flex items-center">
                            {account ? (
                                <div className="flex items-center gap-3 bg-black/5 border border-black/10 rounded-full px-4 py-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-sm font-mono text-gray-700">{truncateAddress(account)}</span>
                                    <button
                                        onClick={disconnectWallet}
                                        className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                                    >
                                        Disconnect
                                    </button>
                                </div>
                            ) : (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={connectWallet}
                                    disabled={isConnecting}
                                    className="btn-primary flex items-center gap-2"
                                >
                                    <Wallet className="w-4 h-4" />
                                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                                </motion.button>
                            )}
                        </div>

                        {/* Mobile Menu Toggle */}
                        <button
                            className="md:hidden p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
                            onClick={toggleMobileMenu}
                        >
                            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation Dropdown */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="md:hidden bg-white/98 backdrop-blur-2xl border-b border-black/5 shadow-2xl overflow-hidden"
                    >
                        <div className="px-3 pt-2 pb-4">

                            {/* ── CREATE TOKEN SECTION ─── */}
                            <div className="mb-2">
                                <p className="px-3 pt-2 pb-1.5 text-[9px] font-black text-gray-400 uppercase tracking-[0.15em]">
                                    🚀 Create Token
                                </p>
                                <div className="grid grid-cols-2 gap-2 px-1">
                                    <Link
                                        href="/ai-agent"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex flex-col items-start gap-1.5 p-3 rounded-2xl transition-all active:scale-95" style={{background:'#e6fafa',border:'1px solid #ccf5f5'}}
                                    >
                                        <div className="p-1.5 rounded-xl" style={{background:'#009393'}}>
                                            <Sparkles className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black leading-tight" style={{color:'#009393'}}>Nuera AI</p>
                                            <p className="text-[9px] font-medium leading-tight" style={{color:'#4dd9d9'}}>Brainstorm plan</p>
                                        </div>
                                    </Link>
                                    <Link
                                        href="/create"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex flex-col items-start gap-1.5 p-3 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-teal-50 hover:border-teal-100 transition-all active:scale-95"
                                    >
                                        <div className="p-1.5 rounded-xl" style={{background:'#004d4d'}}>
                                            <Rocket className="w-3.5 h-3.5" style={{color:'#4dd9d9'}} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-gray-800 leading-tight">BondingCurve</p>
                                            <p className="text-[9px] text-gray-400 font-medium leading-tight">Fair launch</p>
                                        </div>
                                    </Link>
                                    <Link
                                        href="/fair-launch"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex flex-col items-start gap-1.5 p-3 bg-sky-50 border border-sky-100 rounded-2xl hover:bg-sky-100 transition-all active:scale-95"
                                    >
                                        <div className="p-1.5 rounded-xl" style={{background:'#009393'}}>
                                            <Activity className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black leading-tight" style={{color:'#007a7a'}}>Fair-Launch</p>
                                            <p className="text-[9px] font-medium leading-tight" style={{color:'#009393'}}>Presale + DEX</p>
                                        </div>
                                    </Link>
                                    <Link
                                        href="/standard"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex flex-col items-start gap-1.5 p-3 rounded-2xl transition-all active:scale-95" style={{background:'#e6fafa',border:'1px solid #ccf5f5'}}
                                    >
                                        <div className="p-1.5 rounded-xl" style={{background:'#009393'}}>
                                            <ShieldCheck className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black leading-tight" style={{color:'#007a7a'}}>Standard</p>
                                            <p className="text-[9px] font-medium leading-tight" style={{color:'#009393'}}>Fixed-supply</p>
                                        </div>
                                    </Link>
                                </div>
                            </div>

                            {/* ── DIVIDER ─── */}
                            <div className="my-2 mx-2 border-t border-gray-100" />

                            {/* ── MAIN NAV LINKS ─── */}
                            <div className="space-y-1 px-1">
                                <p className="px-2 pt-1 pb-1 text-[9px] font-black text-gray-400 uppercase tracking-[0.15em]">Platform</p>

                                {/* Launchpad */}
                                <Link
                                    href="/launch"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors active:scale-95 group"
                                >
                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:'#e6fafa',border:'1px solid #ccf5f5'}}>
                                        <Coins className="w-4 h-4" style={{color:'#009393'}} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800 leading-tight">Meme Hub</p>
                                        <p className="text-[10px] text-gray-400">Token presales</p>
                                    </div>
                                </Link>



                                {/* Smart Money */}


                                {/* Exchange — Highlighted */}
                                <Link
                                    href="/exchange"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="relative flex items-center gap-3 px-4 py-3.5 rounded-2xl text-white font-black shadow-lg active:scale-95 transition-all overflow-hidden"
                                    style={{background:'linear-gradient(135deg,#009393,#007a7a)',boxShadow:'0 8px 24px rgba(0,147,147,0.3)'}}
                                >
                                    <div className="absolute inset-0 pointer-events-none" style={{background:'linear-gradient(to right, rgba(255,255,255,0.08), transparent)'}} />
                                    <div className="p-1.5 rounded-xl z-10" style={{background:'rgba(255,255,255,0.2)',border:'1px solid rgba(255,255,255,0.2)'}}>
                                        <Activity className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="z-10">
                                        <p className="text-sm font-black leading-tight">Bitpay Exchange</p>
                                        <p className="text-[9px] text-white/60 font-medium">Trade &amp; Futures</p>
                                    </div>
                                    <div className="ml-auto z-10 text-[8px] font-black text-white px-2 py-0.5 rounded-full" style={{background:'rgba(255,255,255,0.25)'}}>LIVE</div>
                                </Link>



                                {/* Card */}
                                <Link
                                    href="/cards"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors active:scale-95 group"
                                >
                                    <div className="w-8 h-8 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <CreditCard className="w-4 h-4 text-gray-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800 leading-tight">Crypto Card</p>
                                        <p className="text-[10px] text-gray-400">Crypto debit card</p>
                                    </div>
                                </Link>

                                {/* Fiat */}
                                <Link
                                    href="/fiat"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors active:scale-95 group"
                                >
                                    <div className="w-8 h-8 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <DollarSign className="w-4 h-4 text-gray-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800 leading-tight">Fiat Gateway</p>
                                        <p className="text-[10px] text-gray-400">INR Deposit & Withdraw</p>
                                    </div>
                                </Link>

                                {/* Service */}
                                {SHOW_SERVICE && (
                                    <Link
                                        href="/services"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors active:scale-95"
                                    >
                                        <div className="w-8 h-8 bg-gray-100 border border-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <FileText className="w-4 h-4 text-gray-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-700 leading-tight">Service</p>
                                            <p className="text-[10px] text-gray-400">Tools & integrations</p>
                                        </div>
                                    </Link>
                                )}

                                {/* Profile — only shown when connected */}
                                {account && (
                                    <Link
                                        href="/profile"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors active:scale-95"
                                        onMouseEnter={e=>e.currentTarget.style.background='#e6fafa'}
                                        onMouseLeave={e=>e.currentTarget.style.background=''}
                                    >
                                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:'#e6fafa',border:'1px solid #ccf5f5'}}>
                                            <Wallet className="w-4 h-4" style={{color:'#009393'}} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-700 leading-tight">My Profile</p>
                                            <p className="text-[10px] text-gray-400">Assets &amp; history</p>
                                        </div>
                                    </Link>
                                )}

                                {/* Admin (conditional) */}
                                {isAdmin && (
                                    <Link
                                        href="/admin"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors active:scale-95" style={{background:'#e6fafa',border:'1px solid #ccf5f5'}}
                                    >
                                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:'#ccf5f5',border:'1px solid #9ed8d8'}}>
                                            <Shield className="w-4 h-4" style={{color:'#009393'}} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black leading-tight" style={{color:'#009393'}}>Admin Panel</p>
                                            <p className="text-[10px]" style={{color:'#4dd9d9'}}>Platform controls</p>
                                        </div>
                                        <div className="ml-auto text-white text-[8px] font-black px-2 py-0.5 rounded-full" style={{background:'#009393'}}>ADMIN</div>
                                    </Link>
                                )}
                            </div>

                            {/* ── WALLET SECTION ─── */}
                            <div className="mt-3 mx-1 pt-3 border-t border-gray-100">
                                {account ? (
                                    <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-medium">Connected</p>
                                                <p className="text-xs font-mono font-bold text-gray-700">{truncateAddress(account)}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { disconnectWallet(); setIsMobileMenuOpen(false); }}
                                            className="text-[10px] font-bold text-red-400 hover:text-red-600 border border-red-100 bg-white px-3 py-1.5 rounded-xl transition-colors"
                                        >
                                            Disconnect
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => { connectWallet(); setIsMobileMenuOpen(false); }}
                                        disabled={isConnecting}
                                        className="w-full flex items-center justify-center gap-2 py-3.5 text-white font-black text-sm rounded-2xl active:scale-95 transition-all" style={{background:'linear-gradient(135deg,#009393,#007a7a)',boxShadow:'0 8px 20px rgba(0,147,147,0.25)'}}
                                    >
                                        <Wallet className="w-4 h-4" />
                                        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                                    </button>
                                )}
                            </div>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}

