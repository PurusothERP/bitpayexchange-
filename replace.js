const fs = require('fs');
const path = require('path');

function replaceInDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceInDirectory(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            const originalContent = content;
            
            // Replace remaining theme colors to Navy Blue/Slate
            content = content.replace(/-orange-/g, '-indigo-');
            content = content.replace(/-amber-/g, '-slate-');
            content = content.replace(/-emerald-/g, '-sky-');
            content = content.replace(/-rose-/g, '-blue-'); // Just in case any are left
            
            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated:', fullPath);
            }
        }
    }
}

replaceInDirectory(path.join(__dirname, 'frontend/src'));
console.log('Done replacing theme colors.');
