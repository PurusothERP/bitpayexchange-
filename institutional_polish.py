import os

filepath = 'frontend/src/app/exchange/page.js'

with open(filepath, 'r') as f:
    content = f.read()

# Professional Institutional Polish - Global Replacement
# 1. Standardize border radius for a modern terminal look
content = content.replace('rounded-[3rem]', 'rounded-2xl')
content = content.replace('rounded-[2.5rem]', 'rounded-xl')
content = content.replace('rounded-[2rem]', 'rounded-xl')
content = content.replace('rounded-[2.2rem]', 'rounded-xl')

# 2. Refine shadows (institutional style uses subtle depth, not bulky glows)
content = content.replace('shadow-3xl', 'shadow-xl')
content = content.replace('shadow-2xl shadow-gray-200/40', 'shadow-sm border-slate-100')
content = content.replace('shadow-[0_50px_100px_-10px_rgba(0,0,0,0.8)]', 'shadow-2xl')

# 3. Standardize Typography tracking and weights
content = content.replace('tracking-[0.4em]', 'tracking-[0.2em]')
content = content.replace('tracking-[0.3em]', 'tracking-[0.1em]')
content = content.replace('tracking-[0.5em]', 'tracking-[0.2em]')

# 4. Refine AssetDetails Header (Navy instead of Gray-900 for consistency)
content = content.replace('bg-gray-900 p-8 text-white', 'bg-slate-900 p-8 text-white')

# 5. Fix any remaining "small" text that might have been missed or added back
# Specifically checking common patterns
content = content.replace('text-[10px] font-black', 'text-xs font-bold')
content = content.replace('text-[11px] font-bold', 'text-xs font-bold')
content = content.replace('text-[9px] font-black', 'text-xs font-bold')

with open(filepath, 'w') as f:
    f.write(content)

print("SUCCESS: Global institutional polish applied.")
