import os

filepath = 'frontend/src/app/exchange/page.js'

with open(filepath, 'r') as f:
    content = f.read()

# 1. Update Header Theme to Navy/Indigo
content = content.replace('bg-amber-500', 'bg-indigo-600')
content = content.replace('text-amber-500', 'text-indigo-600')
content = content.replace('border-amber-200', 'border-indigo-200')
content = content.replace('shadow-amber-500/20', 'shadow-indigo-500/20')
content = content.replace('animate-gold-wave', 'animate-pulse')

# 2. Update Navbar/Mode Buttons to Navy
content = content.replace(
    'bg-gray-900 text-white shadow-2xl', 
    'bg-indigo-700 text-white shadow-lg shadow-indigo-100 border border-indigo-800'
)

# 3. Fix the "Lengthy" issue in Futures (Pro mode)
# Change h-[1150px] to a viewport-relative height
content = content.replace(
    '<div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-[1150px]">',
    '<div className="grid grid-cols-1 xl:grid-cols-12 gap-4 h-[calc(100vh-250px)] min-h-[600px] overflow-hidden">'
)

# 4. Ensure internal columns in Futures scroll instead of the page
content = content.replace(
    '<div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">',
    '<div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1 h-[calc(100vh-400px)]">'
)

with open(filepath, 'w') as f:
    f.write(content)

print("SUCCESS: Navy Blue theme restored. Layout height locked to viewport.")
