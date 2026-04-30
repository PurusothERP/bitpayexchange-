'use client';

import { useEffect, useState, useRef } from 'react';

const MEME_COIN_IDS = [
    'dogecoin', 'shiba-inu', 'pepe', 'floki', 'bonk',
    'dogwifcoin', 'book-of-meme', 'mog-coin', 'brett',
    'baby-doge-coin', 'memecoin-2', 'cat-in-a-dogs-world',
    'coq-inu', 'myro', 'snek', 'wen-4', 'wojak',
    'ponke', 'popcat', 'toshi'
];

export default function CryptoTicker() {
    const [coins, setCoins] = useState([]);
    const [loading, setLoading] = useState(true);
    const trackRef = useRef(null);

    useEffect(() => {
        const fetchPrices = async () => {
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/ml/market`,
                    { headers: { 'Accept': 'application/json' }, cache: 'no-store' }
                );
                if (!res.ok) throw new Error('Market fetch failed');
                const data = await res.json();
                setCoins(data);
            } catch {
                // Fallback mock data if API fails
                setCoins([
                    { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', image: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png', current_price: 0.12, price_change_percentage_24h: 3.5 },
                    { id: 'shiba-inu', symbol: 'SHIB', name: 'Shiba Inu', image: 'https://assets.coingecko.com/coins/images/11939/small/shiba.png', current_price: 0.0000082, price_change_percentage_24h: -1.2 },
                    { id: 'pepe', symbol: 'PEPE', name: 'Pepe', image: 'https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg', current_price: 0.0000091, price_change_percentage_24h: 8.3 },
                    { id: 'floki', symbol: 'FLOKI', name: 'Floki', image: 'https://assets.coingecko.com/coins/images/16746/small/PNG_image.png', current_price: 0.000097, price_change_percentage_24h: 2.1 },
                    { id: 'bonk', symbol: 'BONK', name: 'Bonk', image: 'https://assets.coingecko.com/coins/images/28600/small/bonk.jpg', current_price: 0.0000143, price_change_percentage_24h: 5.7 },
                ]);
            }
            setLoading(false);
        };

        fetchPrices();
        const interval = setInterval(fetchPrices, 60000);
        return () => clearInterval(interval);
    }, []);

    const formatPrice = (price) => {
        if (!price) return '$0';
        if (price >= 1) return `$${price.toFixed(2)}`;
        if (price >= 0.01) return `$${price.toFixed(4)}`;
        if (price >= 0.0001) return `$${price.toFixed(6)}`;
        return `$${price.toFixed(8)}`;
    };

    const displayCoins = [...coins, ...coins]; // duplicate for seamless loop

    if (loading || coins.length === 0) {
        return (
            <div className="h-10 bg-black/5 border-b border-black/5 flex items-center justify-center">
                <div className="flex gap-2 items-center text-gray-400 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    Loading market data...
                </div>
            </div>
        );
    }

    return (
        <div className="fixed top-20 left-0 right-0 z-40 overflow-hidden h-9 bg-gradient-to-r from-gray-900/95 via-gray-800/95 to-gray-900/95 border-b border-indigo-500/20 backdrop-blur-sm">
            {/* Left fade */}
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-gray-900 to-transparent z-10 pointer-events-none" />
            {/* Right fade */}
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-gray-900 to-transparent z-10 pointer-events-none" />

            <div
                ref={trackRef}
                className="flex items-center h-full"
                style={{
                    animation: 'ticker-scroll 60s linear infinite',
                    whiteSpace: 'nowrap',
                    willChange: 'transform',
                }}
            >
                {displayCoins.map((coin, i) => {
                    const isUp = coin.price_change_percentage_24h >= 0;
                    return (
                        <span
                            key={`${coin.id}-${i}`}
                            className="inline-flex items-center gap-1.5 px-4 border-r border-white/5 shrink-0"
                        >
                            {coin.image ? (
                                <img
                                    src={coin.image}
                                    alt={coin.symbol}
                                    className="w-4 h-4 rounded-full object-cover"
                                    onError={e => { e.target.style.display = 'none'; }}
                                />
                            ) : null}
                            <span className="text-white/80 text-xs font-bold tracking-wide">{coin.symbol?.toUpperCase()}</span>
                            <span className="text-white text-xs font-mono">{formatPrice(coin.current_price)}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                                {isUp ? '▲' : '▼'} {Math.abs(coin.price_change_percentage_24h ?? 0).toFixed(2)}%
                            </span>
                        </span>
                    );
                })}
            </div>

            <style jsx global>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
        </div>
    );
}
