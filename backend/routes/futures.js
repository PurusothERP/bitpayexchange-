const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const db = require('../config/db');

// Setup Provider & Wallet for Payouts
const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org');
const treasuryWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// ── POST /api/futures/settle ─────────────────────────────────────────────────
// Institutional Payout Settlement: Credits BNB back to the trader's wallet.
router.post('/settle', async (req, res) => {
    const { walletAddress, pnlAmount, originalSize, tokenSymbol, positionId } = req.body;

    // ── Input Validation ──────────────────────────────────────────────────────
    if (!walletAddress || !walletAddress.startsWith('0x') || walletAddress.length !== 42) {
        return res.status(400).json({ error: 'Invalid wallet address' });
    }

    if (!positionId) {
        return res.status(400).json({ error: 'Missing positionId — settlement rejected' });
    }

    try {
        // ── SECURITY: Verify positionId exists in DB for this wallet ──────────
        // Prevents unauthenticated external calls from draining the treasury.
        const posCheck = await db.query(`
            SELECT id, amount_bnb, trader_wallet, is_settled
            FROM trades
            WHERE position_id = ?
            AND LOWER(trader_wallet) = LOWER(?)
            LIMIT 1
        `, [positionId, walletAddress]);

        if (posCheck.rows.length === 0) {
            console.warn(`[Futures] ⚠️ Settlement rejected — positionId "${positionId}" not found for wallet ${walletAddress}`);
            return res.status(403).json({ error: 'Position not found or wallet mismatch — settlement denied' });
        }

        const tradeRecord = posCheck.rows[0];

        // ── SECURITY: Prevent double-settlement ───────────────────────────────
        if (tradeRecord.is_settled === 1) {
            return res.status(409).json({ error: 'Position already settled — duplicate settlement rejected' });
        }

        // ── Use actual escrow size from DB (not client-supplied) ──────────────
        const actualEscrow = parseFloat(tradeRecord.amount_bnb) || 0.001;
        const pnl = parseFloat(pnlAmount) || 0;

        // Cap payout: base escrow + capped PnL (max 10x return protection)
        const maxPayout = actualEscrow * 10;
        const rawPayout = actualEscrow + pnl;
        const totalPayoutBNB = Math.min(rawPayout, maxPayout).toFixed(5);

        if (parseFloat(totalPayoutBNB) <= 0) {
            // Mark as settled even on liquidation (zero/negative PnL)
            await db.query(`UPDATE trades SET is_settled = 1 WHERE position_id = ?`, [positionId]);
            return res.json({ success: true, message: 'Position closed (Liquidation/Zero Balance)' });
        }

        // ── Check Treasury Balance ────────────────────────────────────────────
        const balance = await provider.getBalance(treasuryWallet.address);
        const payoutWei = ethers.parseEther(totalPayoutBNB.toString());

        if (balance < payoutWei) {
            console.error('[Futures] ⚠️ Treasury insufficient for payout');
            return res.status(503).json({ error: 'System liquidity provisioning — please retry in 5 minutes.' });
        }

        // ── Execute Real BNB Transfer ─────────────────────────────────────────
        const tx = await treasuryWallet.sendTransaction({
            to: walletAddress,
            value: payoutWei
        });

        console.log(`[Futures] ✅ Settlement Tx: ${tx.hash} | Wallet: ${walletAddress} | Payout: ${totalPayoutBNB} BNB`);
        const receipt = await tx.wait();

        // ── Mark Position as Settled (prevents double-settlement) ─────────────
        await db.query(`UPDATE trades SET is_settled = 1 WHERE position_id = ?`, [positionId]);

        // ── Log to Treasury Transfers ─────────────────────────────────────────
        await db.query(`
            INSERT OR IGNORE INTO treasury_transfers (amount_bnb, destination_address, tx_hash, transfer_type)
            VALUES (?, ?, ?, ?)
        `, [totalPayoutBNB, walletAddress, tx.hash, 'futures_payout']);

        // ── Log Closed Trade ──────────────────────────────────────────────────
        await db.query(`
            INSERT INTO trades (token_address, token_symbol, trader_wallet, trade_type, amount_tokens, amount_bnb, pnl_bnb, tx_hash, position_id, is_settled)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `, ['FUTURES_MARKET', tokenSymbol || 'FUTURES', walletAddress, 'futures_close', originalSize || 0, actualEscrow, pnl, tx.hash, positionId]);

        res.json({
            success: true,
            txHash: tx.hash,
            payout: totalPayoutBNB,
            message: 'Margin and PnL credited to your wallet.'
        });

    } catch (err) {
        console.error('[Futures Settlement Error]', err);
        res.status(500).json({ error: 'Payout execution failed: ' + (err.reason || err.message) });
    }
});

module.exports = router;
