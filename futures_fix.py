import os

filepath = 'frontend/src/app/exchange/page.js'

with open(filepath, 'r') as f:
    content = f.read()

# 1. Define the missing MarketsHub component (Redesigned for Premium look)
markets_hub_code = """
const MarketsHub = ({ tokens = [], setMode, setToToken, marketCategory, setMarketCategory, marketSearch, setMarketSearch, marketSort, setMarketSort, networkFilter, setNetworkFilter }) => {
    return (
        <div className="space-y-6">
            {/* --- Premium Filter Bar --- */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex flex-wrap items-center gap-3">
                    {['all', 'trending', 'gainers', 'losers', 'new'].map(cat => (
                        <button 
                            key={cat} onClick={() => setMarketCategory(cat)}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${marketCategory === cat ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                <div className="relative w-full md:w-80 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    <input 
                        type="text" placeholder="Search by name, symbol or 0x..." value={marketSearch} onChange={(e) => setMarketSearch(e.target.value)}
                        className="w-full pl-12 pr-6 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-indigo-400 focus:shadow-md transition-all"
                    />
                </div>
            </div>

            {/* --- Network / Ecosystem Selector --- */}
            <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar">
                {['ALL', 'BNB', 'ETH', 'SOL', 'BASE', 'TRON', 'SUI', 'TON', 'ARBITRUM', 'OPTIMISM', 'POLYGON', 'AVALANCHE', 'BLAST', 'CELO', 'CYBER', 'FANTOM', 'SCROLL', 'SONIC', 'ZETACHAIN'].map(net => (
                    <button 
                        key={net} onClick={() => setNetworkFilter(net)}
                        className={`flex items-center gap-3 px-5 py-3 rounded-xl border transition-all whitespace-nowrap ${networkFilter === net ? 'bg-white border-indigo-500 shadow-md ring-2 ring-indigo-500/10' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                    >
                        <img src={`https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${net === 'BNB' ? 'smartchain' : net.toLowerCase()}/info/logo.png`} className="w-5 h-5 rounded-full" onError={(e) => { e.target.src = 'https://cryptologos.cc/logos/bnb-bnb-logo.png'; }} />
                        <span className="text-xs font-black uppercase tracking-widest">{net}</span>
                    </button>
                ))}
            </div>

            {/* --- Markets Table --- */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Index</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Price</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">24h Delta</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Institutional MCap</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action Hub</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tokens.length > 0 ? tokens.slice(0, 100).map((t, i) => (
                                <tr key={t.id || t.address} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-5">
                                            <span className="text-xs font-bold text-slate-300 font-mono w-4">{(i + 1).toString().padStart(2, '0')}</span>
                                            <div className="w-12 h-12 bg-white rounded-xl p-1 border border-slate-100 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                                {t.image ? <img src={t.image} className="w-full h-full object-contain rounded-lg" alt="" /> : <div className="w-full h-full bg-slate-100" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{t.name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.symbol}</span>
                                                    <span className="text-[8px] font-black bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded uppercase">{t.network || 'BNB'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right font-mono font-black text-sm text-slate-900">
                                        ${t.current_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                                    </td>
                                    <td className={`px-8 py-6 text-right font-mono font-black text-sm ${(t.price_change_percentage_24h||0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {(t.price_change_percentage_24h||0) >= 0 ? '+' : ''}{(t.price_change_percentage_24h||0).toFixed(2)}%
                                    </td>
                                    <td className="px-8 py-6 text-right font-mono font-black text-sm text-slate-600">
                                        ${formatB20Number(t.market_cap)}
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button 
                                            onClick={() => { setToToken(t); setMode('spot'); }}
                                            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-indigo-600 active:scale-95 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            Execute
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center text-slate-400 font-black uppercase tracking-widest text-xs">
                                        No matching assets found in terminal index.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
"""

# Insert MarketsHub before B20Exchange component
if 'const MarketsHub' not in content:
    content = content.replace('export default function B20Exchange() {', markets_hub_code + '\n\nexport default function B20Exchange() {')

# 2. Add the MarketsHub to the AnimatePresence mode switch
markets_block = """
                    {mode === 'markets' && (
                        <motion.div 
                            key="markets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="w-full"
                        >
                            <MarketsHub 
                                tokens={activeTokens} setMode={setMode} setToToken={setToToken} 
                                marketCategory={marketCategory} setMarketCategory={setMarketCategory}
                                marketSearch={marketSearch} setMarketSearch={setMarketSearch}
                                marketSort={marketSort} setMarketSort={setMarketSort}
                                networkFilter={networkFilter} setNetworkFilter={setNetworkFilter}
                            />
                        </motion.div>
                    )}
"""

if "key=\"markets\"" not in content:
    content = content.replace('<AnimatePresence mode="wait">', '<AnimatePresence mode="wait">\n' + markets_block)

# 3. Fix Futures Sidebar height and layout (Collapse fix)
# We need to ensure the Market Selector sidebar has a fixed height relative to the terminal
content = content.replace(
    '<div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-sm">',
    '<div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-sm max-h-[900px]">'
)

content = content.replace(
    '<div className="flex-1 overflow-y-auto no-scrollbar p-1 space-y-0.5">',
    '<div className="flex-1 overflow-y-auto custom-scrollbar p-1 space-y-0.5 h-[calc(900px-150px)]">'
)

# 4. Refine Search bar in Futures Sidebar (Compact row suggested by subagent)
content = content.replace(
    '<h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Market Pairs</h3>',
    '<div className="flex items-center gap-2"><h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Markets</h3><span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 rounded-full border border-indigo-100">Live</span></div>'
)

# 5. Fix main trading interface grid height and overflow
content = content.replace(
    'className="flex flex-col xl:grid xl:grid-cols-12 gap-4 min-h-[900px]"',
    'className="flex flex-col xl:grid xl:grid-cols-12 gap-4 max-h-[900px] overflow-hidden"'
)

with open(filepath, 'w') as f:
    f.write(content)

print("SUCCESS: Markets restored, Futures sidebar fixed, and institutional polish applied.")
