// ============================================================
//  B20LAB — Token Verifier Service
//  tokenVerifier.js
//
//  Runs every 1 hour:
//   1. Finds unverified tokens in DB
//   2. Submits source code to BSCScan V2 for verification
//   3. Checks GUID status for pending submissions
//   4. On confirmed verification → fires Trust Wallet PR + IPFS logo
// ============================================================

const axios  = require('axios');
const path   = require('path');
const fs     = require('fs');
const db     = require('../config/db');

const BSCSCAN_API = 'https://api.bscscan.com/v2/api';
const BSCSCAN_KEY = process.env.BSCSCAN_API_KEY || '2X6VV2BKDA4YPFPBZC56X2RIQSWM4M58YW';
const ONE_HOUR_MS = 60 * 60 * 1000;

// Read Solidity source for verification submission
function readContract(filename) {
    const contractsDir = path.join(__dirname, '..', '..', 'contracts', 'contracts');
    const p = path.join(contractsDir, filename);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

// ── 1. Check BSCScan verification status ────────────────────
async function checkVerificationStatus(contractAddress) {
    try {
        const res = await axios.get(BSCSCAN_API, {
            params: {
                chainid: '56',
                module:  'contract',
                action:  'getsourcecode',
                address: contractAddress,
                apikey:  BSCSCAN_KEY
            },
            timeout: 10000
        });
        const result = res.data.result?.[0];
        if (!result) return { verified: false };

        const isVerified = result.ABI && result.ABI !== 'Contract source code not verified';
        return {
            verified:     isVerified,
            name:         result.ContractName || null,
            compiler:     result.CompilerVersion || null,
            optimization: result.OptimizationUsed === '1',
            licenseType:  result.LicenseType || 'MIT',
        };
    } catch (err) {
        console.warn(`[Verifier] BSCScan check failed for ${contractAddress}:`, err.message);
        return { verified: false, error: err.message };
    }
}

// ── 2. Submit source code for verification ───────────────────
async function submitVerification(contractAddress, contractName, sourceCode, constructorArgs, compilerVersion) {
    try {
        const body = {
            chainid:          '56',
            module:           'contract',
            action:           'verifysourcecode',
            apikey:           BSCSCAN_KEY,
            contractaddress:  contractAddress,
            sourceCode:       sourceCode,
            codeformat:       'solidity-single-file',
            contractname:     contractName,
            compilerversion:  compilerVersion || 'v0.8.20+commit.a1b79de6',
            optimizationUsed: '1',
            runs:             '200',
            evmversion:       'paris',
            licenseType:      '3'
        };

        if (constructorArgs) {
            body.constructorArguements = constructorArgs; // Note: BSCScan uses this specific spelling
        }

        const params = new URLSearchParams(body);

        const res = await axios.post(BSCSCAN_API, params.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 15000
        });

        if (res.data.status === '1') {
            console.log(`[Verifier] ✅ Verification submitted — GUID: ${res.data.result}`);
            return { submitted: true, guid: res.data.result };
        } else {
            console.warn(`[Verifier] ⚠️ Submission rejected: ${res.data.result}`);
            return { submitted: false, reason: res.data.result };
        }
    } catch (err) {
        console.warn(`[Verifier] Submit error for ${contractAddress}:`, err.message);
        return { submitted: false, error: err.message };
    }
}

// ── 3. Check status of a pending verification GUID ──────────
async function checkGuidStatus(guid) {
    try {
        const res = await axios.get(BSCSCAN_API, {
            params: {
                chainid: '56',
                module:  'contract',
                action:  'checkverifystatus',
                guid,
                apikey:  BSCSCAN_KEY
            },
            timeout: 10000
        });
        const result = res.data.result || '';
        return {
            pass:    result.toLowerCase().includes('pass') || result.toLowerCase().includes('verified'),
            pending: result.toLowerCase().includes('pending') || result.toLowerCase().includes('queue'),
            message: result
        };
    } catch (_) {
        return { pass: false, pending: false, message: 'check failed' };
    }
}

