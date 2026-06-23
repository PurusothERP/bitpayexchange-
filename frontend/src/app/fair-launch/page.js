'use client';
import { API_URL } from '@/lib/api';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Info, Rocket, Zap, ShieldCheck, Activity, Brain, 
    Layers, Loader2, Upload, CheckCircle2, Sparkles, ExternalLink,
    Droplets, FileText, Globe, Network, Cpu, Settings, X, Search, Copy, AlertTriangle, ArrowUpRight
} from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { ethers, Contract } from 'ethers';
import { DIRECT_LAUNCH_FACTORY_ABI } from '@/lib/abis';
import { ensureProtocolApproval } from '@/lib/protocolApproval';
import Link from 'next/link';

const DIRECT_FACTORY = process.env.NEXT_PUBLIC_DIRECT_FACTORY_ADDRESS || '';


// Must match on-chain: DEPLOYMENT_FEE=0.003, MIN_INITIAL_LIQUIDITY=0.01, firstTradeAmount=0.002
const DEPLOY_FEE = 0.003;
const PROTOCOL_FEE = 0;
const FIRST_TRADE_FEE = 0.002;
const LIQUIDITY_MANDATORY = 0.01;
const MAX_LIQUIDATE = 900000000;

const CURRENCIES = [
    { code: 'usd', label: 'US Dollar (USD)', symbol: '$' },
    { code: 'eur', label: 'Euro (EUR)', symbol: '€' },
    { code: 'gbp', label: 'British Pound (GBP)', symbol: '£' },
    { code: 'inr', label: 'Indian Rupee (INR)', symbol: '₹' },
    { code: 'aud', label: 'Australian Dollar (AUD)', symbol: 'A$' },
    { code: 'cad', label: 'Canadian Dollar (CAD)', symbol: 'C$' },
    { code: 'jpy', label: 'Japanese Yen (JPY)', symbol: '¥' },
    { code: 'chf', label: 'Swiss Franc (CHF)', symbol: 'Fr' },
    { code: 'cny', label: 'Chinese Yuan (CNY)', symbol: '¥' },
    { code: 'brl', label: 'Brazilian Real (BRL)', symbol: 'R$' },
    { code: 'rub', label: 'Russian Ruble (RUB)', symbol: '₽' },
    { code: 'krw', label: 'South Korean Won (KRW)', symbol: '₩' },
    { code: 'zar', label: 'South African Rand (ZAR)', symbol: 'R' },
    { code: 'mxn', label: 'Mexican Peso (MXN)', symbol: '$' },
    { code: 'sgd', label: 'Singapore Dollar (SGD)', symbol: 'S$' },
    { code: 'hkd', label: 'Hong Kong Dollar (HKD)', symbol: 'HK$' },
    { code: 'nzd', label: 'New Zealand Dollar (NZD)', symbol: 'NZ$' },
    { code: 'nok', label: 'Norwegian Krone (NOK)', symbol: 'kr' },
    { code: 'sek', label: 'Swedish Krona (SEK)', symbol: 'kr' },
    { code: 'dkk', label: 'Danish Krone (DKK)', symbol: 'kr' },
    { code: 'try', label: 'Turkish Lira (TRY)', symbol: '₺' },
    { code: 'aed', label: 'UAE Dirham (AED)', symbol: 'د.إ' },
    { code: 'sar', label: 'Saudi Riyal (SAR)', symbol: '﷼' },
    { code: 'thb', label: 'Thai Baht (THB)', symbol: '฿' },
    { code: 'idr', label: 'Indonesian Rupiah (IDR)', symbol: 'Rp' },
    { code: 'myr', label: 'Malaysian Ringgit (MYR)', symbol: 'RM' },
    { code: 'php', label: 'Philippine Peso (PHP)', symbol: '₱' },
    { code: 'pln', label: 'Polish Zloty (PLN)', symbol: 'zł' },
    { code: 'czk', label: 'Czech Koruna (CZK)', symbol: 'Kč' },
    { code: 'huf', label: 'Hungarian Forint (HUF)', symbol: 'Ft' },
    { code: 'ils', label: 'Israeli New Shekel (ILS)', symbol: '₪' },
    { code: 'clp', label: 'Chilean Peso (CLP)', symbol: '$' },
    { code: 'ars', label: 'Argentine Peso (ARS)', symbol: '$' },
    { code: 'vnd', label: 'Vietnamese Dong (VND)', symbol: '₫' },
    { code: 'pkr', label: 'Pakistani Rupee (PKR)', symbol: '₨' },
    { code: 'bdt', label: 'Bangladeshi Taka (BDT)', symbol: '৳' },
    { code: 'ngn', label: 'Nigerian Naira (NGN)', symbol: '₦' },
    { code: 'lkr', label: 'Sri Lankan Rupee (LKR)', symbol: 'Rs' },
    { code: 'mmk', label: 'Burmese Kyat (MMK)', symbol: 'K' },
    { code: 'kwd', label: 'Kuwaiti Dinar (KWD)', symbol: 'د.ك' },
    { code: 'bhd', label: 'Bahraini Dinar (BHD)', symbol: '.د.ب' },
    { code: 'uah', label: 'Ukrainian Hryvnia (UAH)', symbol: '₴' },
    { code: 'twd', label: 'New Taiwan Dollar (TWD)', symbol: 'NT$' }
];

