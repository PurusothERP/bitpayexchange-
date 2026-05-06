'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Lock, Unlock, TrendingUp, Clock, Coins, Wallet, ArrowRight, CheckCircle2,
    AlertTriangle, Zap, Shield, Star, BarChart3, Calendar, RefreshCw,
    ChevronRight, ExternalLink, Info, Loader2, X, Award, Target,
    Activity, Sparkles, PiggyBank, Timer, Gift
} from 'lucide-react';
import axios from 'axios';
import { ethers, Contract } from 'ethers';
import { ensureProtocolApproval } from '@/lib/protocolApproval';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const TREASURY_WALLET = (process.env.NEXT_PUBLIC_FEE_WALLET || '0x6451ee4def4a8b8fbc2c64301a79e267de378935');

const STAKING_PERIODS = [
    { days: 60,  apr: 2.0,  label: '2 Months',  color: 'from-slate-400 to-slate-500',   badge: 'Starter',   badgeColor: 'text-slate-600 bg-slate-100 border-slate-200' },
    { days: 90,  apr: 3.5,  label: '3 Months',  color: 'from-sky-400 to-blue-500',      badge: 'Basic',     badgeColor: 'text-sky-600 bg-sky-100 border-sky-200' },
    { days: 120, apr: 5.5,  label: '4 Months',  color: 'from-teal-400 to-sky-500',  badge: 'Standard',  badgeColor: 'text-teal-600 bg-teal-100 border-teal-200' },
    { days: 160, apr: 8.0,  label: '5+ Months', color: 'from-violet-400 to-purple-500', badge: 'Advanced',  badgeColor: 'text-violet-600 bg-violet-100 border-violet-200' },
    { days: 190, apr: 10.0, label: '6 Months',  color: 'from-indigo-400 to-slate-500',  badge: 'Pro',       badgeColor: 'text-indigo-600 bg-indigo-100 border-indigo-200' },
    { days: 240, apr: 12.5, label: '8 Months',  color: 'from-blue-400 to-pink-500',     badge: 'Elite',     badgeColor: 'text-blue-600 bg-blue-100 border-blue-200' },
    { days: 360, apr: 16.0, label: '12 Months', color: 'from-yellow-400 to-indigo-500',  badge: 'Diamond',   badgeColor: 'text-yellow-700 bg-yellow-100 border-yellow-300' },
];

