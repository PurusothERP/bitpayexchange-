'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Zap, TrendingUp, DollarSign, Clock, ExternalLink, Copy, CheckCircle2, User, Activity, AlertTriangle, ArrowUpRight } from 'lucide-react';

export default function NFTCard({ nft, onBuy }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(nft.contract_address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const riskColor = nft.risk_factor < 5 ? 'text-emerald-500 bg-emerald-50' : nft.risk_factor < 10 ? 'text-amber-500 bg-amber-50' : 'text-rose-500 bg-rose-50';

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -5 }}
            className="flex flex-col bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 group h-full"
        >
            {/* Image Section */}
            <div className="relative h-64 overflow-hidden bg-gray-50 border-b border-gray-50">
                <img 
                    src={nft.image_url || 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=300&auto=format&fit=crop'} 
                    alt={nft.name} 
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1643101809754-43a91784611a?q=80&w=300&auto=format&fit=crop'; }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-blue-600 text-white shadow-lg flex items-center gap-1.5 border border-blue-400/30">
                        <ShieldCheck className="w-2.5 h-2.5 fill-current" /> Mainnet Verified
                    </span>
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest backdrop-blur-md shadow-sm border border-white/20 ${riskColor}`}>
                        Risk: {nft.risk_factor}%
                    </span>
                </div>
            </div>

            {/* Content Section */}
            <div className="p-6 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-6">
                    <div className="min-w-0">
                        <h3 className="text-base font-black text-gray-900 truncate uppercase tracking-tight leading-none mb-1.5 group-hover:text-teal-600 transition-colors">
                            {nft.name}
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                ${nft.symbol}
                            </span>
                            <div className="w-1 h-1 bg-gray-200 rounded-full" />
                            <div className="flex items-center gap-1">
                                <span className="font-mono text-[9px] text-gray-400">
                                    {nft.contract_address.slice(0, 6)}...{nft.contract_address.slice(-4)}
                                </span>
                                <a 
                                    href={`https://etherscan.io/address/${nft.contract_address}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-gray-300 hover:text-blue-500 transition-colors"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </div>
                    </div>
                    <div className="text-right shrink-0 pl-4">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 italic">Floor Price</p>
                        <p className="text-xl font-black text-gray-900 tracking-tighter">{nft.last_sell_price} <span className="text-xs text-blue-600 ml-0.5">ETH</span></p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100/50">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Market Cap</p>
                        <p className="text-[11px] font-black text-gray-900 truncate">
                            {parseFloat(nft.market_cap).toLocaleString()} <span className="text-[9px] text-gray-400">BNB</span>
                        </p>
                    </div>
                    <div className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100/50">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Circulation</p>
                        <p className="text-[11px] font-black text-gray-900">
                            {parseFloat(nft.circulating_supply || 8000).toLocaleString()} <span className="text-[9px] text-gray-400">Items</span>
                        </p>
                    </div>
                </div>

                <div className="mt-auto space-y-4">
                    <div className="flex items-center justify-between py-3 border-y border-gray-50">
                         <div className="flex items-center gap-2">
                             <Activity className="w-3.5 h-3.5 text-teal-600" />
                             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">24h Volume</span>
                         </div>
                         <span className="text-[10px] font-black text-gray-900 uppercase">
                             {nft.liquidity_changes} Trades
                         </span>
                    </div>

                    <button 
                        onClick={(e) => { e.stopPropagation(); onBuy(nft); }}
                        className="w-full py-4 bg-gray-900 text-white rounded-[1.25rem] font-black text-[11px] uppercase tracking-[0.25em] shadow-xl hover:bg-black hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group/btn"
                    >
                        <DollarSign className="w-4 h-4 text-teal-400 group-hover/btn:rotate-12 transition-transform" />
                        Acquire Asset
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
