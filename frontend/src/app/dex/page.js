'use client';

import Navbar from '@/components/Navbar';
import { motion } from 'framer-motion';
import { ExternalLink, Zap, TrendingUp, Shield, Droplets } from 'lucide-react';
import { useState } from 'react';

// ─── DEX Data ────────────────────────────────────────────────────────────────
const NETWORKS = [
    {
        id: 'bnb',
        name: 'BNB Chain',
        symbol: 'BNB',
        logo: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
        tagline: 'Binance Smart Chain',
        gradient: 'from-yellow-400 to-amber-500',
        lightGradient: 'from-yellow-500/10 to-amber-500/5',
        border: 'border-yellow-400/30',
        glow: 'shadow-yellow-500/20',
        dexes: [
            {
                name: 'PancakeSwap',
                logo: 'https://assets.coingecko.com/coins/images/12632/small/pancakeswap-cake-logo_%281%29.png',
                url: 'https://pancakeswap.finance/swap',
                tvl: '$1.8B',
                volume24h: '$420M',
                tag: 'Leading DEX',
                tagColor: 'bg-amber-500/10 text-amber-600',
                desc: 'The #1 decentralized exchange on BNB Chain. Swap, earn, and win with the most popular AMM on BSC.',
                features: ['AMM Pools', 'Yield Farms', 'IFO Launchpad', 'Lottery'],
                badge: '🥞',
            },
            {
                name: 'Uniswap V3',
                logo: 'https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png',
                url: 'https://app.uniswap.org/#/swap',
                tvl: '$3.5B',
                volume24h: '$800M',
                tag: 'Concentrated Liquidity',
                tagColor: 'bg-pink-500/10 text-pink-600',
                desc: 'Uniswap V3 on BNB Chain with concentrated liquidity positions for maximum capital efficiency.',
                features: ['Concentrated LP', 'Limit Orders', 'Analytics', 'NFT Positions'],
                badge: '🦄',
            },
        ],
    },
    {
        id: 'tron',
        name: 'Tron Network',
        symbol: 'TRX',
        logo: 'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png',
        tagline: 'TRON Ecosystem',
        gradient: 'from-red-500 to-rose-600',
        lightGradient: 'from-red-500/10 to-rose-600/5',
        border: 'border-red-400/30',
        glow: 'shadow-red-500/20',
        dexes: [
            {
                name: 'SunSwap',
                logo: 'https://assets.coingecko.com/coins/images/12424/small/RSbA7tBY_400x400.jpg',
                url: 'https://sun.io/',
                tvl: '$620M',
                volume24h: '$95M',
                tag: "TRON's #1 DEX",
                tagColor: 'bg-red-500/10 text-red-600',
                desc: 'SunSwap is the flagship decentralized exchange on the TRON network, supporting USDT, TRX, and TRC-20 token swaps.',
                features: ['Stablecoin Pools', 'TRX Staking', 'JST Governance', 'Low Fees'],
                badge: '☀️',
            },
        ],
    },
    {
        id: 'solana',
        name: 'Solana',
        symbol: 'SOL',
        logo: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
        tagline: 'Solana Ecosystem',
        gradient: 'from-purple-500 to-violet-600',
        lightGradient: 'from-purple-500/10 to-violet-600/5',
        border: 'border-purple-400/30',
        glow: 'shadow-purple-500/20',
        dexes: [
            {
                name: 'Raydium',
                logo: 'https://assets.coingecko.com/coins/images/13928/small/PSigc4ie_400x400.jpg',
                url: 'https://raydium.io/swap/',
                tvl: '$1.2B',
                volume24h: '$280M',
                tag: 'Top Liquidity',
                tagColor: 'bg-purple-500/10 text-purple-600',
                desc: 'Raydium is Solana\'s most liquid AMM and DeFi hub, providing lightning-fast swaps and concentrated liquidity pools.',
                features: ['CLMM Pools', 'AcceleRaytor', 'Staking', 'Ecosystem Bridge'],
                badge: '⚡',
            },
            {
                name: 'Meteora',
                logo: 'https://pbs.twimg.com/profile_images/1669907801152528384/RrVCjGk3_400x400.jpg',
                url: 'https://app.meteora.ag/',
                tvl: '$380M',
                volume24h: '$65M',
                tag: 'Dynamic Pools',
                tagColor: 'bg-violet-500/10 text-violet-600',
                desc: 'Meteora offers dynamic liquidity vaults and DLMM (Dynamic Liquidity Market Maker) pools for ultra-efficient trading.',
                features: ['DLMM Pools', 'Dynamic Vaults', 'Multi-token Pools', 'Yield Optimizer'],
                badge: '🌠',
            },
            {
                name: 'Orca',
                logo: 'https://assets.coingecko.com/coins/images/17547/small/Orca_Logo.png',
                url: 'https://www.orca.so/',
                tvl: '$290M',
                volume24h: '$48M',
                tag: 'User Friendly',
                tagColor: 'bg-teal-500/10 text-teal-600',
                desc: 'Orca is the most user-friendly DEX on Solana, offering Whirlpools (CLMM) for professional and retail traders alike.',
                features: ['Whirlpools', 'Simple Swap', 'Aquafarm', 'Token Launchpad'],
                badge: '🐋',
            },
        ],
    },
];

