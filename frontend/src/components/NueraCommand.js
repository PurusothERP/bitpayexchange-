'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Zap, ArrowRight, MessageSquare, Shield, BarChart3, TrendingUp, Send, Loader2, User, Cpu, Sparkles, Lock, Brain } from 'lucide-react';


export default function NueraCommand({ onCommand }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Institutional surveillance active. How can I assist your terminal operations today?', timestamp: new Date() }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen, isTyping]);

    const sanitizeInput = (text) => {
        // Regex to detect potential private keys (0x followed by ~64 hex chars)
        const pkRegex = /0x[a-fA-F0-9]{40,64}/g;
        // Simple regex for emails
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        // Common seed phrase indicator (multiple words in a row) - very basic check
        const words = text.split(' ');
        
        let sanitized = text;
        let sensitiveDetected = false;

        if (pkRegex.test(text)) {
            sanitized = sanitized.replace(pkRegex, '[REDACTED_SENSITIVE_ID]');
            sensitiveDetected = true;
        }
        if (emailRegex.test(text)) {
            sanitized = sanitized.replace(emailRegex, '[REDACTED_PII]');
            sensitiveDetected = true;
        }

        return { sanitized, sensitiveDetected };
    };

    const handleSendMessage = async (e) => {
        e?.preventDefault();
        if (!input.trim() || isTyping) return;

        const { sanitized, sensitiveDetected } = sanitizeInput(input);
        
        const userMsg = { role: 'user', content: sanitized, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        // Simulate AI Thinking
        setTimeout(() => {
            let response = '';
            
            if (sensitiveDetected) {
                response = "Security Protocol Alert: I've detected and redacted sensitive information (PII or Private Keys) from your request to maintain institutional security. Please avoid sharing credentials in this channel.";
            } else {
                const lowerInput = sanitized.toLowerCase();
                if (lowerInput.includes('markets') || lowerInput.includes('tokens')) {
                    response = "Scanning live markets. The 'Super 7' index is currently showing high volatility. Would you like me to filter for top gainers?";
                } else if (lowerInput.includes('buy') || lowerInput.includes('swap')) {
                    response = "You can execute swaps in the 'Spot' or 'Web3 Portal' sections. Always verify the slippage tolerance before confirming high-value transactions.";
                } else if (lowerInput.includes('risk')) {
                    response = "Neural risk assessment indicates stable conditions for top-tier assets, but high-momentum 'Meme' tokens are showing overextended RSI levels.";
                } else {
                    response = "I understand. I am constantly monitoring the B20 ecosystem and external liquidity pools to provide you with the most accurate alpha. Is there a specific asset or metric you'd like me to analyze?";
                }
            }

            setMessages(prev => [...prev, { role: 'assistant', content: response, timestamp: new Date() }]);
            setIsTyping(false);
        }, 1500);
    };

    const handleVoiceToggle = () => {
        setIsListening(!isListening);
        if (!isListening) {
            // Mock Voice Transcription
            setTimeout(() => {
                const mockCommands = [
                    "Show me the highest momentum tokens",
                    "What is the current risk level for Bitcoin?",
                    "Analyze recent liquidity flows"
                ];
                const pick = mockCommands[Math.floor(Math.random() * mockCommands.length)];
                setInput(pick);
                setIsListening(false);
            }, 2500);
        }
    };

    return (
        <div className="fixed bottom-6 left-6 z-[2000]">
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20, x: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20, x: -20 }}
                        className="absolute bottom-20 left-0 w-[350px] sm:w-[400px] max-w-[calc(100vw-48px)] bg-white border border-slate-200 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col h-[500px] sm:h-[600px]"
                    >
                        {/* Header */}
                        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 animate-pulse">
                                    <Brain size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-widest">Nuera Intelligence</h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Node-01 Synced</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30">
                            {messages.map((msg, idx) => (
                                <motion.div 
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[85%] flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                                            {msg.role === 'user' ? <User size={14} className="text-white" /> : <Cpu size={14} className="text-slate-600" />}
                                        </div>
                                        <div className={`p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${
                                            msg.role === 'user' 
                                            ? 'bg-indigo-600 text-white rounded-tr-none' 
                                            : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                                        }`}>
                                            {msg.content}
                                            <p className={`text-[8px] mt-2 opacity-50 ${msg.role === 'user' ? 'text-white' : 'text-slate-400'}`}>
                                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-6 bg-white border-t border-slate-100">
                            <form onSubmit={handleSendMessage} className="flex flex-col gap-4">
                                <div className="relative">
                                    <input 
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder={isListening ? "Listening..." : "Ask Nuera anything..."}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-6 pr-14 text-sm font-medium outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-400"
                                    />
                                    <button 
                                        type="button"
                                        onClick={handleVoiceToggle}
                                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                                    >
                                        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                                    </button>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        <Lock size={12} className="text-emerald-500" /> Secure Terminal
                                    </div>
                                    <button 
                                        type="submit"
                                        disabled={!input.trim() || isTyping}
                                        className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-600 transition-all disabled:opacity-50 shadow-lg shadow-slate-900/10"
                                    >
                                        Send Transmission <ArrowRight size={14} />
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-2xl transition-all ${isOpen ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 border border-slate-200 hover:border-indigo-500/50'}`}
            >
                {isOpen ? <X size={28} /> : (
                    <div className="relative">
                        <Sparkles size={28} className="text-indigo-600" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                    </div>
                )}
            </motion.button>
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.05); border-radius: 10px; }
            `}</style>
        </div>
    );
}
