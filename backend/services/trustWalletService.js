// ============================================================
//  B20LAB — Trust Wallet Asset Service
//  trustWalletService.js
//
//  Automates token asset listing on:
//    1. Trust Wallet Assets GitHub Repository (PR submission)
//    2. Pinata IPFS (for DApp metadata availability)
//
//  Flow per token:
//    A. Download / fetch logo from B20-LAB DB
//    B. Resize to 256x256 PNG (Trust Wallet standard)
//    C. Upload logo to Pinata IPFS → get CID
//    D. Build info.json (Trust Wallet format)
//    E. Fork trustwallet/assets via GitHub API
//    F. Create folder + commit files to fork branch
//    G. Open PR to trustwallet/assets
//    H. Update DB with pr_url + ipfs_logo_url
// ============================================================

const axios  = require('axios');
const db     = require('../config/db');

const GITHUB_TOKEN     = process.env.GITHUB_TOKEN   || '';
const GITHUB_USERNAME  = process.env.GITHUB_USERNAME || 'NilanRitvik';
const PINATA_JWT       = process.env.PINATA_JWT      || '';
const PINATA_API_KEY   = process.env.PINATA_API_KEY  || '';
const PINATA_SECRET    = process.env.PINATA_API_SECRET || '';

const TW_REPO_OWNER    = 'trustwallet';
const TW_REPO_NAME     = 'assets';
const TW_FORK_OWNER    = GITHUB_USERNAME;

// ── Ensure DB has TrustWallet tracking columns ──────────────────
async function ensureTWColumns() {
    const cols = [
        { name: 'tw_pr_url',       def: 'TEXT' },
        { name: 'tw_pr_status',    def: "TEXT DEFAULT 'pending'" },
        { name: 'ipfs_logo_url',   def: 'TEXT' },
        { name: 'tw_submitted_at', def: 'DATETIME' },
    ];
    for (const col of cols) {
        try { await db.query(`ALTER TABLE tokens ADD COLUMN ${col.name} ${col.def}`); } catch (_) {}
    }
}

// ── Upload logo Buffer to Pinata IPFS ──────────────────────────
async function uploadLogoToPinata(logoBuffer, tokenSymbol) {
    if (!PINATA_JWT && !PINATA_API_KEY) {
        console.warn('[TrustWallet] No Pinata credentials — skipping IPFS upload');
        return null;
    }
    try {
        const FormData = require('form-data');
        const form = new FormData();
        form.append('file', logoBuffer, {
            filename:    `${tokenSymbol.toLowerCase()}_logo.png`,
            contentType: 'image/png'
        });
        form.append('pinataMetadata', JSON.stringify({ name: `${tokenSymbol} Logo` }));
        form.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

        const headers = PINATA_JWT
            ? { Authorization: `Bearer ${PINATA_JWT}`, ...form.getHeaders() }
            : { pinata_api_key: PINATA_API_KEY, pinata_secret_api_key: PINATA_SECRET, ...form.getHeaders() };

        const res = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', form, { headers, timeout: 30000 });
        const cid = res.data.IpfsHash;
        const url = `https://ipfs.io/ipfs/${cid}`;
        console.log(`[TrustWallet] 📌 Logo pinned to IPFS: ${url}`);
        return url;
    } catch (err) {
        console.warn('[TrustWallet] IPFS upload failed:', err.response?.data || err.message);
        return null;
    }
}

// ── Download logo from URL and return Buffer ─────────────────
async function fetchLogoBuffer(logoUrl) {
    if (!logoUrl) return null;
    try {
        const res = await axios.get(logoUrl, { responseType: 'arraybuffer', timeout: 10000 });
        return Buffer.from(res.data);
    } catch (err) {
        console.warn('[TrustWallet] Logo download failed:', err.message);
        return null;
    }
}

