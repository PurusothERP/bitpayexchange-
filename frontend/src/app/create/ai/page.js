'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, Rocket, CheckCircle2, AlertCircle, Info, RefreshCw, Zap, TrendingUp, ShieldCheck, Target, Palette, ArrowRightLeft } from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { runAgent, getIntelligenceScore, detectMimic } from '@/utils/antigravity-ml-sdk';
import { ethers, Contract } from 'ethers';

const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS;
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function AICreatePage() {
    const { account, signer, connectWallet } = useWallet();
    const router = useRouter();

    const [prompt, setPrompt] = useState('');
    const [status, setStatus] = useState('idle'); // idle | planning | reviewing | deploying | success
    const [aiPlan, setAIPlan] = useState(null);
    const [score, setScore] = useState(null);
    const [error, setError] = useState('');
    const [txHash, setTxHash] = useState(null);

    const handleRunAI = async (e) => {
        e.preventDefault();
        if (!prompt) return;

        try {
            setStatus('planning');
            setError('');
            const res = await runAgent(prompt);
            if (res.success) {
                setAIPlan(res.data);
                // Get intelligence score for the AI-suggested name
                const scoreData = await getIntelligenceScore(res.data.tokenName, res.data.tokenSymbol);
                setScore(scoreData);
                setStatus('reviewing');
            } else {
                setError(res.error || 'AI Agent failed to generate a plan. Please try a different prompt.');
                setStatus('idle');
            }
        } catch (err) {
            console.error('AI error:', err);
            setError('Failed to reach AI Engine. Is the ML server running?');
            setStatus('idle');
        }
    };

    const handleDeploy = async () => {
        if (!account || !signer) { connectWallet(); return; }
        if (!aiPlan) return;

        try {
            setStatus('deploying');
            const factoryContract = new Contract(FACTORY_ADDRESS, [
                "function createToken(string name, string symbol) payable returns (address)",
                "event TokenCreated(address indexed tokenAddress, string name, string symbol, uint256 supply, address indexed creator, uint256 fee)"
            ], signer);

            const tx = await factoryContract.createToken(
                aiPlan.tokenName,
                aiPlan.tokenSymbol,
                { value: ethers.parseEther('0.001') } // Standard deployment fee
            );

            const receipt = await tx.wait();
            
            let tokenAddress = '';
            const TOKEN_CREATED_TOPIC = ethers.id("TokenCreated(address,string,string,uint256,address,uint256)");
            for (const log of receipt.logs) {
                if (log.topics && log.topics[0] === TOKEN_CREATED_TOPIC) {
                    tokenAddress = ethers.getAddress('0x' + log.topics[1].slice(26));
                    break;
                }
            }

            // Sync with backend
            const formData = new FormData();
            formData.append('name', aiPlan.tokenName);
            formData.append('symbol', aiPlan.tokenSymbol);
            formData.append('supply', aiPlan.initialSupply.toString());
            formData.append('description', aiPlan.description);
            formData.append('owner', account);
            formData.append('tokenAddress', tokenAddress);
            formData.append('txHash', receipt.hash);
            // AI could potentially suggest a logo, here we use generic
            
            await axios.post(`${API_URL}/tokens/sync`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setTxHash({ txHash: receipt.hash, tokenAddress });
            setStatus('success');
        } catch (err) {
            console.error('Deployment error:', err);
            setError(err.message || 'Failed to deploy AI-generated token.');
            setStatus('reviewing');
        }
    };

    return (
        <main className="min-h-screen paw-pattern">
            <Navbar />

            <section className="pt-32 pb-20 px-4 md:px-8 max-w-5xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-violet-500/5 border border-violet-500/10 text-violet-600 text-[10px] font-black uppercase tracking-[0.3em] mb-8 shadow-sm">
                        <Sparkles className="w-3 h-3" /> antigraVITY AI Engine
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black mb-6 text-gray-900 tracking-tight">
                        AI Neural <span className="text-violet-600">Engine - Token Generator</span>
                    </h1>
                    <p className="text-gray-500 max-w-2xl mx-auto font-medium text-lg leading-relaxed">
                        Describe your vision in plain English. Our neural engine will generate everything from names and branding to launch strategies.
                    </p>
                </motion.div>

                <AnimatePresence mode="wait">
                    {status === 'idle' || status === 'planning' ? (
                        <motion.div
                            key="input"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="max-w-3xl mx-auto"
                        >
                            <div className="glass-card shadow-2xl border-violet-500/10 p-2 overflow-hidden bg-white/80 backdrop-blur-3xl rounded-[2.5rem]">
                                <form onSubmit={handleRunAI} className="relative">
                                    <textarea
                                        rows="4"
                                        placeholder="e.g. Create a viral meme token for dog lovers on BSC. It should have 1 billion supply and a playful, high-energy brand identity."
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        className="w-full bg-transparent p-8 text-xl font-medium focus:outline-none placeholder:text-gray-300 transition-all text-gray-800 resize-none leading-relaxed"
                                    />
                                    <div className="p-4 flex items-center justify-between border-t border-black/5">
                                        <div className="flex gap-2">
                                            {['Meme Token', 'DeFi Gem', 'AI Protocol'].map(tag => (
                                                <button key={tag} type="button" onClick={() => setPrompt(`Create a ${tag.toLowerCase()}...`)} className="px-3 py-1 rounded-full bg-black/5 text-[10px] uppercase font-black text-gray-400 hover:bg-violet-500/10 hover:text-violet-600 transition-all">{tag}</button>
                                            ))}
                                        </div>
                                        <button
                                            disabled={status === 'planning' || !prompt}
                                            className="px-8 py-5 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 text-white rounded-2xl font-black flex items-center gap-3 shadow-xl shadow-violet-500/20 transition-all group overflow-hidden"
                                        >
                                            {status === 'planning' ? (
                                                <><RefreshCw className="w-5 h-5 animate-spin" /> <span>Thinking...</span></>
                                            ) : (
                                                <><Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" /> <span>Generate Plan</span></>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                            {error && <p className="mt-4 text-center text-red-500 font-bold text-sm bg-red-50 py-2 rounded-xl border border-red-100">{error}</p>}
                        </motion.div>
                    ) : status === 'reviewing' || status === 'deploying' ? (
                        <motion.div
                            key="review"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-10"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Brand Identity Card */}
                                <div className="lg:col-span-2 space-y-8">
                                    <div className="glass-card shadow-2xl border-violet-500/10 overflow-hidden !p-0">
                                        <div className={`h-32 bg-gradient-to-r ${aiPlan.palette ? `from-[${aiPlan.palette[0]}] to-[${aiPlan.palette[1]}]` : 'from-violet-600 to-indigo-600'} flex items-end p-8`}>
                                            <div className="w-24 h-24 rounded-3xl bg-white shadow-2xl flex items-center justify-center text-5xl mb-[-4rem] border-4 border-white">
                                                {aiPlan.logoEmoji || '💎'}
                                            </div>
                                        </div>
                                        <div className="p-8 pt-20">
                                            <div className="flex justify-between items-start mb-6">
                                                <div>
                                                    <h2 className="text-4xl font-black text-gray-900 mb-1">{aiPlan.tokenName}</h2>
                                                    <p className="text-violet-600 font-mono font-black tracking-widest text-lg">${aiPlan.tokenSymbol}</p>
                                                </div>
                                                <div className="px-4 py-2 rounded-2xl bg-violet-500/10 text-violet-600 font-black text-[10px] uppercase tracking-widest border border-violet-500/10">
                                                    {aiPlan.category}
                                                </div>
                                            </div>
                                            <p className="text-gray-600 text-lg leading-relaxed mb-8 font-medium">"{aiPlan.description}"</p>
                                            
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                                <div className="p-4 bg-black/5 rounded-2xl">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Supply</p>
                                                    <p className="font-mono font-black text-gray-900">{aiPlan.initialSupply?.toLocaleString()}</p>
                                                </div>
                                                <div className="p-4 bg-black/5 rounded-2xl">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Chain</p>
                                                    <p className="font-bold text-gray-900 capitalize">{aiPlan.suggestedChain}</p>
                                                </div>
                                                <div className="p-4 bg-black/5 rounded-2xl">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Decimals</p>
                                                    <p className="font-mono font-black text-gray-900">{aiPlan.decimals}</p>
                                                </div>
                                                <div className="p-4 bg-black/5 rounded-2xl">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Gas Est.</p>
                                                    <p className="font-mono font-black text-emerald-600">~{aiPlan.estimatedGasCost}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Launch Strategy */}
                                    <div className="glass-card bg-violet-600 text-white p-8">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center font-black text-white/50">01</div>
                                            <h3 className="text-xl font-black uppercase tracking-widest">AI Launch Strategy</h3>
                                        </div>
                                        <p className="text-violet-100 leading-relaxed font-medium mb-8">"{aiPlan.launchStrategy}"</p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {aiPlan.features?.map(feat => (
                                                <div key={feat} className="px-4 py-2 bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                    <Zap className="w-3 h-3 text-amber-400" /> {feat}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Sidebar Score & Risks */}
                                <div className="space-y-8">
                                    <div className="glass-card p-8 text-center bg-white shadow-2xl">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Intelligence Score</h4>
                                        <div className="relative inline-flex items-center justify-center mb-6">
                                            <svg className="w-40 h-40">
                                                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-100" />
                                                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={440} strokeDashoffset={440 - (440 * score?.overall) / 100} strokeLinecap="round" className="text-violet-600 transition-all duration-1000 ease-out" />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-5xl font-black text-gray-900">{score?.overall}</span>
                                                <span className="text-[10px] font-black text-gray-400 uppercase">Points</span>
                                            </div>
                                        </div>
                                        <p className="text-gray-900 font-black text-sm uppercase mb-2">Verdict</p>
                                        <p className="text-xs text-gray-500 font-medium leading-relaxed">{score?.verdict}</p>
                                        
                                        <div className="mt-8 space-y-4 text-left">
                                            {[{l: 'Memorability', v: score?.memorability}, {l: 'Uniqueness', v: score?.uniqueness}, {l: 'Market Appeal', v: score?.marketAppeal}].map(bar => (
                                                <div key={bar.l}>
                                                    <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                                                        <span className="text-gray-400">{bar.l}</span>
                                                        <span className="text-gray-900">{bar.v}%</span>
                                                    </div>
                                                    <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
                                                        <motion.div initial={{ width: 0 }} animate={{ width: `${bar.v}%` }} className="h-full bg-violet-500 rounded-full" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Risk & Duplicate Warnings */}
                                    <div className="space-y-4">
                                        {score?.duplicateReport && (
                                            <div className="p-8 bg-amber-500/5 border border-amber-500/10 rounded-[2.5rem] flex flex-col gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                                        <Search className="w-5 h-5 text-amber-500" />
                                                    </div>
                                                    <p className="text-sm font-black text-gray-900 uppercase tracking-widest">Neural Scanner Report</p>
                                                </div>
                                                <p className="text-sm font-bold text-amber-600 leading-relaxed">{score.duplicateReport}</p>
                                                {score.similarTokens?.length > 0 && (
                                                    <div className="p-4 bg-white/50 rounded-2xl border border-black/5">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Closest Collisions Found:</p>
                                                        <div className="space-y-2">
                                                            {score.similarTokens.map((t, i) => (
                                                                <div key={i} className="flex justify-between items-center text-xs font-bold text-gray-700">
                                                                    <span>{t.name} (${t.symbol.toUpperCase()})</span>
                                                                    <span className="text-rose-500">{t.nameSimilarity}% Match</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {aiPlan.mimicAlert && (
                                            <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-[2rem] flex items-start gap-4">
                                                <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-1" />
                                                <p className="text-xs font-bold text-red-600 leading-relaxed">{aiPlan.mimicAlert}</p>
                                            </div>
                                        )}
                                        {aiPlan.riskWarnings?.map((w, i) => (
                                            <div key={i} className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-[2rem] flex items-start gap-4">
                                                <Info className="w-6 h-6 text-amber-500 shrink-0 mt-1" />
                                                <p className="text-xs font-bold text-amber-600 leading-relaxed">{w}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-6">
                                        <div className="p-8 bg-violet-600 rounded-[2.5rem] shadow-2xl shadow-violet-500/20 text-white relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                                <Rocket className="w-24 h-24" />
                                            </div>
                                            <h4 className="text-xl font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                                                <Target className="w-5 h-5 text-amber-400" /> Export to Launch
                                            </h4>
                                            
                                            <div className="grid grid-cols-1 gap-4 relative z-10">
                                                <button
                                                    onClick={() => {
                                                        const params = new URLSearchParams({
                                                            name: aiPlan.tokenName,
                                                            symbol: aiPlan.tokenSymbol,
                                                            desc: aiPlan.description
                                                        }).toString();
                                                        router.push(`/create?${params}`);
                                                    }}
                                                    className="w-full py-5 bg-white text-violet-700 hover:bg-violet-50 rounded-2xl font-black flex items-center justify-between px-6 transition-all group/btn"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                                                            <TrendingUp className="w-5 h-5" />
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-sm">Bonding Curve</p>
                                                            <p className="text-[10px] font-medium opacity-60">Meme / Community Launch</p>
                                                        </div>
                                                    </div>
                                                    <ArrowRightLeft className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        const params = new URLSearchParams({
                                                            name: aiPlan.tokenName,
                                                            symbol: aiPlan.tokenSymbol,
                                                            desc: aiPlan.description
                                                        }).toString();
                                                        router.push(`/fair-launch?${params}`);
                                                    }}
                                                    className="w-full py-5 bg-white text-emerald-700 hover:bg-emerald-50 rounded-2xl font-black flex items-center justify-between px-6 transition-all group/btn"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                                                            <Zap className="w-5 h-5" />
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-sm">Fair Launch</p>
                                                            <p className="text-[10px] font-medium opacity-60">Instant DEX Liquidity</p>
                                                        </div>
                                                    </div>
                                                    <ArrowRightLeft className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        const params = new URLSearchParams({
                                                            name: aiPlan.tokenName,
                                                            symbol: aiPlan.tokenSymbol,
                                                            desc: aiPlan.description
                                                        }).toString();
                                                        router.push(`/standard?${params}`);
                                                    }}
                                                    className="w-full py-5 bg-white text-blue-700 hover:bg-blue-50 rounded-2xl font-black flex items-center justify-between px-6 transition-all group/btn"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                                            <ShieldCheck className="w-5 h-5" />
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-sm">Standard Token</p>
                                                            <p className="text-[10px] font-medium opacity-60">Utility / Governance</p>
                                                        </div>
                                                    </div>
                                                    <ArrowRightLeft className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                                </button>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setStatus('idle')}
                                            className="w-full py-5 bg-white border-2 border-black/5 text-gray-500 hover:text-gray-900 rounded-3xl font-black transition-all flex items-center justify-center gap-2"
                                        >
                                            <RefreshCw className="w-4 h-4" /> Start Over
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="max-w-xl mx-auto py-20 text-center"
                        >
                            <div className="w-32 h-32 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-10 shadow-inner">
                                <CheckCircle2 className="text-emerald-500 w-16 h-16" />
                            </div>
                            <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">AI Token Launched!</h2>
                            <p className="text-gray-500 font-medium mb-10">Your AI-generated vision is now live on the blockchain.</p>
                            
                            <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-2xl mb-10">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Transaction Hash</p>
                                <p className="font-mono text-xs text-violet-600 font-black break-all">{txHash?.txHash}</p>
                            </div>

                            <button
                                onClick={() => router.push(`/token/${txHash?.tokenAddress}`)}
                                className="px-12 py-6 bg-violet-600 text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-violet-500/20 hover:bg-violet-700 transition-all hover:scale-105"
                            >
                                View Live Dashboard
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </section>
        </main>
    );
}
