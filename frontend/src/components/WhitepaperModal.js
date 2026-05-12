'use client';
import { API_URL } from '@/lib/api';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Share2, X, MessageCircle, Mail, DollarSign, CheckCircle, Loader2, Rocket } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import { parseUnits } from 'ethers';
import { useWallet } from '@/context/WalletContext';
import axios from 'axios';

const TREASURY = '0x6451ee4def4a8b8fbc2c64301a79e267de378935';
const DOWNLOAD_PRICE_BNB = '0.004'; // Approx $2.50 at current rates


export default function WhitepaperModal({ isOpen, onClose, whitepaper, isDeployed, contractAddress }) {
    const { account, signer } = useWallet();
    const [isPaying, setIsPaying] = useState(false);
    const [paid, setPaid] = useState(whitepaper?.is_paid === 1);
    const [error, setError] = useState('');

    useEffect(() => {
        const isAdmin = account && account.toLowerCase() === TREASURY.toLowerCase();
        if (whitepaper?.is_paid === 1 || isAdmin) {
            setPaid(true);
            // If admin and not marked paid in DB, mark it now as a free admin copy
            if (isAdmin && whitepaper?.is_paid !== 1 && whitepaper?.temp_id && isOpen) {
                axios.post(`${API_URL}/ml/whitepaper/paid`, {
                    temp_id: whitepaper.temp_id,
                    contract_address: contractAddress || 'ADMIN_FREE',
                    tx_hash: `admin_wp_${whitepaper.temp_id}`,
                    amount_bnb: 0
                }).catch(e => console.warn('Admin WP auto-sync failed:', e));
            }
        }
    }, [whitepaper, account, isOpen]);

    const handlePayment = async () => {
        if (!signer) {
            setError('Please connect your wallet first.');
            return;
        }

        setIsPaying(true);
        setError('');

        try {
            // Transfer 0.004 BNB to Treasury
            const tx = await signer.sendTransaction({
                to: TREASURY,
                value: parseUnits(DOWNLOAD_PRICE_BNB, 'ether')
            });

            const receipt = await tx.wait();
            
            // Notify backend
            await axios.post(`${API_URL}/ml/whitepaper/paid`, {
                temp_id: whitepaper.temp_id,
                contract_address: contractAddress || '',
                tx_hash: receipt.hash,
                amount_bnb: 0.004
            });

            setPaid(true);
        } catch (err) {
            console.error('Payment failed:', err);
            setError('Payment was cancelled or failed. Please try again.');
        } finally {
            setIsPaying(false);
        }
    };

    const downloadPDF = () => {
        const doc = new jsPDF();
        const splitText = doc.splitTextToSize(whitepaper.content, 180);
        doc.text(`Whitepaper: ${whitepaper.token_name}`, 10, 10);
        if (isDeployed && contractAddress) {
            doc.text(`Contract Address: ${contractAddress}`, 10, 20);
        }
        doc.setFontSize(10);
        doc.text(splitText, 10, 35);
        doc.save(`${whitepaper.token_name}_Whitepaper.pdf`);
    };

    const shareToWhatsApp = () => {
        const text = `Check out the whitepaper for ${whitepaper.token_name} on B20-LAB!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const shareViaEmail = () => {
        const subject = `${whitepaper.token_name} Whitepaper`;
        const body = `View the full whitepaper on B20-LAB Launchpad.`;
        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl overflow-hidden flex flex-col shadow-2xl"
            >
                {/* Header */}
                <div className="p-6 border-b border-black/5 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-xl icon-3d">
                            <FileText className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900">
                                {whitepaper?.token_name} <span className="text-gray-400 font-mono text-sm">${whitepaper?.token_symbol}</span>
                            </h2>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">AI Generated Whitepaper</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Content Overlay for Locked State */}
                <div className="flex-1 overflow-y-auto p-8 relative">
                    <div className="prose prose-rose max-w-none text-gray-800">
                        <ReactMarkdown>{whitepaper?.content}</ReactMarkdown>
                    </div>

                    {!paid && isDeployed && (
                        <div className="absolute inset-0 bg-white/40 backdrop-blur-md flex items-center justify-center p-8 text-center z-10">
                            <motion.div 
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="glass-card max-w-sm p-8 shadow-2xl border-blue-500/20"
                            >
                                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 icon-3d">
                                    <Rocket className="w-8 h-8 text-blue-500" />
                                </div>
                                <h3 className="text-xl font-black mb-2 text-gray-900 text-red-gradient">Download Whitepaper</h3>
                                <p className="text-sm text-gray-600 mb-6 font-medium">
                                    Unlock professional PDF download and sharing options for just **$2 (Fixed 0.004 BNB)**.
                                </p>
                                
                                {error && <p className="text-xs text-red-500 mb-4 font-bold">{error}</p>}

                                <button 
                                    onClick={handlePayment}
                                    disabled={isPaying}
                                    className="w-full py-4 bg-blue-500 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/20 disabled:bg-gray-400"
                                >
                                    {isPaying ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <DollarSign className="w-5 h-5" />
                                            Unlock for $2
                                        </>
                                    )}
                                </button>
                                <p className="text-[10px] text-gray-400 mt-4 uppercase font-black tracking-widest">Treasury: {TREASURY.slice(0, 10)}...</p>
                            </motion.div>
                        </div>
                    )}

                    {!isDeployed && (
                        <div className="sticky bottom-0 left-0 right-0 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-700 text-sm font-bold flex items-center gap-2 backdrop-blur-sm mx-8 mb-4">
                            <CheckCircle className="w-4 h-4" />
                            Review Mode: Full features available after token deployment.
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-gray-50 border-t border-black/5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button 
                            disabled={!paid || !isDeployed}
                            onClick={downloadPDF}
                            className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all disabled:bg-gray-200 disabled:text-gray-400 shadow-lg shadow-black/10"
                        >
                            <Download className="w-4 h-4" /> Download PDF
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            disabled={!paid || !isDeployed}
                            onClick={shareToWhatsApp}
                            className="p-3 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-all disabled:bg-gray-200"
                        >
                            <MessageCircle className="w-5 h-5" />
                        </button>
                        <button 
                            disabled={!paid || !isDeployed}
                            onClick={shareViaEmail}
                            className="p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all disabled:bg-gray-200"
                        >
                            <Mail className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
