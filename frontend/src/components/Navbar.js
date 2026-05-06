'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import axios from 'axios';
import { Wallet, Rocket, Activity, Image as ImageIcon, Menu, X, FileText, ArrowRightLeft, ChevronDown, Coins, ShieldCheck, Shield, Sparkles, DollarSign, CreditCard, Lock, Brain, LayoutGrid } from 'lucide-react';
import Logo from './Logo';

export default function Navbar() {
    const { account, connectWallet, disconnectWallet, isConnecting } = useWallet();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCreateDropdownOpen, setIsCreateDropdownOpen] = useState(false);
    const TREASURY = '0x6451ee4def4a8b8fbc2c64301a79e267de378935';
    const isAdmin = account && account.toLowerCase() === TREASURY;

    // ── Auto-Disconnect Session Safety + Live Heartbeat ────────────────────────
    useEffect(() => {
        if (!account) return;

        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-black/5 paw-pattern/80 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    <div className="flex items-center gap-8">
                        <Link href="/exchange" className="flex items-center gap-2 group shrink-0">
                            <div className="w-12 h-12 shrink-0 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                                <Logo className="w-full h-full" />
                            </div>
                            <span className="text-2xl font-black tracking-tighter text-gray-900 text-premium-gradient drop-shadow-md whitespace-nowrap">
                                MEXAPAY
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-6 text-sm font-semibold">
                            
                            {/* Create Dropdown (Restored) */}
                            <div 
                                className="relative"
                                onMouseEnter={() => setIsCreateDropdownOpen(true)}
                                onMouseLeave={() => setIsCreateDropdownOpen(false)}
                            >
                                <button className="nav-link flex items-center gap-1.5 hover:text-blue-500 transition-colors py-2">
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
                                                <Link href="/ai-agent" className="flex items-start gap-3 p-3 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors group">
                                                    <div className="bg-blue-100 p-2 rounded-[12px] group-hover:bg-blue-200 transition-colors">
                                                        <Sparkles className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-blue-600 text-sm">Nuera AI Brainstorm</p>
                                                        <p className="text-xs text-gray-500 font-medium">Let AI draft your token plan</p>
                                                    </div>
                                                </Link>
                                                <Link href="/create" className="flex items-start gap-3 p-3 rounded-xl hover:bg-blue-50 hover:text-blue-500 transition-colors group">
                                                    <div className="bg-blue-50 p-2 rounded-[12px] group-hover:bg-blue-100 transition-colors">
                                                        <Rocket className="w-5 h-5 text-blue-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-gray-900 text-sm">BondingCurve Launch</p>
                                                        <p className="text-xs text-gray-500 font-medium whitespace-nowrap">Fair launch via bonding curve</p>
                                                    </div>
                                                </Link>
                                                <Link href="/fair-launch" className="flex items-start gap-3 p-3 rounded-xl hover:bg-blue-50 hover:text-blue-500 transition-colors group">
                                                    <div className="bg-sky-50 p-2 rounded-[12px] group-hover:bg-sky-100 transition-colors">
                                                        <Activity className="w-5 h-5 text-sky-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-gray-900 text-sm">Fair-Launch DEX</p>
                                                        <p className="text-xs text-gray-500 font-medium">Presale + PancakeSwap Listing</p>
                                                    </div>
                                                </Link>
                                                <Link href="/standard" className="flex items-start gap-3 p-3 rounded-xl hover:bg-blue-50 hover:text-blue-500 transition-colors group">
                                                    <div className="bg-blue-50 p-2 rounded-[12px] group-hover:bg-blue-100 transition-colors">
                                                        <ShieldCheck className="w-5 h-5 text-blue-500" />
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
                            
                            <Link href="/launch" className="nav-link flex items-center gap-2 hover:text-blue-500 transition-colors">
                                <Coins className="w-4 h-4" /> Launchpad
                            </Link>

                            <Link href="/exchange" className="group relative flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-gray-900 to-black text-white font-black shadow-[0_15px_30px_-5px_rgba(245,158,11,0.3)] hover:shadow-[0_20px_40px_-10px_rgba(245,158,11,0.5)] border border-white/10 hover:border-indigo-500/50 transition-all duration-300 hover:-translate-y-1 active:scale-95">
                                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none" />
                                <div className="p-1.5 bg-white/10 rounded-full border border-white/5 group-hover:border-indigo-500/30 group-hover:bg-indigo-500/20 transition-colors duration-300">
                                    <Activity className="w-3.5 h-3.5 text-white group-hover:text-indigo-400 transition-colors" />
                                </div>
                                <span className="tracking-wide text-xs">Exchange</span>
                            </Link>



                            <Link href="/cards" className="nav-link flex items-center gap-2 text-slate-900 font-bold hover:text-blue-500 transition-colors">
                                <CreditCard className="w-4 h-4" /> Card
                            </Link>

                            <Link href="/services" className="nav-link flex items-center gap-2 hover:text-blue-500 transition-colors">
                                <FileText className="w-4 h-4" /> Service
                            </Link>

                            {account && (
                                <Link href="/profile" className="nav-link flex items-center gap-2 hover:text-blue-500 transition-colors">
                                    <Wallet className="w-4 h-4" /> Profile
                                </Link>
                            )}

                            {isAdmin && (
                                <Link href="/admin" className="nav-link flex items-center gap-2 text-blue-600 font-black hover:text-blue-700 transition-colors border border-blue-200 bg-blue-50 rounded-lg px-3 py-1">
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
                                        className="flex flex-col items-start gap-1.5 p-3 bg-blue-50 border border-blue-100 rounded-2xl hover:bg-blue-100 transition-all active:scale-95"
                                    >
                                        <div className="bg-blue-500 p-1.5 rounded-xl">
                                            <Sparkles className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-blue-600 leading-tight">Nuera AI</p>
                                            <p className="text-[9px] text-blue-400 font-medium leading-tight">Brainstorm plan</p>
                                        </div>
                                    </Link>
                                    <Link
                                        href="/create"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex flex-col items-start gap-1.5 p-3 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-blue-50 hover:border-blue-100 transition-all active:scale-95"
                                    >
                                        <div className="bg-gray-800 p-1.5 rounded-xl">
                                            <Rocket className="w-3.5 h-3.5 text-indigo-400" />
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
                                        <div className="bg-sky-500 p-1.5 rounded-xl">
                                            <Activity className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-sky-700 leading-tight">Fair-Launch</p>
                                            <p className="text-[9px] text-sky-500 font-medium leading-tight">Presale + DEX</p>
                                        </div>
                                    </Link>
                                    <Link
                                        href="/standard"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex flex-col items-start gap-1.5 p-3 bg-blue-50 border border-blue-100 rounded-2xl hover:bg-blue-100 transition-all active:scale-95"
                                    >
                                        <div className="bg-blue-500 p-1.5 rounded-xl">
                                            <ShieldCheck className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-blue-700 leading-tight">Standard</p>
                                            <p className="text-[9px] text-blue-400 font-medium leading-tight">Fixed-supply</p>
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
                                    <div className="w-8 h-8 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Coins className="w-4 h-4 text-indigo-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800 leading-tight">Launchpad</p>
                                        <p className="text-[10px] text-gray-400">Discover new tokens</p>
                                    </div>
                                </Link>

                                {/* Exchange — Highlighted */}
                                <Link
                                    href="/exchange"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="relative flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 text-white font-black shadow-lg active:scale-95 transition-all overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" />
                                    <div className="p-1.5 bg-indigo-500/20 rounded-xl border border-indigo-500/30 z-10">
                                        <Activity className="w-4 h-4 text-indigo-400" />
                                    </div>
                                    <div className="z-10">
                                        <p className="text-sm font-black leading-tight">Crypto Exchange</p>
                                        <p className="text-[9px] text-gray-400 font-medium">Trade & Futures</p>
                                    </div>
                                    <div className="ml-auto z-10 bg-indigo-500 text-[8px] font-black text-gray-900 px-2 py-0.5 rounded-full">LIVE</div>

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

                                {/* Service */}
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

                                {/* Profile — only shown when connected */}
                                {account && (
                                    <Link
                                        href="/profile"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-blue-50 transition-colors active:scale-95"
                                    >
                                        <div className="w-8 h-8 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <Wallet className="w-4 h-4 text-blue-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-700 leading-tight">My Profile</p>
                                            <p className="text-[10px] text-gray-400">Assets & history</p>
                                        </div>
                                    </Link>
                                )}

                                {/* Admin (conditional) */}
                                {isAdmin && (
                                    <Link
                                        href="/admin"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex items-center gap-3 px-3 py-3 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors active:scale-95"
                                    >
                                        <div className="w-8 h-8 bg-blue-100 border border-blue-200 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <Shield className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-blue-600 leading-tight">Admin Panel</p>
                                            <p className="text-[10px] text-blue-400">Platform controls</p>
                                        </div>
                                        <div className="ml-auto bg-blue-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full">ADMIN</div>
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
                                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-black text-sm rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-all"
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

