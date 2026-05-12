'use client';
import { API_URL } from '@/lib/api';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Sparkles, Loader2, Bot, User, Trash2 } from 'lucide-react';
import axios from 'axios';



export default function ChatBox() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Greetings! I am Neura AI, your intelligent guide to the B20- Exchange ecosystem. How can I assist you today?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = { role: 'user', content: input };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const res = await axios.post(`${API_URL}/ml/neura-chat`, { 
                messages: newMessages.map(m => ({ role: m.role, content: m.content }))
            });
            if (res.data.success) {
                setMessages([...newMessages, { role: 'assistant', content: res.data.text }]);
            } else {
                throw new Error(res.data.text);
            }
        } catch (err) {
            setMessages([...newMessages, { role: 'assistant', content: "My neural link is currently unstable. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const clearChat = () => {
        setMessages([{ role: 'assistant', content: 'Neural pathways cleared. How can I assist you today?' }]);
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999]">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="mb-4 w-[350px] md:w-[400px] h-[550px] glass-card flex flex-col overflow-hidden shadow-2xl border-blue-500/20"
                    >
                        {/* Header */}
                        <div className="p-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex items-center justify-between border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl overflow-hidden border border-blue-500/30 shadow-lg shadow-blue-500/10">
                                    <img src="/assets/neura_ai.jpg" alt="Neura AI" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h3 className="font-black text-xs uppercase tracking-widest text-white">Neura Ai</h3>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                                        <span className="text-[9px] font-bold text-sky-500 uppercase tracking-tighter">System Online</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={clearChat} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white" title="Clear History">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 custom-scrollbar">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
                                            msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-900 text-blue-500 border border-white/10'
                                        }`}>
                                            {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                        </div>
                                        <div className={`p-3 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                                            msg.role === 'user' 
                                            ? 'bg-blue-500 text-white rounded-tr-none' 
                                            : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                        }`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="flex gap-3 max-w-[85%]">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gray-900 text-blue-500 border border-white/10">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        </div>
                                        <div className="p-3 rounded-2xl bg-white border border-gray-100 rounded-tl-none flex gap-1">
                                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100 flex items-center gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask Neura anything..."
                                className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-blue-500/30 focus:bg-white transition-all shadow-inner"
                            />
                            <button 
                                type="submit" 
                                disabled={!input.trim() || isLoading}
                                className="w-10 h-10 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 text-white rounded-xl flex items-center justify-center transition-all shadow-lg shadow-blue-500/20 active:scale-90"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl transition-all relative ${
                    isOpen ? 'bg-gray-900 text-blue-500' : 'bg-blue-500 text-white'
                }`}
            >
                <AnimatePresence mode='wait'>
                    {isOpen ? (
                        <motion.div key="close" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }}>
                            <X className="w-8 h-8" />
                        </motion.div>
                    ) : (
                        <motion.div key="open" className="relative" initial={{ opacity: 0, rotate: 90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: -90 }}>
                            <MessageSquare className="w-8 h-8" />
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-md">
                                <Sparkles className="w-2.5 h-2.5 text-blue-500 animate-pulse" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>
        </div>
    );
}