function DexCard({ dex, network }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
            className={`relative group rounded-2xl border ${network.border} bg-gradient-to-br ${network.lightGradient} overflow-hidden hover:shadow-2xl ${network.glow} transition-all duration-300`}
        >
            {/* Card inner */}
            <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white shadow-lg border border-black/5 flex items-center justify-center">
                                <img
                                    src={dex.logo}
                                    alt={dex.name}
                                    className="w-12 h-12 object-contain"
                                    onError={e => {
                                        e.target.style.display = 'none';
                                        e.target.parentElement.innerHTML = `<span class="text-2xl">${dex.badge}</span>`;
                                    }}
                                />
                            </div>
                            {/* Network badge */}
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full overflow-hidden bg-white shadow border border-white">
                                <img src={network.logo} alt={network.symbol} className="w-full h-full object-contain" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-gray-900">{dex.name}</h3>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${dex.tagColor}`}>{dex.tag}</span>
                        </div>
                    </div>
                    <span className="text-2xl">{dex.badge}</span>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 leading-relaxed mb-5">{dex.desc}</p>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 text-center border border-white/50">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <Droplets className="w-3 h-3 text-blue-500" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">TVL</span>
                        </div>
                        <div className="text-base font-black text-gray-900">{dex.tvl}</div>
                    </div>
                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 text-center border border-white/50">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <TrendingUp className="w-3 h-3 text-green-500" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">24h Vol</span>
                        </div>
                        <div className="text-base font-black text-gray-900">{dex.volume24h}</div>
                    </div>
                </div>

                {/* Feature pills */}
                <div className="flex flex-wrap gap-1.5 mb-5">
                    {dex.features.map((f, i) => (
                        <span key={i} className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/70 border border-black/5 text-gray-600">
                            {f}
                        </span>
                    ))}
                </div>

                {/* CTA */}
                <a
                    href={dex.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r ${network.gradient} text-white shadow-lg hover:opacity-90 transition-all group-hover:shadow-xl`}
                >
                    <Zap className="w-4 h-4" />
                    Trade on {dex.name}
                    <ExternalLink className="w-3.5 h-3.5" />
                </a>
            </div>

            {/* Top gradient accent line */}
            <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${network.gradient}`} />
        </motion.div>
    );
}

