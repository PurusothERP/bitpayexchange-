'use client';

import { useEffect, useState, useRef } from 'react';
import axios from 'axios';

export default function TrendingTicker() {
    const [trending, setTrending] = useState([]);
    const [loading, setLoading] = useState(true);
    const trackRef = useRef(null);

    const fetchTrending = async () => {
        try {
            const res = await axios.get('https://api.coingecko.com/api/v3/search/trending');
            const coins = res.data.coins.map(c => ({
                id: c.item.id,
                symbol: c.item.symbol,
                name: c.item.name,
                image: c.item.small,
                price: c.item.data.price,
                change: c.item.data.price_change_percentage_24h.usd
            }));
            setTrending(coins);
        } catch (e) {
            console.error('Trending fetch failed', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrending();
        const interval = setInterval(fetchTrending, 300000); // 5 mins
        return () => clearInterval(interval);
    }, []);

    if (loading || trending.length === 0) return null;

    const displayCoins = [...trending, ...trending]; // seamless loop

    return (
        <div className="w-full overflow-hidden h-10 bg-slate-50 border-y border-slate-100 mb-4 relative flex items-center">
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none" />
            
            <div className="px-4 py-1.5 bg-gray-900 text-white text-[8px] font-black uppercase tracking-widest rounded-r-full mr-4 shrink-0 z-20">
                Trending
            </div>

            <div
                ref={trackRef}
                className="flex items-center gap-8 animate-ticker-scroll whitespace-nowrap"
            >
                {displayCoins.map((coin, i) => {
                    const isUp = coin.change >= 0;
                    return (
                        <div key={i} className="flex items-center gap-2">
                            <img src={coin.image} alt={coin.symbol} className="w-4 h-4 rounded-full border border-gray-100" />
                            <span className="text-[10px] font-black text-gray-900 uppercase">{coin.symbol}</span>
                            <span className="text-[9px] font-mono font-bold text-gray-500">{coin.price}</span>
                            <span className={`text-[9px] font-black ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {isUp ? '▲' : '▼'} {Math.abs(coin.change).toFixed(2)}%
                            </span>
                        </div>
                    );
                })}
            </div>

            <style jsx>{`
                .animate-ticker-scroll {
                    display: flex;
                    width: max-content;
                    animation: ticker 40s linear infinite;
                }
                @keyframes ticker {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>
        </div>
    );
}
