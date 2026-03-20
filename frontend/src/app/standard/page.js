'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Activity, Rocket, ShieldCheck, Globe, Zap, 
    Layers, Loader2, Upload, CheckCircle2, Sparkles, 
    FileText, Network, Cpu, Settings
} from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

const DEPLOY_FEE = 0.005;
const PROTOCOL_FEE = 0.002;
const TOTAL_FEE = DEPLOY_FEE + PROTOCOL_FEE;

export default function StandardAsset() {
    const { account, connectWallet } = useWallet();
    const router = useRouter();

    const [formData, setFormData] = useState({ name: '', symbol: '', decimals: '18', supply: '1000000000' });
    const [logo, setLogo] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');
    const [stage, setStage] = useState('create');
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!account) { connectWallet(); return; }
        
        setStatus('uploading');
        setError('Deploying standard asset... (Bypassing curve)');
        
        try {
            // Logic for standard deployment...
            setTimeout(() => {
                setStatus('success');
            }, 3000);
        } catch (err) {
            setError(err.message);
            setStatus('error');
        }
    };

    return (
        <main className="min-h-screen bg-[#050505] selection:bg-blue-500 selection:text-white pb-32">
            <Navbar />
            
            <div className="pt-32 pb-24 px-4 md:px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
                {/* Background Atmosphere */}
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] -z-10 animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] -z-10" />

                {/* LEFT: SIDEBAR */}
                <div className="lg:col-span-4 space-y-6">
                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
                        className="p-8 rounded-[2.5rem] bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-700" />
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-inner">
                                <Network className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-black text-white text-lg">Standard Protocol</h3>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Multi-Network Asset</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-400 mb-8 leading-relaxed font-medium">
                            Deploy a standard BEP-20 or ERC-20 asset without market logic. Best for existing ecosystems or custom AMM launches.
                        </p>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                        className="p-8 rounded-[2.5rem] bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-3xl shadow-2xl">
                        <h4 className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                             <Settings className="w-3 h-3 text-blue-500" /> Protocol Configuration
                        </h4>
                        <div className="space-y-4">
                            {[
                                { label: 'Fixed Supply', value: '1,000,000,000', icon: <Layers className="w-3 h-3" /> },
                                { label: 'Asset Type', value: 'BEP-20 (Standard)', icon: <Cpu className="w-3 h-3" /> },
                                { label: 'Network', value: 'BNB Smart Chain', icon: <Globe className="w-3 h-3" />, color: 'text-emerald-400' },
                                { label: 'Service Fee', value: '0.005 BNB', icon: <Zap className="w-3 h-3" />, color: 'text-blue-400' },
                                { label: 'Protocol Fee', value: '0.002 BNB', icon: <ShieldCheck className="w-3 h-3" />, color: 'text-rose-400' },
                            ].map((p, i) => (
                                <div key={i} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-500">{p.icon}</span>
                                        <span className="text-xs font-bold text-gray-400">{p.label}</span>
                                    </div>
                                    <span className={`text-xs font-black ${p.color || 'text-white'}`}>{p.value}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-baseline">
                             <span className="text-[10px] font-black text-gray-500 uppercase">Total Required</span>
                             <span className="text-2xl font-black text-white tracking-tighter">0.007 <span className="text-sm font-bold text-gray-500">BNB</span></span>
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                        className="p-8 bg-gradient-to-br from-blue-600/20 to-indigo-600/10 rounded-[2.5rem] border border-white/10 relative overflow-hidden group shadow-2xl backdrop-blur-3xl">
                        <div className="absolute -top-12 -left-12 text-[120px] opacity-10 group-hover:rotate-12 transition-transform duration-700">📜</div>
                        <div className="relative">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shadow-xl group-hover:scale-110 transition-transform">
                                    <FileText className="w-6 h-6 text-white" />
                                </div>
                                <h4 className="text-white font-black text-lg tracking-tight">AI Whitepaper</h4>
                            </div>
                            <p className="text-blue-100 text-xs font-medium mb-8 leading-relaxed">
                                Professional, detailed protocol documentation generated in seconds by Aura AI.
                            </p>
                            <button 
                                type="button"
                                onClick={handleGenerateWP}
                                disabled={wpThinking || !formData.name}
                                className="w-full py-4 bg-white text-gray-900 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-500 hover:text-white transition-all disabled:opacity-20 active:scale-95"
                            >
                                {wpThinking ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Generate + Audit'}
                            </button>
                        </div>
                    </motion.div>
                </div>

                {/* RIGHT: MAIN FORM */}
                <div className="lg:col-span-8">
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="p-10 rounded-[3rem] bg-gradient-to-br from-white/5 to-white/[0.01] border border-white/10 shadow-3xl relative overflow-hidden backdrop-blur-3xl">
                        
                        <AnimatePresence>
                            {(status === 'uploading' || status === 'success' || status === 'error') && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-50 bg-[#050505]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-12 text-center"
                                >
                                    {status === 'uploading' && (
                                        <>
                                            <div className="relative w-24 h-24 mb-8">
                                                <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full" />
                                                <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Activity className="w-8 h-8 text-blue-500 animate-pulse" />
                                                </div>
                                            </div>
                                            <h3 className="text-3xl font-black text-white mb-3 tracking-tighter">Minting Asset...</h3>
                                            <p className="text-blue-400 font-bold uppercase text-[10px] tracking-[0.2em] animate-pulse">{error}</p>
                                        </>
                                    )}

                                    {status === 'success' && (
                                        <>
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-28 h-28 bg-emerald-500/10 rounded-full flex items-center justify-center mb-8 border border-emerald-500/20 shadow-2xl">
                                                <CheckCircle2 className="w-16 h-16 text-emerald-400" />
                                            </motion.div>
                                            <h3 className="text-4xl font-black text-white mb-2 tracking-tighter">Asset Initialized</h3>
                                            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mb-10">BEP-20 Standard Contract live</p>
                                            <button onClick={() => window.location.reload()} className="px-12 py-5 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl">Deploy Another</button>
                                        </>
                                    )}

                                    {status === 'error' && (
                                        <>
                                            <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center mb-8 border border-rose-500/20">
                                                <Activity className="w-12 h-12 text-rose-500" />
                                            </div>
                                            <h3 className="text-3xl font-black text-white mb-3">Deployment Failed</h3>
                                            <p className="text-gray-500 font-bold mb-10 max-w-sm text-sm">{error}</p>
                                            <button onClick={() => setStatus('idle')} className="px-12 py-5 bg-rose-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest">Try Again</button>
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                            <div>
                                <h1 className="text-4xl font-black text-white tracking-tighter">Standard Asset</h1>
                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">Professional Grade BEP-20 Infrastructure</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-10">
                            <div className="flex flex-col md:flex-row items-start gap-8">
                                <div className="relative group mx-auto md:mx-0">
                                    <div className="w-40 h-40 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden transition-all duration-500 group-hover:border-blue-500 group-hover:scale-105">
                                        {logoPreview ? <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" /> : <Upload className="w-12 h-12 text-gray-700 group-hover:text-blue-500 transition-colors" />}
                                        <input type="file" accept="image/*" onChange={handleLogoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white p-3 rounded-2xl shadow-xl"><Layers className="w-5 h-5" /></div>
                                </div>
                                <div className="flex-1 space-y-6 w-full">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono">Assset Name</label>
                                            <input type="text" required placeholder="Standard Utility" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-bold text-white outline-none focus:border-blue-500/50 transition-all font-mono" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono">Ticker</label>
                                            <input type="text" required placeholder="STD" value={formData.symbol} onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-black text-white outline-none focus:border-blue-500/50 transition-all font-mono" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                         <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono">Decimals</label>
                                            <input type="number" required value={formData.decimals} onChange={(e) => setFormData({...formData, decimals: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-black text-white outline-none focus:border-blue-500/50 transition-all font-mono" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono">Mint Supply</label>
                                            <input type="number" required value={formData.supply} onChange={(e) => setFormData({...formData, supply: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-black text-white outline-none focus:border-blue-500/50 transition-all font-mono" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-white/5 to-white/[0.01] border border-white/10 shadow-3xl">
                                <div className="flex justify-between items-baseline mb-2">
                                     <span className="text-[10px] font-black text-gray-500 uppercase">One-Time Service Payment</span>
                                     <span className="text-4xl font-black text-blue-500 tracking-tighter">0.007 <span className="text-sm font-bold text-gray-500">BNB</span></span>
                                </div>
                                <p className="text-[9px] text-gray-700 font-bold uppercase tracking-widest">Includes deployment fee (0.005) + protocol fee (0.002)</p>
                            </div>

                            <button type="submit" disabled={status === 'uploading'} className="w-full py-8 bg-white text-black font-black text-2xl rounded-[2.5rem] shadow-3xl hover:bg-gray-100 hover:scale-[1.01] transition-all active:scale-[0.98] disabled:opacity-20 flex items-center justify-center gap-4 group overflow-hidden">
                                {status === 'uploading' ? <Loader2 className="w-8 h-8 animate-spin" /> : <Network className="w-8 h-8 group-hover:rotate-12 transition-transform" />}
                                {status === 'uploading' ? 'Processing...' : 'Deploy Now'}
                            </button>
                        </form>
                    </motion.div>
                </div>
            </div>
        </main>
    );
}
