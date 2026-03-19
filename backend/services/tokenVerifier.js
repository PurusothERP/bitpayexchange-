// ============================================================
//  antigraVITY — Token Verifier Service
//  tokenVerifier.js
//
//  Every 1 hour:
//   1. Scans connected DB for tokens that haven't been verified
//   2. Calls BSCScan API to check/submit contract verification
//   3. Updates the tokens table with verification status & metadata
//   4. Logs all activity for the admin panel
// ============================================================

const axios  = require('axios');
const path   = require('path');
const fs     = require('fs');
const db     = require('../config/db');

const BSCSCAN_API     = 'https://api.bscscan.com/api';
const BSCSCAN_KEY     = process.env.BSCSCAN_API_KEY || '2X6VV2BKDA4YPFPBZC56X2RIQSWM4M58YW';
const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS || '0xc4F46f4ee4F48498f8243D63b026d321e5C2aCe2';
const ONE_HOUR_MS     = 60 * 60 * 1000;

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
                module:  'contract',
                action:  'getsourcecode',
                address: contractAddress,
                apikey:  BSCSCAN_KEY
            },
            timeout: 10000
        });
        const result = res.data.result?.[0];
        if (!result) return { verified: false, abi: null, name: null };

        const isVerified = result.ABI && result.ABI !== 'Contract source code not verified';
        return {
            verified:         isVerified,
            name:             result.ContractName || null,
            compiler:         result.CompilerVersion || null,
            optimization:     result.OptimizationUsed === '1',
            runs:             parseInt(result.Runs) || 200,
            abi:              isVerified ? result.ABI : null,
            sourceCode:       isVerified ? result.SourceCode : null,
            licenseType:      result.LicenseType || 'MIT',
        };
    } catch (err) {
        console.warn(`[Verifier] BSCScan check failed for ${contractAddress}:`, err.message);
        return { verified: false, error: err.message };
    }
}

// ── 2. Submit source for verification ────────────────────────
// Note: BSCScan verification requires exact match of source + compiler settings
async function submitVerification(contractAddress, contractName, sourceCode, compilerVersion) {
    try {
        const params = new URLSearchParams({
            module:             'contract',
            action:             'verifysourcecode',
            apikey:             BSCSCAN_KEY,
            contractaddress:    contractAddress,
            sourceCode:         sourceCode,
            codeformat:         'solidity-single-file',
            contractname:       contractName,
            compilerversion:    compilerVersion || 'v0.8.20+commit.a1b79de6',
            optimizationUsed:   '1',
            runs:               '200',
            evmversion:         'paris',
            licenseType:        '3' // MIT
        });

        const res = await axios.post(BSCSCAN_API, params.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 15000
        });

        if (res.data.status === '1') {
            console.log(`[Verifier] ✅ Submitted verification for ${contractAddress} — GUID: ${res.data.result}`);
            return { submitted: true, guid: res.data.result };
        } else {
            console.warn(`[Verifier] ⚠️ Submission rejected for ${contractAddress}: ${res.data.result}`);
            return { submitted: false, reason: res.data.result };
        }
    } catch (err) {
        console.warn(`[Verifier] Submit error for ${contractAddress}:`, err.message);
        return { submitted: false, error: err.message };
    }
}

