import os

filepath = 'frontend/src/app/exchange/page.js'

with open(filepath, 'r') as f:
    content = f.read()

# 1. Redesign Markets Section
old_markets = '''                    {mode === 'markets' && (
                        <motion.div 
                            key="markets"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="max-w-[1600px] mx-auto space-y-12"
                        >
                            {/* Floating Institutional Alpha HUD - Global Trending */}
                            <div className="relative overflow-hidden py-10 group -mx-8 min-h-[120px]">
                                <div className="absolute left-0 top-0 bottom-0 w-64 bg-gradient-to-r from-transparent via-[#FDFDFD]/80 to-transparent z-10 pointer-events-none" />
                                <div className="absolute right-0 top-0 bottom-0 w-64 bg-gradient-to-l from-transparent via-[#FDFDFD]/80 to-transparent z-10 pointer-events-none" />
                                
                                <div className="absolute left-10 top-1/2 -translate-y-1/2 z-20 flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping" />
                                    <span className="text-[10px] font-black text-gray-900 uppercase tracking-[0.4em] whitespace-nowrap bg-white/40 px-5 py-2 rounded-full border border-gray-100 backdrop-blur-md shadow-sm">Trending Alpha</span>
                                </div>

                                <motion.div 
                                    className="flex gap-20 whitespace-nowrap pl-72"
                                    animate={{ x: [0, -3000] }}
                                    transition={{ duration: 55, repeat: Infinity, ease: "linear" }}
                                >
                                    {(cgTrending.length > 0 ? [...cgTrending, ...cgTrending, ...cgTrending, ...cgTrending] : []).map((t, idx) => (
                                        <div 
                                            key={`${t.id || t.address}-${idx}`}
                                            onClick={() => { setMode('spot'); setToToken(t); window.scrollTo({ top: 300, behavior: \'smooth\' }); }}
                                            className="flex items-center gap-6 cursor-pointer group/float py-2 hover:scale-105 transition-transform"
                                        >
                                            <div className="relative group">
                                                <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-full opacity-0 group-hover/float:opacity-100 transition-opacity" />
                                                {t.image ? (
                                                    <img
                                                        src={t.image}
                                                        className="w-10 h-10 relative z-10 object-contain rounded-xl opacity-80 group-hover/float:opacity-100 transition-all"
                                                        alt={t.symbol}
                                                        onError={(e) => { e.target.style.display=\'none\'; e.target.nextSibling.style.display=\'flex\'; }}
                                                    />
                                                ) : null}
                                                <div
                                                    className="w-10 h-10 relative z-10 rounded-xl bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white font-black text-sm"
                                                    style={{ display: t.image ? \'none\' : \'flex\' }}
                                                >
                                                    {(t.symbol || \'?\').charAt(0)}
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-black text-gray-900 uppercase tracking-tight italic">{t.symbol}</span>
                                                    <span className={`text-[11px] font-black ${t.price_change_percentage_24h >= 0 ? \'text-sky-500\' : \'text-blue-500\'}`}>
                                                        {t.price_change_percentage_24h >= 0 ? \'+\' : \'\'}{t.price_change_percentage_24h?.toFixed(2)}%
                                                    </span>
                                                </div>
                                                <div className="text-[10px] font-bold text-gray-400 font-mono tracking-tighter">
                                                    ${t.current_price < 0.01 ? t.current_price.toFixed(7) : t.current_price?.toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="w-1.5 h-1.5 bg-gray-200 rounded-full mx-2" />
                                        </div>
                                    ))}
                                </motion.div>
                            </div>

                            {/* Unified Market Intelligence Filter Card */}
                            <div className="mx-4 flex flex-col gap-6 bg-white shadow-2xl shadow-gray-100/80 border border-gray-100 rounded-[2.5rem] p-8">
                                <div className="flex flex-col gap-6">
                                    {/* Row 1: Network Filter */}
                                    <div className="flex flex-col gap-2">
                                        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 pl-2 flex items-center gap-1.5">
                                            <Layers className="w-3 h-3 text-indigo-500" /> Network / Ecosystem
                                        </span>
                                        <div className="max-w-full overflow-x-auto scrollbar-hide">
                                            <div className="flex bg-gray-50 shadow-inner p-1.5 rounded-[1.5rem] border border-gray-100 font-black uppercase tracking-widest text-[9px] gap-1 min-w-max">
                                                {[\'ALL\', ...NETWORKS_LIST].map(net => (
                                                    <button 
                                                        key={net}
                                                        onClick={() => setNetworkFilter(net)}
                                                        className={`px-4 py-3 rounded-[1.2rem] flex items-center gap-2 transition-all whitespace-nowrap ${networkFilter === net ? \'bg-indigo-500 text-white shadow-lg scale-105\' : \'text-gray-400 hover:text-gray-900\'}`}
                                                    >
                                                        {net === \'ALL\' ? <Globe className="w-4 h-4 flex-shrink-0" /> : <NetPill net={net} />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Row 2: Category Filter & Sort Toggle */}
                                    <div className="flex flex-wrap items-center justify-between gap-6">
                                        <div className="flex flex-col gap-2">
                                            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 pl-2 flex items-center gap-1.5">
                                                <Target className="w-3 h-3 text-indigo-500" /> Asset Taxonomy
                                            </span>
                                            <div className="flex flex-wrap gap-2">
                                                {[\'ALL\', \'MEME\', \'AI\', \'DEFI\', \'RWA\', \'GAMING\', \'INFRA\'].map(cat => (
                                                    <button 
                                                        key={cat}
                                                        onClick={() => setCategoryFilter(cat)}
                                                        className={`px-6 py-3 rounded-[1.2rem] text-[9px] font-black uppercase tracking-widest transition-all border ${categoryFilter === cat ? \'bg-gray-950 text-white border-black shadow-xl shadow-black/20\' : \'bg-gray-50 text-gray-400 border-gray-100 hover:bg-white hover:text-gray-900\'}`}
                                                    >
                                                        {cat}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-8">
                                            <div className="flex flex-col gap-2">
                                                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 pl-2">Ordering Logic</span>
                                                <div className="flex bg-gray-50 p-1.5 rounded-[1.2rem] border border-gray-100">
                                                    {[
                                                        { key: \'market_cap\', label: \'Cap\' },
                                                        { key: \'volume\', label: \'Vol\' },
                                                        { key: \'price\', label: \'Price\' }
                                                    ].map(opt => (
                                                        <button 
                                                            key={opt.key}
                                                            onClick={() => setSortBy(opt.key)}
                                                            className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${sortBy === opt.key ? \'bg-white text-gray-900 shadow-md border border-gray-100\' : \'text-gray-400 hover:text-gray-600\'}`}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Global Asset Registry */}
                            <div className="mx-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {displayTokens.slice(0, 100).map((t, idx) => (
                                        <motion.div 
                                            key={t.id || t.address}
                                            initial={{ opacity:0, y:20 }}
                                            animate={{ opacity:1, y:0 }}
                                            transition={{ delay: idx * 0.01 }}
                                            onClick={() => { setMode(\'spot\'); setToToken(t); }}
                                            className="bg-white border border-gray-100 rounded-[2.5rem] p-7 group cursor-pointer hover:border-indigo-500/20 hover:shadow-2xl hover:shadow-gray-200/50 transition-all relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform">
                                                {t.image ? <img src={t.image} className="w-24 h-24" alt="" /> : null}
                                            </div>
                                            
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 p-2 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        <img src={t.image} className="w-full h-full object-contain" alt="" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-tighter">{t.name}</h3>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.symbol}/USDT</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${(t.price_change_percentage_24h||0) >= 0 ? \'bg-sky-50 text-sky-600\' : \'bg-blue-50 text-blue-600\'}`}>
                                                        {(t.price_change_percentage_24h||0).toFixed(2)}%
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex justify-between items-end">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mark Price</p>
                                                    <p className="text-xl font-black italic tracking-tighter text-gray-900">${(t.current_price||0).toFixed(t.current_price < 1 ? 6 : 2)}</p>
                                                </div>
                                                
                                                <div className="pt-4 border-t border-gray-50 grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Liquidity</p>
                                                        <p className="text-[10px] font-black text-gray-900">${formatB20Number(t.total_volume)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">MCAP Rank</p>
                                                        <p className="text-[10px] font-black text-indigo-500">#{t.market_cap_rank || \'N/A\'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}'''

