'use client';

import { useState, useRef } from 'react';
import Navbar from '@/components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Send, Rocket, FileText, Globe, Code, ShieldCheck, 
    Activity, Zap, BarChart3, Users, CheckCircle2,
    Database, PhoneCall, ArrowRight, Layers, Sparkles,
    Wallet, ArrowRightLeft, Coins, Landmark, LineChart, Server, SwitchCamera, CreditCard, Shield, Gavel, Gamepad2, FlaskConical, ChevronRight
} from 'lucide-react';

const ECOSYSTEM_SERVICES = [
  {
    id: "wallet",
    category: "Wallet & Account Layer",
    icon: Wallet,
    color: "from-blue-500 to-cyan-500",
    products: [
      { name: "Crypto Wallets", features: ["Store/send/receive digital assets", "Seed phrase or private key control", "Multi-chain & multi-token support"] },
      { name: "Smart Contract Wallets", features: ["Account abstraction (no seed phrase needed)", "Social recovery & multi-sig security", "Gasless transactions"] },
      { name: "MPC Wallets", features: ["Private key split across multiple parties", "High security for institutions", "No single point of failure"] },
      { name: "Wallet-as-a-Service (WaaS)", features: ["APIs to embed wallets in apps", "Custodial/non-custodial options", "User onboarding without complexity"] }
    ]
  },
  {
    id: "trading",
    category: "Trading & Exchange Layer",
    icon: Activity,
    color: "from-rose-500 to-orange-500",
    products: [
      { name: "Centralized Exchanges (CEX)", features: ["Fiat on/off ramp", "High liquidity trading", "Advanced order types"] },
      { name: "Decentralized Exchanges (DEX)", features: ["Non-custodial trading", "AMM-based liquidity pools", "Permissionless token listing"] },
      { name: "Aggregators (DEX/CEX)", features: ["Find best price across platforms", "Reduce slippage", "Route trades automatically"] },
      { name: "OTC Desks", features: ["Large volume private trades", "Reduced market impact", "Institutional services"] }
    ]
  },
  {
    id: "liquidity",
    category: "Swapping & Liquidity",
    icon: ArrowRightLeft,
    color: "from-emerald-500 to-teal-500",
    products: [
      { name: "Token Swap Platforms", features: ["Instant token conversion", "Multi-chain swapping", "Low UI complexity"] },
      { name: "Liquidity Pools", features: ["Users provide token pairs", "Earn fees from trades", "AMM pricing models"] },
      { name: "Market Making Services", features: ["Provide liquidity for tokens", "Reduce volatility", "Improve trading volume"] }
    ]
  },
  {
    id: "launch",
    category: "Fundraising & Token Launch",
    icon: Rocket,
    color: "from-purple-500 to-pink-500",
    products: [
      { name: "Launchpads (ICO / IDO / IEO)", features: ["Early-stage fundraising", "Tier-based investor access", "KYC & whitelist systems"] },
      { name: "Token Generation Platforms", features: ["Create tokens easily", "Smart contract templates", "Custom tokenomics"] },
      { name: "Vesting Platforms", features: ["Lock tokens over time", "Prevent dumping", "Automated release schedules"] },
      { name: "Airdrop Platforms", features: ["Token distribution campaigns", "Task-based rewards", "Growth marketing tool"] }
    ]
  },
  {
    id: "defi",
    category: "DeFi (Financial Services)",
    icon: Landmark,
    color: "from-amber-500 to-yellow-500",
    products: [
      { name: "Lending Platforms", features: ["Lend crypto for interest", "Overcollateralized loans", "Automated liquidation"] },
      { name: "Borrowing Platforms", features: ["Borrow against crypto assets", "Instant liquidity", "No credit score needed"] },
      { name: "Staking Platforms", features: ["Earn passive rewards", "Validator participation", "Flexible/locked staking"] },
      { name: "Yield Farming Platforms", features: ["Provide liquidity for rewards", "Incentivized pools", "High-risk/high-return"] },
      { name: "Stablecoin Systems", features: ["Price stability mechanisms", "Fiat-backed or algorithmic", "Used in DeFi ecosystems"] },
      { name: "Derivatives Platforms", features: ["Futures & options trading", "Leverage positions", "Risk hedging tools"] }
    ]
  },
  {
    id: "analytics",
    category: "Analytics & Intelligence",
    icon: LineChart,
    color: "from-indigo-500 to-blue-500",
    products: [
      { name: "Portfolio Trackers", features: ["Multi-wallet tracking", "Profit/loss analytics", "Alerts & insights"] },
      { name: "On-Chain Analytics", features: ["Blockchain data analysis", "Whale tracking", "Transaction insights"] },
      { name: "Trading Bots / Automation", features: ["Algorithmic trading", "Arbitrage strategies", "24/7 execution"] },
      { name: "Signal Platforms", features: ["Trade recommendations", "Market trend analysis", "AI-based predictions"] }
    ]
  },
  {
    id: "infrastructure",
    category: "Infrastructure Layer",
    icon: Server,
    color: "from-gray-500 to-slate-500",
    products: [
      { name: "Node-as-a-Service", features: ["Blockchain node hosting", "API access for developers", "Scalable infrastructure"] },
      { name: "RPC Providers", features: ["Fast blockchain queries", "Reliable endpoints", "Developer-friendly APIs"] },
      { name: "Oracles", features: ["Real-world data feeds", "Price feeds for DeFi", "Secure data validation"] },
      { name: "Indexing Services", features: ["Organize blockchain data", "Fast querying", "Developer tools"] }
    ]
  },
  {
    id: "crosschain",
    category: "Cross-Chain & Scaling",
    icon: SwitchCamera,
    color: "from-violet-500 to-fuchsia-500",
    products: [
      { name: "Crypto Bridges", features: ["Transfer assets between chains", "Wrapped tokens", "Cross-chain liquidity"] },
      { name: "Layer 2 Solutions", features: ["Faster transactions", "Lower gas fees", "Off-chain scaling"] },
      { name: "Interoperability Protocols", features: ["Connect multiple blockchains", "Shared liquidity", "Cross-chain apps"] }
    ]
  },
  {
    id: "payments",
    category: "Payments & Commerce",
    icon: CreditCard,
    color: "from-green-500 to-emerald-500",
    products: [
      { name: "Payment Gateways", features: ["Accept crypto payments", "Convert to fiat", "Checkout integration"] },
      { name: "Crypto Cards (Debit/Credit)", features: ["Spend crypto in real world", "Instant conversion", "Cashback rewards"] },
      { name: "Subscription Payments", features: ["Recurring crypto billing", "Smart contract automation", "SaaS integration"] }
    ]
  },
  {
    id: "security",
    category: "Security & Risk",
    icon: Shield,
    color: "from-red-500 to-rose-500",
    products: [
      { name: "Custody Services", features: ["Institutional asset storage", "Multi-sig security", "Insurance protection"] },
      { name: "Crypto Insurance", features: ["Cover hacks/losses", "Risk pooling", "Claim automation"] },
      { name: "Audit Services", features: ["Smart contract audits", "Vulnerability detection", "Security certification"] },
      { name: "Anti-Fraud / AML Tools", features: ["Transaction monitoring", "Compliance checks", "Risk scoring"] }
    ]
  },
  {
    id: "compliance",
    category: "Compliance & Legal",
    icon: Gavel,
    color: "from-blue-600 to-indigo-600",
    products: [
      { name: "KYC/Identity Platforms", features: ["User verification", "Regulatory compliance", "Fraud prevention"] },
      { name: "Crypto Tax Tools", features: ["Tax calculation", "Transaction history", "Country-specific compliance"] }
    ]
  },
  {
    id: "userfacing",
    category: "User-Facing Ecosystems",
    icon: Gamepad2,
    color: "from-pink-500 to-rose-500",
    products: [
      { name: "NFT Platforms", features: ["Mint/buy/sell NFTs", "Royalties for creators", "Digital ownership"] },
      { name: "GameFi Platforms", features: ["Play-to-earn games", "Token economies", "NFT assets"] },
      { name: "SocialFi Platforms", features: ["Earn via social activity", "Tokenized communities", "Creator monetization"] },
      { name: "Metaverse Economies", features: ["Virtual land/assets", "Token-based economies", "Digital identity"] }
    ]
  },
  {
    id: "advanced",
    category: "Advanced / Emerging",
    icon: FlaskConical,
    color: "from-cyan-500 to-teal-500",
    products: [
      { name: "Privacy Protocols", features: ["Anonymous transactions", "Zero-knowledge proofs", "Data protection"] },
      { name: "MEV Platforms", features: ["Extract value from transactions", "Arbitrage bots", "Block optimization"] },
      { name: "Decentralized Storage", features: ["Store data on-chain/off-chain", "Distributed networks", "Censorship resistance"] },
      { name: "Prediction Markets", features: ["Bet on outcomes", "Crowd-based forecasting", "Token incentives"] },
      { name: "Reputation Systems", features: ["On-chain user reputation", "Trust scoring", "Identity-linked data"] }
    ]
  }
];

