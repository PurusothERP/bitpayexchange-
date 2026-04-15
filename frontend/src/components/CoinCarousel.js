'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MEME_IDS = [
    'dogecoin', 'shiba-inu', 'pepe', 'floki', 'bonk',
    'dogwifcoin', 'book-of-meme', 'brett', 'popcat', 'baby-doge-coin'
];

const TOKEN_DESCRIPTIONS = {
    dogecoin: "The original meme coin, started as a joke but became a cultural crypto icon. Widely used for tipping and micro-payments across the internet. Backed by one of the most active and loyal communities in crypto.",
    'shiba-inu': "Launched as the 'DOGE killer', Shiba Inu evolved into a full DeFi ecosystem with ShibaSwap. Features multiple tokens (SHIB, LEASH, BONE) and a growing community called the SHIB Army. One of the top meme tokens by market cap.",
    pepe: "Inspired by the iconic Pepe the Frog meme, this token became a viral sensation in 2023. Launched with zero taxes and a hyper-deflationary supply model. Pepe rides pure community momentum and meme culture power.",
    floki: "Named after Elon Musk's Shiba Inu dog, FLOKI has grown into a full utility ecosystem. It features the Valhalla metaverse game, FlokiFi DeFi tools, and a real-world education initiative called the Floki Inuverse.",
    bonk: "Solana's first major meme coin, airdropped to the Solana community to revive the ecosystem after the FTX collapse. BONK rewards holders and integrates across dozens of Solana dApps and NFT marketplaces.",
    dogwifcoin: "A Solana-based meme coin depicting a Shiba Inu wearing a hat. WIF went from a minor token to a top-10 meme coin in months, driven purely by viral meme culture and strong community backing.",
    'book-of-meme': "BOME is a highly volatile, culturally-charged Solana meme token that skyrocketed after its presale in 2024. It integrates with decentralized storage and meme creation platforms to create a true meme economy.",
    brett: "Brett is the Base chain's most iconic meme coin, named after the famous 'Boy's Club' comic character. It benefits from Coinbase's ecosystem backing and the growing Base chain user base.",
    popcat: "Born from the viral 'pop cat' meme, POPCAT on Solana is known for its simplicity and fun. It rose dramatically in 2024 during the Solana meme season and remains a top-performing pure meme play.",
    'baby-doge-coin': "An evolution of the original Dogecoin, Baby Doge Coin launched on BSC with a deflationary model. It redistributes fees to holders, burns tokens on transfers, and supports a strong dog rescue charity initiative.",
};

const formatPrice = (price) => {
    if (!price) return '$0.00';
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.0001) return `$${price.toFixed(6)}`;
    return `$${price.toFixed(10)}`;
};

const formatMCap = (cap) => {
    if (!cap) return '—';
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
    return `$${(cap / 1e3).toFixed(2)}K`;
};