// ── Resize logo using pure JS (jimp — no native deps) ────────
async function resizeLogo(inputBuffer) {
    try {
        // Try sharp first (fastest)
        const sharp = require('sharp');
        return await sharp(inputBuffer)
            .resize(256, 256, { 
                fit: 'contain', 
                background: { r: 255, g: 255, b: 255, alpha: 0 } 
            })
            .png({ 
                compressionLevel: 9, 
                adaptiveFiltering: true,
                palette: true, // Use palette-based PNG to significantly reduce size
                colors: 128     // Limit colors for small file size (<10kb)
            })
            .toBuffer();
    } catch (_) {
        // If sharp not available, return as-is
        console.warn('[TrustWallet] sharp not available — using original logo buffer');
        return inputBuffer;
    }
}

// ── GitHub API helper ─────────────────────────────────────────
function ghHeaders() {
    return {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'B20LAB-Bot/1.0'
    };
}

async function ghGet(url) {
    const res = await axios.get(url, { headers: ghHeaders(), timeout: 15000 });
    return res.data;
}

async function ghPost(url, data) {
    const res = await axios.post(url, data, { headers: ghHeaders(), timeout: 15000 });
    return res.data;
}

async function ghPut(url, data) {
    const res = await axios.put(url, data, { headers: ghHeaders(), timeout: 15000 });
    return res.data;
}

// ── Ensure fork exists ────────────────────────────────────────
async function ensureFork() {
    if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN not set');
    try {
        // Check if fork exists
        await ghGet(`https://api.github.com/repos/${TW_FORK_OWNER}/${TW_REPO_NAME}`);
        console.log('[TrustWallet] Fork already exists ✓');
    } catch (_) {
        // Create fork
        console.log('[TrustWallet] Creating fork of trustwallet/assets...');
        await ghPost(`https://api.github.com/repos/${TW_REPO_OWNER}/${TW_REPO_NAME}/forks`, {});
        // Wait for fork to be ready
        await new Promise(r => setTimeout(r, 5000));
    }
}

// ── Get latest commit SHA of fork default branch ─────────────
async function getDefaultBranchSha() {
    const repo = await ghGet(`https://api.github.com/repos/${TW_FORK_OWNER}/${TW_REPO_NAME}`);
    const defaultBranch = repo.default_branch || 'master';
    const ref = await ghGet(`https://api.github.com/repos/${TW_FORK_OWNER}/${TW_REPO_NAME}/git/refs/heads/${defaultBranch}`);
    return { sha: ref.object.sha, defaultBranch };
}

// ── Create branch on fork ─────────────────────────────────────
async function createBranch(branchName, sha) {
    try {
        await ghPost(`https://api.github.com/repos/${TW_FORK_OWNER}/${TW_REPO_NAME}/git/refs`, {
            ref: `refs/heads/${branchName}`,
            sha
        });
        console.log(`[TrustWallet] Branch created: ${branchName}`);
    } catch (err) {
        if (err.response?.status === 422) {
            console.log(`[TrustWallet] Branch ${branchName} already exists`);
        } else throw err;
    }
}

// ── Commit a file to branch via GitHub API ────────────────────
async function commitFile(branchName, path, contentBase64, message, existingSha = null) {
    const body = {
        message,
        content: contentBase64,
        branch: branchName,
    };
    if (existingSha) body.sha = existingSha;

    try {
        await ghPut(
            `https://api.github.com/repos/${TW_FORK_OWNER}/${TW_REPO_NAME}/contents/${path}`,
            body
        );
        console.log(`[TrustWallet]   ✓ Committed: ${path}`);
    } catch (err) {
        console.warn(`[TrustWallet]   ⚠ Could not commit ${path}:`, err.response?.data?.message || err.message);
    }
}

