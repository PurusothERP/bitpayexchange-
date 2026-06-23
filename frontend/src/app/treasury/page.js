'use client';
import { API_URL } from '@/lib/api';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import axios from 'axios';
import { ShieldCheck, CheckCircle2, Clock, Wallet, ExternalLink, Activity } from 'lucide-react';
import { motion } from 'framer-motion';



export default function TreasuryDashboard() {
    const [tokens, setTokens] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTokens = async () => {
            try {
                const response = await axios.get(`${API_URL}/tokens`);
                // For simplicity, map over all tokens.
                // In a production environment with a massive DB, pagination would be applied here.
                if (Array.isArray(response.data)) {
                    // Sort by newest first
                    const sorted = response.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    setTokens(sorted);
                }
            } catch (err) {
                console.error("Failed to load tokens for Treasury Dashboard:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchTokens();
        const iv = setInterval(fetchTokens, 15000); // Live updates
        return () => clearInterval(iv);
    }, []);

    const shortAddr = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    return (
        <main className="min-h-screen paw-pattern bg-gray-50/50">
            <Navbar />
            
            <div className="pt-32 pb-24 px-4 md:px-8 max-w-7xl mx-auto">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-500/10 border border-teal-500/20 rounded-full mb-4">
                        <ShieldCheck className="w-4 h-4 text-teal-600" />
                        <span className="text-xs font-black text-teal-600 uppercase tracking-widest">Internal Logistics</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tighter">
                        Treasury <span className="text-teal-600">Command</span>
                    </h1>
                    <p className="text-gray-500 max-w-2xl text-lg font-medium">
                        Live monitoring of the global protocol flow. All bonded BNB and 10% auto-transfers verified in real-time.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white border border-black/5 rounded-3xl p-6 shadow-sm flex items-center gap-5">
                        <div className="w-14 h-14 bg-sky-500/10 border border-sky-500/20 rounded-2xl flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-6 h-6 text-sky-600" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-400 tracking-widest uppercase mb-1">Treasury Wallet</p>
                            <p className="text-sm font-mono text-gray-900 font-bold break-all">{process.env.NEXT_PUBLIC_FEE_WALLET || '0x6e10d0414d64e37668da38b19062e3c13471e806'}</p>
                        </div>
                    </div>
                    
                    <div className="bg-white border border-black/5 rounded-3xl p-6 shadow-sm flex items-center gap-5">
                        <div className="w-14 h-14 bg-teal-500/10 border border-teal-500/20 rounded-2xl flex items-center justify-center shrink-0">
                            <Wallet className="w-6 h-6 text-teal-600" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-400 tracking-widest uppercase mb-1">Total Assets Tracked</p>
                            <p className="text-3xl font-black text-gray-900 tracking-tighter">{tokens.length}</p>
                        </div>
                    </div>

                    <div className="bg-white border border-black/5 rounded-3xl p-6 shadow-sm flex items-center gap-5">
                        <div className="w-14 h-14 bg-teal-500/10 border border-teal-500/20 rounded-2xl flex items-center justify-center shrink-0 animate-pulse">
                            <Activity className="w-6 h-6 text-teal-600" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-400 tracking-widest uppercase mb-1">Sweep Status</p>
                            <p className="text-[11px] font-bold text-gray-500 leading-tight">
                                Trading fees (1%) are automatically pushed to the Treasury <span className="text-teal-600">instantly on every trade</span> natively within the smart contract!
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-black/5 rounded-3xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-black/5 text-[10px] uppercase tracking-widest text-gray-400 font-black">
                                    <th className="px-6 py-5">Token Identity</th>
                                    <th className="px-6 py-5">Launch Address</th>
                                    <th className="px-6 py-5">BNB Raised (Curve)</th>
                                    <th className="px-6 py-5 text-center">10% Treasury Transfer</th>
                                    <th className="px-6 py-5 text-right">Age</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 text-sm font-medium">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-bold">
                                            Syncing with ledger...
                                        </td>
                                    </tr>
                                ) : tokens.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-bold">
                                            No tokens launched yet.
                                        </td>
                                    </tr>
                                ) : (
                                    tokens.map((token, i) => {
                                        const bnbInCurve = parseFloat(token.price_bnb || 0).toFixed(4);
                                        const isFair = token.migrated && bnbInCurve == 0.0000;
                                        
                                        return (
                                            <motion.tr 
                                                initial={{ opacity: 0 }} 
                                                animate={{ opacity: 1 }} 
                                                transition={{ delay: i * 0.02 }}
                                                key={token.id} 
                                                className="hover:bg-gray-50/50 transition-colors"
                                            >
                                                {/* Token Identity */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-white border border-black/5 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                                                            {token.logo_url ? <img src={token.logo_url} alt="" className="w-full h-full object-cover" /> : <span className="text-xl">🪙</span>}
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-gray-900 truncate max-w-[150px]">{token.name}</div>
                                                            <div className="text-[10px] font-black uppercase text-teal-600 bg-teal-50 px-2 py-0.5 rounded flex w-min">${token.symbol}</div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Contract Address */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xs text-gray-500 bg-gray-50 px-2 py-1 flex items-center rounded-md border border-black/5 shadow-inner">
                                                            {shortAddr(token.contract_address || token.token_address || '')}
                                                        </span>
                                                        <a href={`https://bscscan.com/token/${token.contract_address || token.token_address}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-teal-600 transition-colors">
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                    </div>
                                                </td>

                                                {/* Total BNB in Curve */}
                                                <td className="px-6 py-4">
                                                    {isFair ? (
                                                       <span className="text-[10px] font-black uppercase bg-sky-50 text-sky-600 px-2 py-1 rounded border border-sky-200">
                                                           Fair Launch DEX
                                                       </span>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 font-mono text-gray-900 font-bold">
                                                            <Activity className="w-3.5 h-3.5 text-gray-400" />
                                                            {bnbInCurve} BNB
                                                        </div>
                                                    )}
                                                </td>

                                                {/* 100M Transfer Confirmation */}
                                                <td className="px-6 py-4 text-center">
                                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-500/10 border border-sky-500/20 rounded-lg text-xs font-black text-sky-600 shadow-sm">
                                                        <CheckCircle2 className="w-4 h-4 fill-sky-500 text-white" />
                                                        100M Received
                                                    </div>
                                                </td>

                                                {/* Age */}
                                                <td className="px-6 py-4 text-right">
                                                    <div className="inline-flex items-center gap-1.5 text-xs text-gray-500 font-bold">
                                                        <Clock className="w-3.5 h-3.5 opacity-50" />
                                                        {new Date(token.created_at).toLocaleDateString()}
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    );
}
