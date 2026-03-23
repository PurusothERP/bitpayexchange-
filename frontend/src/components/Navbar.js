'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Wallet, Rocket, Activity, Image as ImageIcon, Menu, X, FileText, ArrowRightLeft, ChevronDown, Coins, ShieldCheck, Shield, Sparkles, DollarSign } from 'lucide-react';

export default function Navbar() {
    const { account, connectWallet, disconnectWallet, isConnecting } = useWallet();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCreateDropdownOpen, setIsCreateDropdownOpen] = useState(false);
    const TREASURY = '0x6451ee4def4a8b8fbc2c64301a79e267de378935';
    const isAdmin = account && account.toLowerCase() === TREASURY;

    // ── Auto-Disconnect Session Safety ────────────────────────────────────────
    // Monitors user activity and automatically disconnects the wallet after 15m 
    // of inactivity to prevent unauthorized access if a user leaves their tab open.
    useEffect(() => {
        if (!account) return;

        let timeoutId;
        const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 Minutes

        const resetTimer = () => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                console.warn('[Session] Inactivity detected. Auto-disconnecting wallet for safety.');
                disconnectWallet();
                // Optional: show a notification or alert to the user
                alert("Session expired due to inactivity. Wallet disconnected.");
            }, SESSION_TIMEOUT);
        };

        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        activityEvents.forEach(evt => document.addEventListener(evt, resetTimer));
        
        resetTimer(); // Initialize timer

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            activityEvents.forEach(evt => document.removeEventListener(evt, resetTimer));
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
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="w-12 h-12 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                                <img src="/logo-final.png" alt="B20-LAB Logo" className="w-full h-full object-contain" />
                            </div>
                            <span className="text-2xl font-black tracking-tighter text-gray-900 text-red-gradient drop-shadow-md">
                                B20-<span className="text-rose-500">LAB</span>
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-6 text-sm font-semibold">
                            
                            {/* Create Dropdown */}
                            <div 
                                className="relative"
                                onMouseEnter={() => setIsCreateDropdownOpen(true)}
                                onMouseLeave={() => setIsCreateDropdownOpen(false)}
                            >
                                <button className="nav-link flex items-center gap-1.5 hover:text-rose-500 transition-colors py-2">
                                    <Rocket className="w-4 h-4" /> Create <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isCreateDropdownOpen ? 'rotate-180' : ''}`} />
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
                                                <Link href="/ai-agent" className="flex items-start gap-3 p-3 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors group">
                                                    <div className="bg-rose-100 p-2 rounded-lg group-hover:bg-rose-200 transition-colors">
                                                        <Sparkles className="w-5 h-5 text-rose-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 group-hover:text-rose-600">AI Token Agent</p>
                                                        <p className="text-xs text-gray-500 font-normal">Our AI brainstorms your name, branding & strategy.</p>
                                                    </div>
                                                </Link>

                                                <Link href="/create" className="flex items-start gap-3 p-3 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors group border-t border-black/5">
                                                    <div className="bg-rose-100 p-2 rounded-lg group-hover:bg-rose-200 transition-colors">
                                                        <ImageIcon className="w-5 h-5 text-rose-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 group-hover:text-rose-600">Bonding Curve Token</p>
                                                        <p className="text-xs text-gray-500 font-normal">Fair launch meme token with automated liquidity.</p>
                                                    </div>
                                                </Link>
                                                
                                                <Link href="/fair-launch" className="flex items-start gap-3 p-3 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-colors group">
                                                    <div className="bg-emerald-100 p-2 rounded-lg group-hover:bg-emerald-200 transition-colors">
                                                        <Activity className="w-5 h-5 text-emerald-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 group-hover:text-emerald-600">Fair-Launch DEX Token</p>
                                                        <p className="text-xs text-gray-500 font-normal">Instantly tradeable with permanent PancakeSwap LP.</p>
                                                    </div>
                                                </Link>

                                                <Link href="/standard" className="flex items-start gap-3 p-3 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors group">
                                                    <div className="bg-blue-100 p-2 rounded-lg group-hover:bg-blue-200 transition-colors">
                                                        <ShieldCheck className="w-5 h-5 text-blue-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 group-hover:text-blue-600">Standard Token</p>
                                                        <p className="text-xs text-gray-500 font-normal">Basic BEP-20 token for utility or custom presales.</p>
                                                    </div>
                                                </Link>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <Link href="/launch" className="nav-link flex items-center gap-2 hover:text-rose-500 transition-colors">
                                <Coins className="w-4 h-4" /> Launchpad
                            </Link>
                            <Link href="/trade" className="nav-link flex items-center gap-2 text-rose-600 hover:text-rose-700 transition-colors">
                                <Activity className="w-4 h-4" /> Trade
                            </Link>
                            <Link href="/services" className="nav-link flex items-center gap-2 hover:text-rose-500 transition-colors">
                                <FileText className="w-4 h-4" /> Services
                            </Link>
                            <Link href="/dex" className="nav-link flex items-center gap-2 hover:text-rose-500 transition-colors">
                                <ArrowRightLeft className="w-4 h-4" /> DEX
                            </Link>
                            <Link href="/fiat" className="nav-link flex items-center gap-2 text-emerald-600 font-bold hover:text-emerald-700 transition-colors">
                                <DollarSign className="w-4 h-4" /> Fiat
                            </Link>
                            <Link href="/profile" className="nav-link flex items-center gap-2 hover:text-rose-500 transition-colors">
                                <Wallet className="w-4 h-4" /> Profile
                            </Link>
                            {isAdmin && (
                                <Link href="/admin" className="nav-link flex items-center gap-2 text-rose-600 font-black hover:text-rose-700 transition-colors border border-rose-200 bg-rose-50 rounded-lg px-3 py-1">
                                    <Shield className="w-4 h-4" /> Admin
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
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden paw-pattern/95 border-b border-black/5 overflow-hidden"
                    >
                        <div className="px-4 pt-2 pb-6 space-y-4">
                            <div className="pb-2 border-b border-black/5">
                                <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Create</p>
                                <Link href="/create" className="block px-3 py-2.5 rounded-md text-sm font-bold text-gray-800 hover:bg-rose-50 flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                                    <div className="bg-rose-100 p-1.5 rounded-lg"><ImageIcon className="w-4 h-4 text-rose-600" /></div> BondingCurve Meme Token
                                </Link>
                                <Link href="/fair-launch" className="block px-3 py-2.5 rounded-md text-sm font-bold text-gray-800 hover:bg-emerald-50 flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                                    <div className="bg-emerald-100 p-1.5 rounded-lg"><Activity className="w-4 h-4 text-emerald-600" /></div> Fair-Launch DEX Token
                                </Link>
                                <Link href="/standard" className="block px-3 py-2.5 rounded-md text-sm font-bold text-gray-800 hover:bg-blue-50 flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                                    <div className="bg-blue-100 p-1.5 rounded-lg"><ShieldCheck className="w-4 h-4 text-blue-600" /></div> Standard Token
                                </Link>
                            </div>
                            
                            <Link href="/launch" className="block px-3 py-3 rounded-md text-base font-medium text-gray-900 hover:bg-black/10 flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                                <Coins className="w-5 h-5 text-gray-600" /> Launchpad
                            </Link>
                            <Link href="/trade" className="block px-3 py-3 rounded-md text-base font-medium text-rose-600 hover:bg-black/10 flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                                <Activity className="w-5 h-5 text-rose-500" /> Trade
                            </Link>
                            <Link href="/services" className="block px-3 py-3 rounded-md text-base font-medium text-gray-900 hover:bg-black/10 flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                                <FileText className="w-5 h-5 text-rose-500" /> Services
                            </Link>
                            <Link href="/dex" className="block px-3 py-3 rounded-md text-base font-medium text-gray-900 hover:bg-black/10 flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                                <ArrowRightLeft className="w-5 h-5 text-rose-500" /> DEX
                            </Link>
                            <Link href="/fiat" className="block px-3 py-3 rounded-md text-base font-medium text-emerald-600 hover:bg-black/10 flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                                <DollarSign className="w-5 h-5 text-emerald-500" /> Fiat Buy & Sell
                            </Link>
                            <Link href="/profile" className="block px-3 py-3 rounded-md text-base font-medium text-gray-900 hover:bg-black/10 flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                                <Wallet className="w-5 h-5 text-rose-500" /> My Profile
                            </Link>

                            <div className="pt-4 border-t border-black/10">
                                {account ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 px-3">
                                            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                                            <span className="text-sm font-mono text-gray-700">{truncateAddress(account)}</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                disconnectWallet();
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className="w-full text-left px-3 py-3 text-red-400 hover:bg-black/10 rounded-md transition-colors font-medium"
                                        >
                                            Disconnect Wallet
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => {
                                            connectWallet();
                                            setIsMobileMenuOpen(false);
                                        }}
                                        disabled={isConnecting}
                                        className="w-full btn-primary flex items-center justify-center gap-2 py-3"
                                    >
                                        <Wallet className="w-5 h-5" />
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
