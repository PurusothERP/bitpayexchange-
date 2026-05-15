const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../database.sqlite');
const db = new sqlite3.Database(dbPath);

async function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

async function fixAddresses() {
    console.log('[Fix] Starting address normalization...');
    
    try {
        const tChanges = await runQuery(`UPDATE tokens SET contract_address = LOWER(contract_address), creator_wallet = LOWER(creator_wallet)`);
        console.log(`[Fix] Updated ${tChanges} rows in tokens table.`);

        const trChanges = await runQuery(`UPDATE trades SET token_address = LOWER(token_address), trader_wallet = LOWER(trader_wallet)`);
        console.log(`[Fix] Updated ${trChanges} rows in trades table.`);

        const cwChanges = await runQuery(`UPDATE connected_wallets SET wallet_address = LOWER(wallet_address)`);
        console.log(`[Fix] Updated ${cwChanges} rows in connected_wallets table.`);

        const mtChanges = await runQuery(`UPDATE meme_trades SET token_address = LOWER(token_address), wallet_address = LOWER(wallet_address)`);
        console.log(`[Fix] Updated ${mtChanges} rows in meme_trades table.`);

        const yiChanges = await runQuery(`UPDATE yield_investments SET wallet_address = LOWER(wallet_address)`);
        console.log(`[Fix] Updated ${yiChanges} rows in yield_investments table.`);

        const smChanges = await runQuery(`UPDATE smart_money_investments SET wallet_address = LOWER(wallet_address)`);
        console.log(`[Fix] Updated ${smChanges} rows in smart_money_investments table.`);

        console.log('[Fix] ✅ Database normalization complete.');
    } catch (err) {
        console.error('[Fix] ❌ Error during normalization:', err.message);
    } finally {
        db.close();
    }
}

fixAddresses();
