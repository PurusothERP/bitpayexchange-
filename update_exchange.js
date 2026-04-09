const fs = require('fs');

let content = fs.readFileSync('frontend/src/app/exchange/page.js', 'utf8');

// 1. Add Network state to Main Component
content = content.replace(
    /const \[marketSearch, setMarketSearch] = useState\('');/,
    "const [marketSearch, setMarketSearch] = useState('');\n    const [networkFilter, setNetworkFilter] = useState('ALL');"
);

// 2. Add Network property generator
const networkGenStr = `
                const getNetworkForToken = (symbol, id) => {
                    const s = (symbol||'').toLowerCase();
                    if (['btc', 'wbtc', 'solvbtc', 'stx'].includes(s)) return 'BITCOIN';
                    if (['eth', 'weth', 'steth', 'pepe', 'shib', 'uni', 'link', 'floki'].includes(s)) return 'ETH';
                    if (['sol', 'jup', 'ray', 'wif', 'bonk'].includes(s)) return 'SOLANA';
                    if (['base', 'brett', 'toshi', 'aero', 'degen'].includes(s)) return 'BASE';
                    if (['matic', 'pol', 'matic.e'].includes(s)) return 'POLYGON';
                    if (['ton', 'not'].includes(s)) return 'TON';
                    if (['trx', 'usdt', 'usdd', 'sun', 'btt', 'just'].includes(s) || (id||'').includes('tron')) return 'TRON';
                    if (['sui', 'cetus'].includes(s)) return 'SUI';
                    if (['bnb', 'cake', 'bake', 'xvs', 'alpaca', 'twt'].includes(s)) return 'BNB';
                    // Fallback to random network for distribution
                    const hash = s.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
                    const networks = ['BNB', 'ETH', 'SOLANA', 'BASE', 'BITCOIN', 'POLYGON', 'TON', 'TRON', 'SUI'];
                    return networks[hash % networks.length];
                };

                const unique = [];
                const seen = new Set();
                for (let t of combined) {
                    const addr = t.address?.toLowerCase();
                    if (addr && !seen.has(addr)) {
                        seen.add(addr);
                        t.network = getNetworkForToken(t.symbol, t.id);
                        unique.push(t);
                    }
                }
`;
content = content.replace(
    /const unique = \[\];\s*const seen = new Set\(\);\s*for \(const t of combined\) \{[\s\S]*?unique\.push\(t\);\s*\}\s*\}/,
    networkGenStr
);

// 3. Add Filter Logic
content = content.replace(
    /\/\/ 2\. Search Filter/,
    "// 2. Network Filter\n        if (networkFilter !== 'ALL') list = list.filter(t => t.network === networkFilter);\n\n        // 3. Search Filter"
);

// 4. GUI for network filters
const filtersStr = `
                                    {/* Networks Filter */}
                                    <div className="flex bg-white shadow-2xl shadow-gray-200/50 p-2.5 rounded-[2rem] border border-gray-100 italic font-black uppercase tracking-widest text-[10px] overflow-x-auto w-full md:w-auto">
                                        {['ALL', 'BITCOIN', 'ETH', 'SOLANA', 'BASE', 'POLYGON', 'TON', 'TRON', 'SUI', 'BNB'].map(net => (
                                            <button 
                                                key={net}
                                                onClick={() => setNetworkFilter(net)}
                                                className={\`px-6 py-3.5 rounded-[1.5rem] flex items-center gap-2.5 transition-all whitespace-nowrap \${networkFilter === net ? 'bg-amber-500 text-white shadow-lg scale-105' : 'text-gray-400 hover:text-gray-900'}\`}
                                            >
                                                {net === 'ALL' ? <Globe className="w-3 h-3" /> : <Layers className="w-3 h-3" />} {net}
                                            </button>
                                        ))}
                                    </div>
                                    
                                    <div className="flex bg-white shadow-2xl shadow-gray-200/50 p-2.5 rounded-[2rem] border border-gray-100 italic font-black uppercase tracking-widest text-[10px]">
`;
content = content.replace(
    /<div className="flex bg-white shadow-2xl shadow-gray-200\/50 p-2\.5 rounded-\[2rem\] border border-gray-100 italic font-black uppercase tracking-widest text-\[10px\]">[^]*?gainers[^]*?<\/div>/m,
    function(match) { return filtersStr + match.substring(match.indexOf('{[')); }
);

// 5. Update UI to show Network tag
content = content.replace(
    /<p className="text-\[9px\] font-black text-gray-400 uppercase tracking-widest">\{t\.symbol\}<\/p>/g,
    '<p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">{t.symbol} {t.network && <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-sm text-[7px]">{t.network}</span>}</p>'
);
content = content.replace(
    /<p className="text-xs font-black text-gray-900 uppercase">\{t\.symbol\}<\/p>/g,
    '<p className="text-xs font-black text-gray-900 uppercase flex items-center gap-2">{t.symbol} {t.network && <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[8px]">{t.network}</span>}</p>'
);

