'use client';

import Navbar from '@/components/Navbar';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Rocket, TrendingUp, Clock, ExternalLink, Copy, CheckCircle2, ArrowUpRight, Activity, Users, Zap, ShieldCheck, Search, PlusCircle, Unlock, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Link from 'next/link';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const ADMIN_WALLET = '0x6451ee4def4a8b8fbc2c64301a79e267de378935';
const DIRECT_FACTORY = process.env.NEXT_PUBLIC_DIRECT_FACTORY_ADDRESS || '0xd2f602536605CAed0C30a2DA05B24B8F0E59197E';
const RELEASE_SERVICE_FEE = 0.003;

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
    // Fair Launch Token Release State
    const [isReleasing, setIsReleasing] = useState(false);
    const [releaseTokens, setReleaseTokens] = useState('');
    const [releaseLiqBnb, setReleaseLiqBnb] = useState('');
    const [releaseStatus, setReleaseStatus] = useState('idle'); // idle | loading | success | error
    const [releaseError, setReleaseError] = useState('');

    const isFairLaunch = token.launch_type === 'FAIR' || token.launch_type === 'FAIR_LAUNCH';
    const isOwner = account?.toLowerCase() === token.owner?.toLowerCase();

    const isAdmin = account?.toLowerCase() === ADMIN_WALLET.toLowerCase();

    const handleReleaseTokens = async () => {
        const tokensNum = parseFloat(releaseTokens);
        const bnbNum = parseFloat(releaseLiqBnb);
        if (!tokensNum || tokensNum <= 0) { setReleaseError('Enter valid token amount.'); return; }
        if (!bnbNum || bnbNum <= 0) { setReleaseError('Enter BNB liquidity amount.'); return; }
        setReleaseStatus('loading');
        setReleaseError('');
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            // Service fee + liquidity to pair
            const totalBnb = RELEASE_SERVICE_FEE + bnbNum;

            // Approve factory to spend tokens first
            const tokenAbi = ['function approve(address spender, uint256 amount) returns (bool)', 'function allowance(address owner, address spender) view returns (uint256)'];
            const tokenContract = new ethers.Contract(token.contract_address, tokenAbi, signer);
            const amountWei = ethers.parseEther(tokensNum.toString());
            const allowance = await tokenContract.allowance(account, DIRECT_FACTORY);
            if (allowance < amountWei) {
                setReleaseError('Approving token allowance...');
                const atx = await tokenContract.approve(DIRECT_FACTORY, ethers.MaxUint256);
                await atx.wait();
            }

            // Call factory releaseAdditionalLiquidity
            const factoryAbi = ['function addLiquidityForToken(address tokenAddress, uint256 tokenAmount) external payable'];
            const factory = new ethers.Contract(DIRECT_FACTORY, factoryAbi, signer);
            const tx = await factory.addLiquidityForToken(
                token.contract_address,
                amountWei,
                { value: ethers.parseEther(totalBnb.toFixed(18)), gasLimit: 1200000 }
            );
            await tx.wait();
            setReleaseStatus('success');
            setTimeout(() => { setReleaseStatus('idle'); setIsReleasing(false); setReleaseTokens(''); setReleaseLiqBnb(''); }, 5000);
        } catch(e) {
            if (e.code === 'ACTION_REJECTED' || (e.message && e.message.includes('rejected'))) {
                setReleaseError('Transaction was rejected.');
            } else {
                setReleaseError(e.reason || e.message || 'Transaction failed.');
            }
            setReleaseStatus('idle');
        }
    };
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
                            
                            {/* Verification Badges */}
                            <div className="flex gap-1 items-center">
                                {token.bscscan_verified ? (
                                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 border border-emerald-200 rounded text-[9px] font-black text-emerald-700 uppercase" title="Verified on BSCScan">
                                        <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[9px] font-black text-gray-500 uppercase animate-pulse" title="Verification in progress (can take up to 1hr)">
                                        <Clock className="w-2.5 h-2.5" /> Verifying
                                    </div>
                                )}

                                {token.tw_pr_url ? (
                                    <a href={token.tw_pr_url} target="_blank" rel="noopener noreferrer" 
                                       className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 border border-blue-200 rounded text-[9px] font-black text-blue-700 uppercase hover:bg-blue-200 transition-colors" 
                                       title="Trust Wallet Asset PR Submitted">
                                        <ShieldCheck className="w-2.5 h-2.5" /> TW Assets
                                    </a>
                                ) : (
                                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded text-[9px] font-black text-gray-400 uppercase" title="Waiting for BSCScan verification to submit to Trust Wallet">
                                        <Activity className="w-2.5 h-2.5" /> Assets Pending
                                    </div>
                                )}
                            </div>

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
                {/* Token Release Panel - Fair Launch only */}
                {isFairLaunch && isOwner && (
                    <div className="mt-4">
                        {!isReleasing ? (
                            <button
                                onClick={() => setIsReleasing(true)}
                                className="w-full flex items-center justify-between px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-xs rounded-xl transition-all group"
                            >
                                <span className="flex items-center gap-2"><Unlock className="w-4 h-4" /> Release Additional Tokens to PancakeSwap</span>
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        ) : (
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-3">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-black text-emerald-800 uppercase tracking-widest flex items-center gap-1.5"><PlusCircle className="w-4 h-4" /> Expand Liquidity Pool</p>
                                    <button onClick={() => setIsReleasing(false)} className="text-gray-400 hover:text-gray-600"><span className="text-lg leading-none">&times;</span></button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 block">Tokens to Release</label>
                                        <input type="number" placeholder="e.g. 50000000" value={releaseTokens} onChange={e => setReleaseTokens(e.target.value)}
                                            className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-emerald-400 transition-all" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 block">BNB Liquidity to Pair</label>
                                        <input type="number" step="0.01" placeholder="e.g. 0.05" value={releaseLiqBnb} onChange={e => setReleaseLiqBnb(e.target.value)}
                                            className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-emerald-400 transition-all" />
                                    </div>
                                </div>
                                <div className="p-3 bg-white/70 rounded-xl border border-emerald-100 text-[10px] font-bold text-gray-600 space-y-1.5">
                                    <div className="flex justify-between"><span>BNB Liquidity</span><span>{releaseLiqBnb || '0.000'} BNB</span></div>
                                    <div className="flex justify-between"><span>Service Fee</span><span className="text-amber-600">{RELEASE_SERVICE_FEE.toFixed(3)} BNB</span></div>
                                    <div className="flex justify-between font-black text-gray-900 border-t border-emerald-100 pt-1.5">
                                        <span>Total</span><span>{((parseFloat(releaseLiqBnb) || 0) + RELEASE_SERVICE_FEE).toFixed(3)} BNB</span>
                                    </div>
                                </div>
                                {releaseError && <p className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2 rounded-lg flex items-start gap-2"><AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />{releaseError}</p>}
                                {releaseStatus === 'success' && <p className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-3 py-2 rounded-lg flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Tokens released to PancakeSwap!</p>}
                                <button onClick={handleReleaseTokens} disabled={releaseStatus === 'loading'}
                                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-xl uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20">
                                    {releaseStatus === 'loading' ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <><Unlock className="w-4 h-4" /> Release Tokens to PancakeSwap</>}
                                </button>
                            </motion.div>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default function ProfilePage() {
    const { account, connectWallet } = useWallet();
    const [tokens, setTokens] = useState([]);
    const [loading, setLoading] = useState(false);
    const [bnbBalance, setBnbBalance] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

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

    const filteredTokens = tokens.filter(t => 
        (t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.symbol || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.contract_address || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                        <div className="mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <h2 className="text-xl font-black text-gray-900 flex items-center">Your Tokens
                                <span className="ml-2 text-sm font-bold text-gray-400 bg-black/5 px-2.5 py-0.5 rounded-full">{tokens.length}</span>
                            </h2>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-64">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search by name, symbol, or address..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20 transition-all shadow-sm"
                                    />
                                </div>
                                <Link href="/create" className="shrink-0">
                                    <motion.button whileHover={{ scale: 1.04 }}
                                        className="h-full px-5 py-2.5 bg-gradient-to-r from-rose-500 to-orange-500 text-white text-sm font-bold rounded-xl flex items-center gap-2 shadow-md shadow-rose-500/20">
                                        <Rocket className="w-4 h-4" /> Deploy
                                    </motion.button>
                                </Link>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-4">
                                <div className="w-12 h-12 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin" />
                                <p className="text-gray-400 text-sm font-semibold">Loading your tokens…</p>
                            </div>
                        ) : filteredTokens.length === 0 ? (
                            <div className="bg-white border border-black/8 rounded-2xl py-20 text-center shadow-sm">
                                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                                    <Search className="w-8 h-8 text-gray-400" />
                                </div>
                                <p className="font-black text-xl text-gray-800 mb-1">No tokens found</p>
                                <p className="text-sm text-gray-500 mb-6">Could not find any deployed tokens matching your search criteria.</p>
                                <button onClick={() => setSearchQuery('')} className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-sm transition-colors">
                                    Clear Search
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {filteredTokens.map((token, i) => <TokenCard key={token.contract_address || i} token={token} index={i} account={account} />)}
                            </div>
                        )}
                    </>
                )}
            </section>
        </main>
    );
}
