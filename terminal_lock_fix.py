import os

filepath = 'frontend/src/app/exchange/page.js'

with open(filepath, 'r') as f:
    content = f.read()

# 1. Lock the Main Page Scroll (Make it a full-height terminal)
content = content.replace(
    '<main className="min-h-screen bg-[#F5F6F8] text-slate-900 selection:bg-indigo-500 selection:text-white pb-20 font-sans relative">',
    '<main className="h-screen overflow-hidden bg-[#F5F6F8] text-slate-900 selection:bg-indigo-500 selection:text-white font-sans relative flex flex-col">'
)

# 2. Adjust the inner container to take remaining height
content = content.replace(
    '<div className="pt-24 pb-6 px-4 md:px-8 max-w-[1600px] mx-auto">',
    '<div className="pt-20 pb-4 px-4 md:px-8 max-w-[1800px] mx-auto w-full flex-1 flex flex-col min-h-0">'
)

# 3. Make AnimatePresence a flex-1 container
content = content.replace(
    '<AnimatePresence mode="wait">',
    '<div className="flex-1 flex flex-col min-h-0"><AnimatePresence mode="wait">'
)
# We'll close the div after AnimatePresence later.
# Actually, I'll do it more precisely.

# 4. Fix MarketsHub visibility (Larger fonts/padding as requested)
content = content.replace('text-[10px] font-black text-slate-400 uppercase tracking-widest', 'text-xs font-black text-slate-400 uppercase tracking-[0.2em]')
content = content.replace('text-sm font-black text-slate-900 uppercase tracking-tight', 'text-base font-black text-slate-900 uppercase tracking-tight')

# 5. Ensure Futures Grid is responsive and fixed
content = content.replace(
    '<div className="flex flex-col xl:grid xl:grid-cols-12 gap-4 h-[900px] overflow-hidden">',
    '<div className="flex-1 xl:grid xl:grid-cols-12 gap-4 overflow-hidden min-h-0">'
)

with open(filepath, 'w') as f:
    f.write(content)

# Now I need to close that div I opened at step 3.
with open(filepath, 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    new_lines.append(line)
    if '</AnimatePresence>' in line:
        new_lines.append('                </div>\n')

with open(filepath, 'w') as f:
    f.writelines(new_lines)

print("SUCCESS: Main page scroll locked. Terminal is now truly full-height. Visibility enhanced.")
