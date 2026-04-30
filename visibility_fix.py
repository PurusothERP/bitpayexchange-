import os

filepath = 'frontend/src/app/exchange/page.js'

with open(filepath, 'r') as f:
    content = f.read()

# 1. Update Filters Section (Visibility & Size)
old_filters = '''                            {/* Unified Market Intelligence Filter Card */}
                            <div className="mx-4 flex flex-col gap-6 bg-white shadow-2xl shadow-gray-100/80 border border-gray-100 rounded-[2.5rem] p-8">
                                <div className="flex flex-col gap-6">
                                    {/* Row 1: Network Filter */}
                                    <div className="flex flex-col gap-2">
                                        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 pl-2 flex items-center gap-1.5">
                                            <Layers className="w-3 h-3 text-indigo-500" /> Network / Ecosystem
                                        </span>
                                        <div className="max-w-full overflow-x-auto scrollbar-hide">
                                            <div className="flex bg-gray-50 shadow-inner p-1.5 rounded-[1.5rem] border border-gray-100 font-black uppercase tracking-widest text-[9px] gap-1 min-w-max">
                                                {['ALL', ...NETWORKS_LIST].map(net => (
                                                    <button 
                                                        key={net}
                                                        onClick={() => setNetworkFilter(net)}
                                                        className={`px-4 py-3 rounded-[1.2rem] flex items-center gap-2 transition-all whitespace-nowrap ${networkFilter === net ? 'bg-indigo-500 text-white shadow-lg scale-105' : 'text-gray-400 hover:text-gray-900'}`}
                                                    >
                                                        {net === 'ALL' ? <Globe className="w-4 h-4 flex-shrink-0" /> : <NetPill net={net} />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Row 2: Category Filter & Sort Toggle */}
                                    <div className="flex flex-wrap items-center justify-between gap-6">
                                        <div className="flex flex-col gap-2">
                                            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 pl-2 flex items-center gap-1.5">
                                                <LayoutGrid className="w-3 h-3 text-gray-400" /> Market Category
                                            </span>
                                            <div className="flex bg-gray-50 p-1.5 rounded-[1.5rem] border border-gray-100 font-black uppercase tracking-widest text-[10px] gap-1 flex-wrap">
                                                {[
                                                    { id: 'all', label: 'All Tokens', icon: <Globe className="w-3.5 h-3.5" /> },
                                                    { id: 'new', label: 'Newly Launched', icon: <Sparkles className="w-3.5 h-3.5 text-cyan-500" /> },
                                                    { id: 'gainers', label: 'Top Gainers', icon: <TrendingUp className="w-3.5 h-3.5 text-sky-500" /> },
                                                    { id: 'losers', label: 'Top Losers', icon: <TrendingDown className="w-3.5 h-3.5 text-blue-500" /> },
                                                    { id: 'trending', label: 'Trending', icon: <TrendingUp className="w-3.5 h-3.5 text-indigo-500" /> },
                                                    { id: 'volume', label: 'High Volume', icon: <Activity className="w-3.5 h-3.5 text-blue-500" /> },
                                                ].map(cat => (
                                                    <button
                                                        key={cat.id}
                                                        onClick={() => setMarketCategory(cat.id)}
                                                        className={`px-6 py-3 rounded-[1.2rem] flex items-center gap-2.5 transition-all ${marketCategory === cat.id ? 'bg-gray-900 text-white shadow-lg scale-105' : 'text-gray-400 hover:text-gray-900 hover:bg-white'}`}
                                                    >
                                                        {cat.icon} {cat.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 self-end">
                                            <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Sort:</span>
                                                <select
                                                    value={marketSort}
                                                    onChange={(e) => setMarketSort(e.target.value)}
                                                    className="bg-transparent text-[10px] font-black uppercase tracking-widest text-gray-900 outline-none cursor-pointer"
                                                >
                                                    <option value="rank">Crypto Rank</option>
                                                    <option value="mcap">Market Cap</option>
                                                    <option value="p_high">Price: High → Low</option>
                                                    <option value="p_low">Price: Low → High</option>
                                                    <option value="change">Highest Volatility</option>
                                                </select>
                                            </div>
                                            <div className="flex bg-gray-50 border border-gray-100 p-1.5 rounded-2xl gap-1">
                                                <button onClick={() => setViewType('card')} className={`p-3 rounded-xl transition-all ${viewType === 'card' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:text-gray-900'}`}>
                                                    <LayoutGrid className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setViewType('list')} className={`p-3 rounded-xl transition-all ${viewType === 'list' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:text-gray-900'}`}>
                                                    <List className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Row 3: Search Bar */}
                                    <div className="relative group/search">
                                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within/search:text-indigo-500 transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="SEARCH BY NAME, SYMBOL OR CONTRACT (0X...)..."
                                            value={marketSearch}
                                            onChange={(e) => setMarketSearch(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-[1.5rem] py-5 pl-16 pr-6 text-[10px] font-black uppercase tracking-widest outline-none focus:bg-white focus:border-indigo-500/50 focus:shadow-xl focus:shadow-indigo-500/5 transition-all placeholder:text-gray-200"
                                        />
                                        {marketSearch && (
                                            <button onClick={() => setMarketSearch('')} className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-500 transition-all">
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between px-2">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            Institutional Intelligence Active // Showing <span className="text-gray-900 border-b-2 border-indigo-400">{displayTokens.length} Assets</span>
                                        </p>
                                    </div>
                                </div>
                            </div>'''

