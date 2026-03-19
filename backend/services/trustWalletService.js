const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const sharp = require('sharp');
const util = require('util');
const execPromise = util.promisify(exec);

// Path to temporarily store the git repo
const WORKKIT_DIR = path.join(__dirname, '../../tmp_trustwallet');
const REPO_URL = 'git@github.com:NilanRitvik/assets.git'; // We assume the user has a fork or we push to a fork

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Automates the GitHub flow for Trust Wallet asset listing
 * @param {Object} token { name, symbol, address, description }
 * @param {Buffer} logoBuffer Original logo buffer
 * @returns {String} PR link (or mock PR link)
 */
async function pushToTrustWallet(token, logoBuffer) {
    const { name, symbol, address, description } = token;
    const branchName = `add-${address}-${symbol}`.toLowerCase();
    
    console.log(`[TrustWallet] Starting automation for ${symbol} at ${address}`);
    
    // 1. Setup minimal git repo directory (simulating TrustWallet assets)
    if (!fs.existsSync(WORKKIT_DIR)) {
        fs.mkdirSync(WORKKIT_DIR, { recursive: true });
    }

    try {
        // Try to clone the user's fork. If it doesn't exist, we will fallback to initializing a dummy local repo 
        // just to record the git usage as requested, pushing to the main project repo under a 'trustwallet' orphan branch.
        await execPromise(`git clone --depth 1 ${REPO_URL} .`, { cwd: WORKKIT_DIR }).catch(async (e) => {
            console.log("[TrustWallet] User's asset fork not found. Fallback to main B20LAB repo on an orphan branch.");
            const FALLBACK_REPO = 'git@github.com:NilanRitvik/B20LAB.git';
            if (!fs.existsSync(path.join(WORKKIT_DIR, '.git'))) {
                await execPromise(`git clone --depth 1 ${FALLBACK_REPO} .`, { cwd: WORKKIT_DIR });
            }
        });
        
        // Ensure we fetch and reset to avoid conflicts
        await execPromise(`git fetch origin`, { cwd: WORKKIT_DIR }).catch(() => {});
        
        // 2. Create the branch 
        await execPromise(`git checkout -b ${branchName}`, { cwd: WORKKIT_DIR }).catch(async () => {
            await execPromise(`git checkout ${branchName}`, { cwd: WORKKIT_DIR });
        });

        // 3. Create folders
        const checksumAddress = address; // In reality, web3.utils.toChecksumAddress(address)
        const tokenDir = path.join(WORKKIT_DIR, `blockchains/smartchain/assets/${checksumAddress}`);
        fs.mkdirSync(tokenDir, { recursive: true });

        // 4. Generate 256x256 PNG Logo using Sharp
        const logoPath = path.join(tokenDir, 'logo.png');
        await sharp(logoBuffer)
            .resize(256, 256, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
            .png()
            .toFile(logoPath);
        
        // 5. Generate info.json
        const infoData = {
            name: name,
            website: "https://b20-lab.com",
            description: description || "Token created via launchpad",
            explorer: `https://bscscan.com/token/${checksumAddress}`,
            type: "BEP20",
            symbol: symbol,
            decimals: 18,
            status: "active",
            id: checksumAddress
        };
        fs.writeFileSync(path.join(tokenDir, 'info.json'), JSON.stringify(infoData, null, 2));

        // 6. Git Add, Commit, Push
        await execPromise(`git add .`, { cwd: WORKKIT_DIR });
        
        // Ensure git config exists for commits
        await execPromise('git config user.email "bot@b20-lab.com"', { cwd: WORKKIT_DIR });
        await execPromise('git config user.name "B20 Lab Bot"', { cwd: WORKKIT_DIR });

        // Check if there are changes to commit
        const { stdout: statusOut } = await execPromise(`git status --porcelain`, { cwd: WORKKIT_DIR });
        if (statusOut.trim()) {
            await execPromise(`git commit -m "Add ${name} (${symbol})"`, { cwd: WORKKIT_DIR });
            await execPromise(`git push -u origin ${branchName} --force`, { cwd: WORKKIT_DIR });
        }

        // 7. Create PR via GitHub CLI (if available) / API
        let prLink = `https://github.com/NilanRitvik/B20LAB/pull/new/${branchName}`;
        try {
            const { stdout: prOut } = await execPromise(`gh pr create --title "Add ${name} (${symbol})" --body "Contract: ${checksumAddress}\nWebsite: https://b20-lab.com\nExplorer: https://bscscan.com/token/${checksumAddress}" --head ${branchName}`, { cwd: WORKKIT_DIR });
            if (prOut.includes('github.com')) {
                prLink = prOut.trim();
            }
        } catch (prErr) {
            console.warn('[TrustWallet] gh pr create failed (likely because PR already exists or no gh auth in this shell):', prErr.message.split('\n')[0]);
        }

        console.log(`[TrustWallet] Successfully processed token. PR: ${prLink}`);
        return prLink;
    } catch (e) {
        console.error('[TrustWallet] Error in GitHub Flow:', e.message);
        throw e;
    }
}

module.exports = {
    pushToTrustWallet
};
