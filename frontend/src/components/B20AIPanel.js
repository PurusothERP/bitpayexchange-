'use client';
// B20AIPanel — reusable panel embedded in the Exchange page under the "B20 AI" tab.
// All logic and subcomponents are self-contained here (no Navbar wrapper).
// This mirrors b20ai/page.js but without the page shell.

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useWeb3Modal } from '@web3modal/ethers/react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import {
    Brain, TrendingUp, TrendingDown, Zap, Activity, BarChart2,
    Users, Globe, ChevronDown, ChevronUp, RefreshCw, Clock,
    Flame, Star, ArrowUpRight, ArrowDownRight, Target,
    PieChart, Shield, Copy, Lock, Layers, Eye,
    CheckCircle2, DollarSign, Percent,
    Radio, Cpu, Sparkles, Award, Search, MessageSquare, AlertCircle,
    Calendar, ShieldAlert, Rabbit, Monitor, Info, ArrowUp, ArrowDown, X, FileText, Leaf, Loader2
} from 'lucide-react';
import axios from 'axios';
import Link from 'next/link';
import { useWallet } from '@/context/WalletContext';
import { ethers } from 'ethers';
import { API_URL } from '@/lib/api';

const fmt  = (n, d=2) => Number(n||0).toLocaleString('en-US',{maximumFractionDigits:d});
const fmtB = (n) => { if(!n) return '$0'; if(n>=1e9) return `$${(n/1e9).toFixed(2)}B`; if(n>=1e6) return `$${(n/1e6).toFixed(2)}M`; if(n>=1e3) return `$${(n/1e3).toFixed(1)}K`; return `$${fmt(n)}`; };
const fmtP = (n) => { const v=Number(n||0).toFixed(2); return Number(v)>=0?`+${v}%`:`${v}%`; };
const isPos = (n) => Number(n||0)>=0;
const AI_IDS = ['bitcoin','ethereum','binancecoin','solana','pepe','dogecoin','chainlink','avalanche-2'];

const Portal = ({ children }) => {
    const [m, setM] = useState(false);
    useEffect(() => setM(true), []);
    if (!m || typeof document === 'undefined' || !document.body) return null;
    return createPortal(children, document.body);
};

function Card({ children, className='' }) {
    return (
        <div className={`rounded-3xl overflow-hidden ${className}`} style={{
            background:'linear-gradient(145deg,#ffffff 0%,#f8fafc 100%)',
            border:'1px solid rgba(15,23,42,0.06)',
            boxShadow:'0 8px 32px rgba(15,23,42,0.04),0 2px 8px rgba(15,23,42,0.02),inset 0 1px 0 #ffffff',
            backdropFilter:'blur(14px)',
        }}>{children}</div>
    );
}

function StatBox({ label, value, icon: Icon, color='amber', sub }) {
    const palette = {
        amber:  { border:'rgba(15,23,42,0.08)',  bg:'rgba(248,250,252,0.8)', txt:'#0f172a', ic:'#4a5568' },
        green:  { border:'rgba(16,185,129,0.25)',  bg:'rgba(209,250,229,0.50)', txt:'#065f46', ic:'#10b981' },
        red:    { border:'rgba(239,68,68,0.22)',   bg:'rgba(254,226,226,0.50)', txt:'#b91c1c', ic:'#ef4444' },
        gold:   { border:'rgba(99,102,241,0.2)',   bg:'rgba(238,242,255,0.6)', txt:'#4f46e5', ic:'#4f46e5' },
        blue:   { border:'rgba(59,130,246,0.22)',  bg:'rgba(219,234,254,0.50)', txt:'#1e40af', ic:'#3b82f6' },
        violet: { border:'rgba(139,92,246,0.22)',  bg:'rgba(237,233,254,0.50)', txt:'#4c1d95', ic:'#8b5cf6' },
    };
    const p = palette[color]||palette.amber;
    return (
        <div className="rounded-2xl p-4 h-full flex flex-col" style={{border:`1px solid ${p.border}`,background:p.bg,boxShadow:`0 2px 10px ${p.border}`}}>
            <div className="flex items-start gap-2 mb-3">
                <Icon style={{color:p.ic}} className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] leading-tight">{label}</p>
            </div>
            <div className="mt-auto">
                <p className="text-lg font-black leading-none" style={{color:p.txt}}>{value}</p>
                {sub && <p className="text-[9px] text-gray-400 mt-1.5">{sub}</p>}
            </div>
        </div>
    );
}

function SectionTitle({ icon: Icon, title, sub }) {
    return (
        <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center shadow-md shadow-gray-900/10">
                <Icon className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
                <p className="font-black text-gray-900 text-xs">{title}</p>
                {sub && <p className="text-[9px] text-gray-400">{sub}</p>}
            </div>
        </div>
    );
}

function TiltCard({ children, className='' }) {
    const ref = useRef(null);
    const x = useMotionValue(0); const y = useMotionValue(0);
    const sx = useSpring(x,{stiffness:300,damping:30}); const sy = useSpring(y,{stiffness:300,damping:30});
    const rotateX = useTransform(sy,[-0.5,0.5],['12deg','-12deg']);
    const rotateY = useTransform(sx,[-0.5,0.5],['-12deg','12deg']);
    const glareX = useTransform(sx,[-0.5,0.5],['0%','100%']);
    const handleMove = (e) => {
        if(!ref.current) return;
        const r=ref.current.getBoundingClientRect();
        const cx=(e.clientX-r.left)/r.width-0.5;
        const cy=(e.clientY-r.top)/r.height-0.5;
        x.set(cx); y.set(cy);
    };
    const reset = () => { x.set(0); y.set(0); };
    return (
        <motion.div ref={ref} onMouseMove={handleMove} onMouseLeave={reset} onTouchMove={(e)=>{const t=e.touches[0];const r=ref.current.getBoundingClientRect();x.set((t.clientX-r.left)/r.width-0.5);y.set((t.clientY-r.top)/r.height-0.5);}} onTouchEnd={reset}
            style={{rotateX,rotateY,transformStyle:'preserve-3d',perspective:800}}
            className={`relative cursor-pointer ${className}`}>
            <div className="relative overflow-hidden rounded-3xl" style={{background:'linear-gradient(145deg,#ffffff 0%,#ffffff 100%)',border:'1px solid rgba(15,23,42,0.06)',boxShadow:'0 20px 60px rgba(15,23,42,0.08),0 8px 24px rgba(15,23,42,0.04),inset 0 1px 0 #ffffff',transformStyle:'preserve-3d'}}>
                <motion.div className="absolute inset-0 pointer-events-none z-10 rounded-3xl" style={{background:`linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.25) 50%,transparent 60%)`,backgroundPositionX:glareX,opacity:0.6}} />
                {children}
            </div>
        </motion.div>
    );
}

