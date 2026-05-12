'use client';
import { API_URL } from '@/lib/api';

import { useState, useEffect } from 'react';
import axios from 'axios';
import TokenCard from './TokenCard';
import { Search, Rocket } from 'lucide-react';



export default function TokenList() {
    const [tokens, setTokens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchTokens = async () => {
            try {
                const response = await axios.get(`${API_URL}/tokens`);
                setTokens(response.data);
            } catch (error) {
                console.error('Error fetching tokens:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTokens();
        const interval = setInterval(fetchTokens, 10000); // Sync every 10s
        return () => clearInterval(interval);
    }, []);

    const filteredTokens = tokens.filter(token =>
        token.name.toLowerCase().includes(search.toLowerCase()) ||
        token.symbol.toLowerCase().includes(search.toLowerCase()) ||
        token.contract_address.toLowerCase().includes(search.toLowerCase())
    );

    if (loading && tokens.length === 0) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="glass-card animate-pulse h-80" />
                ))}
            </div>
        );
    }

    if (tokens.length === 0) {
        return (
            <div className="text-center py-20 glass-card">
                <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Rocket className="text-gray-600 w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">No Tokens Found</h3>
                <p className="text-gray-500">Be the first to launch a token on B20-LAB!</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
                <div>
                    <h2 className="text-3xl font-bold mb-2 text-gray-900 italic">Live Launches</h2>
                    <p className="text-gray-600">Discover and participate in upcoming projects</p>
                </div>
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search tokens..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-black/5 border border-black/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-blue-500/50 transition-all text-sm font-medium"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredTokens.map((token) => (
                    <TokenCard key={token.contract_address} token={token} />
                ))}
            </div>
        </div>
    );
}
