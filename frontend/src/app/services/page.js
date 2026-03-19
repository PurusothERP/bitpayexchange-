'use client';

import Navbar from '@/components/Navbar';
import { motion } from 'framer-motion';
import { FileText, Megaphone, Send, Rocket, Globe } from 'lucide-react';

export default function Services() {
    return (
        <main className="min-h-screen paw-pattern">
            <Navbar />

            <section className="pt-32 pb-20 px-4 md:px-8 max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 text-sm font-bold uppercase tracking-widest mb-6">
                        <Megaphone className="w-4 h-4" /> Marketing & Listings
                    </span>
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">Project <span className="text-purple-600">Services</span></h1>
                    <p className="text-gray-600 max-w-2xl mx-auto text-lg pt-2">
                        Need a professional website, whitepaper, or fast-track exchange listings?
                        Our elite team at Aichainz is here to elevate your project.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="glass-card hover:border-purple-500/30 transition-colors">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4 border border-purple-500/20">
                            <FileText className="text-purple-600 w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Whitepapers</h3>
                        <p className="text-sm text-gray-600">Professional, comprehensive technical and economic documentation for your project.</p>
                    </div>
                    <div className="glass-card hover:border-blue-500/30 transition-colors">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 border border-blue-500/20">
                            <Globe className="text-blue-600 w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Web Design</h3>
                        <p className="text-sm text-gray-600">High-conversion, stunning landing pages and dApps tailored to crypto audiences.</p>
                    </div>
                    <div className="glass-card hover:border-green-500/30 transition-colors">
                        <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-4 border border-green-500/20">
                            <Rocket className="text-green-600 w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">CEX Listings</h3>
                        <p className="text-sm text-gray-600">Fast-tracked applications and introductions to top-tier centralized exchanges.</p>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card"
                >
                    <div className="p-6 md:p-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b border-black/5 pb-4">Request a Quote</h2>

                        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); alert("Request submitted successfully! Our team will contact you soon."); }}>

                            <div className="space-y-4">
                                <label className="text-sm font-bold text-gray-700 block">Services Required (Select multiple)</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {['Whitepaper', 'Website/dApp', 'Smart Contract Audit', 'CEX Listing', 'CMC/CG Fast-track', 'Marketing PR', 'Community Mod', 'Other'].map(s => (
                                        <label key={s} className="flex items-center gap-2 p-3 border border-black/10 rounded-lg cursor-pointer hover:bg-black/5 transition-colors">
                                            <input type="checkbox" className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500" />
                                            <span className="text-xs font-bold text-gray-700">{s}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-black/5">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Your Name</label>
                                    <input required type="text" placeholder="John Doe" className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500/50 transition-all text-gray-900" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Email Address / Telegram</label>
                                    <input required type="text" placeholder="john@example.com or @johndoe" className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500/50 transition-all text-gray-900" />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-bold text-gray-700">Project Name & Description</label>
                                    <textarea required rows="4" placeholder="Tell us about your project and your goals..." className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500/50 transition-all text-gray-900 resize-none" />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-purple-600/20 transition-all"
                            >
                                <Send className="w-5 h-5" />
                                Send Request
                            </button>
                        </form>
                    </div>
                </motion.div>
            </section>
        </main>
    );
}