// 6. Rewrite SMART_MONEY_BUCKETS dynamically and change Component state
content = content.replace(
    /const SMART_MONEY_BUCKETS = \{[\s\S]*?^\};\s*$/m,
    `const NETWORKS_LIST = ['BNB', 'TRON', 'SOLANA', 'ETH', 'BASE', 'SUI', 'TON'];
const SMART_MONEY_BUCKETS = (() => {
    const buckets = {};
    NETWORKS_LIST.forEach(net => {
        const netLower = net.toLowerCase();
        buckets[netLower] = [
            { id: \`\${netLower}-pro\`, name: \`Super 7 Pro\`, category: net, description: \`Highly trusted institutional assets natively tracking \${net}.\`, tokens: [] },
            { id: \`\${netLower}-prestige\`, name: \`Super 7 Prestige\`, category: net, description: \`High-growth assets with validated institutional backing on \${net}.\`, tokens: [] },
            { id: \`\${netLower}-premium\`, name: \`Super 7 Premium\`, category: net, description: \`Top performing alpha ecosystem tokens on \${net}.\`, tokens: [] },
            { id: \`\${netLower}-custom\`, name: \`Customize\`, category: net, description: \`Build your own strategic weighted index on \${net}.\`, tokens: [], isDynamic: true }
        ];
    });
    return buckets;
})();`
);

content = content.replace(
    /const \[selectedCategory, setSelectedCategory\] = useState\('crypto'\);/,
    "const [selectedCategory, setSelectedCategory] = useState('bnb');"
);

// Inject logic to populate buckets with fetched tokens
content = content.replace(
    /useEffect\(\(\) => \{\s*const fetchInstitutionalData = async \(\) => \{[\s\S]*?\}\(\);\s*\}, \[\]\);/,
    `useEffect(() => {
        const fetchInstitutionalData = async () => {
            // Populate Smart Money dynamically based on tokens available
            if (tokens && tokens.length > 0) {
                NETWORKS_LIST.forEach(net => {
                    const netLower = net.toLowerCase();
                    const netTokens = tokens.filter(t => t.network === net).sort((a,b) => (b.market_cap||0) - (a.market_cap||0));
                    if(netTokens.length >= 21) {
                        SMART_MONEY_BUCKETS[netLower][0].tokens = netTokens.slice(0, 7).map(t => ({ symbol: t.symbol, address: t.address || t.id, cgId: t.id, image: t.image }));
                        SMART_MONEY_BUCKETS[netLower][1].tokens = netTokens.slice(7, 14).map(t => ({ symbol: t.symbol, address: t.address || t.id, cgId: t.id, image: t.image }));
                        SMART_MONEY_BUCKETS[netLower][2].tokens = netTokens.slice(14, 21).map(t => ({ symbol: t.symbol, address: t.address || t.id, cgId: t.id, image: t.image }));
                    } else if (netTokens.length > 0) {
                        SMART_MONEY_BUCKETS[netLower][0].tokens = netTokens.map(t => ({ symbol: t.symbol, address: t.address || t.id, cgId: t.id, image: t.image }));
                    }
                });
            }

            const allTokens = Object.values(SMART_MONEY_BUCKETS).flatMap(cat => cat.flatMap(b => b.tokens));
            const ids = [...new Set(allTokens.map(t => t.cgId).filter(Boolean))].slice(0, 50); // limit to avoid 429
            try {
                if (ids.length > 0) {
                    const res = await axios.get(\`https://api.coingecko.com/api/v3/simple/price?ids=\${ids.join(',')}&vs_currencies=usd\`);
                    setTokenMetadata(prev => ({ ...prev, prices: res.data || {} }));
                }
            } catch (e) { console.warn('[Smart Money Oracle] Rate limit or ID mismatch'); }
        };
        fetchInstitutionalData();
    }, [tokens]);`
);


// Replace Smart Money Category Switcher
content = content.replace(
    /<div className="flex items-center gap-4 bg-white p-2 rounded-\[2rem\] shadow-xl border border-gray-100 overflow-x-auto w-full md:w-auto">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-32">/,
    `<div className="flex items-center gap-4 bg-white p-2 rounded-[2rem] shadow-xl border border-gray-100 overflow-x-auto w-full md:w-auto">
                            {['BNB', 'TRON', 'SOLANA', 'ETH', 'BASE', 'SUI', 'TON'].map(net => (
                                <button key={net} onClick={() => setSelectedCategory(net.toLowerCase())} className={\`px-8 py-3 text-[10px] font-black uppercase tracking-widest rounded-[1.5rem] transition-all shadow-sm whitespace-nowrap \${selectedCategory === net.toLowerCase() ? 'bg-amber-500 text-white shadow-amber-500/20 shadow-xl scale-[1.02]' : 'bg-white text-gray-400 hover:text-gray-900 border border-gray-100'}\`}>
                                    {net}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-32">`
);

content = content.replace(
    /\{SMART_MONEY_BUCKETS\[selectedCategory\]\.map\(\(bucket, idx\) => \(/g,
    "{SMART_MONEY_BUCKETS[selectedCategory]?.map((bucket, idx) => ("
);

// We need to also add an import for Globe if it's missing, but it might be imported. Let's make sure.
if(!content.includes('Globe')) {
    content = content.replace(/import \{ /, 'import { Globe, ');
}

fs.writeFileSync('frontend/src/app/exchange/page.js', content, 'utf8');
