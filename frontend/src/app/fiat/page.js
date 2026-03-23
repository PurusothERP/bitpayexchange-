'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    DollarSign, ArrowRightLeft, ShieldCheck, Wallet, 
    Smartphone, Mail, User, QRCode, Copy, Upload, 
    CheckCircle2, AlertTriangle, Clock, Landmark, CreditCard,
    ArrowUpRight, ArrowDownLeft, Loader2, Info, Check
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
        <div className="flex items-center justify-center gap-4 mb-12">
            {[1, 2, 3, 4].map(s => (
                <div key={s} className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all shadow-md ${
                        step >= s ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-gray-100 text-gray-400'
                    }`}>
                        {step > s ? <Check className="w-5 h-5" /> : s}
                    </div>
                    {s < 4 && <div className={`w-12 h-1 bg-gray-100 mx-2 rounded-full overflow-hidden`}>
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
        <main className="min-h-screen bg-[#F8FAFC] pb-24">
            <Navbar />
            
            <div className="pt-32 px-4 max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter mb-4">
                        Fiat <span className="text-emerald-600">Buy & Sell</span>
                    </h1>
                    <p className="text-gray-500 font-medium max-w-lg mx-auto">
                        Seamlessly convert between INR and Crypto with admin-verified transactions.
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-[3rem] shadow-2xl shadow-emerald-500/5 border border-emerald-100/50 overflow-hidden">
                    {/* Tabs */}
                    <div className="flex bg-gray-50 p-2">
                        <button 
                            onClick={() => { setActiveTab('buy'); setStep(1); }}
                            className={`flex-1 py-4 rounded-[1.8rem] font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                activeTab === 'buy' ? 'bg-white text-emerald-600 shadow-xl shadow-emerald-500/10' : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            <ArrowDownLeft className="w-5 h-5" /> Buy Crypto
                        </button>
                        <button 
                            onClick={() => { setActiveTab('sell'); setStep(1); }}
                            className={`flex-1 py-4 rounded-[1.8rem] font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                activeTab === 'sell' ? 'bg-white text-rose-600 shadow-xl shadow-rose-500/10' : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            <ArrowUpRight className="w-5 h-5" /> Sell Crypto
                        </button>
                    </div>

                    <div className="p-8 md:p-12">
                        <StepIndicator />

                        <AnimatePresence mode="wait">
                            {status === 'idle' && (
                                <motion.div key={`step-${step}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                    {/* STEP 1: Personal Details */}
                                    {step === 1 && (
                                        <div className="space-y-6">
                                            <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">User Authentication</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Full Name</label>
                                                    <div className="relative">
                                                        <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                        <input 
                                                            type="text" 
                                                            placeholder="John Doe" 
                                                            value={userDetails.fullName}
                                                            onChange={(e) => setUserDetails({...userDetails, fullName: e.target.value})}
                                                            className="w-full pl-14 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-gray-900 focus:bg-white focus:border-emerald-500/30 outline-none transition-all"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Phone Number</label>
                                                    <div className="relative">
                                                        <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                        <input 
                                                            type="tel" 
                                                            placeholder="+91 98765 43210" 
                                                            value={userDetails.phoneNumber}
                                                            onChange={(e) => setUserDetails({...userDetails, phoneNumber: e.target.value})}
                                                            className="w-full pl-14 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-gray-900 focus:bg-white focus:border-emerald-500/30 outline-none transition-all"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Email ID</label>
                                                <div className="relative">
                                                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                    <input 
                                                        type="email" 
                                                        placeholder="john@example.com" 
                                                        value={userDetails.email}
                                                        onChange={(e) => setUserDetails({...userDetails, email: e.target.value})}
                                                        className="w-full pl-14 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-gray-900 focus:bg-white focus:border-emerald-500/30 outline-none transition-all"
                                                    />
                                                </div>
                                            </div>
                                            
                                            <div className={`p-6 rounded-2xl border ${account ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'} flex items-center justify-between`}>
                                                <div className="flex items-center gap-4">
                                                    <Wallet className="w-6 h-6" />
                                                    <div>
                                                        <p className="font-black text-sm uppercase tracking-widest leading-none mb-1">Connected Wallet</p>
                                                        <p className="font-mono text-xs font-bold">{account ? account : 'No Wallet Connected'}</p>
                                                    </div>
                                                </div>
                                                {!account && <button onClick={connectWallet} className="px-6 py-2 bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-transform active:scale-95 shadow-lg shadow-rose-500/20">Connect</button>}
                                            </div>

                                            <button onClick={nextStep} className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all active:scale-[0.98]">
                                                {account ? 'Proceed to Amount' : 'Connect Wallet to Start'}
                                            </button>
                                        </div>
                                    )}

                                    {/* STEP 2: Amount & Assets */}
                                    {step === 2 && (
                                        <div className="space-y-8">
                                            <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Transaction Details</h3>
                                            
                                            <div className="grid grid-cols-2 gap-4">
                                                <button 
                                                    onClick={() => setAsset('BNB')}
                                                    className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 ${
                                                        asset === 'BNB' ? 'border-amber-500 bg-amber-50' : 'border-gray-100 hover:border-gray-200'
                                                    }`}
                                                >
                                                    <img src={logos.BNB} alt="BNB" className="w-12 h-12 rounded-xl shadow-lg shadow-amber-500/20 object-contain" />
                                                    <span className="font-black text-gray-900">Binance Coin</span>
                                                </button>
                                                <button 
                                                    onClick={() => setAsset('USDT')}
                                                    className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 ${
                                                        asset === 'USDT' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 hover:border-gray-200'
                                                    }`}
                                                >
                                                    <img src={logos.USDT} alt="USDT" className="w-12 h-12 rounded-xl shadow-lg shadow-emerald-500/20 object-contain" />
                                                    <span className="font-black text-gray-900">Tether USD</span>
                                                </button>
                                            </div>

                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Enter {asset} Quantity</label>
                                                <div className="relative">
                                                    <input 
                                                        type="number" 
                                                        placeholder="0.00" 
                                                        value={amount}
                                                        onChange={(e) => setAmount(e.target.value)}
                                                        className="w-full px-8 py-6 bg-gray-50 border border-gray-100 rounded-[2rem] font-black text-3xl text-gray-900 focus:bg-white focus:border-emerald-500/30 outline-none transition-all placeholder:text-gray-200"
                                                    />
                                                    <div className="absolute right-8 top-1/2 -translate-y-1/2 font-black text-gray-400 uppercase tracking-widest">{asset}</div>
                                                </div>
                                            </div>

                                            <div className="p-8 rounded-[2.5rem] bg-gray-900 text-white relative overflow-hidden shadow-2xl">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-2">Estimated {activeTab === 'buy' ? 'Payable' : 'Receivable'}</p>
                                                        <p className="text-4xl md:text-5xl font-black tracking-tighter">₹{fiatAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Live Rate</p>
                                                        <p className="text-sm font-black text-white/80">
                                                            {asset === 'BNB' ? `₹${(bnbRate * (activeTab === 'buy' ? 1.1 : 1)).toLocaleString()} / BNB` : `₹${activeTab === 'buy' ? '102' : '95'} / USDT`}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-4">
                                                <button onClick={() => setStep(1)} className="flex-1 py-5 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-200 transition-all">Back</button>
                                                <button onClick={nextStep} className="flex-[2] py-5 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all">Proceed to Checkout</button>
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP 3: Payment / Transfer */}
                                    {step === 3 && (
                                        <div className="space-y-8">
                                            <div className="text-center">
                                                <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">
                                                    {activeTab === 'buy' ? 'Complete INR Payment' : 'Transfer Crypto to Treasury'}
                                                </h3>
                                                <p className="text-sm text-gray-500 font-medium">Scan the QR code below to initiate the process.</p>
                                            </div>

                                            <div className="bg-gray-50 p-10 rounded-[3rem] border border-gray-100 flex flex-col items-center">
                                                <div className="w-64 h-64 bg-white p-4 rounded-[2rem] shadow-2xl border border-gray-100 mb-8 relative group">
                                                    <img 
                                                        src={activeTab === 'buy' ? '/images/fiat_pay_qr.png' : '/images/treasury_wallet_qr.png'}
                                                        alt="QR Code" 
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>

                                                <div className="w-full space-y-4">
                                                    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Treasury ID</p>
                                                            <p className="font-mono text-sm font-bold text-gray-900 truncate pr-4">
                                                                {activeTab === 'buy' ? 'B20LAB.ADMIN@UPI' : TREASURY_WALLET}
                                                            </p>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleCopy(activeTab === 'buy' ? 'B20LAB.ADMIN@UPI' : TREASURY_WALLET)}
                                                            className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg hover:scale-110 transition-all active:scale-95"
                                                        >
                                                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                    
                                                    {activeTab === 'sell' && (
                                                        <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start gap-4">
                                                            <Info className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                                                            <p className="text-xs text-rose-700 font-bold leading-relaxed">
                                                                Ensure you are sending <span className="underline">{asset}</span> via the <span className="underline">BNB Smart Chain (BEP-20)</span> network only.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex gap-4">
                                                <button onClick={() => setStep(2)} className="flex-1 py-5 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-200 transition-all">Back</button>
                                                <button onClick={nextStep} className="flex-[2] py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 transition-all">I Have Paid</button>
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP 4: Submit Proof */}
                                    {step === 4 && (
                                        <div className="space-y-8">
                                            <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Verification Proof</h3>
                                            
                                            <div className="space-y-6">
                                                <div 
                                                    onClick={() => document.getElementById('dropzone-file').click()}
                                                    className="w-full aspect-video rounded-[2.5rem] bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-50/30 transition-all overflow-hidden"
                                                >
                                                    {proofPreview ? (
                                                        <img src={proofPreview} alt="Proof" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="text-center p-8">
                                                            <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-4 border border-gray-100">
                                                                <Upload className="w-8 h-8 text-gray-400" />
                                                            </div>
                                                            <p className="text-sm font-black text-gray-900 uppercase tracking-widest mb-1">Upload Screenshot</p>
                                                            <p className="text-xs text-gray-400 font-medium">Capture the payment confirmation screen</p>
                                                        </div>
                                                    )}
                                                    <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} />
                                                </div>

                                                {activeTab === 'sell' && (
                                                    <div className="space-y-6 pt-6 border-t border-gray-100">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <Landmark className="w-5 h-5 text-emerald-500" />
                                                            <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">Withdrawal Destination</h4>
                                                        </div>

                                                        <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-6">
                                                            <button onClick={() => setBankDetails({...bankDetails, method: 'UPI'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${bankDetails.method === 'UPI' ? 'bg-white shadow-lg text-emerald-600' : 'text-gray-400'}`}>UPI ID</button>
                                                            <button onClick={() => setBankDetails({...bankDetails, method: 'BANK'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${bankDetails.method === 'BANK' ? 'bg-white shadow-lg text-emerald-600' : 'text-gray-400'}`}>Bank Account</button>
                                                        </div>

                                                        {bankDetails.method === 'UPI' ? (
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">UPI ID (e.g., example@okaxis)</label>
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="yours@upi" 
                                                                    value={bankDetails.upiId}
                                                                    onChange={(e) => setBankDetails({...bankDetails, upiId: e.target.value})}
                                                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-gray-900 focus:bg-white focus:border-emerald-500/30 outline-none transition-all"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <div className="space-y-2">
                                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Account Holder Name</label>
                                                                    <input type="text" value={bankDetails.accHolderName} onChange={(e) => setBankDetails({...bankDetails, accHolderName: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border rounded-2xl font-bold" />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Account Number</label>
                                                                    <input type="text" value={bankDetails.accNumber} onChange={(e) => setBankDetails({...bankDetails, accNumber: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border rounded-2xl font-bold" />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">IFSC Code</label>
                                                                    <input type="text" value={bankDetails.ifscCode} onChange={(e) => setBankDetails({...bankDetails, ifscCode: e.target.value.toUpperCase()})} className="w-full px-6 py-4 bg-gray-50 border rounded-2xl font-bold" />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Bank Name</label>
                                                                    <input type="text" value={bankDetails.bankName} onChange={(e) => setBankDetails({...bankDetails, bankName: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border rounded-2xl font-bold" />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex gap-4">
                                                <button onClick={() => setStep(3)} className="flex-1 py-5 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-200 transition-all">Back</button>
                                                <button onClick={handleSubmit} className="flex-[2] py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 transition-all">Final Submit</button>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {status === 'submitting' && (
                                <motion.div key="submitting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 text-center">
                                    <div className="w-24 h-24 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-8" />
                                    <h3 className="text-3xl font-black text-gray-900 mb-2 tracking-tighter uppercase">Encrypting Signal</h3>
                                    <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em] animate-pulse">Establishing secure link to treasury nexus...</p>
                                </motion.div>
                            )}

                            {status === 'success' && (
                                <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center">
                                    <div className="w-32 h-32 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-10 border border-emerald-100 shadow-xl shadow-emerald-500/10">
                                        <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                                    </div>
                                    <h3 className="text-4xl font-black text-gray-900 mb-3 tracking-tighter uppercase">Submission Active</h3>
                                    <p className="text-gray-500 font-medium mb-12 max-w-sm mx-auto">
                                        Our administrators are verifying your transaction. Please do not refresh.
                                    </p>

                                    <div className="max-w-xs mx-auto bg-gray-900 text-white p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden mb-12">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
                                        <Clock className="w-10 h-10 text-emerald-500 mb-4 mx-auto" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-2 opacity-60">Verification Window</p>
                                        <p className="text-5xl font-mono font-black">{formatTimer(timer)}</p>
                                    </div>

                                    <button onClick={resetForm} className="px-12 py-5 bg-gray-100 text-gray-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all">Done</button>
                                </motion.div>
                            )}

                            {status === 'error' && (
                                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 text-center">
                                    <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-8 border border-rose-100">
                                        <AlertTriangle className="w-10 h-10 text-rose-500" />
                                    </div>
                                    <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tighter uppercase">Channel Disrupted</h3>
                                    <p className="text-gray-500 mb-12 font-medium">{error || 'Unknown protocol failure occurred.'}</p>
                                    <button onClick={() => setStatus('idle')} className="px-12 py-5 bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-500/20">Try Again</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-white/60 backdrop-blur-xl border border-white rounded-2xl shadow-sm flex items-start gap-4">
                        <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest mb-1">Secure Nexus</h4>
                            <p className="text-xs text-gray-500 leading-relaxed">Admin verification ensures zero fraud and 100% asset delivery.</p>
                        </div>
                    </div>
                    <div className="p-6 bg-white/60 backdrop-blur-xl border border-white rounded-2xl shadow-sm flex items-start gap-4">
                        <Clock className="w-6 h-6 text-emerald-600 shrink-0" />
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest mb-1">24H Refunds</h4>
                            <p className="text-xs text-gray-500 leading-relaxed">Name mismatches are automatically refunded within 24 hours.</p>
                        </div>
                    </div>
                    <div className="p-6 bg-white/60 backdrop-blur-xl border border-white rounded-2xl shadow-sm flex items-start gap-4">
                        <Smartphone className="w-6 h-6 text-emerald-600 shrink-0" />
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest mb-1">Instant Alerts</h4>
                            <p className="text-xs text-gray-500 leading-relaxed">Get notified via email once the administrator releases your funds.</p>
                        </div>
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
