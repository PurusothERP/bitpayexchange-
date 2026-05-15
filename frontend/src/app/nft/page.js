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
    ChevronDown, X, Info, ExternalLink, ArrowRight, Wallet, Flame
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
                <div className="flex flex-col md:flex-row items-end justify-between gap-8 mb-12">
                    <div className="max-w-2xl">
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
                            className="text-5xl md:text-7xl font-black text-gray-900 leading-[0.95] uppercase tracking-tighter"
                        >
                            The NFT <span className="text-teal-600 italic">Terminal</span>
                        </motion.h1>
                        <motion.p 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="mt-6 text-lg text-gray-500 font-medium leading-relaxed max-w-lg"
                        >
                            High-fidelity collection mirroring with real-time liquidity tracking, institutional risk scoring, and multi-chain verification.
                        </motion.p>
                    </div>

                    <div className="flex flex-col gap-4 w-full md:w-auto">
                        <form onSubmit={handleSearch} className="relative group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-teal-600 transition-colors" />
                            <input 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search Collections, Symbols, or Addresses..." 
                                className="w-full md:w-96 bg-white border border-black/5 rounded-[2.5rem] pl-14 pr-8 py-5 text-sm font-bold shadow-sm focus:shadow-xl focus:border-teal-500/30 transition-all outline-none"
                            />
                        </form>
                    </div>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
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
                                <div className="flex items-center gap-6 mb-8">
                                    <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-teal-500/20 shadow-xl">
                                        <img src={selectedNft.image_url} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-2">{selectedNft.name}</h2>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-teal-600 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full uppercase tracking-widest">${selectedNft.symbol}</span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                                <ShieldCheck className="w-3.5 h-3.5" /> Verified
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-[2rem] p-6 mb-8 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Acquisition Price</span>
                                        <span className="text-2xl font-black text-gray-900">{selectedNft.last_sell_price} BNB</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Protocol Fee (0.5%)</span>
                                        <span className="text-xs font-black text-teal-600">{(selectedNft.last_sell_price * 0.005).toFixed(4)} BNB</span>
                                    </div>
                                    <div className="pt-4 border-t border-black/5 flex justify-between items-center">
                                        <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest font-bold">Total Settlement</span>
                                        <span className="text-3xl font-black text-teal-600">{(selectedNft.last_sell_price * 1.005).toFixed(4)} BNB</span>
                                    </div>
                                </div>

                                {purchaseStatus === 'success' ? (
                                    <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-3xl text-center mb-4">
                                        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                                        <p className="text-sm font-black text-emerald-600 uppercase tracking-widest">Asset Successfully Acquired</p>
                                        <p className="text-[10px] text-emerald-500 font-bold mt-1 uppercase tracking-tighter">Updating institutional records...</p>
                                    </div>
                                ) : purchaseStatus === 'error' ? (
                                    <div className="p-6 bg-rose-50 border border-rose-200 rounded-3xl mb-4">
                                        <div className="flex items-center gap-3 text-rose-600 mb-2">
                                            <AlertTriangle className="w-5 h-5" />
                                            <p className="text-xs font-black uppercase tracking-widest">Settlement Error</p>
                                        </div>
                                        <p className="text-[10px] text-rose-500 font-bold uppercase leading-relaxed">{purchaseError}</p>
                                    </div>
                                ) : null}

                                <button 
                                    onClick={executePurchase}
                                    disabled={purchaseStatus === 'pending' || purchaseStatus === 'success'}
                                    className="w-full py-5 bg-gray-900 hover:bg-black text-white rounded-[2rem] font-black text-[12px] uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {purchaseStatus === 'pending' ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Verifying Settlement...</>
                                    ) : (
                                        <><Zap className="w-5 h-5 text-teal-400" /> Confirm Acquisition</>
                                    )}
                                </button>
                                <p className="text-center text-[9px] font-bold text-gray-400 mt-4 uppercase tracking-tighter">
                                    By confirming, you execute a peer-to-peer settlement via the institutional registry.
                                </p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </main>
    );
}
