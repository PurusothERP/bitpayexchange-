import sys
import re

def check_tags(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Very basic JSX tag matcher (won't handle all cases but good for quick check)
    # We look for <Tag and </Tag>
    # Ignore self-closing tags <Tag />
    
    # This is a bit hard to do perfectly with regex, so let's just count some common ones
    tags = ['div', 'section', 'main', 'p', 'span', 'h2', 'h3', 'h4', 'h5', 'motion.div', 'AnimatePresence', 'Link', 'LinkIcon', 'a', 'button', 'input', 'table', 'thead', 'tbody', 'tr', 'th', 'td']
    
    for tag in tags:
        open_count = len(re.findall(f'<{tag}[>\s]', content))
        close_count = len(re.findall(f'</{tag}>', content))
        if open_count != close_count:
            print(f"Mismatch for <{tag}>: {open_count} open, {close_count} close")

if __name__ == "__main__":
    check_tags(sys.argv[1])
