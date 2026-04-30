import Link from 'next/link';
import { Rocket, Mail, Globe } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="w-full border-t border-black/5 bg-white/90 backdrop-blur-xl py-12 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center md:items-start text-center md:text-left">
                    {/* Brand */}
                    <div className="space-y-4">
                        <Link href="/" className="flex items-center justify-center md:justify-start gap-2 group">
                            <div className="w-8 h-8 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                                <img src="/logo-final.png" alt="B20- Exchange Logo" className="w-full h-full object-contain" />
                            </div>
                            <span className="text-xl font-black tracking-tighter text-gray-900 text-red-gradient">
                                B20- Exchange
                            </span>
                        </Link>
                        <p className="text-gray-600 text-sm max-w-xs mx-auto md:mx-0">
                            The premier decentralized intelligence hub for meme tokens and crypto projects on the BNB Smart Chain.
                        </p>
                    </div>

                    {/* Links */}
                    <div className="space-y-4 text-sm text-gray-600">
                        <h4 className="text-gray-900 font-bold mb-4">Platform</h4>
                        <ul className="space-y-2">
                            <li><Link href="/launch" className="hover:text-blue-500 transition-colors">Live Launches</Link></li>
                            <li><Link href="/create" className="hover:text-blue-500 transition-colors">Create Token</Link></li>
                        </ul>
                    </div>

                    {/* Powered By */}
                    <div className="space-y-4 text-sm text-gray-600 flex flex-col items-center md:items-end">
                        <h4 className="text-gray-900 font-bold mb-4">Powered by Aichainz</h4>
                        <a href="https://www.aichainz.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-blue-500 transition-colors">
                            <Globe className="w-4 h-4" /> www.aichainz.com
                        </a>
                        <a href="mailto:support@aichainz.com" className="flex items-center gap-2 hover:text-blue-500 transition-colors">
                            <Mail className="w-4 h-4" /> support@aichainz.com
                        </a>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-black/5 text-center text-xs text-gray-500">
                    <p>&copy; {new Date().getFullYear()} B20- Exchange. Powered by Aichainz. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
