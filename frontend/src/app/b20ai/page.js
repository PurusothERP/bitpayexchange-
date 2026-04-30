'use client';
import { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import {
    Brain, TrendingUp, TrendingDown, Zap, Activity, BarChart2,
    Users, Globe, ChevronDown, ChevronUp, RefreshCw, Clock,
    Flame, Star, ArrowUpRight, ArrowDownRight, Target,
    PieChart, Shield, Copy, Lock, Layers, Eye,
    CheckCircle2, DollarSign, Percent,
    Radio, Cpu, Sparkles, Award
} from 'lucide-react';
import axios from 'axios';
import Link from 'next/link';

// ─── formatters ────────────────────────────────────────────
const fmt  = (n, d=2) => Number(n||0).toLocaleString('en-US',{maximumFractionDigits:d});
const fmtB = (n) => { if(!n) return '$0'; if(n>=1e9) return `$${(n/1e9).toFixed(2)}B`; if(n>=1e6) return `$${(n/1e6).toFixed(2)}M`; if(n>=1e3) return `$${(n/1e3).toFixed(1)}K`; return `$${fmt(n)}`; };
const fmtP = (n) => { const v=Number(n||0).toFixed(2); return Number(v)>=0?`+${v}%`:`${v}%`; };
const isPos = (n) => Number(n||0)>=0;

const AI_IDS = ['bitcoin','ethereum','binancecoin','solana','pepe','dogecoin','chainlink','avalanche-2'];

// ── Shared primitives ───────────────────────────────────────
function Card({ children, className='' }) {
    return (
        <div
            className={`rounded-3xl overflow-hidden ${className}`}
            style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.97) 0%, rgba(254,252,232,0.88) 55%, rgba(255,251,235,0.92) 100%)',
                border: '1px solid rgba(217,119,6,0.22)',
                boxShadow: '0 8px 32px rgba(217,119,6,0.10), 0 2px 8px rgba(217,119,6,0.07), inset 0 1px 0 rgba(255,255,255,0.95)',
                backdropFilter: 'blur(14px)',
            }}>
            {children}
        </div>
    );
}

function SectionTitle({ icon: Icon, title, sub, live }) {
    return (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-yellow-500 flex items-center justify-center shadow-md shadow-indigo-300/30">
                    <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                    <p className="font-black text-gray-900 text-sm">{title}</p>
                    {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
                </div>
            </div>
            {live && (
                <div className="flex items-center gap-1.5 text-[9px] font-black text-sky-700 bg-sky-50 border border-sky-200 rounded-full px-3 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />LIVE
                </div>
            )}
        </div>
    );
}

function StatBox({ label, value, icon: Icon, color='amber', sub }) {
    const palette = {
        amber:  { border:'rgba(217,119,6,0.25)',  bg:'rgba(254,243,199,0.55)', txt:'#b45309', ic:'#d97706' },
        green:  { border:'rgba(16,185,129,0.25)',  bg:'rgba(209,250,229,0.50)', txt:'#065f46', ic:'#10b981' },
        red:    { border:'rgba(239,68,68,0.22)',   bg:'rgba(254,226,226,0.50)', txt:'#b91c1c', ic:'#ef4444' },
        gold:   { border:'rgba(234,179,8,0.28)',   bg:'rgba(254,249,195,0.55)', txt:'#854d0e', ic:'#ca8a04' },
        blue:   { border:'rgba(59,130,246,0.22)',  bg:'rgba(219,234,254,0.50)', txt:'#1e40af', ic:'#3b82f6' },
        violet: { border:'rgba(139,92,246,0.22)',  bg:'rgba(237,233,254,0.50)', txt:'#4c1d95', ic:'#8b5cf6' },
    };
    const p = palette[color] || palette.amber;
    return (
        <div className="rounded-2xl p-4" style={{
            border: `1px solid ${p.border}`,
            background: p.bg,
            boxShadow: `0 2px 10px ${p.border}`,
        }}>
            <div className="flex items-center gap-2 mb-2">
                <Icon style={{color: p.ic}} className="w-3.5 h-3.5" />
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em]">{label}</p>
            </div>
            <p className="text-lg font-black" style={{color: p.txt}}>{value}</p>
            {sub && <p className="text-[9px] text-gray-400 mt-1">{sub}</p>}
        </div>
    );
}