export default function DexPage() {
    const [activeNetwork, setActiveNetwork] = useState('all');

    const displayedNetworks = activeNetwork === 'all'
        ? NETWORKS
        : NETWORKS.filter(n => n.id === activeNetwork);

    return (
        <main className="min-h-screen paw-pattern">
            <Navbar />

            {/* Hero */}
            <section className="pt-32 pb-12 px-4 md:px-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-400/10 blur-[100px] rounded-full" />
                </div>
                <div className="relative z-10 max-w-3xl mx-auto">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 text-sm font-bold mb-6">
                            🌐 Multi-Chain DEX Hub
                        </span>
                        <h1 className="text-5xl md:text-6xl font-black mb-4 tracking-tight">
                            Trade on the <span className="text-red-gradient">Best DEXes</span>
                        </h1>
                        <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
                            Access the most trusted decentralized exchanges across BNB Chain, Tron, and Solana — all from one place. Click any DEX to launch their trading interface directly.
                        </p>
                    </motion.div>

                    {/* Stats banner */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-wrap justify-center gap-6 mt-10"
                    >
                        {[
                            { label: 'DEX Platforms', value: '6' },
                            { label: 'Blockchains', value: '3' },
                            { label: 'Combined TVL', value: '$7.8B+' },
                            { label: '24h Volume', value: '$1.7B+' },
                        ].map((s, i) => (
                            <div key={i} className="text-center">
                                <div className="text-2xl font-black text-gray-900">{s.value}</div>
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">{s.label}</div>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Network Filter Tabs */}
            <section className="px-4 md:px-8 max-w-7xl mx-auto mb-10">
                <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                        onClick={() => setActiveNetwork('all')}
                        className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all border ${activeNetwork === 'all'
                                ? 'bg-gray-900 text-white border-gray-900 shadow-xl shadow-gray-900/20'
                                : 'bg-white text-gray-600 border-black/10 hover:border-gray-400'
                            }`}
                    >
                        🌐 All Networks
                    </button>
                    {NETWORKS.map(net => (
                        <button
                            key={net.id}
                            onClick={() => setActiveNetwork(net.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all border ${activeNetwork === net.id
                                    ? `bg-gradient-to-r ${net.gradient} text-white border-transparent shadow-xl ${net.glow}`
                                    : 'bg-white text-gray-600 border-black/10 hover:border-gray-400'
                                }`}
                        >
                            <img src={net.logo} alt={net.name} className="w-5 h-5 rounded-full" />
                            {net.name}
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeNetwork === net.id ? 'bg-white/20' : 'bg-black/5'}`}>
                                {net.dexes.length}
                            </span>
                        </button>
                    ))}
                </div>
            </section>

            {/* DEX Sections */}
            <section className="px-4 md:px-8 pb-24 max-w-7xl mx-auto space-y-16">
                {displayedNetworks.map(network => (
                    <motion.div
                        key={network.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        {/* Section header */}
                        <div className="flex items-center gap-4 mb-8">
                            <div className={`w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-br ${network.gradient} p-0.5 shadow-lg ${network.glow}`}>
                                <div className="w-full h-full bg-white rounded-xl flex items-center justify-center">
                                    <img src={network.logo} alt={network.name} className="w-8 h-8 object-contain" />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-900">{network.name}</h2>
                                <p className="text-sm text-gray-400 font-semibold">{network.tagline} · {network.dexes.length} DEX{network.dexes.length > 1 ? 'es' : ''} available</p>
                            </div>
                            <div className={`ml-auto h-px flex-1 bg-gradient-to-r ${network.gradient} opacity-20`} />
                        </div>

                        {/* DEX cards */}
                        <div className={`grid gap-6 ${network.dexes.length === 1 ? 'grid-cols-1 md:grid-cols-2 max-w-xl' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                            {network.dexes.map((dex, i) => (
                                <DexCard key={i} dex={dex} network={network} />
                            ))}
                        </div>
                    </motion.div>
                ))}
            </section>

            {/* Safety note */}
            <section className="px-4 md:px-8 pb-16 max-w-7xl mx-auto">
                <div className="glass-card bg-amber-500/5 border-amber-500/20 flex flex-col md:flex-row items-center gap-4 p-6">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Shield className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 mb-1">Safety Notice</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            B20-LAB links to official, community-verified DEX platforms only. Always verify you are on the correct URL before connecting your wallet or approving any transactions. We never ask for your seed phrase.
                        </p>
                    </div>
                </div>
            </section>
        </main>
    );
}
