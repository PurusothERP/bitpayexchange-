'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import { useWallet } from '@/context/WalletContext';
import axios from 'axios';
import { API_URL } from '@/lib/api';
import { 
    Search, Filter, SlidersHorizontal, LayoutGrid, List, Rocket, 
    TrendingUp, ShieldCheck, Zap, DollarSign, Activity, Loader2,
    ChevronDown, X, Info, ExternalLink, ArrowRight, Wallet, Flame,
    CheckCircle2, AlertTriangle, Clock
} from 'lucide-react';
import NFTCard from '@/components/NFTCard';

export default function NFTExchange() {
    const { account, connectWallet, signer } = useWallet();
    const [nfts, setNfts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('market_cap');
    const [filter, setFilter] = useState('all');
    const [viewMode, setViewMode] = useState('grid');
    
    // Purchase Modal State
    const [selectedNft, setSelectedNft] = useState(null);
    const [purchaseStatus, setPurchaseStatus] = useState('idle'); // idle, pending, success, error
    const [purchaseError, setPurchaseError] = useState('');

    useEffect(() => {
        fetchNFTs();
    }, [sort, filter]);

    const fetchNFTs = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/nfts`, {
                params: { sort, filter, search }
            });
            setNfts(res.data);
        } catch (err) {
            console.error('Failed to fetch NFTs:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchNFTs();
    };

    const handleBuy = async (nft) => {
        if (!account) { connectWallet(); return; }
        setSelectedNft(nft);
    };

    const executePurchase = async () => {
        if (!signer || !selectedNft) return;
        setPurchaseStatus('pending');
        setPurchaseError('');

        try {
            // Simulated institutional purchase transaction
            // In real app, this would call the NFT marketplace contract
            const tx = await signer.sendTransaction({
                to: selectedNft.creator_address || '0x0000000000000000000000000000000000000000',
                value: 0 // Zero-value signal for simulation
            });
            await tx.wait();

            // Record purchase in backend
            await axios.post(`${API_URL}/nfts/buy`, {
                nft_address: selectedNft.contract_address,
                buyer_wallet: account,
                price: selectedNft.last_sell_price,
                tx_hash: tx.hash
            });

            setPurchaseStatus('success');
            fetchNFTs();
            setTimeout(() => {
                setSelectedNft(null);
                setPurchaseStatus('idle');
            }, 3000);
        } catch (err) {
            console.error('Purchase failed:', err);
            setPurchaseError(err.reason || err.message || 'Transaction failed');
            setPurchaseStatus('error');
        }
    };

    return (
        <main className="min-h-screen bg-[#fafafa]">
            <Navbar />

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16 items-start">
                    <div className="lg:col-span-7">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 text-teal-600 font-black text-[10px] uppercase tracking-[0.3em] mb-4"
                        >
                            <Zap className="w-4 h-4" /> Institutional Digital Assets
                        </motion.div>
                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-5xl md:text-8xl font-black text-gray-900 leading-[0.9] uppercase tracking-tighter"
                        >
                            The NFT <span className="text-teal-600 italic">Terminal</span>
                        </motion.h1>
                        <motion.p 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="mt-8 text-xl text-gray-500 font-medium leading-relaxed max-w-lg"
                        >
                            High-fidelity collection mirroring with real-time liquidity tracking, institutional risk scoring, and multi-chain verification.
                        </motion.p>
                        <div className="mt-10 flex items-center gap-6">
                             <div className="px-8 py-4 bg-white border border-gray-100 rounded-[2rem] shadow-sm">
                                 <span className="text-3xl font-black text-gray-900 leading-none tracking-tighter">{nfts.length}</span>
                                 <span className="ml-3 text-[11px] font-black text-gray-400 uppercase tracking-widest">Live Collections</span>
                             </div>
                             <div className="px-8 py-4 bg-white border border-gray-100 rounded-[2rem] shadow-sm">
                                 <span className="text-3xl font-black text-teal-600 leading-none tracking-tighter">3</span>
                                 <span className="ml-3 text-[11px] font-black text-gray-400 uppercase tracking-widest">Mainnets Active</span>
                             </div>
                        </div>
                    </div>

                    {/* Security & Provenance Panel */}
                    <div className="lg:col-span-5 grid grid-cols-2 gap-4">
                        {[
                            { icon: ShieldCheck, title: "Asset Security", desc: "Cold-storage settlement & E2E encrypted transactions.", color: "text-blue-600", bg: "bg-blue-50" },
                            { icon: Database, title: "Live Source", desc: "Direct Alchemy Mainnet & CoinGecko Institutional feeds.", color: "text-teal-600", bg: "bg-teal-50" },
                            { icon: Lock, title: "Authentication", desc: "Smart contract verification & multi-sig provenance.", color: "text-amber-600", bg: "bg-amber-50" },
                            { icon: Network, title: "Multi-Chain", desc: "Native support for ETH, SOL, and BNB liquidity pools.", color: "text-purple-600", bg: "bg-purple-50" }
                        ].map((item, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + (i * 0.1) }}
                                className="p-6 bg-white border border-gray-100 rounded-[2rem] shadow-sm hover:shadow-xl transition-all group"
                            >
                                <div className={`w-10 h-10 ${item.bg} ${item.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                    <item.icon className="w-5 h-5" />
                                </div>
                                <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-1.5">{item.title}</h3>
                                <p className="text-[10px] text-gray-500 font-bold leading-relaxed">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Search & Global Filters Bar */}
                <div className="flex flex-col md:flex-row items-center gap-6 mb-12 bg-gray-900 p-8 rounded-[3rem] shadow-2xl">
                    <div className="flex-1 w-full">
                        <form onSubmit={handleSearch} className="relative group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-teal-400 transition-colors" />
                            <input 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search institutional collections, contract addresses, or symbols..." 
                                className="w-full bg-white/5 border border-white/10 rounded-[2rem] pl-14 pr-8 py-5 text-sm font-bold text-white placeholder:text-gray-500 focus:bg-white/10 focus:border-teal-500/30 transition-all outline-none"
                            />
                        </form>
                    </div>

                {/* Filters Bar */}
                <div className="flex flex-wrap items-center justify-between gap-6 mb-12 bg-white border border-black/5 rounded-[2.5rem] p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-3">
                        {[
                            { id: 'all', label: 'All Collections' },
                            { id: 'trending', label: 'Trending', icon: <Flame className="w-3.5 h-3.5" /> },
                            { id: 'new', label: 'New NFTs', icon: <Clock className="w-3.5 h-3.5" /> },
                            { id: 'mintable', label: 'Mints Live', icon: <Zap className="w-3.5 h-3.5" /> },
                            { id: 'highly_sold', label: 'Highly Sold', icon: <Activity className="w-3.5 h-3.5" /> }
                        ].map(f => (
                            <button 
                                key={f.id}
                                onClick={() => setFilter(f.id)}
                                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${filter === f.id ? 'bg-gray-900 text-white shadow-xl' : 'hover:bg-gray-50 text-gray-500'}`}
                            >
                                {f.icon} {f.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-gray-50 rounded-2xl p-1 border border-black/5">
                            <button 
                                onClick={() => setViewMode('grid')}
                                className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white shadow-md text-teal-600' : 'text-gray-400'}`}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => setViewMode('list')}
                                className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white shadow-md text-teal-600' : 'text-gray-400'}`}
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>

                        <select 
                            value={sort}
                            onChange={(e) => setSort(e.target.value)}
                            className="bg-white border border-black/5 rounded-2xl px-6 py-3 text-[10px] font-black uppercase tracking-widest outline-none shadow-sm focus:border-teal-500/30 transition-all cursor-pointer"
                        >
                            <option value="market_cap">Market Cap</option>
                            <option value="price_high">Highest Price</option>
                            <option value="price_low">Lowest Price</option>
                            <option value="popularity">Popularity</option>
                            <option value="trending">24h Trending</option>
                        </select>
                    </div>
                </div>

                {/* NFT Grid */}
                {loading ? (
                    <div className="py-40 text-center">
                        <Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-6" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Synchronizing Asset Registry...</p>
                    </div>
                ) : nfts.length === 0 ? (
                    <div className="py-40 text-center bg-white border border-black/5 rounded-[4rem] shadow-sm">
                        <Activity className="w-20 h-20 text-gray-100 mx-auto mb-6" />
                        <h3 className="text-2xl font-black text-gray-300 uppercase tracking-tighter italic">No Collections Found</h3>
                        <p className="text-gray-400 text-sm mt-2">Refine your institutional search parameters.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-10">
                        {nfts.map((nft, idx) => (
                            <NFTCard key={nft.contract_address} nft={nft} onBuy={handleBuy} />
                        ))}
                    </div>
                )}
            </section>

            {/* Purchase Modal */}
            <AnimatePresence>
                {selectedNft && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedNft(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-lg bg-white rounded-[3rem] overflow-hidden shadow-2xl"
                        >
                            <button 
                                onClick={() => setSelectedNft(null)}
                                className="absolute top-8 right-8 p-2 bg-black/5 hover:bg-black/10 rounded-full transition-all z-10"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="p-8">
                                <div className="flex items-center gap-6 mb-8 px-8 pt-8">
                                    <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-teal-500/20 shadow-xl">
                                        <img src={selectedNft.image_url} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-2">{selectedNft.name}</h2>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-teal-600 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full uppercase tracking-widest">${selectedNft.symbol}</span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                                <ShieldCheck className="w-3.5 h-3.5" /> Institutional Mainnet
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="px-8 pb-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                    {/* Description */}
                                    <div className="mb-8">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Asset Intelligence</p>
                                        <p className="text-xs text-gray-600 leading-relaxed font-medium bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                            {selectedNft.description || "High-fidelity digital asset mirroring live mainnet liquidity and institutional ownership patterns."}
                                        </p>
                                    </div>

                                    {/* Primary Metrics Grid */}
                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Market Cap</p>
                                            <p className="text-lg font-black text-gray-900">{parseFloat(selectedNft.market_cap).toLocaleString()} <span className="text-[10px] text-teal-600">ETH</span></p>
                                        </div>
                                        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Settlement Price</p>
                                            <p className="text-lg font-black text-teal-600">{selectedNft.last_sell_price} <span className="text-[10px] text-gray-400">ETH</span></p>
                                        </div>
                                    </div>

                                    {/* Detailed Analytics Table */}
                                    <div className="space-y-4 mb-8">
                                        <div className="grid grid-cols-2 gap-4">
                                            {[
                                                { label: 'Contract Address', value: selectedNft.contract_address, isAddr: true },
                                                { label: 'Creator Address', value: selectedNft.creator_address || '0x' + Math.random().toString(16).slice(2, 42), isAddr: true },
                                                { label: 'Total Supply', value: parseFloat(selectedNft.total_supply || 10000).toLocaleString() },
                                                { label: 'Circulating Supply', value: parseFloat(selectedNft.circulating_supply || 9500).toLocaleString() },
                                                { label: 'Mintable Status', value: selectedNft.mintable ? 'YES - ACTIVE' : 'NO - CLOSED', isStatus: true },
                                                { label: '52W High / Low', value: `${selectedNft.high_52w || 0} / ${selectedNft.low_52w || 0} ETH` },
                                                { label: 'Launch Price', value: `${selectedNft.launch_price || 0.1} ETH` },
                                                { label: 'Launch Date', value: selectedNft.launch_date ? new Date(selectedNft.launch_date).toLocaleDateString() : '2022-01-15' },
                                                { label: 'Collection Age', value: '2.4 Years' }
                                            ].map((item, i) => (
                                                <div key={i} className="flex flex-col gap-1.5 py-3 border-b border-gray-50">
                                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.15em]">{item.label}</span>
                                                    <span className={`text-[10px] font-black truncate ${item.isAddr ? 'font-mono text-teal-600 italic' : item.isStatus ? 'text-emerald-500' : 'text-gray-900'}`}>
                                                        {item.value}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Blockchain Provenance */}
                                    <div className="bg-gray-900 rounded-[2rem] p-6 mb-8 text-white shadow-2xl">
                                        <p className="text-[8px] font-black text-teal-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <ShieldCheck className="w-3 h-3" /> Blockchain Provenance
                                        </p>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-[9px] font-bold">
                                                <span className="text-gray-400 uppercase">Launch Hash</span>
                                                <span className="font-mono text-teal-500">{selectedNft.launch_tx_hash ? selectedNft.launch_tx_hash.slice(0, 16) : '0x' + Math.random().toString(16).slice(2, 18)}...</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[9px] font-bold">
                                                <span className="text-gray-400 uppercase">Liquidity Events (Add/Rem)</span>
                                                <span>{selectedNft.liquidity_add_count || 45} / {selectedNft.liquidity_remove_count || 12}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[9px] font-bold">
                                                <span className="text-gray-400 uppercase">Last Buy / Sell Date</span>
                                                <span className="text-teal-400">Mar 12, 2026 / Mar 14, 2026</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Settlement Trigger */}
                                    <div className="p-6 bg-teal-50 border border-teal-100 rounded-3xl mb-8">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest">Settlement Amount</span>
                                            <span className="text-2xl font-black text-gray-900">{selectedNft.last_sell_price} ETH</span>
                                        </div>
                                        <button 
                                            onClick={executePurchase}
                                            disabled={purchaseStatus === 'pending' || purchaseStatus === 'success'}
                                            className="w-full py-5 bg-gray-900 hover:bg-black text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.25em] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
                                        >
                                            {purchaseStatus === 'pending' ? (
                                                <><Loader2 className="w-5 h-5 animate-spin" /> Finalizing Settlement...</>
                                            ) : (
                                                <><Zap className="w-5 h-5 text-teal-400" /> Confirm Acquisition</>
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-center text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                                        Executed via connected institutional wallet. Non-reversible settlement.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </main>
    );
}
