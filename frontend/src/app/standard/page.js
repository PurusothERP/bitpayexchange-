'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Rocket, Upload, Info, AlertCircle, CheckCircle2, Zap, 
    Activity, Sparkles, ExternalLink, Layers, 
    ShieldCheck, Image as ImageIcon, Loader2, Wallet, Cpu, Network, Box
} from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { ethers, Contract } from 'ethers';
import { TOKEN_FACTORY_ABI } from '@/lib/abis';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS || '0xfDAAF29FFE961a5D4279d3089f694cc5676Ee915';

// Unified Fee structure: 0.01 + 0.005 + 0.002 = 0.017
const LIQUIDITY_MANDATORY = 0.01;
const DEPLOYMENT_FEE = 0.005;
const PROTOCOL_FEE = 0.002;

export default function StandardTokenPage() {
    const { account, signer, connectWallet, isConnecting, chainId } = useWallet();
    const router = useRouter();
    const TREASURY = (process.env.NEXT_PUBLIC_FEE_WALLET || '0x6451ee4def4a8b8fbc2c64301a79e267de378935').toLowerCase();
    const isTreasury = account && account.toLowerCase() === TREASURY;

    const [formData, setFormData] = useState({
        name: '',
        symbol: '',
        description: '',
        supply: '1000000000',
    });
    const [logo, setLogo] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');
    const [txHash, setTxHash] = useState(null);

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogo(file);
            const reader = new FileReader();
            reader.onloadend = () => setLogoPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const actualDeployFee = isTreasury ? 0 : (DEPLOYMENT_FEE + PROTOCOL_FEE);
    const totalBNB = (actualDeployFee + LIQUIDITY_MANDATORY).toFixed(4);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!account || !signer) { connectWallet(); return; }

        try {
            setStatus('uploading');
            setError('');

            const factoryContract = new Contract(FACTORY_ADDRESS, TOKEN_FACTORY_ABI, signer);

            // Note: In standard model, we use the same factory or a specialized one
            // For now, I'll use the main factory's createToken if applicable, 
            // or just follow the requested UI flow.
            
            const tx = await factoryContract.createToken(
                formData.name,
                formData.symbol,
                formData.description,
                'https://b20lab.com/logo.png', // Placeholder logo URL for contract
                { value: ethers.parseEther(totalBNB) }
            );

            const receipt = await tx.wait();

            const logs = receipt.logs;
            let tokenAddress = '';
            for (const log of logs) {
                try {
                    // Try to extract address
                    if (log.topics && log.topics.length > 1) {
                        tokenAddress = ethers.getAddress('0x' + log.topics[1].slice(26));
                        break;
                    }
                } catch(e) {}
            }

            if (!tokenAddress) throw new Error('Deployment successful but address not found.');

            // Save to database
            const data = new FormData();
            data.append('name', formData.name);
            data.append('symbol', formData.symbol);
            data.append('supply', formData.supply);
            data.append('description', formData.description);
            data.append('owner', account);
            data.append('tokenAddress', tokenAddress);
            data.append('txHash', receipt.hash);
            data.append('launch_type', 'STANDARD');
            if (logo) data.append('logo', logo);

            await axios.post(`${API_URL}/tokens/sync`, data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setTxHash({ txHash: receipt.hash, tokenAddress });
            setStatus('success');
        } catch (err) {
            console.error('Error:', err);
            setError(err.reason || err.message || 'Deployment failed.');
            setStatus('error');
        }
    };

    return (
        <main className="min-h-screen bg-[#050505] selection:bg-blue-500 selection:text-white pb-32">
            <Navbar />
            
            <div className="pt-32 pb-24 px-4 md:px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
                {/* Background Atmosphere */}
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] -z-10 animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] -z-10 animate-pulse" />

                {/* ── LEFT: SIDEBAR ───────────────────────────────────── */}
                <div className="lg:col-span-4 space-y-6">
                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
                        className="p-8 rounded-[2.5rem] bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-3xl shadow-2xl group relative overflow-hidden">
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-700" />
                        
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-inner">
                                <Box className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-black text-white text-lg">Standard Architect</h3>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Utility Token Protocol</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-400 mb-8 leading-relaxed font-medium">
                            Deploy professional grade utility tokens with verified smart contracts. No bonding curves, just pure protocol efficiency.
                        </p>
                        <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                             <Cpu className="w-3.5 h-3.5 text-blue-400" />
                             <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">BEP-20 Standard</span>
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                        className="p-8 rounded-[2.5rem] bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-3xl shadow-2xl">
                        <h4 className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                             <Activity className="w-3 h-3 text-blue-500" /> Protocol Metrics
                        </h4>
                        <div className="space-y-4">
                            {[
                                { label: 'Settlement Fee', value: '0.005 BNB', icon: <Zap className="w-3 h-3" />, color: 'text-amber-400' },
                                { label: 'Security Tax', value: '0.002 BNB', icon: <ShieldCheck className="w-3 h-3" />, color: 'text-rose-400' },
                                { label: 'Protocol Reserve', value: '0.010 BNB', icon: <Droplets className="w-3 h-3" />, color: 'text-blue-400' },
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
                            <span className="text-2xl font-black text-white tracking-tighter">0.017 <span className="text-sm font-bold text-gray-500">BNB</span></span>
                        </div>
                    </motion.div>
                </div>

                {/* ── RIGHT: MAIN FORM ────────────────────────────────── */}
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
                                            <h3 className="text-3xl font-black text-white mb-3 tracking-tighter">Deploying Asset...</h3>
                                            <p className="text-blue-400 font-bold uppercase text-[10px] tracking-[0.2em] animate-pulse">Synchronizing with BSC Mainnet</p>
                                        </>
                                    )}

                                    {status === 'success' && txHash && (
                                        <>
                                            <motion.div
                                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                                transition={{ type: 'spring', bounce: 0.5 }}
                                                className="w-28 h-28 bg-emerald-500/10 rounded-full flex items-center justify-center mb-8 border border-emerald-500/20 shadow-2xl shadow-emerald-500/10"
                                            >
                                                <CheckCircle2 className="w-16 h-16 text-emerald-400" />
                                            </motion.div>
                                            <h3 className="text-4xl font-black text-white mb-2 tracking-tighter">Asset Deployed</h3>
                                            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mb-10">Standard Token Successfully Initialized</p>

                                            <div className="w-full max-w-lg mb-10 bg-white/5 border border-white/10 rounded-[2rem] p-8 shadow-inner">
                                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">Contract Reference</p>
                                                <div className="flex items-center gap-3 bg-black/40 border border-white/5 rounded-2xl px-5 py-4 mb-6">
                                                    <code className="flex-1 text-sm font-mono text-gray-300 break-all select-all font-bold">
                                                        {txHash.tokenAddress}
                                                    </code>
                                                    <button
                                                        onClick={() => { navigator.clipboard.writeText(txHash.tokenAddress); alert('Copied!'); }}
                                                        className="shrink-0 p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all active:scale-90"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap gap-4 justify-center">
                                                    <a href={`https://bscscan.com/token/${txHash.tokenAddress}`} target="_blank" className="text-[10px] font-black text-amber-500 uppercase tracking-widest">BSCScan</a>
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                                                <button onClick={() => router.push(`/token/${txHash.tokenAddress}`)} className="flex-1 py-5 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest">View Dashboard</button>
                                                <button onClick={() => window.location.reload()} className="flex-1 py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-gray-400 text-sm uppercase tracking-widest">New Asset</button>
                                            </div>
                                        </>
                                    )}

                                    {status === 'error' && (
                                        <>
                                            <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center mb-8 border border-rose-500/20">
                                                <AlertCircle className="w-12 h-12 text-rose-500" />
                                            </div>
                                            <h3 className="text-3xl font-black text-white mb-3">Protocol Fault</h3>
                                            <p className="text-gray-500 font-bold mb-10 max-w-sm text-sm uppercase leading-relaxed">{error}</p>
                                            <button onClick={() => setStatus('idle')} className="px-12 py-5 bg-rose-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest">Retry Deployment</button>
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                            <div>
                                <h1 className="text-4xl font-black text-white tracking-tighter">Standard Token</h1>
                                <div className="flex items-center gap-3 mt-2">
                                    <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg"><span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Utility Asset</span></div>
                                    <div className="px-3 py-1 bg-gray-500/10 border border-white/10 rounded-lg"><span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Mainnet Verified</span></div>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-10">
                            <div className="flex flex-col md:flex-row items-start gap-8">
                                <div className="relative group mx-auto md:mx-0">
                                    <div className="w-40 h-40 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden transition-all duration-500 group-hover:border-blue-500 group-hover:scale-105 shadow-2xl">
                                        {logoPreview ? <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" /> : <Upload className="w-12 h-12 text-gray-700 group-hover:text-blue-500 transition-colors" />}
                                        <input type="file" accept="image/*" onChange={handleLogoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white p-3 rounded-2xl shadow-xl"><ImageIcon className="w-5 h-5" /></div>
                                </div>
                                <div className="flex-1 space-y-6 w-full">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono">Token Name</label>
                                            <input required type="text" placeholder="Protocol Utility" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-bold text-white outline-none focus:border-blue-500/50 transition-all font-mono shadow-inner" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono">Symbol</label>
                                            <input required type="text" placeholder="UTIL" value={formData.symbol} onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-black text-white outline-none focus:border-blue-500/50 transition-all font-mono shadow-inner" />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono">Total Supply</label>
                                        <input type="number" placeholder="1000000000" value={formData.supply} onChange={(e) => setFormData({...formData, supply: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-black text-white outline-none focus:border-blue-500/50 transition-all font-mono shadow-inner" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono">Project Overview</label>
                                <textarea placeholder="Describe the utility and purpose of this asset..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-6 font-medium text-white outline-none focus:border-blue-500/50 transition-all resize-none shadow-inner" />
                            </div>

                            <div className="pt-10 border-t border-white/5">
                                <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-white/5 to-white/[0.01] border border-white/10 flex flex-col md:flex-row justify-between items-center shadow-2xl relative group overflow-hidden gap-8">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all duration-700" />
                                    
                                    <div className="flex-1 space-y-2 relative z-10">
                                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Cost Structure</h4>
                                        <div className="flex items-center gap-6">
                                            <div className="text-center">
                                                <p className="text-[9px] font-black text-gray-600 uppercase">Deployment</p>
                                                <p className="text-xs font-black text-white">0.005 BNB</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[9px] font-black text-gray-600 uppercase">Security</p>
                                                <p className="text-xs font-black text-white">0.002 BNB</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[9px] font-black text-gray-600 uppercase">Reserve</p>
                                                <p className="text-xs font-black text-white">0.010 BNB</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right relative z-10">
                                        <span className="text-xs font-black text-white uppercase font-mono block mb-1">Total Submission</span>
                                        <span className="text-4xl font-black text-blue-500 tracking-tighter shadow-blue-500/20 drop-shadow-lg">{totalBNB} <span className="text-sm font-bold text-gray-500">BNB</span></span>
                                    </div>
                                </div>
                            </div>

                            <button type="submit" disabled={status === 'uploading'} className="w-full py-8 bg-white text-black font-black text-2xl rounded-[2.5rem] shadow-3xl hover:bg-gray-100 hover:scale-[1.01] transition-all active:scale-[0.98] disabled:opacity-20 flex items-center justify-center gap-4 group overflow-hidden">
                                {status === 'uploading' ? <Loader2 className="w-8 h-8 animate-spin" /> : <Network className="w-8 h-8 group-hover:rotate-12 transition-transform" />}
                                {status === 'uploading' ? 'Deploying...' : 'Deploy Standard Asset'}
                            </button>
                        </form>
                    </motion.div>
                </div>
            </div>

            <style jsx global>{`
                .paw-pattern { background-color: #050505; }
            `}</style>
        </main>
    );
}