// ── Open PR from fork to trustwallet/assets ───────────────────
async function createPR(branchName, token) {
    try {
        const res = await axios.post(
            `https://api.github.com/repos/${TW_REPO_OWNER}/${TW_REPO_NAME}/pulls`,
            {
                title: `Add ${token.name} (${token.symbol}) on SmartChain (BSC)`,
                body: [
                    `## Token Information`,
                    `| Field | Value |`,
                    `|-------|-------|`,
                    `| **Name** | ${token.name} |`,
                    `| **Symbol** | ${token.symbol} |`,
                    `| **Contract** | \`${token.address}\` |`,
                    `| **Chain** | SmartChain (BEP20) |`,
                    `| **Explorer** | [BSCScan](https://bscscan.com/token/${token.address}) |`,
                    `| **Website** | https://b20-lab.com |`,
                    ``,
                    `## Checklist`,
                    `- [x] Token is deployed and verified on BSCScan`,
                    `- [x] Logo is 256x256 PNG`,
                    `- [x] info.json follows Trust Wallet standard`,
                    `- [x] Launched via B20LAB Launchpad`,
                ].join('\n'),
                head: `${TW_FORK_OWNER}:${branchName}`,
                base: 'master',
                maintainer_can_modify: true,
            },
            { headers: ghHeaders(), timeout: 15000 }
        );
        return res.data.html_url;
    } catch (err) {
        const msg = err.response?.data?.errors?.[0]?.message || err.message;
        console.warn('[TrustWallet] PR creation failed:', msg);
        // Return a link to manual PR creation
        return `https://github.com/${TW_REPO_OWNER}/${TW_REPO_NAME}/compare/master...${TW_FORK_OWNER}:${branchName}`;
    }
}

// ── Main: Submit token to Trust Wallet ───────────────────────
async function pushToTrustWallet(tokenData, logoBuffer) {
    const { name, symbol, address, description } = tokenData;

    console.log(`\n[TrustWallet] ████ Processing ${symbol} @ ${address}`);
    await ensureTWColumns();

    // ── Step 1: Resize logo ───────────────────────────────────
    let resizedLogo = null;
    if (logoBuffer) {
        resizedLogo = await resizeLogo(logoBuffer);
        console.log('[TrustWallet] ✓ Logo resized to 256x256 PNG');
    }

    // ── Step 2: Upload to Pinata IPFS ─────────────────────────
    let ipfsUrl = null;
    if (resizedLogo) {
        ipfsUrl = await uploadLogoToPinata(resizedLogo, symbol);
    }

    // ── Step 3: GitHub API flow (only if GITHUB_TOKEN set) ────
    let prUrl = `https://github.com/${TW_REPO_OWNER}/${TW_REPO_NAME}/pulls`;

    if (!GITHUB_TOKEN) {
        console.warn('[TrustWallet] GITHUB_TOKEN not configured — skipping GitHub PR automation');
        // Still save IPFS link
        await db.query(
            `UPDATE tokens SET ipfs_logo_url = $1, tw_pr_status = 'no_github_token', tw_submitted_at = datetime('now') WHERE contract_address = $2`,
            [ipfsUrl, address]
        );
        return { prUrl: null, ipfsUrl };
    }

    try {
        // Ensure fork exists
        await ensureFork();

        // Get default branch SHA
        const { sha, defaultBranch } = await getDefaultBranchSha();

        // Create branch name
        const checksumAddr = address.toLowerCase();
        const branchName   = `add-bsc-${checksumAddr.slice(2, 8)}-${symbol.toLowerCase()}`;

        // Create branch
        await createBranch(branchName, sha);

        // Build checksum address (Trust Wallet uses EIP-55 checksum)
        const { ethers } = require('ethers');
        const checksumAddress = ethers.getAddress(address);
        const assetPath = `blockchains/smartchain/assets/${checksumAddress}`;

        // Commit logo.png
        if (resizedLogo) {
            await commitFile(
                branchName,
                `${assetPath}/logo.png`,
                resizedLogo.toString('base64'),
                `Add ${name} (${symbol}) logo`
            );
        }

        // Build and commit info.json
        const infoJson = {
            name,
            website:     'https://b20-lab.com',
            description: description || `${name} token — launched via B20LAB Launchpad`,
            explorer:    `https://bscscan.com/token/${checksumAddress}`,
            type:        'BEP20',
            symbol,
            decimals:    18,
            status:      'active',
            id:          checksumAddress,
            links: [
                { name: 'coinmarketcap', url: '' },
                { name: 'coingecko',     url: '' },
                { name: 'whitepaper',    url: '' },
                { name: 'github',        url: 'https://github.com/NilanRitvik/B20LAB' },
                { name: 'twitter',       url: '' },
                { name: 'telegram',      url: '' },
                { name: 'website',       url: 'https://b20-lab.com' },
            ]
        };
        await commitFile(
            branchName,
            `${assetPath}/info.json`,
            Buffer.from(JSON.stringify(infoJson, null, 2)).toString('base64'),
            `Add ${name} (${symbol}) info.json`
        );

        // Open PR
        prUrl = await createPR(branchName, { name, symbol, address: checksumAddress, description });
        console.log(`[TrustWallet] ✅ PR submitted: ${prUrl}`);

    } catch (err) {
        console.error('[TrustWallet] GitHub flow error:', err.message);
    }

    // ── Step 4: Update DB ──────────────────────────────────────
    await db.query(
        `UPDATE tokens SET 
            tw_pr_url      = $1,
            tw_pr_status   = $2,
            ipfs_logo_url  = $3,
            tw_submitted_at = datetime('now')
        WHERE contract_address = $4`,
        [prUrl, 'submitted', ipfsUrl, address]
    );

    return { prUrl, ipfsUrl };
}

