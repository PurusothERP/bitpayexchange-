'use client';

import Navbar from '@/components/Navbar';
import CryptoTicker from '@/components/CryptoTicker';
import CoinCarousel from '@/components/CoinCarousel';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useWallet } from '@/context/WalletContext';
import { useEffect, useState, useRef } from 'react';
import { Sparkles, TrendingUp, Zap, ArrowRight, Brain, CheckCircle, Smartphone, Globe, Shield } from 'lucide-react';
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
      icon: '📜',
      title: 'AI Whitepaper Engine',
      desc: 'Generate professional 18-section whitepapers tailored to your unique token.',
      features: ['Standard compliance', 'Export to PDF', 'WhatsApp/Email sharing', 'Automated tokenomics logic'],
      gradient: 'from-purple-500/10 to-violet-600/5 border-purple-400/30',
      delay: 0.2,
    },
    {
      icon: '📊',
      title: 'Bonding Curve Launch',
      desc: 'Automated price discovery that rewards early adopters and ensures fairness.',
      features: ['Fair price discovery', 'No insider allocations', 'Auto-PancakeSwap listing', 'Permanent liquidity lock'],
      gradient: 'from-amber-500/10 to-amber-600/5 border-amber-400/30',
      delay: 0.3,
    },
    {
      icon: '💎',
      title: 'Instant DApp Website',
      desc: 'Every token gets a dedicated, high-converting claim and trade page automatically.',
      features: ['Mobile-optimized', 'Direct DEX connection', 'Social media integration', 'Live trade tracking'],
      gradient: 'from-rose-500/10 to-rose-600/5 border-rose-400/30',
      delay: 0.4,
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
              <Link href="/trade">
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                  className="px-8 py-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 font-bold rounded-2xl border border-amber-500/20 text-base"
                >
                  📊 Start Trading
                </motion.button>
              </Link>
            </div>
          </motion.div>

          {/* Live terminal-style deploy preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.7 }}
            className="mt-16 max-w-2xl mx-auto bg-[#0d0d0d] rounded-2xl border border-white/10 overflow-hidden shadow-2xl text-left"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#1a1a1a]">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="ml-2 text-gray-500 text-xs font-mono">b20lab — token-deploy</span>
            </div>
            <div className="px-5 py-4 font-mono text-xs space-y-1.5">
              {[
                { text: '$ b20lab create --name "MOONPUP" --symbol MPUP', color: 'text-white' },
                { text: '✔ Compiling BEP-20 smart contract...', color: 'text-amber-400' },
                { text: '✔ Deploying to BSC Mainnet...', color: 'text-amber-400' },
                { text: '✔ Registering with BondingCurve...', color: 'text-amber-400' },
                { text: '✔ Configuring liquidity parameters...', color: 'text-amber-400' },
                { text: '✔ Token live at 0xA4f2...7777', color: 'text-emerald-400' },
                { text: '🚀 MOONPUP is now trading on B20-LAB!', color: 'text-rose-400' },
              ].map((line, i) => (
                <motion.p
                  key={i} className={line.color}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + i * 0.3 }}
                >
                  {line.text}
                </motion.p>
              ))}
              <motion.span
                animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}
                className="inline-block w-2 h-3.5 bg-white mt-1"
              />
            </div>
          </motion.div>
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

      {/* ── MARKET INTEGRITY BANNER ─────────────────────────────────────────── */}
      <section className="py-20 px-4 md:px-8 relative overflow-hidden bg-[#050505]">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 via-transparent to-amber-500/10 opacity-30" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-30" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Verified On-Chain
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
                Global Liquid <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-amber-400">Market Integrity</span>
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed max-w-lg">
                Our protocol maintains a hyper-deflationary oversight of all assets deployed. Total supply represents the aggregate potential of the B20-LAB ecosystem cross-chain.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative p-8 md:p-12 rounded-[2.5rem] bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-xl shadow-2xl"
            >
              <div className="absolute top-6 right-8 opacity-20"><Globe className="w-12 h-12 text-white" /></div>
              
              <div className="space-y-8">
                <div>
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3">Total Market Supply</div>
                  <div className="text-2xl md:text-3xl lg:text-4xl font-black text-white font-mono break-all leading-tight tracking-tighter">
                    1,00,00,00,00,00,00,00,00,00,00,00,00,000
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full mt-4 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      whileInView={{ width: '100%' }}
                      transition={{ duration: 2, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-rose-500 to-amber-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div>
                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Assets Deployed On-Chain</div>
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-black text-white">41,208+</div>
                      <div className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 text-[10px] font-bold">+12% Today</div>
                    </div>
                  </div>
                  <Shield className="w-8 h-8 text-rose-500 opacity-50" />
                </div>
              </div>
            </motion.div>
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

      <section className="py-24 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-16">
                <div className="flex-1">
                    <div className="p-8 md:p-12 rounded-[3.5rem] bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 relative group">
                        <div className="absolute -top-12 -right-12 text-[150px] opacity-10 group-hover:rotate-12 transition-transform">🔍</div>
                        <SectionBadge icon="🛡️" text="Audit-less Trust" />
                        <h3 className="text-4xl md:text-5xl font-black mb-6 text-gray-900">Transparency</h3>
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
              { icon: '🚀', label: 'Deployment Fee', value: '0.003 BNB', sub: 'Flat fee — no hidden charges', color: 'border-rose-500/30 bg-rose-500/5' },
              { icon: '📈', label: 'Trading Fee', value: '1%', sub: 'Per buy/sell transaction', color: 'border-amber-500/30 bg-amber-500/5' },
              { icon: '🛡️', label: 'Token Upgrade', value: '0.01 BNB', sub: 'Verified status boost', color: 'border-indigo-500/30 bg-indigo-500/5' },
              { icon: '🤖', label: 'Anti-Bot Shield', value: 'FREE', sub: 'Sniper protection active', color: 'border-emerald-500/30 bg-emerald-500/5' },
              { icon: '🧠', label: 'AI Security', value: 'FREE', sub: 'ML-powered audit log', color: 'border-purple-500/30 bg-purple-500/5' },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }}
                className={`glass-card border-2 ${f.color} text-center py-8`}
              >
                <div className="text-4xl mb-3">{f.icon}</div>
                <div className="text-3xl font-black text-gray-900 mb-1">{f.value}</div>
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
