import os

filepath = 'frontend/src/app/exchange/page.js'

with open(filepath, 'r') as f:
    content = f.read()

# Comprehensive color swap: Amber -> Indigo (Navy theme)
replacements = {
    'amber-500': 'indigo-500',
    'amber-600': 'indigo-600',
    'amber-400': 'indigo-400',
    'amber-300': 'indigo-300',
    'amber-200': 'indigo-200',
    'amber-100': 'indigo-100',
    'amber-50': 'indigo-50',
    'amber-900': 'indigo-900'
}

for old, new in replacements.items():
    content = content.replace(old, new)

with open(filepath, 'w') as f:
    f.write(content)

print("SUCCESS: Global theme colors swapped to Indigo.")
