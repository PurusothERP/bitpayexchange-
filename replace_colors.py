import os

def replace_in_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    new_content = content.replace('-amber-', '-indigo-')
    new_content = new_content.replace('-orange-', '-slate-')
    new_content = new_content.replace('-emerald-', '-sky-')
    new_content = new_content.replace('-rose-', '-blue-')
    
    if content != new_content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

def process_dir(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.js') or file.endswith('.jsx'):
                replace_in_file(os.path.join(root, file))

if __name__ == '__main__':
    process_dir('frontend/src')