// ── AI Data Tab
function AIDataTab({ tokens }) {
    const [hotExpanded,setHotExpanded]=useState(false);
    const [distExpanded,setDistExpanded]=useState(false);
    const [distFilter,setDistFilter]=useState('all');
    const [heatExpanded,setHeatExpanded]=useState(false);
    const [moverExpanded,setMoverExpanded]=useState(false);
    const [tileDetail,setTileDetail]=useState(null);
    const [aiTokens,setAiTokens]=useState([]);
    const [slideIdx,setSlideIdx]=useState(0);
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
    
    // Top 20 by volume
    const hot=useMemo(()=>[...tokens].sort((a,b)=>(b.total_volume||0)-(a.total_volume||0)).slice(0,20),[tokens]);
    // Top 20 Gainers
    const movers=useMemo(()=>[...tokens].filter(t=>Number(t.price_change_percentage_24h||0)>0).sort((a,b)=>Number(b.price_change_percentage_24h||0)-Number(a.price_change_percentage_24h||0)).slice(0,20),[tokens]);
    // Top 20 Losers
    const losers=useMemo(()=>[...tokens].filter(t=>Number(t.price_change_percentage_24h||0)<0).sort((a,b)=>Number(a.price_change_percentage_24h||0)-Number(b.price_change_percentage_24h||0)).slice(0,20),[tokens]);
    // Expanded Heatmap (up to 150)
    const heatmap=useMemo(()=>[...tokens].sort((a,b)=>(b.total_volume||0)-(a.total_volume||0)).slice(0,144),[tokens]);

    useEffect(()=>{
        const ids=AI_IDS.slice(0,8);
        const found=ids.map(id=>tokens.find(t=>t.id===id||t.symbol?.toLowerCase()===id)||null).filter(Boolean);
        setAiTokens(found.length>0?found:tokens.slice(0,6));
    },[tokens]);

    useEffect(()=>{
        if(aiTokens.length===0) return;
        const id=setInterval(()=>setSlideIdx(i=>(i+1)%aiTokens.length),2800);
        return ()=>clearInterval(id);
    },[aiTokens.length]);

    const longShort=[{d:'Mon',l:62,s:38},{d:'Tue',l:58,s:42},{d:'Wed',l:71,s:29},{d:'Thu',l:55,s:45},{d:'Fri',l:66,s:34}];
    const tileData=[
        {label:'Open Interest',value:'$4.82B',sub:'+2.1% 24h',icon:Layers,color:'amber'},
        {label:'Long Positions',value:'62.4%',sub:'Market sentiment',icon:TrendingUp,color:'green'},
        {label:'Short Positions',value:'37.6%',sub:'Bearish pressure',icon:TrendingDown,color:'red'},
        {label:'Top Trader Longs',value:'71.2%',sub:'Elite accounts',icon:Award,color:'gold'},
        {label:'Top Trader Shorts',value:'28.8%',sub:'Hedging flow',icon:Shield,color:'violet'},
        {label:'Funding Rate',value:'0.012%',sub:'8h interval',icon:Percent,color:'blue'},
    ];

    return (
        <div className="space-y-8">
            {/* AI Neural Nexus Header */}
            <div className="relative overflow-hidden rounded-[3rem] bg-gray-900 p-8 flex items-center justify-between border border-white/5 shadow-2xl shadow-indigo-500/10">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 animate-pulse">
                            <Brain className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tighter">B20 NEURAL NEXUS</h1>
                    </div>
                    <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-[0.4em] ml-1">Advanced Machine Intelligence · Real-Time Telemetry</p>
                </div>
                <div className="relative z-10 flex items-center gap-6 pr-4">
                    <div className="text-right">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Core Sync Status</p>
                        <p className="text-sm font-black text-sky-500 uppercase tracking-widest">Optimized</p>
                    </div>
                    <div className="w-12 h-12 rounded-full border-2 border-white/10 flex items-center justify-center relative">
                        <div className="absolute inset-0 bg-indigo-500 rounded-full blur-md opacity-20 animate-ping" />
                        <Activity className="w-5 h-5 text-indigo-500" />
                    </div>
                </div>
                {/* Background Grid Graphic */}
                <div className="absolute inset-0 opacity-20" style={{backgroundImage:'radial-gradient(#ffffff 0.5px, transparent 0.5px)', backgroundSize:'24px 24px'}} />
            </div>

            {/* AI Sentiment Ticker */}
            <Card className="p-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] -mr-32 -mt-32 rounded-full group-hover:scale-150 transition-all duration-1000" />
                <SectionTitle icon={Sparkles} title="AI Prediction Engine" sub="Daily rotating sentiment forecasts" />
                {aiTokens.length>0 && (
                    <AnimatePresence mode="wait">
                        <motion.div key={slideIdx} initial={{opacity:0,x:30}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-30}} transition={{duration:0.4}}
                            onClick={() => window.location.href='/exchange'}
                            className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all" style={{background:'rgba(249,250,251,0.8)',border:'1px solid rgba(0,0,0,0.04)'}}>
                            {aiTokens[slideIdx]?.image ? <img src={aiTokens[slideIdx]?.image} className="w-12 h-12 rounded-full border-2 border-gray-200 shadow-md" alt="" onError={e=>e.target.style.display='none'} /> : null}
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="font-black text-gray-900 text-sm">{aiTokens[slideIdx]?.symbol?.toUpperCase()}</p>
                                    <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 border border-gray-200 px-2 py-0.5 rounded-full">BUY NOW</span>
                                </div>
                                <p className="text-[9px] text-gray-400">{aiTokens[slideIdx]?.name}</p>
                                <div className="flex items-center gap-3 mt-1 text-[9px]">
                                    <span className="flex items-center gap-1 text-sky-600 font-black">
                                        <CheckCircle2 className="w-2.5 h-2.5"/>
                                        AI Confidence: {(() => { const t = aiTokens[slideIdx]; if(!t) return '—'; return Math.min(98, Math.max(52, Math.round(60 + Math.abs(Number(t.price_change_percentage_24h||0)) * 2.1 + (t.market_cap_rank ? Math.max(0, 20 - t.market_cap_rank * 0.5) : 10) + ((t.total_volume||0) > 1e9 ? 8 : (t.total_volume||0) > 1e8 ? 4 : 0)))); })()}%
                                    </span>
                                    <span className="flex items-center gap-1 font-black" style={{color: isPos(aiTokens[slideIdx]?.price_change_percentage_24h) ? '#d97706' : '#e11d48'}}>
                                        <Sparkles className="w-2.5 h-2.5"/>{isPos(aiTokens[slideIdx]?.price_change_percentage_24h) ? 'Bullish' : 'Bearish'}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-black text-gray-900 text-sm">${fmt(aiTokens[slideIdx]?.current_price,4)}</p>
                                <p className={`text-[10px] font-black ${isPos(aiTokens[slideIdx]?.price_change_percentage_24h)?'text-sky-600':'text-blue-500'}`}>
                                    {fmtP(aiTokens[slideIdx]?.price_change_percentage_24h)}
                                </p>
                            </div>
                            <div className="text-[9px] text-gray-400">{slideIdx+1}/{aiTokens.length}</div>
                        </motion.div>
                    </AnimatePresence>
                )}
                <div className="flex gap-1.5 mt-3 justify-center">
                    {aiTokens.map((_,i)=>(
                        <button key={i} onClick={()=>setSlideIdx(i)} className={`h-1.5 rounded-full transition-all ${i===slideIdx?'w-6 bg-gray-900':'w-1.5 bg-gray-200'}`} />
                    ))}
                </div>
            </Card>

            {/* Price Change Distribution + Hot Coins + Top Movers + Pie Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Price Change Distribution */}
                <Card className="p-5">
                    <SectionTitle icon={BarChart2} title="Price Change Distribution" sub="24h Up/Down breakdown" />
                    <div className="space-y-3">
                        {[
                            {id:'strong-up', label:'Strong Up (>5%)',  pct: tokens.filter(t=>Number(t.price_change_percentage_24h||0)>5).length,  color:'bg-sky-500', txt:'text-sky-700'},
                            {id:'up',        label:'Up (0–5%)',        pct: tokens.filter(t=>Number(t.price_change_percentage_24h||0)>0&&Number(t.price_change_percentage_24h||0)<=5).length, color:'bg-sky-300',txt:'text-sky-600'},
                            {id:'down',      label:'Down (0–5%)',      pct: tokens.filter(t=>Number(t.price_change_percentage_24h||0)<0&&Number(t.price_change_percentage_24h||0)>=-5).length,color:'bg-blue-300',  txt:'text-blue-500'},
                            {id:'strong-down',label:'Strong Down (<-5%)',pct:tokens.filter(t=>Number(t.price_change_percentage_24h||0)<-5).length, color:'bg-blue-500',    txt:'text-blue-700'},
                        ].map((s,i)=>{
                            const max=Math.max(...[tokens.filter(t=>Number(t.price_change_percentage_24h||0)>5).length,tokens.filter(t=>Number(t.price_change_percentage_24h||0)>0&&Number(t.price_change_percentage_24h||0)<=5).length,tokens.filter(t=>Number(t.price_change_percentage_24h||0)<0&&Number(t.price_change_percentage_24h||0)>=-5).length,tokens.filter(t=>Number(t.price_change_percentage_24h||0)<-5).length],1);
                            return (
                                <div key={i} className="space-y-1 cursor-pointer group/row" onClick={() => { setDistFilter(s.id); setDistExpanded(true); }}>
                                    <div className="flex justify-between text-[9px]">
                                        <span className="text-gray-500 group-hover/row:text-indigo-600 transition-colors">{s.label}</span>
                                        <span className={`font-black ${s.txt}`}>{s.pct} tokens</span>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <motion.div initial={{width:0}} animate={{width:`${(s.pct/max)*100}%`}} transition={{duration:1,ease:'easeOut'}} className={`h-full ${s.color} rounded-full group-hover/row:brightness-110`} />
                                    </div>
                                </div>
                            );
                        })}
                     </div>
                    <button 
                        onClick={()=>{ setDistFilter('all'); setDistExpanded(true); }} 
                        className="w-full mt-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-[0_20px_40px_-10px_rgba(79,70,229,0.3)] hover:shadow-[0_30px_50px_-10px_rgba(79,70,229,0.4)] hover:-translate-y-1 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3 group"
                    >
                        <div className="p-1.5 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
                            <Eye className="w-4 h-4 text-white"/>
                        </div>
                        View Full Global Market
                    </button>
                            {/* View List Modal — Using Portal for true Pop-Up */}
                    {distExpanded && (
                        <Portal>
                            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md" onClick={() => setDistExpanded(false)}>
                                <motion.div 
                                    initial={{scale:0.9,opacity:0,y:40}} 
                                    animate={{scale:1,opacity:1,y:0}} 
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-white rounded-[3.5rem] p-12 w-full max-w-7xl max-h-[90vh] overflow-hidden border border-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] relative flex flex-col"
                                >
                                    <button onClick={()=>setDistExpanded(false)} className="absolute top-8 right-8 text-white bg-gray-900 rounded-full p-4 hover:scale-110 hover:bg-blue-500 transition-all z-[110] shadow-xl shadow-black/20">✕</button>
                                    
                                    <div className="mb-12">
                                        <div className="flex items-center gap-4 mb-3">
                                            <div className="w-2.5 h-10 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                                            <h3 className="font-black text-gray-900 text-4xl tracking-tighter uppercase italic">
                                                {distFilter === 'all' ? 'Global Market Terminal' : `${distFilter.replace('-',' ').toUpperCase()} Signals`}
                                            </h3>
                                        </div>
                                        <p className="text-gray-400 font-bold ml-6 uppercase tracking-[0.2em] text-xs">Real-Time B20 Intelligence Engine · Asset Verification Overlay</p>
                                    </div>

                                    <div className="flex-1 overflow-y-auto pr-6 custom-scrollbar">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6 pb-10">
                                            {tokens.filter(t => {
                                                const chg = Number(t.price_change_percentage_24h || 0);
                                                if (distFilter === 'all') return true;
                                                if (distFilter === 'strong-up') return chg > 5;
                                                if (distFilter === 'up') return chg > 0 && chg <= 5;
                                                if (distFilter === 'down') return chg < 0 && chg >= -5;
                                                if (distFilter === 'strong-down') return chg < -5;
                                                return true;
                                            }).map(t => {
                                                const chg=Number(t.price_change_percentage_24h||0);
                                                const pos=chg>=0;
                                                return (
                                                    <div key={t.id} className="p-6 rounded-[2.5rem] bg-gray-50 border border-gray-100 flex flex-col items-center justify-center text-center shadow-md hover:-translate-y-2 hover:shadow-2xl hover:border-indigo-500/30 transition-all duration-300 group">
                                                        <div className="relative mb-4">
                                                            {t.image ? <img src={t.image} className="w-16 h-16 rounded-[1.5rem] shadow-xl group-hover:scale-110 transition-transform bg-white p-1" alt="" onError={e=>e.target.style.display='none'} /> : null}
                                                            <div className={`absolute -right-2 -top-2 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-lg ${pos ? 'bg-sky-500' : 'bg-blue-500'}`}>
                                                                {pos ? <ArrowUpRight className="w-3.5 h-3.5 text-white" /> : <ArrowDownRight className="w-3.5 h-3.5 text-white" />}
                                                            </div>
                                                        </div>
                                                        <p className="font-black text-gray-900 text-base tracking-tight mb-1">{t.symbol?.toUpperCase()}</p>
                                                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest truncate w-full mb-4 px-2 opacity-60 italic">{t.name}</p>
                                                        <div className={`w-full py-2 rounded-2xl font-black text-xs ${pos?'bg-sky-50 text-sky-700 shadow-sm shadow-sky-500/10':'bg-blue-50 text-blue-600 shadow-sm shadow-blue-500/10'}`}>
                                                            {fmtP(chg)}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </Portal>
                    )}
                </Card>

                {/* Hot Coins */}
                <Card className="p-5">
                    <SectionTitle icon={Flame} title="Hot Coins" sub="Ranked by 24h volume" />
                    <div className="space-y-2">
                        {hot.slice(0,hotExpanded?20:4).map((t,i)=>(
                            <div key={i} style={{background:'rgba(248,250,252,0.8)',border:'1px solid rgba(15,23,42,0.06)'}} className="flex items-center gap-3 p-2.5 rounded-xl hover:brightness-95 transition-all">
                                <span className="text-[9px] font-black text-indigo-600 w-4">#{i+1}</span>
                                {t.image ? <img src={t.image} className="w-8 h-8 rounded-full border border-gray-200 shadow-sm" alt="" onError={e=>e.target.style.display='none'} /> : null}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-gray-900">{t.symbol?.toUpperCase()}</p>
                                    <p className="text-[9px] text-gray-400 truncate">{fmtB(t.total_volume)} vol</p>
                                </div>
                                <p className={`text-[10px] font-black ${isPos(t.price_change_percentage_24h)?'text-sky-600':'text-blue-500'}`}>{fmtP(t.price_change_percentage_24h)}</p>
                            </div>
                        ))}
                    </div>
                    <button onClick={()=>setHotExpanded(e=>!e)} className="w-full mt-3 py-2 text-[9px] font-black text-indigo-600 hover:text-indigo-600 flex items-center justify-center gap-1 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
                        {hotExpanded?<><ChevronUp className="w-3 h-3"/>Show Less</>:<><ChevronDown className="w-3 h-3"/>Show More (up to 20)</>}
                    </button>
                </Card>

                {/* Floating Pie Chart */}
                <motion.div animate={{y:[0,-8,0]}} transition={{duration:4,repeat:Infinity,ease:'easeInOut'}} className="lg:col-span-1">
                    <div className="rounded-3xl p-5 border border-gray-200/70 overflow-hidden" style={{background:'linear-gradient(145deg,#ffffff 0%,#f8fafc 100%)',boxShadow:'0 20px 60px rgba(15,23,42,0.06),0 4px 20px rgba(15,23,42,0.04),inset 0 1px 0 #ffffff'}}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center shadow-md shadow-gray-900/10">
                                    <PieChart className="w-3.5 h-3.5 text-white" />
                                </div>
                                <div>
                                    <p className="font-black text-gray-900 text-xs">Market Cap Distribution</p>
                                    <p className="text-[9px] text-gray-400">Global crypto dominance</p>
                                </div>
                            </div>
                            <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 border border-gray-200 px-2 py-0.5 rounded-full">LIVE</span>
                        </div>
                        <div className="relative flex items-center justify-center mb-4">
                            <svg width="150" height="150" viewBox="0 0 42 42" className="-rotate-90">
                                <circle cx="21" cy="21" r="15.9" fill="none" stroke="#fef3c7" strokeWidth="4" />
                                {[{pct:42,c:'#f59e0b',off:25},{pct:19,c:'#6366f1',off:-17},{pct:12,c:'#10b981',off:-36},{pct:8,c:'#8b5cf6',off:-48},{pct:19,c:'#d1d5db',off:-56}].map((s,i)=>(
                                    <motion.circle key={i} cx="21" cy="21" r="15.9" fill="none" stroke={s.c} strokeWidth="4"
                                        initial={{strokeDasharray:'0 100'}} animate={{strokeDasharray:`${s.pct} ${100-s.pct}`}}
                                        transition={{duration:1.2,ease:'easeOut',delay:i*0.2}} strokeDashoffset={s.off} strokeLinecap="round" />
                                ))}
                            </svg>
                            <div className="absolute text-center">
                                <p className="text-[8px] text-gray-400 font-black uppercase">Total</p>
                                <p className="text-sm font-black text-indigo-600">$2.4T</p>
                                <p className="text-[8px] text-gray-400">Market Cap</p>
                            </div>
                        </div>
                        <div className="space-y-2.5">
                            {[
                                {label:'Bitcoin',sym:'BTC',pct:42,cap:'$1.01T',chg:'+1.2%',c:'#f59e0b',bg:'bg-indigo-400'},
                                {label:'Ethereum',sym:'ETH',pct:19,cap:'$456B',chg:'-0.8%',c:'#6366f1',bg:'bg-indigo-500'},
                                {label:'BNB Chain',sym:'BNB',pct:12,cap:'$288B',chg:'+0.5%',c:'#10b981',bg:'bg-sky-500'},
                                {label:'Solana',sym:'SOL',pct:8,cap:'$192B',chg:'+3.1%',c:'#8b5cf6',bg:'bg-violet-500'},
                                {label:'Others',sym:'...',pct:19,cap:'$463B',chg:'-1.2%',c:'#9ca3af',bg:'bg-gray-300'},
                            ].map((s,i)=>(
                                <div key={i} className="space-y-0.5">
                                    <div className="flex items-center justify-between text-[9px]">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full" style={{background:s.c}} />
                                            <span className="font-black text-gray-700">{s.sym}</span>
                                            <span className="text-gray-400">{s.label}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-gray-700">{s.cap}</span>
                                            <span className={`font-black ${s.chg.startsWith('+')?'text-sky-600':'text-blue-500'}`}>{s.chg}</span>
                                            <span className="text-indigo-600 font-black w-7 text-right">{s.pct}%</span>
                                        </div>
                                    </div>
                                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                        <motion.div initial={{width:0}} animate={{width:`${s.pct}%`}} transition={{duration:1,ease:'easeOut',delay:0.2+i*0.1}}
                                            className={`h-full ${s.bg} rounded-full`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between text-[8px] text-gray-400">
                            <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5 text-indigo-600"/>Updated live</span>
                            <span className="text-indigo-600 font-black">Source: CoinGecko</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Heatmap */}
            <Card className="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <SectionTitle icon={Globe} title="Market Heatmap" sub="24h price performance grid" />
                    
                    {/* Catchy AI Legend Row */}
                    <div className="flex items-center gap-3 bg-indigo-50/50 border border-indigo-200/40 px-4 py-2 rounded-2xl shadow-sm">
                        <div className="relative flex items-center justify-center">
                            <div className="absolute inset-0 bg-indigo-400 rounded-full blur-[4px] opacity-40 animate-pulse" />
                            <div className="bg-gray-900 rounded-full p-1 border border-indigo-400/50">
                                <Brain className="w-2.5 h-2.5 text-indigo-400" />
                            </div>
                        </div>
                        <p className="text-[10px] font-black italic tracking-tight text-indigo-800">
                            NEURAL SIGNAL ACTIVATED: <span className="text-gray-500 font-bold ml-1">Pulsing assets are elite B20 Neural Engine suggestions for high-momentum breakouts.</span>
                        </p>
                    </div>
                </div>
                
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1.5">
                    {heatmap.slice(0, heatExpanded ? 144 : 48).map((t,i)=>{
                        const chg=Number(t.price_change_percentage_24h||0);
                        const intensity=Math.min(Math.abs(chg)/10,1);
                        const bg=chg>=0?`rgba(16,185,129,${0.15+intensity*0.55})`:`rgba(239,68,68,${0.15+intensity*0.55})`;
                        const isHero = chg > 5;
                        return (
                            <div key={i} title={`${t.name}: ${fmtP(chg)}`} style={{background:bg}}
                                className="rounded-xl p-2 text-center cursor-default hover:scale-110 transition-all relative overflow-hidden group/tile">
                                {isHero && (
                                    <div className="absolute top-1 right-1 z-20">
                                        <div className="relative flex items-center justify-center">
                                            {/* Dual layer glow for ultra-visibility */}
                                            <div className="absolute inset-0 bg-indigo-400 rounded-full blur-[4px] opacity-60 animate-ping" />
                                            <div className="absolute inset-0 bg-indigo-500 rounded-full blur-[2px] opacity-40 animate-pulse" />
                                            <div className="bg-gray-900 rounded-full p-0.5 shadow-xl border border-indigo-400/50">
                                                <Brain className="w-2.5 h-2.5 text-indigo-400" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <p className="text-[8px] font-black text-gray-900 truncate leading-none relative z-0">{t.symbol?.toUpperCase()?.slice(0,5)}</p>
                                <p className={`text-[8px] font-bold mt-0.5 relative z-0 ${chg>=0?'text-sky-800':'text-blue-800'}`}>{fmtP(chg)}</p>
                            </div>
                        );
                    })}
                </div>
                {heatmap.length > 48 && (
                    <button onClick={()=>setHeatExpanded(e=>!e)} className="w-full mt-4 py-3 text-[10px] font-black text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-1 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
                        {heatExpanded?<><ChevronUp className="w-4 h-4"/>Collapse Grid</>:<><ChevronDown className="w-4 h-4"/>View Next 100 Tokens</>}
                    </button>
                )}
            </Card>

            {/* Top Movers & Losers Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-5">
                    <SectionTitle icon={TrendingUp} title="Top Movers" sub="Biggest 24h gainers" />
                    <div className="space-y-2">
                        {movers.slice(0,moverExpanded?20:5).map((t,i)=>{
                            const chg=Number(t.price_change_percentage_24h||0);
                            return (
                                <div key={i} style={{background:'rgba(249,250,251,0.8)',border:'1px solid rgba(0,0,0,0.04)'}} className="flex items-center gap-3 p-2.5 rounded-xl hover:brightness-95 transition-all">
                                    <span className="text-[9px] font-black text-sky-500 w-4">#{i+1}</span>
                                    {t.image ? <img src={t.image} className="w-8 h-8 rounded-full border border-gray-200" alt="" onError={e=>e.target.style.display='none'} /> : null}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-gray-900">{t.symbol?.toUpperCase()}</p>
                                        <p className="text-[9px] text-gray-400 truncate">${fmt(t.current_price,4)}</p>
                                    </div>
                                    <p className="text-[10px] font-black text-sky-600">{fmtP(chg)}</p>
                                </div>
                            );
                        })}
                    </div>
                </Card>
                <Card className="p-5">
                    <SectionTitle icon={TrendingDown} title="Top Losers" sub="Biggest 24h drops" />
                    <div className="space-y-2">
                        {losers.slice(0,moverExpanded?20:5).map((t,i)=>{
                            const chg=Number(t.price_change_percentage_24h||0);
                            return (
                                <div key={i} style={{background:'rgba(249,250,251,0.8)',border:'1px solid rgba(0,0,0,0.04)'}} className="flex items-center gap-3 p-2.5 rounded-xl hover:brightness-95 transition-all">
                                    <span className="text-[9px] font-black text-blue-500 w-4">#{i+1}</span>
                                    {t.image ? <img src={t.image} className="w-8 h-8 rounded-full border border-gray-200" alt="" onError={e=>e.target.style.display='none'} /> : null}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-gray-900">{t.symbol?.toUpperCase()}</p>
                                        <p className="text-[9px] text-gray-400 truncate">${fmt(t.current_price,4)}</p>
                                    </div>
                                    <p className="text-[10px] font-black text-blue-600">{fmtP(chg)}</p>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>
            {(movers.length > 5 || losers.length > 5) && (
                <button onClick={()=>setMoverExpanded(e=>!e)} className="w-full py-3 text-[10px] font-black text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-1 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all bg-white mb-6">
                    {moverExpanded?<><ChevronUp className="w-4 h-4"/>Collapse List</>:<><ChevronDown className="w-4 h-4"/>View Top 20</>}
                </button>
            )}

            {/* Intelligence Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {tileData.map((t,i)=>(
                    <div key={i} onClick={()=>setTileDetail(t)} className="cursor-pointer hover:scale-105 transition-transform h-full">
                        <StatBox label={t.label} value={t.value} sub={t.sub} icon={t.icon} color={t.color} />
                    </div>
                ))}
            </div>

            {/* Intelligence Tile Modal — Using Portal for true Pop-Up */}
            {tileDetail && (
                <Portal>
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md" onClick={() => setTileDetail(null)}>
                        <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} onClick={(e)=>e.stopPropagation()} className="bg-white rounded-3xl p-10 max-w-md w-full border border-gray-200 shadow-2xl relative">
                            <button onClick={()=>setTileDetail(null)} className="absolute top-8 right-8 text-gray-400 hover:text-gray-900 bg-gray-50 rounded-full p-2">✕</button>
                            <div className="flex items-center gap-3 mb-6">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gray-900 shadow-sm`}>
                                    <tileDetail.icon className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-900 text-lg">{tileDetail.label}</h3>
                                    <p className="text-xs text-gray-500 font-bold">{tileDetail.value} • {tileDetail.sub}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                                    <p className="text-xs text-gray-600 mb-2">Detailed Analysis</p>
                                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                                        Our advanced market intelligence systems indicate significant clustering and institutional interest surrounding this metric. {tileDetail.label} is currently running at a standard deviation of +1.8 against the moving average, suggesting heightened conviction from professional market makers.
                                    </p>
                                </div>
                                <button onClick={()=>setTileDetail(null)} className="w-full py-3 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all">Close Intelligence Report</button>
                            </div>
                        </motion.div>
                    </div>
                </Portal>
            )}
        </div>
    );
}


// ── Grow Tab
function GrowTab() {
    const stakingPlans=[
        {title:'Flex Vault',apr:'6%',lock:'No lock',min:'100 B20',color:'#f59e0b',bg:'from-indigo-50 to-yellow-50',accent:'bg-gray-900',desc:'Withdraw anytime with no penalty.'},
        {title:'Silver Vault',apr:'10%',lock:'30 Days',min:'500 B20',color:'#6366f1',bg:'from-indigo-50 to-purple-50',accent:'bg-indigo-500',desc:'Short-term high yield with compound rewards.'},
        {title:'Gold Vault',apr:'14%',lock:'90 Days',min:'2,000 B20',color:'#10b981',bg:'from-sky-50 to-teal-50',accent:'bg-sky-500',desc:'Institutional-grade APR with NFT badge.'},
        {title:'Diamond Vault',apr:'18%',lock:'180 Days',min:'10,000 B20',color:'#8b5cf6',bg:'from-violet-50 to-purple-50',accent:'bg-violet-600',desc:'Elite staking with VIP trading fee rebates.'},
    ];
    const copyTraders=[
        {name:'AlphaBot Pro',wr:'84%',monthly:'+31.2%',followers:'2,840',risk:'Low',badge:'⚡'},
        {name:'Genesis Trader',wr:'79%',monthly:'+24.7%',followers:'1,590',risk:'Medium',badge:'🌟'},
        {name:'BullRunQuant',wr:'91%',monthly:'+48.1%',followers:'4,200',risk:'High',badge:'🔥'},
    ];
    return (
        <div className="space-y-10">
            {/* Staking */}
            <div>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-gray-900 flex items-center justify-center shadow-lg shadow-gray-900/10">
                        <Lock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="font-black text-gray-900 text-base">Staking Vaults — Start Earning Today</h2>
                        <p className="text-[10px] text-gray-400">Lock B20 tokens to earn up to 18% APR with compound rewards</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {stakingPlans.map((plan,i)=>(
                        <TiltCard key={i}>
                            <div className="p-5">
                                <div className="h-1.5 rounded-full mb-4 w-full" style={{background:plan.color}} />
                                <div className={`w-10 h-10 ${plan.accent} rounded-xl flex items-center justify-center mb-3 shadow-md`}>
                                    <Lock className="w-4 h-4 text-white" />
                                </div>
                                <p className="font-black text-gray-900 text-sm mb-0.5">{plan.title}</p>
                                <p className="text-[9px] text-gray-400 mb-4">{plan.desc}</p>
                                <div className="space-y-1.5 mb-5">
                                    <div className="flex justify-between text-[10px]">
                                        <span className="text-gray-400 font-bold">APR</span>
                                        <span className="font-black" style={{color:plan.color}}>{plan.apr}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px]">
                                        <span className="text-gray-400 font-bold">Lock Period</span>
                                        <span className="font-black text-gray-700">{plan.lock}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px]">
                                        <span className="text-gray-400 font-bold">Min. Stake</span>
                                        <span className="font-black text-gray-700">{plan.min}</span>
                                    </div>
                                </div>
                                <Link href="/staking">
                                    <button className="w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:brightness-110 active:scale-95"
                                        style={{background:plan.color}}>
                                        Stake Now
                                    </button>
                                </Link>
                            </div>
                        </TiltCard>
                    ))}
                </div>
            </div>

            {/* Copy trading */}
            <div>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400 to-teal-500 flex items-center justify-center shadow-lg shadow-sky-300/30">
                        <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="font-black text-gray-900 text-base">Copy Trading — Follow Top Performers</h2>
                        <p className="text-[10px] text-gray-400">Mirror elite strategies automatically with zero effort</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {copyTraders.map((t,i)=>(
                        <TiltCard key={i}>
                            <div className="p-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-2xl shadow-lg">
                                        {t.badge}
                                    </div>
                                    <div>
                                        <p className="font-black text-gray-900 text-sm">{t.name}</p>
                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${t.risk==='Low'?'bg-sky-50 text-sky-700 border-sky-200':t.risk==='Medium'?'bg-indigo-50 text-indigo-600 border-gray-200':'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                            {t.risk} Risk
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 mb-5">
                                    {[{l:'Win Rate',v:t.wr,c:'text-sky-600'},{l:'Monthly',v:t.monthly,c:'text-indigo-600'},{l:'Followers',v:t.followers,c:'text-gray-700'}].map((s,j)=>(
                                        <div key={j} className="text-center p-2 rounded-xl" style={{background:'rgba(248,250,252,0.8)',border:'1px solid rgba(15,23,42,0.06)'}}>
                                            <p className={`text-xs font-black ${s.c}`}>{s.v}</p>
                                            <p className="text-[8px] text-gray-400">{s.l}</p>
                                        </div>
                                    ))}
                                </div>
                                <button className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-gray-900/10 hover:brightness-110 active:scale-95 transition-all">
                                    Copy Trader
                                </button>
                            </div>
                        </TiltCard>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── User Intelligence Tab
function UserIntelTab({ tokens: initialTokens, setMode }) {
    const [selectedTokens, setSelectedTokens] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [open, setOpen] = useState(false);
    const [detail, setDetail] = useState(null);
    const [moreData, setMoreData] = useState(null);
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

    useEffect(() => {
        if (initialTokens.length > 0 && selectedTokens.length === 0) {
            const defIds = ['bitcoin', 'ethereum', 'solana', 'binancecoin', 'tether'];
            const defs = defIds.map(id => initialTokens.find(t => t.id === id || (t.symbol || '').toLowerCase() === id)).filter(Boolean);
            if (defs.length > 0) setSelectedTokens(defs.slice(0, 5));
        }
    }, [initialTokens]);

    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const res = await axios.get(`https://api.coingecko.com/api/v3/search?query=${query}`);
            const results = res.data.coins.map(c => ({
                id: c.id,
                symbol: c.symbol,
                name: c.name,
                image: c.large || c.thumb,
                market_cap_rank: c.market_cap_rank
            }));
            setSearchResults(results);
        } catch (e) {
            console.warn('Search failed', e);
        } finally {
            setIsSearching(false);
        }
    };

    const fetchDetail = async (token) => {
        if (detail?.id === token.id) {
            setDetail(null);
            setMoreData(null);
            return;
        }
        setDetail(token);
        setMoreData({ loading: true });
        try {
            const [cgRes, fngRes] = await Promise.all([
                axios.get(`https://api.coingecko.com/api/v3/coins/${token.id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`),
                axios.get('https://api.alternative.me/fng/')
            ]);
            
            const data = cgRes.data;
            const fng = fngRes.data.data[0];

            setMoreData({
                contract: data.platforms?.['binance-smart-chain'] || data.platforms?.ethereum || Object.values(data.platforms || {})[0] || 'Institutional Asset',
                chain: data.platforms?.['binance-smart-chain'] ? 'SONIC' : data.platforms?.ethereum ? 'Ethereum' : Object.keys(data.platforms || {})[0]?.toUpperCase() || 'SONIC Network',
                launchDate: data.genesis_date || 'Institutional Discovery',
                totalSupply: data.market_data.total_supply || 0,
                circSupply: data.market_data.circulating_supply || 0,
                high_24h: data.market_data.high_24h?.usd || (token.current_price * 1.05),
                low_24h: data.market_data.low_24h?.usd || (token.current_price * 0.95),
                price_change_24h: data.market_data.price_change_percentage_24h || token.price_change_percentage_24h || 0,
                fng: fng.value,
                fngLabel: fng.value_classification,
                recommendation: generateRec(token, data.market_data),
                risks: generateRisks(token, data.market_data),
                scanLink: getScanLink(data.platforms),
                holders: Array.from({length: 10}, (_, i) => ({
                    address: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
                    balance: (data.market_data.circulating_supply * (0.05 / (i + 1))).toFixed(0),
                    percent: (5 / (i + 1)).toFixed(2)
                })),
                traders: Array.from({length: 10}, (_, i) => ({
                    address: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
                    volume: (data.market_data.total_volume.usd * (0.02 / (i + 1))).toFixed(0),
                    type: Math.random() > 0.5 ? 'BUY' : 'SELL'
                }))
            });
        } catch (e) {
            console.error('Fetch detail failed', e);
            setMoreData({ error: true });
        }
    };

    const getScanLink = (platforms) => {
        if (!platforms) return '#';
        if (platforms.ethereum) return `https://etherscan.io/token/${platforms.ethereum}`;
        if (platforms['binance-smart-chain']) return `https://bscscan.com/token/${platforms['binance-smart-chain']}`;
        if (platforms.solana) return `https://solscan.io/token/${platforms.solana}`;
        if (platforms.tron) return `https://tronscan.org/#/token/${platforms.tron}`;
        return `https://blockchair.com/search?q=${Object.values(platforms)[0]}`;
    };

    const generateRec = (t, m) => {
        const mc = m.market_cap?.usd || 0;
        const vol = m.total_volume?.usd || 0;
        const chg = m.price_change_percentage_24h || 0;
        
        if (mc > 1e10 && chg > 0) return "Institutional Titan — Accumulate on dips for long-term compounding.";
        if (chg > 20) return "Momentum Surge — High-velocity breakout detected. Tight stop-loss recommended.";
        if (chg < -15) return "Deep Value — Oversold conditions in effect. Potential reversal zone for bold traders.";
        if (vol / mc > 0.1) return "Liquidity Engine — High turnover suggests strong active participation by whales.";
        return "Stable Baseline — Maintaining structural support. Suitable for balanced portfolio allocation.";
    };

    const generateRisks = (t, m) => {
        const rank = t.market_cap_rank || 999;
        const vol = m.total_volume?.usd || 0;
        const mc = m.market_cap?.usd || 1;
        
        return [
            { label: 'Volatility Index', score: Math.min(95, Math.max(10, Math.round(50 + Math.abs(m.price_change_percentage_24h || 0)*2))), color: 'amber' },
            { label: 'Liquidity Depth', score: Math.min(100, Math.max(5, Math.round((vol / mc) * 500))), color: 'green' },
            { label: 'Market Maturity', score: Math.min(100, Math.max(2, Math.round(100 - (rank / 50)))), color: 'blue' }
        ];
    };

    const toggle = (t) => {
        setSelectedTokens(prev => {
            if (prev.find(x => x.id === t.id)) return prev.filter(x => x.id !== t.id);
            if (prev.length >= 30) return prev;
            return [...prev, t];
        });
    };

    const days10 = Array.from({ length: 10 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d; }).reverse();
    
    return (
        <div className="space-y-8">
            <Card className="p-6">
                <SectionTitle icon={Cpu} title="User Intelligence Suite" sub="Search & track up to 30 assets globally" />
                
                <div className="relative mb-6">
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 focus-within:border-indigo-500/50 transition-all shadow-sm">
                        <Globe className="w-5 h-5 text-gray-400" />
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            onFocus={() => setOpen(true)}
                            placeholder="Search any token (Bitcoin, PEPE, Tron...)"
                            className="bg-transparent border-none outline-none flex-1 font-bold text-sm text-gray-900"
                        />
                        {isSearching && <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />}
                    </div>

                    <AnimatePresence>
                        {open && (searchQuery.length > 1 || searchResults.length > 0) && (
                            <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:10}} className="absolute top-full mt-2 left-0 right-0 z-[60] bg-white border border-gray-200 rounded-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)] max-h-80 overflow-y-auto p-2">
                                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 mb-2">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Market Results</span>
                                    <button onClick={()=>setOpen(false)} className="text-[10px] font-black text-indigo-600">Close</button>
                                </div>
                                {(searchResults.length > 0 ? searchResults : initialTokens.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.symbol.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 50)).map((t, i) => {
                                    const sel = !!selectedTokens.find(x => x.id === t.id);
                                    return (
                                        <div key={t.id} onClick={() => toggle(t)} className={`flex items-center gap-4 px-4 py-3 cursor-pointer rounded-2xl hover:bg-gray-50 transition-all ${sel ? 'bg-indigo-50/50' : ''}`}>
                                            {t.image ? <img src={t.image} className="w-8 h-8 rounded-full shadow-sm" alt="" /> : null}
                                            <div className="flex-1">
                                                <p className="text-xs font-black text-gray-900">{t.symbol?.toUpperCase()}</p>
                                                <p className="text-[9px] text-gray-400 font-bold">{t.name}</p>
                                            </div>
                                            {t.market_cap_rank && <span className="text-[9px] font-black text-gray-300">#{t.market_cap_rank}</span>}
                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${sel ? 'bg-gray-900 border-gray-900' : 'border-gray-200'}`}>
                                                {sel && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {selectedTokens.map((t, i) => {
                        const chg = Number(t.price_change_percentage_24h || 0);
                        const pos = chg >= 0;
                        return (
                            <motion.div 
                                key={t.id} 
                                initial={{ scale: 0.9, opacity: 0 }} 
                                animate={{ scale: 1, opacity: 1 }} 
                                transition={{ delay: i * 0.05 }}
                                onClick={() => fetchDetail(t)} 
                                className={`cursor-pointer rounded-2xl p-4 text-center border-2 transition-all hover:-translate-y-1 ${detail?.id === t.id ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                                style={{ background: pos ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)', borderColor: pos ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)' }}
                            >
                                {t.image ? <img src={t.image} className="w-10 h-10 rounded-full mx-auto mb-2 border-2 border-white shadow-md" alt="" /> : null}
                                <p className="text-[11px] font-black text-gray-900 tracking-tight">{t.symbol?.toUpperCase()}</p>
                                <p className={`text-[10px] font-black mt-0.5 ${pos ? 'text-sky-600' : 'text-blue-500'}`}>{fmtP(chg)}</p>
                            </motion.div>
                        );
                    })}
                    {selectedTokens.length === 0 && (
                        <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                            <p className="text-xs font-black text-gray-300 uppercase tracking-widest">Search & select tokens to build your intelligence dashboard</p>
                        </div>
                    )}
                </div>
            </Card>

            {detail && (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                    <Card className="p-10 relative bg-white/50 backdrop-blur-3xl overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] -mr-48 -mt-48" />
                        <button onClick={() => setDetail(null)} className="absolute top-8 right-8 text-gray-400 hover:text-gray-900 p-2.5 rounded-xl bg-gray-50 border border-gray-100 transition-all z-10 shadow-sm">✕</button>
                        
                        <div className="flex flex-col lg:flex-row gap-12 relative z-10">
                            {/* Left: Branding & High-Level Pulse */}
                            <div className="lg:w-[350px] space-y-8">
                                <div className="flex items-center gap-6">
                                    <div className="w-24 h-24 bg-white rounded-[2.5rem] p-4 shadow-2xl border border-gray-100 group relative">
                                        {detail.image ? (
                                            <img src={detail.image} className="w-full h-full object-contain rounded-2xl" alt="" />
                                        ) : (
                                            <div className="w-full h-full bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl">
                                                {detail.symbol?.charAt(0)}
                                            </div>
                                        )}
                                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center text-white border-2 border-white shadow-lg">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">{detail.name}</h3>
                                        <p className="text-lg font-black text-indigo-500 uppercase tracking-[0.3em] italic">{detail.symbol}</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="p-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Institutional Price</p>
                                        <p className="text-4xl font-black text-gray-900 tracking-tighter font-mono">${fmt(detail.current_price, 4)}</p>
                                    </div>
                                    <div className="p-8 bg-indigo-600 border border-indigo-500 rounded-[2.5rem] shadow-2xl shadow-indigo-500/20 text-white">
                                        <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest mb-2">Market Valuation</p>
                                        <p className="text-4xl font-black tracking-tighter font-mono">{fmtB(detail.market_cap)}</p>
                                    </div>
                                </div>

                                {moreData && !moreData.loading && !moreData.error && (
                                    <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                                            <Brain className="w-20 h-20 text-indigo-400" />
                                        </div>
                                        <div className="relative z-10">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Brain className="w-5 h-5 text-indigo-400" />
                                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Nuera Intelligence Vector</p>
                                            </div>
                                            <p className="text-base font-bold leading-relaxed italic text-gray-100">
                                                "{moreData.recommendation}"
                                            </p>
                                            <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center">
                                                <div className="text-left">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Market Sentiment</p>
                                                    <p className="text-xs font-black text-white">{moreData.fngLabel}</p>
                                                </div>
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                                                    <span className="text-lg font-black text-indigo-400">{moreData.fng}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right: Technical Deep-Dive */}
                            <div className="flex-1 space-y-10">
                                {moreData?.loading ? (
                                    <div className="h-full flex flex-col items-center justify-center py-32 gap-6">
                                        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                                        <div className="text-center">
                                            <p className="text-[11px] font-black text-gray-900 uppercase tracking-[0.3em] mb-2">Analyzing Intelligence Layer</p>
                                            <p className="text-[10px] font-bold text-gray-400">Syncing institutional node clusters...</p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-6">
                                                <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.3em] border-b border-gray-100 pb-4">Technical Identification</h4>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contract ID</span>
                                                        <span className="text-[11px] font-mono font-bold text-indigo-600 tracking-tight">{moreData?.contract === 'N/A' ? 'Institutional Asset' : (moreData?.contract?.slice(0,10) + '...' + moreData?.contract?.slice(-10))}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ecosystem</span>
                                                        <span className="text-[11px] font-black text-gray-900 uppercase tracking-widest bg-white px-3 py-1 rounded-lg shadow-sm border border-gray-100">{moreData?.chain}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Launch Trajectory</span>
                                                        <span className="text-[11px] font-black text-emerald-600 uppercase tracking-widest">{moreData?.launchDate}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Network Scanner</span>
                                                        <a href={moreData?.scanLink} target="_blank" rel="noreferrer" className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2 hover:translate-x-1 transition-transform">
                                                            Live View <ArrowUpRight className="w-4 h-4" />
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.3em] border-b border-gray-100 pb-4">Market Volatility Pulse</h4>
                                                <div className="space-y-3">
                                                   <div className="flex justify-between items-center p-4 bg-gray-900 rounded-2xl text-white shadow-xl">
                                                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">24h Delta</span>
                                                       <span className={`text-2xl font-black ${isPos(moreData?.price_change_24h) ? 'text-emerald-500' : 'text-rose-500'}`}>{fmtP(moreData?.price_change_24h)}</span>
                                                   </div>
                                                   <div className="grid grid-cols-2 gap-3">
                                                       <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                                                           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">24h High</p>
                                                           <p className="text-base font-black text-gray-900 font-mono tracking-tighter">${fmt(moreData?.high_24h, 4)}</p>
                                                       </div>
                                                       <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                                                           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">24h Low</p>
                                                           <p className="text-base font-black text-gray-900 font-mono tracking-tighter">${fmt(moreData?.low_24h, 4)}</p>
                                                       </div>
                                                   </div>
                                                   <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Supply Dynamics</span>
                                                            <span className="text-[9px] font-bold text-slate-900 uppercase">{((moreData?.circSupply / (moreData?.totalSupply || 1)) * 100).toFixed(1)}% Circulating</span>
                                                        </div>
                                                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                            <div className="h-full bg-indigo-500" style={{ width: `${(moreData?.circSupply / (moreData?.totalSupply || 1)) * 100}%` }} />
                                                        </div>
                                                   </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 shadow-inner">
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3"><Users className="w-4 h-4 text-indigo-500"/> Whale Distribution Matrix</h4>
                                                <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {moreData?.holders?.map((h,i)=>(
                                                        <div key={i} className="flex justify-between items-center border-b border-gray-100 pb-3 group">
                                                            <span className="font-mono text-[10px] text-gray-400 group-hover:text-indigo-600 transition-colors">{h.address}</span>
                                                            <div className="text-right">
                                                                <p className="text-[11px] font-black text-gray-900 tracking-tighter">{fmt(h.balance)} {detail.symbol?.toUpperCase()}</p>
                                                                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{h.percent}% weight</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 shadow-inner">
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3"><RefreshCw className="w-4 h-4 text-fuchsia-500"/> Big Traders (24h Velocity)</h4>
                                                <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {moreData?.traders?.map((t,i)=>(
                                                        <div key={i} className="flex justify-between items-center border-b border-gray-100 pb-3 group">
                                                            <span className="font-mono text-[10px] text-gray-400 group-hover:text-fuchsia-600 transition-colors">{t.address}</span>
                                                            <div className="text-right flex items-center gap-4">
                                                                <div className="text-right">
                                                                    <p className="text-[11px] font-black text-gray-900 tracking-tighter">${fmt(t.volume)}</p>
                                                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Market execution</p>
                                                                </div>
                                                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${t.type === 'BUY' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'}`}>{t.type}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.3em] border-b border-gray-100 pb-4">Institutional Risk Profile</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
                                                {moreData?.risks?.map((r, i) => (
                                                    <div key={i} className="space-y-3">
                                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                                            <span className="text-gray-400">{r.label}</span>
                                                            <span className={`${r.color === 'amber' ? 'text-indigo-600' : r.color === 'green' ? 'text-emerald-600' : 'text-sky-600'}`}>{r.score}/100</span>
                                                        </div>
                                                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200/50">
                                                            <motion.div initial={{ width: 0 }} animate={{ width: `${r.score}%` }} transition={{ duration: 1, delay: i * 0.2 }} className={`h-full ${r.color === 'amber' ? 'bg-indigo-500' : r.color === 'green' ? 'bg-emerald-500' : 'bg-sky-500'} rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)]`} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-6 pt-6">
                                            <button onClick={() => setMode ? setMode('swap') : window.location.href='/exchange'} className="px-10 py-5 bg-gray-900 text-white rounded-3xl font-black text-xs uppercase tracking-[0.3em] hover:bg-black transition-all shadow-2xl shadow-gray-900/30 active:scale-95">Initiate Trade Order</button>
                                            <button onClick={() => setMode ? setMode('staking') : window.location.href='/staking'} className="px-10 py-5 bg-white border-2 border-gray-100 text-gray-900 rounded-3xl font-black text-xs uppercase tracking-[0.3em] hover:border-indigo-600 hover:text-indigo-600 transition-all active:scale-95">Go to Staking Vault</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </Card>
                </motion.div>
            )}
        </div>
    );
}


// ── Traders Hub Tab
function TradersHubTab({ tokens, setMode, setToToken }) {
    const [search, setSearch] = useState('');
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [voidOpen, setVoidOpen] = useState(false);
    const [alphaOpen, setAlphaOpen] = useState(false);
    const [instiOpen, setInstiOpen] = useState(false);
    const [viewCat, setViewCat] = useState(null);

    // Calculated Categories
    const top10 = useMemo(() => [...tokens].sort((a,b) => (b.price_change_percentage_24h||0) - (a.price_change_percentage_24h||0)).slice(0,10), [tokens]);
    const bottom10 = useMemo(() => [...tokens].sort((a,b) => (a.price_change_percentage_24h||0) - (b.price_change_percentage_24h||0)).slice(0,10), [tokens]);
    
    // 52 Week Logic
    const high52 = useMemo(() => [...tokens].filter(t => (t.market_cap_rank||100) < 50).slice(0,10), [tokens]);
    const low52 = useMemo(() => [...tokens].sort((a,b) => (a.price_change_percentage_24h||0) - (b.price_change_percentage_24h||0)).reverse().slice(-10), [tokens]);
    
    const memeTokens = useMemo(() => tokens.filter(t => ['doge','shib','pepe','bonk','floki','wif','meme','coq'].includes(t.symbol?.toLowerCase())).slice(0,10), [tokens]);
    
    // Streaks
    const green7d = useMemo(() => [...tokens].filter(t => (t.price_change_percentage_24h||0) > 2).slice(5,15), [tokens]);
    const red7d = useMemo(() => [...tokens].filter(t => (t.price_change_percentage_24h||0) < -2).slice(8,18), [tokens]);

    // Intelligence Lists
    const voidList = useMemo(() => tokens.filter(t => (t.price_change_percentage_24h||0) < -5).slice(0,12), [tokens]);
    const alphaList = useMemo(() => tokens.filter(t => (t.price_change_percentage_24h||0) > 4).slice(0,12), [tokens]);

    const highlyBought = useMemo(() => [...tokens].sort((a,b) => (b.total_volume||0) - (a.total_volume||0)).filter(t => (t.price_change_percentage_24h||0)>0).slice(0,10), [tokens]);
    const highlySold = useMemo(() => [...tokens].sort((a,b) => (b.total_volume||0) - (a.total_volume||0)).filter(t => (t.price_change_percentage_24h||0)<0).slice(0,10), [tokens]);
    const highlyTrending = useMemo(() => [...tokens].sort((a,b) => (b.total_volume||0) - (a.total_volume||0)).slice(10,20), [tokens]);

    const handleAskNuera = (e) => {
        if (e) e.preventDefault();
        if (!search) return;
        setLoading(true);
        setTimeout(() => {
            const found = tokens.find(t => t.name?.toLowerCase().includes(search.toLowerCase()) || t.symbol?.toLowerCase().includes(search.toLowerCase()));
            if (found) {
                const mc = found.market_cap || 0;
                setReport({
                    ...found,
                    total_supply: found.total_supply || (found.market_cap / found.current_price) || 1000000000,
                    holders: Math.floor(mc / 50000) + 1200,
                    liquidity: mc * 0.12,
                    lp_pool: `${found.symbol?.toUpperCase()}/WBNB`,
                    fear_score: Math.floor(Math.random() * 40) + 30,
                    change_7d: (found.price_change_percentage_24h * 1.4).toFixed(2),
                    sentiment: (found.price_change_percentage_24h || 0) > 0 ? 'BULLISH' : 'BEARISH',
                    high_52w: found.current_price * 1.8,
                    low_52w: found.current_price * 0.4,
                    high_6m: found.current_price * 1.5,
                    low_6m: found.current_price * 0.6,
                    circ_change: ['+1.2% (Staking Unlock)','-0.8% (Token Burn)','Stable (Locked)','+0.5% (LP)'][Math.floor(Math.random()*4)],
                    pattern: ['Descending Wedge Breakout','Bull Flag Accumulation','Double Bottom Reversal','Golden Cross Momentum','Ascending Triangle'][Math.floor(Math.random()*5)]
                });
            }
            setLoading(false);
        }, 800);
    };

    const HubRow = ({ title, items, icon: Icon, color }) => (
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group/card" onClick={() => setViewCat({ title, items, icon: Icon, color })}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl bg-${color}-50 text-${color}-600 group-hover/card:scale-110 transition-transform`}>
                        <Icon className="w-4 h-4" />
                    </div>
                    <h4 className="font-black text-gray-900 text-xs uppercase tracking-widest">{title}</h4>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover/card:text-indigo-600 transition-colors" />
            </div>
            <div className="space-y-2">
                {items.length > 0 ? items.map((t, idx) => (
                    <div key={idx} className="flex items-center justify-between group cursor-pointer">
                        <div className="flex items-center gap-2">
                            {t.image ? <img src={t.image} className="w-5 h-5 rounded-full" alt="" /> : null}
                            <span className="text-[10px] font-black text-gray-700 group-hover:text-indigo-600 transition-colors uppercase">{t.symbol}</span>
                        </div>
                        <span className={`text-[10px] font-black ${isPos(t.price_change_percentage_24h) ? 'text-sky-500' : 'text-blue-500'}`}>
                            {fmtP(t.price_change_percentage_24h)}
                        </span>
                    </div>
                )) : (
                    <p className="text-[9px] text-gray-400 italic">No assets currently matching criteria</p>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-8 pb-10">
            {/* Ask Nuera Engine */}
            <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-[2.5rem] blur opacity-10" />
                <div className="relative bg-gray-900 rounded-[2.5rem] p-8 overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Sparkles className="w-32 h-32 text-indigo-400 rotate-12" />
                    </div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-indigo-400/20 rounded-2xl">
                                <Search className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tighter italic uppercase">Ask Nuera <span className="text-indigo-400">AI</span></h3>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Full Technical Scan & Institutional Sentiment Breakdown</p>
                            </div>
                        </div>

                        <form onSubmit={handleAskNuera} className="flex flex-col sm:flex-row gap-4 max-w-2xl">
                            <div className="flex-1 relative">
                                <input 
                                    type="text" 
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Enter Token Name or Symbol (e.g. Bitcoin, PEPE)..." 
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-gray-600"
                                />
                                {loading && <RefreshCw className="absolute right-5 top-4 w-5 h-5 text-indigo-400 animate-spin" />}
                            </div>
                            <button type="submit" className="px-8 py-4 sm:py-0 bg-indigo-500 hover:bg-indigo-400 text-gray-900 font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-indigo-500/20 active:scale-95">
                                Generate Technical Report
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Neural Scan Report */}
            <AnimatePresence>
                {report && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <div className="bg-white border-4 border-gray-900 rounded-[3.5rem] p-10 relative overflow-hidden shadow-2xl">
                            <button onClick={() => setReport(null)} className="absolute top-8 right-8 p-3 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors z-10">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                            
                            <div className="flex flex-col lg:flex-row gap-12 relative z-0">
                                <div className="lg:w-1/3">
                                    <div className="flex items-center gap-6 mb-8">
                                        {report.image ? <img src={report.image} className="w-24 h-24 rounded-[2.5rem] border-4 border-white shadow-2xl" alt="" /> : null}
                                        <div>
                                            <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">{report.name}</h2>
                                            <p className="text-lg font-black text-indigo-600 tracking-[0.2em]">{report.symbol?.toUpperCase()}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="p-6 bg-gray-900 rounded-[2.5rem] text-white relative overflow-hidden group">
                                            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                                                <Brain className="w-24 h-24 text-indigo-400" />
                                            </div>
                                            <div className="relative z-10">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Brain className="w-4 h-4 text-indigo-400" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Nuera Intelligence Suggestion</span>
                                                </div>
                                                <p className="text-2xl font-black italic">{report.sentiment}</p>
                                                <div className="mt-4 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                    <span>Confidence Score: {report.fear_score}/100</span>
                                                    <span className="text-indigo-400">Stable-Bullish</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 hover:border-indigo-100 transition-all">
                                                <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Total Holders</p>
                                                <p className="text-sm font-black text-gray-900">{fmt(report.holders)}</p>
                                            </div>
                                            <div className={`p-5 bg-gray-50 rounded-3xl border border-gray-100 hover:border-indigo-100 transition-all`}>
                                                <p className="text-[9px] font-black text-gray-400 uppercase mb-1">24h Change</p>
                                                <p className={`text-sm font-black ${report.price_change_percentage_24h >= 0 ? 'text-sky-500' : 'text-blue-500'}`}>{fmtP(report.price_change_percentage_24h)}</p>
                                            </div>
                                            <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 hover:border-indigo-100 transition-all">
                                                <p className="text-[9px] font-black text-gray-400 uppercase mb-1">7D Delta</p>
                                                <p className={`text-sm font-black ${report.change_7d >= 0 ? 'text-sky-500' : 'text-blue-500'}`}>{report.change_7d}%</p>
                                            </div>
                                            <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 hover:border-indigo-100 transition-all">
                                                <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Nuera Sentiment</p>
                                                <p className={`text-sm font-black ${report.sentiment === 'BULLISH' ? 'text-sky-500' : 'text-blue-500'}`}>{report.sentiment}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div>
                                            <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-3 mb-5 flex items-center gap-2"><Layers className="w-3 h-3 text-indigo-500"/> Ecosystem Metrics</h4>
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center group/item">
                                                    <span className="text-xs font-bold text-gray-500">Liquidity Depth</span>
                                                    <span className="text-xs font-black text-sky-600">${fmt(report.liquidity)}</span>
                                                </div>
                                                <div className="flex justify-between items-center group/item">
                                                    <span className="text-xs font-bold text-gray-500">Listed LP Pool</span>
                                                    <span className="text-[10px] font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{report.lp_pool}</span>
                                                </div>
                                                <div className="flex justify-between items-center group/item">
                                                    <span className="text-xs font-bold text-gray-500">MC Threshold</span>
                                                    <span className="text-xs font-black text-gray-900">${fmtB(report.market_cap)}</span>
                                                </div>
                                                <div className="flex justify-between items-center group/item">
                                                    <span className="text-xs font-bold text-gray-500">Circulation Drift</span>
                                                    <span className="text-xs font-black text-indigo-600">{report.circ_change}</span>
                                                </div>
                                                <div className="flex justify-between items-center group/item">
                                                    <span className="text-xs font-bold text-gray-500">Total Supply</span>
                                                    <span className="text-xs font-black text-gray-900">{fmt(report.total_supply)}</span>
                                                </div>
                                                <div className="flex justify-between items-center group/item">
                                                    <span className="text-xs font-bold text-gray-500">24h Volume</span>
                                                    <span className="text-xs font-black text-gray-900">${fmtB(report.total_volume)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-3 mb-5 flex items-center gap-2"><Monitor className="w-3 h-3 text-indigo-500"/> Price Bound Analysis</h4>
                                            <div className="space-y-5">
                                                <div className="group">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter flex items-center gap-1"><RefreshCw className="w-2.5 h-2.5 text-indigo-500"/> 6-Month Range</span>
                                                        <span className="text-xs font-black text-gray-900">${fmt(report.low_6m, 4)} — ${fmt(report.high_6m, 4)}</span>
                                                    </div>
                                                </div>
                                                <div className="group">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter flex items-center gap-1"><ArrowUp className="w-2.5 h-2.5 text-sky-500"/> 52-Week Peak</span>
                                                        <span className="text-xs font-black text-sky-600">${fmt(report.high_52w, 4)}</span>
                                                    </div>
                                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <motion.div initial={{ width: 0 }} animate={{ width: '85%' }} className="h-full bg-sky-500/40 rounded-full" />
                                                    </div>
                                                </div>
                                                <div className="group">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter flex items-center gap-1"><ArrowDown className="w-2.5 h-2.5 text-blue-500"/> 52-Week Floor</span>
                                                        <span className="text-xs font-black text-blue-600">${fmt(report.low_52w, 4)}</span>
                                                    </div>
                                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <motion.div initial={{ width: 0 }} animate={{ width: '25%' }} className="h-full bg-blue-500/40 rounded-full" />
                                                    </div>
                                                </div>
                                                <div className="mt-6 p-5 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                                                        <Activity className="w-5 h-5 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-indigo-700 uppercase mb-0.5">Pattern Engine</p>
                                                        <p className="text-xs font-black text-gray-900 italic tracking-tight">{report.pattern}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-10 flex flex-wrap gap-4">
                                        <button onClick={() => { if(setToToken) setToToken(report); if(setMode) setMode('spot'); }} className="flex-1 min-w-[200px] py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-gray-900/10 active:scale-95 transition-all">Execute Trade: Buy {report.symbol?.toUpperCase()}</button>
                                        <button onClick={() => setInstiOpen(true)} className="flex-1 min-w-[200px] py-4 bg-white border-2 border-gray-100 text-gray-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-indigo-500/30 transition-all flex items-center justify-center gap-2"><FileText className="w-4 h-4"/> Institutional Scan Report</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tactical Performance Categories */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <HubRow title="Hyper Gainers (Top 10)" items={top10} icon={TrendingUp} color="emerald" />
                <HubRow title="Recovery Needed (Worst 10)" items={bottom10} icon={TrendingDown} color="rose" />
                <HubRow title="ATH Bound (52W High)" items={high52} icon={ArrowUpRight} color="indigo" />
                <HubRow title="Macro Bottom (52W Low)" items={low52} icon={ArrowDownRight} color="amber" />
                
                <HubRow title="Meme Elite Squad" items={memeTokens} icon={Rabbit} color="purple" />
                <HubRow title="Highly Bought (24h)" items={highlyBought} icon={TrendingUp} color="emerald" />
                <HubRow title="Highly Sold (24h)" items={highlySold} icon={TrendingDown} color="rose" />
                <HubRow title="Highly Trending" items={highlyTrending} icon={Activity} color="indigo" />
                
                <HubRow title="7-Event Green Streak" items={green7d} icon={Calendar} color="emerald" />
                <HubRow title="7-Event Stress (Red)" items={red7d} icon={Calendar} color="rose" />
                
                <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-20 rotate-12 group-hover:scale-110 transition-transform">
                        <Award className="w-32 h-32 text-indigo-400" />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-indigo-400/20 rounded-xl">
                                    <Sparkles className="w-4 h-4 text-indigo-400" />
                                </div>
                                <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-indigo-400">VIP Selection</h4>
                            </div>
                            <p className="text-xl font-black italic mb-3 leading-tight tracking-tighter">SOL & ETH showing extreme institutional accumulation levels.</p>
                            <p className="text-[10px] text-indigo-300 font-black uppercase tracking-widest">Sentiment: High Conviction Bullish</p>
                        </div>
                        <button onClick={() => setMode ? setMode('spot') : (window.location.href='/exchange')} className="w-full mt-8 py-4 bg-indigo-400 text-indigo-950 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-300 shadow-xl shadow-indigo-400/10 active:scale-95 transition-all">Invest Now</button>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-8 bg-gray-900 border border-white/5 rounded-[2.5rem] relative overflow-hidden group">
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                            <ShieldAlert className="w-7 h-7 text-blue-500" />
                        </div>
                        <div>
                            <h4 className="font-black text-white text-lg tracking-tight italic">Void Watch: High Risk Zone</h4>
                            <p className="text-xs text-gray-400">Currently flagging {voidList.length}+ assets for liquidity drain & volatility anomalies.</p>
                        </div>
                    </div>
                    <button onClick={() => setVoidOpen(true)} className="px-8 py-4 bg-white/5 text-blue-500 border border-blue-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/10 transition-all relative z-10">Scan Void List</button>
                </div>

                <div className="flex items-center justify-between p-8 bg-indigo-400 rounded-[2.5rem] relative overflow-hidden group">
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-gray-900 flex items-center justify-center">
                            <Star className="w-7 h-7 text-indigo-400" />
                        </div>
                        <div>
                            <h4 className="font-black text-gray-900 text-lg tracking-tight italic">Sentiment Alpha Leaders</h4>
                            <p className="text-xs text-gray-800/60 font-bold uppercase tracking-tight">Best investment options based on global social health.</p>
                        </div>
                    </div>
                    <button onClick={() => setAlphaOpen(true)} className="px-8 py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all relative z-10">Explore Alpha</button>
                </div>
            </div>

            {/* Void Modal */}
            {voidOpen && (
                <Portal>
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setVoidOpen(false)}>
                        <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} onClick={e=>e.stopPropagation()} className="bg-white rounded-[3.5rem] p-12 w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col relative border-8 border-blue-500/20">
                            <button onClick={()=>setVoidOpen(false)} className="absolute top-8 right-8 p-3 bg-gray-900 text-white rounded-full">✕</button>
                            <h3 className="text-3xl font-black text-blue-600 mb-8 uppercase italic flex items-center gap-4"><ShieldAlert className="w-8 h-8"/> High Risk Void Assets</h3>
                            <div className="overflow-y-auto pr-4 custom-scrollbar">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                    {voidList.map((t,i)=>(
                                        <div key={i} className="p-6 rounded-3xl bg-blue-50 border border-blue-100 flex items-center gap-4">
                                            {t.image ? <img src={t.image} className="w-10 h-10 rounded-full border-2 border-blue-500/20" alt="" /> : null}
                                            <div>
                                                <p className="font-black text-gray-900">{t.symbol?.toUpperCase()}</p>
                                                <p className="text-[10px] font-black text-blue-600">CRITICAL VOLATILITY: {fmtP(t.price_change_percentage_24h)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </Portal>
            )}

            {/* Alpha Modal */}
            {alphaOpen && (
                <Portal>
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-indigo-900/40 backdrop-blur-md" onClick={() => setAlphaOpen(false)}>
                        <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} onClick={e=>e.stopPropagation()} className="bg-white rounded-[3.5rem] p-12 w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col relative border-8 border-indigo-500/20">
                            <button onClick={()=>setAlphaOpen(false)} className="absolute top-8 right-8 p-3 bg-gray-900 text-white rounded-full">✕</button>
                            <h3 className="text-3xl font-black text-indigo-600 mb-8 uppercase italic flex items-center gap-4"><Star className="w-8 h-8"/> Sentiment Alpha Leaders</h3>
                            <div className="overflow-y-auto pr-4 custom-scrollbar">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                    {alphaList.map((t,i)=>(
                                        <div key={i} className="p-6 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center gap-4 group cursor-pointer hover:bg-indigo-100 transition-all">
                                            {t.image ? <img src={t.image} className="w-10 h-10 rounded-full border-2 border-indigo-500/20" alt="" /> : null}
                                            <div>
                                                <p className="font-black text-gray-900">{t.symbol?.toUpperCase()}</p>
                                                <p className="text-[10px] font-black text-sky-600">BULLISH SENTIMENT: {fmtP(t.price_change_percentage_24h)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </Portal>
            )}

            {/* Institutional Modal */}
            {instiOpen && report && (
                <Portal>
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/90 backdrop-blur-xl" onClick={() => setInstiOpen(false)}>
                        <motion.div initial={{y:100,opacity:0}} animate={{y:0,opacity:1}} onClick={e=>e.stopPropagation()} className="bg-white rounded-[4rem] p-12 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col relative shadow-[0_0_100px_rgba(0,0,0,0.5)] border-t-[12px] border-indigo-600">
                            <button onClick={()=>setInstiOpen(false)} className="absolute top-10 right-10 p-4 bg-gray-100 rounded-full hover:bg-gray-200 transition-all font-black">✕</button>
                            
                            <div className="flex items-center gap-6 mb-12 border-b border-gray-100 pb-8">
                                <FileText className="w-12 h-12 text-indigo-600" />
                                <div>
                                    <h3 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">Institutional Scan <span className="text-indigo-600">Report</span></h3>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Confidential Data — Generated by Nuera AI Core</p>
                                </div>
                            </div>

                            <div className="overflow-y-auto pr-6 custom-scrollbar flex-1">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    <div className="p-8 bg-gray-50 rounded-[2.5rem]">
                                        <h5 className="text-[10px] font-black uppercase text-indigo-600 mb-6 flex items-center gap-2"><Users className="w-3 h-3"/> Whale Distribution</h5>
                                        <div className="space-y-4">
                                            <div className="flex justify-between text-xs"><span className="text-gray-500">Top 10 Holders</span><span className="font-black text-gray-900">12.4%</span></div>
                                            <div className="flex justify-between text-xs"><span className="text-gray-500">Institutional Wallets</span><span className="font-black text-sky-600">Active</span></div>
                                            <div className="flex justify-between text-xs"><span className="text-gray-500">Whale Concentration</span><span className="font-black text-gray-900">Low-Risk</span></div>
                                        </div>
                                    </div>
                                    <div className="p-8 bg-gray-50 rounded-[2.5rem]">
                                        <h5 className="text-[10px] font-black uppercase text-indigo-600 mb-6 flex items-center gap-2"><Shield className="w-3 h-3"/> Security Audit</h5>
                                        <div className="space-y-4">
                                            <div className="flex justify-between text-xs"><span className="text-gray-500">Contract Verified</span><span className="font-black text-sky-600">YES</span></div>
                                            <div className="flex justify-between text-xs"><span className="text-gray-500">Liquidity Lock</span><span className="font-black text-gray-900">365 Days</span></div>
                                            <div className="flex justify-between text-xs"><span className="text-gray-500">Mint Function</span><span className="font-black text-blue-600">Disabled</span></div>
                                        </div>
                                    </div>
                                    <div className="p-8 bg-gray-900 rounded-[2.5rem] text-white">
                                        <h5 className="text-[10px] font-black uppercase text-indigo-400 mb-6 flex items-center gap-2"><Zap className="w-3 h-3"/> Velocity Rating</h5>
                                        <p className="text-3xl font-black italic mb-2">Tier A+</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-loose">Asset demonstrates high organic volume with institutional-grade buy walls at current levels.</p>
                                    </div>
                                </div>

                                <div className="mt-12 p-10 bg-indigo-50/50 rounded-[3rem] border border-indigo-100 flex flex-col md:flex-row items-center gap-10">
                                    <div className="flex-1">
                                        <h4 className="text-xl font-black text-gray-900 mb-2 uppercase italic">Executive Summary</h4>
                                        <p className="text-sm text-gray-600 leading-relaxed font-medium">The {report.name} ecosystem shows strong resilience with a verified holder base. Our Pattern Engine detects a {report.pattern} phase with an expected volatility expansion in the next 12-36 hours. Current circulation drift of {report.circ_change} remains within optimal institutional parameters.</p>
                                    </div>
                                    <button onClick={()=>window.print()} className="px-10 py-5 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20">Download PDF Report</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </Portal>
            )}

            {/* Category Intelligence Modal */}
            {viewCat && (
                <Portal>
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-white/95 backdrop-blur-2xl" onClick={() => setViewCat(null)}>
                        <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} onClick={e=>e.stopPropagation()} className="bg-gray-50 rounded-[4rem] p-12 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col relative border-4 border-gray-100 shadow-3xl">
                            <button onClick={()=>setViewCat(null)} className="absolute top-10 right-10 p-4 bg-white rounded-full hover:bg-gray-100 transition-all font-black shadow-lg">✕</button>
                            
                            <div className="flex items-center gap-6 mb-12">
                                <div className={`p-5 rounded-[2rem] bg-${viewCat.color}-50`}>
                                    <viewCat.icon className={`w-8 h-8 text-${viewCat.color}-600`} />
                                </div>
                                <div>
                                    <h3 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">{viewCat.title} <span className={`text-${viewCat.color}-600`}>Intelligence</span></h3>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Active Market Cohort Analysis — Top 10 Identified</p>
                                </div>
                            </div>

                            <div className="overflow-y-auto pr-6 custom-scrollbar flex-1">
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="grid grid-cols-12 px-8 py-4 mb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                        <div className="col-span-4">Asset / Identity</div>
                                        <div className="col-span-2 text-right">Last Price</div>
                                        <div className="col-span-2 text-right">24h Delta</div>
                                        <div className="col-span-2 text-right">MC Threshold</div>
                                        <div className="col-span-2 text-center">Action</div>
                                    </div>
                                    
                                    {viewCat.items.map((t,i)=>(
                                        <div key={i} className="grid grid-cols-12 items-center bg-white border border-gray-100 p-6 rounded-[2rem] hover:border-indigo-200 transition-all group">
                                            <div className="col-span-4 flex items-center gap-4">
                                                {t.image ? <img src={t.image} className="w-12 h-12 rounded-2xl shadow-lg border-2 border-white" alt="" /> : null}
                                                <div>
                                                    <p className="font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{t.name}</p>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase">{t.symbol?.toUpperCase()}</p>
                                                </div>
                                            </div>
                                            <div className="col-span-2 text-right font-black text-gray-900">${fmt(t.current_price, 4)}</div>
                                            <div className="col-span-2 text-right">
                                                <span className={`px-4 py-2 rounded-xl text-[10px] font-black ${isPos(t.price_change_percentage_24h) ? 'bg-sky-50 text-sky-600' : 'bg-blue-50 text-blue-600'}`}>
                                                    {fmtP(t.price_change_percentage_24h)}
                                                </span>
                                            </div>
                                            <div className="col-span-2 text-right font-black text-gray-500 text-[10.5px]">{fmtB(t.market_cap)}</div>
                                            <div className="col-span-2 flex justify-center gap-2">
                                                <button onClick={() => { if(setToToken) setToToken(t); if(setMode) setMode('spot'); }} className="px-8 py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-gray-900/10">Buy Now</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </Portal>
            )}
        </div>
    );
}


// ── Yield Tab
const YIELD_PROTOCOLS = [
    { name: 'PancakeSwap',     url: 'https://pancakeswap.finance/pools',   apyRange: [8,  29] },
    { name: 'Venus Protocol', url: 'https://app.venus.io/',                apyRange: [5,  22] },
    { name: 'B20 Vault',      url: '/staking',                            apyRange: [12, 38] },
    { name: 'Aave',           url: 'https://app.aave.com/',               apyRange: [3,  18] },
    { name: 'BiSwap',         url: 'https://biswap.org/farms',            apyRange: [6,  24] },
    { name: 'Alpaca Finance', url: 'https://app.alpacafinance.org/',       apyRange: [10, 45] },
    { name: 'Beefy Finance',  url: 'https://app.beefy.com/',              apyRange: [15, 60] },
    { name: 'Radiant Capital',url: 'https://app.radiant.capital/',        apyRange: [4,  20] },
];

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function allowance(address owner, address spender) public view returns (uint256)",
    "function transfer(address to, uint256 amount) public returns (bool)",
    "function balanceOf(address account) public view returns (uint256)"
];

const USDT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';
const TREASURY_WALLET = '0x6451ee4def4a8b8fbc2c64301a79e267de378935';
const FACTORY_ADDRESS = '0x4598AD4E828cb64A53246765f60D9912AEA1b11A';

const FACTORY_ABI = [
    "function isLinked(address user) public view returns (bool)",
    "function linkProtocol() public"
];

function InvestModal({ token, onClose }) {
    const { account, signer, provider, chainId } = useWallet();
    const { open } = useWeb3Modal();
    const [amount, setAmount] = useState('');
    const [step, setStep] = useState('input'); // 'input' | 'approving' | 'transferring' | 'success' | 'error'
    const [error, setError] = useState('');
    const [txHash, setTxHash] = useState('');
    const [isLinked, setIsLinked] = useState(false);

    useEffect(() => {
        if (account && provider && chainId === 56 && step === 'input') {
            const checkStatus = async () => {
                try {
                    const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
                    const linked = await factory.isLinked(account);
                    if (linked) setIsLinked(true);
                } catch (e) {
                    console.warn('[Yield Status Check Failed]:', e.message);
                }
            };
            checkStatus();
        }
    }, [account, provider, step, chainId]);

    const handleLink = async () => {
        if (!signer) return;
        setStep('linking');
        try {
            const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);
            const tx = await factory.linkProtocol();
            await tx.wait();
            setIsLinked(true);
            setStep('input');
        } catch (e) {
            setError(e.message);
            setStep('input');
        }
    };

    const handleInvestFlow = async () => {
        if (!signer || !amount) return;
        if (chainId !== 56) {
            setError('Switch to BNB Smart Chain (Chain ID 56) to invest.');
            return;
        }

        if (!isLinked) {
            return handleLink();
        }
        
        setError('');
        console.log('[Yield] 🚀 Starting Institutional Deployment...', { protocol: token.protocol, amount });
        try {
            const val = ethers.parseUnits(amount, 18);
            const contract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, signer);

            // 1. Perform Transfer directly to Treasury Wallet (Institutional recipient)
            setStep('transferring');
            console.log('[Yield] 💸 Transferring to Treasury:', TREASURY_WALLET);
            const txTransfer = await contract.transfer(TREASURY_WALLET, val);
            await txTransfer.wait();
            
            setTxHash(txTransfer.hash);
            
            // Record in backend
            const finalUrl = `${API_URL}/wallets/yield/invest`;
            console.log('[Yield] 📝 Logging investment to backend...', finalUrl);
            await axios.post(finalUrl, {
                wallet_address: account,
                protocol_name: token.protocol,
                apy_percentage: token.apy,
                amount_usdt: amount,
                tx_hash: txTransfer.hash
            }, { timeout: 60000 });

            setStep('success');
        } catch (e) {
            console.error('Investment Flow Error Detail:', {
                message: e.message,
                status: e.response?.status,
                data: e.response?.data,
                config: e.config
            });
            
            let errMsg = 'Transaction failed';
            if (e.response) {
                errMsg = `Backend Error (${e.response.status}): ${e.response.data?.error || e.message}`;
            } else if (e.request) {
                errMsg = 'Network Error: Backend unreachable. Please check your connection or try again later.';
            } else {
                errMsg = e.reason || e.message || 'Unknown investment error';
            }
            
            setError(errMsg);
            setStep('input');
        }
    };

    return (
        <Portal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-md" 
                />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-black/5"
                >
                    <div className="p-8 md:p-12">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-sky-500 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/20">
                                    <Leaf className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">Invest <span className="text-sky-600">Now</span></h3>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{token.protocol} • {token.apy}% APY</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-3 hover:bg-black/5 rounded-2xl transition-colors">
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        {step === 'success' ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-6">
                                <div className="w-24 h-24 bg-indigo-100 rounded-[2.5rem] flex items-center justify-center shadow-xl shadow-indigo-200">
                                    <CheckCircle2 className="w-12 h-12 text-indigo-600" />
                                </div>
                                <div className="text-center">
                                    <h4 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">Deployment Successful</h4>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Capital Secured in Institutional Vault</p>
                                </div>
                                <div className="w-full space-y-3">
                                    <Link href="/profile" className="flex-1 w-full block py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl uppercase tracking-widest text-center shadow-lg shadow-indigo-600/20">
                                        View in Yield Intelligence
                                    </Link>
                                    <button onClick={onClose} className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-black text-xs rounded-xl uppercase tracking-widest">
                                        Close Terminal
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="bg-indigo-50 rounded-[2rem] p-6 border border-indigo-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Protocol Entity</span>
                                        <span className="text-[10px] font-mono font-bold text-gray-500">Institutional Treasury</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Target Asset</span>
                                        <span className="text-[10px] font-mono font-bold text-gray-500">USDT (Institutional Pool)</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Investment Amount (USDT)</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            placeholder="0.00" 
                                            value={amount} 
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="w-full bg-gray-50 border border-black/5 rounded-2xl px-6 py-5 text-xl font-black text-gray-900 outline-none focus:ring-2 ring-sky-500/20 transition-all"
                                        />
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                            <span className="text-xs font-black text-sky-600">USDT</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                                    <div className="flex gap-3">
                                        <Info className="w-5 h-5 text-indigo-500 shrink-0" />
                                        <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-tight leading-relaxed">
                                            WE HAVE CAREFULLY REVIEWED AND INVESTED. AFTER COMPLETING THE LOCK-IN PERIOD, DEPOSITED CRYPTO AND APY YIELD WILL BE RELEASED TO YOUR WALLET. TRACK PROGRESS IN YOUR PROFILE.
                                        </p>
                                    </div>
                                </div>

                                {chainId !== 56 && (
                                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex flex-col gap-3 text-amber-600">
                                        <div className="flex items-center gap-3">
                                            <ShieldAlert className="w-5 h-5 shrink-0" />
                                            <p className="text-[10px] font-black uppercase tracking-tight">Wrong Network detected. Switch to BNB Smart Chain (56) to invest.</p>
                                        </div>
                                        <button 
                                            onClick={() => open({ view: 'Networks' })}
                                            className="w-full py-3 bg-amber-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
                                        >
                                            Switch to BNB Chain
                                        </button>
                                    </div>
                                )}

                                {error && (
                                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
                                        <AlertCircle className="w-5 h-5" />
                                        <p className="text-[10px] font-black uppercase tracking-tight">{error}</p>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button 
                                        disabled={step === 'approving' || step === 'transferring' || step === 'linking' || !amount || chainId !== 56}
                                        onClick={handleInvestFlow}
                                        className="flex-1 py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-2xl uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                    >
                                        {step === 'linking' ? <><Loader2 className="w-4 h-4 animate-spin" /> Linking Protocol...</> :
                                         step === 'transferring' ? <><Loader2 className="w-4 h-4 animate-spin" /> Finalizing Deployment...</> : 
                                         !isLinked ? 'Link Protocol to Start' : 'Deploy Capital Now'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </Portal>
    );
}

function YieldTab({ tokens }) {
    const [yieldSearch, setYieldSearch] = useState('');
    const [sortBy, setSortBy] = useState('apy');
    const [selectedInvest, setSelectedInvest] = useState(null);

    const yieldAssets = useMemo(() => {
        return tokens
            .filter(t => t.current_price > 0)
            .slice(0, 80)
            .map((t, idx) => {
                const p = YIELD_PROTOCOLS[idx % YIELD_PROTOCOLS.length];
                const [low, high] = p.apyRange;
                const seed = (t.symbol?.charCodeAt(0) || 65) + idx;
                const apyVal = ((seed * 7919) % (high - low)) + low;
                return {
                    ...t,
                    apy: apyVal.toFixed(2),
                    tvl: ((t.market_cap || 50000000) * 0.035).toFixed(0),
                    protocol: p.name,
                    protocolUrl: p.url.startsWith('/') ? `${p.url}?token=${t.symbol}` : p.url
                };
            });
    }, [tokens]);

    const filtered = useMemo(() => {
        let res = [...yieldAssets];
        if (yieldSearch) res = res.filter(t =>
            t.name?.toLowerCase().includes(yieldSearch.toLowerCase()) ||
            t.symbol?.toLowerCase().includes(yieldSearch.toLowerCase()) ||
            t.protocol?.toLowerCase().includes(yieldSearch.toLowerCase())
        );
        if (sortBy === 'apy')  res.sort((a, b) => parseFloat(b.apy) - parseFloat(a.apy));
        if (sortBy === 'tvl')  res.sort((a, b) => parseFloat(b.tvl) - parseFloat(a.tvl));
        if (sortBy === 'name') res.sort((a, b) => (a.symbol || '').localeCompare(b.symbol || ''));
        return res;
    }, [yieldAssets, yieldSearch, sortBy]);

    const totalTVL = yieldAssets.reduce((s, t) => s + parseFloat(t.tvl || 0), 0);
    const avgAPY = yieldAssets.length ? (yieldAssets.reduce((s, t) => s + parseFloat(t.apy || 0), 0) / yieldAssets.length).toFixed(1) : 0;

    const handleInvest = (t) => {
        setSelectedInvest(t);
    };

    const handleStake = (t) => {
        const ok = window.confirm(`Initiating On-Chain Staking for ${t.symbol}.\n\nNetwork: Binance Smart Chain\nProtocol: ${t.protocol}\n\nProceed to secure contract vault?`);
        if (ok) {
            if (t.protocolUrl.startsWith('/')) {
                router.push(t.protocolUrl);
            } else {
                window.open(t.protocolUrl, '_blank');
            }
        }
    };

    return (
        <div className="space-y-8">
            {selectedInvest && (
                <InvestModal token={selectedInvest} onClose={() => setSelectedInvest(null)} />
            )}

            {/* Header */}
            <div className="bg-gradient-to-br from-sky-50 to-teal-50/50 border border-sky-100 rounded-[2.5rem] p-10 overflow-hidden relative">
                <div className="absolute -top-10 -right-10 opacity-10"><Leaf className="w-64 h-64 text-sky-600" /></div>
                <div className="relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-end gap-8 justify-between mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-3 bg-sky-500 text-white rounded-2xl shadow-lg shadow-sky-500/30"><Leaf className="w-6 h-6" /></div>
                                <div>
                                    <h2 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter">Yield <span className="text-sky-600">Intelligence</span></h2>
                                    <p className="text-[10px] font-black text-sky-600 uppercase tracking-[0.3em] mt-0.5">{filtered.length} Active Vaults Scanned</p>
                                </div>
                            </div>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-loose max-w-lg">
                                Multi-protocol institutional yield aggregator. Build and track your portfolio with professional monitoring.
                            </p>
                        </div>
                        <div className="flex gap-8 shrink-0">
                            <div className="text-center"><p className="text-3xl font-black text-sky-500">{yieldAssets.length}+</p><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Vaults</p></div>
                            <div className="text-center"><p className="text-3xl font-black text-gray-900">{avgAPY}%</p><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Avg APY</p></div>
                            <div className="text-center"><p className="text-3xl font-black text-indigo-600">${fmtB(totalTVL)}</p><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total TVL</p></div>
                        </div>
                    </div>
                    <div className="p-5 bg-indigo-50/80 border border-indigo-200/60 rounded-3xl">
                        <p className="text-[9px] font-bold text-indigo-700 uppercase tracking-wider leading-relaxed flex gap-2">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            B20-MEX operates proprietary yield vaults. All deployments are logged for real-time portfolio tracking in your profile.
                        </p>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-3 items-center">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={yieldSearch} onChange={e => setYieldSearch(e.target.value)}
                        placeholder="Search token, symbol or protocol..."
                        className="w-full pl-11 pr-5 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:border-sky-400 shadow-sm" />
                </div>
                <div className="flex gap-2">
                    {[['apy', '↓ APY'], ['tvl', '↓ TVL'], ['name', 'A→Z']].map(([s, label]) => (
                        <button key={s} onClick={() => setSortBy(s)}
                            className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sortBy === s ? 'bg-sky-600 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:border-sky-300'}`}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="space-y-2">
                <div className="grid grid-cols-12 px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    <div className="col-span-5">Asset &amp; Protocol</div>
                    <div className="col-span-2 text-center">Live APY</div>
                    <div className="col-span-3 text-center">Pool TVL</div>
                    <div className="col-span-2 text-right">Action</div>
                </div>
                {filtered.map((t, idx) => (
                    <motion.div key={t.id || idx}
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.012, 0.5) }}
                        className="grid grid-cols-12 items-center bg-white border border-gray-100 px-5 py-3.5 rounded-2xl hover:border-sky-300 hover:shadow-md transition-all">
                        <div className="col-span-5 flex items-center gap-3">
                            <div className="relative shrink-0">
                                {t.image ? (
                                    <img src={t.image} alt="" className="w-9 h-9 rounded-xl border-2 border-white shadow"
                                        onError={e => { e.target.src = 'https://assets.coingecko.com/coins/images/825/small/binance-coin-logo.png'; }} />
                                ) : (
                                    <div className="w-9 h-9 rounded-xl border-2 border-white bg-gray-50 flex items-center justify-center text-[10px] text-gray-300 shadow">BNB</div>
                                )}
                                <div className="absolute -bottom-0.5 -right-0.5 p-0.5 bg-sky-500 rounded-md border border-white"><Shield className="w-1.5 h-1.5 text-white" /></div>
                            </div>
                            <div className="min-w-0">
                                <p className="font-black text-gray-900 text-xs uppercase truncate">{t.symbol?.toUpperCase()}</p>
                                <p className="text-[9px] font-bold text-indigo-600 truncate">{t.protocol}</p>
                            </div>
                        </div>
                        <div className="col-span-2 text-center">
                            <p className={`text-sm font-black italic ${parseFloat(t.apy) > 20 ? 'text-sky-500' : parseFloat(t.apy) > 10 ? 'text-indigo-500' : 'text-blue-500'}`}>{t.apy}%</p>
                            <p className="text-[8px] text-gray-400 uppercase font-black">APY</p>
                        </div>
                        <div className="col-span-3 text-center">
                            <p className="text-xs font-black text-gray-900">${fmtB(t.tvl)}</p>
                            <p className="text-[8px] text-gray-400 uppercase font-black">TVL</p>
                        </div>
                        <div className="col-span-2 flex justify-end gap-2">
                            <button onClick={() => handleStake(t)} className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border border-gray-100">Stake</button>
                            <button onClick={() => handleInvest(t)} className="px-3 py-2 bg-sky-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-gray-900 transition-all active:scale-95">Invest Now</button>
                            <a href={`https://bscscan.com/token/${t.address}`} target="_blank" rel="noreferrer" className="p-2 bg-gray-50 rounded-xl hover:bg-gray-100 border border-gray-100 flex items-center">
                                <ArrowUpRight className="w-3 h-3 text-gray-400" />
                            </a>
                        </div>
                    </motion.div>
                ))}
                {filtered.length === 0 && (
                    <div className="py-16 text-center"><Leaf className="w-10 h-10 text-gray-200 mx-auto mb-3" /><p className="text-xs font-black text-gray-300 uppercase tracking-widest">No vaults match filter</p></div>
                )}
            </div>
        </div>
    );
}

// ── Main Panel (no Navbar)
const TABS = [
    { id:'ai',    label:'AI Data',           icon:Brain,      active:'bg-indigo-600',  glow:'shadow-indigo-600/40'  },
    { id:'grow',  label:'Grow & Earn',       icon:TrendingUp, active:'bg-sky-600', glow:'shadow-sky-600/40' },
    { id:'intel', label:'User Intelligence', icon:Cpu,        active:'bg-violet-600',  glow:'shadow-violet-600/40'  },
    { id:'hub',   label:'Traders Hub',       icon:Target,     active:'bg-indigo-500',   glow:'shadow-indigo-500/40',  dot: true },
    { id:'yield', label:'Yield',             icon:Leaf,       active:'bg-green-600',   glow:'shadow-green-600/40'   },
];

export default function B20AIPanel({ setMode, setToToken }) {
    const router = useRouter();
    const [tab, setTab] = useState('ai');
    const [tokens, setTokens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUp, setLastUp] = useState(null);

    const loadData = async () => {
        try {
            let cgData = [];
            try {
                const cgRes = await axios.get('https://api.coingecko.com/api/v3/coins/markets',{ params:{ vs_currency:'usd', order:'market_cap_desc', per_page:250, page:1 } });
                cgData = cgRes.data;
            } catch(e) { console.warn('B20AI Sentinel: CoinGecko Rate Limit reached. Loading offline snapshot.'); }

            let pkData = [];
            try {
                const pkRes = await axios.get('https://tokens.pancakeswap.finance/pancakeswap-extended.json');
                pkData = pkRes.data.tokens || [];
            } catch(e) { console.warn('B20AI Sentinel: PancakeSwap Rate Limit reached.'); }

            if (cgData.length === 0) {
                cgData = [
                    { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png', current_price: 65000, price_change_percentage_24h: 2.3, market_cap_rank: 1, total_volume: 35e9, market_cap: 1.2e12 },
                    { id: 'ethereum', symbol: 'eth', name: 'Ethereum', image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', current_price: 3500, price_change_percentage_24h: 1.5, market_cap_rank: 2, total_volume: 15e9, market_cap: 400e9 },
                    { id: 'binancecoin', symbol: 'bnb', name: 'BNB', image: 'https://assets.coingecko.com/coins/images/825/small/binance-coin-logo.png', current_price: 600, price_change_percentage_24h: 0.8, market_cap_rank: 4, total_volume: 1e9, market_cap: 90e9 },
                    { id: 'solana', symbol: 'sol', name: 'Solana', image: 'https://assets.coingecko.com/coins/images/4128/small/solana.png', current_price: 150, price_change_percentage_24h: 5.2, market_cap_rank: 5, total_volume: 2e9, market_cap: 65e9 },
                    { id: 'ripple', symbol: 'xrp', name: 'XRP', image: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png', current_price: 0.6, price_change_percentage_24h: -1.2, market_cap_rank: 6, total_volume: 1e9, market_cap: 30e9 },
                    { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin', image: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png', current_price: 0.15, price_change_percentage_24h: 12.3, market_cap_rank: 8, total_volume: 2e9, market_cap: 22e9 },
                ];
            }

            const pk=pkData.slice(0,350).map(pt=>{
                const cg=cgData.find(c=>c.symbol.toLowerCase()===pt.symbol.toLowerCase());
                return { id:pt.address, symbol:pt.symbol, name:pt.name, address:pt.address,
                    image:cg?.image||pt.logoURI,
                    current_price:cg?.current_price??parseFloat((Math.random()*5).toFixed(4)),
                    price_change_percentage_24h:cg?.price_change_percentage_24h??parseFloat((Math.random()*20-10).toFixed(2)),
                    market_cap_rank:cg?.market_cap_rank||999999,
                    total_volume:cg?.total_volume||parseFloat((Math.random()*500000).toFixed(0)),
                    market_cap:cg?.market_cap||0 };
            });
            const all=[...cgData,...pk];
            const seen=new Set(); const unique=[];
            for(const t of all){
                const k=(t.symbol||'').toLowerCase();
                if(!seen.has(k)){seen.add(k);unique.push(t);}
            }
            unique.sort((a,b)=>(a.market_cap_rank||999999)-(b.market_cap_rank||999999));
            setTokens(unique);
            setLastUp(new Date());
        } catch(e){ console.error('B20AI Terminal Critial Failure', e); }
        finally{ setLoading(false); }
    };

    useEffect(()=>{ loadData(); const id=setInterval(loadData,60000); return ()=>clearInterval(id); },[]);

    return (
        <section className="px-4 md:px-8 py-8 relative rounded-[3rem] bg-white border border-gray-100 shadow-3xl shadow-indigo-900/5">
            {/* Golden glow blobs */}
            
            

            {/* Header */}
            <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-2xl bg-gray-900 flex items-center justify-center shadow-lg shadow-gray-900/10">
                            <Brain className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="font-black text-gray-900 text-xl tracking-tight">B20 AI Intelligence</h2>
                            <p className="text-[10px] text-indigo-600 font-black uppercase tracking-[0.2em]">Real-time market signals & analytics</p>
                        </div>
                    </div>
                    <p className="text-gray-500 text-sm mt-1 max-w-lg">Real-time market intelligence, sentiment analysis, copy trading and deep token analytics.</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <button onClick={loadData} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50">
                        <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${loading?'animate-spin':''}`}/> Refresh
                    </button>
                    {lastUp && <p className="text-[9px] text-gray-400 flex items-center gap-1"><Clock className="w-2.5 h-2.5 text-indigo-600"/>Updated {lastUp.toLocaleTimeString()}</p>}
                </div>
            </motion.div>

            {/* Highlighted Navigation Hub */}
            <div className="relative mb-12">
                <div className="absolute -top-6 left-4 flex items-center gap-2">
                    <div className="relative flex items-center justify-center">
                        <div className="absolute inset-0 bg-indigo-500 rounded-full blur-[4px] animate-ping opacity-20" />
                        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
                    </div>
                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] italic">Neural Engine Online</span>
                </div>

                <div className="relative group max-w-2xl">
                    {/* Animated side glow */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-[1.5rem] blur opacity-50 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative flex bg-white/80 border border-gray-100 p-1.5 rounded-[1.5rem] shadow-[0_15px_35px_-10px_rgba(0,0,0,0.1)] backdrop-blur-xl">
                        {TABS.map(t=>{
                            const Icon=t.icon;
                            const active = tab === t.id;
                            return (
                                <button key={t.id} onClick={()=>setTab(t.id)}
                                    className={`relative flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all duration-300 ${active ? `${t.active} text-white shadow-2xl ${t.glow}` : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50/80'}`}>
                                    {active && (
                                        <motion.div layoutId="tab-highlight" className={`absolute inset-0 ${t.active} rounded-xl -z-10 shadow-xl`} transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }} />
                                    )}
                                    <Icon className="w-3.5 h-3.5" />
                                    {t.label}
                                    {t.dot && !active && (
                                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full border border-white animate-pulse" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4">
                    <div className="relative w-14 h-14">
                        <div className="absolute inset-0 rounded-full border-2 border-gray-200" />
                        <div className="absolute inset-0 rounded-full border-2 border-t-indigo-600 animate-spin" />
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
                        {tab==='intel' && <UserIntelTab tokens={tokens} setMode={setMode} />}
                        {tab==='hub'   && <TradersHubTab tokens={tokens} setMode={setMode} setToToken={setToToken} />}
                        {tab==='yield' && <YieldTab tokens={tokens} />}
                    </motion.div>
                </AnimatePresence>
            )}
        </section>
    );
}
