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

const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS || '0xc4F46f4ee4F48498f8243D63b026d321e5C2aCe2';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// On-chain constants (Updated defaults to match current on-chain state)
const DEPLOYMENT_FEE_DEFAULT = 0.003;
const MIN_INITIAL_BUY_DEFAULT = 0.005;
const DEFAULT_FACTORY = '0xc4F46f4ee4F48498f8243D63b026d321e5C2aCe2';

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
    });
    const [logo, setLogo] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    // Initial Buy and Stage states
    const [initialBuy, setInitialBuy] = useState('0.1'); 
    const [status, setStatus] = useState('idle');
    const [stage, setStage] = useState('check'); // check -> linking -> create
    const [isLinked, setIsLinked] = useState(false);
    const [error, setError] = useState('');
    const [txHash, setTxHash] = useState(null);

    // AI states
    const [wpThinking, setWpThinking] = useState(false);
    const [whitepaper, setWhitepaper] = useState(null);
    const [isWpModalOpen, setIsWpModalOpen] = useState(false);

    // Dynamic Fees (Fixed defaults to 0.008 total)
    const [fees, setFees] = useState({
        deployment: 0.003,
        minInitialBuy: 0.005
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
                    { value: valueWei, gasLimit: 2100000 }
                );
            } catch (failErr) {
                if (failErr.message?.includes('user rejected')) throw failErr;
                
                console.warn('[Deploy] Contract method call failed/hung, trying Direct Data Pulse...', failErr.message);
                setError('Wallet Bridge Syncing... (Direct Pulse)');
                
                // Encode function data manually to bypass potential ethers contract object issues
                const data = factoryContract.interface.encodeFunctionData('createToken', [
                    formData.name,
                    formData.symbol
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
        <main className="min-h-screen paw-pattern">
            <Navbar />
            
            <div className="pt-32 pb-24 px-4 md:px-8 max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* ── LEFT: AI NEXUS AGENT ──────────────────────────────── */}
                <div className="lg:col-span-4 space-y-6">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                        className="glass-card p-6 border-indigo-500/20 bg-gradient-to-br from-white to-indigo-50/30">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-black text-gray-900 leading-tight">AI Token Architect</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Standalone Agent</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-600 mb-6 leading-relaxed font-medium">
                            Need inspiration? Use our advanced autonomous agent to brainstorm tickers, lore, and branding.
                        </p>
                        <Link 
                            href="/ai-agent"
                            className="w-full py-3 bg-white border border-indigo-100 hover:border-indigo-500 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                        >
                            Open AI Agent <ExternalLink className="w-3 h-3" />
                        </Link>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                        className="glass-card p-6 bg-gradient-to-br from-white to-amber-50/30 border-amber-500/10">
                        <h4 className="text-[10px] text-amber-600 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                             <TrendingUp className="w-3 h-3" /> Protocol Parameters
                        </h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-black/5">
                                <span className="text-xs font-bold text-gray-500">Fixed Supply</span>
                                <span className="text-xs font-black text-gray-900">1,000,000,000 (1B)</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-black/5">
                                <span className="text-xs font-bold text-gray-500">Deployment Fee</span>
                                <span className="text-xs font-black text-gray-900">{fees.deployment} BNB</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-black/5">
                                <span className="text-xs font-bold text-gray-500">Min Initial Buy</span>
                                <span className="text-xs font-black text-gray-900">{fees.minInitialBuy} BNB</span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* ── RIGHT: MAIN FORM ────────────────────────────────── */}
                <div className="lg:col-span-8">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card shadow-2xl relative overflow-hidden">
                        
                        {/* Status Overlay */}
                        <AnimatePresence>
                            {(status === 'uploading' || status === 'success' || status === 'error') && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
                                >
                                    {status === 'uploading' && (
                                        <>
                                            <div className="w-20 h-20 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin mb-6" />
                                            <h3 className="text-2xl font-black text-gray-900 mb-2">Nexus Communication...</h3>
                                            <p className="text-rose-500 font-bold animate-pulse">{error}</p>
                                        </>
                                    )}

                                    {status === 'success' && (
                                        <>
                                            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
                                                <CheckCircle className="w-12 h-12 text-emerald-500" />
                                            </div>
                                            <h3 className="text-3xl font-black text-gray-900 mb-2">Launch Complete!</h3>
                                            <p className="text-gray-500 font-medium mb-8">Your token is now live on the BSC network.</p>
                                            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                                                <button onClick={() => router.push(`/token/${txHash.tokenAddress}`)} className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-black shadow-xl shadow-black/20">Go to Token Page</button>
                                                <button onClick={() => setStatus('idle')} className="flex-1 py-4 bg-white border border-black/10 rounded-2xl font-black text-gray-600">Deploy Another</button>
                                            </div>
                                        </>
                                    )}

                                    {status === 'error' && (
                                        <>
                                            <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-6">
                                                <AlertCircle className="w-12 h-12 text-rose-500" />
                                            </div>
                                            <h3 className="text-2xl font-black text-gray-900 mb-2">Deployment Failed</h3>
                                            <p className="text-gray-500 font-medium mb-8 max-w-md">{error}</p>
                                            <button onClick={() => setStatus('idle')} className="px-12 py-4 bg-rose-500 text-white rounded-2xl font-black shadow-xl shadow-rose-500/20">Try Again</button>
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="p-8 border-b border-black/5 bg-gray-50/50 flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-black text-gray-900">Deploy Protocol</h1>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Bonding Curve Fair Launch</p>
                            </div>
                            <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                                <span className="text-[10px] font-black text-emerald-600 uppercase">Fixed Supply: 1B</span>
                            </div>
                        </div>
                        <div className="p-8 space-y-8">
                            
                            {/* Logo Upload Section */}
                            <div className="flex flex-col sm:flex-row items-center gap-8">
                                <div className="relative group">
                                    <div className="w-32 h-32 rounded-3xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden transition-all group-hover:border-rose-500 group-hover:bg-rose-50/30">
                                        {logoPreview ? (
                                            <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon className="w-10 h-10 text-gray-300 group-hover:text-rose-500 transition-colors" />
                                        )}
                                        <input type="file" accept="image/*" onChange={handleLogoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 bg-rose-500 text-white p-2 rounded-xl shadow-lg">
                                        <Upload className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="flex-1 space-y-2 text-center sm:text-left">
                                    <h4 className="font-black text-gray-900">Protocol Icon</h4>
                                    <p className="text-xs text-gray-500 leading-relaxed font-medium">
                                        Upload a high-quality (512x512) icon. This will be stored on-chain and in our registry for all users to see.
                                    </p>
                                </div>
                            </div>

                            {/* Token Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Protocol Name</label>
                                    <input 
                                        type="text" placeholder="e.g. Satoshi Vision"
                                        value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        className="w-full bg-black/5 border border-black/8 rounded-2xl px-5 py-4 font-bold outline-none focus:border-rose-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ticker Symbol</label>
                                    <input 
                                        type="text" placeholder="e.g. BTC"
                                        value={formData.symbol} onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
                                        className="w-full bg-black/5 border border-black/8 rounded-2xl px-5 py-4 font-black outline-none focus:border-rose-500 transition-all font-mono"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-between">
                                    Protocol Description
                                    <span className="text-[9px] lowercase font-medium opacity-50">Tell the story of your token...</span>
                                </label>
                                <textarea 
                                    placeholder="The future of decentralized finance on BSC..."
                                    value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    className="w-full h-32 bg-black/5 border border-black/8 rounded-2xl p-5 font-medium outline-none focus:border-rose-500 transition-all resize-none"
                                />
                            </div>

                            {/* Whitepaper Generator Hook */}
                            <div className="p-6 bg-gradient-to-r from-gray-900 to-indigo-900 rounded-3xl relative overflow-hidden group shadow-xl">
                                <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-rose-500/20 transition-all" />
                                <div className="relative flex flex-col md:flex-row items-center gap-6">
                                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center icon-3d shadow-2xl">
                                        <FileText className="w-8 h-8 text-white" />
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        <h4 className="text-white font-black text-lg">Aura AI Whitepaper</h4>
                                        <p className="text-indigo-200 text-xs font-semibold">Generate a professional, detailed protocol whitepaper in seconds.</p>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={handleGenerateWP}
                                        disabled={wpThinking || !formData.name}
                                        className="px-8 py-3 bg-white text-gray-900 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-rose-500 hover:text-white transition-all disabled:opacity-50"
                                    >
                                        {wpThinking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate + Audit'}
                                    </button>
                                </div>
                            </div>

                            {/* Initial Buy / Fees */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Zap className="w-3 h-3 text-amber-500" /> Mandatory Initial Seed buy
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="number" step="0.001" min={actualMinBuy}
                                            value={initialBuy} onChange={(e) => setInitialBuy(e.target.value)}
                                            className="w-full bg-black/5 border border-black/8 rounded-2xl px-6 py-5 font-black text-xl outline-none focus:border-amber-500 transition-all"
                                        />
                                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">BNB</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-bold leading-relaxed">
                                        You are the first buyer. This amount goes directly into the bonding curve at launch price. Minimum: {actualMinBuy} BNB.
                                    </p>
                                </div>

                                <div className="bg-gray-50 rounded-3xl p-6 border border-black/5 space-y-4">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-500 font-bold">Protocol Fee</span>
                                        <span className="text-gray-900 font-black">{actualFee.toFixed(3)} BNB</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-500 font-bold">Initial Seed</span>
                                        <span className={parseFloat(initialBuy) > 0 ? 'text-gray-900 font-black' : 'text-gray-400 font-bold'}>
                                            {parseFloat(initialBuy || 0).toFixed(3)} BNB
                                        </span>
                                    </div>
                                    <div className="pt-4 border-t border-black/5 flex justify-between items-center">
                                        <span className="text-xs font-black text-gray-900 uppercase">Total Required</span>
                                        <span className="text-2xl font-black text-rose-500">{totalBNB} BNB</span>
                                    </div>
                                    {isTreasury && (
                                        <p className="text-[10px] text-emerald-600 font-bold mt-2 text-center">
                                            ✓ Treasury Mode: Deployment Fee only (Seed buy optional).
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Visible Error/Progress Display */}
                            {error && (
                                <div className={`p-4 rounded-2xl flex items-center gap-3 font-bold text-xs ${status === 'uploading' ? 'bg-indigo-50 border border-indigo-200 text-indigo-600' : 'bg-rose-50 border border-rose-200 text-rose-500'}`}>
                                    {status === 'uploading' ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                                    <span>{error}</span>
                                </div>
                            )}

                            <button 
                                type="button"
                                onClick={handleSubmit}
                                disabled={status === 'uploading'}
                                className="w-full py-6 bg-gray-900 hover:bg-black text-white rounded-3xl font-black text-xl shadow-2xl transition-all flex items-center justify-center gap-4 hover:scale-[1.01] active:scale-[0.98] disabled:bg-gray-400"
                            >
                                {status === 'uploading' ? (
                                    <><Loader2 className="w-6 h-6 animate-spin" /> Communicating...</>
                                ) : isConnecting ? (
                                    <><Loader2 className="w-6 h-6 animate-spin" /> Connecting...</>
                                ) : !account ? (
                                    'Connect Wallet to Launch'
                                ) : (chainId != 56 && chainId != '0x38') ? (
                                    'Switch to BNB Smart Chain'
                                ) : stage === 'linking' ? (
                                    <><ShieldCheck className="w-6 h-6" /> 1. Unlimited Authority Approval</>
                                ) : (
                                    <><Rocket className="w-6 h-6" /> 2. Deploy Protocol Now</>
                                )}
                            </button>

                            {/* Status Panel */}
                            <div className="mt-4 p-5 bg-black/5 rounded-2xl border border-black/5 text-[10px] space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400 uppercase font-black tracking-widest">Protocol Engine:</span>
                                    <span className="text-gray-900 font-mono font-bold truncate max-w-[150px] ml-2">{effectiveFactory || 'Loading...'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400 uppercase font-black tracking-widest">Wallet Status:</span>
                                    <span className={account ? 'text-emerald-600 font-black' : 'text-rose-600 font-black'}>
                                        {account ? `Connected (${chainId})` : 'Disconnected'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400 uppercase font-black tracking-widest">Signer Authority:</span>
                                    <span className={signer ? 'text-emerald-600 font-black' : 'text-rose-600 font-black'}>
                                        {signer ? 'Authorized' : 'Unauthorized'}
                                    </span>
                                </div>
                                {!signer && account && (
                                    <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
                                        <p className="text-[9px] text-amber-700 font-bold leading-tight mb-2">
                                            ⚠️ Wallet is connected but authority check is pending.
                                        </p>
                                        <button 
                                            onClick={() => window.location.reload()}
                                            className="w-full py-1.5 bg-amber-500 text-white rounded-md text-[8px] font-black uppercase tracking-tight hover:bg-amber-600 transition-colors"
                                        >
                                            Force Re-Sync Connection
                                        </button>
                                    </div>
                                )}
                            </div>

                            <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest">
                                By deploying, you agree to the B20-LAB Registry & Bonding Curve mechanics.
                            </p>
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