// ── 3. Fetch token metadata from BSCScan ────────────────────
async function fetchTokenMetadata(contractAddress) {
    try {
        // Get token info
        const [infoRes, holderRes, txRes] = await Promise.allSettled([
            axios.get(BSCSCAN_API, {
                params: { module:'token', action:'tokeninfo', contractaddress: contractAddress, apikey: BSCSCAN_KEY },
                timeout: 8000
            }),
            axios.get(BSCSCAN_API, {
                params: { module:'token', action:'tokenholderlist', contractaddress: contractAddress, apikey: BSCSCAN_KEY, page:1, offset:1 },
                timeout: 8000
            }),
            axios.get(BSCSCAN_API, {
                params: { module:'account', action:'tokentx', contractaddress: contractAddress, page:1, offset:5, sort:'desc', apikey: BSCSCAN_KEY },
                timeout: 8000
            })
        ]);

        const info    = infoRes.status === 'fulfilled' ? infoRes.value.data?.result   : null;
        const holders = holderRes.status === 'fulfilled' ? holderRes.value.data?.result : null;
        const txs     = txRes.status === 'fulfilled' ? txRes.value.data?.result       : null;

        // Parse token info array into object
        let tokenInfo = {};
        if (Array.isArray(info)) {
            info.forEach(item => { tokenInfo[item.tokenPropertyName || item.name] = item.tokenPropertyValue || item.value; });
        } else if (info && typeof info === 'object') {
            tokenInfo = info;
        }

        return {
            tokenName:    tokenInfo.tokenName     || tokenInfo.name    || null,
            tokenSymbol:  tokenInfo.tokenSymbol   || tokenInfo.symbol  || null,
            tokenDecimal: tokenInfo.tokenDecimal  || 18,
            totalSupply:  tokenInfo.totalSupply   || null,
            holderCount:  Array.isArray(holders) ? holders.length : 0,
            txCount:      Array.isArray(txs) ? txs.length : 0,
            website:      tokenInfo.website       || null,
            logo:         tokenInfo.image         || null,
            fetchedAt:    new Date().toISOString()
        };
    } catch (err) {
        console.warn(`[Verifier] Metadata fetch failed for ${contractAddress}:`, err.message);
        return null;
    }
}

// ── 4. Ensure schema has verification columns ────────────────
async function ensureVerificationColumns() {
    const columns = [
        { name: 'is_verified',        def: 'BOOLEAN DEFAULT FALSE' },
        { name: 'verification_status', def: "TEXT DEFAULT 'pending'" },
        { name: 'bscscan_verified',   def: 'BOOLEAN DEFAULT FALSE' },
        { name: 'compiler_version',   def: 'TEXT' },
        { name: 'token_metadata',     def: 'JSONB' },
        { name: 'last_verified_at',   def: 'TIMESTAMP' },
        { name: 'verify_guid',        def: 'TEXT' },
        { name: 'holder_count',       def: 'INTEGER DEFAULT 0' },
        { name: 'tx_count',           def: 'INTEGER DEFAULT 0' },
    ];

    for (const col of columns) {
        try {
            await db.query(`ALTER TABLE tokens ADD COLUMN IF NOT EXISTS ${col.name} ${col.def}`);
        } catch (e) { /* column may already exist */ }
    }
}

