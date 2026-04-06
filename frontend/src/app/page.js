'use client';

import Navbar from '@/components/Navbar';
import CryptoTicker from '@/components/CryptoTicker';
import CoinCarousel from '@/components/CoinCarousel';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useWallet } from '@/context/WalletContext';
import { useEffect, useState, useRef } from 'react';
import { Sparkles, TrendingUp, Zap, ArrowRight, Brain, CheckCircle, Smartphone, Globe, Shield, MessageSquare, Rocket, CreditCard, Star, Activity } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// ─── Animated Counter Hook ─────────────────────────────────────────────────────
const BASE_STATS = { total: 15000, h24: 200, h1: 20, migrated: 5 };
const INCREMENTS  = { total: 3, h24: 1, h1: 1, migrated: 1 };

function useAnimatedStats() {
  const [stats, setStats] = useState(BASE_STATS);
  const phaseRef = useRef(0);

  useEffect(() => {
    const TICK_MS = 5000;
    const RESET_MS = 24 * 60 * 60 * 1000;
    const tick = () => {
      setStats(prev => {
        const isUp = phaseRef.current < 5;
        const mul = isUp ? 1 : -1;
        return {
          total:    prev.total    + mul * INCREMENTS.total,
          h24:      prev.h24      + mul * INCREMENTS.h24,
          h1:       prev.h1       + mul * INCREMENTS.h1,
          migrated: prev.migrated + mul * INCREMENTS.migrated,
        };
      });
      phaseRef.current = (phaseRef.current + 1) % 8;
    };
    const tickId   = setInterval(tick, TICK_MS);
    const resetId  = setInterval(() => { setStats(BASE_STATS); phaseRef.current = 0; }, RESET_MS);
    return () => { clearInterval(tickId); clearInterval(resetId); };
  }, []);

  return stats;
}

// ─── Floating Particle Background ─────────────────────────────────────────────
const Particles = () => {
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const p = [...Array(20)].map((_, i) => ({
      width:  Math.random() * 6 + 2,
      height: Math.random() * 6 + 2,
      left:   `${Math.random() * 100}%`,
      top:    `${Math.random() * 100}%`,
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 3
    }));
    setParticles(p);
    setMounted(true);
  }, []);

  if (!mounted) return <div className="absolute inset-0 overflow-hidden pointer-events-none" />;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width:  p.width,
            height: p.height,
            left:   p.left,
            top:    p.top,
            background: i % 3 === 0 ? '#e11d48' : i % 3 === 1 ? '#fbbf24' : '#f43f5e',
            opacity: 0.3,
          }}
          animate={{ y: [0, -30, 0], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay }}
        />
      ))}
    </div>
  );
};

// ─── Section Label ─────────────────────────────────────────────────────────────
const SectionBadge = ({ icon, text }) => (
  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold uppercase tracking-widest mb-4">
    {icon} {text}
  </span>
);

// ─── AI Trend Banner ────────────────────────────────────────────────────────────
const TrendBanner = () => {
    const [trend, setTrend] = useState(null);

    useEffect(() => {
        const fetchTrend = async () => {
            try {
                const res = await axios.get(`${API_URL}/ml/trends`);
                setTrend(res.data);
            } catch (err) { /* silent fail */ }
        };
        fetchTrend();
    }, []);

    if (!trend) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="group relative flex flex-col md:flex-row items-center gap-4 p-4 md:p-6 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border border-amber-500/20 rounded-3xl overflow-hidden shadow-2xl"
        >
            <div className="absolute top-0 right-0 p-2 opacity-5 scale-150"><Sparkles className="w-24 h-24 text-amber-500" /></div>
            
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center border border-amber-500/30">
                    <TrendingUp className="w-6 h-6 text-amber-500 animate-pulse" />
                </div>
                <div>
                    <p className="text-[10px] md:text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-1">
                        <Zap className="w-3 h-3 fill-current" /> Live AI Market Forecast
                    </p>
                    <p className="text-sm md:text-lg font-bold text-white">
                        {trend.forecast}
                    </p>
                </div>
            </div>

            <div className="md:ml-auto flex items-center gap-6">
                <div className="hidden lg:flex items-center gap-3 border-l border-white/10 pl-6">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-wider">Hot Category</p>
                    <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-black rounded-lg">
                        {trend.hotCategory}
                    </span>
                </div>
                <Link href="/ai-agent">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        className="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black rounded-xl shadow-lg shadow-rose-500/20 flex items-center gap-2 transition-all"
                    >
                        Try AI Agent <ArrowRight className="w-3.5 h-3.5" />
                    </motion.button>
                </Link>
            </div>
        </motion.div>
    );
};