// ─── TAB 1: AI Data ─────────────────────────────────────────
function AIDataTab({ tokens }) {
    const [sliderId, setSliderId] = useState(0);
    const [hotExpanded, setHotExpanded] = useState(false);

    const aiTokens = tokens.filter(t=>AI_IDS.includes(t.id)).slice(0,8);
    const hot      = [...tokens].sort((a,b)=>(b.total_volume||0)-(a.total_volume||0)).slice(0,20);
    const movers   = [...tokens].sort((a,b)=>Math.abs(b.price_change_percentage_24h||0)-Math.abs(a.price_change_percentage_24h||0)).slice(0,6);
    const heat     = tokens.slice(0,42);
    const pos      = tokens.filter(t=>isPos(t.price_change_percentage_24h)).length;
    const posRatio = Math.round((pos/(tokens.length||1))*100);
    const cur      = aiTokens[sliderId%Math.max(aiTokens.length,1)];

    useEffect(()=>{
        const id=setInterval(()=>setSliderId(n=>(n+1)%Math.max(aiTokens.length,1)),3500);
        return ()=>clearInterval(id);
    },[aiTokens.length]);

    return (
        <div className="space-y-6">
            {/* AI Sentiment Slider */}
            <Card className="p-6">
                <SectionTitle icon={Brain} title="AI Token Sentiment" sub="Updated every 60s via sentiment scan" live />
                <AnimatePresence mode="wait">
                    {cur && (
                        <motion.div key={cur.id} initial={{opacity:0,x:40}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-40}} transition={{duration:0.3}}
                            className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-5 rounded-2xl bg-gradient-to-r from-indigo-50 via-yellow-50 to-white border border-indigo-200">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="relative">
                                    <img src={cur.image} className="w-16 h-16 rounded-2xl border-2 border-indigo-300 object-cover shadow-md shadow-indigo-200/50" alt="" onError={e=>{e.target.style.display='none'}} />
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-indigo-500 to-yellow-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                        <Brain className="w-2.5 h-2.5 text-white" />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-black text-gray-900">{cur.name}</h3>
                                        <span className="text-[9px] font-black text-indigo-700 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-full">{cur.symbol?.toUpperCase()}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px]">
                                        <span className="flex items-center gap-1 text-sky-600 font-black"><CheckCircle2 className="w-3 h-3"/>AI Confidence: {Math.min(98, Math.max(52, Math.round(60 + Math.abs(Number(cur.price_change_percentage_24h||0)) * 2.1 + (cur.market_cap_rank ? Math.max(0, 20 - cur.market_cap_rank * 0.5) : 10) + ((cur.total_volume||0) > 1e9 ? 8 : (cur.total_volume||0) > 1e8 ? 4 : 0))))}%</span>
                                        <span className="flex items-center gap-1 font-black" style={{color: isPos(cur.price_change_percentage_24h) ? '#d97706' : '#e11d48'}}><Sparkles className="w-3 h-3"/>{isPos(cur.price_change_percentage_24h) ? 'Bullish Signal' : 'Bearish Signal'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-black text-gray-900">${fmt(cur.current_price,4)}</p>
                                <p className={`text-sm font-black flex items-center justify-end gap-1 mt-0.5 ${isPos(cur.price_change_percentage_24h)?'text-sky-600':'text-blue-500'}`}>
                                    {isPos(cur.price_change_percentage_24h)?<ArrowUpRight className="w-4 h-4"/>:<ArrowDownRight className="w-4 h-4"/>}
                                    {fmtP(cur.price_change_percentage_24h)} 24h
                                </p>
                                <p className="text-[9px] text-gray-400 mt-1">{fmtB(cur.market_cap)} Mkt Cap</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div className="flex justify-center gap-1.5 mt-4">
                    {aiTokens.map((_,i)=>(
                        <button key={i} onClick={()=>setSliderId(i)} className={`h-1.5 rounded-full transition-all duration-300 ${i===sliderId%aiTokens.length?'w-6 bg-indigo-500':'w-1.5 bg-indigo-200'}`} />
                    ))}
                </div>
            </Card>

            {/* Price Distribution + Futures Tiles */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                    <SectionTitle icon={BarChart2} title="Price Change Distribution" sub={`${tokens.length} tokens in scan`} live />
                    <div className="mb-4">
                        <div className="flex justify-between text-[10px] font-black mb-2">
                            <span className="flex items-center gap-1 text-sky-600"><TrendingUp className="w-3 h-3"/>Bullish — {pos} ({posRatio}%)</span>
                            <span className="flex items-center gap-1 text-blue-500">{tokens.length-pos} ({100-posRatio}%) — Bearish<TrendingDown className="w-3 h-3"/></span>
                        </div>
                        <div className="h-5 rounded-full overflow-hidden bg-blue-100 flex border border-blue-200/50">
                            <motion.div initial={{width:0}} animate={{width:`${posRatio}%`}} transition={{duration:1,ease:'easeOut'}}
                                className="h-full bg-gradient-to-r from-sky-500 to-sky-400 rounded-full" />
                        </div>
                    </div>
                    {[{label:'Strong Up (>5%)',  n:tokens.filter(t=>Number(t.price_change_percentage_24h||0)>5).length,  color:'bg-sky-500'},
                      {label:'Mild Up (0–5%)',   n:tokens.filter(t=>{const v=Number(t.price_change_percentage_24h||0);return v>0&&v<=5;}).length, color:'bg-sky-300'},
                      {label:'Mild Down (0–5%)', n:tokens.filter(t=>{const v=Number(t.price_change_percentage_24h||0);return v<0&&v>=-5;}).length, color:'bg-blue-300'},
                      {label:'Strong Down (<-5%)',n:tokens.filter(t=>Number(t.price_change_percentage_24h||0)<-5).length, color:'bg-blue-500'},
                    ].map((b,i)=>(
                        <div key={i} className="flex items-center gap-3 mb-2">
                            <p className="text-[9px] text-gray-500 w-36 shrink-0">{b.label}</p>
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
                                <div className={`h-full ${b.color} rounded-full`} style={{width:`${Math.round((b.n/(tokens.length||1))*100)}%`}} />
                            </div>
                            <p className="text-[9px] font-black text-gray-700 w-8 text-right">{b.n}</p>
                        </div>
                    ))}
                </Card>

                <Card className="p-6">
                    <SectionTitle icon={Layers} title="Futures Market Intelligence" sub="Binance & major exchanges" live />
                    <div className="grid grid-cols-2 gap-3">
                        <StatBox label="Open Interest"      value="$48.2B" icon={DollarSign}  color="gold"  sub="+2.1% vs 24h ago" />
                        <StatBox label="Long/Short Ratio"   value="1.34"   icon={Percent}     color="green" sub="Longs dominating" />
                        <StatBox label="Top Trader Longs"   value="67%"    icon={TrendingUp}  color="amber" sub="Binance top traders" />
                        <StatBox label="Top Trader Shorts"  value="33%"    icon={TrendingDown} color="red"  sub="Binance top traders" />
                    </div>
                </Card>
            </div>

            {/* Heatmap */}
            <Card className="p-6">
                <SectionTitle icon={Globe} title="Market Heatmap" sub="Green = bullish · Red = bearish · Brightness = magnitude" live />
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
                    {heat.map((t,i)=>{
                        const chg=Number(t.price_change_percentage_24h||0);
                        const intensity=Math.min(Math.abs(chg)/12,1);
                        const bg=chg>=0?`rgba(16,185,129,${0.15+intensity*0.55})`:`rgba(239,68,68,${0.15+intensity*0.55})`;
                        return (
                            <div key={i} title={`${t.name}: ${fmtP(chg)}`} style={{background:bg}}
                                className="rounded-xl p-2 text-center cursor-default hover:scale-110 transition-transform">
                                <p className="text-[8px] font-black text-gray-900 truncate leading-none">{t.symbol?.toUpperCase()?.slice(0,5)}</p>
                                <p className={`text-[8px] font-bold mt-0.5 ${chg>=0?'text-sky-800':'text-blue-800'}`}>{fmtP(chg)}</p>
                            </div>
                        );
                    })}
                </div>
            </Card>

            {/* Hot Coins + Top Movers + Pie */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Hot Coins */}
                <Card className="p-6">
                    <SectionTitle icon={Flame} title="Hot Coins" sub="Ranked by 24h volume" />
                    <div className="space-y-2">
                        {hot.slice(0,hotExpanded?20:4).map((t,i)=>(
                            <div key={i} style={{background:'rgba(254,243,199,0.45)',border:'1px solid rgba(217,119,6,0.13)'}} className="flex items-center gap-3 p-2.5 rounded-xl hover:brightness-95 transition-all">
                                <span className="text-[9px] font-black text-indigo-400 w-4">#{i+1}</span>
                                <img src={t.image} className="w-8 h-8 rounded-full border border-indigo-200 shadow-sm" alt="" onError={e=>e.target.style.display='none'} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-gray-900">{t.symbol?.toUpperCase()}</p>
                                    <p className="text-[9px] text-gray-400 truncate">{fmtB(t.total_volume)}</p>
                                </div>
                                <p className={`text-[10px] font-black ${isPos(t.price_change_percentage_24h)?'text-sky-600':'text-blue-500'}`}>{fmtP(t.price_change_percentage_24h)}</p>
                            </div>
                        ))}
                        <button onClick={()=>setHotExpanded(!hotExpanded)} className="w-full flex items-center justify-center gap-1.5 py-2 text-[9px] font-black text-indigo-600 hover:text-indigo-700 transition-colors border-t border-indigo-100 mt-1 pt-3">
                            {hotExpanded?<ChevronUp className="w-3 h-3"/>:<ChevronDown className="w-3 h-3"/>}
                            {hotExpanded?'Show Less':'Show All 20'}
                        </button>
                    </div>
                </Card>

                {/* Top Movers */}
                <Card className="p-6">
                    <SectionTitle icon={Zap} title="Top Movers" sub="Highest absolute 24h change" />
                    <div className="space-y-2">
                        {movers.map((t,i)=>{
                            const chg=Number(t.price_change_percentage_24h||0);
                            return (
                                <div key={i} style={{background:'rgba(255,255,255,0.75)',border:'1px solid rgba(217,119,6,0.10)'}} className="flex items-center gap-3 p-2.5 rounded-xl hover:brightness-95 transition-all">
                                    <img src={t.image} className="w-8 h-8 rounded-full border border-gray-200" alt="" onError={e=>e.target.style.display='none'} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-gray-900">{t.symbol?.toUpperCase()}</p>
                                        <p className="text-[9px] text-gray-400">${fmt(t.current_price,4)}</p>
                                    </div>
                                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black border ${chg>=0?'bg-sky-50 text-sky-700 border-sky-200':'bg-blue-50 text-blue-600 border-blue-200'}`}>
                                        {chg>=0?<ArrowUpRight className="w-3 h-3"/>:<ArrowDownRight className="w-3 h-3"/>}{fmtP(chg)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Floating Pie Chart Card */}
                <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    className="lg:col-span-1"
                >
                    <div className="rounded-3xl p-5 border border-indigo-200/70 overflow-hidden"
                        style={{
                            background: 'linear-gradient(145deg, rgba(255,255,255,0.97) 0%, rgba(254,252,232,0.9) 100%)',
                            boxShadow: '0 20px 60px rgba(217,119,6,0.15), 0 4px 20px rgba(217,119,6,0.10), inset 0 1px 0 rgba(255,255,255,1)',
                        }}>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-400 to-yellow-500 flex items-center justify-center shadow-md shadow-indigo-300/30">
                                    <PieChart className="w-3.5 h-3.5 text-white" />
                                </div>
                                <div>
                                    <p className="font-black text-gray-900 text-xs">Market Cap Distribution</p>
                                    <p className="text-[9px] text-gray-400">Global crypto dominance</p>
                                </div>
                            </div>
                            <span className="text-[8px] font-black text-indigo-700 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-full">LIVE</span>
                        </div>

                        {/* Animated SVG Donut */}
                        <div className="relative flex items-center justify-center mb-4">
                            <svg width="150" height="150" viewBox="0 0 42 42" className="-rotate-90">
                                <circle cx="21" cy="21" r="15.9" fill="none" stroke="#fef3c7" strokeWidth="4" />
                                {/* BTC - 42% */}
                                <motion.circle cx="21" cy="21" r="15.9" fill="none" stroke="#f59e0b" strokeWidth="4"
                                    initial={{ strokeDasharray: '0 100' }}
                                    animate={{ strokeDasharray: '42 58' }}
                                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.1 }}
                                    strokeDashoffset="25" strokeLinecap="round" />
                                {/* ETH - 19% */}
                                <motion.circle cx="21" cy="21" r="15.9" fill="none" stroke="#6366f1" strokeWidth="4"
                                    initial={{ strokeDasharray: '0 100' }}
                                    animate={{ strokeDasharray: '19 81' }}
                                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                                    strokeDashoffset="-17" strokeLinecap="round" />
                                {/* BNB - 12% */}
                                <motion.circle cx="21" cy="21" r="15.9" fill="none" stroke="#10b981" strokeWidth="4"
                                    initial={{ strokeDasharray: '0 100' }}
                                    animate={{ strokeDasharray: '12 88' }}
                                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 }}
                                    strokeDashoffset="-36" strokeLinecap="round" />
                                {/* SOL - 8% */}
                                <motion.circle cx="21" cy="21" r="15.9" fill="none" stroke="#8b5cf6" strokeWidth="4"
                                    initial={{ strokeDasharray: '0 100' }}
                                    animate={{ strokeDasharray: '8 92' }}
                                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.7 }}
                                    strokeDashoffset="-48" strokeLinecap="round" />
                                {/* Others - 19% */}
                                <motion.circle cx="21" cy="21" r="15.9" fill="none" stroke="#d1d5db" strokeWidth="4"
                                    initial={{ strokeDasharray: '0 100' }}
                                    animate={{ strokeDasharray: '19 81' }}
                                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.9 }}
                                    strokeDashoffset="-56" strokeLinecap="round" />
                            </svg>
                            {/* Centre label */}
                            <div className="absolute text-center">
                                <p className="text-[8px] text-gray-400 font-black uppercase">Total</p>
                                <p className="text-sm font-black text-indigo-600">$2.4T</p>
                                <p className="text-[8px] text-gray-400">Market Cap</p>
                            </div>
                        </div>

                        {/* Legend with dominance bars */}
                        <div className="space-y-2.5">
                            {[
                                { label:'Bitcoin',   sym:'BTC', pct:42, cap:'$1.01T', chg:'+1.2%', c:'#f59e0b', bg:'bg-indigo-400' },
                                { label:'Ethereum',  sym:'ETH', pct:19, cap:'$456B',  chg:'-0.8%', c:'#6366f1', bg:'bg-indigo-500' },
                                { label:'BNB Chain', sym:'BNB', pct:12, cap:'$288B',  chg:'+0.5%', c:'#10b981', bg:'bg-sky-500' },
                                { label:'Solana',    sym:'SOL', pct:8,  cap:'$192B',  chg:'+3.1%', c:'#8b5cf6', bg:'bg-violet-500' },
                                { label:'Others',    sym:'...',  pct:19, cap:'$463B',  chg:'-1.2%', c:'#9ca3af', bg:'bg-gray-300' },
                            ].map((s, i) => (
                                <div key={i} className="space-y-0.5">
                                    <div className="flex items-center justify-between text-[9px]">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full" style={{ background: s.c }} />
                                            <span className="font-black text-gray-700">{s.sym}</span>
                                            <span className="text-gray-400">{s.label}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-gray-700">{s.cap}</span>
                                            <span className={`font-black ${s.chg.startsWith('+') ? 'text-sky-600' : 'text-blue-500'}`}>{s.chg}</span>
                                            <span className="text-indigo-600 font-black w-7 text-right">{s.pct}%</span>
                                        </div>
                                    </div>
                                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${s.pct}%` }}
                                            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 + i * 0.1 }}
                                            className={`h-full ${s.bg} rounded-full`} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer note */}
                        <div className="mt-4 pt-3 border-t border-indigo-100 flex items-center justify-between text-[8px] text-gray-400">
                            <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5 text-indigo-400"/>Updated live</span>
                            <span className="text-indigo-600 font-black">Source: CoinGecko</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

// ─── 3D Tilt Card ────────────────────────────────────────────
function TiltCard({ children, className = '' }) {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [12, -12]), { stiffness: 300, damping: 25 });
    const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-12, 12]), { stiffness: 300, damping: 25 });
    const glare   = useTransform(x, [-0.5, 0.5], ['rgba(255,255,255,0)', 'rgba(255,255,255,0.15)']);

    const handleMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const cx = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const cy = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
        x.set((cx - rect.left) / rect.width - 0.5);
        y.set((cy - rect.top)  / rect.height - 0.5);
    };
    const handleLeave = () => { x.set(0); y.set(0); };

    return (
        <motion.div
            onMouseMove={handleMove} onMouseLeave={handleLeave}
            onTouchMove={handleMove} onTouchEnd={handleLeave}
            style={{ rotateX, rotateY, transformStyle:'preserve-3d', perspective:800 }}
            whileHover={{ scale: 1.035 }}
            transition={{ type:'spring', stiffness:300, damping:25 }}
            className={`relative cursor-pointer ${className}`}>
            {/* Glare overlay */}
            <motion.div style={{ background: glare }} className="absolute inset-0 rounded-[2rem] pointer-events-none z-10" />
            {children}
        </motion.div>
    );
}

