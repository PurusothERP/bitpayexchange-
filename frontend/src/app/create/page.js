'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Info, Image as ImageIcon, Rocket, Zap, Clock, ShieldCheck, Activity, Brain, 
    AlertTriangle, TrendingUp, ChevronDown, CheckCircle, FileText, Loader2, 
    Upload, AlertCircle, CheckCircle2, Sparkles, ExternalLink, Droplets, Layers, 
    Wallet as WalletIcon, Settings, Globe, BarChart3, Users
} from 'lucide-react';
import axios from 'axios';
import WhitepaperModal from '@/components/WhitepaperModal';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ethers, Contract } from 'ethers';
import { TOKEN_FACTORY_ABI, TOKEN_TEMPLATE_ABI } from '@/lib/abis';

const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS || '0xfDAAF29FFE961a5D4279d3089f694cc5676Ee915';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const DEPLOY_FEE = 0.005;
const PROTOCOL_FEE = 0.002;
const MIN_LIQUIDITY = 0.01;
const DEFAULT_FACTORY = '0xfDAAF29FFE961a5D4279d3089f694cc5676Ee915';

function CreateToken() {
    const { account, signer, connectWallet, isConnecting, chainId, provider, walletProvider } = useWallet();
    const router = useRouter();

    const FEE_WALLET = process.env.NEXT_PUBLIC_FEE_WALLET || '0x6451ee4def4a8b8fbc2c64301a79e267de378935';
    const isTreasury = account?.toLowerCase() === FEE_WALLET.toLowerCase();
    const effectiveFactory = FACTORY_ADDRESS || DEFAULT_FACTORY;

    const [formData, setFormData] = useState({ name: '', symbol: '', description: '', virtualBnb: '0.01' });
    const [logo, setLogo] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [initialBuy, setInitialBuy] = useState('0.01'); 
    const [status, setStatus] = useState('idle');
    const [stage, setStage] = useState('check');
    const [isLinked, setIsLinked] = useState(false);
    const [error, setError] = useState('');
    const [txHash, setTxHash] = useState(null);
    const [wpThinking, setWpThinking] = useState(false);
    const [whitepaper, setWhitepaper] = useState(null);
    const [isWpModalOpen, setIsWpModalOpen] = useState(false);

    const [fees, setFees] = useState({ deployment: DEPLOY_FEE + PROTOCOL_FEE, minInitialBuy: MIN_LIQUIDITY });

    useEffect(() => {
        if (isTreasury) setInitialBuy('0');
    }, [isTreasury]);

    useEffect(() => {
        async function checkConnection() {
            if (!account || !provider) return;
            try {
                const factory = new ethers.Contract(effectiveFactory, TOKEN_FACTORY_ABI, provider);
                const [linked, onChainDep, onChainMin] = await Promise.all([
                    factory.isLinked(account),
                    factory.DEPLOYMENT_FEE(),
                    factory.MIN_INITIAL_BUY()
                ]);
                setIsLinked(linked);
                setFees({
                    deployment: parseFloat(ethers.formatEther(onChainDep)),
                    minInitialBuy: parseFloat(ethers.formatEther(onChainMin))
                });
                setStage(linked ? 'create' : 'linking');
            } catch (e) { console.warn('Sync failed:', e.message); }
        }
        checkConnection();
    }, [account, provider, effectiveFactory]);

    const actualFee = isTreasury ? 0 : fees.deployment;
    const actualMinBuy = isTreasury ? 0 : fees.minInitialBuy; 

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogo(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleGenerateWP = async () => {
        if (!formData.name) { setError('Name is required for AI Whitepaper.'); return; }
        setWpThinking(true);
        try {
            const res = await axios.post(`${API_URL}/ai/generate-whitepaper`, {
                name: formData.name, symbol: formData.symbol, description: formData.description
            });
            setWhitepaper(res.data);
            setIsWpModalOpen(true);
        } catch (err) { setError('AI Bridge Timeout. Please try again.'); }
        finally { setWpThinking(false); }
    };

    const totalBNB = (actualFee + Math.max(parseFloat(initialBuy) || 0, actualMinBuy)).toFixed(3);

    const handleSubmit = async () => {
        if (!account) { connectWallet(); return; }
        if (!formData.name || !formData.symbol) { setError('Name and Symbol are mandatory.'); return; }
        
        try {
            let activeSigner = signer;
            if (!activeSigner && walletProvider) {
                const tempProvider = new ethers.BrowserProvider(walletProvider);
                activeSigner = await tempProvider.getSigner();
            }
            if (!activeSigner) throw new Error('Signer Not Ready');

            const factoryContract = new ethers.Contract(effectiveFactory, TOKEN_FACTORY_ABI, activeSigner);
            const initialBuyAmount = Math.max(parseFloat(initialBuy) || 0, actualMinBuy);
            const totalValue = actualFee + initialBuyAmount;
            const valueWei = ethers.parseEther(totalValue.toFixed(18));

            setStatus('uploading');
            setError('');

            if (stage === 'linking' && !isLinked) {
                setError('Protocol Approval: Linking Wallet...');
                const tx = await factoryContract.linkProtocol({ gasLimit: 200000 });
                await tx.wait();
                setIsLinked(true);
                setStage('create');
                setStatus('idle');
                return;
            }

            setError('Launching Nexus Token (Confirm in Wallet)...');
            const tx = await factoryContract.createToken(
                formData.name, formData.symbol, ethers.parseEther(formData.virtualBnb || '0.01'), 
                { value: valueWei, gasLimit: 2100000 }
            );
            const receipt = await tx.wait();

            const event = receipt.logs.find(x => x.fragment?.name === 'TokenCreated');
            const tokenAddress = event ? event.args.tokenAddress : null;

            const postData = new FormData();
            postData.append('name', formData.name);
            postData.append('symbol', formData.symbol);
            postData.append('description', formData.description);
            postData.append('owner', account);
            postData.append('tokenAddress', tokenAddress);
            postData.append('txHash', receipt.hash);
            postData.append('launch_type', 'MEME');
            if (logo) postData.append('logo', logo);

            await axios.post(`${API_URL}/tokens/sync`, postData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setTxHash({ tokenAddress });
            setStatus('success');
        } catch (err) {
            setError(err.message || 'Deployment Error');
            setStatus('error');
        }
    };

    return (
        <main className="min-h-screen bg-gray-50/70 p-pattern selection:bg-rose-500 selection:text-white pb-32">
            <Navbar />
            
            <div className="pt-32 pb-24 px-4 md:px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 relative z-10">
                {/* Visual Flair */}
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-rose-500/5 rounded-full blur-[100px] -z-10 animate-pulse" />
                <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[100px] -z-10" />

                {/* LEFT: INFORMATION & AI */}
                <div className="lg:col-span-4 space-y-8">
                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
                        className="p-8 rounded-[3rem] bg-white border border-gray-100 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl group-hover:bg-rose-500/10 transition-all duration-700" />
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-100 shadow-md">
                                <Rocket className="w-7 h-7 text-rose-500" />
                            </div>
                            <div>
                                <h3 className="font-black text-gray-900 text-xl tracking-tight">Bonding Curve</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Institutional Launch Engine</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-10 leading-relaxed font-medium">
                            Launch your protocol with a dynamic bonding curve. Zero initial liquidity required from the creator.
                        </p>
                        <div className="flex items-center gap-3 text-rose-500 pt-6 border-t border-gray-50">
                             <ShieldCheck className="w-5 h-5" />
                             <span className="text-[10px] font-black uppercase tracking-[0.3em]">Security Verified Matrix</span>
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                        className="p-8 rounded-[3rem] bg-white border border-gray-100 shadow-xl">
                        <h4 className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-8 flex items-center gap-2">
                             <Activity className="w-4 h-4 text-rose-500" /> Engine Parameters
                        </h4>
                        <div className="space-y-6">
                            {[
                                { label: 'Fixed Supply', value: '1,000,000,000', icon: <Layers className="w-4 h-4" /> },
                                { label: 'DEX Target', value: 'PancakeSwap V2', icon: <Globe className="w-4 h-4" /> },
                                { label: 'Liquidity Share', value: '900M Tokens', icon: <Zap className="w-4 h-4" />, color: 'text-amber-500' }
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
                        className="p-8 bg-gradient-to-br from-gray-900 to-black rounded-[3rem] border border-gray-800 relative overflow-hidden group shadow-2xl">
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

                {/* RIGHT: MAIN FORM */}
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
                                                    <Activity className="w-10 h-10 text-rose-500 animate-pulse" />
                                                </div>
                                            </div>
                                            <h3 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter">Initializing Hub...</h3>
                                            <p className="text-rose-500 font-black uppercase text-[10px] tracking-[0.4em] animate-pulse">{error}</p>
                                        </>
                                    )}

                                    {status === 'success' && txHash && (
                                        <>
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}
                                                className="w-32 h-32 bg-emerald-500/10 rounded-full flex items-center justify-center mb-10 border border-emerald-500/20 shadow-2xl shadow-emerald-500/10">
                                                <CheckCircle2 className="w-20 h-20 text-emerald-500" />
                                            </motion.div>
                                            <h3 className="text-5xl font-black text-gray-900 mb-3 tracking-tighter uppercase">Nexus Live</h3>
                                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mb-12">Protocol successfully anchored on BSC</p>

                                            <div className="w-full max-w-lg mb-12 bg-gray-50 border border-gray-100 rounded-[2.5rem] p-10 shadow-inner">
                                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-6">Verified Nexus Identifier</p>
                                                <div className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl px-6 py-5 mb-8 shadow-sm">
                                                    <code className="flex-1 text-sm font-mono text-gray-800 break-all select-all font-bold tracking-tight">
                                                        {txHash.tokenAddress}
                                                    </code>
                                                    <button onClick={() => { navigator.clipboard.writeText(txHash.tokenAddress); alert('Copied!'); }}
                                                        className="shrink-0 p-4 bg-gray-100 hover:bg-rose-500 hover:text-white rounded-xl text-gray-500 transition-all active:scale-90 shadow-sm">
                                                        <ExternalLink className="w-5 h-5" />
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap gap-8 justify-center">
                                                    <a href={`https://bscscan.com/token/${txHash.tokenAddress}`} target="_blank" className="text-[10px] font-black text-amber-500 hover:text-amber-600 uppercase tracking-widest transition-colors flex items-center gap-2 underline underline-offset-8">BSCScan Explorer</a>
                                                    <a href={`https://pancakeswap.finance/swap?outputCurrency=${txHash.tokenAddress}`} target="_blank" className="text-[10px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest transition-colors flex items-center gap-2 underline underline-offset-8">Market Listing</a>
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row gap-6 w-full max-w-md">
                                                <button onClick={() => router.push(`/token/${txHash.tokenAddress}`)} className="flex-1 py-6 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-black transition-all">Protocol Dashboard</button>
                                                <button onClick={() => window.location.reload()} className="flex-1 py-6 bg-white border-2 border-gray-100 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-50 transition-all">New Deployment</button>
                                            </div>
                                        </>
                                    )}

                                    {status === 'error' && (
                                        <>
                                            <div className="w-28 h-28 bg-rose-500/10 rounded-full flex items-center justify-center mb-10 border border-rose-500/20 shadow-xl">
                                                <AlertCircle className="w-14 h-14 text-rose-500" />
                                            </div>
                                            <h3 className="text-4xl font-black text-gray-900 mb-4 uppercase tracking-tighter">Bridge Error</h3>
                                            <p className="text-gray-400 font-bold mb-12 max-w-sm text-sm uppercase leading-relaxed tracking-wide">{error}</p>
                                            <button onClick={() => setStatus('idle')} className="px-16 py-6 bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-rose-600 transition-all shadow-rose-500/30">Reset System Bridge</button>
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16 border-b border-gray-50 pb-12">
                            <div>
                                <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter mb-2">Deploy Nexus</h1>
                                <div className="flex items-center gap-4">
                                    <span className="px-4 py-1.5 bg-rose-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full">Bonding Matrix</span>
                                    <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-emerald-500/20">Active Node</span>
                                </div>
                            </div>
                            <div className="hidden lg:block text-right">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] mb-1">Estimated Fee</p>
                                <p className="text-2xl font-black text-gray-900 tracking-tighter font-mono">{totalBNB} <span className="text-sm text-gray-400">BNB</span></p>
                            </div>
                        </div>

                        <div className="space-y-12">
                            <div className="flex flex-col md:flex-row items-start gap-10">
                                <div className="relative group mx-auto md:mx-0">
                                    <div className="w-48 h-48 rounded-[3.5rem] bg-gray-50 border-2 border-gray-100 flex items-center justify-center overflow-hidden transition-all duration-500 group-hover:border-rose-500/30 group-hover:scale-105 shadow-inner">
                                        {logoPreview ? <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" /> : <Upload className="w-14 h-14 text-gray-200 group-hover:text-rose-500 transition-colors" />}
                                        <input type="file" accept="image/*" onChange={handleLogoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 bg-rose-500 text-white p-4 rounded-3xl shadow-2xl scale-110"><ImageIcon className="w-6 h-6" /></div>
                                </div>
                                <div className="flex-1 space-y-8 w-full">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2">Protocol Name</label>
                                            <input type="text" placeholder="Nexus Intelligence" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-8 py-5 font-bold text-gray-900 outline-none focus:border-rose-500/30 focus:bg-white transition-all shadow-sm text-lg" />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2">Symbol / Ticker</label>
                                            <input type="text" placeholder="NXS" value={formData.symbol} onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-8 py-5 font-black text-gray-900 outline-none focus:border-rose-500/30 focus:bg-white transition-all shadow-sm text-lg" />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2">Nexus Lore / Story</label>
                                        <textarea placeholder="Define the origin of your asset..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full h-40 bg-gray-50 border border-gray-100 rounded-3xl p-8 font-medium text-gray-700 outline-none focus:border-rose-500/30 focus:bg-white transition-all resize-none shadow-sm text-lg leading-relaxed" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t border-gray-50">
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between ml-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-3">
                                                 <Activity className="w-4 h-4 text-emerald-500" /> Virtual BNB (Starting Price)
                                            </label>
                                            <span className="bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border border-emerald-500/20">Adjustable</span>
                                        </div>
                                        <div className="relative group">
                                            <input type="number" step="0.01" min="0.01" value={formData.virtualBnb} onChange={(e) => setFormData({...formData, virtualBnb: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 rounded-3xl px-10 py-6 font-black text-3xl text-gray-900 outline-none focus:border-rose-500/20 focus:bg-white transition-all shadow-inner" />
                                            <span className="absolute right-10 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400 uppercase tracking-widest group-focus-within:text-rose-500 transition-colors">BNB</span>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between ml-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-3">
                                                 <Zap className="w-4 h-4 text-amber-500" /> Liquidity Protocol (Initial Buy)
                                            </label>
                                            <span className="bg-amber-500/10 text-amber-600 px-3 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border border-amber-500/20">Mandatory</span>
                                        </div>
                                        <div className="relative group text-rose-500">
                                            <input type="number" step="0.001" min={actualMinBuy} value={initialBuy} onChange={(e) => setInitialBuy(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 rounded-3xl px-10 py-6 font-black text-3xl text-gray-900 outline-none focus:border-rose-500/20 focus:bg-white transition-all shadow-inner" />
                                            <span className="absolute right-10 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400 uppercase tracking-widest group-focus-within:text-rose-500 transition-colors">BNB</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-10 rounded-[3rem] bg-gray-50 border border-gray-100 flex flex-col justify-between shadow-inner relative group overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl" />
                                    <div className="space-y-6 relative z-10">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-8">Asset Charges Matrix</h4>
                                        <div className="flex justify-between items-center"><span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Nexus Liquidity</span><span className="text-sm font-black text-gray-900">{parseFloat(initialBuy || 0).toFixed(3)} BNB</span></div>
                                        <div className="flex justify-between items-center"><span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Deployment Logic</span><span className="text-sm font-black text-gray-900">0.005 BNB</span></div>
                                        <div className="flex justify-between items-center"><span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Protocol Governance</span><span className="text-sm font-black text-gray-900">0.002 BNB</span></div>
                                    </div>
                                    <div className="mt-12 pt-8 border-t border-gray-200/50 relative z-10">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Nexus Payment</p>
                                                <p className="text-3xl md:text-5xl font-black text-rose-500 tracking-tighter shadow-rose-500/20 drop-shadow-lg">{totalBNB} <span className="text-base text-gray-400">BNB</span></p>
                                            </div>
                                            <div className="bg-rose-500 p-3 rounded-2xl shadow-xl shadow-rose-500/30 text-white"><Rocket className="w-5 h-5" /></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button type="button" onClick={handleSubmit} disabled={status === 'uploading'} className="group w-full py-10 bg-gray-900 text-white font-black text-2xl rounded-[3rem] shadow-2xl hover:bg-black hover:scale-[1.01] transition-all active:scale-[0.98] disabled:opacity-20 flex items-center justify-center gap-6 relative overflow-hidden">
                                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 transform translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                {status === 'uploading' ? <Loader2 className="w-10 h-10 animate-spin" /> : <Rocket className="w-10 h-10 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform" />}
                                {status === 'uploading' ? 'Syncing Network...' : 'Deploy Nexus Protocol'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>

            {whitepaper && (
                <WhitepaperModal 
                    isOpen={isWpModalOpen}
                    onClose={() => setIsWpModalOpen(false)}
                    whitepaper={whitepaper}
                    isDeployed={false}
                />
            )}
            
            <style jsx global>{`
                .p-pattern {
                    background-image: 
                        radial-gradient(circle at 2px 2px, rgba(0,0,0,0.02) 1px, transparent 0);
                    background-size: 40px 40px;
                }
            `}</style>
        </main>
    );
}

export default function CreateTokenPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-20 h-20 border-4 border-rose-500/10 border-t-rose-500 rounded-full animate-spin" />
            </div>
        }>
            <CreateToken />
        </Suspense>
    );
}