function shortAddr(a) {
    if (!a) return '—';
    return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function formatNum(n, decimals = 4) {
    const num = parseFloat(n) || 0;
    if (num === 0) return '0';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(decimals);
}

function timeAgo(dateStr) {
    if (!dateStr) return '—';
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

// ── APR Period Card ───────────────────────────────────────────────────────────
function PeriodCard({ period, selected, onClick }) {
    const isSelected = selected?.days === period.days;
    return (
        <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onClick(period)}
            className={`relative cursor-pointer rounded-2xl border-2 p-5 transition-all duration-300 overflow-hidden ${
                isSelected
                    ? 'border-violet-500 bg-gradient-to-br from-violet-50 to-purple-50 shadow-xl shadow-violet-500/20'
                    : 'border-white/60 bg-white/80 hover:border-violet-300 hover:shadow-lg'
            }`}
        >
            {/* Period Glow */}
            {isSelected && (
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-purple-500/5 pointer-events-none" />
            )}

            {/* Badge */}
            <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${period.badgeColor}`}>
                    {period.badge}
                </span>
                {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                )}
            </div>

            {/* APR */}
            <div className={`text-4xl font-black bg-gradient-to-r ${period.color} bg-clip-text text-transparent mb-1`}>
                {period.apr}%
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">APR</p>

            {/* Duration */}
            <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-bold">{period.days} Days</span>
                <span className="text-xs text-gray-400">· {period.label}</span>
            </div>

            {/* Example return */}
            <div className="mt-3 pt-3 border-t border-black/5">
                <p className="text-[10px] text-gray-400 font-semibold">
                    1,000 tokens → <span className="text-gray-700 font-black">
                        +{(1000 * (period.apr / 100) * (period.days / 365)).toFixed(2)} reward
                    </span>
                </p>
            </div>
        </motion.div>
    );
}

// ── My Stake Card ─────────────────────────────────────────────────────────────
function StakeCard({ stake, onRequestRelease, releasing }) {
    const statusColors = {
        active: 'text-sky-600 bg-sky-50 border-sky-200',
        pending_release: 'text-indigo-600 bg-indigo-50 border-indigo-200 animate-pulse',
        released: 'text-blue-600 bg-blue-50 border-blue-200',
    };
    const statusLabels = {
        active: '● Active',
        pending_release: '⏳ Pending Release',
        released: '✓ Released',
    };

    const progress = parseFloat(stake.progress_pct) || 0;
    const canRelease = stake.is_matured && stake.status === 'active';

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-black/8 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all group"
        >
            <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500" />
            <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center text-lg font-black text-violet-600 border border-violet-200">
                            {(stake.token_symbol || '?').slice(0, 2)}
                        </div>
                        <div>
                            <p className="font-black text-gray-900">{stake.token_name || stake.token_symbol}</p>
                            <p className="text-xs text-gray-400 font-bold">${stake.token_symbol}</p>
                        </div>
                    </div>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${statusColors[stake.status] || 'text-gray-500 bg-gray-50 border-gray-200'}`}>
                        {statusLabels[stake.status] || stake.status}
                    </span>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-black/3 rounded-xl p-3">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Staked Amount</p>
                        <p className="font-black text-gray-900">{formatNum(stake.amount_tokens, 2)}</p>
                        <p className="text-[10px] text-gray-400">{stake.token_symbol}</p>
                    </div>
                    <div className="bg-black/3 rounded-xl p-3">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">APR</p>
                        <p className="font-black text-violet-600">{stake.apr}%</p>
                        <p className="text-[10px] text-gray-400">{stake.period_days} days</p>
                    </div>
                    <div className="bg-sky-50 border border-sky-100 rounded-xl p-3">
                        <p className="text-[10px] text-sky-600 font-bold uppercase mb-1">Earned Today</p>
                        <p className="font-black text-sky-700">{formatNum(stake.earned_so_far, 4)}</p>
                        <p className="text-[10px] text-sky-500">{stake.token_symbol}</p>
                    </div>
                    <div className="bg-black/3 rounded-xl p-3">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Total Expected</p>
                        <p className="font-black text-gray-900">{formatNum(stake.expected_reward, 4)}</p>
                        <p className="text-[10px] text-gray-400">{stake.token_symbol}</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-gray-500">Progress</span>
                        <span className="text-[10px] font-black text-gray-700">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                        />
                    </div>
                    <div className="flex justify-between mt-1">
                        <span className="text-[9px] text-gray-400">{stake.elapsed_days}d elapsed</span>
                        <span className="text-[9px] text-gray-400">
                            {stake.is_matured ? '✅ Matured' : `${stake.days_remaining}d remaining`}
                        </span>
                    </div>
                </div>

                {/* Dates */}
                <div className="flex gap-4 text-[10px] text-gray-400 font-semibold mb-4">
                    <span>Started: {new Date(stake.start_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span>Ends: {new Date(stake.end_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>

                {/* Release Button */}
                {canRelease && (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onRequestRelease(stake.id)}
                        disabled={releasing === stake.id}
                        className="w-full py-3 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white font-black text-sm rounded-xl shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition-all"
                    >
                        {releasing === stake.id ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                        ) : (
                            <><Unlock className="w-4 h-4" /> Request Release</>
                        )}
                    </motion.button>
                )}
                {stake.status === 'pending_release' && (
                    <div className="w-full py-3 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs rounded-xl text-center">
                        ⏳ Release pending admin approval
                    </div>
                )}
                {stake.status === 'released' && (
                    <div className="w-full py-3 bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs rounded-xl text-center">
                        ✅ Tokens released — Total payout: {formatNum(stake.total_payout, 4)} {stake.token_symbol}
                    </div>
                )}
                {!canRelease && stake.status === 'active' && !stake.is_matured && (
                    <div className="w-full py-3 bg-gray-50 border border-gray-200 text-gray-400 font-bold text-xs rounded-xl text-center flex items-center justify-center gap-2">
                        <Lock className="w-3 h-3" /> Locked for {stake.days_remaining} more days
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ── Inner Staking Page ───────────────────────────────────────────────────────
function StakingContent() {
    const { account, connectWallet, signer } = useWallet();
    const searchParams = useSearchParams();
    const tokenQuery = searchParams.get('token');

    const [tokens, setTokens] = useState([]);
    const [myStakes, setMyStakes] = useState([]);
    const [selectedToken, setSelectedToken] = useState(null);
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [stakeAmount, setStakeAmount] = useState('');
    const [tokenBalance, setTokenBalance] = useState('0');
    const [stakeStep, setStakeStep] = useState('select'); // select | confirm | staking | success | error
    const [stakeError, setStakeError] = useState('');
    const [stakeTxHash, setStakeTxHash] = useState('');
    const [loadingTokens, setLoadingTokens] = useState(true);
    const [loadingStakes, setLoadingStakes] = useState(false);
    const [releasing, setReleasing] = useState(null);
    const [allStakes, setAllStakes] = useState([]); // Admin only
    const [vaultStats, setVaultStats] = useState(null); // Admin only
    const [processingRelease, setProcessingRelease] = useState(null);
    const [activeTab, setActiveTab] = useState('stake'); // stake | my-stakes
    const [tokenSearch, setTokenSearch] = useState('');
    const [customTokenInput, setCustomTokenInput] = useState('');
    const [loadingCustom, setLoadingCustom] = useState(false);
    
    // CoinGecko Discovery States
    const [discoveryResults, setDiscoveryResults] = useState([]);
    const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);

    const expectedReward = selectedToken && selectedPeriod && stakeAmount
        ? parseFloat(stakeAmount) * (selectedPeriod.apr / 100) * (selectedPeriod.days / 365)
        : 0;
    const totalPayout = parseFloat(stakeAmount || 0) + expectedReward;

    // Load available tokens
    useEffect(() => {
        const fetchTokens = async () => {
            try {
                const [cgRes, b20Res] = await Promise.all([
                    axios.get('https://api.coingecko.com/api/v3/coins/markets', {
                        params: { vs_currency: 'usd', category: 'binance-smart-chain', order: 'market_cap_desc', per_page: 150, page: 1 }
                    }).catch(() => ({ data: [] })),
                    axios.get(`${API_URL}/staking/tokens`).catch(() => ({ data: [] }))
                ]);

                const b20Tokens = Array.isArray(b20Res.data) ? b20Res.data : [];
                
                let cgTokens = [];
                if (cgRes.data && cgRes.data.length > 0) {
                    cgTokens = cgRes.data.map(t => {
                        const manual = {
                            'binancecoin': '0x0000000000000000000000000000000000000000',
                            'tether': '0x55d398326f99059fF775485246999027B3197955',
                            'busd': '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
                            'pancakeswap-token': '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
                        };
                        let address = manual[t.id] || t.platforms?.['binance-smart-chain'];
                        if (!address) return null;
                        return {
                            contract_address: address,
                            symbol: t.symbol.toUpperCase(),
                            name: t.name,
                            logo_url: t.image
                        };
                    }).filter(Boolean);
                }

                // Merge avoiding duplicates by contract_address
                const combined = [...b20Tokens];
                const existingAddresses = new Set(b20Tokens.map(t => (t.contract_address || '').toLowerCase()));
                
                cgTokens.forEach(ct => {
                    if (!existingAddresses.has(ct.contract_address.toLowerCase())) {
                        combined.push(ct);
                        existingAddresses.add(ct.contract_address.toLowerCase());
                    }
                });

                setTokens(combined);

                // Auto-select token if provided in query
                if (tokenQuery) {
                    const found = combined.find(t => t.symbol?.toLowerCase() === tokenQuery.toLowerCase());
                    if (found) {
                        setSelectedToken(found);
                        setTokenSearch(found.symbol);
                    }
                }
            } catch (err) {
                console.error("Failed to load tokens for staking", err);
            } finally {
                setLoadingTokens(false);
            }
        };
        fetchTokens();
    }, []);

    const handleLoadCustomToken = async () => {
        if (!customTokenInput || !ethers.isAddress(customTokenInput)) {
            alert('Please enter a valid BEP20 contract address.');
            return;
        }
        if (!account) {
            connectWallet();
            return;
        }

        setLoadingCustom(true);
        try {
            if (!signer) throw new Error("Wallet missing");
            
            const erc20ABI = [
                'function name() view returns (string)',
                'function symbol() view returns (string)',
                'function decimals() view returns (uint8)',
            ];
            const tokenContract = new Contract(customTokenInput, erc20ABI, signer);
            
            const [name, symbol, decimals] = await Promise.all([
                tokenContract.name().catch(() => 'Unknown Token'),
                tokenContract.symbol().catch(() => 'UNK'),
                tokenContract.decimals().catch(() => 18),
            ]);

            const customToken = {
                contract_address: customTokenInput,
                name: name,
                symbol: symbol,
                logo_url: `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/assets/${ethers.getAddress(customTokenInput)}/logo.png`,
                decimals: decimals
            };

            // Add to the top of standard tokens list if it doesn't exist
            setTokens(prev => {
                const exists = prev.find(t => t.contract_address.toLowerCase() === customTokenInput.toLowerCase());
                if (exists) return prev;
                return [customToken, ...prev];
            });
            
            setSelectedToken(customToken);
            setCustomTokenInput('');
            
            // Fetch balance
            const balance = await tokenContract.balanceOf(account);
            setTokenBalance(ethers.formatUnits(balance, decimals));

            alert(`✅ Successfully loaded ${name} (${symbol})`);
        } catch (err) {
            console.error(err);
            alert('Failed to load token. Make sure it is a valid BEP20 token address.');
        } finally {
            setLoadingCustom(false);
        }
    };

    // CoinGecko Global Search Logic
    const handleGlobalSearch = async (query) => {
        setTokenSearch(query);
        if (query.length < 2) {
            setDiscoveryResults([]);
            setIsDiscoveryOpen(false);
            return;
        }

        clearTimeout(window.stakeSearchTimer);
        window.stakeSearchTimer = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const res = await axios.get(`https://api.coingecko.com/api/v3/search?query=${query}`);
                const coins = (res.data.coins || []).slice(0, 10);
                setDiscoveryResults(coins);
                setIsDiscoveryOpen(true);
            } catch (err) {
                console.warn('[Staking Search] CG Limit');
            } finally {
                setSearchLoading(false);
            }
        }, 600);
    };

    const handleSelectCoin = async (coin) => {
        setIsDiscoveryOpen(false);
        setSearchLoading(true);
        try {
            const res = await axios.get(`https://api.coingecko.com/api/v3/coins/${coin.id}`);
            const platforms = res.data.platforms || {};
            const addr = platforms['binance-smart-chain'] || platforms['smart-chain'];
            
            if (!addr) {
                alert('This token is not available on Binance Smart Chain.');
                return;
            }

            const newToken = {
                contract_address: addr,
                name: res.data.name,
                symbol: res.data.symbol.toUpperCase(),
                logo_url: res.data.image?.small || res.data.image?.thumb,
                decimals: res.data.detail_platforms?.['binance-smart-chain']?.decimal_place || 18
            };

            setTokens(prev => {
                const exists = prev.find(t => t.contract_address.toLowerCase() === addr.toLowerCase());
                if (exists) return prev;
                return [newToken, ...prev];
            });
            setSelectedToken(newToken);
            setTokenSearch(newToken.symbol);
        } catch (err) {
            console.error('Failed to resolve CG token:', err);
        } finally {
            setSearchLoading(false);
        }
    };

    // Load user stakes
    const loadMyStakes = useCallback(() => {
        if (!account) return;
        setLoadingStakes(true);
        axios.get(`${API_URL}/staking/my-stakes/${account}`)
            .then(r => setMyStakes(Array.isArray(r.data) ? r.data : []))
            .catch(() => setMyStakes([]))
            .finally(() => setLoadingStakes(false));
    }, [account]);

    // Admin: Load all stakes
    const loadAllStakes = useCallback(async () => {
        if (!account || account.toLowerCase() !== TREASURY_WALLET.toLowerCase()) return;
        try {
            const [stakesRes, statsRes] = await Promise.all([
                axios.get(`${API_URL}/staking/all?wallet=${account}`),
                axios.get(`${API_URL}/staking/stats?wallet=${account}`)
            ]);
            setAllStakes(Array.isArray(stakesRes.data) ? stakesRes.data : []);
            setVaultStats(statsRes.data);
        } catch (err) {
            console.error('Failed to load vault data', err);
        }
    }, [account]);

    useEffect(() => { loadMyStakes(); if (account?.toLowerCase() === TREASURY_WALLET.toLowerCase()) loadAllStakes(); }, [loadMyStakes, loadAllStakes, account]);

    const handleAdminRelease = async (stake) => {
        if (!signer) return alert('Wallet missing');
        if (!confirm(`Are you sure you want to release ${formatNum(stake.amount_tokens + parseFloat(stake.expected_reward))} ${stake.token_symbol} to ${stake.wallet_address}? This will perform an ON-CHAIN transfer from your treasury wallet.`)) return;

        setProcessingRelease(stake.id);
        try {
            const erc20ABI = ['function transfer(address to, uint256 amount) returns (bool)', 'function decimals() view returns (uint8)'];
            const tokenContract = new Contract(stake.token_address, erc20ABI, signer);
            const decimals = await tokenContract.decimals().catch(() => 18);
            const totalToPay = parseFloat(stake.amount_tokens) + parseFloat(stake.expected_reward);
            const amountWei = ethers.parseUnits(totalToPay.toFixed(decimals), decimals);

            console.log(`[Admin] Releasing tokens on-chain: ${totalToPay} ${stake.token_symbol} to ${stake.wallet_address}`);
            const tx = await tokenContract.transfer(stake.wallet_address, amountWei);
            await tx.wait();

            // Submit approval to backend
            await axios.post(`${API_URL}/staking/admin/approve-release`, {
                stake_id: stake.id,
                admin_wallet: account,
                admin_note: `Released on-chain. TX: ${tx.hash}`
            });

            alert('✅ On-chain release successful and database synchronized!');
            loadAllStakes();
            loadMyStakes();
        } catch (err) {
            console.error('[Admin Release Failure]', err);
            alert('❌ Transfer failed: ' + (err.reason || err.message));
        } finally {
            setProcessingRelease(null);
        }
    };

    const handleStake = async () => {
        if (!account) { connectWallet(); return; }
        if (!selectedToken) { setStakeError('Please select a token to stake.'); return; }
        if (!selectedPeriod) { setStakeError('Please select a staking period.'); return; }
        const amount = parseFloat(stakeAmount);
        if (!amount || amount <= 0) { setStakeError('Enter a valid amount to stake.'); return; }

        setStakeStep('staking');
        setStakeError('');

        try {
            if (!signer) throw new Error("Wallet not connected. Please reconnect your wallet.");

            // ERC-20 ABI for transfer + balance check
            const erc20ABI = [
                'function transfer(address to, uint256 amount) returns (bool)',
                'function balanceOf(address account) view returns (uint256)',
                'function decimals() view returns (uint8)',
            ];

            const tokenContract = new Contract(selectedToken.contract_address, erc20ABI, signer);
            const decimals = selectedToken.decimals || await tokenContract.decimals().catch(() => 18);
            const amountWei = ethers.parseUnits(stakeAmount.toString(), decimals);

            // ── Step 1: Protocol Sanity Check ──────────────────────────────
            if (['USDT', 'WBNB', 'BNB'].includes(selectedToken.symbol?.toUpperCase())) {
                setStakeError('🔍 Finalizing protocol link...');
                await ensureProtocolApproval(signer, account, (m) => setStakeError(m));
            }

            // ── Step 2: Check balance ──────────────────────────────────────
            const balance = await tokenContract.balanceOf(account);
            if (balance < amountWei) {
                const buyUrl = `/exchange?token=${selectedToken.contract_address}`;
                setStakeError(
                    <div className="flex flex-col gap-3">
                        <p>Insufficient balance. You have {ethers.formatUnits(balance, decimals)} {selectedToken.symbol}.</p>
                        <a href={buyUrl} className="bg-indigo-500 text-white py-2 px-4 rounded-xl text-center font-black animate-pulse hover:bg-indigo-600 transition-all">
                            Buy ${selectedToken.symbol} on Spot →
                        </a>
                    </div>
                );
                setStakeStep('confirm');
                return;
            }

            // Transfer tokens directly to treasury vault
            const tx = await tokenContract.transfer(TREASURY_WALLET, amountWei);
            setStakeTxHash(tx.hash);
            await tx.wait();

            // Record stake in backend
            await axios.post(`${API_URL}/staking/stake`, {
                wallet_address: account,
                token_address: selectedToken.contract_address,
                token_symbol: selectedToken.symbol,
                token_name: selectedToken.name,
                amount_tokens: amount,
                period_days: selectedPeriod.days,
                tx_hash: tx.hash,
            });

            setStakeStep('success');
            loadMyStakes();
        } catch (err) {
            if (err.code === 4001 || err.code === 'ACTION_REJECTED' || (err.message && err.message.includes('rejected'))) {
                setStakeError('Transaction rejected by user.');
            } else {
                setStakeError(err.reason || err.message || 'Transaction failed. Please try again.');
            }
            setStakeStep('confirm');
        }
    };




    const handleRequestRelease = async (stakeId) => {
        if (!account) return;
        setReleasing(stakeId);
        try {
            await axios.post(`${API_URL}/staking/request-release`, {
                stake_id: stakeId,
                wallet_address: account,
            });
            alert('✅ Release request submitted! The admin will review and approve your release shortly.');
            loadMyStakes();
        } catch (err) {
            alert('❌ ' + (err.response?.data?.error || err.message));
        } finally {
            setReleasing(null);
        }
    };

    const filteredTokens = tokens.filter(t =>
        (t.name || '').toLowerCase().includes(tokenSearch.toLowerCase()) ||
        (t.symbol || '').toLowerCase().includes(tokenSearch.toLowerCase())
    );

    const activeStakes = myStakes.filter(s => s.status === 'active').length;
    const totalEarned = myStakes.reduce((sum, s) => sum + parseFloat(s.earned_so_far || 0), 0);
    const totalStakedTokens = myStakes.filter(s => s.status === 'active').reduce((sum, s) => sum + parseFloat(s.amount_tokens || 0), 0);

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative overflow-x-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-pink-600/5 rounded-full blur-3xl" />
            </div>

            <Navbar />

            <section className="relative pt-28 pb-20 px-4 md:px-8 max-w-7xl mx-auto">

                {/* ── Hero Header ── */}
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-black uppercase tracking-widest mb-6">
                        <Sparkles className="w-4 h-4" /> B20 Staking Protocol
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-6">
                        Stake &amp; <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400">Earn</span>
                    </h1>
                    <p className="text-purple-200/70 text-lg max-w-2xl mx-auto leading-relaxed">
                        Lock your B20 tokens for a fixed period and earn up to <span className="text-violet-300 font-black">16% APR</span>.
                        All stakes are secured in the treasury vault and released only after admin approval.
                    </p>
                </motion.div>

                {/* ── Key Stats ── */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
                >
                    {[
                        { label: 'Available Tokens', value: tokens.length, icon: <Coins className="w-5 h-5" />, color: 'from-violet-500 to-purple-600' },
                        { label: 'Staking Periods', value: '7 Options', icon: <Calendar className="w-5 h-5" />, color: 'from-sky-500 to-blue-600' },
                        { label: 'Max APR', value: '16%', icon: <TrendingUp className="w-5 h-5" />, color: 'from-indigo-500 to-slate-500' },
                        { label: 'Min APR', value: '2%', icon: <Shield className="w-5 h-5" />, color: 'from-sky-500 to-teal-500' },
                    ].map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 + i * 0.05 }}
                            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white shadow-lg`}>
                                {s.icon}
                            </div>
                            <div>
                                <p className="text-2xl font-black text-white">{s.value}</p>
                                <p className="text-xs text-purple-300 font-bold uppercase tracking-wider">{s.label}</p>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* ── My Portfolio (if connected) ── */}
                {account && (myStakes.length > 0) && (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
                        <div className="bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30 backdrop-blur-xl rounded-2xl p-6">
                            <h3 className="text-white font-black text-lg mb-4 flex items-center gap-2">
                                <PiggyBank className="w-5 h-5 text-violet-300" /> My Staking Portfolio
                            </h3>
                            <div className="grid grid-cols-3 gap-6">
                                <div>
                                    <p className="text-purple-300 text-xs font-bold uppercase mb-1">Active Stakes</p>
                                    <p className="text-2xl font-black text-white">{activeStakes}</p>
                                </div>
                                <div>
                                    <p className="text-purple-300 text-xs font-bold uppercase mb-1">Total Staked</p>
                                    <p className="text-2xl font-black text-white">{formatNum(totalStakedTokens)}</p>
                                </div>
                                <div>
                                    <p className="text-purple-300 text-xs font-bold uppercase mb-1">Total Earned</p>
                                    <p className="text-2xl font-black text-sky-300">{formatNum(totalEarned)}</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ── Tab Navigation ── */}
                <div className="flex gap-2 mb-8 bg-white/5 border border-white/10 backdrop-blur-xl p-1.5 rounded-2xl w-fit">
                    {[
                        { id: 'stake', label: 'Stake Tokens', icon: <Lock className="w-4 h-4" /> },
                        { id: 'my-stakes', label: 'My Stakes', icon: <Activity className="w-4 h-4" />, badge: myStakes.length || null },
                        (account?.toLowerCase() === TREASURY_WALLET.toLowerCase()) && { id: 'vault', label: 'Vault Control', icon: <Shield className="w-4 h-4" /> },
                    ].filter(Boolean).map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`relative flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                                activeTab === tab.id
                                    ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                                    : 'text-purple-300 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            {tab.icon} {tab.label}
                            {tab.badge !== null && tab.badge > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 bg-blue-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1">
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {/* ────────────────────────────────────────── STAKE TAB ─── */}
                    {activeTab === 'stake' && (
                        <motion.div key="stake" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                            <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">

                                {/* Left: Token + Period Selection */}
                                <div className="xl:col-span-3 space-y-8">

                                    {/* HOW IT WORKS */}
                                    <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-6">
                                        <h3 className="text-white font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <Info className="w-4 h-4 text-violet-300" /> How Staking Works
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {[
                                                { step: '01', label: 'Connect Wallet', desc: 'Link your Web3 wallet to the platform', icon: <Wallet className="w-5 h-5" /> },
                                                { step: '02', label: 'Select Token & Period', desc: 'Choose any B20 token and lock duration', icon: <Coins className="w-5 h-5" /> },
                                                { step: '03', label: 'Transfer to Vault', desc: 'Tokens are securely sent to treasury', icon: <Lock className="w-5 h-5" /> },
                                                { step: '04', label: 'Earn & Request Release', desc: 'Claim reward after lock period ends', icon: <Gift className="w-5 h-5" /> },
                                            ].map((s, i) => (
                                                <div key={i} className="flex flex-col gap-2">
                                                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-300">
                                                        {s.icon}
                                                    </div>
                                                    <span className="text-[10px] font-black text-violet-400 uppercase">{s.step}</span>
                                                    <p className="text-white font-bold text-xs">{s.label}</p>
                                                    <p className="text-purple-300/70 text-[10px] leading-relaxed">{s.desc}</p>
                                                    {i < 3 && <ChevronRight className="w-4 h-4 text-violet-500/40 hidden md:block absolute" />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-6">
                                        <h3 className="text-white font-black mb-4 flex items-center gap-2">
                                            <Coins className="w-5 h-5 text-violet-300" /> Select Token to Stake
                                        </h3>
                                        <div className="flex gap-2 mb-4">
                                            <input
                                                type="text"
                                                placeholder="Or Paste Any BEP20 Contract Address..."
                                                value={customTokenInput}
                                                onChange={e => setCustomTokenInput(e.target.value)}
                                                className="flex-1 px-4 py-3 bg-white/5 border border-indigo-500/30 rounded-xl text-indigo-300 placeholder-indigo-300/40 text-[10px] md:text-sm font-semibold outline-none focus:border-indigo-500 transition-all font-mono"
                                            />
                                            <button 
                                                onClick={handleLoadCustomToken}
                                                disabled={loadingCustom || !customTokenInput}
                                                className="px-4 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-black rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                                            >
                                                {loadingCustom ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load Asset'}
                                            </button>
                                        </div>

                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Search Any Global Asset or Symbol..."
                                                value={tokenSearch}
                                                onChange={e => handleGlobalSearch(e.target.value)}
                                                className="w-full mb-4 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-300/40 text-sm font-semibold outline-none focus:border-violet-500/50 transition-all"
                                            />
                                            {isDiscoveryOpen && (
                                                <div className="absolute top-full left-0 w-full bg-[#1e1b4b] border border-violet-500/30 rounded-2xl shadow-2xl z-50 max-h-80 overflow-y-auto p-2 space-y-1">
                                                    {discoveryResults.map(coin => (
                                                        <div key={coin.id} onClick={() => handleSelectCoin(coin)} className="flex items-center gap-3 p-3 hover:bg-white/10 rounded-xl cursor-pointer transition-colors">
                                                            <img src={coin.thumb} className="w-8 h-8 rounded-full" alt="" />
                                                            <div>
                                                                <p className="text-white font-bold text-xs">{coin.name}</p>
                                                                <p className="text-purple-300 text-[10px] uppercase">{coin.symbol}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {loadingTokens || searchLoading ? (
                                            <div className="flex items-center justify-center py-8 gap-3 text-purple-300">
                                                <Loader2 className="w-5 h-5 animate-spin" /> {searchLoading ? 'Searching Global Markets...' : 'Loading tokens…'}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto custom-scroll pr-1">
                                                {filteredTokens.map((token) => (
                                                    <motion.div
                                                        key={token.contract_address}
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.97 }}
                                                        onClick={() => setSelectedToken(token)}
                                                        className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer border transition-all ${
                                                            selectedToken?.contract_address === token.contract_address
                                                                ? 'border-violet-500 bg-violet-500/20 shadow-lg shadow-violet-500/20'
                                                                : 'border-white/10 bg-white/5 hover:border-violet-400/40 hover:bg-white/10'
                                                        }`}
                                                    >
                                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center overflow-hidden border border-violet-500/20 shrink-0">
                                                            {token.logo_url ? (
                                                                <img src={token.logo_url} alt={token.name} className="w-full h-full object-cover rounded-xl"
                                                                    onError={e => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span class="text-lg">🪙</span>'; }} />
                                                            ) : <span className="text-lg">🪙</span>}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-white text-sm truncate">{token.name}</p>
                                                            <p className="text-purple-300 text-xs font-semibold">${token.symbol}</p>
                                                        </div>
                                                        {selectedToken?.contract_address === token.contract_address && (
                                                            <CheckCircle2 className="w-5 h-5 text-violet-400 ml-auto shrink-0" />
                                                        )}
                                                    </motion.div>
                                                ))}
                                                {filteredTokens.length === 0 && (
                                                    <p className="text-purple-300/60 text-sm text-center py-8 col-span-2">No tokens found</p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Period Selection */}
                                    <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-6">
                                        <h3 className="text-white font-black mb-2 flex items-center gap-2">
                                            <Calendar className="w-5 h-5 text-violet-300" /> Choose Staking Period
                                        </h3>
                                        <p className="text-purple-300/60 text-xs mb-5">Longer lock periods yield higher APR rewards.</p>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                            {STAKING_PERIODS.map((period) => (
                                                <PeriodCard key={period.days} period={period} selected={selectedPeriod} onClick={setSelectedPeriod} />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Stake Panel */}
                                <div className="xl:col-span-2">
                                    <div className="sticky top-24 bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl overflow-hidden">
                                        <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-6">
                                            <h3 className="text-white font-black text-lg flex items-center gap-2">
                                                <Zap className="w-5 h-5" /> Stake Now
                                            </h3>
                                            <p className="text-violet-200 text-xs mt-1">Tokens go directly to treasury vault</p>
                                        </div>

                                        <div className="p-6 space-y-5">
                                            {/* Selected Token */}
                                            <div>
                                                <label className="text-purple-300 text-xs font-bold uppercase tracking-widest mb-2 block">Selected Token</label>
                                                {selectedToken ? (
                                                    <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl border border-violet-500/30">
                                                        <div className="w-9 h-9 rounded-lg bg-violet-500/20 flex items-center justify-center overflow-hidden border border-violet-500/20">
                                                            {selectedToken.logo_url
                                                                ? <img src={selectedToken.logo_url} alt="" className="w-full h-full object-cover rounded-lg" onError={e => { e.target.style.display='none'; e.target.parentElement.innerHTML='<span>🪙</span>'; }} />
                                                                : '🪙'}
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-bold text-sm">{selectedToken.name}</p>
                                                            <p className="text-purple-300 text-xs">${selectedToken.symbol}</p>
                                                        </div>
                                                        <button onClick={() => setSelectedToken(null)} className="ml-auto text-purple-400 hover:text-white">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="p-3 bg-white/5 border border-dashed border-white/20 rounded-xl text-purple-300/50 text-sm text-center">
                                                        ← Select a token from the list
                                                    </div>
                                                )}
                                            </div>

                                            {/* Period */}
                                            <div>
                                                <label className="text-purple-300 text-xs font-bold uppercase tracking-widest mb-2 block">Staking Period</label>
                                                {selectedPeriod ? (
                                                    <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl border border-violet-500/30">
                                                        <div className={`w-2 h-8 rounded-full bg-gradient-to-b ${selectedPeriod.color}`} />
                                                        <div>
                                                            <p className="text-white font-bold">{selectedPeriod.days} Days · {selectedPeriod.apr}% APR</p>
                                                            <p className="text-purple-300 text-xs">{selectedPeriod.label} · {selectedPeriod.badge}</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="p-3 bg-white/5 border border-dashed border-white/20 rounded-xl text-purple-300/50 text-sm text-center">
                                                        ← Select a period
                                                    </div>
                                                )}
                                            </div>

                                            {/* Amount */}
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="text-purple-300 text-xs font-bold uppercase tracking-widest block">Amount to Stake</label>
                                                    {selectedToken && (
                                                        <span className="text-[10px] text-purple-400 font-bold">Balance: {formatNum(tokenBalance, 2)}</span>
                                                    )}
                                                </div>
                                                <div className="relative group">
                                                    <input
                                                        type="number"
                                                        value={stakeAmount}
                                                        onChange={(e) => {
                                                            setStakeAmount(e.target.value);
                                                            setStakeError('');
                                                        }}
                                                        placeholder="0.00"
                                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 px-8 text-3xl font-black text-white focus:bg-white/10 focus:border-violet-500/50 outline-none transition-all placeholder:text-white/5"
                                                    />
                                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
                                                        <button 
                                                            onClick={async () => {
                                                                if (!selectedToken || !signer) return;
                                                                const erc20ABI = ['function balanceOf(address account) view returns (uint256)', 'function decimals() view returns (uint8)'];
                                                                const c = new Contract(selectedToken.contract_address, erc20ABI, signer);
                                                                const b = await c.balanceOf(account);
                                                                const d = await c.decimals().catch(() => 18);
                                                                const formatted = ethers.formatUnits(b, d);
                                                                setStakeAmount(formatted);
                                                                setTokenBalance(formatted);
                                                            }}
                                                            className="px-3 py-1 bg-violet-500/10 text-violet-400 text-[10px] font-black uppercase rounded-lg border border-violet-500/20 hover:bg-violet-500/20 transition-all"
                                                        >
                                                            MAX
                                                        </button>
                                                        <span className="text-xl font-black text-gray-500 uppercase tracking-widest">{selectedToken?.symbol || 'TOKEN'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Calculation Preview */}
                                            {selectedToken && selectedPeriod && stakeAmount && parseFloat(stakeAmount) > 0 && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                                    className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-xl p-4 space-y-2">
                                                    <p className="text-violet-300 text-xs font-black uppercase tracking-widest mb-3">Reward Preview</p>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-purple-300">Principal</span>
                                                        <span className="text-white font-bold">{formatNum(stakeAmount, 2)} {selectedToken.symbol}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-purple-300">APR</span>
                                                        <span className="text-violet-300 font-bold">{selectedPeriod.apr}%</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-purple-300">Duration</span>
                                                        <span className="text-white font-bold">{selectedPeriod.days} days</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm pt-2 border-t border-violet-500/20">
                                                        <span className="text-purple-300">Expected Reward</span>
                                                        <span className="text-sky-300 font-black">+{expectedReward.toFixed(4)} {selectedToken.symbol}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm font-black border-t border-violet-500/20 pt-2">
                                                        <span className="text-white">Total Payout</span>
                                                        <span className="text-white">{totalPayout.toFixed(4)} {selectedToken.symbol}</span>
                                                    </div>
                                                    <div className="text-[10px] text-purple-300/60 pt-1 flex items-start gap-1">
                                                        <Info className="w-3 h-3 shrink-0 mt-0.5" />
                                                        Tokens sent to treasury vault. Released after lock period + admin approval.
                                                    </div>
                                                </motion.div>
                                            )}

                                            {/* Error */}
                                            {stakeError && (
                                                <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-300 text-xs font-semibold">
                                                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                                    {stakeError}
                                                </div>
                                            )}

                                            {/* CTA Button */}
                                            {!account ? (
                                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                                    onClick={connectWallet}
                                                    className="w-full py-4 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-black rounded-xl shadow-xl shadow-violet-500/30 flex items-center justify-center gap-2 transition-all"
                                                >
                                                    <Wallet className="w-5 h-5" /> Connect Wallet to Stake
                                                </motion.button>
                                            ) : stakeStep === 'staking' ? (
                                                <div className="w-full py-4 bg-violet-500/20 border border-violet-500/30 text-violet-300 font-bold rounded-xl flex items-center justify-center gap-2">
                                                    <Loader2 className="w-5 h-5 animate-spin" /> Processing transaction…
                                                </div>
                                            ) : stakeStep === 'success' ? (
                                                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                                    className="w-full py-4 bg-sky-500/20 border border-sky-500/30 text-sky-300 font-black rounded-xl text-center">
                                                    ✅ Stake Successful!
                                                    <p className="text-[10px] font-semibold mt-1 opacity-70">
                                                        TX: {shortAddr(stakeTxHash)}
                                                    </p>
                                                    <button onClick={() => { setStakeStep('select'); setSelectedToken(null); setSelectedPeriod(null); setStakeAmount(''); setActiveTab('my-stakes'); }}
                                                        className="mt-2 text-xs text-sky-400 underline">
                                                        View My Stakes →
                                                    </button>
                                                </motion.div>
                                            ) : (
                                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                                    onClick={handleStake}
                                                    disabled={!selectedToken || !selectedPeriod || !stakeAmount}
                                                    className={`w-full py-4 font-black rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all 
                                                        ${(!selectedToken || !selectedPeriod || !stakeAmount) 
                                                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50' 
                                                            : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-violet-500/30 hover:from-violet-600 hover:to-purple-700'
                                                        }`}
                                                >
                                                    <Lock className="w-5 h-5" /> 
                                                    {!selectedToken ? 'Select Asset' : !selectedPeriod ? 'Select Period' : !stakeAmount ? 'Enter Amount' : 'Stake & Transfer to Vault'}
                                                </motion.button>
                                            )}

                                            {/* Security note */}
                                            <div className="flex items-center gap-2 text-[10px] text-purple-300/50 justify-center">
                                                <Shield className="w-3 h-3" />
                                                <span>Tokens secured in treasury vault · Admin-controlled release</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ──────────────────────────────────────── MY STAKES TAB ─── */}
                    {activeTab === 'my-stakes' && (
                        <motion.div key="my-stakes" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            {!account ? (
                                <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl py-20 text-center">
                                    <Wallet className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                                    <p className="text-white font-black text-xl mb-2">Connect Your Wallet</p>
                                    <p className="text-purple-300/60 text-sm mb-6">Connect to view your staking positions and rewards.</p>
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                        onClick={connectWallet}
                                        className="px-8 py-3 bg-violet-500 hover:bg-violet-600 text-white font-black rounded-xl transition-all"
                                    >
                                        Connect Wallet
                                    </motion.button>
                                </div>
                            ) : loadingStakes ? (
                                <div className="flex items-center justify-center py-20 gap-3 text-purple-300">
                                    <Loader2 className="w-6 h-6 animate-spin" /> Loading your stakes…
                                </div>
                            ) : myStakes.length === 0 ? (
                                <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl py-20 text-center">
                                    <Target className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                                    <p className="text-white font-black text-xl mb-2">No Stakes Yet</p>
                                    <p className="text-purple-300/60 text-sm mb-6">Start staking tokens to earn passive rewards.</p>
                                    <button onClick={() => setActiveTab('stake')} className="px-8 py-3 bg-violet-500 hover:bg-violet-600 text-white font-black rounded-xl transition-all">
                                        Stake Now
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h2 className="text-white font-black text-2xl">My Staking Positions</h2>
                                            <p className="text-purple-300/60 text-sm mt-1">
                                                {myStakes.length} position{myStakes.length !== 1 ? 's' : ''} · Daily rewards updated in real-time
                                            </p>
                                        </div>
                                        <button onClick={loadMyStakes} className="p-3 bg-white/10 border border-white/10 rounded-xl text-purple-300 hover:text-white transition-all">
                                            <RefreshCw className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {myStakes.map((stake, i) => (
                                            <StakeCard key={stake.id} stake={stake} onRequestRelease={handleRequestRelease} releasing={releasing} />
                                        ))}
                                    </div>

                                    {/* Release Info Banner */}
                                    <div className="mt-8 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-5 flex items-start gap-4">
                                        <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-indigo-300 font-black text-sm">About Releasing Stakes</p>
                                            <p className="text-indigo-200/70 text-xs mt-1 leading-relaxed">
                                                After your staking period ends, click &quot;Request Release&quot; to notify the admin.
                                                The admin will review your request and transfer back your principal + rewards to your wallet.
                                                Typically processed within 24 hours.
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    )}
                    {activeTab === 'vault' && account?.toLowerCase() === TREASURY_WALLET.toLowerCase() && (
                        <motion.div key="vault" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-6">
                            <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                                <div className="p-8 border-b border-white/5 bg-violet-500/5">
                                    <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                        <Shield className="w-6 h-6 text-violet-400" /> Administrative Vault Control
                                    </h3>
                                    <p className="text-xs text-purple-300/60 font-bold mt-1 uppercase tracking-widest">
                                        Fulfill on-chain releases and monitor global platform liquidity
                                    </p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-white/5 uppercase">
                                            <tr>
                                                <th className="px-8 py-5 text-left text-[10px] font-black text-purple-300/60 tracking-widest">Stakeholder</th>
                                                <th className="px-8 py-5 text-left text-[10px] font-black text-purple-300/60 tracking-widest">Asset & Quantity</th>
                                                <th className="px-8 py-5 text-left text-[10px] font-black text-purple-300/60 tracking-widest">Status / Maturity</th>
                                                <th className="px-8 py-5 text-right text-[10px] font-black text-purple-300/60 tracking-widest">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {allStakes.map((s, i) => (
                                                <tr key={i} className="hover:bg-white/5 transition-colors group">
                                                    <td className="px-8 py-6">
                                                        <div className="flex flex-col gap-1">
                                                            <p className="text-xs font-black text-white mono">{shortAddr(s.wallet_address)}</p>
                                                            <p className="text-[10px] text-purple-300/40 uppercase font-black">{timeAgo(s.start_date)}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-white/10 p-1 flex items-center justify-center">
                                                                <img src={s.logo_url || `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/assets/${ethers.getAddress(s.token_address)}/logo.png`} 
                                                                    onError={e => { e.target.src = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png'; }}
                                                                    className="w-full h-full object-contain" alt="" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black text-white">{formatNum(s.amount_tokens, 2)} {s.token_symbol}</p>
                                                                <p className="text-[10px] text-purple-300/40 font-bold uppercase">{s.token_name}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="space-y-1">
                                                            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                                                s.status === 'active' ? 'bg-violet-500/20 text-violet-400' :
                                                                s.status === 'pending_release' ? 'bg-indigo-500/20 text-indigo-400 animate-pulse' :
                                                                'bg-sky-500/20 text-sky-400'
                                                            }`}>
                                                                {s.status.replace('_', ' ')}
                                                            </span>
                                                            <p className="text-[10px] text-purple-300/60 font-bold">Matures in {s.days_remaining}d</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        {s.status === 'pending_release' ? (
                                                            <button 
                                                                onClick={() => handleAdminRelease(s)}
                                                                disabled={processingRelease === s.id}
                                                                className="px-4 py-2 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white font-black text-[10px] rounded-lg shadow-lg shadow-sky-500/20 transition-all flex items-center gap-2 ml-auto"
                                                            >
                                                                {processingRelease === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlock className="w-3 h-3" />}
                                                                RELEASE ASSETS
                                                            </button>
                                                        ) : (
                                                            <p className="text-[10px] font-black text-purple-300/20 tracking-widest uppercase italic">{s.status === 'released' ? 'Settled' : 'In Lock'}</p>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {allStakes.length === 0 && (
                                                <tr><td colSpan="4" className="px-8 py-20 text-center text-purple-300/40 font-black uppercase tracking-widest text-xs">No active vault positions</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── FAQ Section ── */}
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-20">
                    <h2 className="text-3xl font-black text-white text-center mb-10">
                        Frequently Asked <span className="text-violet-400">Questions</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { q: 'How are staking rewards calculated?', a: 'Rewards = Principal × (APR / 100) × (Days / 365). The APR is fixed at the time of staking and doesn\'t change during the lock period.' },
                            { q: 'Where do my tokens go after staking?', a: 'Your tokens are transferred directly to the B20 Treasury vault wallet. This is a one-way transfer until the admin releases them after your lock period.' },
                            { q: 'When can I claim my rewards?', a: 'After your staking period ends, click "Request Release". The admin reviews and approves within 24 hours, then sends your principal + rewards back to your wallet.' },
                            { q: 'Can I stake any B20 platform token?', a: 'Yes! Any active, non-delisted token on the B20 platform can be staked. The reward is paid in the same token you staked.' },
                            { q: 'What is the minimum staking period?', a: 'The minimum staking period is 60 days with 2% APR. For maximum rewards, choose the 360-day period for 16% APR.' },
                            { q: 'Is early withdrawal possible?', a: 'No. Once tokens are transferred to the vault, they remain locked for the full duration. Early release requests will be rejected by the admin.' },
                        ].map((faq, i) => (
                            <div key={i} className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-6">
                                <p className="text-white font-bold mb-2 flex items-start gap-2">
                                    <span className="text-violet-400 shrink-0">Q.</span> {faq.q}
                                </p>
                                <p className="text-purple-300/70 text-sm leading-relaxed pl-5">{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </section>
        </main>
    );
}

// ── Main Export with Suspense ────────────────────────────────────────────────
export default function StakingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading Staking Protocol...</div>}>
            <StakingContent />
        </Suspense>
    );
}