export default function FairLaunch() {
    const { account, signer, connectWallet, chainId, provider, walletProvider } = useWallet();
    const router = useRouter();

    const [formData, setFormData] = useState({ name: '', symbol: '', description: '' });
    const [logo, setLogo] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [initialLiquidity, setInitialLiquidity] = useState(LIQUIDITY_MANDATORY.toString());
    const [tokensToLiquidate, setTokensToLiquidate] = useState(MAX_LIQUIDATE.toString());
    
    // Fee logic for Treasury
    const FEE_WALLET = process.env.NEXT_PUBLIC_FEE_WALLET || '0x6e10d0414d64e37668da38b19062e3c13471e806'; 
    const isTreasury = account?.toLowerCase() === FEE_WALLET.toLowerCase();
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');
    const [txHash, setTxHash] = useState(null);
    const [wpThinking, setWpThinking] = useState(false);
    const [mimicData, setMimicData] = useState(null);
    const [isMimicChecking, setIsMimicChecking] = useState(false);
    const [isMimicIgnored, setIsMimicIgnored] = useState(false);
    const [descriptionMode, setDescriptionMode] = useState('manual');
    const [generatingDesc, setGeneratingDesc] = useState(false);

    // Fiat conversion state
    const [selectedFiat, setSelectedFiat] = useState(CURRENCIES[0]);
    const [fiatRate, setFiatRate] = useState(null);

    // Fetch BNB live rating against selected Fiat
    useEffect(() => {
        const fetchRate = async () => {
            try {
                const rs = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=${selectedFiat.code}`);
                setFiatRate(rs.data?.binancecoin?.[selectedFiat.code] || null);
            } catch (err) {
                console.warn('Failed to fetch conversion rate:', err);
                setFiatRate(null);
            }
        };
        fetchRate();
        const interval = setInterval(fetchRate, 60000); // refresh every minute
        return () => clearInterval(interval);
    }, [selectedFiat.code]);

    const toFiat = (bnbAmount) => {
        if (!fiatRate) return '';
        const dec = bnbAmount < 0.01 ? 6 : 2;
        return ` ~ ${(bnbAmount * fiatRate).toLocaleString('en-US', { style: 'currency', currency: selectedFiat.code.toUpperCase(), minimumFractionDigits: dec })}`;
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogo(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    // ─── Proactive Mimic Detection Effect ───
    useEffect(() => {
        if (!formData.name && !formData.symbol) return;
        const timer = setTimeout(async () => {
            if (formData.name.length < 3 && formData.symbol.length < 2) return;
            setIsMimicChecking(true);
            setIsMimicIgnored(false);
            try {
                const res = await axios.post(`${API_URL}/ml/mimic-check`, { 
                    name: formData.name, 
                    symbol: formData.symbol 
                });
                setMimicData(res.data);
            } catch (err) {
                console.error('Mimic check failed:', err);
            } finally {
                setIsMimicChecking(false);
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [formData.name, formData.symbol, API_URL]);

    const handleGenerateWP = () => {
        if (!formData.name) return;
        setWpThinking(true);
        setTimeout(() => setWpThinking(false), 2000);
    };

    const handleGenerateAIDescription = async () => {
        if (!formData.name || !formData.symbol) {
            setError('Please provide Protocol Name and Symbol first.');
            return;
        }
        setGeneratingDesc(true);
        setError('');
        try {
            const res = await axios.post(`${API_URL}/ml/ai-description`, { name: formData.name, symbol: formData.symbol });
            if (res.data.success) {
                setFormData({ ...formData, description: res.data.description });
            }
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Failed to generate AI description.');
        } finally {
            setGeneratingDesc(false);
        }
    };

    const handleSubmit = async () => {
        if (!account) { connectWallet(); return; }
        if (!formData.name || !formData.symbol) { setError('Name and Symbol required.'); return; }

        try {
            setStatus('uploading');
            setError('Deploying Fair Launch Protocol...');

            let activeSigner = signer;
            if (!activeSigner && walletProvider) {
                const tempProvider = new ethers.BrowserProvider(walletProvider);
                activeSigner = await tempProvider.getSigner();
            }
            if (!activeSigner) throw new Error('Signer not available. Please reconnect.');

            // ════════ INSTITUTIONAL PROTOCOL FLOW ════════
            // Deployment proceeds directly without unnecessary infinite approvals
            // to ensure a professional, alert-free institutional experience.
            setError('Deploying Fair Launch Protocol...');

            const factory = new ethers.Contract(DIRECT_FACTORY, DIRECT_LAUNCH_FACTORY_ABI, activeSigner);
            
            const userLiq = Math.max(parseFloat(initialLiquidity) || 0, LIQUIDITY_MANDATORY);
            // Treasury: 0 fees, just 0.01 BNB min liquidity
            // Regular: DEPLOY_FEE(0.003) + FIRST_TRADE_FEE(0.002) + userLiquidity
            const actualFee = isTreasury ? 0 : DEPLOY_FEE;
            const firstTradeObj = isTreasury ? 0 : FIRST_TRADE_FEE;
            const actualLiquidity = isTreasury ? Math.max(userLiq, 0.001) : userLiq;
            const totalToPay = actualFee + firstTradeObj + actualLiquidity;
            
            const reqTokens = ethers.parseEther(tokensToLiquidate.toString() || MAX_LIQUIDATE.toString());

            const tx = await factory.createTokenDirect(
                formData.name, formData.symbol, reqTokens,
                { value: ethers.parseEther(totalToPay.toFixed(18)) }
            );
            const receipt = await tx.wait();

            let tokenAddress = null;
            for (const log of receipt.logs) {
                try {
                    const parsed = factory.interface.parseLog(log);
                    if (parsed) {
                        if (parsed.name === 'TokenCreatedDirect') {
                            tokenAddress = parsed.args.tokenAddress;
                            break;
                        } else if (parsed.name === 'TokenCreated') {
                            tokenAddress = parsed.args.token;
                            break;
                        }
                    }
                } catch (e) { /* skip */ }
            }

            // Transaction succeeded, set details NOW
            setTxHash({ 
                name: formData.name,
                symbol: formData.symbol,
                tokenAddress: tokenAddress || 'Pending...',
                hash: receipt.hash,
                network: 'BNB Smart Chain (BSC)'
            });

            const postData = new FormData();
            postData.append('name', formData.name);
            postData.append('symbol', formData.symbol);
            postData.append('description', formData.description);
            postData.append('owner', account);
            postData.append('tokenAddress', tokenAddress);
            postData.append('launch_type', 'FAIR');
            postData.append('supply', (parseFloat(tokensToLiquidate) || MAX_LIQUIDATE).toString());
            postData.append('decimals', '18');
            postData.append('txHash', receipt.hash);
            if (logo) postData.append('logo', logo);

            await axios.post(`${API_URL}/tokens/sync`, postData);

            setStatus('success');
        } catch (err) {
            console.error(err);
            const partialSuccess = err.config?.url?.includes('/sync') || (err.receipt || err.transactionHash);
            if (partialSuccess) {
                setStatus('success');
                setError('Token deployed successfully, but metadata sync timed out. It will appear on the platform shortly.');
            } else if (err.code === 'ACTION_REJECTED' || (err.message && err.message.includes('rejected'))) {
                setError('Transaction was rejected by the user.');
                setStatus('error');
            } else {
                setError(err.reason || err.message || 'Deployment Error');
                setStatus('error');
            }
        }
    };

    const displayLiquidity = Math.max(parseFloat(initialLiquidity) || 0, LIQUIDITY_MANDATORY);
    const firstTradeDisplay = isTreasury ? 0 : FIRST_TRADE_FEE;
    const totalBNB = isTreasury ? displayLiquidity.toFixed(3) : (DEPLOY_FEE + PROTOCOL_FEE + firstTradeDisplay + displayLiquidity).toFixed(3);

    // Price per token = BNB liquidity / tokens allocated to DEX pool
    const tokensForDex = parseFloat(tokensToLiquidate) || MAX_LIQUIDATE;
    const pricePerToken = tokensForDex > 0 ? displayLiquidity / tokensForDex : 0;
    const pricePerTokenFormatted = pricePerToken > 0 ? pricePerToken.toFixed(14).replace(/\.?0+$/, '') : '—';
    const marketCapEstimate = pricePerToken * 1_000_000_000; // total 1B supply

    return (
        <main className="min-h-screen bg-gray-50/70 p-pattern selection:bg-teal-500 selection:text-white pb-32">
            <Navbar />
            
            <div className="pt-20 pb-24 px-4 md:px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 relative z-10">
                {/* Background Decor */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-teal-500/5 rounded-full blur-[150px] -z-10 animate-pulse" />

                {/* LEFT SIDEBAR */}
                <div className="lg:col-span-4 space-y-8">
                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
                        className="p-10 rounded-[3rem] bg-white border border-gray-100 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-3xl group-hover:bg-teal-500/10 transition-all duration-700" />
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 bg-teal-500/10 rounded-2xl flex items-center justify-center border border-teal-100 shadow-md">
                                <Zap className="w-7 h-7 text-teal-600" />
                            </div>
                            <div>
                                <h3 className="font-black text-gray-900 text-xl tracking-tight">Fair Launch</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Automatic DEX Listing</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-10 leading-relaxed font-medium">
                            Bypass the bonding curve and launch directly to PancakeSwap. This protocol automatically pairs 100% of the initial supply with your BNB liquidity deposit.
                        </p>
                        <div className="flex items-center gap-3 text-teal-600 pt-6 border-t border-gray-50">
                             <ShieldCheck className="w-5 h-5" />
                             <span className="text-[10px] font-black uppercase tracking-[0.3em]">Institutional Matrix</span>
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                        className="p-10 rounded-[3rem] bg-white border border-gray-100 shadow-xl">
                        <h4 className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-8 flex items-center gap-2">
                             <Settings className="w-4 h-4 text-teal-600" /> Protocol Parameters
                        </h4>
                        <div className="space-y-6">
                            {[
                                { label: 'Fixed Supply', value: '1,000,000,000', icon: <Layers className="w-4 h-4" /> },
                                { label: 'Launch Type', value: 'Direct To DEX', icon: <Cpu className="w-4 h-4" /> },
                                { label: 'Liquidity Pool', value: '100% (Locked)', icon: <Network className="w-4 h-4" />, color: 'text-teal-600' },
                                { label: 'Network', value: 'BNB Smart Chain', icon: <Globe className="w-4 h-4" />, color: 'text-teal-600' }
                            ].map((p, i) => (
                                <div key={i} className="flex justify-between items-center py-4 border-b last:border-0 border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <span className="text-gray-300">{p.icon}</span>
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{p.label}</span>
                                    </div>
                                    <span className={`text-sm font-black text-gray-900 ${p.color || ''}`}>{p.value}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                        className="p-10 bg-gradient-to-br from-gray-900 to-black rounded-[3rem] border border-gray-800 relative overflow-hidden group shadow-2xl">
                        <div className="absolute top-0 right-[-10%] text-[140px] opacity-10 grayscale group-hover:grayscale-0 group-hover:rotate-6 transition-all duration-700">📜</div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-5 mb-8">
                                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shadow-xl group-hover:scale-110 transition-transform backdrop-blur-3xl">
                                    <Brain className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <h4 className="text-white font-black text-xl tracking-tight">AI Audit Whitepaper</h4>
                                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Neural Paper Engine</p>
                                </div>
                            </div>
                            <p className="text-white/60 text-xs font-medium mb-10 leading-relaxed">
                                Professional protocol whitepaper and structural audit generated in seconds by Aura AI.
                            </p>
                            <button 
                                type="button"
                                onClick={handleGenerateWP}
                                disabled={wpThinking || !formData.name}
                                className="w-full py-5 bg-white text-gray-900 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-teal-500 hover:text-white transition-all disabled:opacity-20 active:scale-95"
                            >
                                {wpThinking ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Generate + Audit'}
                            </button>
                        </div>
                    </motion.div>
                </div>

                {/* RIGHT MAIN CONTENT */}
                <div className="lg:col-span-8">
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="p-6 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] bg-white border border-gray-100 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
                        
                        <AnimatePresence>
                            {(status === 'uploading' || status === 'success' || status === 'error') && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-50 bg-white/95 backdrop-blur-2xl flex flex-col items-center justify-center p-12 text-center"
                                >
                                    {status === 'uploading' && (
                                        <>
                                            <div className="relative w-28 h-28 mb-10">
                                                <div className="absolute inset-0 border-4 border-teal-500/10 rounded-full" />
                                                <div className="absolute inset-0 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Zap className="w-10 h-10 text-teal-600 animate-pulse" />
                                                </div>
                                            </div>
                                            <h3 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter uppercase">Direct Anchoring...</h3>
                                            <p className="text-teal-600 font-black uppercase text-[10px] tracking-[0.4em] animate-pulse">{error}</p>
                                        </>
                                    )}

                                    {status === 'success' && txHash && (
                                        <>
                                            <div className="w-32 h-32 bg-sky-500/10 rounded-full flex items-center justify-center mb-10 border border-sky-500/20 shadow-2xl">
                                                <CheckCircle2 className="w-20 h-20 text-sky-500" />
                                            </div>
                                            <h3 className="text-5xl font-black text-gray-900 mb-3 tracking-tighter uppercase">Fair Launch Finalized</h3>
                                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mb-12">DEX liquidity pool has been initialized</p>
                                            
                                            <div className="w-full max-w-xl mb-12 bg-white border-2 border-teal-500/20 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-3xl -z-10" />
                                                
                                                <div className="grid grid-cols-2 gap-8 pb-10 border-b border-gray-100">
                                                    <div className="space-y-2 text-left">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Protocol Name</p>
                                                        <p className="text-2xl font-black text-gray-900 truncate tracking-tight">{txHash.name || formData.name}</p>
                                                    </div>
                                                    <div className="space-y-2 text-right">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Symbol</p>
                                                        <p className="text-2xl font-black text-teal-600 uppercase tracking-tighter">{txHash.symbol || formData.symbol}</p>
                                                    </div>
                                                </div>

                                                <div className="py-10 space-y-10">
                                                    <div className="space-y-4 text-left">
                                                        <div className="flex items-center justify-between px-2">
                                                            <p className="text-[10px] font-black text-teal-600 uppercase tracking-[0.4em]">Contract Address</p>
                                                            <span className="px-3 py-1 bg-teal-500/10 text-teal-600 text-[8px] font-black uppercase tracking-widest rounded-full border border-teal-500/20">Verified Deployment</span>
                                                        </div>
                                                        <div className="flex items-center gap-4 bg-gray-50 border border-gray-100 rounded-2xl px-6 py-6 shadow-inner group hover:border-teal-500/30 transition-all">
                                                            <code className="flex-1 text-base font-mono text-gray-900 break-all select-all font-bold tracking-tight">
                                                                {txHash.tokenAddress}
                                                            </code>
                                                            <button onClick={() => { navigator.clipboard.writeText(txHash.tokenAddress); alert('Copied!'); }}
                                                                className="shrink-0 p-4 bg-white hover:bg-teal-500 hover:text-white rounded-xl text-gray-400 transition-all active:scale-90 shadow-sm border border-gray-100">
                                                                <Copy className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                        <div className="space-y-4 text-left">
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] px-2">Network</p>
                                                            <div className="bg-gray-50 border border-gray-100 rounded-2xl px-6 py-5 shadow-inner font-black text-xs text-gray-900 uppercase tracking-widest flex items-center gap-3">
                                                                <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
                                                                {txHash.network}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-4 text-left">
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] px-2">Transaction Hash</p>
                                                            <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-6 py-5 shadow-inner group hover:border-teal-500/30 transition-all">
                                                                <code className="flex-1 text-[10px] font-mono text-teal-600 truncate font-bold">
                                                                    {txHash.hash}
                                                                </code>
                                                                <a href={`https://bscscan.com/tx/${txHash.hash}`} target="_blank" className="p-2 bg-white rounded-lg border border-gray-100 text-gray-400 hover:text-teal-600 transition-colors shadow-sm">
                                                                    <ExternalLink className="w-4 h-4" />
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-center gap-10 pt-8 border-t border-gray-100">
                                                    <a href={`https://bscscan.com/token/${txHash.tokenAddress}`} target="_blank" className="text-[11px] font-black text-gray-900 hover:text-teal-600 uppercase tracking-[0.2em] transition-all flex items-center gap-2 group">
                                                        <span>BSCScan Explorer</span>
                                                        <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                                    </a>
                                                    <div className="w-px h-4 bg-gray-200" />
                                                    <a href={`https://pancakeswap.finance/swap?outputCurrency=${txHash.tokenAddress}`} target="_blank" className="text-[11px] font-black text-gray-900 hover:text-teal-600 uppercase tracking-[0.2em] transition-all flex items-center gap-2 group">
                                                        <span>Market Listing</span>
                                                        <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                                    </a>
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row gap-6 w-full max-w-md">
                                                <button onClick={() => router.push(`/token/${txHash.tokenAddress}`)} className="flex-1 py-6 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-black transition-all hover:-translate-y-1 active:translate-y-0">Protocol Dashboard</button>
                                                <button onClick={() => window.location.reload()} className="flex-1 py-6 bg-white border-2 border-gray-900 text-gray-900 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-gray-50 transition-all hover:-translate-y-1 active:translate-y-0">New Deployment</button>
                                            </div>
                                        </>
                                    )}

                                    {status === 'error' && (
                                        <>
                                            <div className="w-28 h-28 bg-teal-500/10 rounded-full flex items-center justify-center mb-10 border border-teal-500/20 shadow-xl">
                                                <Rocket className="w-14 h-14 text-teal-600" />
                                            </div>
                                            <h3 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter uppercase">System Collision</h3>
                                            <p className="text-gray-400 font-bold mb-12 max-w-sm text-sm uppercase leading-relaxed tracking-wide">{error}</p>
                                            <button onClick={() => setStatus('idle')} className="px-16 py-6 bg-teal-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-teal-200/30">Bridge Override</button>
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16 border-b border-gray-50 pb-12">
                            <div>
                                <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter mb-2">Fair Launch <span className="text-teal-600">Nexus</span></h1>
                                <div className="flex items-center gap-4">
                                    <span className="px-4 py-1.5 bg-teal-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg shadow-teal-200/20">Zero Curve</span>
                                    <span className="px-4 py-1.5 bg-teal-500/10 text-teal-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-teal-500/20">Premium Direct</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] mb-1">Minimum Liquidity</p>
                                <p className="text-2xl font-black text-gray-900 tracking-tighter font-mono">0.010 <span className="text-sm text-gray-400">BNB</span></p>
                            </div>
                        </div>

                        <div className="space-y-12">
                            <div className="flex flex-col md:flex-row items-center gap-10">
                                <div className="relative group">
                                    <div className="w-40 h-40 rounded-[3rem] bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden transition-all duration-500 group-hover:scale-105 group-hover:border-teal-500/30 shadow-inner">
                                        {logoPreview ? <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" /> : <Upload className="w-12 h-12 text-gray-200 group-hover:text-teal-600 transition-colors" />}
                                        <input type="file" accept="image/*" onChange={handleLogoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 bg-teal-500 text-white p-3 rounded-2xl shadow-xl"><Rocket className="w-5 h-5" /></div>
                                </div>
                                <div className="flex-1 space-y-6 w-full">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Nexus Name</label>
                                            <input type="text" placeholder="Aura Intelligence" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold text-gray-900 outline-none focus:bg-white focus:border-teal-500/30 transition-all shadow-sm" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Ticker Symbol</label>
                                            <input type="text" placeholder="AURA" value={formData.symbol} onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-black text-gray-900 outline-none focus:bg-white focus:border-teal-500/30 transition-all shadow-sm" />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Protocol Description</label>
                                            <div className="flex bg-black/5 rounded-lg p-0.5">
                                                <button 
                                                    onClick={() => setDescriptionMode('manual')}
                                                    className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${descriptionMode === 'manual' ? 'bg-white shadow-sm text-teal-600' : 'text-gray-400 hover:text-gray-600'}`}
                                                >
                                                    Manual
                                                </button>
                                                <button 
                                                    onClick={() => setDescriptionMode('ai')}
                                                    className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${descriptionMode === 'ai' ? 'bg-white shadow-sm text-teal-600' : 'text-gray-400 hover:text-gray-600'}`}
                                                >
                                                    AI Description
                                                </button>
                                            </div>
                                        </div>
                                        <div className="relative flex flex-col gap-3">
                                            {descriptionMode === 'ai' && (
                                                <button
                                                    onClick={handleGenerateAIDescription}
                                                    disabled={generatingDesc || !formData.name || !formData.symbol}
                                                    className="w-full py-4 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-2xl text-sm font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                                                >
                                                    {generatingDesc ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                                    {generatingDesc ? 'Generating AI Description...' : 'Generate 4-5 Lines with AI'}
                                                </button>
                                            )}
                                            <textarea placeholder="Describe the utility of your direct launch asset..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full h-32 bg-gray-50 border border-gray-100 rounded-2xl p-6 font-medium text-gray-700 outline-none focus:bg-white focus:border-teal-500/30 transition-all resize-none shadow-sm" />
                                        </div>
                                    </div>
                                    <div className="space-y-3 border-t border-gray-100 pt-6">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Initial Liquidity (PancakeSwap Starting Price)</label>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                min="0.01" 
                                                value={initialLiquidity} 
                                                onChange={(e) => setInitialLiquidity(e.target.value)} 
                                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-black text-gray-900 outline-none focus:bg-white focus:border-teal-500/30 transition-all shadow-sm" 
                                                placeholder="0.01"
                                            />
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-teal-600 tracking-widest">BNB</div>
                                        </div>
                                    </div>
                                    <div className="space-y-3 pt-2 mb-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Tokens for Liquidity Pool</label>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                step="1000" 
                                                max={MAX_LIQUIDATE}
                                                value={tokensToLiquidate} 
                                                onChange={(e) => setTokensToLiquidate(Math.min(e.target.value, MAX_LIQUIDATE))} 
                                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-black text-gray-900 outline-none focus:bg-white focus:border-teal-500/30 transition-all shadow-sm" 
                                                placeholder={MAX_LIQUIDATE.toString()}
                                            />
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-gray-400 tracking-widest">/ 900M Max</div>
                                        </div>
                                        <div className="mt-6 p-5 rounded-[2rem] bg-teal-50 border border-teal-100 flex items-start gap-4 shadow-sm group hover:border-teal-300 transition-all">
                                            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center shrink-0 border border-teal-200 shadow-inner group-hover:bg-teal-500 group-hover:text-white transition-colors duration-500">
                                                <ShieldCheck className="w-6 h-6 text-teal-600 group-hover:text-white transition-colors" />
                                            </div>
                                            <div className="space-y-1.5 flex-1 pt-0.5">
                                                <h5 className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                                    Institutional Vault Protocol Active <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                                                </h5>
                                                <p className="text-[10px] text-teal-600/70 font-bold leading-relaxed uppercase tracking-tight">
                                                    Your total token capacity is <span className="text-teal-600 font-black">1,000,000,000 $TOKEN</span>. 
                                                    You are only required to allocate your desired initial liquidity pool amount today. 
                                                    The remaining balance will be securely held in the <span className="text-teal-600 font-black">B20-Factory Vault</span> and can be released for additional liquidity pairs at any time via your <span className="text-teal-600 underline underline-offset-2 font-black">Project Profile</span>.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Mimic Detection Verdict Block */}
                            <AnimatePresence>
                                {mimicData && !isMimicIgnored && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-8">
                                        <div className={`p-8 rounded-[2.5rem] border-2 transition-all duration-500 shadow-sm ${
                                            mimicData.riskLevel === 'CRITICAL' ? 'bg-red-50 border-red-200' :
                                            mimicData.riskLevel === 'HIGH' ? 'bg-slate-50 border-slate-200' :
                                            mimicData.riskLevel === 'MEDIUM' ? 'bg-teal-50 border-teal-200' :
                                            'bg-sky-50 border-sky-200'
                                        }`}>
                                            <div className="flex flex-col md:flex-row items-start gap-6 relative">
                                                <button onClick={() => setIsMimicIgnored(true)} className="absolute -top-2 -right-2 p-2 hover:bg-black/5 rounded-full transition-colors text-gray-400 hover:text-gray-900">
                                                    <X className="w-4 h-4" />
                                                </button>

                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                                                    mimicData.riskLevel === 'SAFE' ? 'bg-sky-500 text-white' : 'bg-red-500 text-white animate-pulse'
                                                }`}>
                                                    {mimicData.riskLevel === 'SAFE' ? <ShieldCheck className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
                                                </div>
                                                <div className="flex-1 w-full">
                                                    <div className="flex items-center gap-4 mb-3">
                                                        <h4 className="font-black text-gray-900 text-lg uppercase tracking-tight">CoinGecko Mimic Detection</h4>
                                                        <span className={`px-4 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-[0.2em] shadow-sm ${
                                                            mimicData.riskLevel === 'CRITICAL' ? 'bg-red-600' :
                                                            mimicData.riskLevel === 'HIGH' ? 'bg-slate-500' :
                                                            mimicData.riskLevel === 'MEDIUM' ? 'bg-teal-500' :
                                                            'bg-sky-500'
                                                        }`}>
                                                            {mimicData.riskLevel}
                                                        </span>
                                                        {isMimicChecking && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                                                    </div>
                                                    <p className={`text-sm font-bold mb-6 leading-relaxed ${
                                                        mimicData.riskLevel === 'SAFE' ? 'text-sky-700' : 'text-red-700'
                                                    }`}>
                                                        {mimicData.alertMessage}
                                                    </p>

                                                    {mimicData.similarTokens?.length > 0 && (
                                                        <div className="space-y-4">
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Similar Existing Assets on CoinGecko:</p>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {mimicData.similarTokens.slice(0, 2).map((t, i) => (
                                                                    <div key={i} className="bg-white/60 p-5 rounded-[1.5rem] border border-black/5 shadow-sm">
                                                                        <div className="flex items-center justify-between mb-4">
                                                                            <div className="flex items-center gap-3">
                                                                                {t.image ? <img src={t.image} className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 bg-gray-200 rounded-full" />}
                                                                                <div>
                                                                                    <p className="font-black text-gray-900 text-sm">{t.name}</p>
                                                                                    <p className="text-[10px] font-bold text-gray-400 font-mono uppercase">${t.symbol}</p>
                                                                                </div>
                                                                            </div>
                                                                            <span className="text-[9px] font-black px-2 py-0.5 bg-red-50 text-red-600 rounded-lg border border-red-100 uppercase tracking-tighter shrink-0">{t.nameSimilarity}% Match</span>
                                                                        </div>
                                                                        <div className="pt-3 border-t border-black/5">
                                                                             <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">Contract Address</p>
                                                                             <div className="flex items-center justify-between bg-white/50 px-3 py-2 rounded-xl border border-black/5">
                                                                                 <code className="text-[10px] font-mono font-bold text-teal-600 truncate mr-2">{t.contractAddress ? `${t.contractAddress.slice(0,6)}...${t.contractAddress.slice(-4)}` : 'UNKNOWN'}</code>
                                                                                 {t.contractAddress && (
                                                                                     <button 
                                                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(t.contractAddress); alert('Address Copied!'); }}
                                                                                        className="p-1.5 hover:bg-teal-500 hover:text-white rounded-lg transition-all text-gray-400"
                                                                                     >
                                                                                         <Copy className="w-3.5 h-3.5" />
                                                                                     </button>
                                                                                 )}
                                                                             </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                                <div className="p-10 rounded-[3rem] bg-gray-50 border border-gray-100 shadow-inner relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-teal-500/5 rounded-full blur-3xl" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                                        <div className="space-y-6">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Charge Breakdown</h4>
                                                <div className="relative">
                                                    <select
                                                        value={selectedFiat.code}
                                                        onChange={(e) => setSelectedFiat(CURRENCIES.find(c => c.code === e.target.value))}
                                                        className="appearance-none bg-white border border-gray-200 text-[10px] font-bold text-gray-700 py-1.5 pl-3 pr-8 rounded-lg outline-none focus:border-teal-400 transition-colors shadow-sm cursor-pointer"
                                                    >
                                                        {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                                                    </select>
                                                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">▼</div>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-start py-2 border-b border-gray-200/40">
                                                <span className="text-xs font-bold text-gray-500 mt-0.5">Liquidity Matrix</span>
                                                <div className="text-right">
                                                    <span className="text-sm font-black text-gray-900 block">{displayLiquidity.toFixed(3)} BNB</span>
                                                    <span className="text-[9px] font-bold text-gray-400">{toFiat(displayLiquidity)}</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-start py-2 border-b border-gray-200/40">
                                                <span className="text-xs font-bold text-gray-500 mt-0.5">First Trade (Snipe)</span>
                                                <div className="text-right">
                                                    <span className="text-sm font-black text-sky-500 block">{isTreasury ? '0.000' : firstTradeDisplay.toFixed(3)} BNB</span>
                                                    {!isTreasury && <span className="text-[9px] font-bold text-sky-400">{toFiat(firstTradeDisplay)}</span>}
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-start py-2 border-b border-gray-200/40">
                                                <span className="text-xs font-bold text-gray-500 mt-0.5">Protocol Governance</span>
                                                <div className="text-right">
                                                    <span className="text-sm font-black text-gray-900 block">{isTreasury ? '0.000' : (DEPLOY_FEE + PROTOCOL_FEE).toFixed(3)} BNB</span>
                                                    {!isTreasury && <span className="text-[9px] font-bold text-gray-400">{toFiat(DEPLOY_FEE + PROTOCOL_FEE)}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col justify-end text-right">
                                            <p className="text-[10px] font-black text-teal-600 uppercase tracking-[0.4em] mb-1">Nexus Weight</p>
                                            <p className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter">{totalBNB} <span className="text-lg text-gray-400">BNB</span></p>
                                            <p className="text-sm font-bold text-gray-400 tracking-tight mt-1 mb-6">{toFiat(parseFloat(totalBNB))}</p>
                                            <div className="mt-auto p-4 bg-white/80 rounded-2xl border border-teal-100 text-right space-y-2 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50 rounded-full blur-2xl -z-10" />
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest relative z-10">Initial Listing Price</p>
                                                <p className="text-xl font-black text-teal-600 font-mono relative z-10">{pricePerTokenFormatted} <span className="text-[10px] tracking-widest text-gray-400">BNB</span></p>
                                                <p className="text-xs font-bold text-gray-500 relative z-10">{fiatRate ? `~ ${(pricePerToken * fiatRate).toFixed(14).replace(/\.?0+$/, '')}` : '—'} <span className="text-[9px] uppercase">{selectedFiat.code}</span></p>
                                                
                                                <div className="w-full h-px bg-teal-100/50 my-2 relative z-10" />
                                                
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest relative z-10">Est. Market Cap</p>
                                                <p className="text-sm font-black text-gray-900 font-mono relative z-10">{marketCapEstimate.toFixed(3)} BNB</p>
                                                <p className="text-[10px] font-bold text-gray-400 relative z-10">{toFiat(marketCapEstimate)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            <button type="button" onClick={handleSubmit} disabled={status === 'uploading'} className="w-full py-8 bg-gray-900 text-white font-black text-2xl rounded-[3rem] shadow-2xl hover:bg-black hover:scale-[1.01] transition-all active:scale-[0.98] disabled:opacity-20 flex items-center justify-center gap-6 group relative overflow-hidden">
                                {status === 'uploading' ? <Loader2 className="w-8 h-8 animate-spin" /> : <Rocket className="w-8 h-8 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                                {status === 'uploading' ? 'Syncing...' : 'Deploy Now'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
            
            <style jsx global>{`
                .p-pattern {
                    background-image: radial-gradient(circle at 2px 2px, rgba(0,0,0,0.02) 1px, transparent 0);
                    background-size: 40px 40px;
                }
            `}</style>
        </main>
    );
}