// ── 5. Main verification loop ────────────────────────────────
async function runVerificationCycle() {
    const startTime = Date.now();
    console.log('\n[Verifier] ═══════════════════════════════════════════════');
    console.log('[Verifier] 🔍 Starting hourly token verification cycle...');
    console.log(`[Verifier] Time: ${new Date().toISOString()}`);
    console.log('[Verifier] ═══════════════════════════════════════════════');

    await ensureVerificationColumns();

    // Get all tokens that need verification (not yet verified, or verified long ago)
    let tokens;
    try {
        const result = await db.query(`
            SELECT id, contract_address, name, symbol, creator_address,
                   is_verified, bscscan_verified, verify_guid,
                   last_verified_at, created_at
            FROM tokens
            WHERE contract_address IS NOT NULL
              AND (
                  bscscan_verified IS NOT TRUE
                  OR last_verified_at < NOW() - INTERVAL '6 hours'
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
        console.log('[Verifier] ✅ No tokens pending verification in this cycle.');
        return;
    }

    console.log(`[Verifier] Found ${tokens.length} token(s) to process.`);
    let verified = 0, submitted = 0, failed = 0;

    const tokenTemplateSrc = readContract('TokenTemplate.sol');

    for (const token of tokens) {
        const addr = token.contract_address?.toLowerCase();
        if (!addr || addr === '0x0000000000000000000000000000000000000000') continue;

        console.log(`\n[Verifier] Processing: ${token.name} (${token.symbol}) @ ${addr}`);

        try {
            // Step A: Check current BSCScan verification status
            const status = await checkVerificationStatus(addr);
            console.log(`[Verifier]   → BSCScan verified: ${status.verified}`);

            // Step B: Fetch on-chain metadata
            const metadata = await fetchTokenMetadata(addr);

            // Step C: If not verified, try to submit verification
            let verifyGuid = token.verify_guid;
            let submitResult = null;

            if (!status.verified && tokenTemplateSrc) {
                // Small delay to respect BSCScan rate limits (5 calls/second free tier)
                await new Promise(r => setTimeout(r, 300));
                submitResult = await submitVerification(addr, 'TokenTemplate', tokenTemplateSrc, 'v0.8.20+commit.a1b79de6');
                if (submitResult.submitted) {
                    verifyGuid = submitResult.guid;
                    submitted++;
                }
            }

            // Step D: Update DB with latest status
            const verificationStatus = status.verified ? 'verified'
                : submitResult?.submitted ? 'submitted'
                : status.error ? 'error'
                : 'pending';

            await db.query(`
                UPDATE tokens SET
                    bscscan_verified   = $1,
                    is_verified        = $2,
                    verification_status = $3,
                    compiler_version   = $4,
                    token_metadata     = $5,
                    last_verified_at   = NOW(),
                    verify_guid        = $6,
                    holder_count       = $7,
                    tx_count           = $8
                WHERE id = $9
            `, [
                status.verified,
                status.verified,
                verificationStatus,
                status.compiler || null,
                metadata ? JSON.stringify(metadata) : null,
                verifyGuid || null,
                metadata?.holderCount || 0,
                metadata?.txCount || 0,
                token.id
            ]);

            if (status.verified) {
                console.log(`[Verifier]   ✅ VERIFIED on BSCScan — ${token.name}`);
                verified++;
            } else if (submitResult?.submitted) {
                console.log(`[Verifier]   📤 Verification submitted — GUID: ${verifyGuid}`);
            } else {
                console.log(`[Verifier]   ⏳ Pending verification`);
            }

            // Rate limit: BSCScan free tier = 5 calls/s
            await new Promise(r => setTimeout(r, 220));

        } catch (err) {
            console.error(`[Verifier] ❌ Error for ${addr}:`, err.message);
            failed++;
            try {
                await db.query(
                    `UPDATE tokens SET verification_status = 'error', last_verified_at = NOW() WHERE id = $1`,
                    [token.id]
                );
            } catch (_) {}
        }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n[Verifier] ─────────────────────────────────────────────`);
    console.log(`[Verifier] Cycle complete in ${elapsed}s`);
    console.log(`[Verifier]   ✅ Verified:   ${verified}`);
    console.log(`[Verifier]   📤 Submitted:  ${submitted}`);
    console.log(`[Verifier]   ❌ Errors:     ${failed}`);
    console.log(`[Verifier]   📊 Total:      ${tokens.length}`);
    console.log('[Verifier] Next run in 60 minutes');
    console.log('[Verifier] ═══════════════════════════════════════════════\n');
}

// ── 6. Start Auto-Verification Scheduler ────────────────────
function startTokenVerifier() {
    console.log('[Verifier] 🔐 BSCScan Token Auto-Verification Service started');
    console.log('[Verifier] 📡 API Key loaded, running every 60 minutes');

    // Run immediately after 30s startup delay, then every hour
    setTimeout(async () => {
        try {
            await runVerificationCycle();
        } catch (err) {
            console.error('[Verifier] Initial cycle error:', err.message);
        }
        setInterval(async () => {
            try {
                await runVerificationCycle();
            } catch (err) {
                console.error('[Verifier] Scheduled cycle error:', err.message);
            }
        }, ONE_HOUR_MS);
    }, 30000);
}

module.exports = { startTokenVerifier, runVerificationCycle, checkVerificationStatus };
