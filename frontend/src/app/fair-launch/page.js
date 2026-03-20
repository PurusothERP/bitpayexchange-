'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Info, Rocket, Zap, ShieldCheck, Activity, Brain, 
    Layers, Loader2, Upload, CheckCircle2, Sparkles, ExternalLink,
    Droplets, FileText, Globe, Network, Cpu, Settings
} from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { ethers, Contract } from 'ethers';
import { DIRECT_LAUNCH_FACTORY_ABI } from '@/lib/abis';
import Link from 'next/link';

const DIRECT_FACTORY = process.env.NEXT_PUBLIC_DIRECT_FACTORY_ADDRESS || '0x319C8c9efBF2742331e687DE8caf54B9944895A7';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const DEPLOY_FEE = 0.005;
const PROTOCOL_FEE = 0.002;
const LIQUIDITY_MANDATORY = 0.01;

export default function FairLaunch() {
    const { account, signer, connectWallet, chainId, provider, walletProvider } = useWallet();
    const router = useRouter();

    const [formData, setFormData] = useState({ name: '', symbol: '', description: '' });
    const [logo, setLogo] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    
    // Fee logic for Treasury
    const FEE_WALLET = '0x6451ee4def4a8b8fbc2c64301a79e267de378935'; 
    const isTreasury = account?.toLowerCase() === FEE_WALLET.toLowerCase();
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');
    const [txHash, setTxHash] = useState(null);
    const [wpThinking, setWpThinking] = useState(false);

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogo(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleGenerateWP = () => {
        if (!formData.name) return;
        setWpThinking(true);
        setTimeout(() => setWpThinking(false), 2000);
    };

    const handleSubmit = async () => {
        if (!account) { connectWallet(); return; }
        if (!formData.name || !formData.symbol) { setError('Name and Symbol required.'); return; }

        try {
            setStatus('uploading');
            setError('Deploying Fair Launch Protocol...');

            let activeSigner = signer;
            if (!activeSigner && walletProvider) {
                const tempProvider = new ethers.BrowserProvider(walletProvider);
                activeSigner = await tempProvider.getSigner();
            }

            const factory = new ethers.Contract(DIRECT_FACTORY, DIRECT_LAUNCH_FACTORY_ABI, activeSigner);
            
            const actualFee = isTreasury ? 0 : (DEPLOY_FEE + PROTOCOL_FEE);
            const actualLiquidity = isTreasury ? 0 : LIQUIDITY_MANDATORY;
            const totalToPay = actualFee + actualLiquidity;

            const tx = await factory.createTokenDirect(
                formData.name, formData.symbol, 
                { value: ethers.parseEther(totalToPay.toFixed(18)), gasLimit: 2500000 }
            );
            const receipt = await tx.wait();

            const event = receipt.logs.find(x => x.fragment?.name === 'TokenCreatedDirect');
            const tokenAddress = event ? event.args.tokenAddress : null;

            const postData = new FormData();
            postData.append('name', formData.name);
            postData.append('symbol', formData.symbol);
            postData.append('description', formData.description);
            postData.append('owner', account);
            postData.append('tokenAddress', tokenAddress);
            postData.append('launch_type', 'FAIR');
            if (logo) postData.append('logo', logo);

            await axios.post(`${API_URL}/tokens/sync`, postData);

            setTxHash({ tokenAddress });
            setStatus('success');
        } catch (err) {
            setError(err.message);
            setStatus('error');
        }
    };

    const totalBNB = isTreasury ? '0.000' : (DEPLOY_FEE + PROTOCOL_FEE + LIQUIDITY_MANDATORY).toFixed(3);

    return (
        <main className="min-h-screen bg-gray-50/70 p-pattern selection:bg-rose-500 selection:text-white pb-32">
            <Navbar />
            
            <div className="pt-32 pb-24 px-4 md:px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 relative z-10">
                {/* Background Decor */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-rose-500/5 rounded-full blur-[150px] -z-10 animate-pulse" />

                {/* LEFT SIDEBAR */}
                <div className="lg:col-span-4 space-y-8">
                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
                        className="p-10 rounded-[3rem] bg-white border border-gray-100 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl group-hover:bg-rose-500/10 transition-all duration-700" />
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-100 shadow-md">
                                <Zap className="w-7 h-7 text-rose-500" />
                            </div>
                            <div>
                                <h3 className="font-black text-gray-900 text-xl tracking-tight">Fair Launch</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Automatic DEX Listing</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-10 leading-relaxed font-medium">
                            Bypass the bonding curve and launch directly to PancakeSwap. This protocol automatically pairs 100% of the initial supply with your BNB liquidity deposit.
                        </p>
                        <div className="flex items-center gap-3 text-rose-500 pt-6 border-t border-gray-50">
                             <ShieldCheck className="w-5 h-5" />
                             <span className="text-[10px] font-black uppercase tracking-[0.3em]">Institutional Matrix</span>
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                        className="p-10 rounded-[3rem] bg-white border border-gray-100 shadow-xl">
                        <h4 className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-8 flex items-center gap-2">
                             <Settings className="w-4 h-4 text-rose-500" /> Protocol Parameters
                        </h4>
                        <div className="space-y-6">
                            {[
                                { label: 'Fixed Supply', value: '1,000,000,000', icon: <Layers className="w-4 h-4" /> },
                                { label: 'Launch Type', value: 'Direct To DEX', icon: <Cpu className="w-4 h-4" /> },
                                { label: 'Liquidity Pool', value: '100% (Locked)', icon: <Network className="w-4 h-4" />, color: 'text-amber-500' },
                                { label: 'Network', value: 'BNB Smart Chain', icon: <Globe className="w-4 h-4" />, color: 'text-rose-500' }
                            ].map((p, i) => (
                                <div key={i} className="flex justify-between items-center py-4 border-b last:border-0 border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <span className="text-gray-300">{p.icon}</span>
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{p.label}</span>
                                    </div>
                                    <span className={`text-sm font-black text-gray-900 ${p.color || ''}`}>{p.value}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                        className="p-10 bg-gradient-to-br from-gray-900 to-black rounded-[3rem] border border-gray-800 relative overflow-hidden group shadow-2xl">
                        <div className="absolute top-0 right-[-10%] text-[140px] opacity-10 grayscale group-hover:grayscale-0 group-hover:rotate-6 transition-all duration-700">📜</div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-5 mb-8">
                                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shadow-xl group-hover:scale-110 transition-transform backdrop-blur-3xl">
                                    <Brain className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <h4 className="text-white font-black text-xl tracking-tight">AI Audit Whitepaper</h4>
                                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Neural Paper Engine</p>
                                </div>
                            </div>
                            <p className="text-white/60 text-xs font-medium mb-10 leading-relaxed">
                                Professional protocol whitepaper and structural audit generated in seconds by Aura AI.
                            </p>
                            <button 
                                type="button"
                                onClick={handleGenerateWP}
                                disabled={wpThinking || !formData.name}
                                className="w-full py-5 bg-white text-gray-900 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-rose-500 hover:text-white transition-all disabled:opacity-20 active:scale-95"
                            >
                                {wpThinking ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Generate + Audit'}
                            </button>
                        </div>
                    </motion.div>
                </div>

                {/* RIGHT MAIN CONTENT */}
                <div className="lg:col-span-8">
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="p-6 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] bg-white border border-gray-100 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
                        
                        <AnimatePresence>
                            {(status === 'uploading' || status === 'success' || status === 'error') && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-50 bg-white/95 backdrop-blur-2xl flex flex-col items-center justify-center p-12 text-center"
                                >
                                    {status === 'uploading' && (
                                        <>
                                            <div className="relative w-28 h-28 mb-10">
                                                <div className="absolute inset-0 border-4 border-rose-500/10 rounded-full" />
                                                <div className="absolute inset-0 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Zap className="w-10 h-10 text-rose-500 animate-pulse" />
                                                </div>
                                            </div>
                                            <h3 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter uppercase">Direct Anchoring...</h3>
                                            <p className="text-rose-500 font-black uppercase text-[10px] tracking-[0.4em] animate-pulse">{error}</p>
                                        </>
                                    )}

                                    {status === 'success' && (
                                        <>
                                            <div className="w-32 h-32 bg-emerald-500/10 rounded-full flex items-center justify-center mb-10 border border-emerald-500/20 shadow-2xl">
                                                <CheckCircle2 className="w-20 h-20 text-emerald-500" />
                                            </div>
                                            <h3 className="text-5xl font-black text-gray-900 mb-3 tracking-tighter uppercase">Fair Launch Finalized</h3>
                                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mb-12">DEX liquidity pool has been initialized</p>
                                            <button onClick={() => router.push('/launch')} className="px-16 py-6 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all">Go to Launchpad</button>
                                        </>
                                    )}

                                    {status === 'error' && (
                                        <>
                                            <div className="w-28 h-28 bg-rose-500/10 rounded-full flex items-center justify-center mb-10 border border-rose-500/20 shadow-xl">
                                                <Rocket className="w-14 h-14 text-rose-500" />
                                            </div>
                                            <h3 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter uppercase">System Collision</h3>
                                            <p className="text-gray-400 font-bold mb-12 max-w-sm text-sm uppercase leading-relaxed tracking-wide">{error}</p>
                                            <button onClick={() => setStatus('idle')} className="px-16 py-6 bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-rose-500/30">Bridge Override</button>
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16 border-b border-gray-50 pb-12">
                            <div>
                                <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter mb-2">Fair Launch <span className="text-rose-500">Nexus</span></h1>
                                <div className="flex items-center gap-4">
                                    <span className="px-4 py-1.5 bg-rose-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg shadow-rose-500/20">Zero Curve</span>
                                    <span className="px-4 py-1.5 bg-amber-500/10 text-amber-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-amber-500/20">Premium Direct</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] mb-1">Mandatory Liquidity</p>
                                <p className="text-2xl font-black text-gray-900 tracking-tighter font-mono">0.010 <span className="text-sm text-gray-400">BNB</span></p>
                            </div>
                        </div>

                        <div className="space-y-12">
                            <div className="flex flex-col md:flex-row items-center gap-10">
                                <div className="relative group">
                                    <div className="w-40 h-40 rounded-[3rem] bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden transition-all duration-500 group-hover:scale-105 group-hover:border-rose-500/30 shadow-inner">
                                        {logoPreview ? <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" /> : <Upload className="w-12 h-12 text-gray-200 group-hover:text-rose-500 transition-colors" />}
                                        <input type="file" accept="image/*" onChange={handleLogoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 bg-rose-500 text-white p-3 rounded-2xl shadow-xl"><Rocket className="w-5 h-5" /></div>
                                </div>
                                <div className="flex-1 space-y-6 w-full">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Nexus Name</label>
                                            <input type="text" placeholder="Aura Intelligence" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold text-gray-900 outline-none focus:bg-white focus:border-rose-500/30 transition-all shadow-sm" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Ticker Symbol</label>
                                            <input type="text" placeholder="AURA" value={formData.symbol} onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-black text-gray-900 outline-none focus:bg-white focus:border-rose-500/30 transition-all shadow-sm" />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Protocol Description</label>
                                        <textarea placeholder="Describe the utility of your direct launch asset..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full h-32 bg-gray-50 border border-gray-100 rounded-3xl p-6 font-medium text-gray-700 outline-none focus:bg-white focus:border-rose-500/30 transition-all resize-none shadow-sm" />
                                    </div>
                                </div>
                            </div>

                                <div className="p-10 rounded-[3rem] bg-gray-50 border border-gray-100 shadow-inner relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-rose-500/5 rounded-full blur-3xl" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Charge Breakdown</h4>
                                            <div className="flex justify-between items-center py-2 border-b border-gray-200/40">
                                                <span className="text-xs font-bold text-gray-500">Liquidity Matrix</span>
                                                <span className="text-sm font-black text-gray-900">{isTreasury ? '0.00' : '0.010'} BNB</span>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-b border-gray-200/40">
                                                <span className="text-xs font-bold text-gray-500">Protocol Governance</span>
                                                <span className="text-sm font-black text-gray-900">{isTreasury ? '0.00' : '0.007'} BNB</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col justify-end text-right">
                                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em] mb-1">Nexus Weight</p>
                                            <p className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter">{totalBNB} <span className="text-lg text-gray-400">BNB</span></p>
                                        </div>
                                    </div>
                                </div>

                            <button type="button" onClick={handleSubmit} disabled={status === 'uploading'} className="w-full py-8 bg-gray-900 text-white font-black text-2xl rounded-[3rem] shadow-2xl hover:bg-black hover:scale-[1.01] transition-all active:scale-[0.98] disabled:opacity-20 flex items-center justify-center gap-6 group relative overflow-hidden">
                                {status === 'uploading' ? <Loader2 className="w-8 h-8 animate-spin" /> : <Rocket className="w-8 h-8 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                                {status === 'uploading' ? 'Syncing...' : 'Deploy Now'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
            
            <style jsx global>{`
                .p-pattern {
                    background-image: radial-gradient(circle at 2px 2px, rgba(0,0,0,0.02) 1px, transparent 0);
                    background-size: 40px 40px;
                }
            `}</style>
        </main>
    );
}