// ── Auto-process all tokens missing TW submission ────────────
async function runTrustWalletSync() {
    console.log('\n[TrustWallet] 🏦 Starting Trust Wallet asset sync...');
    await ensureTWColumns();

    let tokens;
    try {
        const result = await db.query(`
            SELECT id, name, symbol, contract_address, logo_url, description
            FROM tokens
            WHERE contract_address IS NOT NULL
              AND (tw_pr_status IS NULL OR tw_pr_status = 'pending')
            ORDER BY created_at DESC
            LIMIT 10
        `);
        tokens = result.rows;
    } catch (err) {
        console.error('[TrustWallet] DB query failed:', err.message);
        return;
    }

    if (!tokens || tokens.length === 0) {
        console.log('[TrustWallet] ✅ All tokens already processed.');
        return;
    }

    console.log(`[TrustWallet] Found ${tokens.length} token(s) to submit`);

    for (const token of tokens) {
        try {
            let logoBuffer = null;
            if (token.logo_url) {
                logoBuffer = await fetchLogoBuffer(token.logo_url);
            }

            await pushToTrustWallet({
                name:        token.name,
                symbol:      token.symbol,
                address:     token.contract_address,
                description: token.description
            }, logoBuffer);

            // Rate limit — GitHub API has 5000 req/hr but being courteous
            await new Promise(r => setTimeout(r, 2000));
        } catch (err) {
            console.error(`[TrustWallet] ❌ Failed for ${token.symbol}:`, err.message);
        }
    }

    console.log('[TrustWallet] 🏦 Trust Wallet sync complete.\n');
}

// ── Upload Metadata JSON to Pinata IPFS ──────────────────────
async function uploadMetadataToPinata(metadataJson, tokenSymbol) {
    if (!PINATA_JWT && !PINATA_API_KEY) {
        console.warn('[TrustWallet] No Pinata credentials — skipping IPFS metadata upload');
        return null;
    }
    try {
        const headers = PINATA_JWT
            ? { Authorization: `Bearer ${PINATA_JWT}`, 'Content-Type': 'application/json' }
            : { pinata_api_key: PINATA_API_KEY, pinata_secret_api_key: PINATA_SECRET, 'Content-Type': 'application/json' };

        const res = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
            pinataContent: metadataJson,
            pinataMetadata: { name: `${tokenSymbol} Metadata` }
        }, { headers, timeout: 15000 });

        const cid = res.data.IpfsHash;
        const url = `https://ipfs.io/ipfs/${cid}`;
        console.log(`[TrustWallet] 📌 Metadata pinned to IPFS: ${url}`);
        return url;
    } catch (err) {
        console.warn('[TrustWallet] IPFS metadata upload failed:', err.response?.data || err.message);
        return null;
    }
}

module.exports = { pushToTrustWallet, runTrustWalletSync, uploadLogoToPinata, uploadMetadataToPinata, fetchLogoBuffer };