# Clean the old_markets string to handle LF/CRLF and potential whitespace issues
old_markets_clean = old_markets.replace('\\\'', "'")

new_markets = '''                    {mode === 'markets' && (
                        <motion.div 
                            key="markets"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="max-w-[1600px] mx-auto space-y-8"
                        >
                            {/* Market Overview Ticker */}
                            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm overflow-hidden relative">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-base font-black text-slate-900 tracking-tight">Market Overview</h2>
                                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">Real-time Global Asset Intelligence</p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Live Streams Active</span>
                                    </div>
                                </div>

                                <div className="flex gap-6 overflow-x-auto no-scrollbar pb-2">
                                    {(cgTrending.length > 0 ? cgTrending.slice(0, 10) : tokens.slice(0, 10)).map((t, idx) => (
                                        <div 
                                            key={t.id || t.address}
                                            onClick={() => { setMode('spot'); setToToken(t); }}
                                            className="min-w-[200px] bg-slate-50 border border-slate-200 rounded-lg p-3 hover:border-indigo-400 transition-all cursor-pointer group"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <img src={t.image} className="w-5 h-5 rounded-md" alt="" />
                                                    <span className="text-[11px] font-black text-slate-900 uppercase">{t.symbol}</span>
                                                </div>
                                                <span className={`text-[10px] font-bold ${(t.price_change_percentage_24h||0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {(t.price_change_percentage_24h||0).toFixed(2)}%
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-black text-slate-900 font-mono">
                                                    ${(t.current_price||0).toFixed(t.current_price < 1 ? 5 : 2)}
                                                </span>
                                                <div className="w-12 h-6 overflow-hidden opacity-30 group-hover:opacity-60 transition-opacity">
                                                    <div className={`w-full h-full border-b-2 ${(t.price_change_percentage_24h||0) >= 0 ? 'border-emerald-500' : 'border-rose-500'}`} style={{ transform: `rotate(${(t.price_change_percentage_24h||0) * 2}deg)` }} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Asset Registry Table */}
                            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className="flex bg-white border border-slate-200 p-1 rounded-lg">
                                            {['ALL', 'BSC', 'ETH', 'SOL', 'BASE'].map(net => (
                                                <button 
                                                    key={net}
                                                    onClick={() => setNetworkFilter(net)}
                                                    className={`px-4 py-1.5 text-[10px] font-bold rounded-md transition-all ${networkFilter === net ? 'bg-indigo-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                >
                                                    {net}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                            <input 
                                                type="text" placeholder="Search Asset..." value={marketSearch} onChange={(e) => setMarketSearch(e.target.value)}
                                                className="bg-white border border-slate-200 rounded-lg py-1.5 pl-9 pr-4 text-[11px] font-semibold outline-none focus:border-indigo-400 transition-all w-64"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sort By:</span>
                                        <select 
                                            value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                                            className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-[11px] font-bold outline-none cursor-pointer"
                                        >
                                            <option value="market_cap">Market Cap</option>
                                            <option value="price">Price</option>
                                            <option value="volume">Volume</option>
                                            <option value="change">24h Change</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="overflow-x-auto no-scrollbar">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-100">
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Asset Name</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Price</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">24h Change</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Market Cap</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Volume (24h)</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {displayTokens.slice(0, 100).map((t, idx) => (
                                                <tr key={t.id || t.address} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 p-1.5 flex items-center justify-center shadow-sm">
                                                                <img src={t.image} className="w-full h-full object-contain" alt="" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{t.name}</p>
                                                                <p className="text-[9px] font-bold text-slate-400">{t.symbol}/USDT</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <p className="text-[11px] font-black font-mono text-slate-900">
                                                            ${(t.current_price||0).toFixed(t.current_price < 1 ? 6 : 2)}
                                                        </p>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className={`text-[11px] font-black ${(t.price_change_percentage_24h||0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            {(t.price_change_percentage_24h||0).toFixed(2)}%
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <p className="text-[11px] font-bold text-slate-600">${formatB20Number(t.market_cap)}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <p className="text-[11px] font-bold text-slate-600">${formatB20Number(t.total_volume)}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button 
                                                            onClick={() => { setMode('spot'); setToToken(t); }}
                                                            className="text-[10px] font-black text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all border border-indigo-100"
                                                        >
                                                            Trade
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    )}'''

