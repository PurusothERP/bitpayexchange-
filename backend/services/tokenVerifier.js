// ============================================================
//  B20LAB — Token Verifier Service
//  tokenVerifier.js
//
//  Runs every 1 hour:
//   1. Finds unverified tokens in DB
//   2. Submits source code to BSCScan V2 for verification (FLATTENED)
//   3. Checks GUID status for pending submissions
//   4. On confirmed verification → fires Trust Wallet PR + IPFS logo
// ============================================================

const axios  = require('axios');
const path   = require('path');
const fs     = require('fs');
require('dotenv').config();
const db     = require('../config/db');

const BSCSCAN_API = 'https://api.etherscan.io/v2/api';
const BSCSCAN_KEY = process.env.BSCSCAN_API_KEY || '2X6VV2BKDA4YPFPBZC56X2RIQSWM4M58YW';
const VERIFY_INTERVAL = 10 * 60 * 1000; // 10 Minutes

// ── Helper Checker Functions for Indexing ─────────────────────
async function checkDexScreener(tokenAddress) {
    try {
        const res = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`, { timeout: 10000 });
        const pairs = res.data.pairs || [];
        const bscPair = pairs.find(p => p.chainId === 'bsc');
        if (bscPair) return { status: 'indexed', url: bscPair.url };
        return { status: 'pending' };
    } catch (_) { return { status: 'pending' }; }
}

async function checkGeckoTerminal(tokenAddress) {
    try {
        const res = await axios.get(`https://api.geckoterminal.com/api/v2/networks/bsc/tokens/${tokenAddress}`, { timeout: 10000 });
        const data = res.data.data;
        if (data && data.id) {
            return { status: 'indexed', url: `https://www.geckoterminal.com/bsc/tokens/${tokenAddress}` };
        }
        return { status: 'pending' };
    } catch (_) { return { status: 'pending' }; }
}

async function checkCoinGecko(tokenAddress) {
    try {
        const url = `https://api.coingecko.com/api/v3/coins/binance-smart-chain/contract/${tokenAddress.toLowerCase()}`;
        const res = await axios.get(url, {
            headers: { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY || '' },
            timeout: 10000
        });
        if (res.data && res.data.id) {
            return { status: 'indexed', url: `https://www.coingecko.com/en/coins/${res.data.id}` };
        }
        return { status: 'pending' };
    } catch (_) { return { status: 'pending' }; }
}

async function checkCoinpaprika(symbol, tokenAddress) {
    try {
        const res = await axios.get(`https://api.coinpaprika.com/v1/search?q=${symbol}&c=currencies`, { timeout: 10000 });
        const currencies = res.data.currencies || [];
        const found = currencies.find(c => c.symbol.toUpperCase() === symbol.toUpperCase());
        if (found) {
            const coinRes = await axios.get(`https://api.coinpaprika.com/v1/coins/${found.id}`, { timeout: 10000 });
            const platforms = coinRes.data.platforms || [];
            const isBscContract = platforms.some(p => p.platform === 'binance-smart-chain' && p.contract_address?.toLowerCase() === tokenAddress.toLowerCase());
            if (isBscContract) {
                return { status: 'indexed', url: `https://coinpaprika.com/coin/${found.id}` };
            }
        }
        return { status: 'pending' };
    } catch (_) { return { status: 'pending' }; }
}

