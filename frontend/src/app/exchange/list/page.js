'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import { 
    Plus, Rocket, ShieldCheck, Zap, Globe, MessageSquare, Twitter, Facebook, 
    FileText, CheckCircle2, AlertTriangle, ArrowRight, Wallet, Activity
} from 'lucide-react';
import Link from 'next/link';

export default function ListTokenPage() {
    const { account, signer, connectWallet } = useWallet();
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [error, setError] = useState('');
    
    const [formData, setFormData] = useState({
        name: '',
        logo: '',
        contractId: '',
        whitepaper: '',
        website: '',
        telegram: '',
        facebook: '',
        twitter: ''
    });

    const LISTING_FEE = "0.10";
    const TREASURY_WALLET = "0x279A5618Ff049667234c030792C0594B311A0451";

    const handleApply = async (e) => {
        e.preventDefault();
        if (!account) { connectWallet(); return; }
        
        setStatus('loading');
        setError('');

        try {
            if (!signer) throw new Error("Wallet not initialized");
            
            // 1. Trigger Payment
            const tx = await signer.sendTransaction({
                to: TREASURY_WALLET,
                value: ethers.parseEther(LISTING_FEE)
            });
            
            await tx.wait();
            
            // 2. Mock submission (in real app, this would hit a backend API)
            // axios.post('/api/listing/apply', formData);
            
            setStatus('success');
        } catch (err) {
            console.error(err);
            setError(err.reason || err.message || "Transaction failed");
            setStatus('error');
        }
    };

    return (
        <main className="min-h-screen bg-[#050511] text-white selection:bg-rose-500 selection:text-white pb-32 font-sans relative overflow-hidden">
            <Navbar />
            
            {/* Ambient Backgrounds */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10">
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-rose-500/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[1000px] h-[1000px] bg-indigo-500/10 rounded-full blur-[150px]" />
            </div>

            <div className="pt-32 px-6 max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="text-center mb-16">
                    <motion.span 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-[0.3em] mb-6"
                    >
                        <Plus className="w-3 h-3" /> Professional Listing Portal
                    </motion.span>
                    <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-6">
                        Scale Your <span className="text-red-gradient">Vision</span> on B20.
                    </h1>
                    <p className="text-white/40 text-sm md:text-lg font-bold uppercase tracking-[0.2em] max-w-3xl mx-auto leading-relaxed">
                        Join the elite ecosystem of verified projects. Reach thousands of active traders with institucional grade exposure.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                    {/* Left: Benefits & Content */}
                    <div className="lg:col-span-5 space-y-8">
                        <div className="p-8 bg-white/[0.03] border border-white/10 rounded-[3rem] space-y-10 group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:rotate-12 transition-transform">
                                <Rocket className="w-40 h-40" />
                            </div>
                            
                            <h2 className="text-2xl font-black uppercase tracking-tight">Why List on <span className="text-rose-500">B20 Exchange?</span></h2>
                            
                            <div className="space-y-6">
                                {[
                                    { icon: <Zap className="w-5 h-5" />, title: 'Instant Liquidity', desc: 'Direct connection to major BSC pools for seamless trading volume.' },
                                    { icon: <ShieldCheck className="w-5 h-5" />, title: 'Verified Trust', desc: 'B20 Verified badge enhances project credibility and investor confidence.' },
                                    { icon: <Activity className="w-5 h-5" />, title: 'Trading Analytics', desc: 'Professional level charts and real-time execution for all listed pairs.' },
                                    { icon: <Globe className="w-5 h-5" />, title: 'Global Exposure', desc: 'Featured placement in our trending markets section seen by thousands.' }
                                ].map((b, i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0 text-rose-500">
                                            {b.icon}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black uppercase tracking-wide text-white mb-1">{b.title}</h4>
                                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-relaxed">{b.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-6 border-t border-white/10">
                                <div className="p-6 bg-gradient-to-r from-rose-500/20 to-indigo-500/20 rounded-2xl border border-white/10">
                                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest leading-relaxed mb-4">
                                        Listing fee is used to maintain the exchange infrastructure and secure high-priority RPC routing for your token.
                                    </p>
                                    <div className="flex items-center justify-between text-xs font-black uppercase tracking-tighter">
                                        <span>Official Listing Fee</span>
                                        <span className="text-rose-500 text-lg">0.10 BNB</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Listing Form */}
                    <div className="lg:col-span-7">
                        <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 lg:p-12 shadow-2xl relative">
                            <form onSubmit={handleApply} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-2">Token Name</label>
                                        <input 
                                            required type="text" placeholder="e.g. Galactic Star"
                                            value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold outline-none focus:border-rose-500/50 transition-all text-white" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-2">Logo URL</label>
                                        <input 
                                            required type="url" placeholder="https://..."
                                            value={formData.logo} onChange={e => setFormData({...formData, logo: e.target.value})}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold outline-none focus:border-rose-500/50 transition-all text-white" 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-2">Contract Address (ID)</label>
                                    <input 
                                        required type="text" placeholder="0x..."
                                        value={formData.contractId} onChange={e => setFormData({...formData, contractId: e.target.value})}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold outline-none focus:border-rose-500/50 transition-all text-white font-mono" 
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-2 flex items-center gap-2"><FileText className="w-3 h-3" /> Whitepaper URL</label>
                                        <input 
                                            type="url" placeholder="Optional"
                                            value={formData.whitepaper} onChange={e => setFormData({...formData, whitepaper: e.target.value})}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold outline-none focus:border-rose-500/50 transition-all text-white" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-2 flex items-center gap-2"><Globe className="w-3 h-3" /> Website URL</label>
                                        <input 
                                            type="url" placeholder="https://..."
                                            value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold outline-none focus:border-rose-500/50 transition-all text-white" 
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-2 flex items-center gap-2"><MessageSquare className="w-3 h-3" /> Telegram</label>
                                        <input 
                                            type="text" placeholder="@channel"
                                            value={formData.telegram} onChange={e => setFormData({...formData, telegram: e.target.value})}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold outline-none focus:border-rose-500/50 transition-all text-white" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-2 flex items-center gap-2"><Twitter className="w-3 h-3" /> Twitter</label>
                                        <input 
                                            type="text" placeholder="@handle"
                                            value={formData.twitter} onChange={e => setFormData({...formData, twitter: e.target.value})}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold outline-none focus:border-rose-500/50 transition-all text-white" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-2 flex items-center gap-2"><Facebook className="w-3 h-3" /> Facebook</label>
                                        <input 
                                            type="text" placeholder="profile"
                                            value={formData.facebook} onChange={e => setFormData({...formData, facebook: e.target.value})}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold outline-none focus:border-rose-500/50 transition-all text-white" 
                                        />
                                    </div>
                                </div>

                                <div className="pt-8">
                                    <AnimatePresence>
                                        {status === 'success' && (
                                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mb-6 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex items-center gap-4">
                                                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                                <p className="text-xs font-black text-emerald-500 uppercase tracking-widest">Application Submitted Successfully!</p>
                                            </motion.div>
                                        )}
                                        {error && (
                                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mb-6 p-6 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-center gap-4">
                                                <AlertTriangle className="w-6 h-6 text-rose-500" />
                                                <p className="text-xs font-black text-rose-500 uppercase tracking-widest">{error}</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <button 
                                        disabled={status === 'loading'}
                                        className="w-full py-6 bg-white text-black font-black text-lg uppercase tracking-[0.3em] rounded-[2rem] shadow-2xl hover:bg-rose-500 hover:text-white transition-all active:scale-[0.98] flex items-center justify-center gap-4 group disabled:opacity-30"
                                    >
                                        {status === 'loading' ? (
                                            <span className="flex items-center gap-3">Processing Transaction <Zap className="w-5 h-5 animate-pulse text-amber-500" /></span>
                                        ) : (
                                            <>Apply for Listing <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" /></>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
