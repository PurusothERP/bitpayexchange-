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

    if (!walletAddress || !walletAddress.startsWith('0x')) {
        return res.status(400).json({ error: 'Invalid wallet address' });
    }

    try {
        console.log(`[Futures] Settling position for ${walletAddress}. Payout: ${pnlAmount} BNB`);

        // Calculate payout (Original Escrow 0.001 + PnL)
        // For the demo, we credit back the original escrow + a small mock profit or loss.
        const baseRefund = 0.001; 
        const totalPayoutBNB = (parseFloat(baseRefund) + parseFloat(pnlAmount || 0)).toFixed(5);
        
        if (totalPayoutBNB <= 0) {
            return res.json({ success: true, message: 'Position closed (Liquidation/Zero Balance)' });
        }

        // 1. Check Treasury Balance
        const balance = await provider.getBalance(treasuryWallet.address);
        const payoutWei = ethers.parseEther(totalPayoutBNB.toString());
        
        if (balance < payoutWei) {
            console.error('[Futures] Treasury Insufficient Funds for Payout');
            return res.status(503).json({ error: 'System Liquidity Provisioning... Please try again in 5 minutes.' });
        }

        // 2. Execute Transfer (Real BNB Credit)
        const tx = await treasuryWallet.sendTransaction({
            to: walletAddress,
            value: payoutWei
        });
        
        console.log(`[Futures] Settlement Tx Sent: ${tx.hash}`);
        const receipt = await tx.wait();

        // 3. Log to DB: Treasury Transfers
        await db.query(`
            INSERT INTO treasury_transfers (amount_bnb, destination_address, tx_hash, transfer_type)
            VALUES (?, ?, ?, ?)
        `, [totalPayoutBNB, walletAddress, tx.hash, 'futures_payout']);

        // 4. Log to DB: Trades (for Profile History/Calendar)
        await db.query(`
            INSERT INTO trades (token_address, token_symbol, trader_wallet, trade_type, amount_tokens, amount_bnb, pnl_bnb, tx_hash, position_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, ['FUTURES_MARKET', tokenSymbol || 'FUTURES', walletAddress, 'futures_close', 0, originalSize || 0, pnlAmount || 0, tx.hash, positionId]);

        res.json({ 
            success: true, 
            txHash: tx.hash, 
            payout: totalPayoutBNB,
            message: 'Margin and PnL credited back to your wallet.' 
        });
    } catch (err) {
        console.error('[Futures Settlement Error]', err);
        res.status(500).json({ error: 'Payout execution failed: ' + (err.reason || err.message) });
    }
});

module.exports = router;
