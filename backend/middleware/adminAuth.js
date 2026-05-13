/**
 * B20 Admin Authentication Middleware
 * 
 * Dual-layer admin authorization:
 * 1. Wallet address must match treasury FEE_WALLET (on-chain identity)
 * 2. Optional: x-admin-secret header for server-side route protection
 * 
 * Usage:
 *   const { requireAdmin, requireAdminOrAssistant } = require('../middleware/adminAuth');
 *   router.post('/admin/action', requireAdmin, handler);
 */

const db = require('../config/db');

const TREASURY = (process.env.FEE_WALLET || '').toLowerCase();
const ADMIN_SECRET = process.env.ADMIN_SECRET || null;

/**
 * requireAdmin — wallet must be the treasury wallet.
 * Reads wallet from:
 *   - req.body.wallet (POST/PATCH)
 *   - req.query.wallet (GET)
 *   - req.headers['x-wallet-address'] (alternative)
 */
const requireAdmin = (req, res, next) => {
    const wallet = (
        req.body?.wallet ||
        req.query?.wallet ||
        req.headers['x-wallet-address'] ||
        ''
    ).toLowerCase().trim();

    if (!wallet) {
        return res.status(401).json({ error: 'Admin wallet address required' });
    }

    if (wallet !== TREASURY) {
        console.warn(`[AdminAuth] ⛔ Unauthorized access attempt from: ${wallet} | Route: ${req.method} ${req.path}`);
        return res.status(403).json({ error: 'Admin only — wallet not authorized' });
    }

    // Optional secret header check for added hardening
    if (ADMIN_SECRET) {
        const providedSecret = req.headers['x-admin-secret'];
        if (!providedSecret || providedSecret !== ADMIN_SECRET) {
            console.warn(`[AdminAuth] ⛔ Missing or wrong admin secret from wallet: ${wallet}`);
            return res.status(403).json({ error: 'Admin secret mismatch — access denied' });
        }
    }

    next();
};

/**
 * requireAdminOrAssistant — wallet must be treasury OR in admin_assistants table.
 * Used for moderation tasks that assistants can perform.
 */
const requireAdminOrAssistant = async (req, res, next) => {
    const wallet = (
        req.body?.wallet ||
        req.query?.wallet ||
        req.headers['x-wallet-address'] ||
        ''
    ).toLowerCase().trim();

    if (!wallet) {
        return res.status(401).json({ error: 'Wallet address required' });
    }

    // Treasury is always authorized
    if (wallet === TREASURY) return next();

    try {
        const check = await db.query(
            'SELECT 1 FROM admin_assistants WHERE LOWER(wallet_address) = ?',
            [wallet]
        );
        if (check.rows.length > 0) return next();
    } catch (e) {
        console.error('[AdminAuth] DB check failed:', e.message);
    }

    console.warn(`[AdminAuth] ⛔ Unauthorized assistant attempt from: ${wallet}`);
    return res.status(403).json({ error: 'Unauthorized — admin or assistant required' });
};

module.exports = { requireAdmin, requireAdminOrAssistant, TREASURY };
