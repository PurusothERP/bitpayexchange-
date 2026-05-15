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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -8 }}
            className="bg-white border border-black/5 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all group"
        >
            {/* Image Section */}
            <div className="relative aspect-square overflow-hidden bg-gray-100">
                <img 
                    src={nft.image_url || 'https://via.placeholder.com/400x400?text=NFT'} 
                    alt={nft.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute top-4 left-4 flex gap-2">
                    <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest backdrop-blur-md border border-white/20 shadow-lg ${riskColor}`}>
                        Risk: {nft.risk_factor}%
                    </span>
                    {nft.mintable === 1 && (
                        <span className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-teal-500 text-white shadow-lg flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5" /> Mint Live
                        </span>
                    )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                    <button 
                        onClick={() => onBuy(nft)}
                        className="w-full py-4 bg-white text-gray-900 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all"
                    >
                        Acquire Asset
                    </button>
                </div>
            </div>

            {/* Content Section */}
            <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-black text-gray-900 leading-tight group-hover:text-teal-600 transition-colors uppercase tracking-tighter">
                            {nft.name}
                        </h3>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">
                            {nft.symbol}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Price</p>
                        <p className="text-xl font-black text-gray-900 leading-none">{nft.last_sell_price} BNB</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-gray-50 rounded-2xl p-3 border border-black/5">
                        <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Market Cap</p>
                        <p className="text-xs font-black text-gray-900">{parseFloat(nft.market_cap).toLocaleString()} BNB</p>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-3 border border-black/5">
                        <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Total Supply</p>
                        <p className="text-xs font-black text-gray-900">{parseFloat(nft.total_supply).toLocaleString()}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between text-[9px] font-bold">
                        <span className="text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                            <ShieldCheck className="w-3 h-3" /> Contract
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-gray-600 italic">
                                {nft.contract_address.slice(0, 6)}...{nft.contract_address.slice(-4)}
                            </span>
                            <button onClick={handleCopy} className="text-teal-600">
                                {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-bold">
                        <span className="text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                            <TrendingUp className="w-3 h-3" /> 52W High/Low
                        </span>
                        <span className="text-gray-900">
                            <span className="text-emerald-500">{nft.high_52w}</span> / <span className="text-rose-500">{nft.low_52w}</span>
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-bold">
                        <span className="text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Activity className="w-3 h-3" /> Trading Volume
                        </span>
                        <span className="text-teal-600 font-black">{nft.liquidity_changes} Trades</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
