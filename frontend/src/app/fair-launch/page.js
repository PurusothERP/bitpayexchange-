'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Info, Rocket, Zap, ShieldCheck, Activity, Brain, 
    Layers, Loader2, Upload, CheckCircle2, Sparkles, ExternalLink,
    Droplets, FileText, Globe
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
    const [initialLiquidity, setInitialLiquidity] = useState('0.01');
    const [status, setStatus] = useState('idle');
    const [stage, setStage] = useState('create'); // For fair launch we usually skip linking or use a simple check
    const [isLinked, setIsLinked] = useState(true);
    const [error, setError] = useState('');
    const [txHash, setTxHash] = useState(null);
    const [wpThinking, setWpThinking] = useState(false);

    useEffect(() => {
        if (!account || !provider) return;
        // Simple check for fair launch factory interaction
    }, [account, provider]);

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogo(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleGenerateWP = async () => {
        if (!formData.name) return;
        setWpThinking(true);
        setTimeout(() => setWpThinking(false), 2000); // Simulate
    };

    const handleSubmit = async () => {
        if (!account) { connectWallet(); return; }
        if (!formData.name || !formData.symbol) { setError('Name and Symbol are required.'); return; }
        
        setStatus('uploading');
        setError('');

        try {
            let activeSigner = signer;
            if (!activeSigner && walletProvider) {
                const tempProvider = new ethers.BrowserProvider(walletProvider);
                activeSigner = await tempProvider.getSigner();
            }
            if (!activeSigner) throw new Error('Wallet not connected');

            const factoryContract = new ethers.Contract(DIRECT_FACTORY, DIRECT_LAUNCH_FACTORY_ABI, activeSigner);
            const totalValue = DEPLOY_FEE + PROTOCOL_FEE + parseFloat(initialLiquidity || 0);
            const valueWei = ethers.parseEther(totalValue.toFixed(18));

            setError('Stage 1/1: Deploying to DEX (Confirm in Wallet)...');
            const tx = await factoryContract.createTokenDirect(formData.name, formData.symbol, { value: valueWei });
            const receipt = await tx.wait();

            const event = receipt.logs.find(x => x.fragment?.name === 'TokenCreatedDirect');
            const tokenAddress = event ? event.args.tokenAddress : null;

            // Sync with backend
            const postData = new FormData();
            postData.append('name', formData.name);
            postData.append('symbol', formData.symbol);
            postData.append('description', formData.description);
            postData.append('owner', account);
            postData.append('tokenAddress', tokenAddress);
            postData.append('txHash', receipt.hash);
            postData.append('launch_type', 'FAIR');
            if (logo) postData.append('logo', logo);

            await axios.post(`${API_URL}/tokens/sync`, postData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setTxHash({ tokenAddress });
            setStatus('success');
        } catch (err) {
            setError(err.message || 'Fair Launch failed');
            setStatus('error');
        }
    };

    const totalBNB = (DEPLOY_FEE + PROTOCOL_FEE + parseFloat(initialLiquidity || 0)).toFixed(3);

    return (
        <main className="min-h-screen bg-[#050505] selection:bg-emerald-500 selection:text-white pb-32">
            <Navbar />
            
            <div className="pt-32 pb-24 px-4 md:px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
                {/* Background Atmosphere */}
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] -z-10 animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] -z-10" />

                {/* LEFT: SIDEBAR */}
                <div className="lg:col-span-4 space-y-6">
                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
                        className="p-8 rounded-[2.5rem] bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-700" />
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-inner">
                                <Zap className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="font-black text-white text-lg">Fair Launch Protocol</h3>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Instant DEX Listing</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-400 mb-8 leading-relaxed font-medium">
                            Direct deployment to PancakeSwap. No bonding curve. 100% of supply paired with your initial liquidity.
                        </p>
                        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                             <div className="flex items-center gap-3 text-emerald-400 mb-2">
                                 <ShieldCheck className="w-4 h-4" />
                                 <span className="text-[10px] font-black uppercase tracking-widest">Security Verified</span>
                             </div>
                             <p className="text-[10px] text-gray-500 font-medium leading-relaxed">Liquidity is locked in the LP contract instantly upon deployment.</p>
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                        className="p-8 rounded-[2.5rem] bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-3xl shadow-2xl">
                        <h4 className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                             <Activity className="w-3 h-3 text-emerald-500" /> Launch Parameters
                        </h4>
                        <div className="space-y-4">
                            {[
                                { label: 'DEX Target', value: 'PancakeSwap V2', icon: <Globe className="w-3 h-3" /> },
                                { label: 'Liquidity Share', value: '100% of Supply', icon: <Layers className="w-3 h-3" /> },
                                { label: 'Min Liquidity', value: '0.010 BNB', icon: <Droplets className="w-3 h-3" />, color: 'text-emerald-400' },
                                { label: 'Deployment Fee', value: '0.005 BNB', icon: <Rocket className="w-3 h-3" />, color: 'text-blue-400' },
                                { label: 'Security Fee', value: '0.002 BNB', icon: <ShieldCheck className="w-3 h-3" />, color: 'text-rose-400' },
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
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                        className="p-8 bg-gradient-to-br from-emerald-600/20 to-blue-600/10 rounded-[2.5rem] border border-white/10 relative overflow-hidden group shadow-2xl backdrop-blur-3xl">
                        <div className="absolute -top-12 -left-12 text-[120px] opacity-10 group-hover:rotate-12 transition-transform duration-700">📜</div>
                        <div className="relative">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shadow-xl group-hover:scale-110 transition-transform">
                                    <FileText className="w-6 h-6 text-white" />
                                </div>
                                <h4 className="text-white font-black text-lg tracking-tight">AI Whitepaper</h4>
                            </div>
                            <p className="text-emerald-100 text-xs font-medium mb-8 leading-relaxed">
                                Professional, detailed protocol documentation generated in seconds by Aura AI.
                            </p>
                            <button 
                                type="button"
                                onClick={handleGenerateWP}
                                disabled={wpThinking || !formData.name}
                                className="w-full py-4 bg-white text-gray-900 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-20 active:scale-95"
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
                                                <div className="absolute inset-0 border-4 border-emerald-500/10 rounded-full" />
                                                <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Activity className="w-8 h-8 text-emerald-500 animate-pulse" />
                                                </div>
                                            </div>
                                            <h3 className="text-3xl font-black text-white mb-3 tracking-tighter">Liquidating Supply...</h3>
                                            <p className="text-emerald-400 font-bold uppercase text-[10px] tracking-[0.2em] animate-pulse">{error}</p>
                                        </>
                                    )}

                                    {status === 'success' && txHash && (
                                         <>
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-28 h-28 bg-emerald-500/10 rounded-full flex items-center justify-center mb-8 border border-emerald-500/20 shadow-2xl">
                                                <CheckCircle2 className="w-16 h-16 text-emerald-400" />
                                            </motion.div>
                                            <h3 className="text-4xl font-black text-white mb-2 tracking-tighter">Launch Perfected</h3>
                                            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mb-10">Asset pair active on PancakeSwap</p>
                                            <button onClick={() => router.push(`/token/${txHash.tokenAddress}`)} className="px-12 py-5 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl">View Protocol</button>
                                        </>
                                    )}

                                    {status === 'error' && (
                                        <>
                                            <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center mb-8 border border-rose-500/20">
                                                <Activity className="w-12 h-12 text-rose-500" />
                                            </div>
                                            <h3 className="text-3xl font-black text-white mb-3">Launch Restricted</h3>
                                            <p className="text-gray-500 font-bold mb-10 max-w-sm text-sm uppercase leading-relaxed font-mono">{error}</p>
                                            <button onClick={() => setStatus('idle')} className="px-12 py-5 bg-rose-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest">Reset System</button>
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                            <div>
                                <h1 className="text-4xl font-black text-white tracking-tighter">Fair Launch Deployed</h1>
                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">Zero Pre-sale • 100% Market Pair</p>
                            </div>
                        </div>

                        <div className="space-y-10">
                            <div className="flex flex-col md:flex-row items-start gap-8">
                                <div className="relative group mx-auto md:mx-0">
                                    <div className="w-40 h-40 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden transition-all duration-500 group-hover:border-emerald-500 group-hover:scale-105">
                                        {logoPreview ? <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" /> : <Upload className="w-12 h-12 text-gray-700 group-hover:text-emerald-500 transition-colors" />}
                                        <input type="file" accept="image/*" onChange={handleLogoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-3 rounded-2xl shadow-xl"><Droplets className="w-5 h-5" /></div>
                                </div>
                                <div className="flex-1 space-y-6 w-full">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono">Token Identity</label>
                                            <input type="text" placeholder="Global Dex Asset" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-bold text-white outline-none focus:border-emerald-500/50 transition-all font-mono shadow-inner" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono">Symbol</label>
                                            <input type="text" placeholder="GDA" value={formData.symbol} onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-black text-white outline-none focus:border-emerald-500/50 transition-all font-mono shadow-inner" />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono">Description</label>
                                        <textarea placeholder="The ultimate utility token..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-6 font-medium text-white outline-none focus:border-emerald-500/50 transition-all resize-none shadow-inner" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 border-t border-white/5">
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Droplets className="w-3 h-3 text-emerald-400" /> Initial Liquidity (BNB)</label>
                                        <div className="relative">
                                            <input type="number" step="0.01" min={LIQUIDITY_MANDATORY} value={initialLiquidity} onChange={(e) => setInitialLiquidity(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-5 font-black text-2xl text-white outline-none focus:border-emerald-500/50 transition-all shadow-inner" />
                                            <span className="absolute right-8 top-1/2 -translate-y-1/2 text-sm font-black text-emerald-400">BNB</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-white/5 to-white/[0.01] border border-white/10 flex flex-col justify-between shadow-2xl relative group overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all duration-700" />
                                    <div className="space-y-4 relative z-10">
                                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Charges Breakdown</h4>
                                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-400">Liquidity (Mandatory)</span><span className="text-sm font-black text-white">{parseFloat(initialLiquidity || 0).toFixed(3)} BNB</span></div>
                                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-400">Deployment Logic</span><span className="text-sm font-black text-white">0.005 BNB</span></div>
                                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-400">Security Fee</span><span className="text-sm font-black text-white">0.002 BNB</span></div>
                                    </div>
                                    <div className="mt-8 pt-6 border-t border-white/5 relative z-10">
                                        <div className="flex justify-between items-baseline"><span className="text-xs font-black text-white uppercase font-mono">Protocol Payment</span><span className="text-4xl font-black text-emerald-500 tracking-tighter shadow-emerald-500/20 drop-shadow-lg">{totalBNB} <span className="text-sm font-bold text-gray-500">BNB</span></span></div>
                                    </div>
                                </div>
                            </div>

                            <button type="button" onClick={handleSubmit} disabled={status === 'uploading'} className="w-full py-8 bg-white text-black font-black text-2xl rounded-[2.5rem] shadow-3xl hover:bg-gray-100 hover:scale-[1.01] transition-all active:scale-[0.98] disabled:opacity-20 flex items-center justify-center gap-4 group overflow-hidden">
                                {status === 'uploading' ? <Loader2 className="w-8 h-8 animate-spin" /> : <Rocket className="w-8 h-8 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                                {status === 'uploading' ? 'Processing...' : 'Deploy Now'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
        </main>
    );
}
