import glob
import re

files = glob.glob('src/**/*.js', recursive=True)

for filepath in files:
    with open(filepath, 'r') as f:
        content = f.read()

    # Invert text colors
    content = content.replace('text-white', 'text-gray-900')
    content = content.replace('text-gray-200', 'text-gray-800')
    content = content.replace('text-gray-300', 'text-gray-700')
    content = content.replace('text-gray-400', 'text-gray-600')
    
    # Invert background colors
    content = content.replace('bg-black/80', 'bg-white/90')
    content = content.replace('bg-black/95', 'bg-white/95')
    content = content.replace('bg-black/40', 'bg-black/5')
    content = content.replace('bg-black/50', 'bg-white/80')
    content = content.replace('bg-black/60', 'bg-white/60')
    content = content.replace('bg-white/5', 'bg-black/5')
    content = content.replace('bg-white/10', 'bg-black/10')
    
    # Invert border colors
    content = content.replace('border-white/5', 'border-black/5')
    content = content.replace('border-white/10', 'border-black/10')
    content = content.replace('border-white/20', 'border-black/20')
    
    # Theme primary: Cyan -> Cherry Red (Rose)
    content = content.replace('cyan-400', 'rose-500')
    content = content.replace('cyan-500', 'rose-600')
    content = content.replace('text-cyan-gradient', 'text-red-gradient')
    content = content.replace('bg-cyan-gradient', 'bg-red-gradient')
    content = content.replace('shadow-cyan-400', 'shadow-rose-500')
    content = content.replace('shadow-cyan-500', 'shadow-rose-500')

    # Specifically make some elements gold, like the "Fair Launch" icons or secondary buttons
    # Wait, the user said "golden graphics". Let's inject amber into icons and certain borders.
    content = content.replace('text-rose-500 w-7 h-7', 'text-amber-500 w-7 h-7')
    content = content.replace('text-rose-500 w-6 h-6', 'text-amber-500 w-6 h-6')
    
    content = content.replace('bg-rose-500/10', 'bg-amber-500/10')
    content = content.replace('border-rose-500/20', 'border-amber-500/20')
    content = content.replace('shadow-rose-500/20', 'shadow-amber-500/20')

    # Revert text-black on primary buttons because buttons are red -> should be white
    content = content.replace('text-black', 'text-white')

    # Re-apply any specific dark mode backgrounds to full transparent if they interfere
    content = content.replace('bg-[#040814]', 'bg-transparent')
    
    # Specific layout fixes for light mode readability
    content = content.replace('text-white/10', 'text-black/10')
    content = content.replace('hover:text-cyan-500', 'hover:text-rose-600')

    with open(filepath, 'w') as f:
        f.write(content)

