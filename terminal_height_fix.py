import os

filepath = 'frontend/src/app/exchange/page.js'

with open(filepath, 'r') as f:
    content = f.read()

# 1. Fix the Futures Mode Container to be FIXED HEIGHT (Terminal Style)
# This prevents the "lengthy" layout that the user hates.
content = content.replace(
    'className="flex flex-col xl:grid xl:grid-cols-12 gap-4 max-h-[900px] overflow-hidden"',
    'className="flex flex-col xl:grid xl:grid-cols-12 gap-4 h-[900px] overflow-hidden"'
)

# 2. Fix the Sidebar (Market Selector) - Column 1
# Ensure it fits the container and has a scrollable list.
content = content.replace(
    '<div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-sm max-h-[900px]">',
    '<div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-sm h-full">'
)

# 3. Fix the Center Section (Chart & Positions) - Column 2
# The chart should take most height, and positions should be scrollable.
content = content.replace(
    '<div className="xl:col-span-7 flex flex-col gap-4">',
    '<div className="xl:col-span-7 flex flex-col gap-4 h-full overflow-hidden">'
)

content = content.replace(
    '<div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden min-h-[600px]">',
    '<div className="flex-[3] bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden min-h-0">'
)

content = content.replace(
    '<div className="h-[250px] bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">',
    '<div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden min-h-0">'
)

# 4. Fix the Right Section (Order Book & Execution) - Column 3
content = content.replace(
    '<div className="xl:col-span-3 flex flex-col gap-4">',
    '<div className="xl:col-span-3 flex flex-col gap-4 h-full overflow-hidden">'
)

# Make the execution panel scrollable if it's too tall
content = content.replace(
    '<div className="h-[480px] bg-white border border-slate-200 rounded-xl shadow-xl p-6 flex flex-col">',
    '<div className="h-[480px] bg-white border border-slate-200 rounded-xl shadow-xl p-6 flex flex-col overflow-y-auto no-scrollbar shrink-0">'
)

# 5. Fix the MarketsHub Table Height (It was also likely lengthy)
content = content.replace(
    '<div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">',
    '<div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-[700px] flex flex-col">'
)

content = content.replace(
    '<div className="overflow-x-auto">',
    '<div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1">'
)

with open(filepath, 'w') as f:
    f.write(content)

print("FIXED: Terminal height locked to 900px. All sub-sections are now scrollable internally.")