new_filters = '''                            {/* Institutional Filter Suite - Enhanced Visibility */}
                            <div className="mx-4 bg-white border border-slate-200 rounded-2xl p-10 shadow-md space-y-10">
                                {/* Network Selector */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2.5">
                                            <Layers className="w-5 h-5 text-indigo-600" /> Network / Ecosystem
                                        </h3>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Infrastructure</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2.5 overflow-x-auto no-scrollbar pb-1">
                                        {['ALL', ...NETWORKS_LIST].map(net => (
                                            <button 
                                                key={net}
                                                onClick={() => setNetworkFilter(net)}
                                                className={`px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2 ${networkFilter === net ? 'bg-indigo-700 text-white border-indigo-800 shadow-xl scale-[1.02]' : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-indigo-400 hover:bg-white'}`}
                                            >
                                                {net}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-8 border-t border-slate-100">
                                    {/* Market Category */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2.5">
                                            <LayoutGrid className="w-5 h-5 text-indigo-600" /> Market Category
                                        </h3>
                                        <div className="flex flex-wrap gap-2.5">
                                            {[
                                                { id: 'all', label: 'All Tokens', icon: <Globe className="w-5 h-5" /> },
                                                { id: 'new', label: 'Newly Launched', icon: <Sparkles className="w-5 h-5 text-cyan-500" /> },
                                                { id: 'gainers', label: 'Top Gainers', icon: <TrendingUp className="w-5 h-5 text-emerald-500" /> },
                                                { id: 'losers', label: 'Top Losers', icon: <TrendingDown className="w-5 h-5 text-rose-500" /> },
                                                { id: 'trending', label: 'Trending', icon: <Activity className="w-5 h-5 text-indigo-500" /> },
                                                { id: 'volume', label: 'High Volume', icon: <BarChart3 className="w-5 h-5 text-blue-500" /> },
                                            ].map(cat => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => setMarketCategory(cat.id)}
                                                    className={`px-6 py-4 rounded-xl flex items-center gap-3.5 text-xs font-black uppercase tracking-widest transition-all border-2 ${marketCategory === cat.id ? 'bg-slate-900 text-white border-slate-950 shadow-xl scale-[1.02]' : 'bg-white text-slate-500 border-slate-100 hover:border-indigo-400'}`}
                                                >
                                                    {cat.icon} {cat.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Intelligence Search */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2.5">
                                            <Search className="w-5 h-5 text-indigo-600" /> Intelligence Search
                                        </h3>
                                        <div className="relative group">
                                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                            <input
                                                type="text"
                                                placeholder="SEARCH ASSETS BY NAME, SYMBOL OR CONTRACT..."
                                                value={marketSearch}
                                                onChange={(e) => setMarketSearch(e.target.value)}
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-6 pl-16 pr-8 text-sm font-black uppercase tracking-widest outline-none focus:bg-white focus:border-indigo-500 focus:shadow-2xl transition-all placeholder:text-slate-300"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between pt-2">
                                            <div className="flex items-center gap-4">
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sorting Logic:</span>
                                                <select
                                                    value={marketSort}
                                                    onChange={(e) => setMarketSort(e.target.value)}
                                                    className="bg-white border-2 border-slate-100 rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-900 outline-none cursor-pointer hover:border-indigo-400 transition-all"
                                                >
                                                    <option value="rank">Crypto Market Rank</option>
                                                    <option value="mcap">Market Capitalization</option>
                                                    <option value="p_high">Price: High to Low</option>
                                                    <option value="p_low">Price: Low to High</option>
                                                    <option value="change">Highest 24h Change</option>
                                                </select>
                                            </div>
                                            <div className="flex bg-slate-100 border border-slate-200 p-1.5 rounded-xl gap-1">
                                                <button onClick={() => setViewType('card')} className={`p-3 rounded-lg transition-all ${viewType === 'card' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                                                    <LayoutGrid className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => setViewType('list')} className={`p-3 rounded-lg transition-all ${viewType === 'list' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                                                    <List className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                                    <p className="text-sm font-black text-slate-900 uppercase tracking-widest">
                                        <span className="text-indigo-600 animate-pulse mr-2">●</span> Institutional Feed Active // Showing <span className="text-indigo-600 border-b-2 border-indigo-200">{displayTokens.length} Professional Assets</span>
                                    </p>
                                </div>
                            </div>'''