// ─── Interactive Feature Element ──────────────────────────────────────────────
const FeatureShowcase = ({ services }) => {
  const [active, setActive] = useState(0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
      <div className="lg:col-span-5 space-y-4">
        {services.map((s, i) => (
          <motion.div
            key={i}
            onHoverStart={() => setActive(i)}
            onClick={() => setActive(i)}
            className={`p-6 rounded-3xl cursor-pointer transition-all duration-500 border-2 ${
              active === i 
                ? 'bg-white shadow-2xl border-rose-500/20 translate-x-4' 
                : 'bg-transparent border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl icon-3d">{s.icon}</span>
              <div>
                <h4 className={`font-black text-lg ${active === i ? 'text-rose-500' : 'text-gray-900'}`}>{s.title}</h4>
                {active === i && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="text-gray-500 text-sm mt-1 leading-relaxed"
                  >
                    {s.desc}
                  </motion.p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      <div className="lg:col-span-7 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, scale: 0.9, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 1.1, x: -20 }}
            className={`w-full aspect-video rounded-[2.5rem] bg-gradient-to-br ${services[active].gradient} p-8 md:p-16 flex flex-col justify-center border-4 border-white shadow-3xl relative overflow-hidden`}
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12">
                <span className="text-[200px] icon-3d">{services[active].icon}</span>
            </div>
            
            <SectionBadge icon={services[active].icon} text="Featured Intelligence" />
            <h3 className="text-3xl md:text-5xl font-black mb-6 text-gray-900 leading-tight">
              {services[active].title}
            </h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services[active].features.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-700 font-bold bg-white/40 backdrop-blur-md p-3 rounded-2xl border border-white/50">
                  <Zap className="w-4 h-4 text-rose-500 fill-current" /> {f}
                </li>
              ))}
            </ul>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Home() {
  const { account, connectWallet } = useWallet();
  const stats = useAnimatedStats();
  const [tokens, setTokens] = useState([]);

  useEffect(() => {
    axios.get(`${API_URL}/tokens?limit=4`)
      .then(r => setTokens(r.data))
      .catch(console.error);
  }, []);

  const services = [
    {
      icon: '✨',
      title: 'AI Token Architect',
      desc: 'Brainstorm and draft complete token plans with our Claude-powered AI Agent.',
      features: ['One-prompt tokenomics', 'Professional taglines', 'Contextual branding', 'Auto-import to launch'],
      gradient: 'from-blue-500/10 to-blue-600/5 border-blue-400/30',
      delay: 0,
    },
    {
      icon: '🛡️',
      title: 'ML Security Suite',
      desc: 'Integrated Machine Learning to protect creators and investors from copycats.',
      features: ['Mimic token detection', 'Intelligence scoring', 'Similarity algorithms', 'Risk grading system'],
      gradient: 'from-emerald-500/10 to-emerald-600/5 border-emerald-400/30',
      delay: 0.1,
    },
    {
      icon: '💵',
      title: 'Fiat Buy & Sell',
      desc: 'Seamlessly convert your local currency into crypto using our integrated premium fiat gateway.',
      features: ['Credit/Debit Cards', 'Bank Transfers', 'Instant Verification', 'Global Support'],
      gradient: 'from-amber-500/10 to-amber-600/5 border-amber-400/30',
      delay: 0.2,
    },
    {
      icon: '⚡',
      title: 'B20 Lite Exchange',
      desc: 'High-speed token swaps powered by the deepest PancakeSwap liquidity across the BNB ecosystem.',
      features: ['Zero Markup', 'Slippage Control', 'Multi-token Routing', 'Pro Charts Included'],
      gradient: 'from-rose-500/10 to-rose-600/5 border-rose-500/30',
      delay: 0.3,
    },
    {
      icon: '📊',
      title: 'Bonding Curve Launch',
      desc: 'Automated price discovery that rewards early adopters and ensures fairness.',
      features: ['Fair price discovery', 'No insider allocations', 'Auto-PancakeSwap listing', 'Permanent liquidity lock'],
      gradient: 'from-amber-500/10 to-amber-600/5 border-amber-400/30',
      delay: 0.4,
    },
    {
      icon: '💎',
      title: 'Instant DApp Website',
      desc: 'Every token gets a dedicated, high-converting claim and trade page automatically.',
      features: ['Mobile-optimized', 'Direct DEX connection', 'Social media integration', 'Live trade tracking'],
      gradient: 'from-rose-500/10 to-rose-600/5 border-rose-400/30',
      delay: 0.5,
    },
    {
      icon: '💳',
      title: 'B20CARD Neo-Banking',
      desc: 'The ultimate bridge between your B20 assets and the real world. Spend crypto anywhere.',
      features: ['Virtual & Physical Variants', 'Instant Load from Exchange', '60M+ Merchants Worldwide', '1.5% Standard Fee'],
      gradient: 'from-amber-500/10 to-amber-600/5 border-amber-500/30',
      delay: 0.6,
    },
  ];

  const whyItems = [
    { icon: '🤖', title: 'AI-Powered Infrastructure' },
    { icon: '⚡', title: '2-Minute Token Deployment' },
    { icon: '🔓', title: 'Fully Decentralized Launch' },
    { icon: '📈', title: 'Bonding Curve & Fair Launch' },
    { icon: '💱', title: 'Built-in Trading Platform' },
    { icon: '🥞', title: 'PancakeSwap Integration' },
    { icon: '🏛️', title: 'Transparent Treasury System' },
    { icon: '🛡️', title: 'Secure Smart Contracts' },
  ];

  const contractExamples = [
    { suffix: '4444', label: 'Quad Fours', color: 'text-amber-500' },
    { suffix: '7777', label: 'Lucky Sevens', color: 'text-rose-500' },
    { suffix: '8888', label: 'Moonshot', color: 'text-emerald-500' },
    { suffix: '0000', label: 'Genesis', color: 'text-purple-500' },
  ];

  return (
    <main className="min-h-screen paw-pattern overflow-x-hidden">
      <Navbar />
      <CryptoTicker />


      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="relative pt-12 pb-24 px-4 md:px-8 overflow-hidden">
        <Particles />
        <div className="absolute inset-0 dark-grid opacity-20" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-rose-500/10 blur-[140px] rounded-full -z-10" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-amber-500/10 blur-[120px] rounded-full -z-10" />

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            {/* Badge */}
            <motion.span
              initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-rose-500/10 to-amber-500/10 border border-rose-500/20 text-rose-600 text-sm font-bold mb-8"
            >
              ⚡ AI-Powered Web3 Token Launchpad • BNB Smart Chain
            </motion.span>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-tight">
              Launch Your Crypto Token{' '}
              <span className="text-red-gradient">in 2 Minutes</span>
            </h1>

            <p className="text-gray-600 text-xl max-w-3xl mx-auto mb-6 leading-relaxed font-medium">
              B20-LAB is an AI-powered Web3 launchpad that allows anyone to create, launch, and trade
              crypto tokens instantly with automated blockchain infrastructure.
            </p>

            {/* Highlights */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
              {['Deploy in under 2 minutes', '100% AI-powered automation', 'No coding required', 'Lowest deployment fees', 'Built for BNB ecosystem'].map((item, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.07 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 border border-black/10 text-gray-700 text-xs font-semibold shadow-sm backdrop-blur-sm"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {item}
                </motion.span>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/create">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(225,29,72,0.4)' }}
                  whileTap={{ scale: 0.97 }}
                  className="px-8 py-4 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl flex items-center gap-2 shadow-2xl shadow-rose-500/30 text-base"
                >
                  🚀 Launch Token
                </motion.button>
              </Link>
              <Link href="/launch">
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                  className="px-8 py-4 bg-white/70 hover:bg-white text-gray-900 font-bold rounded-2xl border border-black/10 backdrop-blur-sm text-base shadow-md"
                >
                  🔍 Explore Tokens
                </motion.button>
              </Link>
              <Link href="/exchange">
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                  className="px-8 py-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 font-bold rounded-2xl border border-amber-500/20 text-base"
                >
                  📊 Start Trading
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Neura AI Guidance Section ── */}
      <section className="py-24 px-4 md:px-8 relative overflow-hidden bg-gray-900 border-y border-white/5">
        <div className="absolute inset-0 paw-pattern opacity-10" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-500/10 blur-[150px] -z-10 rounded-full" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[150px] -z-10 rounded-full" />
        
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div 
               initial={{ opacity: 0, x: -50 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
               className="relative"
            >
              <div className="relative z-10 rounded-[3rem] overflow-hidden border-8 border-white/5 shadow-3xl aspect-square group">
                <img 
                  src="/assets/neura_ai.jpg" 
                  alt="Neura AI Neural Core"
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 scale-110 group-hover:scale-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60" />
                <div className="absolute bottom-8 left-8 right-8 p-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl">
                   <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> 
                      <p className="text-white font-black text-xs uppercase tracking-[0.3em]">Neura AI Active</p>
                   </div>
                   <p className="text-gray-300 text-sm font-medium leading-relaxed italic">
                      "I analyze complex neural patterns to ensure your token architecture is perfect before it ever touches the blockchain."
                   </p>
                </div>
              </div>
              
              {/* Floating Tech Badges */}
              <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 4, repeat: Infinity }} className="absolute -top-10 -right-10 p-6 bg-white rounded-3xl shadow-2xl z-20 hidden md:block border border-gray-100">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center">
                      <Brain className="w-6 h-6" />
                   </div>
                   <div>
                      <p className="text-[10px] font-black uppercase text-gray-400">Memory Core</p>
                      <p className="text-sm font-black text-gray-900">Adaptive Intelligence</p>
                   </div>
                </div>
              </motion.div>
            </motion.div>

            <motion.div 
               initial={{ opacity: 0, x: 50 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
               className="space-y-8"
            >
              <div>
                <SectionBadge icon={<Sparkles className="w-4 h-4" />} text="Intelligent Guidance" />
                <h2 className="text-4xl md:text-6xl font-black text-white leading-tight mb-6">
                  Stuck in the process? <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-indigo-500">Neura AI is here to lead.</span>
                </h2>
                <p className="text-gray-400 text-lg leading-relaxed max-w-xl">
                  Deploying a token can be complex. Neura AI is integrated throughout B20-LAB to guide you through fees, smart contract logic, and listing strategies.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { title: 'Zero Friction', desc: 'Ask about deployment fees or minimum balances anytime.', icon: '⚡' },
                  { title: 'Market Logic', desc: 'Get AI insights on name uniqueness and market trends.', icon: '📊' },
                  { title: 'Technical Oracle', desc: 'Understand the underlying B20 standard architecture.', icon: '🏗️' },
                  { title: 'Guardian Mode', desc: 'Neura identifies common pitfalls and bot-vulnerability.', icon: '🛡️' }
                ].map((item, idx) => (
                  <div key={idx} className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all cursor-default group">
                    <span className="text-2xl mb-3 block">{item.icon}</span>
                    <h4 className="text-white font-black text-sm mb-2 uppercase tracking-wide">{item.title}</h4>
                    <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-4">
                 <button className="px-8 py-4 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl shadow-xl shadow-rose-500/20 flex items-center justify-center gap-3 transition-all group active:scale-95">
                    <MessageSquare className="w-5 h-5" /> Start Chatting with Neura
                 </button>
                 <Link href="/create">
                    <button className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-black rounded-2xl border border-white/10 flex items-center justify-center gap-3 transition-all active:scale-95">
                       Explore Creation <ArrowRight className="w-5 h-5 flex group-hover:translate-x-1" />
                    </button>
                 </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── LIVE STATS ──────────────────────────────────────────────────────── */}
      <section className="py-12 px-4 md:px-8 border-y border-black/5 bg-white/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { value: stats.total.toLocaleString() + '+', label: 'Total Tokens', color: 'text-gray-900', key: stats.total },
              { value: stats.h24 + '+', label: 'Launched 24h', color: 'text-rose-500', key: stats.h24 },
              { value: stats.h1 + '+', label: 'Launched 1h', color: 'text-amber-500', key: stats.h1 },
              { value: stats.migrated + '+', label: 'Migrated to DEX', color: 'text-emerald-500', key: stats.migrated },
            ].map((s, i) => (
              <div key={i} className={`p-4 ${i > 0 ? 'border-l border-black/5' : ''}`}>
                <motion.div
                  key={s.key}
                  initial={{ scale: 1.15 }} animate={{ scale: 1 }}
                  className={`text-3xl md:text-4xl font-black mb-1 ${s.color}`}
                >
                  {s.value}
                </motion.div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LAUNCHPAD EXPLORER (Nebula Terminal) ────────────────────────────────── */}
      <section className="py-24 px-4 md:px-8 relative overflow-hidden">
        <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-amber-500/5 blur-[120px] rounded-full -z-10" />
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
            <div className="max-w-2xl">
              <SectionBadge icon={<Zap className="w-4 h-4" />} text="Live Nebula Feed" />
              <h2 className="text-5xl md:text-7xl font-black leading-tight text-gray-900">
                Nebula <span className="text-red-gradient">Launchpad</span> Explorer.
              </h2>
            </div>
            <Link href="/launch">
              <button className="px-8 py-4 bg-black text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-gray-800 transition-all flex items-center gap-3">
                View All Activity <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tokens.length === 0 ? (
                // Skeleton/Fallback
                [...Array(4)].map((_, i) => (
                    <div key={i} className="p-8 rounded-[2.5rem] bg-gray-50 border border-gray-100 animate-pulse h-64" />
                ))
            ) : tokens.slice(0, 4).map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group relative p-8 rounded-[2.5rem] bg-white border border-black/5 hover:border-rose-500/20 hover:shadow-3xl transition-all h-full flex flex-col"
              >
                <div className="absolute top-6 right-6 flex gap-2">
                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-600 text-[8px] font-black uppercase rounded-md border border-emerald-500/10">Live</span>
                </div>
                
                <div className="w-16 h-16 rounded-2xl overflow-hidden mb-6 border-2 border-white shadow-lg group-hover:scale-110 transition-transform">
                  <img src={t.logo_url || '/logo.png'} className="w-full h-full object-cover" alt="" />
                </div>
                
                <h3 className="text-xl font-black text-gray-900 mb-1">{t.symbol}</h3>
                <p className="text-xs font-bold text-gray-400 mb-6 uppercase tracking-widest">{t.name}</p>
                
                <div className="mt-auto pt-6 border-t border-black/5 space-y-4">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className="text-gray-400">Market Cap</span>
                    <span className="text-gray-900">{(t.market_cap || 0).toLocaleString()} BNB</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className="text-gray-400">Launch Date</span>
                    <span className="text-gray-900">{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                  <Link href={`/trade?address=${t.contract_address}`}>
                    <button className="w-full mt-4 py-3 bg-rose-500 hover:bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-rose-500/10">
                      Enter Terminal
                    </button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES SHOWCASE ──────────────────────────────────────────────────── */}
      <section className="py-24 px-4 md:px-8 bg-gray-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <SectionBadge icon="🧠" text="Proprietary AI Ecosystem" />
            <h2 className="text-5xl md:text-7xl font-black mb-6">
              Beyond the <span className="text-red-gradient">Ordinary</span>
            </h2>
            <p className="text-gray-600 text-xl max-w-3xl mx-auto font-medium">
              We've dismantled the traditional card grid in favor of an interactive intelligence suite. 
              Explore how our machine learning core powers your project.
            </p>
          </div>
          
          <FeatureShowcase services={services} />
        </div>
      </section>

      {/* ── NEW FRONTIERS: FIAT & LITE EXCHANGE ────────────────────────────────── */}
      <section className="py-32 px-4 md:px-8 relative overflow-hidden bg-[#0A0A0A] text-white">
        <div className="absolute inset-0 dark-grid opacity-10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-rose-500/5 blur-[160px] rounded-full" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="relative z-10 rounded-[3rem] overflow-hidden border-4 border-white/5 shadow-3xl aspect-[4/3] group">
                <img 
                  src="https://images.unsplash.com/photo-1621761191319-c6fb62004040?q=80&w=2000&auto=format&fit=crop" 
                  alt="Digital Exchange Evolution"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 opacity-60 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent" />
                <div className="absolute bottom-12 left-12 right-12">
                  <div className="p-8 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem]">
                    <h3 className="text-2xl font-black mb-4 uppercase tracking-tighter">B20 Lite Exchange</h3>
                    <p className="text-white/40 text-sm font-bold leading-relaxed mb-6 uppercase tracking-widest">
                      Institutional grade routing. Retail simplicity.
                    </p>
                    <Link href="/exchange">
                      <button className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl transition-all shadow-xl shadow-rose-500/20 active:scale-95">
                        ENTER EXCHANGE
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
              {/* Floating Element */}
              <motion.div 
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -top-8 -right-8 p-6 bg-rose-500 rounded-3xl shadow-2xl z-20"
              >
                <Zap className="w-8 h-8 text-white fill-current" />
              </motion.div>
            </motion.div>

            <div className="space-y-12">
              <div>
                <span className="px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-[0.3em] mb-6 inline-block">
                  Universal Banking Layer
                </span>
                <h2 className="text-5xl md:text-7xl font-black leading-tight mb-8">
                  From Cash to <span className="text-rose-500">Crypto</span> in Seconds.
                </h2>
                <p className="text-white/40 text-lg font-bold leading-relaxed max-w-xl uppercase tracking-widest">
                  The bridge between legacy finance and the future of tokens is now open. No more complex hurdles.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-8 bg-white/5 border border-white/10 rounded-[2rem] hover:bg-white/10 transition-all group">
                  <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/30 mb-6 group-hover:scale-110 transition-transform">
                    <Globe className="w-7 h-7 text-emerald-500" />
                  </div>
                  <h4 className="text-white font-black text-lg mb-4 uppercase tracking-tight">Fiat Buy & Sell</h4>
                  <p className="text-white/30 text-xs font-bold leading-relaxed uppercase tracking-wider">
                    Purchase 100+ cryptocurrencies directly with your credit card or bank account in 43+ currencies.
                  </p>
                  <Link href="/fiat" className="mt-6 flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase tracking-widest hover:gap-4 transition-all">
                    Launch Gateway <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="p-8 bg-white/5 border border-white/10 rounded-[2rem] hover:bg-white/10 transition-all group">
                  <div className="w-14 h-14 bg-rose-500/20 rounded-2xl flex items-center justify-center border border-rose-500/30 mb-6 group-hover:scale-110 transition-transform">
                    <Smartphone className="w-7 h-7 text-rose-500" />
                  </div>
                  <h4 className="text-white font-black text-lg mb-4 uppercase tracking-tight">Exchange Lite</h4>
                  <p className="text-white/30 text-xs font-bold leading-relaxed uppercase tracking-wider">
                    Swap tokens instantly with minimal slippage and direct routing through PancakeSwap V3.
                  </p>
                  <Link href="/exchange" className="mt-6 flex items-center gap-2 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:gap-4 transition-all">
                    Open Terminal <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* ── BONDING CURVE ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 md:px-8 paw-pattern/70 border-y border-black/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#f8f9fa] via-transparent to-[#f8f9fa] pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <SectionBadge icon="📈" text="Bonding Curve Launch" />
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Automated <span className="text-red-gradient">Price Discovery</span>
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              B20-LAB's bonding curve mechanism ensures fair and transparent price formation from the very first trade.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              { icon: '📊', title: 'Demand-Driven Pricing', desc: 'Price increases automatically as more people buy the token — rewarding early believers.' },
              { icon: '⚖️', title: 'Fair Distribution', desc: 'No pre-sales or insider allocations. Everyone buys at the on-chain price at the time of purchase.' },
              { icon: '💧', title: 'Automated Liquidity', desc: 'Collateral from bonding curve sales automatically flows into PancakeSwap liquidity pools.' },
              { icon: '🥞', title: 'PancakeSwap Listing', desc: 'Once the curve reaches 0.01 BNB collateral, the token auto-migrates to PancakeSwap for infinite scale.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className="glass-card text-center"
              >
                <div className="text-4xl mb-4">{item.icon}</div>
                <h4 className="font-bold text-gray-900 mb-2">{item.title}</h4>
                <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Curve visual */}
          <motion.div
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="glass-card bg-gradient-to-br from-rose-500/5 to-amber-500/5 border-rose-500/20 p-6 md:p-10 text-center"
          >
            <div className="flex items-end justify-center gap-1 h-28 mb-4">
              {[8, 14, 20, 25, 32, 40, 50, 62, 76, 94, 112].map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }} whileInView={{ height: h }} viewport={{ once: true }}
                  transition={{ delay: 0.05 * i, duration: 0.6 }}
                  className="w-6 md:w-10 rounded-t-md"
                  style={{ background: `hsl(${350 - i * 5}, 80%, ${60 - i * 2}%)` }}
                />
              ))}
            </div>
            <p className="text-sm font-bold text-gray-600">Price curve rises with each purchase — early buyers get the best price ↑</p>
          </motion.div>
        </div>
      </section>

      {/* ── FEATURE HIGHLIGHTS (Staggered Layout) ──────────────────────────────── */}
      <section className="py-32 px-4 md:px-8 space-y-32">
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-16">
                <div className="flex-1">
                    <div className="p-8 md:p-12 rounded-[3.5rem] bg-gradient-to-br from-rose-500/10 to-transparent border border-rose-500/20 relative group">
                        <div className="absolute -top-12 -right-12 text-[150px] opacity-10 group-hover:rotate-12 transition-transform">💹</div>
                        <SectionBadge icon="📊" text="Market Dynamics" />
                        <h3 className="text-4xl md:text-5xl font-black mb-6 text-gray-900">Built-in Trading</h3>
                        <p className="text-gray-600 text-lg leading-relaxed mb-8">
                            Native liquidity and zero-delay trading. No external DEX routing needed during the bonding phase.
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            {['Instant Buy/Sell', 'Real-time Charts', 'BSC Live Data', 'Curve Positions'].map(f => (
                                <div key={f} className="flex items-center gap-2 text-sm font-black text-rose-600">
                                    <CheckCircle className="w-4 h-4" /> {f}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex-1 space-y-6">
                    <h2 className="text-5xl font-black text-gray-900 leading-tight">Native Liquidity for <span className="text-red-gradient">Smooth Trading</span></h2>
                    <p className="text-gray-500 text-lg font-medium tracking-tight leading-relaxed">
                        Every token launched on B20-LAB starts with native trading enabled. Our protocol handles the complex math of the bonding curve while you focus on growth.
                    </p>
                </div>
            </div>
        </div>

        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row-reverse items-center gap-16">
                <div className="flex-1">
                    <div className="p-8 md:p-12 rounded-[3.5rem] bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 relative group text-right">
                        <div className="absolute -top-12 -left-12 text-[150px] opacity-10 group-hover:-rotate-12 transition-transform">🤖</div>
                        <SectionBadge icon="🧠" text="Zero Human Bias" />
                        <h3 className="text-4xl md:text-5xl font-black mb-6 text-gray-900">AI Automation</h3>
                        <p className="text-gray-600 text-lg leading-relaxed mb-8">
                            Deploy, sync, and manage at lightspeed. Our backend AI handles the heavy lifting of smart contract complexity.
                        </p>
                        <div className="flex flex-wrap justify-end gap-3">
                            {['Auto-Compile', 'Secure Sync', 'Live Tracking', 'Smart Treasury'].map(f => (
                                <span key={f} className="px-4 py-2 bg-white rounded-2xl border border-amber-500/20 text-xs font-black text-amber-600 shadow-sm">{f}</span>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex-1 space-y-6">
                    <h2 className="text-5xl font-black text-gray-900 leading-tight">Total <span className="text-red-gradient">Automation</span></h2>
                    <p className="text-gray-500 text-lg font-medium tracking-tight leading-relaxed">
                        Say goodbye to manual configuration errors. From metadata pinning to treasury routing, B20-LAB's AI agent ensures your launch is flawless every time.
                    </p>
                </div>
            </div>
        </div>
      </section>

      <section className="py-24 px-4 md:px-8 relative overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-16">
                <div className="flex-1">
                    <div className="p-8 md:p-12 rounded-[3.5rem] bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                            <Rocket className="w-60 h-60" />
                        </div>
                        <SectionBadge icon="🚀" text="Nexus Listing" />
                        <h3 className="text-4xl md:text-5xl font-black mb-6 text-gray-900 uppercase">List Your Token</h3>
                        <p className="text-gray-600 text-lg leading-relaxed mb-8 font-medium">
                            Scale your project to the next level. Get listed on the B20 Lite Exchange and reach thousands of active BSC traders instantly.
                        </p>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                            {[
                                { t: 'Instant Exposure', i: <Zap className="w-4 h-4" /> },
                                { t: 'Professional Charts', i: <TrendingUp className="w-4 h-4" /> },
                                { t: 'Verified Badge', i: <Shield className="w-4 h-4" /> },
                                { t: 'Deep Liquidity', i: <Activity className="w-4 h-4" /> }
                            ].map((f, i) => (
                                <li key={i} className="flex items-center gap-3 text-xs font-black text-indigo-600 uppercase tracking-widest">
                                    {f.i} {f.t}
                                </li>
                            ))}
                        </ul>
                        <Link href="/exchange/list">
                            <button className="px-10 py-5 bg-black text-white font-black rounded-2xl shadow-2xl hover:bg-rose-500 transition-all active:scale-95 flex items-center gap-3">
                                Start Listing Process <ArrowRight className="w-5 h-5" />
                            </button>
                        </Link>
                    </div>
                </div>
                <div className="flex-1 space-y-8">
                    <h2 className="text-5xl md:text-7xl font-black text-gray-900 leading-tight">Your Token. <br/> <span className="text-red-gradient">Our Liquidity.</span></h2>
                    <p className="text-gray-500 text-xl font-bold tracking-tight leading-relaxed uppercase">
                        B20-LAB isn't just a launchpad; it's a growth engine. We provide the infrastructure for your token to thrive in the competitive BSC market.
                    </p>
                    <div className="p-6 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mb-2">Priority Listing Service</p>
                        <p className="text-gray-700 text-sm font-bold">Get your project listed in under 24 hours for a minimal protocol fee of 0.10 BNB.</p>
                    </div>
                </div>
            </div>
        </div>
      </section>

      <section className="py-24 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row-reverse items-center gap-16">
                <div className="flex-1">
                    <div className="p-8 md:p-12 rounded-[3.5rem] bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 relative group">
                        <div className="absolute -top-12 -right-12 text-[150px] opacity-10 group-hover:rotate-12 transition-transform">🔍</div>
                        <SectionBadge icon="🛡️" text="Audit-less Trust" />
                        <h3 className="text-4xl md:text-5xl font-black mb-6 text-gray-900 uppercase">Transparency</h3>
                        <p className="text-gray-600 text-lg leading-relaxed mb-8">
                            B20-LAB is built on pure blockchain logic. No hidden controls, no admin privileges, just code.
                        </p>
                        <div className="grid grid-cols-1 gap-4">
                            {['On-chain Auditability', 'Zero Manipulation', 'Public Treasury Tracking'].map(f => (
                                <div key={f} className="flex items-center gap-2 text-sm font-black text-purple-600">
                                    <Shield className="w-4 h-4" /> {f}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex-1 space-y-6">
                    <h2 className="text-5xl font-black text-gray-900 leading-tight">Pure <span className="text-red-gradient">Decentralization</span></h2>
                    <p className="text-gray-500 text-lg font-medium tracking-tight leading-relaxed">
                        Every transaction, every deployment, and every treasury move is visible on the BSC explorer. We provide tools for investors to verify everything in real-time.
                    </p>
                </div>
            </div>
        </div>
      </section>

      {/* ── LOWEST FEES ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 md:px-8 paw-pattern/70 border-y border-black/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 via-transparent to-amber-500/5 pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <SectionBadge icon="💰" text="Lowest Deployment Fees" />
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Industry's <span className="text-red-gradient">Most Affordable</span> Launch
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-12">
            B20-LAB provides one of the lowest token deployment fees in the market, making crypto creation accessible to everyone — creators, communities, and serious projects.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { icon: '🚀', label: 'Deployment Fee', value: '0.005 BNB', sub: 'Fixed Deployment Logic', color: 'border-rose-500/30 bg-rose-500/5' },
              { icon: '🏛️', label: 'Protocol Fee', value: '0.002 BNB', sub: 'System Governance', color: 'border-amber-500/30 bg-amber-500/5' },
              { icon: '💧', label: 'Liquidity Protocol', value: '0.01 BNB', sub: 'Mandatory Initial Buy', color: 'border-indigo-500/30 bg-indigo-500/5' },
              { icon: '🤖', label: 'Anti-Bot Shield', value: 'FREE', sub: 'Sniper protection active', color: 'border-emerald-500/30 bg-emerald-500/5' },
              { icon: '🧠', label: 'AI Security', value: 'FREE', sub: 'ML-powered audit log', color: 'border-purple-500/30 bg-purple-500/5' },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }}
                className={`glass-card border-2 ${f.color} text-center py-8`}
              >
                <div className="text-4xl mb-3">{f.icon}</div>
                <div className="text-2xl font-black text-gray-900 mb-1">{f.value}</div>
                <div className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-widest">{f.label}</div>
                <div className="text-xs text-gray-500">{f.sub}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── UNIQUE CONTRACT IDs ───────────────────────────────────────────────── */}
      <section className="py-24 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <SectionBadge icon="🔗" text="Unique Contract ID System" />
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Pure <span className="text-red-gradient">Blockchain Identity</span>
            </h2>
            <p className="text-gray-600 text-lg max-w-3xl mx-auto">
              We believe in the integrity of the blockchain. Every token deployed through B20-LAB receives a unique identifier generated naturally by network mechanics. We do not manipulate or "brand" contract addresses with artificial series, as forced patterns can reduce project credibility.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 max-w-4xl mx-auto mb-8">
            {contractExamples.map((c, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="px-4 py-2 bg-black/5 border border-black/10 rounded-xl font-mono text-sm text-gray-500"
              >
                0x...{c.suffix} <span className="mx-1 opacity-20">|</span> <span className="text-[10px] font-bold uppercase tracking-widest">{c.label} Style</span>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-gray-400 text-xs font-medium uppercase tracking-widest">
            Verified Unique • Naturally Generated • Zero Manipulation
          </p>
        </div>
      </section>

      {/* ── MARKETING & PROFILE TOOLS ─────────────────────────────────────────── */}
      <section className="py-20 px-4 md:px-8 bg-white/40 border-y border-black/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <SectionBadge icon="📣" text="Marketing & Growth Tools" />
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Built-in Tools to <span className="text-red-gradient">Grow Your Project</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="glass-card bg-gradient-to-br from-rose-500/5 to-amber-500/5 border-rose-500/20"
            >
              <div className="text-3xl mb-4">📣</div>
              <h3 className="text-xl font-bold mb-2">Marketing Tools</h3>
              <p className="text-gray-600 text-sm mb-4">Boost visibility with built-in marketing features that help your project reach the right audience.</p>
              <ul className="space-y-2">
                {['Marketing icons & badges', 'Token profile pages', 'Community visibility tools', 'Project tracking dashboards'].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="glass-card bg-gradient-to-br from-purple-500/5 to-blue-500/5 border-purple-500/20"
            >
              <div className="text-3xl mb-4">👤</div>
              <h3 className="text-xl font-bold mb-2">Profile & Token Tracking</h3>
              <p className="text-gray-600 text-sm mb-4">Each project gets a dedicated profile dashboard with deep analytics and blockchain monitoring.</p>
              <ul className="space-y-2">
                {['Token statistics & performance', 'Trading activity history', 'Treasury tracking', 'Market analytics & charts', 'Blockchain transaction monitoring'].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE (Modern List) ────────────────────────────────────────── */}
      <section className="py-32 px-4 md:px-8 relative bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <SectionBadge icon="🚀" text="The B20 Edge" />
            <h2 className="text-5xl md:text-7xl font-black mb-8 leading-tight">
              Why the Best Choose <span className="text-red-gradient">B20-LAB</span>
            </h2>
            <div className="space-y-6">
                {[
                    { title: 'Instant Deployment', desc: 'Go from idea to live token in under 2 minutes.', icon: '⚡' },
                    { title: 'Zero Coding', desc: 'No smart contract knowledge required. High-security out of the box.', icon: '🛠️' },
                    { title: 'Deep Liquidity', desc: 'Every launch starts with a clear path to PancakeSwap.', icon: '🥞' },
                ].map((item, i) => (
                    <motion.div 
                        key={i} 
                        initial={{ opacity: 0, x: -20 }} 
                        whileInView={{ opacity: 1, x: 0 }}
                        className="flex gap-6 p-6 rounded-[2rem] hover:bg-rose-500/5 transition-colors border border-transparent hover:border-rose-500/10 cursor-default"
                    >
                        <span className="text-4xl icon-3d shrink-0">{item.icon}</span>
                        <div>
                            <h4 className="font-black text-xl text-gray-900 mb-1">{item.title}</h4>
                            <p className="text-gray-500 font-medium">{item.desc}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {whyItems.map((w, i) => (
                <div key={i} className={`p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center gap-3 transition-transform hover:-translate-y-2 ${
                    i % 2 === 0 ? 'bg-amber-500/5 border border-amber-500/20 mt-8' : 'bg-rose-500/5 border border-rose-500/20'
                }`}>
                    <span className="text-4xl icon-3d">{w.icon}</span>
                    <p className="font-black text-gray-900 text-xs uppercase tracking-widest">{w.title}</p>
                </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CALL TO ACTION ────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 md:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-amber-500/5 to-rose-500/10" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-rose-500/20 blur-[100px] rounded-full" />
        <Particles />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="text-6xl mb-6">🚀</div>
            <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
              Start Building Your{' '}
              <span className="text-red-gradient">Crypto Project</span> Today
            </h2>
            <p className="text-gray-600 text-xl mb-10 font-medium">
              Join thousands of creators who have launched their tokens on B20-LAB.
              Deploy in under 2 minutes. No coding. No complexity.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/create">
                <motion.button
                  whileHover={{ scale: 1.06, boxShadow: '0 24px 48px rgba(225,29,72,0.45)' }}
                  whileTap={{ scale: 0.97 }}
                  className="px-10 py-4 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl shadow-2xl shadow-rose-500/30 text-lg"
                >
                  🚀 Deploy Token
                </motion.button>
              </Link>
              <Link href="/launch">
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                  className="px-10 py-4 bg-white/80 hover:bg-white text-gray-900 font-bold rounded-2xl border border-black/10 shadow-lg text-lg"
                >
                  🔍 Explore Launchpad
                </motion.button>
              </Link>
              <Link href="/trade">
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                  className="px-10 py-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 font-bold rounded-2xl border border-amber-500/20 text-lg"
                >
                  💱 Start Trading
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Coin Carousel */}
      <CoinCarousel />
    </main>
  );
}
