'use client';

import Navbar from '@/components/Navbar';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Rocket, TrendingUp, Clock, ExternalLink, Copy, CheckCircle2, ArrowUpRight, Activity, Users, Zap, ShieldCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Link from 'next/link';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const ADMIN_WALLET = '0x6451ee4def4a8b8fbc2c64301a79e267de378935';

export function formatPrice(num) {
    if (!num) return <span className="font-mono">0.00000000</span>;
    let s = Number(num).toFixed(10).replace(/0+$/, '');
    if (s.endsWith('.')) s += '00';
    
    const match = s.match(/^(0\.0+)(\d*)$/);
    if (match) {
        return (
            <span className="font-mono flex justify-center items-baseline tracking-tight">
                <span className="opacity-40">{match[1]}</span>
                <span>{match[2]}</span>
            </span>
        );
    }
    return <span className="font-mono">{s}</span>;
}

function formatSupply(raw) {
    // Detect wei-scaled values (> 1e15 means almost certainly 18-decimal wei)
    let n = Number(raw) || 0;
    if (n > 1e15) n = n / 1e18;   // convert from wei → token units
    if (n >= 1_000_000_000_000) return (n / 1_000_000_000_000).toFixed(2).replace(/\.?0+$/, '') + 'T';
    if (n >= 1_000_000_000)     return (n / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '') + 'B';
    if (n >= 1_000_000)         return (n / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M';
    if (n >= 1_000)             return (n / 1_000).toFixed(2).replace(/\.?0+$/, '') + 'K';
    return n.toString();
}

function formatBNB(wei) {
    if (!wei) return '0.0000';
    const bnb = Number(BigInt(wei)) / 1e18;
    return bnb.toFixed(4);
}

function copyToClipboard(text, onCopied) {
    navigator.clipboard.writeText(text).then(() => { onCopied(text); setTimeout(() => onCopied(null), 2000); });
}

function TokenCard({ token, index, account }) {
    const [copied, setCopied] = useState(null);
    const [isUpgrading, setIsUpgrading] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('Highly Trusted');
    const [isProcessing, setIsProcessing] = useState(false);

    const isAdmin = account?.toLowerCase() === ADMIN_WALLET.toLowerCase();
    const displayAddress = token.contract_address
        ? `${token.contract_address.slice(0, 10)}...${token.contract_address.slice(-8)}`
        : '—';

    const launchDate = token.created_at ? new Date(token.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown';
    const totalSupply = Number(token.total_supply || 1_000_000_000).toLocaleString();
    const holders = token.holders || Math.floor(Math.random() * 50) + 1;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            whileHover={{ y: -2 }}
            className="group bg-white border border-black/8 rounded-2xl shadow-sm hover:shadow-xl hover:border-rose-200 transition-all overflow-hidden"
        >
            {/* Top colored bar */}
            <div className="h-1 w-full bg-gradient-to-r from-rose-400 via-orange-400 to-amber-400 opacity-80 group-hover:opacity-100 transition-opacity" />

            <div className="p-5">
                {/* Header Row */}
                <div className="flex items-start gap-4">
                    {/* Logo */}
                    <div className="relative shrink-0">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 border-2 border-rose-200/60 flex items-center justify-center overflow-hidden shadow-md">
                            {token.logo_url ? (
                                <img src={token.logo_url} alt={token.name} className="w-full h-full object-cover rounded-2xl"
                                    onError={e => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span class="text-3xl">🪙</span>'; }}
                                />
                            ) : <span className="text-3xl">🪙</span>}
                        </div>
                        {/* Live dot */}
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm">
                            <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                        </div>
                    </div>

                    {/* Name & Symbol */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-black text-gray-900 text-lg leading-none">{token.name}</h3>
                            <span className="text-xs font-extrabold text-rose-600 bg-rose-500/10 border border-rose-200 px-2.5 py-0.5 rounded-full">
                                ${token.symbol}
                            </span>
                            {token.trust_status && (
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-tighter ${
                                    token.trust_status === 'Premium Token' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                    token.trust_status === 'Highly Trusted' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                    token.trust_status === 'Scam' ? 'bg-red-500 text-white border-red-500' :
                                    'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                }`}>
                                    {token.trust_status}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mt-1">
                            {token.description || `${token.name} is a community-driven meme token launched on the B20-LAB Launchpad on BNB Smart Chain.`}
                        </p>
                    </div>

                    {/* BSCScan link */}
                    {token.tx_hash && (
                        <a href={`https://bscscan.com/tx/${token.tx_hash}`} target="_blank" rel="noopener noreferrer"
                            className="shrink-0 p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 hover:bg-amber-100 transition-colors"
                            title="View Transaction">
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    )}
                </div>

                {/* Divider */}
                <div className="border-t border-black/5 my-4" />

                {/* Stats Row */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="bg-black/3 rounded-xl p-3 text-center">
                        <Activity className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Price</p>
                        <div className="text-xs font-black text-gray-800">{formatPrice(token.price_bnb || 0.0000001)}</div>
                    </div>
                    <div className="bg-black/3 rounded-xl p-3 text-center">
                        <TrendingUp className="w-4 h-4 text-rose-500 mx-auto mb-1" />
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Supply</p>
                        <p className="text-xs font-black text-gray-800">{formatSupply(token.total_supply || 1_000_000_000)}</p>
                    </div>
                    <div className="bg-black/3 rounded-xl p-3 text-center hidden sm:block">
                        <Clock className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Launched</p>
                        <p className="text-xs font-black text-gray-800">{launchDate}</p>
                    </div>
                    <div className="bg-black/3 rounded-xl p-3 text-center">
                        <Users className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Status</p>
                        <p className="text-xs font-black text-emerald-600">● Active</p>
                    </div>
                </div>

                {/* Address Row */}
                <div className="flex items-center justify-between bg-black/3 rounded-xl px-3 py-2.5 mb-4">
                    <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Contract Address</p>
                        <p className="font-mono text-xs text-gray-700 font-semibold">{displayAddress}</p>
                    </div>
                    <button
                        onClick={() => copyToClipboard(token.contract_address, setCopied)}
                        className="p-1.5 rounded-lg hover:bg-rose-100 transition-colors"
                        title="Copy address"
                    >
                        {copied === token.contract_address
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            : <Copy className="w-4 h-4 text-gray-400 hover:text-rose-500 transition-colors" />
                        }
                    </button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <Link href={`/token/${token.contract_address}`} className="flex-1">
                        <motion.button
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                            className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-bold text-sm rounded-xl shadow-md shadow-rose-500/20 flex items-center justify-center gap-2 transition-all"
                        >
                            <Zap className="w-4 h-4" /> Trade Now
                        </motion.button>
                    </Link>
                    <AnimatePresence mode="wait">
                        {!isUpgrading ? (
                            <motion.button
                                key="upgrade-btn"
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                onClick={() => setIsUpgrading(true)}
                                className="px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 font-bold text-sm rounded-xl border border-amber-200 flex items-center gap-1.5 transition-all"
                            >
                                <ShieldCheck className="w-4 h-4" /> Upgrade
                            </motion.button>
                        ) : (
                            <motion.div 
                                key="upgrade-form"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl"
                            >
                                <select 
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                    className="w-full bg-white border border-amber-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-800 outline-none"
                                >
                                    <option value="Highly Trusted">Highly Trusted</option>
                                    <option value="Premium Token">Premium Token</option>
                                    <option value="Good to buy">Good to Buy</option>
                                </select>
                                <div className="flex gap-2">
                                    <button
                                        disabled={isProcessing}
                                        onClick={async () => {
                                            setIsProcessing(true);
                                            try {
                                                let tx_hash = 'admin_manual';

                                                if (!isAdmin) {
                                                    const provider = new ethers.BrowserProvider(window.ethereum);
                                                    const signer = await provider.getSigner();
                                                    const tx = await signer.sendTransaction({
                                                        to: ADMIN_WALLET,
                                                        value: ethers.parseEther('0.01')
                                                    });
                                                    await tx.wait();
                                                    tx_hash = tx.hash;
                                                }

                                                await axios.post(`${API_URL}/tokens/status/request`, {
                                                    contract_address: token.contract_address,
                                                    new_status: selectedStatus,
                                                    tx_hash: tx_hash
                                                });
                                                
                                                alert(isAdmin ? 'Status updated successfully!' : 'Upgrade request verified!');
                                                window.location.reload();
                                            } catch (e) {
                                                alert('Action failed: ' + (e.reason || e.message));
                                            } finally {
                                                setIsProcessing(false);
                                            }
                                        }}
                                        className="flex-1 py-1.5 bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase hover:bg-amber-600 disabled:opacity-50"
                                    >
                                        {isProcessing ? 'Wait…' : isAdmin ? 'Apply Now' : 'Pay 0.01 BNB'}
                                    </button>
                                    <button 
                                        onClick={() => setIsUpgrading(false)}
                                        className="px-2 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-[10px] font-black uppercase"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <a
                        href={`https://bscscan.com/token/${token.contract_address}`}
                        target="_blank" rel="noopener noreferrer"
                        className="p-2.5 bg-black/5 hover:bg-black/10 text-gray-700 font-bold rounded-xl border border-black/8 transition-all"
                    >
                        <ArrowUpRight className="w-4 h-4" />
                    </a>
                </div>
            </div>
        </motion.div>
    );
}

export default function ProfilePage() {
    const { account, connectWallet } = useWallet();
    const [tokens, setTokens] = useState([]);
    const [loading, setLoading] = useState(false);
    const [bnbBalance, setBnbBalance] = useState(null);

    useEffect(() => {
        if (!account) return;
        setLoading(true);
        axios.get(`${API_URL}/tokens/by-wallet/${account}`)
            .then(r => setTokens(Array.isArray(r.data) ? r.data : []))
            .catch(() => setTokens([]))
            .finally(() => setLoading(false));

        // Fetch BNB balance from BSC RPC
        fetch('https://bsc-dataseed.binance.org', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getBalance', params: [account, 'latest'], id: 1 })
        }).then(r => r.json()).then(data => {
            if (data.result) setBnbBalance(parseInt(data.result, 16));
        }).catch(() => {});
    }, [account]);

    const stats = [
        { label: 'Tokens Deployed', value: tokens.length, icon: <Rocket className="w-5 h-5" />, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200' },
        { label: 'Total Supply (all)', value: formatSupply(tokens.reduce((s, t) => s + Number(t.total_supply || 1_000_000_000), 0)), icon: <TrendingUp className="w-5 h-5" />, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200' },
        { label: 'Wallet Balance', value: bnbBalance !== null ? `${formatBNB(bnbBalance)} BNB` : '…', icon: <Wallet className="w-5 h-5" />, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-200' },
        { label: 'Last Deploy', value: tokens[0]?.created_at ? new Date(tokens[0].created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : '—', icon: <Clock className="w-5 h-5" />, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    ];

    return (
        <main className="min-h-screen paw-pattern">
            <Navbar />

            <section className="pt-32 pb-24 px-4 md:px-8 max-w-5xl mx-auto">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
                    <h1 className="text-4xl md:text-5xl font-black mb-2">My <span className="text-red-gradient">Profile</span></h1>
                    <p className="text-gray-500">All tokens deployed from your connected wallet</p>
                </motion.div>

                {!account ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="glass-card py-24 text-center flex flex-col items-center gap-6">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-rose-100 to-amber-100 flex items-center justify-center">
                            <Wallet className="w-12 h-12 text-rose-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 mb-2">Connect Your Wallet</h2>
                            <p className="text-gray-500 text-sm max-w-xs mx-auto">Connect your wallet to view your deployed tokens, stats, and trading history.</p>
                        </div>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={connectWallet}
                            className="px-10 py-3.5 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-black rounded-2xl shadow-xl shadow-rose-500/25">
                            🔗 Connect Wallet
                        </motion.button>
                    </motion.div>
                ) : (
                    <>
                        {/* Wallet badge */}
                        <div className="bg-white border border-black/8 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-center gap-4 shadow-sm">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center shadow-lg shrink-0">
                                <Wallet className="w-7 h-7 text-white" />
                            </div>
                            <div className="flex-1 min-w-0 text-center sm:text-left">
                                <div className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Connected Wallet</div>
                                <div className="font-mono text-gray-900 font-bold text-sm break-all">{account}</div>
                                {bnbBalance !== null && (
                                    <div className="mt-1 inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs px-2.5 py-1 rounded-full">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
                                        {formatBNB(bnbBalance)} BNB
                                    </div>
                                )}
                            </div>
                            <a href={`https://bscscan.com/address/${account}`} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-sm font-bold text-amber-600 hover:text-amber-700 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl shrink-0 transition-colors">
                                <ExternalLink className="w-4 h-4" /> View on BSCScan
                            </a>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            {stats.map((s, i) => (
                                <motion.div key={i}
                                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                                    className={`bg-white border ${s.border} rounded-2xl p-5 text-center shadow-sm`}>
                                    <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mx-auto mb-3 ${s.color}`}>
                                        {s.icon}
                                    </div>
                                    <div className="text-2xl font-black text-gray-900">{s.value}</div>
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">{s.label}</div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Tokens header */}
                        <div className="mb-5 flex items-center justify-between">
                            <h2 className="text-xl font-black text-gray-900">Your Tokens
                                <span className="ml-2 text-sm font-bold text-gray-400 bg-black/5 px-2.5 py-0.5 rounded-full">{tokens.length}</span>
                            </h2>
                            <Link href="/create">
                                <motion.button whileHover={{ scale: 1.04 }}
                                    className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-orange-500 text-white text-sm font-bold rounded-xl flex items-center gap-2 shadow-md shadow-rose-500/20">
                                    <Rocket className="w-4 h-4" /> Deploy New Token
                                </motion.button>
                            </Link>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-4">
                                <div className="w-12 h-12 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin" />
                                <p className="text-gray-400 text-sm font-semibold">Loading your tokens…</p>
                            </div>
                        ) : tokens.length === 0 ? (
                            <div className="bg-white border border-black/8 rounded-2xl py-20 text-center shadow-sm">
                                <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
                                    <Rocket className="w-8 h-8 text-rose-400" />
                                </div>
                                <p className="font-black text-xl text-gray-800 mb-1">No tokens yet</p>
                                <p className="text-sm text-gray-500 mb-6">Deploy your first meme token to get started</p>
                                <Link href="/create">
                                    <button className="px-8 py-3 bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-rose-500/20">
                                        🚀 Create Token
                                    </button>
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {tokens.map((token, i) => <TokenCard key={i} token={token} index={i} account={account} />)}
                            </div>
                        )}
                    </>
                )}
            </section>
        </main>
    );
}
