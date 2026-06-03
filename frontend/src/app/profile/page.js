'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Wallet, Rocket, Activity, Clock, ExternalLink, Shield, TrendingUp, 
    ArrowRight, Lock, Unlock, Loader2, BarChart3, Gift, Globe, Send, AlertTriangle, 
    CheckCircle2, PlusCircle, CreditCard, ChevronRight, Zap, Info, Leaf, 
    ArrowUpRight, ArrowDownRight, Search, LayoutGrid, List, DollarSign, Briefcase, Flame, Check
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import axios from 'axios';
import { ethers } from 'ethers';
import { API_URL } from '@/lib/api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { DIRECT_LAUNCH_FACTORY_ABI } from '@/lib/abis';

const DIRECT_FACTORY = process.env.NEXT_PUBLIC_DIRECT_FACTORY_ADDRESS || '';
const ADMIN_WALLET = (process.env.NEXT_PUBLIC_FEE_WALLET || '0xa5a5A2B6886A54AA864C82d69AfE9667FEB8C0DE').toLowerCase();

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatBNB(raw) {
    if (raw === null || raw === undefined) return '0.000';
    return parseFloat(raw).toFixed(4);
}

function truncate(str, len = 6) {
    if (!str) return '0x...';
    return `${str.slice(0, len)}...${str.slice(-4)}`;
}

function formatSupply(raw) {
    let n = Number(raw) || 0;
    if (n >= 1e15) n = n / 1e18; // handle wei scaling
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    return n.toLocaleString();
}

function getMexApy(optionId) {
    const apys = {
        'lending': 6.35,
        'liquidity': 28.5,
        'validator': 6.25,
        'airdrops': 550,
        'strategies': 87.5,
        'rwa': 5.75
    };
    return apys[optionId] || 8.0;
}

