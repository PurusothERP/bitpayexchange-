-- Tokens table
CREATE TABLE IF NOT EXISTS tokens (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    contract_address VARCHAR(42) UNIQUE NOT NULL,
    creator_wallet VARCHAR(42) NOT NULL,
    logo_url TEXT,
    metadata_url TEXT,
    description TEXT,
    total_supply NUMERIC(78, 0), -- Support uint256
    decimals INTEGER DEFAULT 18,
    trading_enabled BOOLEAN DEFAULT FALSE,
    max_tx_amount NUMERIC(78, 0),
    liquidity_bnb NUMERIC(78, 0) DEFAULT 0,
    price_bnb NUMERIC(38, 18) DEFAULT 0,
    tx_hash VARCHAR(66),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trades table
CREATE TABLE IF NOT EXISTS trades (
    id SERIAL PRIMARY KEY,
    token_address VARCHAR(42) NOT NULL REFERENCES tokens(contract_address),
    buyer_wallet VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    price_bnb NUMERIC(38, 18) NOT NULL,
    tx_hash VARCHAR(66) UNIQUE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Holders table
CREATE TABLE IF NOT EXISTS holders (
    id SERIAL PRIMARY KEY,
    token_address VARCHAR(42) NOT NULL REFERENCES tokens(contract_address),
    wallet_address VARCHAR(42) NOT NULL,
    balance NUMERIC(78, 0) NOT NULL,
    UNIQUE(token_address, wallet_address)
);

-- Metrics/Price history could be added later
