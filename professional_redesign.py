import os
import re

filepath = 'frontend/src/app/exchange/page.js'

with open(filepath, 'r') as f:
    content = f.read()

# 1. Sharpen border radiuses
content = content.replace('rounded-[3rem]', 'rounded-2xl')
content = content.replace('rounded-[2.5rem]', 'rounded-2xl')
content = content.replace('rounded-3xl', 'rounded-xl')

# 2. Refine shadows to be subtle and institutional
content = content.replace('shadow-2xl shadow-gray-200/40', 'shadow-[0_8px_30px_rgb(0,0,0,0.04)]')
content = content.replace('shadow-2xl shadow-gray-100/50', 'shadow-[0_8px_30px_rgb(0,0,0,0.04)]')
content = content.replace('shadow-2xl shadow-indigo-600/20', 'shadow-lg shadow-indigo-500/20')
content = content.replace('shadow-3xl shadow-amber-900/5', 'shadow-xl shadow-slate-200/50')
content = content.replace('shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)]', 'shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)]')
content = content.replace('shadow-[0_70px_120px_-20px_rgba(0,0,0,0.2)]', 'shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)]')

# 3. Compact massive buttons / tabs for a denser, pro feel
content = content.replace('px-10 py-5', 'px-6 py-3.5')
content = content.replace('p-12', 'p-8')
content = content.replace('p-8 md:p-12', 'p-6 md:p-8')

# 4. Color tuning: Use Slate instead of flat Gray for a cooler, technical tone
content = content.replace('bg-gray-50', 'bg-slate-50')
content = content.replace('border-gray-100', 'border-slate-200/60')
content = content.replace('text-gray-400', 'text-slate-400')
content = content.replace('text-gray-900', 'text-slate-900')

# 5. Fix uppercase tracking to be more readable
content = content.replace('tracking-[0.4em]', 'tracking-widest')
content = content.replace('tracking-[0.3em]', 'tracking-wider')
content = content.replace('tracking-[0.2em]', 'tracking-wide')

with open(filepath, 'w') as f:
    f.write(content)

print("SUCCESS: Professional styling applied.")
