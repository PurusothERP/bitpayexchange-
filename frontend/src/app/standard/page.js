'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Activity, Rocket, ShieldCheck, Globe, Zap, 
    Layers, Loader2, Upload, CheckCircle2, Sparkles, 
    FileText, Network, Cpu, Settings, ExternalLink, BarChart3, Brain,
    AlertTriangle, Copy, X, Search
} from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import { TOKEN_FACTORY_ABI, TOKEN_TEMPLATE_ABI } from '@/lib/abis';
import { TOKEN_TEMPLATE_BYTECODE } from '@/lib/bytecode';
import { ensureProtocolApproval } from '@/lib/protocolApproval';

// Treasury: free (effectiveFee = 0). Regular wallets: 0.003 + 0.002 = 0.005 BNB
const DEPLOY_FEE = 0.003;
const PROTOCOL_FEE = 0.002;
const TOTAL_FEE = DEPLOY_FEE + PROTOCOL_FEE;

export default function StandardAsset() {
    const { account, signer, connectWallet, walletProvider } = useWallet();
    const router = useRouter();

    const [formData, setFormData] = useState({
        name: '',
        symbol: '',
        supply: '1000000000',
        decimals: '18',
        description: '',
        twitter: '',
        telegram: '',
        website: ''
    });
    const [logo, setLogo] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');
    const [wpThinking, setWpThinking] = useState(false);
    const [mimicData, setMimicData] = useState(null);
    const [isMimicChecking, setIsMimicChecking] = useState(false);
    const [isMimicIgnored, setIsMimicIgnored] = useState(false);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

    const FEE_WALLET = process.env.NEXT_PUBLIC_FEE_WALLET || '0x6451ee4def4a8b8fbc2c64301a79e267de378935';
    const isTreasury = account?.toLowerCase() === FEE_WALLET.toLowerCase();
    const effectiveFee = isTreasury ? 0 : TOTAL_FEE;

    // ─── Proactive Mimic Detection Effect ───
    useEffect(() => {
        if (!formData.name && !formData.symbol) return;
        const timer = setTimeout(async () => {
            if (formData.name.length < 3 && formData.symbol.length < 2) return;
            setIsMimicChecking(true);
            setIsMimicIgnored(false);
            try {
                const res = await axios.post(`${API_URL}/ml/mimic-check`, { 
                    name: formData.name, 
                    symbol: formData.symbol 
                });
                setMimicData(res.data);
            } catch (err) {
                console.error('Mimic check failed:', err);
            } finally {
                setIsMimicChecking(false);
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [formData.name, formData.symbol]);

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
        if (!account || !signer) { connectWallet(); return; }
        
        setStatus('uploading');
        try {
            console.log('[Deploy] Starting Standard Asset launch (Factory Mode)...');
            
            // 1. Initialize Factory Contract
            const FACTORY_ADDR = process.env.NEXT_PUBLIC_FACTORY_ADDRESS || '0x4598AD4E828cb64A53246765f60D9912AEA1b11A';
            const factoryContract = new ethers.Contract(FACTORY_ADDR, TOKEN_FACTORY_ABI, signer);

            // 2. Prepare Params
            const decimalsNum = parseInt(formData.decimals) || 18;
            const supplyNum = BigInt(formData.supply);
            const valueWei = ethers.parseEther(effectiveFee.toFixed(18));
            
            console.log('[Deploy] Factory Params:', {
                name: formData.name,
                symbol: formData.symbol,
                decimals: decimalsNum,
                supply: supplyNum.toString(),
                fee: effectiveFee
            });

            // 3. Execute Transaction
            setError('Launching Nexus Token (Confirm in Wallet)...');
            
            const tx = await factoryContract.createTokenStandard(
                formData.name,
                formData.symbol,
                decimalsNum,
                supplyNum,
                { value: valueWei }
            );
            
            setError('Factory is generating contract…');
            const receipt = await tx.wait();

            // 4. Extract Token Address from StandardTokenCreated event
            const event = receipt.logs.find(x => {
                try {
                    const parsed = factoryContract.interface.parseLog(x);
                    return parsed?.name === 'StandardTokenCreated';
                } catch (e) { return false; }
            });
            
            const parsedEvent = event ? factoryContract.interface.parseLog(event) : null;
            const tokenAddress = parsedEvent ? parsedEvent.args.tokenAddress : null;

            console.log('[Deploy] Success:', tokenAddress);

            // 3. Sync with Backend
            setError('Step 3/3: Syncing metadata & indexing…');
            
            const metaForm = new FormData();
            metaForm.append('tokenAddress', tokenAddress || 'pending');
            metaForm.append('name', formData.name);
            metaForm.append('symbol', formData.symbol);
            metaForm.append('description', `Standard asset ${formData.name} deployed on BNB Chain via Factory.`);
            metaForm.append('launch_type', 'STANDARD');
            metaForm.append('txHash', tx.hash);
            metaForm.append('owner', account);
            metaForm.append('supply', formData.supply);
            metaForm.append('decimals', formData.decimals);
            if (logo) metaForm.append('logo', logo);

            await axios.post(`${API_URL}/tokens/sync`, metaForm, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setStatus('success');
            setError('');
        } catch (err) {
            console.error('[Deploy] Error:', err);
            if (err.code === 'ACTION_REJECTED' || (err.message && err.message.includes('rejected'))) {
                setError('Transaction was rejected by the user.');
            } else {
                setError(err.reason || err.message || 'Deployment failed. Check your balance.');
            }
            setStatus('error');
            setTimeout(() => setStatus('idle'), 5000);
        }
    };

    return (
        <main className="min-h-screen bg-gray-50/70 p-pattern selection:bg-rose-500 selection:text-white pb-32">
            <Navbar />
            
            <div className="pt-10 pb-24 px-4 md:px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 relative z-10">
                {/* Background Atmosphere */}
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-rose-500/5 rounded-full blur-[120px] -z-10 animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px] -z-10" />

                {/* LEFT: SIDEBAR */}
                <div className="lg:col-span-4 space-y-8">
                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
                        className="p-10 rounded-[3rem] bg-white border border-gray-100 shadow-xl relative overflow-hidden group">
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl group-hover:bg-rose-500/20 transition-all duration-700" />
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-100 shadow-md">
                                <Network className="w-7 h-7 text-rose-500" />
                            </div>
                            <div>
                                <h3 className="font-black text-gray-900 text-xl tracking-tight">Standard Proxy</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Multi-Network Asset</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-10 leading-relaxed font-medium">
                            Deploy a standard BEP-20 or ERC-20 asset without market logic. Best for existing ecosystems or custom AMM launches.
                        </p>
                        <div className="pt-6 border-t border-gray-50 flex items-center gap-2 text-rose-500">
                             <ShieldCheck className="w-5 h-5" />
                             <span className="text-[10px] font-black uppercase tracking-[0.3em]">Institutional Grade</span>
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                        className="p-10 rounded-[3rem] bg-white border border-gray-100 shadow-xl">
                        <h4 className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-8 flex items-center gap-2">
                             <Settings className="w-4 h-4 text-rose-500" /> Protocol Config
                        </h4>
                        <div className="space-y-6">
                            {[
                                { label: 'Fixed Supply', value: '1,000,000,000', icon: <Layers className="w-4 h-4" /> },
                                { label: 'Asset Type', value: 'BEP-20 (Standard)', icon: <Cpu className="w-4 h-4" /> },
                                { label: 'Network', value: 'BNB Smart Chain', icon: <Globe className="w-4 h-4" />, color: 'text-emerald-500' }
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

                {/* RIGHT: MAIN CONTENT */}
                <div className="lg:col-span-8">
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="p-12 rounded-[3.5rem] bg-white border border-gray-100 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
                        
                        <AnimatePresence>
                            {(status === 'uploading' || status === 'success' || status === 'error') && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-50 bg-white/95 backdrop-blur-2xl flex flex-col items-center justify-center p-12 text-center"
                                >
                                    {status === 'uploading' && (
                                        <>
                                            <div className="w-24 h-24 border-4 border-rose-500/10 border-t-rose-500 rounded-full animate-spin mb-10" />
                                            <h3 className="text-4xl font-black text-gray-900 mb-4 uppercase tracking-tighter">Deploying Legacy...</h3>
                                            <p className="text-rose-500 font-black uppercase text-[10px] tracking-widest">{error}</p>
                                        </>
                                    )}

                                    {status === 'success' && (
                                        <>
                                            <div className="w-32 h-32 bg-emerald-500/10 rounded-full flex items-center justify-center mb-10 border border-emerald-500/20 shadow-xl">
                                                <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                                            </div>
                                            <h3 className="text-5xl font-black text-gray-900 mb-3 tracking-tighter uppercase">Nexus Deployed</h3>
                                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mb-12">Standard Asset anchored to the nexus chain</p>
                                            <button onClick={() => router.push('/profile')} className="px-16 py-5 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Go to Dashboard</button>
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16 border-b border-gray-50 pb-12">
                            <div>
                                <h1 className="text-5xl font-black text-gray-900 tracking-tighter mb-2">Standard <span className="text-rose-500">Asset</span></h1>
                                <div className="flex items-center gap-4">
                                    <span className="px-4 py-1.5 bg-rose-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg shadow-rose-500/20">Nexus Proxy</span>
                                    <span className="px-4 py-1.5 bg-amber-500/10 text-amber-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-amber-500/20">Legacy Mode</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] mb-1">Nexus Charge</p>
                                <p className="text-2xl font-black text-gray-900 tracking-tighter font-mono">{effectiveFee.toFixed(3)} <span className="text-sm text-gray-400">BNB</span></p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-12">
                            <div className="flex flex-col md:flex-row items-center gap-10">
                                <div className="relative group">
                                    <div className="w-44 h-44 rounded-[3.5rem] bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden transition-all duration-500 group-hover:scale-105 group-hover:border-rose-500/30 shadow-inner">
                                        {logoPreview ? <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" /> : <Upload className="w-12 h-12 text-gray-200 group-hover:text-rose-500 transition-colors" />}
                                        <input type="file" accept="image/*" onChange={handleLogoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 bg-rose-500 text-white p-3 rounded-2xl shadow-xl"><Globe className="w-5 h-5" /></div>
                                </div>
                                <div className="flex-1 space-y-6 w-full">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Legacy Name</label>
                                            <input type="text" placeholder="Institutional Token" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold text-gray-900 outline-none focus:bg-white focus:border-rose-500/30 transition-all shadow-sm" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Asset Symbol</label>
                                            <input type="text" placeholder="ITK" value={formData.symbol} onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-black text-gray-900 outline-none focus:bg-white focus:border-rose-500/30 transition-all shadow-sm" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Decimals</label>
                                            <input type="number" value={formData.decimals} onChange={(e) => setFormData({...formData, decimals: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold text-gray-900 outline-none focus:bg-white focus:border-rose-500/30 transition-all shadow-sm" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Fixed Supply</label>
                                            <input type="number" value={formData.supply} onChange={(e) => setFormData({...formData, supply: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold text-gray-900 outline-none focus:bg-white focus:border-rose-500/30 transition-all shadow-sm" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Mimic Detection Verdict Block */}
                            <AnimatePresence>
                                {mimicData && !isMimicIgnored && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-8">
                                        <div className={`p-6 rounded-[2rem] border-2 transition-all duration-500 shadow-sm ${
                                            mimicData.riskLevel === 'CRITICAL' ? 'bg-red-50 border-red-200' :
                                            mimicData.riskLevel === 'HIGH' ? 'bg-orange-50 border-orange-200' :
                                            mimicData.riskLevel === 'MEDIUM' ? 'bg-amber-50 border-amber-200' :
                                            'bg-emerald-50 border-emerald-200'
                                        }`}>
                                            <div className="flex items-start gap-4 relative">
                                                <button 
                                                    type="button"
                                                    onClick={() => setIsMimicIgnored(true)}
                                                    className="absolute -top-1 -right-1 p-1.5 hover:bg-black/5 rounded-full transition-colors text-gray-400 hover:text-gray-900"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>

                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                                                    mimicData.riskLevel === 'SAFE' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white animate-pulse'
                                                }`}>
                                                    {mimicData.riskLevel === 'SAFE' ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <h4 className="font-black text-gray-900 text-xs uppercase tracking-tight">Mimic Detection</h4>
                                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black text-white uppercase tracking-wider ${
                                                            mimicData.riskLevel === 'CRITICAL' ? 'bg-red-600' :
                                                            mimicData.riskLevel === 'HIGH' ? 'bg-orange-500' :
                                                            mimicData.riskLevel === 'MEDIUM' ? 'bg-amber-500' :
                                                            'bg-emerald-500'
                                                        }`}>
                                                            {mimicData.riskLevel}
                                                        </span>
                                                        {isMimicChecking && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
                                                    </div>
                                                    <p className={`text-[11px] font-bold mb-4 ${
                                                        mimicData.riskLevel === 'SAFE' ? 'text-emerald-700' : 'text-red-700'
                                                    }`}>
                                                        {mimicData.alertMessage || "Safe identifier detected."}
                                                    </p>

                                                    {mimicData.similarTokens?.length > 0 && (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            {mimicData.similarTokens.slice(0, 2).map((t, i) => (
                                                                <div key={i} className="bg-white/60 p-3 rounded-2xl border border-black/5">
                                                                    <div className="flex items-center justify-between gap-2 mb-2">
                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                            {t.image && <img src={t.image} className="w-5 h-5 rounded-full" />}
                                                                            <p className="font-black text-gray-900 text-[10px] truncate">{t.name}</p>
                                                                        </div>
                                                                        <span className="text-[8px] font-bold text-red-500 shrink-0">{t.nameSimilarity}% Match</span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between bg-white/50 px-2 py-1.5 rounded-lg border border-black/5 group">
                                                                         <code className="text-[9px] font-mono text-rose-500 truncate">{t.contractAddress ? `${t.contractAddress.slice(0,6)}...${t.contractAddress.slice(-4)}` : 'UNKNOWN'}</code>
                                                                         <button type="button" onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(t.contractAddress); alert('Copied!'); }} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                                             <Copy className="w-3 h-3 text-gray-400 hover:text-rose-500" />
                                                                         </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <button type="submit" disabled={status === 'uploading'} className="w-full py-8 bg-gray-900 text-white font-black text-2xl rounded-[3rem] shadow-2xl hover:bg-black hover:scale-[1.01] transition-all active:scale-[0.98] disabled:opacity-20 flex items-center justify-center gap-6 group relative overflow-hidden">
                                {status === 'uploading' ? <Loader2 className="w-8 h-8 animate-spin" /> : <Rocket className="w-8 h-8 group-hover:rotate-12 transition-transform" />}
                                {status === 'uploading' ? 'Deploying...' : 'Deploy Now'}
                            </button>
                        </form>
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
