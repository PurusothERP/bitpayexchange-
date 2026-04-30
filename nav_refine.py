import re

filepath = 'frontend/src/app/exchange/page.js'
with open(filepath, 'r') as f:
    content = f.read()

# Make the navbar container sleeker
content = content.replace(
    'className="flex flex-wrap gap-3 p-4 bg-white/60 backdrop-blur-3xl shadow-[0_45px_100px_-20px_rgba(0,0,0,0.15)] rounded-2xl border border-white items-center justify-center transition-all duration-300 mt-12 xl:mt-0"',
    'className="flex flex-wrap gap-1.5 p-2 bg-slate-50/80 backdrop-blur-3xl shadow-sm rounded-2xl border border-slate-200/50 items-center justify-center transition-all duration-300 mt-12 xl:mt-0"'
)

# Standardize nav button padding and font weight
content = content.replace('px-6 py-3.5 rounded-xl', 'px-5 py-2.5 rounded-[14px]')
content = content.replace('font-black uppercase', 'font-bold uppercase')

# Update active/inactive states for the buttons
# e.g., 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
# We will use regex to find and replace the generic button classes.

def clean_nav_button(match):
    full_str = match.group(0)
    # Simplify shadows and borders on active state
    full_str = re.sub(r'bg-indigo-\d+ text-white shadow-[\w-]+ shadow-[\w/-]+ (?:border border-[\w-]+ )?(?:scale-105 )?(?:px-12 )?', 'bg-white text-slate-900 shadow-sm border border-slate-200/80 ', full_str)
    
    # Other colored active states (like blue-500, emerald-600) -> unified professional style
    full_str = re.sub(r'bg-blue-500 text-white shadow-[\w-]+ shadow-[\w/-]+ scale-105', 'bg-white text-slate-900 shadow-sm border border-slate-200/80', full_str)
    full_str = re.sub(r'bg-purple-500 text-white shadow-[\w-]+ shadow-[\w/-]+ scale-105', 'bg-white text-slate-900 shadow-sm border border-slate-200/80', full_str)
    
    # Inactive state
    full_str = full_str.replace('text-slate-400 hover:text-slate-900 hover:bg-slate-50', 'text-slate-500 hover:text-slate-900 hover:bg-white/50')
    
    # Drop the inner absolute pulse backgrounds
    full_str = re.sub(r'<div className="absolute inset-0 bg-[\w-]+/\d+ rounded-full animate-pulse" />', '', full_str)
    
    return full_str

content = re.sub(r'<button[^>]*onClick=\{\(\) => setMode.*?</button>', clean_nav_button, content, flags=re.DOTALL)

with open(filepath, 'w') as f:
    f.write(content)

print("SUCCESS: Refined navigation tab bar.")
