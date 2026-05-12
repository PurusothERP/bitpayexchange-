'use client';
import { API_URL } from '@/lib/api';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { motion } from 'framer-motion';
import { ShieldAlert, Trash2, Ghost, ArrowRight, ExternalLink, Hash, Clock, Ban } from 'lucide-react';
import axios from 'axios';



export default function DelistedPage() {
    const [tokens, setTokens] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDelisted = async () => {
            try {
                const res = await axios.get(`${API_URL}/tokens/filter/delisted`);
                setTokens(res.data || []);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetchDelisted();
    }, []);

    return (
        <main className="min-h-screen bg-[#0A0A0B] selection:bg-blue-500 selection:text-white pb-32">
            <Navbar />
            
            <header className="pt-32 pb-16 px-4 max-w-7xl mx-auto text-center">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 mb-8">
                    <ShieldAlert className="w-4 h-4 text-red-500" />
                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Restricted Assets Vault</span>
                </motion.div>
                <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-6">Delisted <span className="text-red-500">Archive</span></h1>
                <p className="text-gray-500 text-lg font-medium max-w-2xl mx-auto leading-relaxed">Tokens that have been permanently suspended due to inactivity or policy violations. Buying and selling is disabled.</p>
            </header>

            <div className="px-4 max-w-7xl mx-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-32"><div className="w-12 h-12 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" /></div>
                ) : tokens.length === 0 ? (
                    <div className="text-center py-32 border border-white/5 rounded-[3rem] bg-white/[0.02]">
                        <Ghost className="w-16 h-16 text-white/10 mx-auto mb-6" />
                        <p className="text-white/20 font-black uppercase tracking-widest">The archive is empty</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {tokens.map((t, i) => (
                            <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }} className="group relative bg-[#131314] border border-white/5 rounded-[2.5rem] p-8 overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-[60px] rounded-full" />
                                
                                <div className="flex items-start justify-between mb-8">
                                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 p-1 flex items-center justify-center">
                                        {t.logo_url ? <img src={t.logo_url} className="w-full h-full object-cover grayscale opacity-50" /> : <Ban className="w-8 h-8 text-white/20" />}
                                    </div>
                                    <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-xl">
                                        <span className="text-[9px] font-black text-red-500 uppercase">OFFLINE</span>
                                    </div>
                                </div>

                                <h3 className="text-2xl font-black text-white mb-2 tracking-tight line-clamp-1">{t.name} <span className="text-gray-600 text-lg">${t.symbol}</span></h3>
                                <div className="flex items-center gap-2 mb-8 text-[10px] text-gray-500 font-bold font-mono">
                                    <Hash className="w-3 h-3" /> {t.contract_address.slice(0, 12)}...
                                </div>

                                <div className="space-y-4 pt-6 border-t border-white/5">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-500">
                                        <span>Status</span>
                                        <span className="text-red-400">Permanently Delisted</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-500">
                                        <span>Reason</span>
                                        <span className="text-white/60 text-right">60+ Days Inactivity</span>
                                    </div>
                                </div>

                                <div className="mt-8 flex gap-3">
                                    <button className="flex-1 py-4 bg-white/5 text-white/20 font-black rounded-2xl cursor-not-allowed border border-white/5">BUYING DISABLED</button>
                                    <a href={`https://bscscan.com/token/${t.contract_address}`} target="_blank" className="w-14 h-14 bg-white/5 flex items-center justify-center rounded-2xl hover:bg-white/10 transition-colors border border-white/5"><ExternalLink className="w-5 h-5 text-gray-400" /></a>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
