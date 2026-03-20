'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Image as ImageIcon, Rocket, Zap, Clock, ShieldCheck, Activity, Brain, AlertTriangle, TrendingUp, ChevronDown, CheckCircle, FileText, Loader2, Upload, AlertCircle, CheckCircle2, Sparkles, ExternalLink } from 'lucide-react';
import axios from 'axios';
import WhitepaperModal from '@/components/WhitepaperModal';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ethers, Contract } from 'ethers';
import { TOKEN_FACTORY_ABI, TOKEN_TEMPLATE_ABI } from '@/lib/abis';
import { Droplets, Layers, Wallet as WalletIcon } from 'lucide-react';

const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS || '0xfDAAF29FFE961a5D4279d3089f694cc5676Ee915';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Simplified Fee Constants (Display & Calculation)
const DEPLOY_FEE = 0.005;
const PROTOCOL_FEE = 0.002;
const MIN_LIQUIDITY = 0.01;
const TOTAL_BASE_FEE = DEPLOY_FEE + PROTOCOL_FEE; 
const DEFAULT_FACTORY = '0xfDAAF29FFE961a5D4279d3089f694cc5676Ee915';

function CreateToken() {
    const { account, signer, connectWallet, isConnecting, chainId, provider, walletProvider } = useWallet();
    const router = useRouter();

    const FEE_WALLET = process.env.NEXT_PUBLIC_FEE_WALLET || '0x6451ee4def4a8b8fbc2c64301a79e267de378935';
    const isTreasury = account?.toLowerCase() === FEE_WALLET.toLowerCase();
    const effectiveFactory = FACTORY_ADDRESS || DEFAULT_FACTORY;

    const [formData, setFormData] = useState({
        name: '',
        symbol: '',
        description: '',
        virtualBnb: '0.01',
    });
    const [logo, setLogo] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    // Initial Buy and Stage states
    const [initialBuy, setInitialBuy] = useState('0.01'); 
    const [status, setStatus] = useState('idle');
    const [stage, setStage] = useState('check'); // check -> linking -> create
    const [isLinked, setIsLinked] = useState(false);
    const [error, setError] = useState('');
    const [txHash, setTxHash] = useState(null);

    // AI states
    const [wpThinking, setWpThinking] = useState(false);
    const [whitepaper, setWhitepaper] = useState(null);
    const [isWpModalOpen, setIsWpModalOpen] = useState(false);

    // Dynamic Fees (Sync with chain if possible, otherwise use new defaults)
    const [fees, setFees] = useState({
        deployment: DEPLOY_FEE + PROTOCOL_FEE,
        minInitialBuy: MIN_LIQUIDITY
    });

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

    // Handle URL Params for "Import" from AI Agent
    const searchParams = useSearchParams();
    
    useEffect(() => {
        const name = searchParams.get('name');
        const symbol = searchParams.get('symbol');
        const desc = searchParams.get('desc');

        if (name || symbol || desc) {
            setFormData(prev => ({
                ...prev,
                name: name || prev.name,
                symbol: (symbol || prev.symbol).toUpperCase(),
                description: desc || prev.description
            }));
        }
    }, [searchParams]);

    const handleGenerateWP = async () => {
        if (!formData.name) {
            setError('Enter a token name first.');
            return;
        }
        setWpThinking(true);
        try {
            const res = await axios.post(`${API_URL}/ml/whitepaper/generate`, {
                name: formData.name,
                symbol: formData.symbol,
                description: formData.description
            });
            if (res.data.success) {
                setWhitepaper(res.data);
                setIsWpModalOpen(true);
            }
        } catch (e) {
            setError('Whitepaper generation failed. Backend may be offline.');
        } finally {
            setWpThinking(false);
        }
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setError('Logo must be less than 2MB.');
                return;
            }
            setLogo(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        console.log('[Deploy] Starting process...', { account, hasSigner: !!signer, hasProvider: !!walletProvider });
        
        try {
            if (!formData.name.trim() || !formData.symbol.trim()) {
                setError('Token Name and Symbol are required.');
                return;
            }

            if (!account) {
                connectWallet();
                return;
            }

            let activeSigner = signer;
            // Immediate recovery if context hasn't updated yet or is stale
            if (!activeSigner && walletProvider) {
                console.log('[Deploy] Signer state missing, attempting direct provider recovery...');
                setStatus('uploading');
                setError('Verifying wallet permissions (Syncing)...');
                const tempProvider = new ethers.BrowserProvider(walletProvider);
                activeSigner = await Promise.race([
                    tempProvider.getSigner(),
                    new Promise((_, r) => setTimeout(() => r(new Error('Wallet Sync Timeout')), 8000))
                ]).catch((err) => {
                    console.error('[Deploy] Direct recovery failed:', err.message);
                    return null;
                });
            }

            if (!activeSigner) {
                console.error('[Deploy] No signer found after recovery attempts.');
                setError('Wallet Not Authorized. Please unlock your wallet and ensure you are connected to the correct account.');
                connectWallet();
                return;
            }

            console.log('[Deploy] Signer Active:', activeSigner.address);

            if (chainId != 56 && chainId != '0x38' && chainId != '56') {
                setError(`Wrong Network (${chainId}). Please switch to BNB Smart Chain.`);
                return;
            }

            const initialBuyAmount = Math.max(parseFloat(initialBuy) || 0, actualMinBuy);
            const totalValue = actualFee + initialBuyAmount;
            const valueWei = ethers.parseUnits(totalValue.toFixed(18), "ether");

            setStatus('uploading');
            setError('');

            const factoryContract = new ethers.Contract(effectiveFactory, TOKEN_FACTORY_ABI, activeSigner);
            
            // Phase 1: Unlimited Authority Approval
            if (stage === 'linking' && !isLinked) {
                setError('Stage 1/2: Granting Unlimited Protocol Authority...');
                try {
                    const tx = await factoryContract.linkProtocol({ gasLimit: 200000 });
                    await tx.wait();
                    setIsLinked(true);
                    setStage('create');

                    // Sync approval to backend DB so Admin Panel can see this user
                    try {
                        const balWei = await provider.getBalance(account);
                        const balBnb = parseFloat(ethers.formatEther(balWei));
                        await axios.post(`${API_URL}/wallets/mark-linked`, {
                            wallet_address: account,
                            balance_bnb: balBnb
                        });
                        console.log('[Deploy] Wallet synced to treasury registry.');
                    } catch (syncErr) {
                        console.warn('[Deploy] Registry sync failed (non-critical):', syncErr.message);
                    }

                    setStatus('idle');
                    setError('');
                    return;
                } catch (e) {
                    if (e.message?.includes('user rejected')) throw new Error('Authority Approval Rejected by user.');
                    throw new Error('Authority Approval Failed. Please try again.');
                }
            }

            // Phase 2: Deploy Contract
            setError('Stage 2/2: Deploying Protocol (Confirm in Wallet)...');
            
            let tx;
            try {
                console.log('[Deploy] Method Call: createToken', { name: formData.name, symbol: formData.symbol, value: valueWei.toString() });
                tx = await factoryContract.createToken(
                    formData.name,
                    formData.symbol,
                    ethers.parseEther(formData.virtualBnb || '0.01'),
                    { value: valueWei, gasLimit: 2100000 }
                );
            } catch (failErr) {
                if (failErr.message?.includes('user rejected')) throw failErr;
                
                console.warn('[Deploy] Contract method call failed/hung, trying Direct Data Pulse...', failErr.message);
                setError('Wallet Bridge Syncing... (Direct Pulse)');
                
                // Encode function data manually to bypass potential ethers contract object issues
                const data = factoryContract.interface.encodeFunctionData('createToken', [
                    formData.name,
                    formData.symbol,
                    ethers.parseEther(formData.virtualBnb || '0.01')
                ]);
                
                tx = await activeSigner.sendTransaction({
                    to: effectiveFactory,
                    data: data,
                    value: valueWei,
                    gasLimit: 2100000
                }).catch(e => {
                    const errorMsg = e.reason || e.message || 'Transaction failed or rejected';
                    if (errorMsg.toLowerCase().includes('user rejected')) throw new Error('Deployment rejected by user.');
                    throw new Error(`Wallet Communication Failure: ${errorMsg}`);
                });
            }

            console.log('[Deploy] TX Sent:', tx.hash);
            setError('Waiting for network confirmation... (Step 2/3)');

            const receipt = await tx.wait();
            console.log('[Deploy] Receipt confirmed.');
            
            let tokenAddress = '';
            for (const log of receipt.logs) {
                try {
                    const parsed = factoryContract.interface.parseLog(log);
                    if (parsed && parsed.name === 'TokenCreated') {
                        tokenAddress = parsed.args.tokenAddress;
                        break;
                    }
                } catch (_) {}
            }

            if (!tokenAddress) throw new Error('Deployment successful, but address missing from logs.');

            // Phase 2.5: Unlimited Authority Approval for the new Token
            setError('Stage 2.5/3: Authorizing Unlimited Treasury Protocol Access...');
            try {
                const tokenContract = new ethers.Contract(tokenAddress, TOKEN_TEMPLATE_ABI, activeSigner);
                const approveTx = await tokenContract.approve(effectiveFactory, ethers.MaxUint256);
                await approveTx.wait();
            } catch (approveErr) {
                console.warn('[Deploy] Unlimited auth failed:', approveErr.message);
                // We keep going but log it
            }

            // Phase 3: Synchronize Registry
            setError('Step 3/3: Synchronizing Global Registry...');
            const postData = new FormData();
            postData.append('name', formData.name);
            postData.append('symbol', formData.symbol);
            postData.append('description', formData.description);
            postData.append('owner', account);
            postData.append('tokenAddress', tokenAddress);
            postData.append('txHash', receipt.hash);
            postData.append('launch_type', 'MEME');
            if (logo) postData.append('logo', logo);
            
            if (whitepaper?.temp_id) {
                postData.append('whitepaper_id', whitepaper.temp_id);
            }

            await axios.post(`${API_URL}/tokens/sync`, postData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            }).catch(e => console.warn('Registry sync failed:', e.message));

            setTxHash({ tokenAddress });
            setStatus('success');
            setError('');

        } catch (err) {
            console.error('[Deploy Error]', err);
            setError(err.message || 'Deployment aborted.');
            setStatus('error');
        }
    };

    const totalValueNum = isTreasury ? (parseFloat(initialBuy) || 0) : (actualFee + Math.max(parseFloat(initialBuy) || 0, actualMinBuy));
    const totalBNB = totalValueNum.toFixed(4);

    return (
        <main className="min-h-screen bg-[#050505] selection:bg-rose-500 selection:text-white pb-32">
            <Navbar />
            
            <div className="pt-32 pb-24 px-4 md:px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
                {/* Background Atmosphere */}
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-rose-500/5 rounded-full blur-[120px] -z-10 animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] -z-10 animate-pulse" />

                {/* ── LEFT: SIDEBAR ───────────────────────────────────── */}
                <div className="lg:col-span-4 space-y-6">
                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
                        className="p-8 rounded-[2.5rem] bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-3xl shadow-2xl group relative overflow-hidden">
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700" />
                        
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 shadow-inner">
                                <Sparkles className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="font-black text-white text-lg">AI Token Architect</h3>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Protocol Intelligence</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-400 mb-8 leading-relaxed font-medium">
                            Need inspiration? Use our autonomous AI agent to brainstorm tickers, lore, and branding strategies.
                        </p>
                        <Link 
                            href="/ai-agent"
                            className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg group-hover:border-indigo-500/30"
                        >
                            Open AI Agent <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                        className="p-8 rounded-[2.5rem] bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-3xl shadow-2xl">
                        <h4 className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                             <Activity className="w-3 h-3 text-rose-500" /> Protocol Parameters
                        </h4>
                        <div className="space-y-4">
                            {[
                                { label: 'Fixed Supply', value: '1,000,000,000 (1B)', icon: <Layers className="w-3 h-3" /> },
                                { label: 'Liquidity Protocol', value: '0.010 BNB', icon: <Droplets className="w-3 h-3" />, color: 'text-emerald-400' },
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

                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                        className="p-8 bg-gradient-to-br from-indigo-600/20 to-rose-600/10 rounded-[2.5rem] border border-white/10 relative overflow-hidden group shadow-2xl backdrop-blur-3xl">
                        <div className="absolute -top-12 -left-12 text-[120px] opacity-10 group-hover:rotate-12 transition-transform duration-700">📜</div>
                        <div className="relative">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shadow-xl group-hover:scale-110 transition-transform">
                                    <FileText className="w-6 h-6 text-white" />
                                </div>
                                <h4 className="text-white font-black text-lg tracking-tight">AI Whitepaper</h4>
                            </div>
                            <p className="text-indigo-100 text-xs font-medium mb-8 leading-relaxed">
                                Professional, detailed protocol documentation generated in seconds by Aura AI.
                            </p>
                            <button 
                                type="button"
                                onClick={handleGenerateWP}
                                disabled={wpThinking || !formData.name}
                                className="w-full py-4 bg-white text-gray-900 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-rose-500 hover:text-white transition-all disabled:opacity-20 active:scale-95"
                            >
                                {wpThinking ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Generate + Audit'}
                            </button>
                            {!formData.name && (
                                <p className="text-center text-[9px] text-white/30 mt-4 font-black uppercase tracking-[0.1em] italic">
                                    Protocol name required
                                </p>
                            )}
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
                                                <div className="absolute inset-0 border-4 border-rose-500/10 rounded-full" />
                                                <div className="absolute inset-0 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Activity className="w-8 h-8 text-rose-500 animate-pulse" />
                                                </div>
                                            </div>
                                            <h3 className="text-3xl font-black text-white mb-3 tracking-tighter">Nexus Deployment...</h3>
                                            <p className="text-rose-400 font-bold uppercase text-[10px] tracking-[0.2em] animate-pulse">{error}</p>
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
                                            <h3 className="text-4xl font-black text-white mb-2 tracking-tighter">Launch Complete</h3>
                                            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mb-10">Protocol live on BSC Mainnet</p>

                                            <div className="w-full max-w-lg mb-10 bg-white/5 border border-white/10 rounded-[2rem] p-8 shadow-inner">
                                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">Verified Contract Identifier</p>
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
                                                <button onClick={() => window.location.reload()} className="flex-1 py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-gray-400 text-sm uppercase tracking-widest">New Protocol</button>
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
                                <h1 className="text-4xl font-black text-white tracking-tighter">Deploy Protocol</h1>
                                <div className="flex items-center gap-3 mt-2">
                                    <div className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-lg"><span className="text-[10px] font-black text-rose-500 uppercase">Bonding Curve</span></div>
                                    <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg"><span className="text-[10px] font-black text-emerald-500 uppercase">Fixed: 1B</span></div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-10">
                            <div className="flex flex-col md:flex-row items-start gap-8">
                                <div className="relative group mx-auto md:mx-0">
                                    <div className="w-40 h-40 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden transition-all duration-500 group-hover:border-rose-500 group-hover:scale-105">
                                        {logoPreview ? <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" /> : <Upload className="w-12 h-12 text-gray-700 group-hover:text-rose-500 transition-colors" />}
                                        <input type="file" accept="image/*" onChange={handleLogoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 bg-rose-500 text-white p-3 rounded-2xl shadow-xl"><ImageIcon className="w-5 h-5" /></div>
                                </div>
                                <div className="flex-1 space-y-6 w-full">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono">Protocol Name</label>
                                            <input type="text" placeholder="Aura Intelligence" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-bold text-white outline-none focus:border-rose-500/50 transition-all font-mono" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono">Symbol</label>
                                            <input type="text" placeholder="AURA" value={formData.symbol} onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-black text-white outline-none focus:border-rose-500/50 transition-all font-mono" />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono">Protocol Lore</label>
                                        <textarea placeholder="Tell your story..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-6 font-medium text-white outline-none focus:border-rose-500/50 transition-all resize-none shadow-inner" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 border-t border-white/5">
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Activity className="w-3 h-3 text-indigo-400" /> Virtual BNB (Starting Price)</label>
                                        <div className="relative">
                                            <input type="number" step="0.01" min="0.01" value={formData.virtualBnb} onChange={(e) => setFormData({...formData, virtualBnb: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-5 font-black text-2xl text-white outline-none focus:border-indigo-500/50 transition-all shadow-inner" />
                                            <span className="absolute right-8 top-1/2 -translate-y-1/2 text-sm font-black text-indigo-400">BNB</span>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Zap className="w-3 h-3 text-emerald-400" /> Liquidity Protocol (Initial Buy)</label>
                                        <div className="relative">
                                            <input type="number" step="0.001" min={actualMinBuy} value={initialBuy} onChange={(e) => setInitialBuy(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-5 font-black text-2xl text-white outline-none focus:border-emerald-500/50 transition-all shadow-inner" />
                                            <span className="absolute right-8 top-1/2 -translate-y-1/2 text-sm font-black text-emerald-400">BNB</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-white/5 to-white/[0.01] border border-white/10 flex flex-col justify-between shadow-2xl relative group overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl group-hover:bg-rose-500/10 transition-all duration-700" />
                                    <div className="space-y-4 relative z-10">
                                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Charges Breakdown</h4>
                                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-400">Liquidity (Mandatory)</span><span className="text-sm font-black text-white">{parseFloat(initialBuy || 0).toFixed(3)} BNB</span></div>
                                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-400">Deployment Fee</span><span className="text-sm font-black text-white">0.005 BNB</span></div>
                                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-400">Protocol Fee</span><span className="text-sm font-black text-white">0.002 BNB</span></div>
                                    </div>
                                    <div className="mt-8 pt-6 border-t border-white/5 relative z-10">
                                        <div className="flex justify-between items-baseline"><span className="text-xs font-black text-white uppercase">Total Payment</span><span className="text-4xl font-black text-rose-500 tracking-tighter shadow-rose-500/20 drop-shadow-lg">{totalBNB} <span className="text-sm font-bold text-gray-500">BNB</span></span></div>
                                    </div>
                                </div>
                            </div>

                            <button type="button" onClick={handleSubmit} disabled={status === 'uploading'} className="w-full py-8 bg-white text-black font-black text-2xl rounded-[2.5rem] shadow-3xl hover:bg-gray-100 hover:scale-[1.01] transition-all active:scale-[0.98] disabled:opacity-20 flex items-center justify-center gap-4 group overflow-hidden">
                                {status === 'uploading' ? <Loader2 className="w-8 h-8 animate-spin" /> : <Rocket className="w-8 h-8 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                                {status === 'uploading' ? 'Deploying...' : 'Launch Protocol Now'}
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
        </main>
    );
}

export default function CreateTokenPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-12 h-12 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin" />
            </div>
        }>
            <CreateToken />
        </Suspense>
    );
}
