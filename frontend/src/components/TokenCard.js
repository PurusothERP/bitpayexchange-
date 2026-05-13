'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Users, Zap } from 'lucide-react';
import Link from 'next/link';

export default function TokenCard({ token }) {
    const { name, symbol, contract_address: address, logo_url: logoUrl, description, price_bnb, liquidity_bnb } = token;

    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="glass-card flex flex-col h-full group"
        >
            <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-4 bg-black/5">
                {logoUrl ? (
                    <img
                        src={logoUrl}
                        alt={name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-teal-600/20">
                        <Zap className="w-20 h-20" />
                    </div>
                )}
                <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-white/60 backdrop-blur-md border border-black/10 text-[10px] font-bold text-teal-600">
                    BSC
                </div>
            </div>

            <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-lg text-gray-900 truncate">{name}</h3>
                    <span className="text-xs font-mono text-teal-600 bg-teal-500/10 px-2 py-0.5 rounded-md">
                        {symbol}
                    </span>
                </div>
                <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                    {description || `The next generation ${symbol} token on BNB Smart Chain.`}
                </p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Price</span>
                        <div className="flex items-center gap-1 text-sm font-bold text-gray-900">
                            {parseFloat(price_bnb || 0).toFixed(8)} BNB
                        </div>
                    </div>
                    <div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Liquidity</span>
                        <div className="flex items-center gap-1 text-sm font-bold text-gray-900">
                            {parseFloat(liquidity_bnb || 0).toFixed(2)} BNB
                        </div>
                    </div>
                </div>
            </div>

            <Link href={`/token/${address}`} className="w-full">
                <button className="w-full py-3 bg-black/5 hover:bg-teal-500 hover:text-white transition-all duration-300 rounded-xl font-bold text-sm border border-black/10 hover:border-teal-500 shadow-lg shadow-black/20">
                    View Detail
                </button>
            </Link>
        </motion.div>
    );
}
