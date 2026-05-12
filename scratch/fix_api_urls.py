import os
import re

TARGET_DIR = '/Users/purusothaman/Desktop/myfinal/frontend/src'
SEARCH_PATTERN = r"(const|let|var)\s+API_URL\s*=\s*process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*'http://localhost:3001/api';"
REPLACEMENT = "import { API_URL } from '@/lib/api';"

# Also handle the commented out ones and slightly different variations
PATTERNS = [
    r"const\s+API_URL\s*=\s*process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*'http://localhost:3001/api';",
    r"//\s*const\s+API_URL\s*=\s*process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*'http://localhost:3001/api';",
    r"const\s+API_URL\s*=\s*isProd\s*\?\s*'https://b20final-backend\.onrender\.com/api'\s*:\s*\(process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*'http://localhost:3001/api'\);"
]

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    new_content = content
    modified = False
    
    # Check if already imported
    if "from '@/lib/api'" in content and "API_URL" in content:
        # Just remove the local definitions if they exist
        for pattern in PATTERNS:
            if re.search(pattern, content):
                new_content = re.sub(pattern, "", new_content)
                modified = True
    else:
        # Need to add import and remove definitions
        for pattern in PATTERNS:
            if re.search(pattern, content):
                new_content = re.sub(pattern, "", new_content)
                modified = True
        
        if modified:
            # Add import at the top after 'use client' if it exists, otherwise at the very top
            if "'use client'" in new_content or '"use client"' in new_content:
                new_content = re.sub(r"('use client'|\"use client\");?", r"\1;\nimport { API_URL } from '@/lib/api';", new_content, count=1)
            else:
                new_content = "import { API_URL } from '@/lib/api';\n" + new_content

    if modified:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Fixed: {filepath}")

for root, dirs, files in os.walk(TARGET_DIR):
    for file in files:
        if file.endswith('.js') or file.endswith('.tsx'):
            fix_file(os.path.join(root, file))