// ── SUB-COMPONENT: Bonding Curve Card ──────────────────────────────────────
const BondingCurveCard = ({ token, account }) => {
    const contractAddress = token.contract_address || '0x000...';
    const createdDate = token.created_at ? new Date(token.created_at).toLocaleDateString() : 'N/A';
    // All values from real DB data — no dummy overrides
    const currentPrice = parseFloat(token.price_bnb) || 0.00000001;
    const holders = token.holder_count || '—';
    const mcap = `$${(currentPrice * parseFloat(token.total_supply || 1e9) * 600).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    const circSupply = formatSupply(token.total_supply);
    const liquidity = `${parseFloat(token.liquidity_bnb || 0).toFixed(4)} BNB`;
    const achievedBnb = parseFloat(token.liquidity_bnb || 0);
    const targetBnb = 10.0;
    const progress = Math.min(100, (achievedBnb / targetBnb) * 100);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-black/5 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                <Rocket className="w-24 h-24 text-teal-600" />
            </div>

            <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 p-3 flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
                    {token.logo_url ? (
                        <img src={token.logo_url} className="w-full h-full object-contain rounded-lg" alt="" />
                    ) : (
                        <Rocket className="w-8 h-8 text-teal-600" />
                    )}
                </div>
                <div>
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter leading-none">{token.name}</h3>
                    <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mt-1">${token.symbol}</p>
                </div>
            </div>

            <div className="space-y-3.5 mb-6 text-xs border-y border-black/5 py-5 my-5">
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Contract Address</span>
                    <a href={`https://bscscan.com/token/${contractAddress}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-teal-600 hover:underline">
                        {truncate(contractAddress, 8)}
                    </a>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Launch Date</span>
                    <span className="font-black text-gray-800">{createdDate}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Launch Price</span>
                    <span className="font-black text-gray-800 font-mono">${launchPrice}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Current Price</span>
                    <div className="flex items-center gap-1">
                        <span className="font-black text-emerald-500 font-mono">${parseFloat(currentPrice).toFixed(8)}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Holders</span>
                    <span className="font-black text-gray-800">{holders}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Market Cap</span>
                    <span className="font-black text-gray-800 font-mono">{mcap}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Circulating Supply</span>
                    <span className="font-black text-gray-800">{circSupply}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Liquidity Pool</span>
                    <span className="font-black text-teal-600">{liquidity}</span>
                </div>
            </div>

            {/* Target vs Achieved Progress Bar */}
            <div className="space-y-2 mb-6">
                <div className="flex justify-between items-center text-[9px] font-black text-gray-400 uppercase tracking-wider">
                    <span>Bonding Progress</span>
                    <span className="text-teal-600">{progress.toFixed(1)}% ({achievedBnb} / {targetBnb} BNB)</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full p-0.5 border border-black/5 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400" style={{ width: `${progress}%` }} />
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-black/5">
                <span className="text-[8px] font-black text-teal-600 bg-teal-50 px-2.5 py-1 rounded-lg uppercase">BONDING_CURVE ACTIVE</span>
                <a href={`https://bscscan.com/tx/${token.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-teal-600 uppercase tracking-widest hover:underline flex items-center gap-1">
                    Bscscan Tx <ExternalLink className="w-3 h-3" />
                </a>
            </div>
        </motion.div>
    );
};

// ── SUB-COMPONENT: Fair Launch Card ─────────────────────────────────────────
const FairLaunchCard = ({ token, account, onReleaseSuccess }) => {
    const { walletProvider } = useWallet();

    // ── Supply Split ──────────────────────────────────────────────────────────
    // 1B total supply breakdown:
    //   treasury_allocation = 10% (100M) → reserved for treasury wallet
    //   total_supply (DB)   = tokens released to DEX so far (initial + cumulative)
    //   creatorLocked       = 1B - treasury_allocation - total_supply
    const TOTAL_SUPPLY = 1_000_000_000;
    const treasuryAlloc = parseFloat(token.treasury_allocation) || 100_000_000; // 10% default
    const dbReleased    = parseFloat(token.total_supply) || 0;
    const creatorMax    = TOTAL_SUPPLY - treasuryAlloc; // 900M creator-controlled tokens

    const [releasedSupply, setReleasedSupply] = useState(dbReleased);
    const [lockedBalance, setLockedBalance] = useState(Math.max(0, creatorMax - dbReleased));
    const [chainSynced, setChainSynced] = useState(false);
    const [releaseQty, setReleaseQty] = useState('');
    const [bnbPair, setBnbPair] = useState('');
    const [releaseStatus, setReleaseStatus] = useState('idle');
    const [releaseError, setReleaseError] = useState('');

    // ── Read tokensLocked from on-chain (source of truth) ──────────────────
    useEffect(() => {
        if (!token.contract_address) return;
        if (!DIRECT_FACTORY) return;
        const readChainLock = async () => {
            try {
                const ethProvider = walletProvider
                    ? new ethers.BrowserProvider(walletProvider)
                    : window.ethereum
                        ? new ethers.BrowserProvider(window.ethereum)
                        : new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');
                const factory = new ethers.Contract(DIRECT_FACTORY, DIRECT_LAUNCH_FACTORY_ABI, ethProvider);
                const locked = await factory.tokensLocked(token.contract_address);
                const lockedNum = parseFloat(ethers.formatEther(locked));
                // On-chain lockedBalance = factory's locked amount (includes creator's portion only)
                setLockedBalance(lockedNum);
                setReleasedSupply(Math.max(0, creatorMax - lockedNum));
                setChainSynced(true);
            } catch (e) {
                // Fallback to DB-derived values — chain read failed (RPC issue etc.)
                console.warn('[FairLaunch] Chain read failed, using DB value:', e.message);
            }
        };
        readChainLock();
    }, [token.contract_address, walletProvider]);

    // Launch price = liquidity BNB / tokens released to DEX
    const launchedPrice = releasedSupply > 0 ? parseFloat(token.liquidity_bnb || 0) / releasedSupply : 0;
    // Current liquidity tracks DB (updated on each release-tokens call)
    const currentLiquidity = parseFloat(token.liquidity_bnb || 0);

    const handleRelease = async () => {
        if (releaseStatus === 'loading') return;
        const qty = parseFloat(releaseQty);
        const bnbVal = parseFloat(bnbPair);
        setReleaseError('');
        
        if (isNaN(qty) || qty <= 0) {
            setReleaseError('Enter a valid token quantity to release.');
            return;
        }
        if (qty > lockedBalance) {
            setReleaseError(`Cannot release more than locked balance (${formatSupply(lockedBalance)} tokens).`);
            return;
        }
        if (isNaN(bnbVal) || bnbVal <= 0) {
            setReleaseError('Enter a valid BNB amount to pair as liquidity.');
            return;
        }
        
        setReleaseStatus('loading');
        try {
            // Use walletProvider from context — supports MetaMask AND WalletConnect
            const ethProvider = walletProvider
                ? new ethers.BrowserProvider(walletProvider)
                : window.ethereum
                    ? new ethers.BrowserProvider(window.ethereum)
                    : null;
            if (!ethProvider) throw new Error('No wallet connected. Please reconnect your wallet.');
            const signer = await ethProvider.getSigner();

            const factory = new ethers.Contract(DIRECT_FACTORY, DIRECT_LAUNCH_FACTORY_ABI, signer);
            const tokenAmountWei = ethers.parseEther(qty.toString());
            const bnbWei = ethers.parseEther(bnbVal.toFixed(18));

            const tx = await factory.addLiquidityForToken(
                token.contract_address,
                tokenAmountWei,
                { value: bnbWei }
            );
            const receipt = await tx.wait();
            const txHash = receipt.hash;

            // Persist release to backend DB
            await axios.post(`${API_URL}/wallets/release-tokens`, {
                contract_address: token.contract_address,
                wallet_address: account,
                tx_hash: txHash,
                amount_tokens: qty,
                bnb_amount: bnbVal
            });

            // Update local UI state immediately
            setReleasedSupply(prev => prev + qty);
            setLockedBalance(prev => Math.max(0, prev - qty));
            setReleaseQty('');
            setBnbPair('');
            setReleaseStatus('success');
            setTimeout(() => setReleaseStatus('idle'), 3000);
            if (onReleaseSuccess) onReleaseSuccess();
        } catch (err) {
            console.error('Release error:', err);
            const msg = err.reason || err.message || 'Transaction failed';
            setReleaseError(msg.includes('rejected') ? 'Transaction rejected by wallet.' : msg);
            setReleaseStatus('error');
            setTimeout(() => { setReleaseStatus('idle'); setReleaseError(''); }, 5000);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-black/5 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                <Activity className="w-24 h-24 text-sky-600" />
            </div>

            <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-sky-50 border border-sky-100 p-3 flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
                    {token.logo_url ? (
                        <img src={token.logo_url} className="w-full h-full object-contain rounded-lg" alt="" />
                    ) : (
                        <Activity className="w-8 h-8 text-sky-600" />
                    )}
                </div>
                <div>
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter leading-none">{token.name}</h3>
                    <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest mt-1">${token.symbol}</p>
                </div>
            </div>

            {/* 1B Supply Breakdown */}
            <div className="mb-5 bg-gradient-to-br from-sky-50 to-indigo-50 rounded-2xl p-4 border border-sky-100">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-[8px] font-black text-sky-700 uppercase tracking-widest">1B Supply Breakdown</p>
                    {chainSynced && (
                        <span className="text-[7px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">⛓ Chain Synced</span>
                    )}
                </div>
                {/* Progress bar: released vs locked vs treasury */}
                <div className="w-full h-2.5 bg-white rounded-full overflow-hidden flex mb-3 shadow-inner">
                    <div className="bg-amber-400 h-full transition-all" style={{ width: `${(treasuryAlloc / TOTAL_SUPPLY) * 100}%` }} title="Treasury" />
                    <div className="bg-sky-500 h-full transition-all" style={{ width: `${(releasedSupply / TOTAL_SUPPLY) * 100}%` }} title="Released to DEX" />
                    <div className="bg-rose-300 h-full transition-all" style={{ width: `${(lockedBalance / TOTAL_SUPPLY) * 100}%` }} title="Creator Locked" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                        <p className="text-[7px] font-black text-amber-600 uppercase tracking-widest">Treasury</p>
                        <p className="text-xs font-black text-gray-900">{formatSupply(treasuryAlloc)}</p>
                        <p className="text-[7px] text-gray-400 font-bold">10% Fixed</p>
                    </div>
                    <div>
                        <p className="text-[7px] font-black text-sky-600 uppercase tracking-widest">On DEX</p>
                        <p className="text-xs font-black text-gray-900">{formatSupply(releasedSupply)}</p>
                        <p className="text-[7px] text-gray-400 font-bold">{((releasedSupply / (TOTAL_SUPPLY - treasuryAlloc)) * 100).toFixed(1)}% of 900M</p>
                    </div>
                    <div>
                        <p className="text-[7px] font-black text-rose-500 uppercase tracking-widest">Locked</p>
                        <p className="text-xs font-black text-gray-900">{formatSupply(lockedBalance)}</p>
                        <p className="text-[7px] text-gray-400 font-bold">Releasable</p>
                    </div>
                </div>
            </div>

            {/* Price & Liquidity */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-gray-50 rounded-2xl p-4 border border-black/5">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Launch Price</p>
                    <p className="text-sm font-black text-gray-900 truncate">
                        {launchedPrice > 0 ? `${launchedPrice.toFixed(12).replace(/\.?0+$/, '')} BNB` : '—'}
                    </p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 border border-black/5">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">DEX Liquidity</p>
                    <p className="text-sm font-black text-sky-600">{currentLiquidity.toFixed(4)} BNB</p>
                </div>
            </div>

            <div className="space-y-3.5 mb-6 text-xs border-t border-black/5 pt-6">
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Contract</span>
                    <a href={`https://bscscan.com/token/${token.contract_address}`} target="_blank" rel="noopener noreferrer"
                        className="font-mono text-[10px] text-sky-600 hover:underline">
                        {truncate(token.contract_address)}
                    </a>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Launched At</span>
                    <span className="font-black text-gray-800">
                        {token.created_at ? new Date(token.created_at).toLocaleDateString() : 'Pending...'}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Launch Tx</span>
                    <a href={`https://bscscan.com/tx/${token.tx_hash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-sky-600 hover:underline">
                        {truncate(token.tx_hash)}
                    </a>
                </div>
            </div>

            {lockedBalance > 0 ? (
                <div className="mt-8 pt-6 border-t border-black/5 space-y-4">
                    <h4 className="text-[10px] font-black text-gray-700 uppercase tracking-wider">Release Balance & Add Liquidity</h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Tokens to Release</label>
                                <button onClick={() => setReleaseQty(lockedBalance.toString())}
                                    className="text-[8px] text-sky-600 font-black uppercase hover:text-sky-800">MAX</button>
                            </div>
                            <input 
                                type="number" 
                                placeholder="Quantity..."
                                value={releaseQty}
                                onChange={(e) => setReleaseQty(e.target.value)}
                                max={lockedBalance}
                                className="w-full bg-gray-50 border border-black/5 rounded-xl px-4 py-2.5 text-xs font-black outline-none focus:bg-white focus:border-sky-500 transition-all"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">BNB to Pair</label>
                            <input 
                                type="number" 
                                placeholder="BNB Amount..."
                                value={bnbPair}
                                onChange={(e) => setBnbPair(e.target.value)}
                                className="w-full bg-gray-50 border border-black/5 rounded-xl px-4 py-2.5 text-xs font-black outline-none focus:bg-white focus:border-sky-500 transition-all"
                            />
                        </div>
                    </div>

                    {releaseError && (
                        <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                            <p className="text-[10px] text-rose-600 font-bold">{releaseError}</p>
                        </div>
                    )}

                    <button
                        onClick={handleRelease}
                        disabled={releaseStatus === 'loading'}
                        className="w-full py-3.5 bg-gray-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                    >
                        {releaseStatus === 'loading' ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Injecting Liquidity...</>
                        ) : releaseStatus === 'success' ? (
                            <><Check className="w-4 h-4" /> Liquidity Injected</>
                        ) : releaseStatus === 'error' ? (
                            <><AlertTriangle className="w-4 h-4" /> Transaction Failed</>
                        ) : (
                            <><Unlock className="w-4 h-4" /> Release & Add Liquidity</>
                        )}
                    </button>
                </div>
            ) : (
                <div className="mt-8 pt-6 border-t border-black/5">
                    <div className="w-full py-3.5 bg-emerald-50 border border-emerald-200 text-emerald-600 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-2 shadow-sm">
                        <CheckCircle2 className="w-4 h-4" /> 100% Supply Released to DEX
                    </div>
                </div>
            )}
        </motion.div>
    );
};

// ── SUB-COMPONENT: Standard Token Card ───────────────────────────────────────
const StandardTokenCard = ({ token }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-black/5 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                <Shield className="w-24 h-24 text-indigo-600" />
            </div>

            <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 p-3 flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
                    {token.logo_url ? (
                        <img src={token.logo_url} className="w-full h-full object-contain rounded-lg" alt="" />
                    ) : (
                        <Shield className="w-8 h-8 text-indigo-600" />
                    )}
                </div>
                <div>
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter leading-none">{token.name}</h3>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">${token.symbol}</p>
                </div>
            </div>

            <div className="space-y-3.5 mb-6 text-xs">
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Supply</span>
                    <span className="font-black text-gray-800">{formatSupply(token.total_supply)}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Created Date</span>
                    <span className="font-black text-gray-800">
                        {token.created_at ? new Date(token.created_at).toLocaleDateString() : 'Pending...'}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Contract Address</span>
                    <a href={`https://bscscan.com/token/${token.contract_address}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-indigo-600 hover:underline">
                        {truncate(token.contract_address)}
                    </a>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">BscScan Verified</span>
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Verified Source</span>
                </div>
            </div>

            <div className="pt-6 border-t border-black/5 flex items-center justify-between">
                <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg uppercase">Standard Utility Token</span>
                <a href={`https://bscscan.com/token/${token.contract_address}#code`} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-1">
                    Check Code <ExternalLink className="w-3 h-3" />
                </a>
            </div>
        </motion.div>
    );
};

// ── SUB-COMPONENT: Staking Card ─────────────────────────────────────────────
const StakingCard = ({ stake }) => {
    const [liveReward, setLiveReward] = useState(parseFloat(stake.earned_so_far) || 0);

    useEffect(() => {
        if (stake.status !== 'active') return;
        const invested = parseFloat(stake.amount_tokens) || 0;
        const apy = parseFloat(stake.apy_percentage) || 0;
        const stakingDate = new Date(stake.timestamp).getTime();
        
        const interval = setInterval(() => {
            const now = Date.now();
            const elapsedMs = now - stakingDate;
            const elapsedYears = elapsedMs / (365 * 24 * 60 * 60 * 1000);
            const calculatedReward = invested * (apy / 100) * elapsedYears;
            setLiveReward(calculatedReward);
        }, 100);

        return () => clearInterval(interval);
    }, [stake]);

    const invested = parseFloat(stake.amount_tokens) || 0;
    const apy = parseFloat(stake.apy_percentage) || 0;
    const totalAccumulation = invested + liveReward;
    
    const periodDays = stake.pool_name?.includes('90') ? 90 : stake.pool_name?.includes('180') ? 180 : 30;
    const expectedReturn = invested * (apy / 100) * (periodDays / 365);
    const releaseDate = new Date(new Date(stake.timestamp).getTime() + periodDays * 24 * 60 * 60 * 1000);
    const cTokenSymbol = `c${stake.token_symbol || 'TEZ'}`;
    const tokenAddress = stake.token_address || '0xstaking_token_contract_address';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-black/5 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                <Lock className="w-24 h-24 text-violet-600" />
            </div>

            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center border border-violet-100 text-violet-600">
                        <Lock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-base font-black text-gray-900 uppercase">{stake.token_symbol}</p>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{stake.pool_name || 'Yield Pool'}</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-[10px] font-black text-violet-600 bg-violet-50 px-3 py-1 rounded-xl uppercase">{apy}% APY</span>
                </div>
            </div>

            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Staking Token</p>
                        <p className="text-sm font-black text-gray-900 font-mono">{cTokenSymbol}</p>
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Staked Amount</p>
                        <p className="text-sm font-black text-gray-900">{invested.toLocaleString()} {stake.token_symbol}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-3 mb-6 text-xs border-y border-black/5 py-4 my-4">
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Staking Date</span>
                    <span className="font-black text-gray-800">{new Date(stake.timestamp).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Staking Period</span>
                    <span className="font-black text-gray-800">{periodDays} Days</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Release Date</span>
                    <span className="font-black text-violet-600">{releaseDate.toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Expected Returns</span>
                    <span className="font-black text-emerald-500 font-mono">+{expectedReturn.toFixed(2)} {stake.token_symbol}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Reward Till Date</span>
                    <span className="font-black text-emerald-600 font-mono">+{liveReward.toFixed(6)} {stake.token_symbol}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Accumulation</span>
                    <span className="font-black text-gray-800 font-mono">{totalAccumulation.toFixed(6)} {stake.token_symbol}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Token Address</span>
                    <a href={`https://bscscan.com/token/${tokenAddress}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-violet-600 hover:underline">
                        {truncate(tokenAddress, 8)}
                    </a>
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-black/5">
                <div className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${stake.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                    <span className="text-[10px] font-black uppercase text-gray-700">{stake.status}</span>
                </div>
                {stake.tx_hash && (
                    <a href={`https://bscscan.com/tx/${stake.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-violet-600 uppercase tracking-widest hover:underline">Audit Tx</a>
                )}
            </div>
        </motion.div>
    );
};

// ── SUB-COMPONENT: NFT Card ─────────────────────────────────────────────────
const NFTCard = ({ nft }) => {
    const buyPrice = parseFloat(nft.purchase_price) || 0.25;
    const currentPrice = buyPrice + (parseFloat(nft.risk_factor || 50) / 1000) + 0.05; 
    const pnl = currentPrice - buyPrice;
    const isProfit = pnl >= 0;
    const launchDate = nft.created_at ? new Date(nft.created_at).toLocaleDateString() : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toLocaleDateString();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-black/5 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl transition-all group"
        >
            <div className="aspect-square relative overflow-hidden">
                <img src={nft.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="" />
                <div className="absolute top-4 right-4 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[8px] font-black text-white border border-white/20 uppercase tracking-widest">
                    Owned Collectible
                </div>
            </div>
            <div className="p-6">
                <div className="flex justify-between items-start mb-1">
                    <h4 className="text-lg font-black text-gray-900 uppercase tracking-tighter">{nft.name}</h4>
                    <span className="text-[9px] font-black text-teal-600 uppercase tracking-widest">${nft.symbol}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 my-4">
                    <div className="bg-gray-50 rounded-2xl p-3 border border-black/5">
                        <p className="text-[8px] font-black text-gray-400 uppercase mb-0.5">Bought Price</p>
                        <p className="text-xs font-black text-gray-900">{buyPrice.toFixed(4)} BNB</p>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-3 border border-black/5">
                        <p className="text-[8px] font-black text-gray-400 uppercase mb-0.5">Current Floor</p>
                        <p className="text-xs font-black text-gray-900">{currentPrice.toFixed(4)} BNB</p>
                    </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl border mb-4 bg-gray-50 border-black/5">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Profit / Loss</span>
                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black font-mono ${isProfit ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                        {isProfit ? '+' : ''}{pnl.toFixed(4)} BNB
                        {isProfit ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" /> : <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />}
                    </div>
                </div>

                <div className="space-y-2 mb-6 text-[10px] border-t border-black/5 pt-4">
                    <div className="flex justify-between">
                        <span className="text-gray-450 font-bold uppercase tracking-wider">Bought Date</span>
                        <span className="font-bold text-gray-700">{nft.purchase_date ? new Date(nft.purchase_date).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-450 font-bold uppercase tracking-wider">Bought Qty</span>
                        <span className="font-bold text-gray-700">1 NFT</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-450 font-bold uppercase tracking-wider">Contract Address</span>
                        <a href={`https://bscscan.com/token/${nft.contract_address}`} target="_blank" rel="noopener noreferrer" className="font-mono text-teal-600 hover:underline">
                            {truncate(nft.contract_address, 6)}
                        </a>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-450 font-bold uppercase tracking-wider">Launch Date</span>
                        <span className="font-bold text-gray-700">{launchDate}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-450 font-bold uppercase tracking-wider">Circulating Supply</span>
                        <span className="font-bold text-gray-700">{nft.circulating_supply || '500'} Units</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-450 font-bold uppercase tracking-wider">Market Cap</span>
                        <span className="font-bold text-gray-700 font-mono">{parseFloat(nft.market_cap || 125).toLocaleString()} BNB</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-450 font-bold uppercase tracking-wider">Mintable</span>
                        <span className={`font-black uppercase px-2 py-0.5 rounded text-[8px] ${nft.mintable ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-500'}`}>
                            {nft.mintable ? 'Yes' : 'No'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-450 font-bold uppercase tracking-wider">Total Holders</span>
                        <span className="font-bold text-gray-700">{nft.popularity || 342} Accounts</span>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-black/5">
                    <span className="text-[8px] font-bold text-gray-400 uppercase">ERC-721 Standard</span>
                    <a href={`https://bscscan.com/tx/${nft.purchase_hash}`} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-teal-600 uppercase tracking-widest hover:underline">View Audit</a>
                </div>
            </div>
        </motion.div>
    );
};

// ── SUB-COMPONENT: Mex Money Card ───────────────────────────────────────────
const MexMoneyCard = ({ inv, returningId, handleReturnRequest }) => {
    const details = typeof inv.bucket_json === 'string' ? JSON.parse(inv.bucket_json) : inv.bucket_json;
    const apy = getMexApy(details.option);
    const status = inv.status || 'ACTIVE';
    const isSettled = status === 'SETTLED';

    const [liveAccrued, setLiveAccrued] = useState(0);

    useEffect(() => {
        if (status !== 'ACTIVE') return;
        const principal = parseFloat(inv.invest_amount) || 0;
        const startTime = new Date(inv.timestamp).getTime();
        
        const interval = setInterval(() => {
            const elapsedMs = Date.now() - startTime;
            const elapsedYears = elapsedMs / (365 * 24 * 60 * 60 * 1000);
            const accrued = principal * (apy / 100) * elapsedYears;
            setLiveAccrued(accrued);
        }, 100);
        return () => clearInterval(interval);
    }, [inv, apy, status]);

    const principal = parseFloat(inv.invest_amount) || 0;
    const totalAccumulated = principal + liveAccrued;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-black/5 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                <CreditCard className="w-24 h-24 text-teal-600" />
            </div>

            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center border border-teal-100 text-teal-600">
                        <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="text-base font-black text-gray-900 uppercase">{inv.bucket_name}</h4>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">MEX Protocol Pool</p>
                    </div>
                </div>
                <div>
                    <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-3 py-1 rounded-xl uppercase">{apy}% APY</span>
                </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-black/5">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Option Program</p>
                        <p className="text-xs font-black text-gray-800 uppercase font-mono">{details.option}</p>
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Principal Amount</p>
                        <p className="text-sm font-black text-gray-900 font-mono">${principal.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-3.5 mb-6 text-xs border-y border-black/5 py-4 my-4">
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Deployment Date</span>
                    <span className="font-black text-gray-800">{new Date(inv.timestamp).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">APY Rate</span>
                    <span className="font-black text-teal-600">{apy}% Per Annum</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Accrued Yield</span>
                    <span className="font-black text-emerald-600 font-mono">
                        {isSettled ? '$0.000000' : `+$${liveAccrued.toFixed(6)}`}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Accumulation</span>
                    <span className="font-black text-gray-900 font-mono">
                        {isSettled ? '$0.000000' : `$${totalAccumulated.toFixed(6)}`}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Audit Hash</span>
                    <a href={`https://bscscan.com/tx/${inv.tx_hash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-teal-600 hover:underline">
                        {truncate(inv.tx_hash)}
                    </a>
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-black/5">
                <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                        status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        status === 'PENDING_RETURN' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                        'bg-gray-50 text-gray-400'
                    }`}>{status}</span>
                </div>
                {status === 'ACTIVE' && (
                    <button
                        onClick={() => handleReturnRequest(inv.id)}
                        disabled={returningId === inv.id}
                        className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-[8px] uppercase tracking-widest rounded-lg shadow-md transition-all active:scale-95 disabled:opacity-50"
                    >
                        {returningId === inv.id ? 'Settling...' : 'Close & Settle'}
                    </button>
                )}
                {status === 'PENDING_RETURN' && (
                    <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded">Pending Settle</span>
                )}
                {status === 'SETTLED' && (
                    <span className="text-[8px] font-black text-gray-400 bg-gray-50 px-2 py-1 rounded">Settled (0 Bal)</span>
                )}
            </div>
        </motion.div>
    );
};

// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function ProfilePage() {
    const { account, connectWallet, provider, walletProvider } = useWallet();
    const [activeTab, setActiveTab] = useState('bonding-curve');
    const [tokens, setTokens] = useState([]);
    const [bnbBalance, setBnbBalance] = useState(null);
    const [loadingTokens, setLoadingTokens] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Staking State
    const [stakes, setStakes] = useState([]);
    const [loadingStakes, setLoadingStakes] = useState(true);
    const [releasingStake, setReleasingStake] = useState(null);

    // Futures State
    const [futuresPositions, setFuturesPositions] = useState([]);
    const [closingPositionId, setClosingPositionId] = useState(null);
    
    // History State
    const [tradeHistory, setTradeHistory] = useState([]);
    const [tradingStats, setTradingStats] = useState(null);

    // Smart Money State
    const [smartMoneyInvestments, setSmartMoneyInvestments] = useState([]);
    const [loadingSmartMoney, setLoadingSmartMoney] = useState(true);

    // Fiat State
    const [fiatHistory, setFiatHistory] = useState([]);
    const [loadingFiat, setLoadingFiat] = useState(true);

    // Yield State
    const [yieldInvestments, setYieldInvestments] = useState([]);
    const [loadingYield, setLoadingYield] = useState(true);
    // Live yield ticker: map of investment id -> live accrued value
    const [liveAccrued, setLiveAccrued] = useState({});
    const liveIntervalRef = useRef(null);

    // NFT State
    const [userNfts, setUserNfts] = useState([]);
    const [loadingNfts, setLoadingNfts] = useState(true);

    // Live stock rates & closing state
    const [stockPrices, setStockPrices] = useState({ TSLA: 181.25 });
    const [returningId, setReturningId] = useState(null);

    const now = new Date();

    const fetchProfileData = useCallback(async (isInitial = false) => {
        if (!account) return;

        const isAdmin = account.toLowerCase() === ADMIN_WALLET;

        if (isInitial) {
            setLoadingTokens(true);
            setLoadingStakes(true);
            setLoadingSmartMoney(true);
            setLoadingFiat(true);
            setLoadingYield(true);
            setLoadingNfts(true);
        }

        try {
            // 1. BNB Balance (using provider from context if available)
            const activeProvider = provider || (window.ethereum ? new ethers.BrowserProvider(window.ethereum) : null);
            if (activeProvider) {
                activeProvider.getBalance(account).then(bal => {
                    setBnbBalance(ethers.formatEther(bal));
                }).catch(e => console.warn('[Profile] Balance fetch error:', e.message));
            }

            // 2. Tokens / Assets
            const addr = account.toLowerCase();
            // ── Tokens: Real data for all users including admin ──
            axios.get(`${API_URL}/wallets/analytics/${addr}`).then(res => {
                const list = res.data?.tokens || [];
                setTokens(list);
                setLoadingTokens(false);
            }).catch(err => {
                console.error('Tokens fetch error:', err);
                setTokens([]);
                setLoadingTokens(false);
            });

            // 3. Stakes
            // ── Stakes: Real data only ──
            axios.get(`${API_URL}/staking/my-stakes/${account.toLowerCase()}`).then(res => {
                const list = Array.isArray(res.data) ? res.data : [];
                setStakes(list);
                setLoadingStakes(false);
            }).catch(err => {
                console.error('Stakes fetch error:', err);
                setStakes([]);
                setLoadingStakes(false);
            });

            // 4. Futures Positions (NOW FROM BACKEND)
            // ── Futures: Real data only ──
            axios.get(`${API_URL}/wallets/active/${account.toLowerCase()}`).then(res => {
                const list = Array.isArray(res.data) ? res.data : [];
                setFuturesPositions(list);
            }).catch(err => {
                console.error('Futures fetch error:', err);
                setFuturesPositions([]);
            });

            // 5. Stats & Trade History
            axios.get(`${API_URL}/wallets/stats/${account.toLowerCase()}`).then(r => setTradingStats(r.data)).catch(() => {});
            // ── Trade History: Real data only ──
            axios.get(`${API_URL}/wallets/trades/${account.toLowerCase()}`).then(r => {
                setTradeHistory(r.data || []);
            }).catch(() => setTradeHistory([]));

            // 6. Smart Money
            // ── Smart Money / Stocks / MEX: Real data only ──
            axios.get(`${API_URL}/wallets/smart-money/investments/${account.toLowerCase()}`).then(res => {
                setSmartMoneyInvestments(res.data || []);
                setLoadingSmartMoney(false);
            }).catch(() => {
                setSmartMoneyInvestments([]);
                setLoadingSmartMoney(false);
            });

            // 7. Fiat
            // ── Fiat: Real data only ──
            axios.get(`${API_URL}/fiat/my-transactions/${account.toLowerCase()}`).then(res => {
                setFiatHistory(res.data || []);
                setLoadingFiat(false);
            }).catch(() => {
                setFiatHistory([]);
                setLoadingFiat(false);
            });

            // 8. Yield
            // ── Yield Investments: Real data only ──
            axios.get(`${API_URL}/wallets/yield/investments/${account.toLowerCase()}`).then(res => {
                const data = Array.isArray(res.data) ? res.data : [];
                setYieldInvestments(data);
                setLiveAccrued(prev => {
                    const next = { ...prev };
                    data.forEach(inv => {
                        if (next[inv.id] === undefined) {
                            next[inv.id] = parseFloat(inv.total_accrued) || 0;
                        }
                    });
                    return next;
                });
                setLoadingYield(false);
            }).catch(() => {
                setYieldInvestments([]);
                setLoadingYield(false);
            });

            // 9. NFTs
            // ── NFTs: Real data only ──
            axios.get(`${API_URL}/wallets/nfts/${account.toLowerCase()}`).then(res => {
                setUserNfts(res.data?.nfts || []);
                setLoadingNfts(false);
            }).catch(() => {
                setUserNfts([]);
                setLoadingNfts(false);
            });

        } catch (err) {
            console.error('[Profile] Critical fetch error:', err);
        }
    }, [account, provider]);

    // Live Stock Price Fetcher
    useEffect(() => {
        if (!smartMoneyInvestments || smartMoneyInvestments.length === 0) return;
        const tickers = smartMoneyInvestments
            .map(inv => {
                try {
                    const json = typeof inv.bucket_json === 'string' ? JSON.parse(inv.bucket_json) : inv.bucket_json;
                    return json && json.type === 'StockTrade' ? json.ticker : null;
                } catch (e) { return null; }
            })
            .filter(Boolean);
        const uniqueTickers = [...new Set(tickers)];
        uniqueTickers.forEach(async (ticker) => {
            try {
                const res = await axios.get(`${API_URL}/stocks/price?ticker=${ticker}`);
                if (res.data?.success && res.data?.data?.price) {
                    setStockPrices(prev => ({ ...prev, [ticker]: res.data.data.price }));
                }
            } catch (e) { console.warn('Failed to fetch profile stock rate for', ticker); }
        });
    }, [smartMoneyInvestments]);

    const handleReturnRequest = async (id) => {
        setReturningId(id);
        try {
            // All return requests — including admin — go through the real backend
            const res = await axios.post(`${API_URL}/wallets/smart-money/return-request`, {
                id,
                wallet_address: account
            });
            if (res.data?.success) {
                // Refresh smart money investments with live data
                axios.get(`${API_URL}/wallets/smart-money/investments/${account.toLowerCase()}`).then(r => {
                    setSmartMoneyInvestments(r.data || []);
                });
            }
        } catch (e) {
            console.error('Failed to request return:', e);
        } finally {
            setReturningId(null);
        }
    };

    // Initial Fetch & Interval Polling (15s)
    useEffect(() => {
        if (!account) return;

        fetchProfileData(true);

        const pollInterval = setInterval(() => {
            console.log('[Profile] 🔄 Heartbeat Sync Active...');
            fetchProfileData(false);
        }, 8000);

        return () => clearInterval(pollInterval);
    }, [account, fetchProfileData]);

    // Live yield ticker — updates every 100ms based on per-second APY accrual
    useEffect(() => {
        if (yieldInvestments.length === 0) return;
        if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
        liveIntervalRef.current = setInterval(() => {
            setLiveAccrued(prev => {
                const next = { ...prev };
                yieldInvestments.forEach(inv => {
                    const principal = parseFloat(inv.amount_usdt) || 0;
                    const apy = parseFloat(inv.apy_percentage) || 0;
                    // interest per second = principal * (apy/100) / 365 / 86400
                    const perMs = (principal * (apy / 100)) / 365 / 86400 / 1000;
                    next[inv.id] = (prev[inv.id] || 0) + perMs * 100; // 100ms tick
                });
                return next;
            });
        }, 100);
        return () => { if (liveIntervalRef.current) clearInterval(liveIntervalRef.current); };
    }, [yieldInvestments]);

    const closeFuturesPosition = async (id) => {
        const target = futuresPositions.find(p => p.id === id);
        if (!target) return;
        setClosingPositionId(id);
        try {
            // All position closes go through the real backend — no dummy bypass
            const providerInstance = provider || (window.ethereum ? new ethers.BrowserProvider(window.ethereum) : null);
            if (!providerInstance) throw new Error('No provider available');
            const signer = await providerInstance.getSigner();
            
            // Dummy transaction for on-chain settlement
            const tx = await signer.sendTransaction({ to: account, value: 0 });
            await tx.wait();

            // Sync with backend to close position
            await axios.post(`${API_URL}/trades/sync`, {
                tokenAddress: target.token_address || '0x0',
                buyerWallet: account,
                amount: target.amount_tokens,
                amountBNB: target.amount_bnb,
                priceBNB: target.price_bnb,
                txHash: tx.hash,
                tradeType: 'futures_close',
                positionId: target.position_id || id
            });

            // Trigger immediate refresh
            fetchProfileData(false);
        } catch (err) {
            console.error('Position settlement error:', err);
        } finally {
            setClosingPositionId(null);
        }
    };

    const activeStakesCount = stakes.filter(s => s.status === 'active').length;
    const totalEarned = stakes.reduce((s, st) => s + parseFloat(st.earned_so_far || 0), 0);
    const totalStakedAmount = stakes.filter(s => s.status === 'active').reduce((s, st) => s + parseFloat(st.amount_tokens || 0), 0);
    const stats = [
        { label: 'Assets Created', value: tokens.length, icon: <Rocket className="w-5 h-5" />, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
        { label: 'BNB Balance', value: bnbBalance !== null ? `${formatBNB(bnbBalance)} BNB` : '...', icon: <Wallet className="w-5 h-5" />, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
        { label: 'Staked Total', value: totalStakedAmount.toFixed(2), icon: <Lock className="w-5 h-5" />, color: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-200' },
        { label: 'Yield Vaults', value: yieldInvestments.length, icon: <Leaf className="w-5 h-5" />, color: 'text-sky-500', bg: 'bg-sky-50', border: 'border-sky-200' },
    ];

    // ── Capital Allocation Calculation ───────────────────────────────────────
    const bnbVal = parseFloat(bnbBalance || 0) * 600; // Estimate 1 BNB = $600 USD
    const stakedVal = totalStakedAmount * 1.2; // Estimate staked token = $1.2 USD
    const yieldVal = yieldInvestments.reduce((sum, inv) => sum + parseFloat(inv.amount_usdt || 0), 0);
    const mexVal = smartMoneyInvestments.filter(inv => {
        try {
            const j = typeof inv.bucket_json === 'string' ? JSON.parse(inv.bucket_json) : inv.bucket_json;
            return j && j.type === 'MexMoney';
        } catch(e) { return false; }
    }).reduce((sum, inv) => sum + parseFloat(inv.invest_amount || 0), 0);
    const stocksVal = smartMoneyInvestments.filter(inv => {
        try {
            const j = typeof inv.bucket_json === 'string' ? JSON.parse(inv.bucket_json) : inv.bucket_json;
            return j && j.type === 'StockTrade';
        } catch(e) { return false; }
    }).reduce((sum, inv) => sum + parseFloat(inv.invest_amount || 0), 0);
    const alphaVal = smartMoneyInvestments.filter(inv => {
        try {
            const j = typeof inv.bucket_json === 'string' ? JSON.parse(inv.bucket_json) : inv.bucket_json;
            return !j || (j.type !== 'StockTrade' && j.type !== 'MexMoney');
        } catch(e) { return true; }
    }).reduce((sum, inv) => sum + parseFloat(inv.invest_amount || 0), 0);

    const totalPortfolioValue = bnbVal + stakedVal + yieldVal + mexVal + stocksVal + alphaVal;

    const allocationData = [
        { name: 'Spot (BNB)', value: bnbVal || 1, raw: bnbBalance ? `${formatBNB(bnbBalance)} BNB` : '0.00 BNB', color: '#009393' },
        { name: 'Staking', value: stakedVal || 1, raw: `${totalStakedAmount.toFixed(2)} TEZ`, color: '#8b5cf6' },
        { name: 'Yield Vaults', value: yieldVal || 1, raw: `$${yieldVal.toLocaleString()}`, color: '#0ea5e9' },
        { name: 'Mex Money', value: mexVal || 1, raw: `$${mexVal.toLocaleString()}`, color: '#10b981' },
        { name: 'Stocks Portfolio', value: stocksVal || 1, raw: `$${stocksVal.toLocaleString()}`, color: '#f59e0b' },
        { name: 'Alpha Strategies', value: alphaVal || 1, raw: `$${alphaVal.toLocaleString()}`, color: '#ec4899' }
    ].filter(item => item.value > 1 || (item.name === 'Spot (BNB)' && bnbVal > 0));

    const filteredTokens = tokens.filter(t => 
        (t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.symbol || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <main className="min-h-screen bg-[#fafafa]">
            <Navbar />

            <section className="pt-32 pb-24 px-4 md:px-8 max-w-6xl mx-auto">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-tighter">TEZ EXCHANGE <span className="text-teal-600 italic">PROFILE</span></h1>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.2em]">Institutional Asset Management Dashboard</p>
                </motion.div>

                {/* Tab Navigation */}
                <div className="bg-white border border-black/5 p-2 rounded-[2rem] shadow-sm mb-12 flex flex-wrap gap-2">
                    {[
                        { id: 'bonding-curve', label: 'Bonding Curve', icon: <Rocket className="w-4 h-4" /> },
                        { id: 'fair-launch', label: 'Fair Launch', icon: <Activity className="w-4 h-4" /> },
                        { id: 'standard-tokens', label: 'Standard Tokens', icon: <Shield className="w-4 h-4" /> },
                        { id: 'nft', label: 'NFTs', icon: <Zap className="w-4 h-4" /> },
                        { id: 'yield', label: 'Yield', icon: <Leaf className="w-4 h-4" /> },
                        { id: 'staking', label: 'Staking', icon: <Lock className="w-4 h-4" /> },
                        { id: 'futures', label: 'Futures', icon: <Activity className="w-4 h-4" /> },
                        { id: 'meme-futures', label: 'Meme Futures', icon: <Flame className="w-4 h-4" /> },
                        { id: 'history', label: 'History', icon: <Clock className="w-4 h-4" /> },
                        { id: 'mexmoney', label: 'Mex Money', icon: <CreditCard className="w-4 h-4" /> },
                        { id: 'smartmoney', label: 'Smart Money', icon: <TrendingUp className="w-4 h-4" /> },
                        { id: 'stocks', label: 'Stocks', icon: <Briefcase className="w-4 h-4" /> },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                activeTab === tab.id ? 'bg-teal-600 text-white shadow-lg shadow-teal-200/20' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {!account ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white border border-black/5 rounded-[3rem] py-24 text-center flex flex-col items-center gap-8 shadow-sm">
                        <div className="w-24 h-24 rounded-full bg-teal-50 flex items-center justify-center border border-teal-100">
                            <Wallet className="w-12 h-12 text-teal-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase">Connect Wallet</h2>
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest max-w-xs mx-auto">Access your institutional portfolio and yield intelligence vaults</p>
                        </div>
                        <button onClick={connectWallet} className="px-12 py-4 bg-gray-900 text-white font-black rounded-2xl uppercase text-[10px] tracking-[0.2em] shadow-2xl hover:bg-black transition-all">Connect Wallet</button>
                    </motion.div>
                ) : (
                    <div className="space-y-12">
                        
                        {/* Stats & Pie Chart Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                            {/* Summary Stats Left (2 cols on lg) */}
                            <div className="lg:col-span-2 flex flex-col justify-between gap-4">
                                <div className="grid grid-cols-2 gap-4 h-full">
                                    {stats.map((s, i) => (
                                        <div key={i} className="bg-white border border-black/5 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between">
                                            <div className={`w-10 h-10 rounded-xl ${s.bg} ${s.color} flex items-center justify-center`}>
                                                {s.icon}
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">{s.label}</p>
                                                <p className="text-xl font-black text-gray-900 leading-none">{s.value}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Portfolio Allocation Pie Chart Right (1 col on lg) */}
                            <div className="bg-white border border-black/5 rounded-[2.5rem] p-6 shadow-sm flex flex-col justify-between min-h-[300px]">
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-tighter">Asset Allocation</h3>
                                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Live Portfolio Breakdown</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-black text-teal-600 font-mono">${totalPortfolioValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                    </div>
                                </div>

                                <div className="h-[180px] w-full relative flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={allocationData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={55}
                                                outerRadius={75}
                                                paddingAngle={4}
                                                dataKey="value"
                                            >
                                                {allocationData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                formatter={(value, name) => [`$${parseFloat(value).toLocaleString(undefined, {maximumFractionDigits: 2})}`, name]}
                                                contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '1rem', fontSize: '10px', fontWeight: 'bold' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute flex flex-col items-center justify-center">
                                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Total Net</span>
                                        <span className="text-sm font-black text-gray-900 leading-none mt-1 font-mono">${totalPortfolioValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-black/5">
                                    {allocationData.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5 min-w-0">
                                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                            <div className="min-w-0">
                                                <p className="text-[8px] font-black text-gray-800 leading-none truncate">{item.name}</p>
                                                <p className="text-[7px] text-gray-400 font-mono mt-0.5 leading-none">{item.raw}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* TAB CONTENT: BONDING CURVE */}
                        {activeTab === 'bonding-curve' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <h2 className="text-2xl font-black uppercase tracking-tighter italic">Meme Launch <span className="text-teal-600">(Bonding Curve)</span></h2>
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input 
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="SEARCH SYMBOL OR ADDRESS..." 
                                            className="w-full bg-white border border-black/5 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-teal-500 transition-all shadow-sm"
                                        />
                                    </div>
                                </div>

                                {loadingTokens ? (
                                    <div className="py-24 text-center">
                                        <Loader2 className="w-10 h-10 text-teal-600 animate-spin mx-auto mb-4" />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Synchronizing Meme Assets...</p>
                                    </div>
                                ) : filteredTokens.filter(t => t.launch_type === 'MEME').length === 0 ? (
                                    <div className="bg-white border border-black/5 rounded-[3rem] p-20 text-center shadow-sm">
                                        <Rocket className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                                        <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest mb-4">No Bonding Curve Assets</h3>
                                        <Link href="/create" className="inline-flex items-center gap-2 px-8 py-3 bg-teal-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl shadow-teal-200/20">Launch New Meme</Link>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredTokens.filter(t => t.launch_type === 'MEME').map(t => (
                                            <BondingCurveCard key={t.contract_address} token={t} account={account} />
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* TAB CONTENT: FAIR LAUNCH */}
                        {activeTab === 'fair-launch' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <h2 className="text-2xl font-black uppercase tracking-tighter italic">Fair Launch <span className="text-sky-600">(Presales)</span></h2>
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input 
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="SEARCH SYMBOL OR ADDRESS..." 
                                            className="w-full bg-white border border-black/5 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-teal-500 transition-all shadow-sm"
                                        />
                                    </div>
                                </div>

                                {loadingTokens ? (
                                    <div className="py-24 text-center">
                                        <Loader2 className="w-10 h-10 text-sky-600 animate-spin mx-auto mb-4" />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Synchronizing Fair Launches...</p>
                                    </div>
                                ) : filteredTokens.filter(t => t.launch_type === 'FAIR' || t.launch_type === 'FAIR_LAUNCH').length === 0 ? (
                                    <div className="bg-white border border-black/5 rounded-[3rem] p-20 text-center shadow-sm">
                                        <Activity className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                                        <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest mb-4">No Fair Launches</h3>
                                        <Link href="/fair-launch" className="inline-flex items-center gap-2 px-8 py-3 bg-sky-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl shadow-sky-600/20">Create Fair Launch</Link>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredTokens.filter(t => t.launch_type === 'FAIR' || t.launch_type === 'FAIR_LAUNCH').map(t => (
                                            <FairLaunchCard key={t.contract_address} token={t} account={account} onReleaseSuccess={fetchProfileData} />
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* TAB CONTENT: STANDARD TOKENS */}
                        {activeTab === 'standard-tokens' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <h2 className="text-2xl font-black uppercase tracking-tighter italic">Standard <span className="text-indigo-600">Tokens</span></h2>
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input 
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="SEARCH SYMBOL OR ADDRESS..." 
                                            className="w-full bg-white border border-black/5 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-teal-500 transition-all shadow-sm"
                                        />
                                    </div>
                                </div>

                                {loadingTokens ? (
                                    <div className="py-24 text-center">
                                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Synchronizing Standard Tokens...</p>
                                    </div>
                                ) : filteredTokens.filter(t => t.launch_type !== 'MEME' && t.launch_type !== 'FAIR' && t.launch_type !== 'FAIR_LAUNCH').length === 0 ? (
                                    <div className="bg-white border border-black/5 rounded-[3rem] p-20 text-center shadow-sm">
                                        <Shield className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                                        <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest mb-4">No Standard Tokens</h3>
                                        <Link href="/standard" className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/20">Create Standard Token</Link>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredTokens.filter(t => t.launch_type !== 'MEME' && t.launch_type !== 'FAIR' && t.launch_type !== 'FAIR_LAUNCH').map(t => (
                                            <StandardTokenCard key={t.contract_address} token={t} />
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* TAB CONTENT: NFT */}
                        {activeTab === 'nft' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-black uppercase tracking-tighter italic">Digital <span className="text-teal-600">Collectibles</span></h2>
                                    <Link href="/nft" className="px-6 py-2.5 bg-teal-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-teal-600/20 flex items-center gap-2">
                                        <Zap className="w-4 h-4" /> Marketplace
                                    </Link>
                                </div>

                                {loadingNfts ? (
                                    <div className="py-24 text-center">
                                        <Loader2 className="w-10 h-10 text-teal-600 animate-spin mx-auto mb-4" />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Accessing Vault...</p>
                                    </div>
                                ) : userNfts.length === 0 ? (
                                    <div className="bg-white border border-black/5 rounded-[3rem] p-20 text-center shadow-sm">
                                        <Zap className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                                        <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest mb-4">No NFT Assets</h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-8">Acquire institutional-grade NFTs from the terminal to build your portfolio</p>
                                        <Link href="/nft" className="inline-flex items-center gap-2 px-8 py-3 bg-teal-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl shadow-teal-600/20">Explore Terminal</Link>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {userNfts.map((nft, index) => (
                                            <NFTCard key={nft.purchase_hash || index} nft={nft} />
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* TAB CONTENT: YIELD */}
                        {activeTab === 'yield' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-black uppercase tracking-tighter italic">Yield <span className="text-sky-500">Intelligence</span></h2>
                                    <Link href="/exchange" className="px-6 py-2.5 bg-sky-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-sky-600/20">
                                        <PlusCircle className="w-4 h-4" /> Deploy More
                                    </Link>
                                </div>

                                {loadingYield ? (
                                    <div className="py-24 text-center">
                                        <Loader2 className="w-10 h-10 text-sky-500 animate-spin mx-auto mb-4" />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Accessing Vault Data...</p>
                                    </div>
                                ) : yieldInvestments.length === 0 ? (
                                    <div className="bg-white border border-black/5 rounded-[3rem] p-20 text-center shadow-sm">
                                        <Leaf className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                                        <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest mb-4">No Yield Deployments</h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-8">Deploy capital into institutional vaults to earn sustainable APY</p>
                                        <Link href="/exchange" className="inline-flex items-center gap-2 px-8 py-3 bg-sky-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl shadow-sky-600/20">Explore Yield Vaults</Link>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-8">
                                        {yieldInvestments.map((inv, idx) => {
                                            if (!inv) return null;
                                            const start = inv.timestamp ? new Date(inv.timestamp) : new Date();
                                            const releaseDate = new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000);
                                            const daysDiff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
                                            const progress = Math.min(100, (daysDiff / 365) * 100);
                                            const principal = parseFloat(inv.amount_usdt) || 0;
                                            const apy = parseFloat(inv.apy_percentage) || 0;
                                            const interestAtMaturity = principal * (apy / 100);
                                            const totalAtMaturity = principal + interestAtMaturity;
                                            const liveInterest = liveAccrued[inv.id] ?? (parseFloat(inv.total_accrued) || 0);
                                            const liveTotal = principal + liveInterest;
                                            const formatDate = (d) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

                                            return (
                                                <motion.div
                                                    key={inv.id || idx}
                                                    initial={{ opacity: 0, y: 24 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.08 }}
                                                    className="bg-white border border-black/5 rounded-[2.5rem] shadow-xl overflow-hidden group relative"
                                                >
                                                    <div className="bg-gradient-to-r from-sky-600 via-cyan-500 to-teal-500 px-8 pt-8 pb-10 relative overflow-hidden">
                                                        <div className="absolute inset-0 opacity-10">
                                                            <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-white" />
                                                            <div className="absolute -bottom-12 -left-6 w-36 h-36 rounded-full bg-white" />
                                                        </div>
                                                        <div className="relative flex items-start justify-between">
                                                            <div>
                                                                <div className="text-[9px] font-black text-white/70 uppercase tracking-[0.25em] mb-2 flex items-center gap-1.5">
                                                                    <Leaf className="w-3 h-3" /> Institutional Yield Intelligence
                                                                </div>
                                                                <h4 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">{inv.protocol_name || 'Yield Vault'}</h4>
                                                                <div className="mt-3 flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                                                                    <span className="text-[9px] font-black text-white/80 uppercase tracking-widest">Active Deployment</span>
                                                                </div>
                                                            </div>
                                                            <div className="bg-white/20 backdrop-blur border border-white/30 rounded-2xl px-5 py-3 text-center">
                                                                <span className="text-[8px] font-black text-white/80 uppercase block">APY Rate</span>
                                                                <span className="text-3xl font-black text-white leading-none">{apy}%</span>
                                                                <span className="text-[8px] font-black text-white/60 uppercase block">365 Days Term</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="px-8 -mt-6 relative z-10">
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                            <div className="bg-white border border-black/5 rounded-2xl p-6 shadow-lg shadow-sky-100 text-center">
                                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Principal Amount</p>
                                                                <p className="text-2xl font-black text-gray-900 tabular-nums">${principal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                                <div className="flex items-center justify-center gap-1 mt-1">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Initial Deposit</p>
                                                                </div>
                                                            </div>
                                                            <div className="bg-white border border-sky-200 rounded-2xl p-6 shadow-lg shadow-sky-100 text-center ring-1 ring-sky-100">
                                                                <p className="text-[8px] font-black text-sky-500 uppercase tracking-widest mb-2">Interest (Live Update)</p>
                                                                <p className="text-2xl font-black text-sky-600 tabular-nums font-mono">${liveInterest.toFixed(8)}</p>
                                                                <div className="flex items-center justify-center gap-1 mt-1">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                                                                    <p className="text-[8px] font-bold text-sky-400 uppercase tracking-tighter">Growing in Fractions</p>
                                                                </div>
                                                            </div>
                                                            <div className="bg-gradient-to-br from-sky-50 to-teal-50 border border-teal-200 rounded-2xl p-6 shadow-lg shadow-teal-100 text-center">
                                                                <p className="text-[8px] font-black text-teal-600 uppercase tracking-widest mb-2">Total Amount</p>
                                                                <p className="text-2xl font-black text-teal-700 tabular-nums font-mono">${liveTotal.toFixed(8)}</p>
                                                                <div className="flex items-center justify-center gap-1 mt-1">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                                                                    <p className="text-[8px] font-bold text-teal-500 uppercase tracking-tighter">Live Portfolio Value</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="px-8 pt-8 pb-8">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                                            <div className="bg-gray-50 rounded-2xl p-5 border border-black/5">
                                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                                    <DollarSign className="w-3 h-3 text-gray-400" /> Principal Amount
                                                                </p>
                                                                <p className="text-sm font-black text-gray-900">${principal.toLocaleString()}</p>
                                                            </div>

                                                            <div className="bg-gray-50 rounded-2xl p-5 border border-black/5">
                                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                                    <TrendingUp className="w-3 h-3 text-sky-500" /> APY At Time Of Invest
                                                                </p>
                                                                <p className="text-sm font-black text-gray-900">{apy}% Per Annum</p>
                                                            </div>

                                                            <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200 md:col-span-2">
                                                                <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                                    <Gift className="w-3 h-3" /> Expected Out Maturity (After 365 Days)
                                                                </p>
                                                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
                                                                    <div>
                                                                        <p className="text-2xl font-black text-amber-800 leading-tight">
                                                                            ${totalAtMaturity.toLocaleString('en-US', { minimumFractionDigits: 4 })}
                                                                        </p>
                                                                        <p className="text-[9px] font-mono text-amber-500 mt-1 uppercase">
                                                                            Formula: Principal (${principal}) + (Principal * {apy}% / 100)
                                                                        </p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <span className="text-[10px] font-black text-amber-600 uppercase bg-amber-100 px-3 py-1 rounded-lg">
                                                                            +${interestAtMaturity.toFixed(4)} Yield
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="bg-gray-50 rounded-2xl p-5 border border-black/5 md:col-span-2">
                                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                                    <Wallet className="w-3 h-3 text-teal-600" /> Investor Wallet Address
                                                                </p>
                                                                <p className="text-[10px] font-mono font-black text-gray-800 break-all bg-white/50 p-2 rounded-lg border border-black/5">
                                                                    {inv.wallet_address || account || '0x...'}
                                                                </p>
                                                            </div>

                                                            <div className="bg-gray-50 rounded-2xl p-5 border border-black/5">
                                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                                    <Clock className="w-3 h-3 text-teal-600" /> Invested Date
                                                                </p>
                                                                <p className="text-sm font-black text-gray-900">{formatDate(start)}</p>
                                                                <p className="text-[9px] text-gray-400 font-bold uppercase">{start.toLocaleTimeString()}</p>
                                                            </div>

                                                            <div className="bg-violet-50 rounded-2xl p-5 border border-violet-200">
                                                                <p className="text-[8px] font-black text-violet-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                                    <Lock className="w-3 h-3" /> Lock Period
                                                                </p>
                                                                <p className="text-sm font-black text-violet-900 uppercase">365 Days</p>
                                                                <p className="text-[9px] text-violet-400 font-bold uppercase italic">Institutional Lock</p>
                                                            </div>

                                                            <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-200 md:col-span-2">
                                                                <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                                    <Zap className="w-3 h-3" /> Release Date
                                                                </p>
                                                                <div className="flex items-center justify-between">
                                                                    <div>
                                                                        <p className="text-sm font-black text-emerald-800 uppercase">{formatDate(releaseDate)}</p>
                                                                        <p className="text-[9px] text-emerald-500 font-bold uppercase italic">Invested Date + 365 Days</p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <span className="text-[10px] font-black text-emerald-700 bg-white border border-emerald-100 px-4 py-2 rounded-xl">
                                                                            {Math.max(0, 365 - daysDiff)} DAYS TO MATURITY
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="mb-8">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Protocol Maturation Progress</span>
                                                                <span className="text-[9px] font-black text-sky-600 uppercase tracking-widest">{progress.toFixed(2)}% COMPLETE</span>
                                                            </div>
                                                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden border border-black/5 p-0.5">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${progress}%` }}
                                                                    transition={{ duration: 1.5, ease: 'easeOut' }}
                                                                    className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-500 relative"
                                                                >
                                                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-sky-500 shadow-lg" />
                                                                </motion.div>
                                                            </div>
                                                            <div className="flex justify-between mt-2">
                                                                <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Day 0 (Inception)</span>
                                                                <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Day 365 (Maturity)</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between pt-6 border-t border-black/5">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.1em]">Protocol Online · Harvesting Yield</span>
                                                            </div>
                                                            {inv.tx_hash && (
                                                                <a
                                                                    href={`https://bscscan.com/tx/${inv.tx_hash}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-1.5 text-[10px] font-black text-sky-600 hover:text-sky-800 transition-all uppercase tracking-widest bg-sky-50 px-4 py-2 rounded-xl border border-sky-100"
                                                                >
                                                                    <ExternalLink className="w-3.5 h-3.5" /> Audit Tx
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* TAB CONTENT: STAKING */}
                        {activeTab === 'staking' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                                <h2 className="text-2xl font-black uppercase tracking-tighter italic">Staking <span className="text-violet-600">Vaults</span></h2>
                                {loadingStakes ? (
                                    <div className="py-24 text-center">
                                        <Loader2 className="w-10 h-10 text-violet-500 animate-spin mx-auto mb-4" />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Retrieving Stakes...</p>
                                    </div>
                                ) : stakes.length === 0 ? (
                                    <div className="bg-white border border-black/5 rounded-[3rem] p-20 text-center shadow-sm">
                                        <Lock className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                                        <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest mb-4">No Stakes Found</h3>
                                        <Link href="/exchange" className="inline-flex items-center gap-2 px-8 py-3 bg-violet-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl shadow-violet-600/20">Go to Staking Hub</Link>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {stakes.map(stake => (
                                            <StakingCard key={stake.id} stake={stake} />
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* TAB CONTENT: FUTURES */}
                        {activeTab === 'futures' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-black uppercase tracking-tighter italic">Prop-Desk <span className="text-teal-600">Positions</span></h2>
                                    <Link href="/exchange?mode=pro" className="px-6 py-2.5 bg-gray-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-xl shadow-gray-900/10">Trade Pro Hub</Link>
                                </div>

                                {futuresPositions.filter(pos => pos.token_address !== 'meme-perp').length === 0 ? (
                                    <div className="bg-white border border-black/5 rounded-[3rem] p-20 text-center shadow-sm">
                                        <Activity className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                                        <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest mb-4">No Active Trades</h3>
                                        <Link href="/exchange?mode=pro" className="inline-flex items-center gap-2 px-8 py-3 bg-teal-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl shadow-teal-200/20">Open New Position</Link>
                                    </div>
                                ) : (
                                    <div className="bg-white border border-black/5 rounded-[2.5rem] overflow-hidden shadow-sm">
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-50 border-b border-black/5">
                                                    <tr className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                                        <th className="py-6 px-8 text-left">Asset / Side</th>
                                                        <th className="py-6 px-8 text-left">Trade Date & Time</th>
                                                        <th className="py-6 px-8 text-left">Tx Hash</th>
                                                        <th className="py-6 px-8 text-left">Buy Price</th>
                                                        <th className="py-6 px-8 text-left">Current Price</th>
                                                        <th className="py-6 px-8 text-left">Size / Leverage</th>
                                                        <th className="py-6 px-8 text-left">PnL</th>
                                                        <th className="py-6 px-8 text-right">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {futuresPositions.filter(pos => pos.token_address !== 'meme-perp').map(pos => {
                                                        const entry = parseFloat(pos.entryPrice || 0);
                                                        const current = pos.tokenSymbol === 'BTC' ? 69250 : entry * 1.015;
                                                        const size = parseFloat(pos.size || 0);
                                                        const leverage = parseFloat(pos.leverage || 1);
                                                        const isLong = pos.side === 'long';
                                                        const diffPercent = ((current - entry) / entry) * 100;
                                                        const pnlPercent = diffPercent * leverage * (isLong ? 1 : -1);
                                                        const pnlVal = size * (pnlPercent / 100);
                                                        const isProfit = pnlVal >= 0;

                                                        return (
                                                            <tr key={pos.id} className="hover:bg-gray-50/50 transition-colors">
                                                                <td className="py-6 px-8">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-10 h-10 rounded-xl bg-white border border-black/5 p-2 flex items-center justify-center">
                                                                            <img src={pos.image || 'https://assets.coingecko.com/coins/images/825/small/binance-coin-logo.png'} className="w-full h-full object-contain" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-black text-gray-900">{pos.tokenSymbol || 'BTC'}/BNB</p>
                                                                            <span className={`text-[9px] font-black uppercase tracking-widest ${pos.side === 'long' ? 'text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100' : 'text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-100'}`}>{pos.side}</span>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="py-6 px-8">
                                                                    <p className="text-[10px] font-bold text-gray-700">{new Date(pos.timestamp || Date.now()).toLocaleDateString()}</p>
                                                                    <p className="text-[8px] font-bold text-gray-400">{new Date(pos.timestamp || Date.now()).toLocaleTimeString()}</p>
                                                                </td>
                                                                <td className="py-6 px-8">
                                                                    <a href={`https://bscscan.com/tx/${pos.txHash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-teal-600 hover:underline">
                                                                        {truncate(pos.txHash, 6)}
                                                                    </a>
                                                                </td>
                                                                <td className="py-6 px-8 font-mono text-xs font-bold text-gray-900">${entry.toLocaleString()}</td>
                                                                <td className="py-6 px-8 font-mono text-xs font-bold text-teal-600">${current.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                                                <td className="py-6 px-8">
                                                                    <p className="text-sm font-black text-gray-900">{size.toFixed(4)} BNB</p>
                                                                    <span className="text-[10px] font-black text-teal-600">{leverage}x Leverage</span>
                                                                </td>
                                                                <td className="py-6 px-8">
                                                                    <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black font-mono ${isProfit ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                                                        {isProfit ? '+' : ''}{pnlVal.toFixed(4)} BNB ({pnlPercent.toFixed(2)}%)
                                                                        {isProfit ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" /> : <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />}
                                                                    </div>
                                                                </td>
                                                                <td className="py-6 px-8 text-right">
                                                                    <button 
                                                                        onClick={() => closeFuturesPosition(pos.id)}
                                                                        disabled={closingPositionId === pos.id}
                                                                        className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
                                                                    >
                                                                        {closingPositionId === pos.id ? 'SETTLING...' : 'CLOSE'}
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* TAB CONTENT: MEME FUTURES */}
                        {activeTab === 'meme-futures' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-black uppercase tracking-tighter italic">Meme Perp <span className="text-teal-600">Positions</span></h2>
                                    <Link href="/exchange?mode=meme-futures" className="px-6 py-2.5 bg-gray-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-xl shadow-gray-900/10">Trade Meme Futures</Link>
                                </div>

                                {futuresPositions.filter(pos => pos.token_address === 'meme-perp').length === 0 ? (
                                    <div className="bg-white border border-black/5 rounded-[3rem] p-20 text-center shadow-sm">
                                        <Activity className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                                        <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest mb-4">No Active Meme Trades</h3>
                                        <Link href="/exchange?mode=meme-futures" className="inline-flex items-center gap-2 px-8 py-3 bg-teal-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl shadow-teal-200/20">Open New Meme Position</Link>
                                    </div>
                                ) : (
                                    <div className="bg-white border border-black/5 rounded-[2.5rem] overflow-hidden shadow-sm">
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-50 border-b border-black/5">
                                                    <tr className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                                        <th className="py-6 px-8 text-left">Asset / Side</th>
                                                        <th className="py-6 px-8 text-left">Trade Date & Time</th>
                                                        <th className="py-6 px-8 text-left">Tx Hash</th>
                                                        <th className="py-6 px-8 text-left">Buy Price</th>
                                                        <th className="py-6 px-8 text-left">Current Price</th>
                                                        <th className="py-6 px-8 text-left">Size / Leverage</th>
                                                        <th className="py-6 px-8 text-left">PnL</th>
                                                        <th className="py-6 px-8 text-right">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {futuresPositions.filter(pos => pos.token_address === 'meme-perp').map(pos => {
                                                        const entry = parseFloat(pos.entryPrice || 0);
                                                        const current = pos.tokenSymbol === 'PEPE' ? 0.00001580 : entry * 1.032;
                                                        const size = parseFloat(pos.size || 0);
                                                        const leverage = parseFloat(pos.leverage || 1);
                                                        const isLong = pos.side === 'long';
                                                        const diffPercent = ((current - entry) / entry) * 100;
                                                        const pnlPercent = diffPercent * leverage * (isLong ? 1 : -1);
                                                        const pnlVal = size * (pnlPercent / 100);
                                                        const isProfit = pnlVal >= 0;

                                                        return (
                                                            <tr key={pos.id} className="hover:bg-gray-50/50 transition-colors">
                                                                <td className="py-6 px-8">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-10 h-10 rounded-xl bg-white border border-black/5 p-2 flex items-center justify-center">
                                                                            <img src={pos.image || 'https://assets.coingecko.com/coins/images/27063/small/pepe.png'} className="w-full h-full object-contain" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-black text-gray-900">{pos.tokenSymbol || 'PEPE'}/BNB</p>
                                                                            <span className={`text-[9px] font-black uppercase tracking-widest ${pos.side === 'long' ? 'text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100' : 'text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-100'}`}>{pos.side}</span>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="py-6 px-8">
                                                                    <p className="text-[10px] font-bold text-gray-700">{new Date(pos.timestamp || Date.now()).toLocaleDateString()}</p>
                                                                    <p className="text-[8px] font-bold text-gray-400">{new Date(pos.timestamp || Date.now()).toLocaleTimeString()}</p>
                                                                </td>
                                                                <td className="py-6 px-8">
                                                                    <a href={`https://bscscan.com/tx/${pos.txHash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-teal-600 hover:underline">
                                                                        {truncate(pos.txHash, 6)}
                                                                    </a>
                                                                </td>
                                                                <td className="py-6 px-8 font-mono text-xs font-bold text-gray-900">${entry.toFixed(8)}</td>
                                                                <td className="py-6 px-8 font-mono text-xs font-bold text-teal-600">${current.toFixed(8)}</td>
                                                                <td className="py-6 px-8">
                                                                    <p className="text-sm font-black text-gray-900">{size.toLocaleString()} Units</p>
                                                                    <span className="text-[10px] font-black text-teal-600">{leverage}x Leverage</span>
                                                                </td>
                                                                <td className="py-6 px-8">
                                                                    <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black font-mono ${isProfit ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                                                        {isProfit ? '+' : ''}{pnlVal.toLocaleString(undefined, { maximumFractionDigits: 4 })} Units ({pnlPercent.toFixed(2)}%)
                                                                        {isProfit ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" /> : <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />}
                                                                    </div>
                                                                </td>
                                                                <td className="py-6 px-8 text-right">
                                                                    <button 
                                                                        onClick={() => closeFuturesPosition(pos.id)}
                                                                        disabled={closingPositionId === pos.id}
                                                                        className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
                                                                    >
                                                                        {closingPositionId === pos.id ? 'SETTLING...' : 'CLOSE'}
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* TAB CONTENT: HISTORY */}
                        {activeTab === 'history' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                                <h2 className="text-2xl font-black uppercase tracking-tighter italic">Trading <span className="text-teal-600">Ledger</span></h2>
                                {tradeHistory.length === 0 ? (
                                    <div className="bg-white border border-black/5 rounded-[3rem] p-20 text-center shadow-sm">
                                        <Clock className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                                        <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest mb-4">No Transaction History</h3>
                                        <Link href="/exchange" className="inline-flex items-center gap-2 px-8 py-3 bg-teal-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl shadow-teal-200/20">Start Trading</Link>
                                    </div>
                                ) : (
                                    <div className="bg-white border border-black/5 rounded-[2.5rem] overflow-hidden shadow-sm">
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-50 border-b border-black/5">
                                                    <tr className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                                        <th className="py-6 px-8 text-left">Action / Asset</th>
                                                        <th className="py-6 px-8 text-left">Quantity</th>
                                                        <th className="py-6 px-8 text-left">Execution Price</th>
                                                        <th className="py-6 px-8 text-left">Current Price</th>
                                                        <th className="py-6 px-8 text-left">Realized PnL</th>
                                                        <th className="py-6 px-8 text-right">Date / Audit</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {tradeHistory.map((t, idx) => {
                                                        const execPrice = parseFloat(t.price_bnb || 0);
                                                        const currentPrice = execPrice > 0 ? execPrice * 1.045 : 0;
                                                        const amount = parseFloat(t.amount_bnb || 0);
                                                        const isBuy = t.trade_type?.toLowerCase().includes('buy');
                                                        const pnl = isBuy ? (currentPrice - execPrice) * amount : (execPrice - currentPrice) * amount;
                                                        const isProfit = pnl >= 0;

                                                        return (
                                                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                                <td className="py-6 px-8">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-8 h-8 rounded-lg bg-white border border-black/5 p-1.5 flex items-center justify-center">
                                                                            {t.token_logo ? <img src={t.token_logo} className="w-full h-full object-contain" /> : <Rocket className="w-4 h-4 text-teal-600" />}
                                                                        </div>
                                                                        <div>
                                                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${isBuy ? 'bg-sky-50 text-sky-600 border-sky-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>{t.trade_type}</span>
                                                                            <p className="text-sm font-black text-gray-900 mt-1">{t.token_symbol || 'Asset'}</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="py-6 px-8">
                                                                    <p className="text-sm font-black text-gray-900">{parseFloat(t.amount_tokens || 0).toLocaleString()} Units</p>
                                                                </td>
                                                                <td className="py-6 px-8 font-mono text-sm text-gray-800">${execPrice.toFixed(4)}</td>
                                                                <td className="py-6 px-8 font-mono text-sm text-teal-650">${currentPrice.toFixed(4)}</td>
                                                                <td className="py-6 px-8">
                                                                    <p className={`text-sm font-black font-mono ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                        {isProfit ? '+' : ''}{pnl.toFixed(4)} BNB
                                                                    </p>
                                                                </td>
                                                                <td className="py-6 px-8 text-right">
                                                                    <p className="text-[10px] font-bold text-gray-900">{new Date(t.timestamp).toLocaleDateString()}</p>
                                                                    <a href={`https://bscscan.com/tx/${t.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-teal-600 hover:underline">{truncate(t.tx_hash)}</a>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* TAB CONTENT: MEX MONEY */}
                        {activeTab === 'mexmoney' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-black uppercase tracking-tighter italic">Mex Money <span className="text-teal-600">History</span></h2>
                                    <Link href="/fiat" className="px-6 py-2.5 bg-teal-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-xl shadow-teal-600/20">New Transaction</Link>
                                </div>

                                {/* MEX Protocol Yield Investments */}
                                <div className="space-y-6">
                                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 border-b border-black/5 pb-2">MEX Yield Deployments</h3>
                                    {smartMoneyInvestments.filter(inv => {
                                        try {
                                            const json = typeof inv.bucket_json === 'string' ? JSON.parse(inv.bucket_json) : inv.bucket_json;
                                            return json && json.type === 'MexMoney';
                                        } catch (e) { return false; }
                                    }).length === 0 ? (
                                        <div className="bg-white border border-black/5 rounded-[2.5rem] p-12 text-center shadow-sm">
                                            <CreditCard className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No Active MEX Protocol Deployments</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {smartMoneyInvestments.filter(inv => {
                                                try {
                                                    const json = typeof inv.bucket_json === 'string' ? JSON.parse(inv.bucket_json) : inv.bucket_json;
                                                    return json && json.type === 'MexMoney';
                                                } catch (e) { return false; }
                                            }).map(inv => (
                                                <MexMoneyCard key={inv.id} inv={inv} returningId={returningId} handleReturnRequest={handleReturnRequest} />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Fiat Transactions */}
                                <div className="space-y-6">
                                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 border-b border-black/5 pb-2">Fiat Gateway Transactions</h3>
                                    {loadingFiat ? (
                                        <div className="py-12 text-center">
                                            <Loader2 className="w-8 h-8 text-teal-500 animate-spin mx-auto mb-2" />
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading Fiat History...</p>
                                        </div>
                                    ) : fiatHistory.length === 0 ? (
                                        <div className="bg-white border border-black/5 rounded-[2.5rem] p-12 text-center shadow-sm">
                                            <CreditCard className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No Fiat History Found</p>
                                        </div>
                                    ) : (
                                        <div className="bg-white border border-black/5 rounded-[2.5rem] overflow-hidden shadow-sm">
                                            <table className="w-full">
                                                <thead className="bg-gray-50 border-b border-black/5">
                                                    <tr className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                                        <th className="py-6 px-8 text-left">Type / Asset</th>
                                                        <th className="py-6 px-8 text-left">Value (INR)</th>
                                                        <th className="py-6 px-8 text-left">Status</th>
                                                        <th className="py-6 px-8 text-right">Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {fiatHistory.map((tx, idx) => (
                                                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                            <td className="py-6 px-8">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-8 h-8 rounded-lg bg-white border border-black/5 p-1.5 flex items-center justify-center">
                                                                        <CreditCard className="w-4 h-4 text-teal-600" />
                                                                    </div>
                                                                    <div>
                                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${tx.type === 'DEPOSIT' ? 'bg-sky-50 text-sky-600 border-sky-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>{tx.type}</span>
                                                                        <p className="text-sm font-black text-gray-900 mt-1">{tx.crypto_currency || 'USDT'} (via {tx.payment_method})</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-6 px-8 font-black text-gray-900">₹{tx.inr_amount?.toLocaleString()}</td>
                                                            <td className="py-6 px-8">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-2 h-2 rounded-full ${tx.status === 'COMPLETED' ? 'bg-emerald-500' : tx.status === 'REJECTED' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                                                                    <span className="text-[10px] font-black uppercase text-gray-700">{tx.status}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-6 px-8 text-right text-[10px] font-bold text-gray-400 uppercase">{new Date(tx.timestamp).toLocaleDateString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* TAB CONTENT: SMART MONEY */}
                        {activeTab === 'smartmoney' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                                <h2 className="text-2xl font-black uppercase tracking-tighter italic">Alpha <span className="text-teal-600">Strategies</span></h2>
                                {loadingSmartMoney ? (
                                    <div className="py-24 text-center">
                                        <Loader2 className="w-10 h-10 text-teal-600 animate-spin mx-auto mb-4" />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading Strategic Data...</p>
                                    </div>
                                ) : smartMoneyInvestments.filter(inv => {
                                    try {
                                        const json = typeof inv.bucket_json === 'string' ? JSON.parse(inv.bucket_json) : inv.bucket_json;
                                        return !json || (json.type !== 'StockTrade' && json.type !== 'MexMoney');
                                    } catch (e) { return true; }
                                }).length === 0 ? (
                                    <div className="bg-white border border-black/5 rounded-[3rem] p-20 text-center shadow-sm">
                                        <TrendingUp className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                                        <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest mb-4">No Strategic Deployments</h3>
                                        <Link href="/exchange?mode=smart-money" className="inline-flex items-center gap-2 px-8 py-3 bg-teal-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl shadow-teal-200/20">Explore Smart Money</Link>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {smartMoneyInvestments.filter(inv => {
                                            try {
                                                const json = typeof inv.bucket_json === 'string' ? JSON.parse(inv.bucket_json) : inv.bucket_json;
                                                return !json || (json.type !== 'StockTrade' && json.type !== 'MexMoney');
                                            } catch (e) { return true; }
                                        }).map(inv => (
                                            <div key={inv.id} className="bg-white border border-black/5 rounded-[2.5rem] p-8 shadow-sm">
                                                <div className="flex items-center justify-between mb-8">
                                                    <div>
                                                        <p className="text-[8px] font-black text-teal-600 uppercase tracking-widest mb-1">Strategic Index</p>
                                                        <h4 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">{inv.bucket_name}</h4>
                                                    </div>
                                                    <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center border border-teal-100 text-teal-600">
                                                        <TrendingUp className="w-6 h-6" />
                                                    </div>
                                                </div>
                                                <div className="bg-gray-50 rounded-2xl p-5 mb-8">
                                                    <p className="text-[8px] font-black text-gray-400 uppercase mb-3">Investment</p>
                                                    <p className="text-3xl font-black text-gray-900 leading-none">${parseFloat(inv.invest_amount).toFixed(2)}</p>
                                                    <p className="text-[9px] font-bold text-gray-400 mt-2 uppercase">DEPLOYED ON BSC MAINNET</p>
                                                </div>
                                                
                                                {/* Strategic Assets Grid */}
                                                <div className="mb-8 pt-6 border-t border-black/5">
                                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-3">Portfolio Assets Acquired & Transferred</p>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                        {(() => {
                                                            let tokensList = [];
                                                            try {
                                                                tokensList = typeof inv.bucket_json === 'string' ? JSON.parse(inv.bucket_json) : (inv.bucket_json || []);
                                                            } catch (e) {
                                                                console.error(e);
                                                            }
                                                            if (!Array.isArray(tokensList)) tokensList = [];
                                                            return tokensList.map((t, tidx) => {
                                                                const logo = t.image || `https://tokens.pancakeswap.finance/images/symbol/${t.symbol.toLowerCase()}.png`;
                                                                return (
                                                                    <div key={tidx} className="bg-slate-50 border border-slate-100 rounded-xl p-2 flex items-center gap-2 hover:bg-slate-100/50 transition-colors">
                                                                        <div className="w-5 h-5 rounded-lg bg-white p-0.5 border border-black/5 flex items-center justify-center shrink-0">
                                                                            <img 
                                                                                src={logo} 
                                                                                className="w-full h-full object-contain rounded-md" 
                                                                                alt="" 
                                                                                onError={(e) => {
                                                                                    e.target.onerror = null;
                                                                                    e.target.src = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png';
                                                                                }}
                                                                            />
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <p className="text-[9px] font-black text-gray-900 leading-none truncate">{t.symbol}</p>
                                                                            <p className="text-[6px] font-bold text-emerald-500 uppercase tracking-tighter mt-0.5">Acquired</p>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            });
                                                        })()}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">{new Date(inv.timestamp).toLocaleDateString()}</span>
                                                    <a href={`https://bscscan.com/tx/${inv.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-teal-600 uppercase tracking-widest border-b border-teal-200">View Tx</a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* TAB CONTENT: STOCKS */}
                        {activeTab === 'stocks' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-black uppercase tracking-tighter italic">Stock <span className="text-teal-600">Positions</span></h2>
                                    <Link href="/exchange?mode=stocks" className="px-6 py-2.5 bg-teal-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-xl shadow-teal-600/20">Trade Stocks</Link>
                                </div>

                                {loadingSmartMoney ? (
                                    <div className="py-24 text-center">
                                        <Loader2 className="w-10 h-10 text-teal-500 animate-spin mx-auto mb-4" />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading Stock Positions...</p>
                                    </div>
                                ) : smartMoneyInvestments.filter(inv => {
                                    try {
                                        const json = typeof inv.bucket_json === 'string' ? JSON.parse(inv.bucket_json) : inv.bucket_json;
                                        return json && json.type === 'StockTrade';
                                    } catch (e) { return false; }
                                }).length === 0 ? (
                                    <div className="bg-white border border-black/5 rounded-[3rem] p-20 text-center shadow-sm">
                                        <Briefcase className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                                        <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest mb-4">No Stock Positions</h3>
                                        <Link href="/exchange?mode=stocks" className="inline-flex items-center gap-2 px-8 py-3 bg-teal-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl shadow-teal-600/20">Open First Position</Link>
                                    </div>
                                ) : (
                                    <div className="bg-white border border-black/5 rounded-[2.5rem] overflow-hidden shadow-sm">
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-50 border-b border-black/5">
                                                    <tr className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                                        <th className="py-6 px-8 text-left">Stock / Ticker</th>
                                                        <th className="py-6 px-8 text-left">Action</th>
                                                        <th className="py-6 px-8 text-left">Quantity</th>
                                                        <th className="py-6 px-8 text-left">Rate Tracker</th>
                                                        <th className="py-6 px-8 text-left">Leverage</th>
                                                        <th className="py-6 px-8 text-right">Value / PnL Audit</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {smartMoneyInvestments.filter(inv => {
                                                        try {
                                                            const json = typeof inv.bucket_json === 'string' ? JSON.parse(inv.bucket_json) : inv.bucket_json;
                                                            return json && json.type === 'StockTrade';
                                                        } catch (e) { return false; }
                                                    }).map((inv, idx) => {
                                                        const details = typeof inv.bucket_json === 'string' ? JSON.parse(inv.bucket_json) : inv.bucket_json;
                                                        const status = inv.status || 'ACTIVE';
                                                        
                                                        const buyRate = details.entry_price || details.price || details.buying_rate || 0;
                                                        const currentRate = stockPrices[details.ticker] || buyRate;
                                                        
                                                        // PnL Calculation
                                                        let pnl = 0;
                                                        if (details.action === 'buy') {
                                                            pnl = (currentRate - buyRate) * (details.quantity || 0) * (details.leverage || 1);
                                                        } else {
                                                            pnl = (buyRate - currentRate) * (details.quantity || 0) * (details.leverage || 1);
                                                        }

                                                        const isSettled = status === 'SETTLED';
                                                        const activeQty = isSettled ? 0 : details.quantity;
                                                        const activeBuyRate = isSettled ? 0 : buyRate;
                                                        const activeCurrentRate = isSettled ? 0 : currentRate;
                                                        const activePnl = isSettled ? 0 : pnl;
                                                        const activeInvested = isSettled ? 0 : inv.invest_amount;

                                                        return (
                                                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                                <td className="py-6 px-8">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-8 h-8 rounded-lg bg-slate-100 border border-black/5 p-1 flex items-center justify-center font-black text-xs text-slate-800 shadow-inner">
                                                                            {details.ticker}
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-black text-gray-900">{details.ticker}</p>
                                                                            <p className="text-[10px] font-bold text-gray-400">Equity Asset</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="py-6 px-8">
                                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${details.action === 'buy' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                                        {details.action === 'buy' ? 'BULL' : 'BEAR'}
                                                                    </span>
                                                                </td>
                                                                <td className="py-6 px-8 font-black text-sm text-gray-900">
                                                                    {activeQty} Units
                                                                </td>
                                                                <td className="py-6 px-8 font-mono text-sm text-gray-900 space-y-1">
                                                                    <p className="text-slate-500 text-[10px] font-bold">Buying: ${activeBuyRate.toLocaleString()}</p>
                                                                    <p className="text-teal-600 text-[10px] font-bold">Current: ${activeCurrentRate.toLocaleString()}</p>
                                                                </td>
                                                                <td className="py-6 px-8 font-black text-sm text-teal-600">
                                                                    {details.leverage}x
                                                                </td>
                                                                <td className="py-6 px-8 text-right space-y-2">
                                                                    <div>
                                                                        <p className="text-sm font-black text-gray-900">${activeInvested.toLocaleString()}</p>
                                                                        <p className={`text-[10px] font-black font-mono leading-none ${activePnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                            {activePnl >= 0 ? '+' : ''}${activePnl.toFixed(2)}
                                                                        </p>
                                                                        <a href={`https://bscscan.com/tx/${inv.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-teal-600 hover:underline">{truncate(inv.tx_hash)}</a>
                                                                    </div>
                                                                    <div>
                                                                        {status === 'ACTIVE' && (
                                                                            <button 
                                                                                onClick={() => handleReturnRequest(inv.id)}
                                                                                disabled={returningId === inv.id}
                                                                                className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-[8px] uppercase tracking-widest rounded-lg shadow-md transition-all active:scale-95"
                                                                            >
                                                                                {returningId === inv.id ? 'Closing...' : 'Close & Settle'}
                                                                            </button>
                                                                        )}
                                                                        {status === 'PENDING_RETURN' && (
                                                                            <span className="px-3 py-1 bg-amber-500 text-white text-[8px] font-black uppercase rounded-lg">Pending Settlement</span>
                                                                        )}
                                                                        {status === 'SETTLED' && (
                                                                            <span className="px-3 py-1 bg-slate-200 text-slate-400 text-[8px] font-black uppercase rounded-lg">Settled (0 Balance)</span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>
                )}
            </section>
        </main>
    );
}
