import os

filepath = 'frontend/src/app/exchange/page.js'

with open(filepath, 'r') as f:
    content = f.read()

# 1. Rename Terminal Title
content = content.replace('Exchange Terminal.', 'Crypto Exchange Terminal.')

# 2. Global Font Size Upgrade for Visibility
# text-[8px] -> text-[11px] (Still small but readable)
# text-[9px] -> text-xs (12px)
# text-[10px] -> text-xs font-bold
# text-[11px] -> text-sm

content = content.replace('text-[8px]', 'text-[11px]')
content = content.replace('text-[9px]', 'text-xs')
content = content.replace('text-[10px]', 'text-xs font-bold')
content = content.replace('text-[11px]', 'text-sm')

# 3. Specific fix for bulky icons and sections that might still be small
content = content.replace('uppercase tracking-[0.2em]', 'uppercase tracking-[0.1em] font-black') # Less spaced, more weight
content = content.replace('text-gray-400', 'text-slate-500') # Darker gray for better contrast
content = content.replace('text-slate-400', 'text-slate-500')

with open(filepath, 'w') as f:
    f.write(content)

print("SUCCESS: Global renaming and visibility upgrades applied.")