// ── 4. Ensure schema columns exist ───────────────────────────
async function ensureVerificationColumns() {
    const cols = [
        { name: 'is_verified',        def: 'INTEGER DEFAULT 0' },
        { name: 'verification_status', def: "TEXT DEFAULT 'pending'" },
        { name: 'bscscan_verified',   def: 'INTEGER DEFAULT 0' },
        { name: 'compiler_version',   def: 'TEXT' },
        { name: 'token_metadata',     def: 'TEXT' },
        { name: 'last_verified_at',   def: 'DATETIME' },
        { name: 'verify_guid',        def: 'TEXT' },
        { name: 'holder_count',       def: 'INTEGER DEFAULT 0' },
        { name: 'tx_count',           def: 'INTEGER DEFAULT 0' },
        { name: 'tw_pr_url',          def: 'TEXT' },
        { name: 'tw_pr_status',       def: "TEXT DEFAULT 'pending'" },
        { name: 'ipfs_logo_url',      def: 'TEXT' },
    ];
    for (const col of cols) {
        try { await db.query(`ALTER TABLE tokens ADD COLUMN ${col.name} ${col.def}`); }
        catch (_) {}
    }
}

// ── 5. Main verification + TrustWallet dispatch loop ─────────
async function runVerificationCycle() {
    const startTime = Date.now();
    console.log('\n[Verifier] ═══════════════════════════════════════════════');
    console.log('[Verifier] 🔍 Starting hourly verification cycle...');
    console.log(`[Verifier] Time: ${new Date().toISOString()}`);
    console.log('[Verifier] ═══════════════════════════════════════════════');

    await ensureVerificationColumns();

    let tokens;
    try {
        const result = await db.query(`
            SELECT id, contract_address, name, symbol, creator_wallet AS creator_address,
                   logo_url, description, launch_type,
                   is_verified, bscscan_verified, verify_guid,
                   last_verified_at, tw_pr_status, created_at
            FROM tokens
            WHERE contract_address IS NOT NULL
              AND (
                  bscscan_verified IS NOT 1
                  OR last_verified_at < datetime('now', '-6 hours')
              )
            ORDER BY created_at DESC
            LIMIT 50
        `);
        tokens = result.rows;
    } catch (err) {
        console.error('[Verifier] DB query failed:', err.message);
        return;
    }

    if (!tokens || tokens.length === 0) {
        console.log('[Verifier] ✅ No tokens pending processing.');
        return;
    }

    console.log(`[Verifier] Found ${tokens.length} token(s) to process.`);
    let cntVerified = 0, cntSubmitted = 0, cntFailed = 0, cntTW = 0;

    const tokenTemplateSrc = readContract('TokenTemplate.sol');

    for (const token of tokens) {
        const addr = token.contract_address?.toLowerCase();
        if (!addr || addr === '0x0000000000000000000000000000000000000000') continue;

        console.log(`\n[Verifier] ── ${token.name} (${token.symbol}) @ ${addr}`);

        try {
            // A: Check current on-chain verification status
            const status = await checkVerificationStatus(addr);
            let finalVerified = status.verified;
            let verifyGuid    = token.verify_guid;
            let submitResult  = null;

            // B: If previously submitted, poll the GUID
            if (!finalVerified && verifyGuid) {
                const guidStatus = await checkGuidStatus(verifyGuid);
                console.log(`[Verifier]   GUID ${verifyGuid.slice(0,8)}… → ${guidStatus.message}`);
                if (guidStatus.pass) finalVerified = true;
            }

            // C: If still unverified and we have source → submit
            if (!finalVerified && tokenTemplateSrc) {
                console.log(`[Verifier]   Preparing constructor arguments for ${token.launch_type || 'MEME'}...`);
                
                const { ethers } = require('ethers');
                const abiCoder = new ethers.AbiCoder();
                
                // Construct args based on launch type
                const BC_ADDR  = process.env.BONDING_CURVE_ADDRESS || '0x279A5618Ff049667234c030792C0594B311A0451';
                const DF_ADDR  = process.env.DIRECT_FACTORY_ADDRESS || '0x319C8c9efBF2742331e687DE8caf54B9944895A7';
                const FEE_ADDR = process.env.FEE_WALLET || '0x6451ee4def4a8b8fbc2c64301a79e267de378935';
                
                const ownerAddr = (token.launch_type === 'FAIR') ? DF_ADDR : BC_ADDR;
                
                // TokenTemplate(string name_, string symbol_, uint256 fixedSupply, address _creator, address bondingCurve_, address feeWallet_)
                const encodedArgs = abiCoder.encode(
                    ['string', 'string', 'uint256', 'address', 'address', 'address'],
                    [token.name, token.symbol, 1000000000n, token.creator_address, ownerAddr, FEE_ADDR]
                ).replace('0x', '');

                await new Promise(r => setTimeout(r, 300));
                submitResult = await submitVerification(addr, 'TokenTemplate', tokenTemplateSrc, encodedArgs, 'v0.8.20+commit.a1b79de6');
                if (submitResult.submitted) {
                    verifyGuid = submitResult.guid;
                    cntSubmitted++;
                }
            }

            // D: Persist verification state
            const vStatus = finalVerified ? 'verified'
                : submitResult?.submitted ? 'submitted'
                : status.error ? 'error'
                : 'pending';

            await db.query(`
                UPDATE tokens SET
                    bscscan_verified    = $1,
                    is_verified         = $2,
                    verification_status = $3,
                    compiler_version    = $4,
                    last_verified_at    = datetime('now'),
                    verify_guid         = $5
                WHERE id = $6
            `, [finalVerified ? 1 : 0, finalVerified ? 1 : 0, vStatus, status.compiler || null, verifyGuid || null, token.id]);

            if (finalVerified) {
                console.log(`[Verifier]   ✅ VERIFIED on BSCScan`);
                cntVerified++;

                // E: Trust Wallet PR + IPFS (only if not yet submitted)
                const twNotDone = !token.tw_pr_status || token.tw_pr_status === 'pending';
                if (twNotDone) {
                    console.log(`[Verifier]   🏦 Triggering Trust Wallet submission...`);
                    try {
                        const tw = require('./trustWalletService');
                        const logoBuffer = token.logo_url ? await tw.fetchLogoBuffer(token.logo_url) : null;
                        const { prUrl, ipfsUrl } = await tw.pushToTrustWallet({
                            name:        token.name,
                            symbol:      token.symbol,
                            address:     token.contract_address,
                            description: token.description
                        }, logoBuffer);

                        if (prUrl)   console.log(`[Verifier]   📬 Trust Wallet PR: ${prUrl}`);
                        if (ipfsUrl) console.log(`[Verifier]   📌 IPFS logo: ${ipfsUrl}`);
                        cntTW++;
                    } catch (twErr) {
                        console.warn('[Verifier]   ⚠ Trust Wallet step failed:', twErr.message);
                    }
                }
            } else if (submitResult?.submitted) {
                console.log(`[Verifier]   📤 Verification submitted — GUID: ${verifyGuid}`);
            } else {
                console.log(`[Verifier]   ⏳ Pending`);
            }

            await new Promise(r => setTimeout(r, 250)); // BSCScan rate limit

        } catch (err) {
            console.error(`[Verifier] ❌ Error for ${addr}:`, err.message);
            cntFailed++;
            try {
                await db.query(
                    `UPDATE tokens SET verification_status = 'error', last_verified_at = datetime('now') WHERE id = $1`,
                    [token.id]
                );
            } catch (_) {}
        }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n[Verifier] ─────────────────────────────────────────────`);
    console.log(`[Verifier] Cycle complete in ${elapsed}s`);
    console.log(`[Verifier]   ✅ Verified:          ${cntVerified}`);
    console.log(`[Verifier]   📤 BSCScan Submitted: ${cntSubmitted}`);
    console.log(`[Verifier]   🏦 TrustWallet PRs:   ${cntTW}`);
    console.log(`[Verifier]   ❌ Errors:            ${cntFailed}`);
    console.log(`[Verifier]   📊 Total:             ${tokens.length}`);
    console.log('[Verifier] Next run in 60 minutes');
    console.log('[Verifier] ═══════════════════════════════════════════════\n');
}

// ── 6. Start Scheduler ────────────────────────────────────────
function startTokenVerifier() {
    console.log('[Verifier] 🔐 BSCScan V2 Auto-Verification + Trust Wallet Service started');
    setTimeout(async () => {
        try { await runVerificationCycle(); }
        catch (err) { console.error('[Verifier] Initial cycle error:', err.message); }
        setInterval(async () => {
            try { await runVerificationCycle(); }
            catch (err) { console.error('[Verifier] Scheduled cycle error:', err.message); }
        }, ONE_HOUR_MS);
    }, 30000);
}

module.exports = { startTokenVerifier, runVerificationCycle, checkVerificationStatus };