# 2. Redesign Bonding, Staking, Community, Announcements wrappers
sections_to_fix = [
    ('bonding', 'Zap', 'Bonding Curve Terminal', 'Access B20-exclusive Bonding Curve liquidity pools with AI-audit verification.', 'blue'),
    ('staking', 'Lock', 'Yield Protocol Vaults', 'Stake any BEP20 asset in institutional vaults. High yield APR. Automated rewards.', 'violet')
]

for mode_key, icon, title, desc, color in sections_to_fix:
    old_sec = f'''                    {{mode === '{mode_key}' && (
                        <motion.div 
                            key="{mode_key}" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }}
                            className="max-w-[1600px] mx-auto"
                        >
                            <div className="bg-white/50 backdrop-blur-3xl border border-gray-100 rounded-[3rem] p-12 text-center py-32 shadow-3xl shadow-indigo-900/5">
                                <div className="w-24 h-24 bg-{color}-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-{color}-500/20">
                                    <{icon} className="w-12 h-12 text-{color}-500" />
                                </div>
                                <h3 className="text-4xl font-black text-gray-900 uppercase tracking-tighter italic mb-4">{title}</h3>
                                <p className="text-gray-500 font-bold uppercase tracking-widest text-sm max-w-lg mx-auto leading-relaxed">
                                    {desc}
                                </p>
                                <div className="mt-12 flex justify-center gap-6">
                                    <Link href="/{mode_key}" className="px-10 py-5 bg-{color}-500 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl shadow-{color}-500/20 hover:scale-105 transition-all">Launch Console</Link>
                                    <button onClick={() => setMode('markets')} className="px-10 py-5 bg-white border border-gray-100 text-gray-400 rounded-[2rem] font-black uppercase tracking-widest hover:text-gray-900 transition-all">View Analytics</button>
                                </div>
                            </div>
                        </motion.div>
                    )}}'''

    new_sec = f'''                    {{mode === '{mode_key}' && (
                        <motion.div 
                            key="{mode_key}" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            className="max-w-[1000px] mx-auto"
                        >
                            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center py-20 shadow-sm">
                                <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                                    <{icon} className="w-8 h-8 text-indigo-700" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-3">{title}</h3>
                                <p className="text-slate-500 font-medium tracking-wide text-sm max-w-md mx-auto leading-relaxed">
                                    {desc}
                                </p>
                                <div className="mt-10 flex justify-center gap-4">
                                    <Link href="/{mode_key}" className="px-8 py-3 bg-indigo-700 text-white rounded-lg font-bold text-xs uppercase tracking-widest shadow-md hover:bg-indigo-800 transition-all">Launch Protocol</Link>
                                    <button onClick={() => setMode('markets')} className="px-8 py-3 bg-white border border-slate-200 text-slate-500 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">View Assets</button>
                                </div>
                            </div>
                        </motion.div>
                    )}}'''
    
    # Try replacing with LF
    content = content.replace(old_sec.replace('\\\'', "'").replace('\\n', '\n'), new_sec.replace('\\n', '\n'))
    # Also try replacing without explicit newlines if it fails
    content = content.replace(old_sec.replace('\\\'', "'").replace('\n', '\r\n'), new_sec.replace('\n', '\r\n'))

# Replace Markets
content = content.replace(old_markets_clean.replace('\n', '\n'), new_markets.replace('\n', '\n'))
content = content.replace(old_markets_clean.replace('\n', '\r\n'), new_markets.replace('\n', '\r\n'))

with open(filepath, 'w') as f:
    f.write(content)

print("SUCCESS: Sweeping redesign applied to Exchange page.")