export default function Services() {
    const [activeTab, setActiveTab] = useState(ECOSYSTEM_SERVICES[0].id);
    const formRef = useRef(null);

    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', project: '', details: '',
        interestedProduct: ''
    });
    const [status, setStatus] = useState('idle');

    const handleRequestCallback = (productName) => {
        setFormData(prev => ({ ...prev, interestedProduct: productName }));
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setStatus('submitting');
        setTimeout(() => {
            setStatus('success');
            setFormData({ name: '', email: '', phone: '', project: '', details: '', interestedProduct: '' });
            setTimeout(() => setStatus('idle'), 5000);
        }, 1500);
    };

    const activeCategory = ECOSYSTEM_SERVICES.find(c => c.id === activeTab);

    return (
        <main className="min-h-screen bg-[#0b0f19] selection:bg-rose-500 selection:text-white pb-32">
            <Navbar />

            {/* Premium Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-rose-500/10 blur-[120px]" />
                <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-orange-500/10 blur-[120px]" />
                <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[40%] rounded-full bg-purple-500/10 blur-[120px]" />
            </div>

            <div className="relative z-10 px-4 md:px-8 max-w-7xl mx-auto pt-32 md:pt-40">
                
                {/* ── Hero Section ── */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-20"
                >
                    <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-[0.3em] mb-8 shadow-lg shadow-rose-500/10">
                        <Sparkles className="w-4 h-4" /> Comprehensive Ecosystem
                    </span>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 text-white tracking-tighter leading-tight">
                        Build the <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-amber-500">Unimaginable</span>
                    </h1>
                    <p className="text-gray-400 max-w-3xl mx-auto text-lg md:text-xl font-medium leading-relaxed">
                        We develop cutting-edge Web3 products and services across 50+ specialized sectors. From advanced DeFi layers to robust compliance infrastructure, our elite architects deploy production-ready protocols tailored to your ultimate vision.
                    </p>
                </motion.div>

                {/* ── Interactive Catalog Explorer ── */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-32">
                    
                    {/* Sidebar Navigation */}
                    <div className="lg:col-span-1 space-y-2 lg:sticky lg:top-32 h-fit max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
                        {ECOSYSTEM_SERVICES.map((cat) => {
                            const Icon = cat.icon;
                            const isActive = activeTab === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveTab(cat.id)}
                                    className={`w-full text-left px-5 py-4 rounded-2xl flex items-center justify-between transition-all duration-300 ${isActive ? 'bg-white/10 border border-white/20 shadow-lg' : 'hover:bg-white/5 border border-transparent'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? `bg-gradient-to-br ${cat.color} text-white shadow-lg` : 'bg-white/5 text-gray-500'}`}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <span className={`text-[11px] font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-gray-500'}`}>{cat.category}</span>
                                    </div>
                                    {isActive && <ChevronRight className="w-4 h-4 text-white" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Content Area */}
                    <div className="lg:col-span-3">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeCategory.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden"
                            >
                                <div className={`absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl ${activeCategory.color} opacity-10 blur-3xl rounded-full pointer-events-none`} />
                                
                                <div className="flex items-center gap-4 mb-12 relative z-10">
                                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${activeCategory.color} flex items-center justify-center text-white shadow-xl rotate-3`}>
                                        <activeCategory.icon className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tight">{activeCategory.category}</h2>
                                        <p className="text-xs text-gray-400 font-black uppercase tracking-[0.2em] mt-2">{activeCategory.products.length} Specialized Architectures</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                    {activeCategory.products.map((prod, idx) => (
                                        <div key={idx} className="bg-[#0b0f19]/80 border border-white/5 hover:border-white/20 rounded-[2rem] p-8 flex flex-col justify-between group transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl">
                                            <div>
                                                <h3 className="text-xl font-black text-white mb-6 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 transition-all">{prod.name}</h3>
                                                <ul className="space-y-4 mb-8">
                                                    {prod.features.map((f, i) => (
                                                        <li key={i} className="flex items-start gap-3">
                                                            <CheckCircle2 className={`w-5 h-5 opacity-80 shrink-0 text-white`} />
                                                            <span className="text-sm text-gray-400 font-medium leading-relaxed">{f}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <button 
                                                onClick={() => handleRequestCallback(prod.name)}
                                                className="w-full py-4 rounded-xl bg-white/5 hover:bg-white text-gray-300 hover:text-black text-xs font-black uppercase tracking-widest border border-white/10 flex items-center justify-center gap-2 transition-all active:scale-95"
                                            >
                                                Request VIP Callback <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* ── Premium Request Callback Form ── */}
                <motion.div
                    ref={formRef}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="relative bg-[#111827] border border-white/10 shadow-2xl rounded-[3rem] p-8 md:p-14 overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-rose-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 relative z-10">
                        
                        {/* LHS: Info */}
                        <div>
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-xl shadow-rose-500/20 mb-8">
                                <PhoneCall className="w-8 h-8" />
                            </div>
                            <h2 className="text-4xl lg:text-5xl font-black text-white mb-6 tracking-tighter leading-tight">Request an Expert <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-amber-400">Consultation</span></h2>
                            <p className="text-gray-400 text-lg mb-8 font-medium leading-relaxed">
                                Ready to deploy institutional-grade infrastructure? Our elite architects and development teams are on standby to engineer your vision.
                                <br/><br/>
                                Drop your details entirely securely. A dedicated partnership director will establish contact within 24 hours.
                            </p>
                            
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-rose-400">
                                        <ShieldCheck className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">Bank-Grade Security</p>
                                        <p className="text-xs text-gray-400 mt-1">Full NDA coverage for all strategic consultations.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-amber-400">
                                        <Globe className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">Global Reach</p>
                                        <p className="text-xs text-gray-400 mt-1">Multi-timezone support tailored to your jurisdiction.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RHS: Form */}
                        <div className="bg-[#0b0f19] p-8 md:p-10 rounded-[2.5rem] border border-white/5 shadow-2xl relative">
                            {status === 'success' ? (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20">
                                    <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-4 border border-emerald-500/30">
                                        <CheckCircle2 className="w-10 h-10" />
                                    </div>
                                    <h3 className="text-2xl font-black text-white">Transmission Received</h3>
                                    <p className="text-gray-400 text-sm">Deployment architects deployed. We'll be in touch.</p>
                                </motion.div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Your Name</label>
                                            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Satoshi Nakamoto" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-rose-500/50 focus:bg-white/10 transition-all text-white placeholder-gray-600 font-medium" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Phone Number</label>
                                            <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+1 (555) 000-0000" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-rose-500/50 focus:bg-white/10 transition-all text-white placeholder-gray-600 font-medium" />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Email or Telegram</label>
                                        <input required type="text" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="founder@project.io or @founder" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-rose-500/50 focus:bg-white/10 transition-all text-white placeholder-gray-600 font-medium" />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 mb-1 block flex items-center justify-between">
                                            <span>Target Infrastructure</span>
                                            {formData.interestedProduct && (
                                                <button type="button" onClick={() => setFormData({...formData, interestedProduct: ''})} className="text-rose-500 hover:text-white transition-colors">Clear</button>
                                            )}
                                        </label>
                                        {formData.interestedProduct ? (
                                            <div className="w-full bg-gradient-to-r from-rose-500/10 to-amber-500/10 border border-rose-500/30 rounded-2xl px-5 py-4 text-rose-400 font-black tracking-wide flex items-center justify-between">
                                                {formData.interestedProduct}
                                                <CheckCircle2 className="w-5 h-5 text-rose-500" />
                                            </div>
                                        ) : (
                                            <input type="text" value={formData.project} onChange={e => setFormData({...formData, project: e.target.value})} placeholder="e.g. Multi-chain DEX, zk-Rollup, Custom Token..." className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-rose-500/50 focus:bg-white/10 transition-all text-white placeholder-gray-600 font-medium" />
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Deployment Specifications</label>
                                        <textarea required rows="4" value={formData.details} onChange={e => setFormData({...formData, details: e.target.value})} placeholder="Describe your vision, current phase, and operational goals..." className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-rose-500/50 focus:bg-white/10 transition-all text-white placeholder-gray-600 font-medium resize-none" />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={status === 'submitting'}
                                        className="w-full group py-5 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-rose-500/20 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {status === 'submitting' ? 'Negotiating Deployment...' : 'Initiate Secure Callback'} 
                                        {!status && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </motion.div>
                
            </div>
        </main>
    );
}