content = content.replace(old_filters, new_filters)

# 2. Update Asset Cards (Visibility & Size)
old_cards_header = '''                            {viewType === 'card' ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 font-sans pb-20">'''

new_cards_header = '''                            {viewType === 'card' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10 font-sans pb-24 px-4">'''

content = content.replace(old_cards_header, new_cards_header)

# 3. Update Card Content (Visibility & Size)
old_card_inner = '''                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-gray-50 rounded-2xl p-2 border border-gray-100 group-hover:bg-indigo-50 transition-colors shrink-0">
                                            {t.image ? <img src={t.image} className="w-full h-full object-contain rounded-lg" alt="" /> : null}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-base font-black text-gray-900 uppercase tracking-tighter truncate">{t.symbol}</h3>
                                                {(t.isNewlyLaunched || t.trust_status === 'Newly Launched Token') && (
                                                    <span className="bg-cyan-500 text-white px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest leading-none">Newly Launched</span>
                                                )}
                                                {t.network && (
                                                    <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest leading-none">{t.network}</span>
                                                )}
                                            </div>
                                            {t.market_cap_rank && t.market_cap_rank !== 999999 && (
                                                <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg shrink-0">#{t.market_cap_rank}</span>
                                            )}
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">{t.name}</p>
                                        </div>
                                    </div>'''

new_card_inner = '''                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 bg-slate-50 rounded-xl p-3 border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-200 transition-all shrink-0 shadow-sm">
                                            {t.image ? <img src={t.image} className="w-full h-full object-contain rounded-lg" alt="" /> : null}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2.5 flex-wrap">
                                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter truncate">{t.symbol}</h3>
                                                {(t.isNewlyLaunched || t.trust_status === 'Newly Launched Token') && (
                                                    <span className="bg-cyan-500 text-white px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest leading-none shadow-sm">NEW</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                {t.market_cap_rank && t.market_cap_rank !== 999999 && (
                                                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">#{t.market_cap_rank}</span>
                                                )}
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{t.name}</p>
                                            </div>
                                        </div>
                                    </div>'''

content = content.replace(old_card_inner, new_card_inner)

with open(filepath, 'w') as f:
    f.write(content)

print("SUCCESS: Markets visibility redesign applied.")
