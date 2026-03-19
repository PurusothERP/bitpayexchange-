'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { useWallet } from '@/context/WalletContext';
import { motion } from 'framer-motion';
import { Rocket, Upload, Info, AlertCircle, CheckCircle2, Zap, TrendingUp } from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { ethers, Contract } from 'ethers';
import { TOKEN_FACTORY_ABI } from '@/lib/abis';

const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS;
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// On-chain constants for Direct Launch: DEPLOYMENT_FEE = 0.003 BNB, MIN_INITIAL_LIQUIDITY = 0.01 BNB
const DEPLOYMENT_FEE = 0.003;
const MIN_INITIAL_LIQUIDITY = 0.01;

export default function DirectLaunchPage() {
    const { account, signer, connectWallet, isConnecting } = useWallet();
    const router = useRouter();
    const TREASURY = (process.env.NEXT_PUBLIC_FEE_WALLET || '0x6451ee4def4a8b8fbc2c64301a79e267de378935').toLowerCase();
    const isTreasury = account && account.toLowerCase() === TREASURY;

    const [formData, setFormData] = useState({
        name: '',
        symbol: '',
        description: '',
    });
    const [logo, setLogo] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [initialLiquidity, setInitialLiquidity] = useState('0.01'); // BNB for initial liquidity
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');
    const [txHash, setTxHash] = useState(null);

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogo(file);
            const reader = new FileReader();
            reader.onloadend = () => setLogoPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const actualFee = isTreasury ? 0 : DEPLOYMENT_FEE;
    const actualMinLiquidity = isTreasury ? 0 : MIN_INITIAL_LIQUIDITY;
    const totalBNB = (actualFee + Math.max(parseFloat(initialLiquidity) || actualMinLiquidity, actualMinLiquidity)).toFixed(4);

    const DIRECT_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_DIRECT_FACTORY_ADDRESS || '0x6451ee4def4a8b8fbc2c64301a79e267de378935';

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!account || !signer) { connectWallet(); return; }

        if (!DIRECT_FACTORY_ADDRESS || DIRECT_FACTORY_ADDRESS === '0xTBD') {
            setError('Direct Launch Factory not yet deployed by admin.');
            setStatus('error');
            return;
        }

        const initialLiqAmount = Math.max(parseFloat(initialLiquidity) || actualMinLiquidity, actualMinLiquidity);
        const totalValue = actualFee + initialLiqAmount;

        try {
            setStatus('uploading');
            setError('');

            const factoryContract = new Contract(DIRECT_FACTORY_ADDRESS, [
                "function createTokenDirect(string name, string symbol) payable returns (address)",
                "event TokenCreatedDirect(address indexed tokenAddress, string name, string symbol, uint256 supply, address indexed creator, uint256 deploymentFee, uint256 liquidityBnb)"
            ], signer);

            const tx = await factoryContract.createTokenDirect(
                formData.name,
                formData.symbol,
                { value: ethers.parseEther(totalValue.toFixed(6)) }
            );

            const receipt = await tx.wait();

            const TOKEN_CREATED_TOPIC = ethers.id(
                "TokenCreatedDirect(address,string,string,uint256,address,uint256,uint256)"
            );

            let tokenAddress = '';
            for (const log of receipt.logs) {
                if (log.topics && log.topics[0] === TOKEN_CREATED_TOPIC) {
                    tokenAddress = ethers.getAddress('0x' + log.topics[1].slice(26));
                    break;
                }
            }

            if (!tokenAddress) throw new Error('Token created but address not found in logs.');

            // Save metadata to backend
            const data = new FormData();
            data.append('name', formData.name);
            data.append('symbol', formData.symbol);
            data.append('supply', '1000000000');
            data.append('description', formData.description);
            data.append('owner', account);
            data.append('tokenAddress', tokenAddress);
            data.append('txHash', receipt.hash);
            data.append('launch_type', 'FAIR_LAUNCH');
            if (logo) data.append('logo', logo);

            await axios.post(`${API_URL}/tokens/sync`, data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setTxHash({ txHash: receipt.hash, tokenAddress });
            setStatus('success');
            // Removed automatic redirect so user can read the success popup
        } catch (err) {
            console.error('Error creating token:', err);
            setError(err.reason || err.message || 'Failed to create token. Please try again.');
            setStatus('error');
        }
    };

    // Cost breakdown
    const liqAmountNum = Math.max(parseFloat(initialLiquidity) || MIN_INITIAL_LIQUIDITY, MIN_INITIAL_LIQUIDITY);

    return (
        <main className="min-h-screen paw-pattern">
            <Navbar />

            <section className="pt-32 pb-20 px-4 md:px-8">
                <div className="max-w-3xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-12"
                    >
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Fair-Launch <span className="text-emerald-500">DEX Token</span></h1>
                        <p className="text-gray-600">Instantly deploy a token with a permanent PancakeSwap liquidity pool. No private sale, no bonding curve.</p>
                        <p className="text-xs text-emerald-600 mt-2 font-bold px-4 py-2 bg-emerald-500/10 rounded-xl inline-block">100% Fair Launch — Instantly tradeable in MetaMask/Trust Wallet</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card overflow-hidden"
                    >
                        {status === 'success' ? (
                            <div className="py-16 text-center">
                                <motion.div
                                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                                    transition={{ type: 'spring', bounce: 0.5 }}
                                    className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6"
                                >
                                    <CheckCircle2 className="text-green-500 w-14 h-14" />
                                </motion.div>
                                <h2 className="text-2xl font-bold mb-3">🎉 Token Launched!</h2>
                                <p className="text-gray-500 mb-1 text-sm">Token Address:</p>
                                <p className="font-mono text-rose-500 font-bold mb-4 break-all text-sm px-4">{txHash?.tokenAddress}</p>
                                <a
                                    href={`https://bscscan.com/tx/${txHash?.txHash}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-amber-600 text-sm font-bold hover:underline mb-8"
                                >
                                    View on BSCScan ↗
                                </a>
                                
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                    <button 
                                        onClick={() => router.push(`/token/${txHash?.tokenAddress}`)}
                                        className="px-8 py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-500/20 transition-all w-full sm:w-auto"
                                    >
                                        Go to Token Page
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setStatus('idle');
                                            setTxHash(null);
                                            setFormData({name: '', symbol: '', description: ''});
                                            setLogo(null);
                                            setLogoPreview(null);
                                        }}
                                        className="px-8 py-3 bg-black/5 hover:bg-black/10 text-gray-700 font-bold rounded-xl transition-all w-full sm:w-auto"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Logo Upload */}
                                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-black/10 rounded-2xl hover:border-rose-500/50 transition-colors bg-black/5 relative group">
                                    {logoPreview ? (
                                        <div className="relative w-28 h-28 rounded-xl overflow-hidden shadow-2xl">
                                            <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => { setLogo(null); setLogoPreview(null); }}
                                                className="absolute inset-0 bg-white/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <span className="text-xs font-bold text-gray-900">Change Logo</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="w-10 h-10 text-gray-400 mb-3 group-hover:text-rose-500 transition-colors" />
                                            <p className="text-sm font-bold text-gray-600">Upload Token Logo</p>
                                            <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF — 512×512px recommended</p>
                                        </>
                                    )}
                                    <input type="file" accept="image/*" onChange={handleLogoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-600">Token Name *</label>
                                        <input
                                            required type="text" placeholder="e.g. Moonshot Protocol"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 focus:outline-none focus:border-rose-500/50 transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-600">Token Symbol *</label>
                                        <input
                                            required type="text" placeholder="e.g. MOON"
                                            value={formData.symbol}
                                            onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                                            className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 focus:outline-none focus:border-rose-500/50 transition-all font-mono"
                                        />
                                    </div>
                                </div>

                                {/* Total Supply — fixed */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-600 flex items-center gap-1">
                                        Total Supply <Info className="w-3.5 h-3.5 text-gray-400" />
                                    </label>
                                    <input disabled value="1,000,000,000 (Fixed for Meme Tokens)"
                                        className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 cursor-not-allowed opacity-60 font-mono text-sm" />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-600">Description</label>
                                    <textarea
                                        rows="3" placeholder="Describe your project..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 focus:outline-none focus:border-rose-500/50 transition-all resize-none"
                                    />
                                </div>

                                {/* Initial Liquidity Box */}
                                <div className="space-y-3 p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                                    <div className="flex items-center gap-2 mb-1">
                                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                                        <span className="text-sm font-bold text-gray-800">Initial PancakeSwap Liquidity</span>
                                    </div>
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        This BNB is paired with 100% of your token supply and permanently placed on PancakeSwap. You receive the LP tokens.
                                        Minimum is <strong>{MIN_INITIAL_LIQUIDITY} BNB</strong>.
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex-1">
                                            <input
                                                type="number" step="0.001" min={actualMinLiquidity}
                                                placeholder={`Min ${actualMinLiquidity} BNB`}
                                                value={initialLiquidity}
                                                onChange={(e) => setInitialLiquidity(e.target.value)}
                                                className="w-full bg-white border border-emerald-500/30 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/70 transition-all font-mono"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600">BNB</span>
                                        </div>
                                        {/* Quick buttons */}
                                        <div className="flex gap-2">
                                            {['0.01', '0.05', '0.1', '0.5'].map(v => (
                                                <button key={v} type="button" onClick={() => setInitialLiquidity(v)}
                                                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${initialLiquidity === v ? 'bg-emerald-500 text-white' : 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20'}`}>
                                                    {v}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="mt-4 p-3 bg-emerald-500/10 rounded-xl text-xs font-semibold text-emerald-700 flex items-center gap-2">
                                        <Info className="w-4 h-4 shrink-0" />
                                        LP tokens (proof of 100% liquidity) will be transferred directly to your wallet. You own the pool.
                                    </div>
                                </div>

                                {/* Cost Breakdown */}
                                <div className="p-4 bg-black/3 rounded-xl space-y-2 text-sm border border-black/5">
                                    <div className="flex justify-between text-gray-500">
                                        <span>Platform Deployment Fee</span>
                                        <span className="font-mono">{actualFee} BNB</span>
                                    </div>
                                    <div className="flex justify-between text-gray-500">
                                        <span>Initial Liquidity</span>
                                        <span className="font-mono">{Math.max(parseFloat(initialLiquidity) || actualMinLiquidity, actualMinLiquidity).toFixed(4)} BNB</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-gray-900 border-t border-black/10 pt-2 mt-2">
                                        <span>Total</span>
                                        <span className="font-mono text-rose-500">{totalBNB} BNB</span>
                                    </div>
                                </div>

                                {error && (
                                    <div className="flex items-start gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 text-sm">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <motion.button
                                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    disabled={status === 'uploading' || !formData.name || !formData.symbol}
                                    className="w-full py-4 bg-rose-500 hover:bg-rose-600 disabled:bg-gray-300 disabled:text-gray-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-rose-500/20 transition-all"
                                >
                                    {status === 'uploading' ? (
                                        <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deploying to BSC...</>
                                    ) : (
                                        <><Rocket className="w-5 h-5" /> Launch Fair-Launch DEX Token — {isTreasury ? initialLiquidity : totalBNB} BNB</>
                                    )}
                                </motion.button>

                                <p className="text-center text-gray-400 text-xs">
                                    By creating a token you agree that all 1B supply goes directly into a new PancakeSwap Liquidity Pool.
                                    You will receive the LP tokens representing ownership of the pool.
                                </p>
                            </form>
                        )}
                    </motion.div>
                </div>
            </section>
        </main>
    );
}