// Read Solidity source for verification submission
function readContract(filename) {
    const contractsDir = path.join(__dirname, '..', '..', 'contracts', 'contracts');
    const p = path.join(contractsDir, filename);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

// ── 1. Check BSCScan verification status ────────────────────
async function checkVerificationStatus(contractAddress) {
    try {
        const res = await axios.get(`${BSCSCAN_API}?chainid=56&apikey=${BSCSCAN_KEY}`, {
            params: {
                module:  'contract',
                action:  'getsourcecode',
                address: contractAddress,
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

// ── 2. Submit source code for verification (Standard JSON format) ───
async function submitVerification(contractAddress, contractName, sourceCode, constructorArgs, compilerVersion, pathKey = 'contracts/contracts/TokenTemplate.sol') {
    try {
        const jsonInput = {
            language: 'Solidity',
            sources: {
                [pathKey]: {
                    content: sourceCode
                }
            },
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 200
                },
                viaIR: true,
                evmVersion: 'paris'
            }
        };

        const body = {
            chainid:          '56',
            module:           'contract',
            action:           'verifysourcecode',
            apikey:           BSCSCAN_KEY,
            contractaddress:  contractAddress,
            sourceCode:       JSON.stringify(jsonInput),
            codeformat:       'solidity-standard-json-input',
            contractname:     `${pathKey}:${contractName}`,
            compilerversion:  compilerVersion || 'v0.8.20+commit.a1b79de6',
        };

        if (constructorArgs) {
            body.constructorArguements = constructorArgs.replace('0x', ''); // BSCScan uses this specific spelling
        }

        const params = new URLSearchParams(body);

        const res = await axios.post(`${BSCSCAN_API}?chainid=56&apikey=${BSCSCAN_KEY}`, params.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 20000
        });

        if (res.data.status === '1') {
            console.log(`[Verifier] ✅ Verification submitted for ${contractName} — GUID: ${res.data.result}`);
            return { submitted: true, guid: res.data.result };
        } else {
            console.warn(`[Verifier] ⚠️ Submission rejected for ${contractName}: ${res.data.result}`);
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
        const res = await axios.get(`${BSCSCAN_API}?chainid=56&apikey=${BSCSCAN_KEY}`, {
            params: {
                module:  'contract',
                action:  'checkverifystatus',
                guid,
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
        { name: 'ipfs_metadata_url',   def: 'TEXT' },
        { name: 'dexscreener_status',  def: "TEXT DEFAULT 'pending'" },
        { name: 'dexscreener_url',     def: 'TEXT' },
        { name: 'geckoterminal_status',def: "TEXT DEFAULT 'pending'" },
        { name: 'geckoterminal_url',   def: 'TEXT' },
        { name: 'coingecko_status',    def: "TEXT DEFAULT 'pending'" },
        { name: 'coingecko_url',       def: 'TEXT' },
        { name: 'coinmarketcap_status',def: "TEXT DEFAULT 'pending'" },
        { name: 'coinmarketcap_url',   def: 'TEXT' },
        { name: 'coinpaprika_status',  def: "TEXT DEFAULT 'pending'" },
        { name: 'coinpaprika_url',     def: 'TEXT' }
    ];
    for (const col of cols) {
        try { await db.query(`ALTER TABLE tokens ADD COLUMN ${col.name} ${col.def}`); }
        catch (_) {}
    }
}

// ── 5. Verify Core System Contracts (Factory, etc.) ─────────
async function verifyCoreContracts() {
    console.log('[Verifier] 🏗️  Checking Core System Contracts verification...');
    const { ethers } = require('ethers');
    const abiCoder = new ethers.AbiCoder();
    
    // 1. Factory
    const factoryAddr = process.env.FACTORY_ADDRESS;
    if (factoryAddr) {
        const status = await checkVerificationStatus(factoryAddr);
        if (!status.verified) {
            console.log('[Verifier] 🏭 Factory not verified. Submitting...');
            const src = readContract('TokenFactory.flattened.sol');
            if (src) {
                const args = abiCoder.encode(
                    ['address', 'address', 'address'],
                    [
                        process.env.BONDING_CURVE_ADDRESS || '0xf7E5D2791F70051BEe564Ba5AC9896937cdf3d0a',
                        process.env.FEE_WALLET || process.env.FEE_WALLET,
                        process.env.FEE_WALLET || ''
                    ]
                );
                await submitVerification(factoryAddr, 'TokenFactory', src, args, 'v0.8.20+commit.a1b79de6', 'contracts/TokenFactory.sol');
            }
        } else {
            console.log('[Verifier] 🏭 Factory already verified ✓');
        }
    }

    // 2. BondingCurve
    const curveAddr = process.env.BONDING_CURVE_ADDRESS;
    if (curveAddr) {
        const status = await checkVerificationStatus(curveAddr);
        if (!status.verified) {
            console.log('[Verifier] 📈 BondingCurve not verified. Submitting...');
            const src = readContract('BondingCurve.flattened.sol');
            if (src) {
                const args = abiCoder.encode(
                    ['address', 'address', 'address'],
                    [
                        process.env.FEE_WALLET || process.env.FEE_WALLET,
                        process.env.FEE_WALLET || process.env.FEE_WALLET,
                        '0x10ED43C718714eb63d5aA57B78B54704E256024E' // Pancake Router
                    ]
                );
                await submitVerification(curveAddr, 'BondingCurve', src, args, 'v0.8.20+commit.a1b79de6', 'contracts/BondingCurve.sol');
            }
        } else {
            console.log('[Verifier] 📈 BondingCurve already verified ✓');
        }
    }

    // 3. LiquidityManager
    const liqAddr = process.env.LIQUIDITY_MANAGER_ADDRESS;
    if (liqAddr) {
        const status = await checkVerificationStatus(liqAddr);
        if (!status.verified) {
            console.log('[Verifier] 💧 LiquidityManager not verified. Submitting...');
            const src = readContract('LiquidityManager.flattened.sol');
            if (src) {
                const args = abiCoder.encode(
                    ['address', 'address'],
                    [
                        '0x10ED43C718714eb63d5aA57B78B54704E256024E',
                        process.env.FEE_WALLET || process.env.FEE_WALLET
                    ]
                );
                await submitVerification(liqAddr, 'LiquidityManager', src, args, 'v0.8.20+commit.a1b79de6', 'contracts/LiquidityManager.sol');
            }
        } else {
            console.log('[Verifier] 💧 LiquidityManager already verified ✓');
        }
    }

    // 4. DirectFactory
    const directFactoryAddr = process.env.DIRECT_FACTORY_ADDRESS;
    if (directFactoryAddr) {
        const status = await checkVerificationStatus(directFactoryAddr);
        if (!status.verified) {
            console.log('[Verifier] 🚀 DirectFactory not verified. Submitting...');
            const src = readContract('DirectDexLaunchFactoryV2.flattened.sol');
            if (src) {
                const args = abiCoder.encode(
                    ['address', 'address', 'address'],
                    [
                        process.env.FEE_WALLET || process.env.FEE_WALLET,
                        '0x10ED43C718714eb63d5aA57B78B54704E256024E', // Pancake Router
                        '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73'  // Pancake Factory
                    ]
                );
                await submitVerification(directFactoryAddr, 'DirectDexLaunchFactoryV2', src, args, 'v0.8.20+commit.a1b79de6', 'contracts/DirectDexLaunchFactoryV2.sol');
            }
        } else {
            console.log('[Verifier] 🚀 DirectFactory already verified ✓');
        }
    }
}

// ── 6. Main verification + TrustWallet dispatch loop ─────────
async function runVerificationCycle() {
    const startTime = Date.now();
    console.log('\n[Verifier] ═══════════════════════════════════════════════');
    console.log('[Verifier] 🔍 Starting verification cycle...');
    console.log(`[Verifier] Time: ${new Date().toISOString()}`);
    console.log('[Verifier] ═══════════════════════════════════════════════');

    await ensureVerificationColumns();
    await verifyCoreContracts();

    let tokens;
    try {
        const result = await db.query(`
            SELECT id, contract_address, name, symbol, creator_wallet AS creator_address,
                   logo_url, description, launch_type, decimals, total_supply,
                   is_verified, bscscan_verified, verify_guid,
                   last_verified_at, tw_pr_status, created_at
            FROM tokens
            WHERE contract_address IS NOT NULL
              AND launch_type IN ('MEME', 'FAIR', 'FAIR_LAUNCH', 'STANDARD')
              AND (
                  bscscan_verified IS NOT 1
                  OR last_verified_at < datetime('now', '-12 hours')
              )
            ORDER BY created_at DESC
            LIMIT 20
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

    // Use Flattened Source for verification compatibility
    const tokenTemplateSrc = readContract('TokenTemplate.flattened.sol');

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
                
                const BC_ADDR  = process.env.BONDING_CURVE_ADDRESS;
                const DF_ADDR  = process.env.DIRECT_FACTORY_ADDRESS;
                const FEE_ADDR = process.env.FEE_WALLET;
                
                if (!BC_ADDR || !FEE_ADDR) {
                    console.warn('[Verifier] ⚠️ Missing ENV addresses. Skipping submission.');
                    continue;
                }

                let encodedArgs;
                let submitContractName = 'TokenTemplate';
                let submitSrc = tokenTemplateSrc;
                let submitPathKey = 'contracts/contracts/TokenTemplate.sol';

                const rawSupply = token.total_supply?.toString() || '1000000000';
                const finalSupply = rawSupply.includes('e') ? BigInt(parseFloat(rawSupply)) : BigInt(rawSupply.replace(/[,_]/g, ''));

                if (token.launch_type === 'FAIR' || token.launch_type === 'FAIR_LAUNCH') {
                    const ownerAddr = DF_ADDR || '0xeEBC10420F486F8357c2efaBd6F5F44Ac9a568a9';
                    // FairLaunchToken has 4 parameters: string name_, string symbol_, uint256 totalSupply_, address factory_
                    encodedArgs = abiCoder.encode(
                        ['string', 'string', 'uint256', 'address'],
                        [token.name, token.symbol, finalSupply, ownerAddr]
                    );
                    submitContractName = 'FairLaunchToken';
                    submitSrc = readContract('DirectDexLaunchFactoryV2.flattened.sol');
                    submitPathKey = 'contracts/contracts/DirectDexLaunchFactoryV2.sol';
                } else {
                    let ownerAddr;
                    if (token.launch_type === 'STANDARD') {
                        ownerAddr = token.creator_address;
                    } else {
                        ownerAddr = BC_ADDR;
                    }
                    // TokenTemplate has 7 parameters: name_, symbol_, decimals_, fixedSupply, _creator, bondingCurve_, feeWallet_
                    const decimals = parseInt(token.decimals) || 18;
                    const unscaledSupply = finalSupply / BigInt(10 ** decimals);
                    encodedArgs = abiCoder.encode(
                        ['string', 'string', 'uint8', 'uint256', 'address', 'address', 'address'],
                        [
                            token.name, 
                            token.symbol, 
                            decimals,
                            unscaledSupply,
                            token.creator_address, 
                            ownerAddr, 
                            FEE_ADDR
                        ]
                    );
                }

                if (submitSrc) {
                    await new Promise(r => setTimeout(r, 1000)); // Rate limit
                    submitResult = await submitVerification(addr, submitContractName, submitSrc, encodedArgs, 'v0.8.20+commit.a1b79de6', submitPathKey);
                    if (submitResult.submitted) {
                        verifyGuid = submitResult.guid;
                        cntSubmitted++;
                    }
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

                // ── IPFS Metadata Upload ─────────────────────────────────────
                if (!token.ipfs_metadata_url) {
                    console.log(`[Verifier]   📌 Generating & uploading IPFS metadata JSON...`);
                    try {
                        const tw = require('./trustWalletService');
                        const metadataJson = {
                            name:        token.name,
                            symbol:      token.symbol,
                            description: token.description || `${token.name} token launched via B20LAB`,
                            decimals:    token.decimals || 18,
                            totalSupply: token.total_supply,
                            image:       token.ipfs_logo_url || token.logo_url || ''
                        };
                        const metaUrl = await tw.uploadMetadataToPinata(metadataJson, token.symbol);
                        if (metaUrl) {
                            await db.query(`UPDATE tokens SET ipfs_metadata_url = $1 WHERE id = $2`, [metaUrl, token.id]);
                            token.ipfs_metadata_url = metaUrl;
                            console.log(`[Verifier]   ✅ Metadata IPFS URL: ${metaUrl}`);
                        }
                    } catch (metaErr) {
                        console.warn('[Verifier]   ⚠ IPFS metadata upload failed:', metaErr.message);
                    }
                }

            } else if (submitResult?.submitted) {
                console.log(`[Verifier]   📤 Verification submitted — GUID: ${verifyGuid}`);
            }

            // ── Index Auto-Discovery Checks ──────────────────────────────────
            console.log(`[Verifier]   🔍 Checking index status on DexScreener/GeckoTerminal/CoinGecko/Coinpaprika...`);
            const dexRes = await checkDexScreener(addr);
            const gtRes  = await checkGeckoTerminal(addr);
            const cgRes  = await checkCoinGecko(addr);
            const cpRes  = await checkCoinpaprika(token.symbol, addr);

            console.log(`[Verifier]     DexScreener:   ${dexRes.status}`);
            console.log(`[Verifier]     GeckoTerminal: ${gtRes.status}`);
            console.log(`[Verifier]     CoinGecko:     ${cgRes.status}`);
            console.log(`[Verifier]     Coinpaprika:   ${cpRes.status}`);

            await db.query(`
                UPDATE tokens SET
                    dexscreener_status    = $1,
                    dexscreener_url       = $2,
                    geckoterminal_status  = $3,
                    geckoterminal_url     = $4,
                    coingecko_status      = $5,
                    coingecko_url         = $6,
                    coinpaprika_status    = $7,
                    coinpaprika_url       = $8
                WHERE id = $9
            `, [
                dexRes.status, dexRes.url || token.dexscreener_url || null,
                gtRes.status,  gtRes.url || token.geckoterminal_url || null,
                cgRes.status,  cgRes.url || token.coingecko_url || null,
                cpRes.status,  cpRes.url || token.coinpaprika_url || null,
                token.id
            ]);

            await new Promise(r => setTimeout(r, 500)); 

        } catch (err) {
            console.error(`[Verifier] ❌ Error for ${addr}:`, err.message);
            cntFailed++;
        }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n[Verifier] ─────────────────────────────────────────────`);
    console.log(`[Verifier] Cycle complete in ${elapsed}s`);
    console.log(`[Verifier]   ✅ Verified:          ${cntVerified}`);
    console.log(`[Verifier]   📤 BSCScan Submitted: ${cntSubmitted}`);
    console.log(`[Verifier]   🏦 TrustWallet PRs:   ${cntTW}`);
    console.log(`[Verifier]   ❌ Errors:            ${cntFailed}`);
    console.log(`[Verifier] ═══════════════════════════════════════════════\n`);
}

// ── 7. Start Scheduler ────────────────────────────────────────
function startTokenVerifier() {
    console.log('[Verifier] 🔐 BSCScan V2 Auto-Verification Service started');
    // Run initial cycle after 1 minute of startup
    setTimeout(async () => {
        try { await runVerificationCycle(); }
        catch (err) { console.error('[Verifier] Initial cycle error:', err.message); }
        // Then every hour
        setInterval(async () => {
            try { await runVerificationCycle(); }
            catch (err) { console.error('[Verifier] Scheduled cycle error:', err.message); }
        }, VERIFY_INTERVAL);
    }, 60000);
}

module.exports = { startTokenVerifier, runVerificationCycle, checkVerificationStatus };
