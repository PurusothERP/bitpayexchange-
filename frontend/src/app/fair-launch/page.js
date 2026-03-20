'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Rocket, Upload, Info, AlertCircle, CheckCircle2, Zap, 
    TrendingUp, Activity, Sparkles, ExternalLink, Layers, 
    Droplets, ShieldCheck, Image as ImageIcon, Loader2, Wallet
} from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { ethers, Contract } from 'ethers';
import { TOKEN_TEMPLATE_ABI } from '@/lib/abis';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const DIRECT_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_DIRECT_FACTORY_ADDRESS || '0x6451ee4def4a8b8fbc2c64301a79e267de378935';

// Unified Fee structure: 0.01 + 0.005 + 0.002 = 0.017
const LIQUIDITY_MANDATORY = 0.01;
const DEPLOYMENT_FEE = 0.005;
const PROTOCOL_FEE = 0.002;

export default function FairLaunchPage() {
    const { account, signer, connectWallet, isConnecting, chainId } = useWallet();
    const router = useRouter();
    const TREASURY = (process.env.NEXT_PUBLIC_FEE_WALLET || '0x6451ee4def4a8b8fbc2c64301a79e267de378935').toLowerCase();
    const isTreasury = account && account.toLowerCase() === TREASURY;

    const [formData, setFormData] = useState({
        name: '',
        symbol: '',
        description: '',
    });
    const [logo, setLogo] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [initialLiquidity, setInitialLiquidity] = useState('0.01');
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
    const minLiq = LIQUIDITY_MANDATORY;
    const currentLiq = Math.max(parseFloat(initialLiquidity) || minLiq, minLiq);
    const totalBNB = (actualDeployFee + currentLiq).toFixed(4);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!account || !signer) { connectWallet(); return; }

        if (!DIRECT_FACTORY_ADDRESS || DIRECT_FACTORY_ADDRESS === '0xTBD') {
            setError('Direct Launch Factory not initialized.');
            setStatus('error');
            return;
        }

        try {
            setStatus('uploading');
            setError('');

            const factoryContract = new Contract(DIRECT_FACTORY_ADDRESS, [
                "function createTokenDirect(string name, string symbol) payable returns (address)",
                "event TokenCreatedDirect(address indexed tokenAddress, string name, string symbol, uint256 supply, address indexed creator, uint256 deploymentFee, uint256 liquidityBnb)"
            ], signer);

            const tx = await factoryContract.createTokenDirect(
                formData.name,
                formData.symbol,
                { value: ethers.parseEther(totalBNB) }
            );

            const receipt = await tx.wait();

            const logs = receipt.logs;
            let tokenAddress = '';
            // Try to find token address from logs
            for (const log of logs) {
                try {
                    if (log.topics && log.topics.length > 1) {
                        tokenAddress = ethers.getAddress('0x' + log.topics[1].slice(26));
                        break;
                    }
                } catch(e) {}
            }

            if (!tokenAddress) {
                const iface = new ethers.Interface(["event TokenCreatedDirect(address indexed tokenAddress, string name, string symbol, uint256 supply, address indexed creator, uint256 deploymentFee, uint256 liquidityBnb)"]);
                for (const log of logs) {
                    try {
                        const parsed = iface.parseLog(log);
                        if (parsed && parsed.name === 'TokenCreatedDirect') {
                            tokenAddress = parsed.args.tokenAddress;
                            break;
                        }
                    } catch(e) {}
                }
            }

            if (!tokenAddress) throw new Error('Token deployment successful but address extraction failed.');

            // Metadata Sync
            const data = new FormData();
            data.append('name', formData.name);
            data.append('symbol', formData.symbol);
            data.append('supply', '1000000000');
            data.append('description', formData.description);
            data.append('owner', account);
            data.append('tokenAddress', tokenAddress);
            data.append('txHash', receipt.hash);
            data.append('launch_type', 'FAIR_LAUNCH');
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
        <main className="min-h-screen bg-[#050505] selection:bg-emerald-500 selection:text-white pb-32">
            <Navbar />
            
            <div className="pt-32 pb-24 px-4 md:px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
                {/* Background Atmosphere */}
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] -z-10 animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] -z-10 animate-pulse" />

                {/* ── LEFT: SIDEBAR ───────────────────────────────────── */}
                <div className="lg:col-span-4 space-y-6">
                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
                        className="p-8 rounded-[2.5rem] bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-3xl shadow-2xl group relative overflow-hidden">
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-700" />
                        
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-inner">
                                <Rocket className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="font-black text-white text-lg">Fair Launch Engine</h3>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Instant DEX Liquidity</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-400 mb-8 leading-relaxed font-medium">
                            Skip the bonding curve. Launch directly on PancakeSwap with 100% supply and locked liquidity.
                        </p>
                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                             <p className="text-[9px] font-black text-emerald-400 uppercase mb-1 tracking-widest">Protocol Strategy</p>
                             <p className="text-xs font-bold text-gray-300">100% Fair Distribution</p>
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                        className="p-8 rounded-[2.5rem] bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-3xl shadow-2xl">
                        <h4 className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                             <Activity className="w-3 h-3 text-emerald-500" /> Launch Parameters
                        </h4>
                        <div className="space-y-4">
                            {[
                                { label: 'Fixed Supply', value: '1,000,000,000 (1B)', icon: <Layers className="w-3 h-3" /> },
                                { label: 'Initial Liquidity', value: '0.010 BNB', icon: <Droplets className="w-3 h-3" />, color: 'text-emerald-400' },
                                { label: 'Deployment Fee', value: '0.005 BNB', icon: <Zap className="w-3 h-3" />, color: 'text-amber-400' },
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
                                                <div className="absolute inset-0 border-4 border-emerald-500/10 rounded-full" />
                                                <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Activity className="w-8 h-8 text-emerald-500 animate-pulse" />
                                                </div>
                                            </div>
                                            <h3 className="text-3xl font-black text-white mb-3 tracking-tighter">Initiating Fair Launch...</h3>
                                            <p className="text-emerald-400 font-bold uppercase text-[10px] tracking-[0.2em] animate-pulse">{error || 'Securing liquidity on-chain'}</p>
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
                                            <h3 className="text-4xl font-black text-white mb-2 tracking-tighter">Token Live</h3>
                                            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mb-10">Listed on PancakeSwap</p>

                                            <div className="w-full max-w-lg mb-10 bg-white/5 border border-white/10 rounded-[2rem] p-8 shadow-inner">
                                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">Contract Address</p>
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
                                                    <a href={`https://pancakeswap.finance/swap?outputCurrency=${txHash.tokenAddress}`} target="_blank" className="text-[10px] font-black text-rose-500 uppercase tracking-widest">PancakeSwap</a>
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                                                <button onClick={() => router.push(`/token/${txHash.tokenAddress}`)} className="flex-1 py-5 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest">View Dashboard</button>
                                                <button onClick={() => window.location.reload()} className="flex-1 py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-gray-400 text-sm uppercase tracking-widest">Deploy New</button>
                                            </div>
                                        </>
                                    )}

                                    {status === 'error' && (
                                        <>
                                            <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center mb-8 border border-rose-500/20">
                                                <AlertCircle className="w-12 h-12 text-rose-500" />
                                            </div>
                                            <h3 className="text-3xl font-black text-white mb-3">Bridge Interrupt</h3>
                                            <p className="text-gray-500 font-bold mb-10 max-w-sm text-sm uppercase leading-relaxed">{error}</p>
                                            <button onClick={() => setStatus('idle')} className="px-12 py-5 bg-rose-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest">Retry</button>
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                            <div>
                                <h1 className="text-4xl font-black text-white tracking-tighter">Fair Launch Token</h1>
                                <div className="flex items-center gap-3 mt-2">
                                    <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg"><span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">DEX-Verified</span></div>
                                    <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg"><span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">No Bonding Curve</span></div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-10">
                            <div className="flex flex-col md:flex-row items-start gap-8">
                                <div className="relative group mx-auto md:mx-0">
                                    <div className="w-40 h-40 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden transition-all duration-500 group-hover:border-emerald-500 group-hover:scale-105">
                                        {logoPreview ? <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" /> : <Upload className="w-12 h-12 text-gray-700 group-hover:text-emerald-500 transition-colors" />}
                                        <input type="file" accept="image/*" onChange={handleLogoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-3 rounded-2xl shadow-xl"><ImageIcon className="w-5 h-5" /></div>
                                </div>
                                <div className="flex-1 space-y-6 w-full">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono">Token Name</label>
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
                                        <div className="flex gap-2">
                                            {['0.01', '0.05', '0.1', '0.5'].map(v => (
                                                <button key={v} type="button" onClick={() => setInitialLiquidity(v)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${initialLiquidity === v ? 'bg-emerald-500 text-white' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}>
                                                    {v} BNB
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                                        <p className="text-[10px] text-blue-400 font-bold leading-relaxed mb-2 flex items-center gap-2">
                                            <Info className="w-3 h-3" /> Technical Note
                                        </p>
                                        <p className="text-[10px] text-gray-500 font-semibold leading-relaxed">
                                            100% of the token supply is automatically sent to PancakeSwap. You will receive the LP tokens instantly.
                                        </p>
                                    </div>
                                </div>

                                <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-white/5 to-white/[0.01] border border-white/10 flex flex-col justify-between shadow-2xl relative group overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all duration-700" />
                                    <div className="space-y-4 relative z-10">
                                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Charges Breakdown</h4>
                                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-400">Main Liquidity</span><span className="text-sm font-black text-white">{parseFloat(initialLiquidity || 0).toFixed(3)} BNB</span></div>
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
                                {status === 'uploading' ? 'Deploying...' : 'Launch Fair Token Now'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>

            <style jsx global>{`
                .paw-pattern { background-color: #050505; }
            `}</style>
        </main>
    );
}
