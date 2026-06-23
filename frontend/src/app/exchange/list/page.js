'use client';

import { useState } from 'react';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import {
    Plus, Rocket, ShieldCheck, Zap, Globe, MessageSquare, Twitter,
    FileText, CheckCircle2, AlertTriangle, ArrowRight, Activity, Coins, Info
} from 'lucide-react';

import { API_URL } from '@/lib/api';
const LISTING_FEE = '0.10';
const TREASURY_WALLET = process.env.NEXT_PUBLIC_FEE_WALLET || '0x6e10d0414d64e37668da38b19062e3c13471e806';

export default function ListTokenPage() {
    const { account, signer, connectWallet } = useWallet();
    const [status, setStatus] = useState('idle'); // idle, paying, submitting, success, error
    const [error, setError] = useState('');
    const [txHash, setTxHash] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        symbol: '',
        contractId: '',
        description: '',
        totalSupply: '',
        logo: '',
        whitepaper: '',
        website: '',
        telegram: '',
        twitter: '',
        facebook: '',
    });

    const set = (k, v) => setFormData(p => ({ ...p, [k]: v }));

    const handleApply = async (e) => {
        e.preventDefault();
        if (!account) { connectWallet(); return; }
        if (!formData.name || !formData.symbol || !formData.contractId)
            return alert('Token Name, Symbol and Contract Address are required.');

        setStatus('paying');
        setError('');

        try {
            if (!signer) throw new Error('Wallet not initialized');

            // 1. Collect listing fee on-chain
            const tx = await signer.sendTransaction({
                to: TREASURY_WALLET,
                value: ethers.parseEther(LISTING_FEE)
            });
            await tx.wait();
            setTxHash(tx.hash);
            setStatus('submitting');

            // 2. Save to backend
            await axios.post(`${API_URL}/admin/listing/submit`, {
                contract_address: formData.contractId,
                token_name: formData.name,
                token_symbol: formData.symbol.toUpperCase(),
                description: formData.description,
                logo_url: formData.logo,
                website: formData.website,
                whitepaper: formData.whitepaper,
                telegram: formData.telegram,
                twitter: formData.twitter,
                facebook: formData.facebook,
                total_supply: formData.totalSupply,
                owner_wallet: account,
                tx_hash: tx.hash,
                listing_fee_bnb: parseFloat(LISTING_FEE)
            });

            setStatus('success');
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || err.reason || err.message || 'Application failed');
            setStatus('error');
        }
    };

    return (
        <main className="min-h-screen bg-[#050511] text-white pb-32 font-sans relative overflow-hidden">
            <Navbar />

            {/* Ambient */}
            <div className="fixed inset-0 pointer-events-none -z-10">
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-teal-500/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[1000px] h-[1000px] bg-teal-500/10 rounded-full blur-[150px]" />
            </div>

            <div className="pt-32 px-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-16">
                    <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-500 text-[10px] font-black uppercase tracking-[0.3em] mb-6">
                        <Plus className="w-3 h-3" /> Professional Listing Portal
                    </motion.span>
                    <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-6">
                        List Your <span className="bg-gradient-to-r from-teal-600 to-teal-700 bg-clip-text text-transparent">Token</span> on Tez Exchange
                    </h1>
                    <p className="text-white/40 text-sm font-bold uppercase tracking-[0.2em] max-w-2xl mx-auto">
                        Complete the form below, pay the listing fee, and our team will verify and list your token within 24 hours.
                    </p>
                </div>

                {status === 'success' ? (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className="max-w-2xl mx-auto text-center p-16 bg-emerald-500/10 border border-emerald-500/20 rounded-[3rem]">
                        <CheckCircle2 className="w-20 h-20 text-emerald-400 mx-auto mb-6" />
                        <h2 className="text-3xl font-black text-white uppercase mb-4">Application Submitted!</h2>
                        <p className="text-emerald-300 font-bold text-sm mb-2">Your listing request is now in the admin review queue.</p>
                        <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-6">Fee TX: {txHash.slice(0,12)}...{txHash.slice(-8)}</p>
                        <a href={`https://bscscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-500/30 transition-all">
                            View Fee TX on BSCScan ↗
                        </a>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                        {/* Left: Benefits */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="p-8 bg-white/[0.03] border border-white/10 rounded-[3rem] space-y-8">
                                <h2 className="text-xl font-black uppercase tracking-tight">Why List on <span className="text-teal-500">Tez Exchange?</span></h2>
                                {[
                                    { icon: <Zap className="w-5 h-5" />, title: 'Instant Liquidity', desc: 'Direct connection to major BSC pools for seamless trading volume.' },
                                    { icon: <ShieldCheck className="w-5 h-5" />, title: 'Verified Trust Badge', desc: 'B20 Verified badge enhances project credibility and investor confidence.' },
                                    { icon: <Activity className="w-5 h-5" />, title: 'Spot & Futures', desc: 'Approved tokens are immediately tradeable on Spot and Futures.' },
                                    { icon: <Globe className="w-5 h-5" />, title: 'Global Exposure', desc: 'Featured in trending markets section seen by thousands daily.' },
                                ].map((b, i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0 text-teal-500">{b.icon}</div>
                                        <div>
                                            <h4 className="text-sm font-black uppercase tracking-wide text-white mb-1">{b.title}</h4>
                                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-relaxed">{b.desc}</p>
                                        </div>
                                    </div>
                                ))}
                                <div className="pt-4 border-t border-white/10">
                                    <div className="p-5 bg-gradient-to-r from-teal-600/20 to-teal-700/20 rounded-2xl border border-white/10">
                                        <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-3">One-time listing fee</p>
                                        <div className="flex items-center justify-between text-xs font-black uppercase">
                                            <span>Official Listing Fee</span>
                                            <span className="text-teal-500 text-xl">0.10 BNB</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Important note */}
                            <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
                                <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-amber-200 font-semibold leading-relaxed">
                                    CoinGecko / CoinMarketCap integration is <strong>not mandatory</strong> for listing. Admin manually verifies and lists the token based on the details you provide.
                                </p>
                            </div>
                        </div>

                        {/* Right: Form */}
                        <div className="lg:col-span-8">
                            <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 lg:p-12 shadow-2xl">
                                <form onSubmit={handleApply} className="space-y-6">

                                    {/* Token Identity */}
                                    <div>
                                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-4 flex items-center gap-2"><Coins className="w-3 h-3" /> Token Identity</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            {[
                                                { label: 'Token Name *', key: 'name', placeholder: 'e.g. Galactic Star' },
                                                { label: 'Token Symbol *', key: 'symbol', placeholder: 'e.g. GSTR' },
                                            ].map(f => (
                                                <div key={f.key} className="space-y-2">
                                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-2">{f.label}</label>
                                                    <input required type="text" placeholder={f.placeholder}
                                                        value={formData[f.key]} onChange={e => set(f.key, e.target.value)}
                                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold outline-none focus:border-teal-500/50 transition-all text-white" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Contract */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-2">Contract Address (BEP-20) *</label>
                                        <input required type="text" placeholder="0x..."
                                            value={formData.contractId} onChange={e => set('contractId', e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold font-mono outline-none focus:border-teal-500/50 transition-all text-white" />
                                    </div>

                                    {/* Description + Supply */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-2">Description</label>
                                            <textarea rows={3} placeholder="Brief project description..."
                                                value={formData.description} onChange={e => set('description', e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold outline-none focus:border-teal-500/50 transition-all text-white resize-none" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-2">Total Supply</label>
                                            <input type="text" placeholder="e.g. 1,000,000,000"
                                                value={formData.totalSupply} onChange={e => set('totalSupply', e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold outline-none focus:border-teal-500/50 transition-all text-white" />
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-2 mt-3 block">Logo URL</label>
                                            <input type="text" placeholder="https://... (512×512 PNG/JPG)"
                                                value={formData.logo} onChange={e => set('logo', e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold outline-none focus:border-teal-500/50 transition-all text-white" />
                                        </div>
                                    </div>

                                    {/* Links */}
                                    <div>
                                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-4 flex items-center gap-2"><Globe className="w-3 h-3" /> Project Links</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            {[
                                                { label: 'Website', key: 'website', placeholder: 'https://', icon: <Globe className="w-3 h-3" /> },
                                                { label: 'Whitepaper', key: 'whitepaper', placeholder: 'https://', icon: <FileText className="w-3 h-3" /> },
                                                { label: 'Telegram', key: 'telegram', placeholder: '@channel or t.me/...', icon: <MessageSquare className="w-3 h-3" /> },
                                                { label: 'Twitter / X', key: 'twitter', placeholder: '@handle', icon: <Twitter className="w-3 h-3" /> },
                                            ].map(f => (
                                                <div key={f.key} className="space-y-2">
                                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-2 flex items-center gap-1.5">{f.icon} {f.label}</label>
                                                    <input type="text" placeholder={f.placeholder}
                                                        value={formData[f.key]} onChange={e => set(f.key, e.target.value)}
                                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold outline-none focus:border-teal-500/50 transition-all text-white" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Status messages */}
                                    <AnimatePresence>
                                        {error && (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                                                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                                                <p className="text-xs font-bold text-red-300">{error}</p>
                                            </motion.div>
                                        )}
                                        {status === 'paying' && (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                className="p-5 bg-teal-500/10 border border-teal-500/20 rounded-2xl text-center">
                                                <p className="text-xs font-black text-teal-400 uppercase tracking-widest">Awaiting wallet confirmation for 0.10 BNB listing fee…</p>
                                            </motion.div>
                                        )}
                                        {status === 'submitting' && (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                className="p-5 bg-teal-500/10 border border-teal-500/20 rounded-2xl text-center">
                                                <p className="text-xs font-black text-teal-600 uppercase tracking-widest">Fee paid ✓ — Saving application to admin queue…</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <button
                                        type="submit"
                                        disabled={status === 'paying' || status === 'submitting'}
                                        className="w-full py-6 bg-white text-black font-black text-sm uppercase tracking-[0.3em] rounded-[2rem] shadow-2xl hover:bg-teal-500 hover:text-white transition-all active:scale-[0.98] flex items-center justify-center gap-4 group disabled:opacity-40"
                                    >
                                        {status === 'paying' ? 'Processing Fee Payment…' :
                                         status === 'submitting' ? 'Saving Application…' :
                                         <><span>Apply for Listing — Pay 0.10 BNB</span><ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" /></>}
                                    </button>

                                    <p className="text-center text-[10px] text-white/25 font-bold uppercase tracking-widest">
                                        Fee is non-refundable. Tez Exchange reserves the right to reject any application.
                                    </p>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
