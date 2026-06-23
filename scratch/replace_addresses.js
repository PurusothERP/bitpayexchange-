const fs = require('fs');
const path = require('path');

const REPLACEMENTS = [
    // Fee / Treasury Wallet
    { old: /0x6e10d0414d64e37668da38b19062e3c13471e806/gi, new: '0x6e10d0414d64e37668da38b19062e3c13471e806' },
    
    // Factory
    { old: /0x28533A2e05eF9e4Fea5d8724f073E967640A6760/gi, new: '0x28533A2e05eF9e4Fea5d8724f073E967640A6760' },
    { old: /0x28533A2e05eF9e4Fea5d8724f073E967640A6760/gi, new: '0x28533A2e05eF9e4Fea5d8724f073E967640A6760' },
    
    // Bonding Curve
    { old: /0x787288C5D305c9d8e118Ab5d36Ef06eecfEC1258/gi, new: '0x787288C5D305c9d8e118Ab5d36Ef06eecfEC1258' },
    { old: /0x787288C5D305c9d8e118Ab5d36Ef06eecfEC1258/gi, new: '0x787288C5D305c9d8e118Ab5d36Ef06eecfEC1258' },
    
    // Liquidity Manager
    { old: /0x0C19DF362892024b907dF223F70199f68D30521F/gi, new: '0x0C19DF362892024b907dF223F70199f68D30521F' },
    { old: /0x0C19DF362892024b907dF223F70199f68D30521F/gi, new: '0x0C19DF362892024b907dF223F70199f68D30521F' },

    // Direct Dex Factory
    { old: /0xBF64c60ba9C7D903Ba5Df7efc8949f0e7B3C7832/gi, new: '0xBF64c60ba9C7D903Ba5Df7efc8949f0e7B3C7832' },

    // CoinMarketCap API Key
    { old: /418d3f90804a41d5bc3e0dfa4278ace3/gi, new: '418d3f90804a41d5bc3e0dfa4278ace3' },

    // CoinGecko API Key
    { old: /CG-Lw5hZVvgRLEpJDKdcnq3Qywc/gi, new: 'CG-Lw5hZVvgRLEpJDKdcnq3Qywc' }
];

const IGNORE_DIRS = ['node_modules', '.git', '.next', 'out', 'artifacts', 'cache'];

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            if (!IGNORE_DIRS.includes(f)) {
                walkDir(dirPath, callback);
            }
        } else {
            callback(dirPath);
        }
    });
}

const targetDir = path.resolve(__dirname, '..');
console.log('Sweeping directory:', targetDir);

let fileCount = 0;
let replacedCount = 0;

walkDir(targetDir, (filePath) => {
    const ext = path.extname(filePath);
    if (!['.js', '.jsx', '.ts', '.tsx', '.json', '.yaml', '.md', '.css'].includes(ext)) {
        return;
    }
    
    fileCount++;
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    REPLACEMENTS.forEach(r => {
        if (r.old.test(content)) {
            content = content.replace(r.old, r.new);
            modified = true;
        }
    });
    
    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${path.relative(targetDir, filePath)}`);
        replacedCount++;
    }
});

console.log(`Scan complete. Checked ${fileCount} files, updated ${replacedCount} files.`);
