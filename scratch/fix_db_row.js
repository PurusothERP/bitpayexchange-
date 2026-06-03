const db = require('../backend/config/db');

async function fixRow() {
    try {
        const updatedJson = JSON.stringify({
            type: "StockTrade",
            ticker: "AAPL",
            action: "buy",
            quantity: 1,
            leverage: 1,
            entry_price: 182.50,
            price: 182.50,
            total_usd: 182.50
        });
        
        await db.query(
            `UPDATE smart_money_investments 
             SET invest_amount = 182.50, bucket_json = ? 
             WHERE id = 1`,
            [updatedJson]
        );
        
        console.log("Database row fixed successfully!");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

fixRow();
