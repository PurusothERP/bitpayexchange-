import glob

def replace_theme():
    files = glob.glob('src/**/*.js', recursive=True)
    
    for filepath in files:
        with open(filepath, 'r') as f:
            content = f.read()

        # Update Backgrounds
        content = content.replace('bg-[#0a0a0a]', 'bg-[#040b16]')
        content = content.replace('bg-black/50', 'bg-[#040b16]/70')
        content = content.replace('bg-black/80', 'bg-[#040b16]/80')
        content = content.replace('bg-black/95', 'bg-[#040b16]/95')
        
        # Change Primary Color from Amber/Gold to Cyan/Teal
        content = content.replace('amber-500', 'cyan-400')
        content = content.replace('amber-600', 'cyan-500')
        content = content.replace('text-gold-gradient', 'text-cyan-gradient')
        
        # Keep some elements orange for the Doge accent if needed, but let's just make it cohesive cyan first
        # Replace Rocket icon with Beaker or Doge if we had one. (Lucide has 'FlaskConical')
        # Actually, let's replace "bg-amber-500 rounded-lg flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300" 
        # with an img tag for the logo if we find the Navbar
        
        with open(filepath, 'w') as f:
            f.write(content)

replace_theme()
