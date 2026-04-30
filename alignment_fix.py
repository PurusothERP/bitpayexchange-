import os

filepath = 'frontend/src/app/exchange/page.js'

with open(filepath, 'r') as f:
    content = f.read()

# 1. Fix Futures mode alignment (Header and Grid)
content = content.replace(
    'flex flex-wrap items-center gap-10 py-4 px-8 text-white',
    'grid grid-cols-2 lg:grid-cols-4 xl:flex xl:items-center justify-between gap-8 py-5 px-8 text-white'
)

# 2. Fix Order Book alignment (Ensure grid-cols-3 is consistent)
content = content.replace(
    'grid grid-cols-3 text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 px-2',
    'grid grid-cols-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-3'
)

# 3. Standardize inner card padding and structure
content = content.replace('p-12 relative', 'p-8 md:p-12 relative')
content = content.replace('p-8 md:p-12 relative', 'p-6 md:p-10 relative') # Slightly tighter for pro look

# 4. Fix responsive grid for Futures
content = content.replace(
    'grid grid-cols-1 xl:grid-cols-12 gap-4 min-h-[900px]',
    'flex flex-col xl:grid xl:grid-cols-12 gap-4 min-h-[900px]'
)

# 5. Fix AssetDetails alignment
content = content.replace(
    'className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-wrap items-center gap-10 py-4 px-8 text-white"',
    'className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl grid grid-cols-2 lg:grid-cols-5 items-center gap-6 py-6 px-8 text-white"'
)

# 6. Ensure Ticker Header in Spot mode is also aligned
content = content.replace(
    'flex flex-wrap items-center gap-6 md:gap-12 bg-white/5 p-4 md:p-6 border-b border-white/10 relative z-10',
    'grid grid-cols-2 md:grid-cols-4 lg:flex lg:items-center gap-6 bg-white/5 p-6 border-b border-white/10 relative z-10'
)

with open(filepath, 'w') as f:
    f.write(content)

print("SUCCESS: Comprehensive alignment fix applied.")
