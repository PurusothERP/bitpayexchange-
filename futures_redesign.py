import os

filepath = 'frontend/src/app/exchange/page.js'

with open(filepath, 'r') as f:
    content = f.read()

# Professional Futures Trading Platform Redesign
old_pro_block_start = "{mode === 'pro' && ("
# I will search for the entire block and replace it.

new_pro_block = '''                    {mode === 'pro' && (
                        <motion.div 
                            key="pro"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col gap-4 pb-20 select-none"
                        >
                            {/* ── Institutional Ticker Header ─── */}
                            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-wrap items-center gap-10 py-4 px-8 text-white">
                                <div className="flex items-center gap-6">
                                    <div className="w-12 h-12 bg-white/5 rounded-xl p-2 border border-white/10 shadow-inner">
                                        {toToken?.image ? <img src={toToken.image} className="w-full h-full object-contain" alt="" /> : null}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h1 className="text-xl font-black tracking-tighter">{toToken?.symbol}/USDT</h1>
                                            <span className="text-[10px] font-black bg-indigo-600 px-2 py-0.5 rounded-md uppercase tracking-widest">Perpetual</span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Institutional Execution Hub</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-12">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Index Price</p>
                                        <p className={`text-lg font-black font-mono tracking-tighter ${(toToken?.price_change_percentage_24h||0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            ${(toToken?.current_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                                        </p>
                                    </div>
                                    <div className="hidden sm:block">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">24h Change</p>
                                        <p className={`text-sm font-black font-mono ${(toToken?.price_change_percentage_24h||0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {(toToken?.price_change_percentage_24h||0) >= 0 ? '+' : ''}{(toToken?.price_change_percentage_24h||0).toFixed(2)}%
                                        </p>
                                    </div>
                                    <div className="hidden md:block">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">24h High</p>
                                        <p className="text-sm font-black font-mono text-white">${(toToken?.high_24h || 0).toFixed(2)}</p>
                                    </div>
                                    <div className="hidden lg:block">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Funding / Countdown</p>
                                        <p className="text-sm font-black font-mono text-indigo-400">0.0100% / 06:12:45</p>
                                    </div>
                                </div>

                                <div className="ml-auto flex items-center gap-4">
                                    <div className="flex bg-white/5 border border-white/10 px-4 py-2 rounded-lg gap-3 items-center">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Feed: Low Latency</span>
                                    </div>
                                </div>
                            </div>

                            {/* ── Main Trading Interface ─── */}
                            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 min-h-[900px]">
                                
                                {/* Market Selector (Left) */}
                                <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-sm">
                                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                        <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Market Pairs</h3>
                                        <Search className="w-3.5 h-3.5 text-slate-400" />
                                    </div>
                                    <div className="p-3 border-b border-slate-100">
                                        <input 
                                            type="text" placeholder="Filter..." value={marketSearch} onChange={(e) => setMarketSearch(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold outline-none focus:border-indigo-400 transition-all"
                                        />
                                    </div>
                                    <div className="flex-1 overflow-y-auto no-scrollbar p-1 space-y-0.5">
                                        {displayTokens.slice(0, 100).map(t => (
                                            <button 
                                                key={t.id || t.address} onClick={() => setToToken(t)}
                                                className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-all ${toToken?.id === t.id ? 'bg-indigo-50 border-indigo-100' : 'hover:bg-slate-50 border-transparent'}`}
                                            >
                                                <div className="text-left">
                                                    <p className="text-xs font-black uppercase tracking-tight text-slate-900">{t.symbol}/USDT</p>
                                                    <p className="text-[10px] font-bold text-slate-400">{formatB20Number(t.total_volume)}</p>
                                                </div>
                                                <p className={`text-xs font-black font-mono ${(t.price_change_percentage_24h||0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {(t.price_change_percentage_24h||0).toFixed(1)}%
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Main Chart & Positions (Center) */}
                                <div className="xl:col-span-7 flex flex-col gap-4">
                                    <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden min-h-[600px]">
                                        <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                {['1m', '5m', '15m', '1h', '4h', '1D'].map(tf => (
                                                    <button key={tf} className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${tf === '1h' ? 'bg-white shadow-sm text-slate-900 border border-slate-200' : 'text-slate-500 hover:text-slate-900'}`}>{tf}</button>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <CandlestickChart className="w-4 h-4 text-indigo-600" />
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">TradingView Terminal</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 w-full bg-slate-50">
                                            {toToken && <TradingViewChart symbol={`${toToken.symbol}USDT`} theme="light" />}
                                        </div>
                                    </div>

                                    {/* Bottom Positions Table */}
                                    <div className="h-[280px] bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
                                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Active Positions ({openPositions.length})</h3>
                                            <button className="text-[10px] font-black text-rose-600 hover:bg-rose-50 px-3 py-1 rounded-md transition-all uppercase">Close All</button>
                                        </div>
                                        <div className="flex-1 overflow-auto no-scrollbar">
                                            {openPositions.length === 0 ? (
                                                <div className="h-full flex flex-col items-center justify-center opacity-30 italic text-xs font-bold font-bold text-slate-400 py-10 uppercase tracking-widest">No active perpetual positions</div>
                                            ) : (
                                                <table className="w-full text-left border-collapse">
                                                    <thead className="sticky top-0 bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">
                                                        <tr>
                                                            <th className="px-6 py-3">Market</th>
                                                            <th className="px-6 py-3">Size</th>
                                                            <th className="px-6 py-3">Entry/Mark</th>
                                                            <th className="px-6 py-3">Liq. Price</th>
                                                            <th className="px-6 py-3">Unrealized PnL</th>
                                                            <th className="px-6 py-3 text-right">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {openPositions.map(p => (
                                                            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`w-1.5 h-1.5 rounded-full ${p.type === 'long' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                                        <span className="text-xs font-black uppercase">{p.tokenSymbol}/USDT</span>
                                                                        <span className="text-[9px] font-black bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 uppercase">{p.leverage}X</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-xs font-bold font-mono text-slate-900">{p.size} {p.tokenSymbol}</td>
                                                                <td className="px-6 py-4 text-xs font-bold font-mono text-slate-600">${p.entryPrice} / ${toToken?.current_price?.toFixed(2)}</td>
                                                                <td className="px-6 py-4 text-xs font-bold font-mono text-rose-600">${p.liqPrice}</td>
                                                                <td className={`px-6 py-4 text-xs font-black font-mono ${p.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                    {p.pnl >= 0 ? '+' : ''}{p.pnl.toFixed(2)} USDT ({p.pnlPercent.toFixed(2)}%)
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <button className="text-xs font-black text-indigo-600 hover:underline uppercase">Market Close</button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Order Book & Execution (Right) */}
                                <div className="xl:col-span-3 flex flex-col gap-4">
                                    {/* Order Book */}
                                    <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-2xl">
                                        <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                                            <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Order Book</h3>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live Flow</span>
                                        </div>
                                        <div className="flex-1 p-4 flex flex-col">
                                            <div className="grid grid-cols-3 text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 px-2">
                                                <span>Price</span>
                                                <span className="text-right">Size</span>
                                                <span className="text-right">Sum</span>
                                            </div>
                                            <div className="flex-1 flex flex-col justify-between overflow-hidden">
                                                <div className="space-y-0.5">
                                                    {orderBookData.asks.slice(0, 12).reverse().map((a, i) => (
                                                        <div key={`ask-${i}`} className="grid grid-cols-3 text-[10px] font-black font-mono py-0.5 px-2 relative group hover:bg-white/5 cursor-pointer transition-colors">
                                                            <span className="text-rose-400 z-10">${a.price.toFixed(toToken?.current_price < 1 ? 6 : 2)}</span>
                                                            <span className="text-slate-300 text-right z-10">{a.amount.toFixed(3)}</span>
                                                            <span className="text-slate-500 text-right z-10">{a.cumulative.toFixed(1)}</span>
                                                            <div className="absolute inset-y-0 right-0 bg-rose-500/10 transition-all duration-500" style={{ width: `${(a.cumulative / orderBookData.maxVolume) * 100}%` }} />
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="py-4 my-2 border-y border-white/5 bg-white/5 rounded-lg text-center">
                                                    <span className={`text-xl font-black font-mono italic ${(toToken?.price_change_percentage_24h||0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        ${toToken?.current_price?.toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="space-y-0.5">
                                                    {orderBookData.bids.slice(0, 12).map((b, i) => (
                                                        <div key={`bid-${i}`} className="grid grid-cols-3 text-[10px] font-black font-mono py-0.5 px-2 relative group hover:bg-white/5 cursor-pointer transition-colors">
                                                            <span className="text-emerald-400 z-10">${b.price.toFixed(toToken?.current_price < 1 ? 6 : 2)}</span>
                                                            <span className="text-slate-300 text-right z-10">{b.amount.toFixed(3)}</span>
                                                            <span className="text-slate-500 text-right z-10">{b.cumulative.toFixed(1)}</span>
                                                            <div className="absolute inset-y-0 right-0 bg-emerald-500/10 transition-all duration-500" style={{ width: `${(b.cumulative / orderBookData.maxVolume) * 100}%` }} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Execution Panel */}
                                    <div className="h-[480px] bg-white border border-slate-200 rounded-xl shadow-xl p-6 flex flex-col">
                                        <div className="flex bg-slate-100 p-1 rounded-lg mb-6 border border-slate-200">
                                            <button onClick={() => setTradeSide('long')} className={`flex-1 py-3 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${tradeSide === 'long' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}>Buy / Long</button>
                                            <button onClick={() => setTradeSide('short')} className={`flex-1 py-3 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${tradeSide === 'short' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}>Sell / Short</button>
                                        </div>

                                        <div className="space-y-6 flex-1 overflow-y-auto no-scrollbar">
                                            <div className="space-y-2">
                                                <div className="flex justify-between px-1">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Mode</span>
                                                    <span className="text-[10px] font-black text-indigo-600 uppercase">Cross / 20x</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button onClick={() => setOrderType('market')} className={`py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${orderType === 'market' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-slate-300'}`}>Market</button>
                                                    <button onClick={() => setOrderType('limit')} className={`py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${orderType === 'limit' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-slate-300'}`}>Limit</button>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex justify-between px-1">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Size ({toToken?.symbol})</span>
                                                    <span className="text-[10px] font-black text-slate-900 uppercase">Avail: 14.5 BNB</span>
                                                </div>
                                                <div className="relative group">
                                                    <input 
                                                        type="number" value={orderSize} onChange={(e) => setOrderSize(e.target.value)}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-5 text-lg font-black text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all font-mono"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-4 pt-2">
                                                <div className="flex justify-between items-end px-1">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Leverage</span>
                                                    <span className="text-lg font-black text-slate-900 italic">{leverage}X</span>
                                                </div>
                                                <input 
                                                    type="range" min="1" max="100" value={leverage} onChange={(e) => setLeverage(e.target.value)}
                                                    className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-slate-900" 
                                                />
                                                <div className="flex justify-between px-1">
                                                    {[1, 25, 50, 75, 100].map(val => (
                                                        <button key={val} onClick={() => setLeverage(val)} className="text-[9px] font-black text-slate-400 hover:text-slate-900 transition-colors">{val}x</button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={executePerpetualTrade}
                                            disabled={swapStatus === 'loading'}
                                            className={`w-full py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl ${tradeSide === 'long' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'} text-white active:scale-95`}
                                        >
                                            {swapStatus === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : (tradeSide === 'long' ? 'Open Long' : 'Open Short')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}'''

# Targeted replacement of the entire mode === 'pro' block
start_marker = "{mode === 'pro' && ("
end_marker = "                    )}" # The end of the block

# We need to find the correct matching parenthesis. Since the file is huge and has many nested blocks,
# I'll use a more precise replacement by finding the start and the specific content I saw earlier.

# I will use a regex-like approach in Python to replace the block.
import re

# Find the start of the block
start_idx = content.find(start_marker)
if start_idx != -1:
    # Find the end of the motion.div or the closing ) of the mode block
    # Given the previous view_file, the block ends around line 1750.
    # I'll search for the next mode block or the end of the AnimatePresence.
    end_idx = content.find("{mode === 'b20ai' && (", start_idx)
    if end_idx == -1:
         # Fallback if b20ai isn't found
         end_idx = content.find("</AnimatePresence>", start_idx)
    
    if end_idx != -1:
        # We need to preserve the start of the next block
        content = content[:start_idx] + new_pro_block + "\\n\\n                    " + content[end_idx:]

with open(filepath, 'w') as f:
    f.write(content)

print("SUCCESS: Futures trading platform redesigned.")