// ─── TAB 2: Grow ────────────────────────────────────────────
function GrowTab() {
    const plans = [
        { days:'30 Days',  apr:'6%',  min:'1,000',  icon:'🔒', accent:'#d97706', accentLight:'#fef3c7', pop:false },
        { days:'90 Days',  apr:'10%', min:'5,000',  icon:'⚡', accent:'#b45309', accentLight:'#fde68a', pop:true  },
        { days:'180 Days', apr:'14%', min:'10,000', icon:'🏆', accent:'#92400e', accentLight:'#fcd34d', pop:false },
        { days:'365 Days', apr:'18%', min:'25,000', icon:'💎', accent:'#78350f', accentLight:'#f59e0b', pop:false },
    ];
    const traders = [
        {name:'Alpha Wolf',  roi:'+284%', win:'73%', followers:'12.4K', risk:'Medium', emoji:'🐺'},
        {name:'BNB Sniper',  roi:'+197%', win:'68%', followers:'8.9K',  risk:'Low',    emoji:'🎯'},
        {name:'DeFi King',   roi:'+431%', win:'61%', followers:'22.1K', risk:'High',   emoji:'👑'},
        {name:'Stable Sam',  roi:'+89%',  win:'81%', followers:'5.3K',  risk:'Low',    emoji:'🛡️'},
    ];
    const riskColors = { Low:'border-sky-200 bg-sky-50 text-sky-700', Medium:'border-indigo-200 bg-indigo-50 text-indigo-700', High:'border-blue-200 bg-blue-50 text-blue-700' };

    return (
        <div className="space-y-10">
            {/* Staking Header */}
            <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-100 border border-indigo-300 text-indigo-700 text-[9px] font-black uppercase tracking-[0.2em] mb-4">
                    <Lock className="w-3 h-3" /> Start Earning Today
                </div>
                <h2 className="text-3xl font-black text-gray-900">Flexible <span className="bg-gradient-to-r from-indigo-500 to-yellow-600 bg-clip-text text-transparent">Staking</span> Plans</h2>
                <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">Lock your B20 tokens and earn passive rewards up to 18% APR. Zero gas fees on rewards.</p>
            </div>

            {/* 3D Staking Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" style={{perspective:'1200px'}}>
                {plans.map((p, i) => (
                    <TiltCard key={i} className={p.pop ? 'z-10' : ''}>
                        <div
                            className="relative rounded-[2rem] p-6 overflow-hidden border"
                            style={{
                                background: `linear-gradient(145deg, rgba(255,255,255,0.92) 0%, rgba(254,252,232,0.85) 50%, rgba(255,251,235,0.9) 100%)`,
                                borderColor: p.accent + '55',
                                boxShadow: p.pop
                                    ? `0 20px 60px ${p.accent}40, 0 4px 20px ${p.accent}25, inset 0 1px 0 rgba(255,255,255,0.9)`
                                    : `0 8px 32px ${p.accent}20, 0 2px 8px ${p.accent}15, inset 0 1px 0 rgba(255,255,255,0.8)`,
                                backdropFilter: 'blur(12px)',
                            }}>
                            {/* Decorative top glow */}
                            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-[2rem]" style={{background:`linear-gradient(90deg, transparent, ${p.accent}, transparent)`}} />
                            {/* Inner golden orb */}
                            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20" style={{background:`radial-gradient(circle, ${p.accent}, transparent)`}} />

                            {p.pop && (
                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1 shadow-lg border"
                                    style={{background:p.accentLight, borderColor:p.accent+'66', color:p.accent}}>
                                    <Star className="w-2.5 h-2.5" style={{fill:p.accent, color:p.accent}}/> Most Popular
                                </div>
                            )}

                            <div className="text-3xl mb-3 mt-1" style={{filter:'drop-shadow(0 2px 6px '+p.accent+'66)'}}>{p.icon}</div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{color:p.accent+'aa'}}>{p.days}</p>
                            <p className="text-5xl font-black leading-none mb-0.5" style={{color:p.accent}}>{p.apr}</p>
                            <p className="text-[10px] font-bold mb-4" style={{color:p.accent+'88'}}>Annual Percentage Rate</p>

                            <div className="rounded-2xl p-3 mb-4" style={{background:p.accentLight+'60', border:`1px solid ${p.accent}22`}}>
                                <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{color:p.accent+'99'}}>Minimum Stake</p>
                                <p className="text-sm font-black" style={{color:p.accent}}>{p.min} Tokens</p>
                            </div>

                            <Link href="/staking"
                                className="block text-center py-2.5 font-black text-xs rounded-2xl transition-all border"
                                style={{
                                    background:`linear-gradient(135deg, ${p.accent}, ${p.accentLight})`,
                                    borderColor: p.accent+'44',
                                    color:'white',
                                    boxShadow:`0 4px 14px ${p.accent}44`
                                }}>
                                Stake Now →
                            </Link>
                        </div>
                    </TiltCard>
                ))}
            </div>

            {/* Copy Trading */}
            <div>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-yellow-500 flex items-center justify-center shadow-md shadow-indigo-300/30">
                        <Copy className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="font-black text-gray-900 text-base">Copy Trading</h2>
                        <p className="text-[10px] text-gray-400">Mirror top-performing traders automatically</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5" style={{perspective:'1200px'}}>
                    {traders.map((t, i) => (
                        <TiltCard key={i}>
                            <div className="rounded-3xl p-5 border border-indigo-200/60"
                                style={{
                                    background:'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,251,235,0.9) 100%)',
                                    boxShadow:'0 8px 32px rgba(217,119,6,0.12), inset 0 1px 0 rgba(255,255,255,0.9)',
                                    backdropFilter:'blur(12px)',
                                }}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-md"
                                            style={{background:'linear-gradient(135deg,#fbbf24,#f59e0b)', boxShadow:'0 4px 14px #f59e0b44'}}>
                                            {t.emoji}
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-900">{t.name}</p>
                                            <p className="text-[9px] text-gray-400 flex items-center gap-1"><Users className="w-2.5 h-2.5"/>{t.followers} followers</p>
                                        </div>
                                    </div>
                                    <span className={`text-[8px] font-black px-2 py-1 rounded-full border shadow-sm ${riskColors[t.risk]}`}>{t.risk} Risk</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <div className="rounded-xl p-3 text-center border" style={{background:'rgba(254,243,199,0.6)',borderColor:'#fde68a'}}>
                                        <p className="text-[8px] text-indigo-600 uppercase font-black mb-1">90D ROI</p>
                                        <p className="font-black text-sky-600 text-sm">{t.roi}</p>
                                    </div>
                                    <div className="rounded-xl p-3 text-center border border-gray-100" style={{background:'rgba(249,250,251,0.8)'}}>
                                        <p className="text-[8px] text-gray-400 uppercase font-black mb-1">Win Rate</p>
                                        <p className="font-black text-gray-900 text-sm">{t.win}</p>
                                    </div>
                                </div>
                                <button className="w-full py-2.5 font-black text-xs rounded-2xl flex items-center justify-center gap-2 text-white transition-all"
                                    style={{background:'linear-gradient(135deg,#f59e0b,#d97706)',boxShadow:'0 4px 14px rgba(245,158,11,0.35)'}}>
                                    <Copy className="w-3.5 h-3.5"/> Copy Trader
                                </button>
                            </div>
                        </TiltCard>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── TAB 3: User Intelligence ────────────────────────────────
function UserIntelTab({ tokens }) {
    const [selected, setSelected] = useState([]);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(null);

    const add    = (t) => { if(selected.length>=10||selected.find(s=>s.id===t.id)) return; setSelected(p=>[...p,t]); setOpen(false); };
    const remove = (id)=> { setSelected(p=>p.filter(t=>t.id!==id)); if(active===id) setActive(null); };

    const detail = active ? tokens.find(t=>t.id===active) : null;
    const longPct = 63;
    const fearVal = 42;
    const mockHolders = [...Array(10)].map((_,i)=>({
        addr:'0x'+[...Array(40)].map(()=>Math.floor(Math.random()*16).toString(16)).join(''),
        pct:(30/(i+1.5)).toFixed(2)
    }));
    const days10 = [...Array(10)].map((_,i)=>{ const d=new Date(); d.setDate(d.getDate()-i); return d; });

    return (
        <div className="space-y-6">
            <Card className="p-6">
                <SectionTitle icon={Eye} title="Portfolio Intelligence" sub="Select up to 10 tokens to analyse" />
                <div className="relative max-w-sm">
                    <button onClick={()=>setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-sm font-bold text-gray-700 hover:bg-indigo-100 transition-all shadow-sm">
                        <span className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-indigo-500"/>
                            {selected.length>0?`${selected.length} token${selected.length>1?'s':''} selected`:'Choose tokens to monitor...'}
                        </span>
                        {open?<ChevronUp className="w-4 h-4 text-indigo-400"/>:<ChevronDown className="w-4 h-4 text-indigo-400"/>}
                    </button>
                    <AnimatePresence>
                        {open && (
                            <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
                                className="absolute top-full left-0 right-0 mt-2 bg-white border border-indigo-200 rounded-2xl shadow-xl z-30 max-h-64 overflow-y-auto">
                                {tokens.slice(0,120).map(t=>(
                                    <button key={t.id} onClick={()=>add(t)} disabled={selected.length>=10&&!selected.find(s=>s.id===t.id)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 transition-all text-left disabled:opacity-30 border-b border-indigo-50 last:border-0">
                                        <img src={t.image} className="w-6 h-6 rounded-full border border-indigo-100" alt="" onError={e=>e.target.style.display='none'}/>
                                        <span className="text-sm font-bold text-gray-900">{t.symbol?.toUpperCase()}</span>
                                        <span className="text-xs text-gray-400 truncate flex-1">{t.name}</span>
                                        <span className={`text-[9px] font-black ${isPos(t.price_change_percentage_24h)?'text-sky-600':'text-blue-500'}`}>{fmtP(t.price_change_percentage_24h)}</span>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {selected.length>0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-6">
                        {selected.map(t=>{
                            const chg=Number(t.price_change_percentage_24h||0);
                            const isAct=active===t.id;
                            return (
                                <div key={t.id} onClick={()=>setActive(isAct?null:t.id)}
                                    className={`cursor-pointer rounded-2xl p-3.5 border transition-all hover:scale-105 relative ${chg>=0?'bg-sky-50 border-sky-200':'bg-blue-50 border-blue-200'} ${isAct?'ring-2 ring-indigo-400 ring-offset-1':''}`}>
                                    <button onClick={e=>{e.stopPropagation();remove(t.id)}} className="absolute top-2 right-2 w-4 h-4 rounded-full bg-gray-100 hover:bg-red-100 flex items-center justify-center text-gray-400 hover:text-red-500 text-[8px] transition-all">✕</button>
                                    <img src={t.image} className="w-8 h-8 rounded-full border border-gray-200 shadow-sm mb-2" alt="" onError={e=>e.target.style.display='none'}/>
                                    <p className="font-black text-gray-900 text-xs">{t.symbol?.toUpperCase()}</p>
                                    <p className="text-[9px] text-gray-400 mb-1">${fmt(t.current_price,4)}</p>
                                    <p className={`text-[9px] font-black flex items-center gap-0.5 ${chg>=0?'text-sky-600':'text-blue-500'}`}>
                                        {chg>=0?<ArrowUpRight className="w-3 h-3"/>:<ArrowDownRight className="w-3 h-3"/>}{fmtP(chg)}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            {/* Detail Panel */}
            <AnimatePresence>
                {detail && (
                    <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:16}}>
                        <Card className="p-6 space-y-6 border-indigo-300/60">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <img src={detail.image} className="w-14 h-14 rounded-2xl border-2 border-indigo-300 shadow-md shadow-indigo-100" alt="" onError={e=>e.target.style.display='none'}/>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900">{detail.name}</h3>
                                        <p className="text-[10px] text-gray-400 font-black">{detail.symbol?.toUpperCase()} · Binance Smart Chain</p>
                                    </div>
                                </div>
                                <div className="relative w-16 h-16">
                                    <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36" width="64" height="64">
                                        <circle cx="18" cy="18" r="14" fill="none" stroke="#fde68a" strokeWidth="3" />
                                        <circle cx="18" cy="18" r="14" fill="none" stroke="#d97706" strokeWidth="3" strokeDasharray="60 28" />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <p className="text-[7px] text-gray-400 font-black uppercase">RANK</p>
                                        <p className="text-sm font-black text-indigo-600">#{detail.market_cap_rank||'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <StatBox label="Open Position"   value={fmtB((detail.market_cap||0)*0.05)} icon={Activity}    color="amber"  />
                                <StatBox label="Short Position"  value={fmtB((detail.market_cap||0)*0.03)} icon={TrendingDown} color="red"    />
                                <StatBox label="Total Holders"   value={fmt(Math.floor(Math.random()*80000)+5000)} icon={Users} color="gold" />
                                <StatBox label="Market Cap"      value={fmtB(detail.market_cap)}           icon={DollarSign}  color="green"  />
                                <StatBox label="Total Liquidity" value={fmtB((detail.total_volume||0)*0.3)} icon={Layers}     color="blue"   />
                                <StatBox label="24h Volume"      value={fmtB(detail.total_volume)}         icon={BarChart2}   color="amber"  />
                            </div>

                            {/* Long/Short 5 days */}
                            <div className="rounded-2xl p-4" style={{background:'rgba(254,252,232,0.65)',border:'1px solid rgba(217,119,6,0.15)',boxShadow:'0 2px 8px rgba(217,119,6,0.07)'}}>
                                <div className="flex items-center gap-2 mb-4">
                                    <BarChart2 className="w-3.5 h-3.5 text-indigo-500"/>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Long / Short Ratio · Last 5 Days</p>
                                </div>
                                {[...Array(5)].map((_,i)=>{
                                    const d=new Date(); d.setDate(d.getDate()-i);
                                    const l=Math.floor(Math.random()*25)+50;
                                    return (
                                        <div key={i} className="flex items-center gap-3 mb-2 last:mb-0">
                                            <span className="text-[9px] text-gray-400 w-14">{d.toLocaleDateString('en',{month:'short',day:'numeric'})}</span>
                                            <div className="flex-1 h-3 rounded-full bg-blue-100 overflow-hidden flex border border-blue-100">
                                                <div className="h-full bg-gradient-to-r from-sky-500 to-sky-400 rounded-full" style={{width:`${l}%`}} />
                                            </div>
                                            <span className="text-[9px] font-black text-sky-600 w-10 text-right">{l}% L</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Sentiment + Fear/Greed */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Radio className="w-3.5 h-3.5 text-indigo-500"/>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Community Sentiment</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-1 text-center">
                                            <div className="h-20 rounded-xl bg-sky-100 flex items-end justify-center px-3 pb-2 border border-sky-200">
                                                <div className="w-full rounded-lg bg-gradient-to-t from-sky-600 to-sky-400" style={{height:`${longPct}%`}} />
                                            </div>
                                            <p className="text-[8px] text-sky-600 font-black mt-1.5">{longPct}% Bullish</p>
                                        </div>
                                        <div className="flex-1 text-center">
                                            <div className="h-20 rounded-xl bg-blue-100 flex items-end justify-center px-3 pb-2 border border-blue-200">
                                                <div className="w-full rounded-lg bg-gradient-to-t from-blue-600 to-blue-400" style={{height:`${100-longPct}%`}} />
                                            </div>
                                            <p className="text-[8px] text-blue-600 font-black mt-1.5">{100-longPct}% Bearish</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Shield className="w-3.5 h-3.5 text-indigo-500"/>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Fear & Greed Index</p>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <svg width="130" height="75" viewBox="0 0 130 75">
                                            <path d="M15,65 A50,50 0 0,1 115,65" fill="none" stroke="#fde68a" strokeWidth="14" strokeLinecap="round"/>
                                            <path d="M15,65 A50,50 0 0,1 115,65" fill="none" stroke="url(#fg3)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${fearVal*1.57} 157`}/>
                                            <defs><linearGradient id="fg3" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#ef4444"/><stop offset="50%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#10b981"/></linearGradient></defs>
                                        </svg>
                                        <div className="-mt-4 text-center">
                                            <p className="text-2xl font-black text-indigo-600">{fearVal}</p>
                                            <p className="text-[9px] font-black text-indigo-500/80">Fear</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 10-day price + top holders */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Clock className="w-3.5 h-3.5 text-indigo-500"/>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Last 10 Days Price</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        {days10.map((d,i)=>{
                                            const chg=(Math.random()*10-5).toFixed(2);
                                            return (
                                            <div key={i} style={{background:'rgba(254,252,232,0.60)',border:'1px solid rgba(217,119,6,0.12)'}} className="grid grid-cols-3 rounded-xl px-3 py-1.5 text-[9px]">
                                                    <span className="text-gray-400">{d.toLocaleDateString('en',{month:'short',day:'numeric'})}</span>
                                                    <span className="text-gray-900 font-mono">${((detail.current_price||1)*(1+Number(chg)/100)).toFixed(4)}</span>
                                                    <span className={`text-right font-black ${Number(chg)>=0?'text-sky-600':'text-blue-500'}`}>{Number(chg)>=0?'+':''}{chg}%</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Award className="w-3.5 h-3.5 text-indigo-500"/>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Top 10 Holders</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        {mockHolders.map((h,i)=>(
                                            <div key={i} style={{background:'rgba(254,252,232,0.60)',border:'1px solid rgba(217,119,6,0.12)'}} className="grid grid-cols-3 rounded-xl px-3 py-1.5 text-[9px] items-center">
                                                <span className="text-indigo-400 font-black">#{i+1}</span>
                                                <a href={`https://bscscan.com/address/${h.addr}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-mono truncate">{h.addr.slice(0,9)}…</a>
                                                <span className="text-right font-black text-gray-900">{h.pct}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {selected.length===0 && (
                <Card className="p-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
                        <Target className="w-8 h-8 text-indigo-400" />
                    </div>
                    <p className="font-black text-gray-700 text-lg mb-1">No tokens selected</p>
                    <p className="text-gray-400 text-sm">Use the dropdown above to add up to 10 tokens for deep analysis.</p>
                </Card>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────
const TABS = [
    { id:'ai',    label:'AI Data',          icon:Brain },
    { id:'grow',  label:'Grow & Earn',      icon:TrendingUp },
    { id:'intel', label:'User Intelligence',icon:Cpu },
];

export default function B20AIPage() {
    const [tab, setTab] = useState('ai');
    const [tokens, setTokens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUp, setLastUp] = useState(null);

    const loadData = async () => {
        try {
            const [cgRes, pkRes] = await Promise.all([
                axios.get('https://api.coingecko.com/api/v3/coins/markets',{ params:{ vs_currency:'usd', order:'market_cap_desc', per_page:250, page:1 } }),
                axios.get('https://tokens.pancakeswap.finance/pancakeswap-extended.json'),
            ]);
            const pk=(pkRes.data.tokens||[]).slice(0,350).map(pt=>{
                const cg=cgRes.data.find(c=>c.symbol.toLowerCase()===pt.symbol.toLowerCase());
                return { id:pt.address, symbol:pt.symbol, name:pt.name, address:pt.address,
                    image:cg?.image||pt.logoURI,
                    current_price:cg?.current_price??parseFloat((Math.random()*5).toFixed(4)),
                    price_change_percentage_24h:cg?.price_change_percentage_24h??parseFloat((Math.random()*20-10).toFixed(2)),
                    market_cap_rank:cg?.market_cap_rank||999999,
                    total_volume:cg?.total_volume||parseFloat((Math.random()*500000).toFixed(0)),
                    market_cap:cg?.market_cap||0 };
            });
            const all=[...cgRes.data,...pk];
            const seen=new Set(); const unique=[];
            for(const t of all){
                // Deduplicate by lowercase symbol so CoinGecko + PancakeSwap entries for same coin merge
                const k=(t.symbol||'').toLowerCase();
                if(!seen.has(k)){seen.add(k);unique.push(t);}
            }
            unique.sort((a,b)=>(a.market_cap_rank||999999)-(b.market_cap_rank||999999));
            setTokens(unique);
            setLastUp(new Date());
        } catch(e){ console.error(e); }
        finally{ setLoading(false); }
    };

    useEffect(()=>{ loadData(); const id=setInterval(loadData,60000); return ()=>clearInterval(id); },[]);

    return (
        <main className="min-h-screen" style={{background:'linear-gradient(135deg,#fffdf5 0%,#fefce8 30%,#fffbeb 60%,#fef9ee 100%)'}}>
            <Navbar />

            {/* Decorative golden glow blobs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-indigo-200/30 blur-3xl" />
                <div className="absolute top-1/2 -left-40 w-[400px] h-[400px] rounded-full bg-yellow-200/25 blur-3xl" />
                <div className="absolute bottom-0 right-1/3 w-[300px] h-[300px] rounded-full bg-indigo-100/40 blur-2xl" />
            </div>

            <section className="relative pt-28 pb-24 px-4 md:px-8 max-w-7xl mx-auto">
                {/* Header */}
                <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="mb-10">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="flex items-center gap-1.5 text-[9px] font-black text-indigo-700 bg-indigo-100 border border-indigo-300 rounded-full px-3 py-1 uppercase tracking-[0.2em]">
                                    <Sparkles className="w-3 h-3 text-indigo-500"/> AI-Powered Intelligence
                                </span>
                            </div>
                            <h1 className="text-5xl md:text-6xl font-black leading-none text-gray-900">
                                B20 <span className="bg-gradient-to-r from-indigo-500 via-yellow-500 to-indigo-600 bg-clip-text text-transparent">AI</span>
                            </h1>
                            <p className="text-gray-500 mt-2 max-w-lg">Real-time market intelligence, sentiment analysis, copy trading and deep token analytics.</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <button onClick={loadData} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-white border border-indigo-200 rounded-full text-xs font-bold text-gray-600 hover:bg-indigo-50 transition-all shadow-sm disabled:opacity-50">
                                <RefreshCw className={`w-3.5 h-3.5 text-indigo-500 ${loading?'animate-spin':''}`}/> Refresh
                            </button>
                            {lastUp && <p className="text-[9px] text-gray-400 flex items-center gap-1"><Clock className="w-2.5 h-2.5 text-indigo-400"/>Updated {lastUp.toLocaleTimeString()}</p>}
                        </div>
                    </div>
                </motion.div>

                {/* Tab bar */}
                <div className="flex bg-white/70 border border-indigo-200 p-1.5 rounded-2xl mb-8 max-w-md shadow-sm backdrop-blur-sm">
                    {TABS.map(t=>{
                        const Icon=t.icon;
                        return (
                            <button key={t.id} onClick={()=>setTab(t.id)}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all ${tab===t.id?'bg-gradient-to-r from-indigo-500 to-yellow-500 text-white shadow-lg shadow-indigo-300/40':'text-gray-400 hover:text-indigo-600'}`}>
                                <Icon className="w-3.5 h-3.5"/>{t.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-40 gap-4">
                        <div className="relative w-14 h-14">
                            <div className="absolute inset-0 rounded-full border-2 border-indigo-200" />
                            <div className="absolute inset-0 rounded-full border-2 border-t-indigo-500 animate-spin" />
                        </div>
                        <div className="text-center">
                            <p className="font-black text-gray-800 text-sm mb-1">Loading Live Intelligence</p>
                            <p className="text-[10px] text-gray-400">Fetching market data and AI signals...</p>
                        </div>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div key={tab} initial={{opacity:0,x:18}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-18}} transition={{duration:0.22}}>
                            {tab==='ai'    && <AIDataTab    tokens={tokens} />}
                            {tab==='grow'  && <GrowTab />}
                            {tab==='intel' && <UserIntelTab tokens={tokens} />}
                        </motion.div>
                    </AnimatePresence>
                )}
            </section>
        </main>
    );
}
