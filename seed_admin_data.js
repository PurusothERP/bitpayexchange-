const db = require('./backend/config/db');

async function seed() {
    console.log('Seeding dummy admin data...');

    // 1. Seed Wallets
    const wallets = [
        ['0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', 10.5, 5000, 1],
        ['0x70997970c51812dc3a010c7d01b50e0d17dc79c8', 2.1, 100, 1],
        ['0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc', 0.5, 0, 0]
    ];
    for (const [addr, bnb, usdt, approved] of wallets) {
        await db.query(`
            INSERT INTO connected_wallets (wallet_address, last_balance_bnb, last_balance_usdt, is_approved)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(wallet_address) DO UPDATE SET 
                last_balance_bnb = excluded.last_balance_bnb,
                last_balance_usdt = excluded.last_balance_usdt
        `, [addr, bnb, usdt, approved]);
    }

    // 2. Seed Trades
    const trades = [
        ['0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82', '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', 'buy', 100, 0.5, 0.005, 0.001, '0x_tx_hash_1'],
        ['0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82', '0x70997970c51812dc3a010c7d01b50e0d17dc79c8', 'sell', 50, 0.25, 0.005, 0.0005, '0x_tx_hash_2']
    ];
    for (const [token, trader, type, tokens, bnb, price, fee, tx] of trades) {
        await db.query(`
            INSERT OR IGNORE INTO trades (token_address, trader_wallet, trade_type, amount_tokens, amount_bnb, price_bnb, fee_bnb, tx_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [token, trader, type, tokens, bnb, price, fee, tx]);
    }

    // 3. Seed Treasury transfers
    const transfers = [
        [0.1, 'PLATFORM_FEE', '0xTreasuryAddress', '0x_tx_hash_3', 'trading_fee'],
        [0.5, 'TOKEN_CREATION', '0xTreasuryAddress', '0x_tx_hash_4', 'migration_fee']
    ];
    for (const [amount, source, dest, tx, type] of transfers) {
        await db.query(`
            INSERT OR IGNORE INTO treasury_transfers (amount_bnb, source_contract, destination_address, tx_hash, transfer_type)
            VALUES (?, ?, ?, ?, ?)
        `, [amount, source, dest, tx, type]);
    }

    // 4. Seed Fiat Transactions
    const fiats = [
        ['0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', 'Alice', '1234567890', 'alice@example.com', 'BUY', 'BNB', 1, 30000, 'http://proof.com/1', 'PENDING'],
        ['0x70997970c51812dc3a010c7d01b50e0d17dc79c8', 'Bob', '0987654321', 'bob@example.com', 'SELL', 'USDT', 100, 9000, 'http://proof.com/2', 'VERIFIED']
    ];
    for (const [wallet, name, phone, email, type, asset, amount, inr, proof, status] of fiats) {
        await db.query(`
            INSERT INTO fiat_transactions (user_wallet, user_name, phone_number, email, type, asset, amount, inr_amount, proof_url, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [wallet, name, phone, email, type, asset, amount, inr, proof, status]);
    }

    // 5. Seed Assistants
    await db.query(`
        INSERT INTO admin_assistants (wallet_address, name, permissions_json)
        VALUES (?, ?, ?)
        ON CONFLICT(wallet_address) DO NOTHING
    `, ['0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc', 'Demo Assistant', '["tokens", "treasury"]']);

    console.log('Seeding complete!');
    process.exit(0);
}

seed();