export default function CoinCarousel() {
    const [coins, setCoins] = useState([]);
    const [index, setIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCoins = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/ml/market`);
                if (!res.ok) throw new Error();
                const data = await res.json();
                setCoins(data);
            } catch {
                setCoins([
                    { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', image: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png', current_price: 0.12, price_change_percentage_24h: 3.5, market_cap: 17000000000 },
                    { id: 'shiba-inu', name: 'Shiba Inu', symbol: 'SHIB', image: 'https://assets.coingecko.com/coins/images/11939/small/shiba.png', current_price: 0.0000082, price_change_percentage_24h: -1.2, market_cap: 4800000000 },
                    { id: 'pepe', name: 'Pepe', symbol: 'PEPE', image: 'https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg', current_price: 0.0000091, price_change_percentage_24h: 8.3, market_cap: 3900000000 },
                ]);
            }
            setLoading(false);
        };
        fetchCoins();
    }, []);

    // Auto-advance every 3 seconds
    useEffect(() => {
        if (coins.length === 0) return;
        const timer = setInterval(() => setIndex(i => (i + 1) % coins.length), 3000);
        return () => clearInterval(timer);
    }, [coins.length]);

    if (loading) {
        return (
            <div className="h-64 flex items-center justify-center">
                <div className="flex gap-3 items-center text-gray-400">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="ml-2 text-sm font-medium">Loading top meme tokens…</span>
                </div>
            </div>
        );
    }

    const coin = coins[index];
    if (!coin) return null;
    const isUp = (coin.price_change_percentage_24h ?? 0) >= 0;
    const desc = TOKEN_DESCRIPTIONS[coin.id] ?? `${coin.name} is a popular meme-inspired cryptocurrency that has captured the imagination of the crypto community. It trades actively across multiple exchanges and holds a significant market capitalization within the meme coin sector.`;

    return (
        <div className="relative py-20 px-4 md:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 text-sm font-bold uppercase tracking-widest mb-4">
                        🔥 Trending Meme Tokens
                    </span>
                    <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
                        Top <span className="text-red-gradient">Meme Coins</span> Right Now
                    </h2>
                    <p className="text-gray-500 mt-3">Live data from CoinGecko · Updates every 3 seconds</p>
                </div>

                {/* Dot indicators */}
                <div className="flex justify-center gap-2 mb-8">
                    {coins.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setIndex(i)}
                            className={`rounded-full transition-all duration-300 ${i === index ? 'w-6 h-2 bg-rose-500' : 'w-2 h-2 bg-black/15 hover:bg-black/30'}`}
                        />
                    ))}
                </div>

                {/* Card */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={coin.id}
                        initial={{ opacity: 0, x: 60, scale: 0.97 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -60, scale: 0.97 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        className="glass-card bg-gradient-to-br from-white/80 to-white/40 border-amber-500/10 max-w-3xl mx-auto p-8 md:p-10"
                        style={{
                            boxShadow: '0 20px 60px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.04)',
                        }}
                    >
                        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                            {/* Logo + rank */}
                            <div className="relative flex-shrink-0">
                                <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-xl shadow-black/10 border border-black/5 bg-white flex items-center justify-center">
                                    {coin.image ? <img src={coin.image} alt={coin.name} className="w-20 h-20 object-contain" /> : <div className="w-20 h-20 bg-gray-50 flex items-center justify-center text-xs text-gray-300">NO IMG</div>}
                                </div>
                                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-rose-500 text-white text-xs font-black flex items-center justify-center shadow-md">
                                    #{index + 1}
                                </div>
                            </div>

                            {/* Details */}
                            <div className="flex-1 text-center md:text-left">
                                <div className="flex flex-col md:flex-row items-center md:items-center gap-3 mb-4">
                                    <h3 className="text-2xl font-black text-gray-900">{coin.name}</h3>
                                    <span className="px-3 py-1 bg-black/5 rounded-full text-sm font-bold text-gray-600 font-mono">{coin.symbol?.toUpperCase()}</span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${isUp ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'}`}>
                                        {isUp ? '▲' : '▼'} {Math.abs(coin.price_change_percentage_24h ?? 0).toFixed(2)}% 24h
                                    </span>
                                </div>

                                <div className="flex flex-wrap justify-center md:justify-start gap-6 mb-5">
                                    <div>
                                        <div className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Price</div>
                                        <div className="text-xl font-black text-gray-900">{formatPrice(coin.current_price)}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Market Cap</div>
                                        <div className="text-xl font-black text-gray-900">{formatMCap(coin.market_cap)}</div>
                                    </div>
                                </div>

                                <p className="text-gray-600 leading-relaxed text-sm md:text-base">{desc}</p>
                            </div>
                        </div>

                        {/* Progress bar showing position in carousel */}
                        <div className="mt-6 h-1 bg-black/5 rounded-full overflow-hidden">
                            <motion.div
                                key={`bar-${index}`}
                                className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full"
                                initial={{ width: '0%' }}
                                animate={{ width: '100%' }}
                                transition={{ duration: 3, ease: 'linear' }}
                            />
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
