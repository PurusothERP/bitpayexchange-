import os

filepath = 'frontend/src/app/exchange/page.js'

with open(filepath, 'r') as f:
    content = f.read()

# Refine Price Block Alignment
content = content.replace(
    '<div className="flex flex-wrap items-center gap-12">',
    '<div className="grid grid-cols-2 md:grid-cols-4 gap-x-12 gap-y-4">'
)

# Refine Order Book Data Alignment (Ensure columns are fixed-width or balanced)
content = content.replace(
    'grid grid-cols-3 text-[10px] font-black font-mono py-0.5 px-2 relative group hover:bg-white/5 cursor-pointer transition-colors',
    'grid grid-cols-3 text-[10px] font-black font-mono py-1 px-3 relative group hover:bg-white/5 cursor-pointer transition-colors border-l-2 border-transparent hover:border-indigo-500'
)

# Ensure consistent spacing in execution panel
content = content.replace('space-y-6 flex-1 overflow-y-auto no-scrollbar', 'space-y-6 p-1 flex-1 overflow-y-auto no-scrollbar')

with open(filepath, 'w') as f:
    f.write(content)

print("SUCCESS: Final alignment refinement applied.")
