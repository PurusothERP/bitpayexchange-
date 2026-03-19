'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useWallet } from '@/context/WalletContext';
import { motion } from 'framer-motion';
import { Box, CheckCircle2, Cpu, Network } from 'lucide-react';

// CoinGecko image URLs for network logos
const NETWORKS = [
    {
        id: 'SOLANA',
        name: 'Solana (SPL)',
        logo: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
        color: 'from-purple-500/15 to-violet-600/5',
        border: 'border-purple-400/30',
        active: true,
    },
    {
        id: 'TRON',
        name: 'Tron (TRC-20)',
        logo: 'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png',
        color: 'from-red-500/15 to-rose-600/5',
        border: 'border-red-400/30',
        active: true,
    },
];

const FEATURES = [
    { label: 'Standard Token', desc: 'Industry standard implementation', always: true },
    { label: 'Mintable', desc: 'Allow owner to mint more tokens' },
    { label: 'Burnable', desc: 'Allow users to burn tokens' },
    { label: 'Pausable', desc: 'Pause transfers in emergency' },
];

export default function StandardToken() {
    const { account, signer, connectWallet } = useWallet();
    const TREASURY = (process.env.NEXT_PUBLIC_FEE_WALLET || '0x6451ee4def4a8b8fbc2c64301a79e267de378935').toLowerCase();
    const isTreasury = account && account.toLowerCase() === TREASURY;

    const [network, setNetwork] = useState('SOLANA');
    const [features, setFeatures] = useState({ Mintable: false, Burnable: false, Pausable: false });

    const activeNet = NETWORKS.find(n => n.id === network);

    return (
        <main className="min-h-screen paw-pattern">
            <Navbar />

            <section className="pt-32 pb-20 px-4 md:px-8 max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 text-sm font-bold uppercase tracking-widest mb-6">
                        <Box className="w-4 h-4" /> Professional Deployment
                    </span>
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
                        Standard <span className="text-blue-600">Token</span> Factory
                    </h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Deploy standard, non-meme utility tokens across major blockchain networks.
                        No bonding curves, no automated liquidity — just pure, verified smart contracts.
                    </p>
                </motion.div>

                {/* Network Selector — 2 networks, no BNB */}
                <div className="glass-card mb-8 p-1">
                    <div className="grid grid-cols-2 gap-2">
                        {NETWORKS.map((net) => (
                            <button
                                key={net.id}
                                onClick={() => setNetwork(net.id)}
                                className={`py-5 rounded-xl font-bold flex flex-col items-center justify-center gap-2 transition-all ${network === net.id
                                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                        : 'bg-transparent text-gray-500 hover:bg-black/5 hover:text-gray-900'
                                    }`}
                            >
                                <img
                                    src={net.logo}
                                    alt={net.name}
                                    className="w-8 h-8 rounded-full object-cover"
                                    onError={e => { e.target.src = ''; e.target.style.display = 'none'; }}
                                />
                                <span className="text-sm">{net.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <motion.div
                    key={network}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`glass-card bg-gradient-to-br ${activeNet?.color ?? ''} border ${activeNet?.border ?? ''}`}
                >
                    <div className="p-6 md:p-8 space-y-6">
                        <div className="flex items-center justify-between pb-6 border-b border-black/5">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    Configure {activeNet?.name} Token
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">Standard contract generation for utility projects</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <img
                                    src={activeNet?.logo}
                                    alt={activeNet?.name}
                                    className="w-10 h-10 rounded-full shadow-md"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Token Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Utility Token"
                                    className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500/50 transition-all text-gray-900"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Token Symbol</label>
                                <input
                                    type="text"
                                    placeholder="e.g. UTK"
                                    className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500/50 transition-all text-gray-900 font-mono"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-bold text-gray-700">Total Supply</label>
                                <input
                                    type="number"
                                    placeholder="1,000,000"
                                    className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500/50 transition-all text-gray-900 font-mono"
                                />
                            </div>

                            {/* Decimals */}
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-bold text-gray-700">Decimals</label>
                                <input
                                    type="number"
                                    defaultValue={network === 'SOLANA' ? 9 : 6}
                                    className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500/50 transition-all text-gray-900 font-mono"
                                />
                                <p className="text-xs text-gray-400">
                                    {network === 'SOLANA' ? 'Solana SPL tokens typically use 9 decimals.' : 'TRC-20 tokens typically use 6 decimals.'}
                                </p>
                            </div>

                            {/* Features */}
                            <div className="md:col-span-2 space-y-4 pt-4 border-t border-black/5">
                                <h3 className="text-sm font-bold text-gray-900">Token Features</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {FEATURES.map(feat => (
                                        <label
                                            key={feat.label}
                                            className={`flex items-center gap-3 p-4 border rounded-xl transition-all ${feat.always
                                                    ? 'border-black/10 rounded-xl cursor-not-allowed opacity-60'
                                                    : 'border-blue-500/30 bg-blue-500/5 cursor-pointer hover:border-blue-500/60 hover:bg-blue-500/10'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                disabled={!!feat.always}
                                                checked={feat.always ? true : features[feat.label]}
                                                onChange={() => !feat.always && setFeatures(prev => ({ ...prev, [feat.label]: !prev[feat.label] }))}
                                                className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                                            />
                                            <div>
                                                <div className="font-bold text-gray-900 text-sm">{feat.label}</div>
                                                <div className="text-xs text-gray-500">{feat.desc}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button className="w-full mt-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20 transition-all">
                            <img src={activeNet?.logo} alt="" className="w-5 h-5 rounded-full" />
                            <Network className="w-5 h-5" />
                            Deploy to {activeNet?.name} {isTreasury && <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">FREE ACCESS</span>}
                        </button>

                        <p className="text-center text-xs text-gray-400 -mt-2">
                            * Deployment requires a connected wallet and sufficient {network === 'SOLANA' ? 'SOL' : 'TRX'} for gas fees.
                        </p>
                    </div>
                </motion.div>
            </section>
        </main>
    );
}
