'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CreditCard, Zap, Shield, Globe, ShoppingBag, 
    Atm, Smartphone, ArrowRight, CheckCircle2, 
    Sparkles, Star, ChevronRight, Lock
} from 'lucide-react';

const CardVariant = ({ 
    name, 
    type, 
    price, 
    features, 
    image, 
    colorClass, 
    isComingSoon = true 
}) => {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`relative group bg-white rounded-[3rem] border border-gray-100 p-8 lg:p-12 hover:shadow-4xl transition-all duration-700 overflow-hidden flex flex-col h-full`}
        >
            <div className={`absolute top-0 right-0 w-64 h-64 ${colorClass} rounded-full blur-[100px] -mr-32 -mt-32 opacity-20 group-hover:opacity-40 transition-opacity`} />
            
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-12">
                    <div>
                        <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">{name}</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{type}</p>
                    </div>
                    {isComingSoon && (
                        <span className="px-4 py-1.5 bg-teal-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-teal-200/20">
                            Coming Soon
                        </span>
                    )}
                </div>

                <div className="relative mb-12 h-64 flex items-center justify-center">
                    <motion.div 
                        whileHover={{ scale: 1.05, rotateY: 10, rotateX: 5 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="w-full h-full relative z-10 drop-shadow-2xl"
                    >
                        <img 
                            src={image} 
                            alt={`${name} Card`}
                            className="w-full h-full object-contain rounded-2xl"
                        />
                    </motion.div>
                </div>

                <div className="space-y-6 mb-12 flex-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">Exclusive Benefits</p>
                    <div className="grid grid-cols-1 gap-4">
                        {features.map((f, i) => (
                            <div key={i} className="flex items-center gap-3 text-sm font-bold text-gray-700">
                                <CheckCircle2 className="w-5 h-5 text-sky-500 flex-shrink-0" />
                                <span>{f}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pt-8 border-t border-gray-50 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Starting From</p>
                        <p className="text-3xl font-black text-gray-900">${price}</p>
                    </div>
                    <button className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-teal-500 transition-all flex items-center gap-2 group">
                        Pre-Order <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default function CardsPage() {
    return (
        <main className="min-h-screen bg-[#FDFDFD] text-gray-900 selection:bg-teal-500 selection:text-white pb-32 font-sans relative">
            <Navbar theme="light" />
            
            {/* Soft Ambient Backgrounds */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[800px] h-[800px] bg-gray-200/20 rounded-full blur-[150px]" />
            </div>

            <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-600 via-teal-600 to-teal-700 z-[100]" />

            <div className="pt-32 pb-20 px-6 md:px-12">
                <div className="max-w-7xl mx-auto text-center mb-24">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-3 px-6 py-2 bg-white shadow-xl shadow-gray-200/50 rounded-full border border-gray-100 mb-8"
                    >
                        <CreditCard className="w-4 h-4 text-teal-600" />
                        <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">B20CARDS • The Future of Spending</span>
                    </motion.div>
                    
                    <h1 className="text-5xl md:text-8xl font-black text-gray-900 tracking-tighter mb-8 leading-none">
                        CRYPTO <span className="text-teal-600">REALITY</span>
                    </h1>
                    <p className="text-lg md:text-2xl font-bold text-gray-400 uppercase tracking-[0.2em] max-w-3xl mx-auto leading-relaxed">
                        Spend your digital assets anywhere in the physical world. Instant loads, global reach.
                    </p>
                </div>

                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 mb-32">
                    <CardVariant 
                        name="Platinum"
                        type="Virtual + Physical Available"
                        price="30"
                        colorClass="bg-teal-500"
                        image="/assets/b20card_platinum.png"
                        features={[
                            "Instant Loading from Tez Exchange",
                            "Universal Online Purchase Support",
                            "Free Virtual Card Creation",
                            "1.5% Standard Transaction Fee",
                            "Connects directly with B20 Wallet"
                        ]}
                    />
                    <CardVariant 
                        name="Prestige"
                        type="Premium Matte Black Finish"
                        price="50"
                        colorClass="bg-teal-500"
                        image="/assets/b20card_prestige_matte_black.png"
                        features={[
                            "Luxury Physical Card Hardware",
                            "Unlimited ATM Withdrawals Globally",
                            "Priority Customer Support",
                            "Exclusive Merchant Rewards",
                            "Instant Crypto-to-Cash Settlements"
                        ]}
                    />
                </div>

                {/* Features Deep Dive */}
                <div className="max-w-7xl mx-auto bg-gray-900 rounded-[4rem] p-12 lg:p-24 relative overflow-hidden">
                    <div className="absolute inset-0 dark-grid opacity-10" />
                    <div className="relative z-10">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                            <div className="space-y-6">
                                <div className="w-16 h-16 bg-teal-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-teal-200/40">
                                    <Zap className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Instant Loading</h3>
                                <p className="text-gray-400 font-bold leading-relaxed uppercase text-xs tracking-widest">
                                    Sell crypto on Tez Exchange and your funds are instantly available on your B20CARD. No waiting for banking cycles.
                                </p>
                            </div>
                            <div className="space-y-6">
                                <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center border border-white/20">
                                    <Globe className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Global Reach</h3>
                                <p className="text-gray-400 font-bold leading-relaxed uppercase text-xs tracking-widest">
                                    Accepted at over 60 million merchants worldwide and millions of ATMs. Your crypto is now truly borderless.
                                </p>
                            </div>
                            <div className="space-y-6">
                                <div className="w-16 h-16 bg-teal-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-teal-200/40">
                                    <Shield className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Neo-Bank Security</h3>
                                <p className="text-gray-400 font-bold leading-relaxed uppercase text-xs tracking-widest">
                                    Advanced encryption, instant card freeze capability, and real-time transaction monitoring for ultimate peace of mind.
                                </p>
                            </div>
                        </div>

                        <div className="mt-24 pt-16 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {[
                                { label: "Transaction Fee", value: "1.5%", icon: <ShoppingBag className="w-4 h-4" /> },
                                { label: "Virtual Card", value: "$30", icon: <Smartphone className="w-4 h-4" /> },
                                { label: "Physical Card", value: "$50", icon: <CreditCard className="w-4 h-4" /> },
                                { label: "Settlement", value: "Instant", icon: <Star className="w-4 h-4" /> }
                            ].map((stat, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-teal-600 select-none">
                                        {stat.icon}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{stat.label}</p>
                                        <p className="text-xl font-black text-white uppercase">{stat.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

