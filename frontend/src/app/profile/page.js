'use client';

import Navbar from '@/components/Navbar';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Rocket, TrendingUp, Clock, ExternalLink, Copy, CheckCircle2, ArrowUpRight, Activity, Users, Zap, ShieldCheck, Search, PlusCircle, Unlock, ChevronRight, Loader2, AlertTriangle, Megaphone, Globe, FileText, Send, Lock, BarChart3, Calendar, Gift, RefreshCw, History } from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState('tokens'); // 'tokens' | 'services' | 'staking' | 'futures'
    const [stakes, setStakes] = useState([]);
    const [loadingStakes, setLoadingStakes] = useState(false);
    const [releasingStake, setReleasingStake] = useState(null);
    const [futuresPositions, setFuturesPositions] = useState([]);

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

        // Fetch staking positions
        setLoadingStakes(true);
        axios.get(`${API_URL}/staking/my-stakes/${account}`)
            .then(r => setStakes(Array.isArray(r.data) ? r.data : []))
            .catch(() => setStakes([]))
            .finally(() => setLoadingStakes(false));

        // Load mock futures
        try {
            const stored = localStorage.getItem('b20_futures_positions');
            if (stored) setFuturesPositions(JSON.parse(stored));
        } catch(e){}
    }, [account]);

    const closeFuturesPosition = (id) => {
        const updated = futuresPositions.filter(p => p.id !== id);
        setFuturesPositions(updated);
        localStorage.setItem('b20_futures_positions', JSON.stringify(updated));
    };

    const activeStakesCount = stakes.filter(s => s.status === 'active').length;
    const totalEarned = stakes.reduce((s, st) => s + parseFloat(st.earned_so_far || 0), 0);
    const totalStakedAmount = stakes.filter(s => s.status === 'active').reduce((s, st) => s + parseFloat(st.amount_tokens || 0), 0);
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
                    <p className="text-gray-500">Manage your assets and access premium project services</p>
                </motion.div>

                {/* Tab Switcher */}
                <div className="flex bg-white/50 backdrop-blur-md p-2 rounded-2xl border border-black/5 mb-8 max-w-lg">
                    <button 
                        onClick={() => setActiveTab('tokens')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            activeTab === 'tokens' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <Rocket className="w-4 h-4" /> My Assets
                    </button>
                    <button
                        onClick={() => setActiveTab('staking')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all relative ${
                            activeTab === 'staking' ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-violet-500 hover:text-violet-600 bg-violet-500/5'
                        }`}
                    >
                        <Lock className="w-4 h-4" /> My Staking
                        {stakes.length > 0 && activeTab !== 'staking' && (
                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-violet-500 border-2 border-white rounded-full text-[9px] font-black text-white flex items-center justify-center px-0.5">
                                {stakes.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('futures')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all relative ${
                            activeTab === 'futures' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-emerald-500 hover:text-emerald-600 bg-emerald-500/5'
                        }`}
                    >
                        <Activity className="w-4 h-4" /> Futures
                        {futuresPositions.length > 0 && activeTab !== 'futures' && (
                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-emerald-500 border-2 border-white rounded-full text-[9px] font-black text-white flex items-center justify-center px-0.5">
                                {futuresPositions.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Floating Services Button */}
                <AnimatePresence>
                    {activeTab !== 'services' && (
                        <motion.button 
                            initial={{ opacity: 0, scale: 0.8 }} 
                            animate={{ opacity: 1, scale: 1 }} 
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={() => setActiveTab('services')}
                            className="fixed bottom-10 right-10 z-40 px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white font-black uppercase tracking-[0.1em] rounded-full shadow-2xl shadow-purple-600/40 flex items-center gap-3 transition-transform hover:scale-105 border-4 border-white/10"
                        >
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                            </span>
                            Platform Services
                        </motion.button>
                    )}
                </AnimatePresence>

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
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <Link href="/exchange">
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    className="flex items-center gap-1.5 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 px-4 py-2 rounded-xl transition-colors shadow-md shadow-amber-500/20">
                                    <TrendingUp className="w-4 h-4" /> Exchange
                                </motion.button>
                            </Link>
                            <Link href="/fiat">
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    className="flex items-center gap-1.5 text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-2 rounded-xl transition-colors">
                                    <Globe className="w-4 h-4" /> Fiat
                                </motion.button>
                            </Link>
                            <a href={`https://bscscan.com/address/${account}`} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-sm font-bold text-amber-600 hover:text-amber-700 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl transition-colors">
                                <ExternalLink className="w-4 h-4" /> BSCScan
                            </a>
                        </div>
                        </div>

                        {activeTab === 'tokens' ? (
                            <>
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
                        ) : activeTab === 'services' ? (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                <div className="text-center mb-12">
                                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
                                        <Megaphone className="w-4 h-4" /> Marketing & Listings
                                    </span>
                                    <h2 className="text-3xl font-black mb-4 text-gray-900 uppercase">Project <span className="text-purple-600 italic">Services</span></h2>
                                    <p className="text-gray-500 max-w-2xl mx-auto text-sm font-bold pt-2 uppercase tracking-wide">
                                        Elevate your crypto project with professional whitepapers, stunning dApps, and elite exchange listings.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                                    {[
                                        { title: 'Whitepapers', desc: 'Professional, comprehensive technical and economic documentation for your project.', icon: <FileText className="text-purple-600 w-6 h-6" />, bg: 'bg-purple-500/10', border: 'hover:border-purple-500/30' },
                                        { title: 'Web Design', desc: 'High-conversion, stunning landing pages and dApps tailored to crypto audiences.', icon: <Globe className="text-blue-600 w-6 h-6" />, bg: 'bg-blue-500/10', border: 'hover:border-blue-500/30' },
                                        { title: 'CEX Listings', desc: 'Fast-tracked applications and introductions to top-tier centralized exchanges.', icon: <Rocket className="text-green-600 w-6 h-6" />, bg: 'bg-green-500/10', border: 'hover:border-green-500/30' }
                                    ].map((s, i) => (
                                        <div key={i} className={`bg-white border border-black/8 rounded-[2rem] p-8 shadow-sm transition-all hover:shadow-xl ${s.border}`}>
                                            <div className={`w-14 h-14 ${s.bg} rounded-2xl flex items-center justify-center mb-6`}>
                                                {s.icon}
                                            </div>
                                            <h3 className="text-lg font-black text-gray-900 mb-2 uppercase">{s.title}</h3>
                                            <p className="text-xs text-gray-500 font-bold leading-relaxed">{s.desc}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-white border border-black/8 rounded-[2.5rem] shadow-xl overflow-hidden mb-20">
                                    <div className="p-8 md:p-12">
                                        <h2 className="text-2xl font-black text-gray-900 mb-8 border-b border-black/5 pb-6 flex items-center gap-3 uppercase italic">
                                            <Zap className="w-6 h-6 text-amber-500" /> Request a Quote
                                        </h2>

                                        <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); alert("Request submitted successfully! Our elite team will contact you within 6 hours."); }}>
                                            <div className="space-y-4">
                                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest block ml-2">Services Required (Select multiple)</label>
                                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                                    {['Whitepaper', 'Website/dApp', 'Smart Contract Audit', 'CEX Listing', 'CMC/CG Fast-track', 'Marketing PR', 'Community Mod', 'Other'].map(s => (
                                                        <label key={s} className="flex items-center gap-3 p-4 border border-black/5 rounded-2xl cursor-pointer hover:bg-black/[0.02] transition-colors group">
                                                            <input type="checkbox" className="w-5 h-5 rounded-lg text-purple-600 border-black/10 focus:ring-purple-500/20" />
                                                            <span className="text-[10px] font-black text-gray-700 uppercase tracking-tight group-hover:text-purple-600 transition-colors">{s}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-black/5">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest block ml-2">Your Name</label>
                                                    <input required type="text" placeholder="John Doe" className="w-full bg-black/[0.02] border border-black/5 rounded-2xl px-6 py-4 focus:outline-none focus:border-purple-500/50 transition-all text-gray-900 font-bold" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest block ml-2">Email Address / Telegram</label>
                                                    <input required type="text" placeholder="john@example.com or @johndoe" className="w-full bg-black/[0.02] border border-black/5 rounded-2xl px-6 py-4 focus:outline-none focus:border-purple-500/50 transition-all text-gray-900 font-bold" />
                                                </div>
                                                <div className="space-y-2 md:col-span-2">
                                                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest block ml-2">Project Name & Description</label>
                                                    <textarea required rows="4" placeholder="Tell us about your project and your goals..." className="w-full bg-black/[0.02] border border-black/5 rounded-2xl px-6 py-4 focus:outline-none focus:border-purple-500/50 transition-all text-gray-900 font-bold resize-none" />
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                className="w-full py-5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-purple-600/20 transition-all text-sm uppercase tracking-[0.2em]"
                                            >
                                                <Send className="w-5 h-5" />
                                                Send Request
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </motion.div>
                        ) : null}

                        {/* ── STAKING TAB ── */}
                        {activeTab === 'staking' && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                {/* Staking Summary */}
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    {[
                                        { label: 'Active Stakes', value: activeStakesCount, icon: <Lock className="w-5 h-5" />, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
                                        { label: 'Total Staked', value: totalStakedAmount.toFixed(2), icon: <BarChart3 className="w-5 h-5" />, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
                                        { label: 'Total Earned', value: totalEarned.toFixed(4), icon: <Gift className="w-5 h-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                                    ].map((s, i) => (
                                        <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                                            className={`bg-white border ${s.border} rounded-2xl p-4 text-center shadow-sm`}>
                                            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mx-auto mb-2 ${s.color}`}>{s.icon}</div>
                                            <div className="text-xl font-black text-gray-900">{s.value}</div>
                                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-0.5">{s.label}</div>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Header */}
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                        <Lock className="w-5 h-5 text-violet-500" /> My Staking Positions
                                        <span className="ml-1 text-sm font-bold text-gray-400 bg-black/5 px-2 py-0.5 rounded-full">{stakes.length}</span>
                                    </h2>
                                    <div className="flex items-center gap-3">
                                        <Link href="/staking" className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all">
                                            <Lock className="w-3 h-3" /> Stake More
                                        </Link>
                                        <button onClick={() => {
                                            setLoadingStakes(true);
                                            axios.get(`${API_URL}/staking/my-stakes/${account}`)
                                                .then(r => setStakes(Array.isArray(r.data) ? r.data : []))
                                                .finally(() => setLoadingStakes(false));
                                        }} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-xl transition-all">
                                            <RefreshCw className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {loadingStakes ? (
                                    <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
                                        <Loader2 className="w-5 h-5 animate-spin" /> Loading staking positions…
                                    </div>
                                ) : stakes.length === 0 ? (
                                    <div className="bg-white border border-black/8 rounded-2xl py-16 text-center shadow-sm">
                                        <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
                                            <Lock className="w-8 h-8 text-violet-400" />
                                        </div>
                                        <p className="font-black text-xl text-gray-800 mb-1">No Staking Positions</p>
                                        <p className="text-sm text-gray-500 mb-6">Start staking B20 tokens to earn passive rewards up to 16% APR.</p>
                                        <Link href="/staking" className="inline-flex items-center gap-2 px-8 py-3 bg-violet-500 hover:bg-violet-600 text-white font-black rounded-xl text-sm transition-all shadow-lg shadow-violet-500/20">
                                            <Lock className="w-4 h-4" /> Start Staking
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {stakes.map((stake, i) => {
                                            const progress = parseFloat(stake.progress_pct) || 0;
                                            const canRelease = stake.is_matured && stake.status === 'active';
                                            const statusColors = {
                                                active: 'text-emerald-600 bg-emerald-50 border-emerald-200',
                                                pending_release: 'text-amber-600 bg-amber-50 border-amber-200 animate-pulse',
                                                released: 'text-blue-600 bg-blue-50 border-blue-200',
                                            };
                                            const statusLabels = { active: '● Active', pending_release: '⏳ Pending Release', released: '✓ Released' };
                                            return (
                                                <motion.div key={stake.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                                    className="bg-white border border-black/8 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden">
                                                    <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500" />
                                                    <div className="p-5">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center text-violet-600 font-black text-lg border border-violet-200">
                                                                    {(stake.token_symbol || '?').slice(0, 2)}
                                                                </div>
                                                                <div>
                                                                    <p className="font-black text-gray-900">{stake.token_name || stake.token_symbol}</p>
                                                                    <p className="text-xs text-gray-400">${stake.token_symbol} · {stake.period_days} days · {stake.apr}% APR</p>
                                                                </div>
                                                            </div>
                                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${statusColors[stake.status] || 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                                                                {statusLabels[stake.status] || stake.status}
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-4 gap-3 mb-4">
                                                            <div className="bg-black/3 rounded-xl p-3 text-center">
                                                                <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Staked</p>
                                                                <p className="text-sm font-black text-gray-900">{parseFloat(stake.amount_tokens).toFixed(2)}</p>
                                                                <p className="text-[9px] text-gray-400">{stake.token_symbol}</p>
                                                            </div>
                                                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                                                                <p className="text-[10px] text-emerald-600 font-bold uppercase mb-0.5">Earned</p>
                                                                <p className="text-sm font-black text-emerald-700">{parseFloat(stake.earned_so_far).toFixed(4)}</p>
                                                                <p className="text-[9px] text-emerald-500">{stake.token_symbol}</p>
                                                            </div>
                                                            <div className="bg-black/3 rounded-xl p-3 text-center">
                                                                <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Expected</p>
                                                                <p className="text-sm font-black text-gray-900">{parseFloat(stake.expected_reward).toFixed(4)}</p>
                                                                <p className="text-[9px] text-gray-400">{stake.token_symbol}</p>
                                                            </div>
                                                            <div className="bg-black/3 rounded-xl p-3 text-center">
                                                                <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Remaining</p>
                                                                <p className="text-sm font-black text-gray-900">{stake.is_matured ? '✅' : `${stake.days_remaining}d`}</p>
                                                                <p className="text-[9px] text-gray-400">{stake.is_matured ? 'Matured' : 'left'}</p>
                                                            </div>
                                                        </div>

                                                        <div className="mb-3">
                                                            <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-1">
                                                                <span>Progress</span>
                                                                <span>{Number(progress).toFixed(1)}%</span>
                                                            </div>
                                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all"
                                                                    style={{ width: `${Math.min(100, progress)}%` }} />
                                                            </div>
                                                            <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
                                                                <span>{new Date(stake.start_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
                                                                <span>{new Date(stake.end_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                            </div>
                                                        </div>

                                                        {canRelease && (
                                                            <button
                                                                onClick={() => {
                                                                    setReleasingStake(stake.id);
                                                                    axios.post(`${API_URL}/staking/request-release`, { stake_id: stake.id, wallet_address: account })
                                                                        .then(() => {
                                                                            alert('✅ Release request submitted! Admin will approve shortly.');
                                                                            setLoadingStakes(true);
                                                                            axios.get(`${API_URL}/staking/my-stakes/${account}`)
                                                                                .then(r => setStakes(Array.isArray(r.data) ? r.data : []))
                                                                                .finally(() => setLoadingStakes(false));
                                                                        })
                                                                        .catch(err => alert('❌ ' + (err.response?.data?.error || err.message)))
                                                                        .finally(() => setReleasingStake(null));
                                                                }}
                                                                disabled={releasingStake === stake.id}
                                                                className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
                                                            >
                                                                {releasingStake === stake.id
                                                                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Submitting…</>
                                                                    : <><Unlock className="w-3 h-3" /> Request Release</>}
                                                            </button>
                                                        )}
                                                        {stake.status === 'pending_release' && (
                                                            <div className="w-full py-2.5 bg-amber-50 border border-amber-200 text-amber-700 font-bold text-xs rounded-xl text-center">
                                                                ⏳ Pending admin approval
                                                            </div>
                                                        )}
                                                        {stake.status === 'released' && (
                                                            <div className="w-full py-2.5 bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs rounded-xl text-center">
                                                                ✅ Released · Payout: {parseFloat(stake.total_payout).toFixed(4)} {stake.token_symbol}
                                                            </div>
                                                        )}
                                                        {stake.status === 'active' && !stake.is_matured && (
                                                            <div className="w-full py-2.5 bg-gray-50 border border-gray-200 text-gray-400 font-bold text-xs rounded-xl text-center flex items-center justify-center gap-2">
                                                                <Lock className="w-3 h-3" /> Locked · {stake.days_remaining} days remaining
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Info Note */}
                                <div className="mt-6 bg-violet-50 border border-violet-200 rounded-2xl p-4 flex items-start gap-3">
                                    <Lock className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-violet-700 leading-relaxed">
                                        <span className="font-black">How releases work:</span> After your lock period ends, click &quot;Request Release&quot;.
                                        The admin will verify and transfer your staked tokens + rewards back to your wallet within 24 hours.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                        {activeTab === 'futures' && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-emerald-500" /> Futures Positions
                                        <span className="ml-1 text-sm font-bold text-gray-400 bg-black/5 px-2 py-0.5 rounded-full">{futuresPositions.length}</span>
                                    </h2>
                                    <Link href="/exchange?mode=pro" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all">
                                        Trade Pro Futures
                                    </Link>
                                </div>

                                <div className="bg-white border border-black/8 rounded-[2rem] shadow-sm p-4 md:p-6 overflow-hidden">
                                    <div className="grid grid-cols-6 text-[9px] font-bold text-gray-400 uppercase tracking-widest p-4 bg-gray-50 rounded-2xl mb-2 items-center">
                                        <div>Time</div>
                                        <div>Pair</div>
                                        <div>Type / Side</div>
                                        <div>Entry Price</div>
                                        <div className="text-right">Amount / PNL</div>
                                        <div className="text-right">Action</div>
                                    </div>
                                    <div className="space-y-3">
                                        {futuresPositions.length > 0 ? (
                                            futuresPositions.map((pos) => (
                                                <div key={pos.id} className={`grid grid-cols-6 text-[10px] font-black text-gray-900 uppercase tracking-widest p-4 border rounded-2xl items-center shadow-sm ${pos.side === 'long' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'}`}>
                                                    <div className="text-gray-400 text-[9px]">{pos.time}</div>
                                                    <div className="flex items-center gap-2">
                                                        <img src={pos.image} className="w-5 h-5 rounded hover:scale-110 transition-transform" /> 
                                                        {pos.tokenSymbol}/BNB
                                                    </div>
                                                    <div>
                                                        <span className={`${pos.side === 'long' ? 'bg-emerald-500 border-emerald-200' : 'bg-rose-500 border-rose-200'} text-white px-3 py-1 rounded border`}>{pos.type} {pos.side} {pos.leverage}x</span>
                                                    </div>
                                                    <div className="font-mono">${Number(pos.price).toLocaleString()}</div>
                                                    <div className={`text-right font-mono ${pos.side === 'long' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        +{pos.size} 
                                                        <span className="block text-[8px] font-bold mt-1 text-emerald-500">+${pos.pnlBase} PNL</span>
                                                    </div>
                                                    <div className="flex justify-end">
                                                        <button onClick={() => closeFuturesPosition(pos.id)} className={`px-3 py-1.5 bg-white border hover:bg-black/5 rounded-lg transition-colors text-[9px] ${pos.side === 'long' ? 'border-emerald-200 text-emerald-600' : 'border-rose-200 text-rose-600'}`}>Close Position</button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 pt-16 pb-12">
                                                <History className="w-8 h-8 text-gray-300 mb-3" />
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">No Active Trades Found</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </>
                )}
            </section>
        </main>
    );
}
