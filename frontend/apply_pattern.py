import glob

files = glob.glob('src/**/*.js', recursive=True)

for filepath in files:
    with open(filepath, 'r') as f:
        content = f.read()

    # Apply paw-pattern to main containers
    content = content.replace('bg-[#040b16]', 'paw-pattern')
    
    # Navbar Logo Replacement
    if 'Navbar.js' in filepath:
        old_logo_html = """<div className="w-10 h-10 bg-cyan-400 rounded-lg flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300">
                                <Rocket className="text-black w-6 h-6" />
                            </div>"""
        new_logo_html = """<div className="w-12 h-12 rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 overflow-hidden bg-white/5 border border-cyan-500/20 p-1 shadow-lg shadow-cyan-500/20">
                                <img src="/logo.png" alt="B20-LAB Logo" className="w-full h-full object-contain" />
                            </div>"""
        content = content.replace(old_logo_html, new_logo_html)
        
        # Make the brand text look cooler
        content = content.replace('text-2xl font-bold tracking-tighter text-white', 'text-2xl font-black tracking-tighter text-white text-cyan-gradient drop-shadow-md')

    with open(filepath, 'w') as f:
        f.write(content)

