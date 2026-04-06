'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    DollarSign, ArrowRightLeft, ShieldCheck, Wallet, 
    Smartphone, Mail, User, QRCode, Copy, Upload, 
    CheckCircle2, AlertTriangle, Clock, Landmark, CreditCard,
    ArrowUpRight, ArrowDownLeft, Loader2, Info, Check,
    Brain, Zap, Sparkles
} from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const TREASURY_WALLET = '0x6451ee4def4a8b8fbc2c64301a79e267de378935';

export default function FiatPage() {
    const { account, connectWallet } = useWallet();
    const [activeTab, setActiveTab] = useState('buy'); // 'buy' or 'sell'
    const [step, setStep] = useState(1);
    const [status, setStatus] = useState('idle'); // 'idle', 'submitting', 'success', 'error'
    const [error, setError] = useState('');
    const [timer, setTimer] = useState(0);

    // Form Data
    const [userDetails, setUserDetails] = useState({
        fullName: '',
        phoneNumber: '',
        email: ''
    });
    const [asset, setAsset] = useState('BNB');
    const [amount, setAmount] = useState('');
    const [fiatAmount, setFiatAmount] = useState(0);
    const [bnbRate, setBnbRate] = useState(null);
    const [proofFile, setProofFile] = useState(null);
    const [proofPreview, setProofPreview] = useState(null);
    const [bankDetails, setBankDetails] = useState({
        method: 'UPI', // 'UPI' or 'BANK'
        upiId: '',
        accHolderName: '',
        accNumber: '',
        ifscCode: '',
        bankName: '',
        branch: ''
    });

    const [copied, setCopied] = useState(false);
    const [logos, setLogos] = useState({
        BNB: 'https://assets.coingecko.com/coins/images/825/small/binance-coin-logo.png',
        USDT: 'https://assets.coingecko.com/coins/images/325/small/tether.png'
    });

    // Fetch Asset Logos from CoinGecko
    useEffect(() => {
        const fetchLogos = async () => {
            try {
                const [bnbRes, usdtRes] = await Promise.all([
                    axios.get('https://api.coingecko.com/api/v3/coins/binancecoin'),
                    axios.get('https://api.coingecko.com/api/v3/coins/tether')
                ]);
                setLogos({
                    BNB: bnbRes.data.image.small,
                    USDT: usdtRes.data.image.small
                });
            } catch (err) {
                console.warn('Failed to fetch logos from CoinGecko API, using defaults.');
            }
        };
        fetchLogos();
    }, []);

    // Fetch BNB Rate
    const fetchBnbRate = useCallback(async () => {
        try {
            const res = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=inr');
            setBnbRate(res.data.binancecoin.inr);
        } catch (err) {
            console.error('Failed to fetch BNB rate:', err);
        }
    }, []);

    useEffect(() => {
        fetchBnbRate();
        const interval = setInterval(fetchBnbRate, 30000);
        return () => clearInterval(interval);
    }, [fetchBnbRate]);

    // Calculate Fiat Amount
    useEffect(() => {
        const qty = parseFloat(amount) || 0;
        if (activeTab === 'buy') {
            if (asset === 'BNB') {
                const rate = bnbRate ? bnbRate * 1.1 : 0; // Live + 10%
                setFiatAmount(qty * rate);
            } else {
                setFiatAmount(qty * 102); // Fixed 102
            }
        } else {
            if (asset === 'BNB') {
                const rate = bnbRate || 0; // Live
                setFiatAmount(qty * rate);
            } else {
                setFiatAmount(qty * 95); // Fixed 95
            }
        }
    }, [amount, asset, bnbRate, activeTab]);

    // Timer logic
    useEffect(() => {
        if (timer > 0) {
            const interval = setInterval(() => setTimer(t => t - 1), 1000);
            return () => clearInterval(interval);
        }
    }, [timer]);

    const formatTimer = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleCopy = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProofFile(file);
            setProofPreview(URL.createObjectURL(file));
        }
    };

    const nextStep = () => {
        if (step === 1) {
            if (!account) return connectWallet();
            if (!userDetails.fullName || !userDetails.phoneNumber || !userDetails.email) {
                return alert('Please fill in all personal details.');
            }
        }
        if (step === 2) {
            if (!amount || parseFloat(amount) <= 0) return alert('Please enter a valid amount.');
        }
        setStep(step + 1);
    };

    const handleSubmit = async () => {
        if (!proofFile) return alert('Please upload payment proof screenshot.');
        
        setStatus('submitting');
        try {
            const formData = new FormData();
            formData.append('user_wallet', account);
            formData.append('user_name', userDetails.fullName);
            formData.append('phone_number', userDetails.phoneNumber);
            formData.append('email', userDetails.email);
            formData.append('type', activeTab.toUpperCase());
            formData.append('asset', asset);
            formData.append('amount', amount);
            formData.append('inr_amount', fiatAmount);
            formData.append('proof', proofFile);
            
            if (activeTab === 'sell') {
                formData.append('bank_details', JSON.stringify(bankDetails));
            }

            await axios.post(`${API_URL}/fiat/transaction`, formData);
            
            setStatus('success');
            setTimer(15 * 60); // 15 minutes
        } catch (err) {
            setError(err.response?.data?.error || err.message);
            setStatus('error');
        }
    };

    const resetForm = () => {
        setStep(1);
        setStatus('idle');
        setAmount('');
        setProofFile(null);
        setProofPreview(null);
    };

    const StepIndicator = () => (
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 mb-8 md:mb-12">
            {[1, 2, 3, 4].map(s => (
                <div key={s} className="flex items-center">
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-black text-[10px] md:text-sm transition-all shadow-md ${
                        step >= s ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-gray-100/5 text-gray-500'
                    }`}>
                        {step > s ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : s}
                    </div>
                    {s < 4 && <div className={`w-6 md:w-12 h-1 bg-gray-100/5 mx-1 md:mx-2 rounded-full overflow-hidden`}>
                        <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: step > s ? '100%' : '0%' }} 
                            className="h-full bg-emerald-500" 
                        />
                    </div>}
                </div>
            ))}
        </div>
    );

    return (
        <main className="min-h-screen bg-[#0A0A0B] text-white pb-24 selection:bg-emerald-500/30 font-sans">
            <Navbar />
            
            <div className="pt-20 px-4 max-w-6xl mx-auto">
                {/* ── Fancy Hero Section ─────────────────────────────────────── */}
                <div className="text-center mb-8 relative">
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                        className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] -z-10" />
                    
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
                        <Sparkles className="w-3.5 h-3.5" /> AI-Driven Liquidity Bridge
                    </motion.div>
                    
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent italic">
                        The Nexus <span className="text-emerald-500 font-sans">Fiat Portal</span>
                    </h1>
                    
                    <p className="text-gray-400 font-medium max-w-2xl mx-auto text-lg leading-relaxed">
                        Experience the future of conversion. <span className="text-white">AI-optimized rates</span>, 
                        instant liquidity, and military-grade security for your INR to Crypto bridge.
                    </p>
                </div>

                {/* ── Guidance / How it works ────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                    {[
                        { title: 'Smart Selection', desc: 'AI analyzes 43+ parameters to lock the best global conversion rate.', icon: <Brain className="w-6 h-6 text-purple-400" /> },
                        { title: 'Automated Bridge', desc: 'Your transaction is routed through our secure liquidity nexus.', icon: <Zap className="w-6 h-6 text-amber-400" /> },
                        { title: 'Instant Execution', desc: 'Secure transfer to your wallet once the bridge verification is complete.', icon: <ShieldCheck className="w-6 h-6 text-emerald-400" /> }
                    ].map((item, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                            className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 transition-all group">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform font-bold">
                                {item.icon}
                            </div>
                            <h4 className="text-sm font-black uppercase tracking-widest text-white mb-2">{item.title}</h4>
                            <p className="text-xs text-gray-500 leading-relaxed font-semibold">{item.desc}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Main Card */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-[#111113] rounded-[3.5rem] shadow-2xl shadow-black/50 border border-white/5 overflow-hidden">
                        {/* Tabs */}
                        <div className="flex bg-black/40 p-3">
                            <button 
                                onClick={() => { setActiveTab('buy'); setStep(1); setStatus('idle'); }}
                                className={`flex-1 py-4 rounded-[2.2rem] font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${
                                    activeTab === 'buy' ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'text-gray-500 hover:text-gray-300'
                                }`}
                            >
                                <ArrowDownLeft className="w-5 h-5" /> Buy Crypto
                            </button>
                            <button 
                                onClick={() => { setActiveTab('sell'); setStep(1); setStatus('idle'); }}
                                className={`flex-1 py-4 rounded-[2.2rem] font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${
                                    activeTab === 'sell' ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/20' : 'text-gray-500 hover:text-gray-300'
                                }`}
                            >
                                <ArrowUpRight className="w-5 h-5" /> Sell Crypto
                            </button>
                        </div>

                        <div className="p-8 md:p-16">
                            <StepIndicator />

                            <AnimatePresence mode="wait">
                                {status === 'idle' && (
                                    <motion.div key={`step-${step}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                        {/* STEP 1: Personal Details */}
                                        {step === 1 && (
                                            <div className="space-y-6">
                                                <h3 className="text-2xl font-black text-white tracking-tight mb-2">Nexus Identity Verification</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Full Name</label>
                                                        <div className="relative">
                                                            <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                                            <input type="text" placeholder="John Doe" value={userDetails.fullName} onChange={(e) => setUserDetails({...userDetails, fullName: e.target.value})}
                                                                className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-white focus:bg-white/10 focus:border-emerald-500/30 outline-none transition-all" />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Phone Number</label>
                                                        <div className="relative">
                                                            <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                                            <input type="tel" placeholder="+91 98765 43210" value={userDetails.phoneNumber} onChange={(e) => setUserDetails({...userDetails, phoneNumber: e.target.value})}
                                                                className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-white focus:bg-white/10 focus:border-emerald-500/30 outline-none transition-all" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Email ID</label>
                                                    <div className="relative">
                                                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                                        <input type="email" placeholder="john@example.com" value={userDetails.email} onChange={(e) => setUserDetails({...userDetails, email: e.target.value})}
                                                            className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-white focus:bg-white/10 focus:border-emerald-500/30 outline-none transition-all" />
                                                    </div>
                                                </div>
                                                <div className={`p-6 rounded-2xl border ${account ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'} flex items-center justify-between`}>
                                                    <div className="flex items-center gap-4">
                                                        <Wallet className="w-6 h-6" />
                                                        <div>
                                                            <p className="font-black text-sm uppercase tracking-widest leading-none mb-1">Bridge Connection</p>
                                                            <p className="font-mono text-xs font-bold opacity-70">{account ? account : 'No Wallet Connected'}</p>
                                                        </div>
                                                    </div>
                                                    {!account && <button onClick={connectWallet} className="px-6 py-2 bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-transform active:scale-95 shadow-xl shadow-rose-500/20">Connect</button>}
                                                </div>
                                                <button onClick={nextStep} className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-[0.98]">
                                                    {account ? 'Proceed to Amount' : 'Connect Wallet to Start'}
                                                </button>
                                            </div>
                                        )}
                                        {/* STEP 2: Amount & Assets */}
                                        {step === 2 && (
                                            <div className="space-y-8">
                                                <h3 className="text-2xl font-black text-white tracking-tight mb-2">Nexus Routing Parameters</h3>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <button onClick={() => setAsset('BNB')} className={`p-6 rounded-[2.2rem] border-2 transition-all flex flex-col items-center gap-3 ${asset === 'BNB' ? 'border-amber-500 bg-amber-500/10' : 'border-white/5 hover:border-white/10'}`}>
                                                        <img src={logos.BNB} alt="BNB" className="w-12 h-12 rounded-xl shadow-lg shadow-amber-500/20 md:object-contain" />
                                                        <span className="font-black text-white">Binance Coin</span>
                                                    </button>
                                                    <button onClick={() => setAsset('USDT')} className={`p-6 rounded-[2.2rem] border-2 transition-all flex flex-col items-center gap-3 ${asset === 'USDT' ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/5 hover:border-white/10'}`}>
                                                        <img src={logos.USDT} alt="USDT" className="w-12 h-12 rounded-xl shadow-lg shadow-emerald-500/20 md:object-contain" />
                                                        <span className="font-black text-white">Tether USD</span>
                                                    </button>
                                                </div>
                                                <div className="space-y-4">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Enter {asset} Quantity</label>
                                                    <div className="relative">
                                                        <input type="number" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)}
                                                            className="w-full px-8 py-7 bg-white/5 border border-white/10 rounded-[2.2rem] font-black text-4xl text-white focus:bg-white/10 focus:border-emerald-500/30 outline-none transition-all placeholder:text-white/5" />
                                                        <div className="absolute right-8 top-1/2 -translate-y-1/2 font-black text-gray-500 uppercase tracking-widest">{asset}</div>
                                                    </div>
                                                </div>
                                                <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-gray-900 to-black text-white relative overflow-hidden shadow-2xl border border-white/5">
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl opacity-50" />
                                                    <div className="flex justify-between items-end">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Estimated {activeTab === 'buy' ? 'Payable' : 'Receivable'}</p>
                                                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase">AI Optimized</span>
                                                            </div>
                                                            <p className="text-4xl md:text-5xl font-black tracking-tighter">₹{fiatAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Live Rate Nexus</p>
                                                            <p className="text-sm font-black text-white/60 font-mono italic">
                                                                {asset === 'BNB' ? `₹${(bnbRate * (activeTab === 'buy' ? 1.1 : 1))?.toLocaleString()} / BNB` : `₹${activeTab === 'buy' ? '102' : '95'} / USDT`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-4">
                                                    <button onClick={() => setStep(1)} className="flex-1 py-5 bg-white/5 text-gray-400 rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5">Back</button>
                                                    <button onClick={nextStep} className="flex-[2] py-5 bg-white text-black rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-gray-200 transition-all">Proceed to Checkout</button>
                                                </div>
                                            </div>
                                        )}
                                        {/* STEP 3: Payment / Transfer */}
                                        {step === 3 && (
                                            <div className="space-y-8">
                                                <div className="text-center">
                                                    <h3 className="text-2xl font-black text-white tracking-tight mb-2">
                                                        {activeTab === 'buy' ? 'Complete Nexus Payment' : 'Transfer to Treasury Node'}
                                                    </h3>
                                                    <p className="text-sm text-gray-500 font-medium">Verify the parameters and execute the bridge transfer.</p>
                                                </div>
                                                <div className="bg-black/40 p-10 rounded-[3.5rem] border border-white/5 flex flex-col items-center">
                                                    <div className="w-64 h-64 bg-white p-5 rounded-[2.5rem] shadow-[0_0_50px_rgba(16,185,129,0.15)] border-4 border-emerald-500/20 mb-8 relative group">
                                                        <img src={activeTab === 'buy' ? '/images/fiat_pay_qr.png' : '/images/treasury_wallet_qr.png'} alt="QR Code" className="w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-500" />
                                                    </div>
                                                    <div className="w-full space-y-4">
                                                        <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/10">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                                                                    {activeTab === 'buy' ? 'Official UPI Nexus' : 'Treasury Link Address'}
                                                                </p>
                                                                <p className="font-mono text-sm font-bold text-white truncate pr-4">
                                                                    {activeTab === 'buy' ? 'purusothhrm1@ybl' : TREASURY_WALLET}
                                                                </p>
                                                            </div>
                                                            <button onClick={() => handleCopy(activeTab === 'buy' ? 'purusothhrm1@ybl' : TREASURY_WALLET)} className="p-3.5 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 hover:scale-110 transition-all active:scale-95">
                                                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                            </button>
                                                        </div>
                                                        {activeTab === 'sell' && (
                                                            <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-start gap-4">
                                                                <Info className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                                                                <p className="text-xs text-rose-200 font-bold leading-relaxed">
                                                                    Protocol Requirement: Ensure <span className="text-rose-400 underline font-black">{asset}</span> is sent via <span className="text-rose-400 underline font-black">BNB Smart Chain (BEP-20)</span> only.
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-4">
                                                    <button onClick={() => setStep(2)} className="flex-1 py-5 bg-white/5 text-gray-500 rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5">Back</button>
                                                    <button onClick={nextStep} className="flex-[2] py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all">I Have Executed Transfer</button>
                                                </div>
                                            </div>
                                        )}
                                        {/* STEP 4: Submit Proof */}
                                        {step === 4 && (
                                            <div className="space-y-8">
                                                <h3 className="text-2xl font-black text-white tracking-tight mb-2">Bridge Verification Proof</h3>
                                                <div className="space-y-6">
                                                    <div onClick={() => document.getElementById('dropzone-file').click()}
                                                        className="w-full aspect-video rounded-[3rem] bg-white/5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all overflow-hidden group">
                                                        {proofPreview ? (
                                                            <div className="relative w-full h-full">
                                                                <img src={proofPreview} alt="Proof" className="w-full h-full object-cover" />
                                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <p className="text-xs font-black uppercase tracking-widest bg-white text-black px-4 py-2 rounded-full">Change File</p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-center p-8">
                                                                <div className="w-20 h-20 bg-white/5 rounded-[1.8rem] shadow-xl flex items-center justify-center mx-auto mb-6 border border-white/5">
                                                                    <Upload className="w-10 h-10 text-emerald-500" />
                                                                </div>
                                                                <p className="text-sm font-black text-white uppercase tracking-widest mb-2">Upload Signal Snapshot</p>
                                                                <p className="text-xs text-gray-500 font-medium">Verify your payment via cryptographic visual proof</p>
                                                            </div>
                                                        )}
                                                        <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} />
                                                    </div>
                                                    {activeTab === 'sell' && (
                                                        <div className="space-y-6 pt-10 border-t border-white/5">
                                                            <div className="flex items-center gap-3 mb-6">
                                                                <Landmark className="w-5 h-5 text-emerald-500" />
                                                                <h4 className="text-lg font-black text-white uppercase tracking-tight">Withdrawal Nexus</h4>
                                                            </div>
                                                            <div className="flex bg-black/40 p-1.5 rounded-2xl mb-8 border border-white/5">
                                                                <button onClick={() => setBankDetails({...bankDetails, method: 'UPI'})} className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${bankDetails.method === 'UPI' ? 'bg-emerald-500 shadow-xl text-white' : 'text-gray-500'}`}>UPI Portal</button>
                                                                <button onClick={() => setBankDetails({...bankDetails, method: 'BANK'})} className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${bankDetails.method === 'BANK' ? 'bg-emerald-500 shadow-xl text-white' : 'text-gray-500'}`}>Bank Cluster</button>
                                                            </div>
                                                            {bankDetails.method === 'UPI' ? (
                                                                <div className="space-y-3">
                                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-3">Target UPI Identity</label>
                                                                    <input type="text" placeholder="yours@upi" value={bankDetails.upiId} onChange={(e) => setBankDetails({...bankDetails, upiId: e.target.value})}
                                                                        className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white focus:bg-white/10 focus:border-emerald-500/30 outline-none transition-all" />
                                                                </div>
                                                            ) : (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                                    {[
                                                                        { label: 'Account Holder', key: 'accHolderName' },
                                                                        { label: 'Account Number', key: 'accNumber' },
                                                                        { label: 'IFSC Protocol', key: 'ifscCode' },
                                                                        { label: 'Nexus Bank Name', key: 'bankName' }
                                                                    ].map(f => (
                                                                        <div key={f.key} className="space-y-2">
                                                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-3">{f.label}</label>
                                                                            <input type="text" value={bankDetails[f.key]} onChange={(e) => setBankDetails({...bankDetails, [f.key]: e.target.value})}
                                                                                className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-white focus:border-emerald-500/30 outline-none" />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex gap-4">
                                                    <button onClick={() => setStep(3)} className="flex-1 py-5 bg-white/5 text-gray-500 rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5">Back</button>
                                                    <button onClick={handleSubmit} className="flex-[2] py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all">Submit to AI Node</button>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {status === 'submitting' && (
                                    <motion.div key="submitting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 text-center">
                                        <div className="w-24 h-24 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-10 shadow-[0_0_30px_rgba(16,185,129,0.2)]" />
                                        <h3 className="text-3xl font-black text-white mb-3 tracking-tighter uppercase italic">Encrypting Signal</h3>
                                        <p className="text-emerald-500 font-bold uppercase text-[10px] tracking-[0.4em] animate-pulse">Establishing secure link to treasury nexus...</p>
                                    </motion.div>
                                )}

                                {status === 'success' && (
                                    <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center">
                                        <div className="w-36 h-36 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-12 border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.1)] relative">
                                            <div className="absolute inset-0 rounded-full animate-ping bg-emerald-500/10" />
                                            <CheckCircle2 className="w-16 h-16 text-emerald-500 relative z-10" />
                                        </div>
                                        <h3 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase italic">Signal Broadcasted</h3>
                                        <p className="text-gray-500 font-medium mb-12 max-w-sm mx-auto leading-relaxed">
                                            Nexus AI is validating the cryptographic parameters. Return to the terminal or wait for execution.
                                        </p>
                                        <div className="max-w-xs mx-auto bg-gradient-to-b from-gray-900 to-black text-white p-12 rounded-[3rem] shadow-3xl border border-white/5 relative overflow-hidden mb-12">
                                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
                                            <Clock className="w-10 h-10 text-emerald-500 mb-6 mx-auto opacity-80" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.5em] mb-4 text-gray-500">Execution Window</p>
                                            <p className="text-6xl font-black tracking-tighter font-mono bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">{formatTimer(timer)}</p>
                                        </div>
                                        <button onClick={resetForm} className="px-14 py-5 bg-white text-black rounded-[1.8rem] font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all shadow-xl">Nexus Terminal</button>
                                    </motion.div>
                                )}

                                {status === 'error' && (
                                    <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 text-center">
                                        <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-10 border border-rose-500/20">
                                            <AlertTriangle className="w-10 h-10 text-rose-500" />
                                        </div>
                                        <h3 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase italic">Channel Disturbance</h3>
                                        <p className="text-gray-500 mb-12 font-medium max-w-xs mx-auto leading-relaxed">{error || 'Unknown protocol failure occurred during bridge sync.'}</p>
                                        <button onClick={() => setStatus('idle')} className="px-14 py-5 bg-rose-500 text-white rounded-[1.8rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-500/20 hover:bg-rose-600 transition-all">Re-Sync Link</button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { title: 'Secure Nexus', desc: 'AI-assisted verification ensures zero-latency fraud protection.', icon: <ShieldCheck className="w-6 h-6 text-emerald-500" /> },
                            { title: '24H Reconciliation', desc: 'Cross-chain identity mismatches are automatically refunded within 24h.', icon: <Clock className="w-6 h-6 text-emerald-500" /> },
                            { title: 'AI-Audit Logic', desc: 'Every bridge request is audited by the B20 Nexus Intelligence layer.', icon: <Brain className="w-6 h-6 text-emerald-500" /> }
                        ].map((s, i) => (
                            <div key={i} className="p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col items-center text-center gap-4 group hover:bg-white/10 transition-all">
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 group-hover:scale-110 transition-transform">
                                    {s.icon}
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 text-white">{s.title}</h4>
                                    <p className="text-xs text-gray-500 leading-relaxed font-semibold">{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            <style jsx global>{`
                input::-webkit-outer-spin-button,
                input::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
            `}</style>
        </main>
    );
}
