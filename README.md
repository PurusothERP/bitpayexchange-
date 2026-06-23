# B20 Exchange — Technical Documentation

> **Institutional-Grade Decentralized Exchange on BSC Mainnet**  
> Token Launchpad · Spot Trading · Perpetual Futures · Smart Money Hub · Staking

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Smart Contracts](#smart-contracts)
4. [Project Structure](#project-structure)
5. [API Reference](#api-reference)
6. [Function Flows](#function-flows)
7. [Database Schema](#database-schema)
8. [Environment Variables](#environment-variables)
9. [Fee Structure](#fee-structure)
10. [Background Services](#background-services)
11. [Security Architecture](#security-architecture)
12. [Running Locally](#running-locally)
13. [Deployment](#deployment)

---

## Overview

B20 Exchange is a full-stack decentralized exchange built on **Binance Smart Chain (BSC)**. It includes:

- 🚀 **Token Launchpad** — MEME (Bonding Curve), STANDARD (BEP-20), and FAIR (Direct DEX) launches
- 💱 **Spot Exchange** — Real-time PancakeSwap V2 swaps with 6,000+ tradable tokens
- 📈 **Perpetual Futures** — Leverage trading with real BNB settlement
- 💡 **Smart Money Hub** — Institutional portfolio bucket investing
- 🔒 **Staking** — Token staking with 2%–16% APR tiers
- 🛡️ **Admin Panel** — Full treasury audit, assistant RBAC, and token moderation

---

## Tech Stack

### Frontend
| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | JavaScript (React 18) |
| Styling | Vanilla CSS + Glassmorphism |
| Animations | Framer Motion |
| Icons | Lucide React |
| Blockchain SDK | ethers.js v6 |
| HTTP Client | Axios |
| Wallet | MetaMask / WalletConnect via WalletContext |
| Charts | TradingView Lightweight Widget |

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js + Express.js |
| Database | SQLite3 (WAL Mode, 32MB Cache) |
| Blockchain | ethers.js JsonRpcProvider (BSC RPC) |
| File Storage | Pinata IPFS |
| AI / ML | Anthropic Claude API |
| Token Verification | BSCScan API (auto-cycle) |
| Asset Listing | Trust Wallet GitHub PR automation |
| Market Data | CoinGecko API (backend proxy) |
| Rate Limiting | express-rate-limit (200 req/min) |
| Security | CORS whitelist · Admin secret header |

### Smart Contracts
| Contract | Language | Framework |
|---|---|---|
| TokenFactory | Solidity ^0.8.20 | Hardhat + OpenZeppelin |
| BondingCurve | Solidity ^0.8.20 | Hardhat + OpenZeppelin |
| LiquidityManager | Solidity ^0.8.20 | Hardhat |
| DirectDexLaunchFactory | Solidity ^0.8.20 | Hardhat |
| TokenTemplate (BEP-20) | Solidity ^0.8.20 | Hardhat + OpenZeppelin |

---

## Smart Contracts

### Deployed Addresses (BSC Mainnet — Chain ID: 56)

| Contract | Address |
|---|---|
| **TokenFactory** | `0x28533A2e05eF9e4Fea5d8724f073E967640A6760` |
| **BondingCurve** | `0x787288C5D305c9d8e118Ab5d36Ef06eecfEC1258` |
| **LiquidityManager** | `0x0C19DF362892024b907dF223F70199f68D30521F` |
| **DirectDexLaunchFactory** | `0xBF64c60ba9C7D903Ba5Df7efc8949f0e7B3C7832` |
| **PancakeSwap V2 Router** | `0x10ED43C718714eb63d5aA57B78B54704E256024E` |
| **Treasury / Fee Wallet** | `0x6e10d0414d64e37668da38b19062e3c13471e806` |

---

### TokenFactory.sol

Entry point for all token creation.

```solidity
// Create MEME Token (Bonding Curve)
// msg.value >= 0.003 BNB (deploy fee) + 0.05 BNB (min initial buy)
function createToken(string name, string symbol, uint256 virtualBnb)
    external payable returns (address tokenAddress)

// Create Standard BEP-20 Token (flat fee only)
// msg.value >= 0.003 BNB
function createTokenStandard(string name, string symbol, uint8 decimals, uint256 supply)
    external payable returns (address tokenAddress)

// Upgrade a token's trust level
// msg.value >= 0.01 BNB
function upgradeToken(address tokenAddress) external payable

// Link wallet to protocol (required before futures/smart money)
function linkProtocol() external

// View all deployed tokens
function getAllTokens() external view returns (address[])

// View tokens by creator
function getTokensByCreator(address creator) external view returns (address[])

// Check if wallet is linked
function isLinked(address wallet) external view returns (bool)
```

**Fee Table:**
| Action | Amount |
|---|---|
| MEME Token Deploy | 0.003 BNB |
| MEME Minimum Initial Buy | 0.050 BNB |
| STANDARD Token Deploy | 0.003 BNB |
| Token Upgrade / Boost | 0.010 BNB |

---

### BondingCurve.sol

AMM for MEME tokens before DEX migration.

**Price Formula:**
```
tokensOut = (bnbIn × tokenReserve) / (virtualBnb + bnbReserve + bnbIn)
bnbOut    = (tokensIn × totalBnb)  / (tokenReserve + tokensIn)
```

**Fee:** 5% on all buys and sells (waived for treasury wallet)
- 60% of fee → LP buffer (held in contract)
- 40% of fee → Treasury

**Auto-Migration at 10 BNB Reserve:**
```
When bnbReserve >= MIGRATION_THRESHOLD (10 BNB):
  → 9 BNB  sent to Treasury (feeWallet)
  → 1 BNB  + remaining tokens added to PancakeSwap LP
  → LP tokens locked in Treasury
  → Token marked migrated = true (bonding curve permanently disabled)
```

```solidity
// Buy tokens on the bonding curve
function buy(address token) external payable

// Sell tokens back to the bonding curve
function sell(address token, uint256 amount) external

// View migration progress
function getMigrationProgress(address token) external view returns (
    uint256 currentReserve,
    uint256 threshold,
    uint256 percentFilled,
    bool migrated
)

// Admin: manually trigger migration
function migrateToken(address token) external onlyOwner

// Admin: sweep all BNB to treasury
function sweepAllBNB() external
```

---

### DirectDexLaunchFactory.sol

For FAIR launch tokens — minted and listed directly on PancakeSwap at a creator-defined price.

- **Fee:** 0.007 BNB
- No bonding curve phase
- Token immediately tradeable on PancakeSwap at listing price

---

### TokenTemplate.sol

The BEP-20 token contract deployed for all launch types.

- OpenZeppelin ERC-20 compliant
- MEME: Fixed 1,000,000,000 supply, 18 decimals, owned by BondingCurve
- STANDARD: Custom supply, decimals, creator-owned
- 90% supply → BondingCurve / Creator
- 10% supply → Treasury

---

## Project Structure

```
b20-exchange/
├── frontend/                      # Next.js App
│   ├── src/
│   │   ├── app/
│   │   │   ├── exchange/          # Main Exchange (Spot/Futures/Markets)
│   │   │   ├── admin/             # Admin Dashboard
│   │   │   ├── profile/           # User Profile + Trade History
│   │   │   ├── staking/           # Staking Module
│   │   │   ├── create/            # MEME Token Creator
│   │   │   ├── standard/          # STANDARD Token Creator
│   │   │   ├── fair-launch/       # FAIR Launch
│   │   │   ├── fiat/              # Fiat On/Off Ramp (INR)
│   │   │   ├── dex/               # DEX interface
│   │   │   ├── treasury/          # Treasury viewer
│   │   │   └── b20ai/             # B20 AI Intelligence Panel
│   │   ├── components/
│   │   │   ├── Navbar.js          # Global navigation
│   │   │   └── B20AIPanel.js      # AI analysis widget
│   │   ├── context/
│   │   │   └── WalletContext.js   # MetaMask/WalletConnect state
│   │   └── lib/
│   │       ├── abis.js            # Contract ABIs
│   │       └── protocolApproval.js # MaxUint approval helper
│   └── public/
│
├── backend/                       # Express API Server
│   ├── routes/
│   │   ├── tokens.js              # Token CRUD + CoinGecko proxy
│   │   ├── trades.js              # Trade sync + history
│   │   ├── futures.js             # Futures settlement (with DB auth)
│   │   ├── wallets.js             # Wallet registry + Smart Money
│   │   ├── treasury.js            # Treasury transfers log
│   │   ├── staking.js             # Staking records + APR
│   │   ├── admin.js               # Admin assistants + RBAC
│   │   ├── ml.js                  # AI whitepaper + analysis
│   │   ├── community.js           # Community posts
│   │   ├── bulletin.js            # Announcement board
│   │   ├── fiat.js                # Fiat buy/sell requests
│   │   └── nodeSync.js            # Node sync utilities
│   ├── services/
│   │   ├── treasuryAutomation.js  # Blockchain event indexer
│   │   ├── tokenVerifier.js       # BSCScan auto-verification
│   │   ├── aiNewsAutomation.js    # AI news scheduler
│   │   ├── storage.js             # Pinata IPFS uploader
│   │   └── trustWalletService.js  # Trust Wallet GitHub PR
│   ├── middleware/
│   │   └── adminAuth.js           # Dual-layer admin auth
│   ├── config/
│   │   └── db.js                  # SQLite + WAL setup + schema
│   └── index.js                   # Express app entry point
│
├── contracts/                     # Hardhat Project
│   ├── contracts/
│   │   ├── TokenFactory.sol
│   │   ├── BondingCurve.sol
│   │   ├── LiquidityManager.sol
│   │   ├── DirectDexLaunchFactory.sol
│   │   └── TokenTemplate.sol
│   ├── scripts/                   # Deploy scripts
│   └── hardhat.config.js
│
├── indexer/                       # Standalone blockchain indexer
└── database.sqlite                # SQLite database (WAL mode)
```

---

## API Reference

**Base URL:** `http://localhost:3001/api`

### Tokens — `/api/tokens`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Public | All active B20 launchpad tokens |
| GET | `/?include_delisted=true` | Public | All tokens including delisted |
| GET | `/markets/cg` | Public | CoinGecko market data proxy (250/page) |
| GET | `/markets/trending` | Public | CoinGecko trending tokens (enriched) |
| GET | `/markets/new` | Public | CoinGecko newly listed tokens |
| GET | `/list` | Public | Uniswap-compatible token list JSON |
| GET | `/stats` | Public | Platform token counts |
| GET | `/by-wallet/:wallet` | Public | Tokens created by a wallet |
| GET | `/:address` | Public | Single token by contract address |
| GET | `/verify-status/:address` | Public | BSCScan + Trust Wallet PR status |
| GET | `/filter/delisted` | Public | Delisted tokens only |
| GET | `/listing-submissions` | Public | All listing applications |
| POST | `/sync` | Public | Register newly deployed token |
| POST | `/status/update` | **Admin** | Delist / update token visibility |
| POST | `/status/request` | Public | Request trust status upgrade |
| POST | `/boost` | Public | Boost token (0.05 BNB fee) |
| POST | `/admin/list` | **Admin** | Directly list external token |
| POST | `/admin/verify-cycle` | **Admin** | Manually trigger verification |
| POST | `/listing-submissions` | Public | Submit listing application |
| PATCH | `/listing-submissions/:id` | **Admin** | Approve / reject listing |

---

### Trades — `/api/trades`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/history/:tokenAddress` | Last 200 on-chain trades for a token |
| GET | `/chart/:tokenAddress` | Price history for chart rendering |
| GET | `/market/:tokenAddress` | 24h volume, high, low for a token |
| POST | `/sync` | Record a new trade (spot or futures open) |

**POST `/sync` Body:**
```json
{
  "tokenAddress": "0x...",
  "tokenSymbol": "BNB",
  "buyerWallet": "0x...",
  "amount": "1000",
  "amountBNB": "0.5",
  "priceBNB": "0.0005",
  "txHash": "0x...",
  "tradeType": "buy | sell | futures_open | futures_close",
  "positionId": "pos_1234567890"
}
```

---

### Futures — `/api/futures`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/settle` | positionId DB verified | Settle position — pays BNB to trader |

**POST `/settle` Body:**
```json
{
  "walletAddress": "0x...",
  "pnlAmount": "0.002",
  "originalSize": "0.001",
  "tokenSymbol": "BTC",
  "positionId": "pos_1713345678901"
}
```

**Security checks (in order):**
1. Wallet address format validation
2. `positionId` must exist in `trades` table for this wallet
3. `is_settled = 0` check (prevents double claims)
4. Payout capped at `10× actual escrow` from DB
5. Treasury balance check before transfer
6. Real on-chain BNB transfer
7. Mark `is_settled = 1` after payout

---

### Wallets — `/api/wallets`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | All connected wallets |
| POST | `/sync` | Register/update wallet |
| POST | `/mark-linked` | Mark as protocol-linked |
| POST | `/refresh-balances` | Refresh all BNB balances |
| POST | `/heartbeat` | Update last_seen timestamp |
| GET | `/stats/:address` | Trade volume + PnL for wallet |
| GET | `/trades/:address` | Full trade history (200 max) |
| GET | `/active/:address` | Unsettled futures positions |
| POST | `/smart-money/invest` | Log Smart Money investment |
| GET | `/smart-money/investments/:address` | Investment history |

---

### Treasury — `/api/treasury`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/transfers` | All fee records (filterable: `?days=7`, `?start=&end=`) |
| GET | `/stats` | Aggregate revenue stats |
| POST | `/log` | Manually log a treasury event |

---

### Staking — `/api/staking`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/periods` | Public | Staking tiers + APR rates |
| GET | `/tokens` | Public | Stakeable tokens |
| POST | `/stake` | Public | Record a new stake |
| GET | `/my-stakes/:wallet` | Public | Wallet's stakes with earned rewards |
| GET | `/all` | **Admin** | All stakes |
| GET | `/stats` | **Admin** | Aggregate staking stats |
| POST | `/request-release` | Public | Request stake release after maturity |
| POST | `/admin/approve-release` | **Admin** | Approve and release stake |
| POST | `/admin/reject-release` | **Admin** | Reject release request |

**APR Tiers:**
| Period | APR |
|---|---|
| 60 days | 2.0% |
| 90 days | 3.5% |
| 120 days | 5.5% |
| 160 days | 8.0% |
| 190 days | 10.0% |
| 240 days | 12.5% |
| 360 days | 16.0% |

---

### Admin — `/api/admin`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/assistants` | Public | List admin assistants |
| POST | `/assistants` | **Admin** | Add/update assistant |
| DELETE | `/assistants/:id` | **Admin** | Remove assistant |
| POST | `/assistants/login` | Public | Log assistant login event |
| GET | `/assistants/:wallet/activities` | Public | Last 5 assistant actions |
| POST | `/activities/log` | Public | Log RBAC activity |
| GET | `/revenue/export` | **Admin** | Download CSV revenue report |

**Admin Auth** — All `Admin` routes require:
- `wallet` field in body/query matching the Treasury wallet
- `x-admin-secret` header matching `ADMIN_SECRET` env var

---

### Other Routes

| Route Prefix | Purpose |
|---|---|
| `/api/ml` | AI whitepaper generation, token analysis |
| `/api/community` | Community posts + moderation |
| `/api/bulletin` | Announcement board (admin posts) |
| `/api/fiat` | INR buy/sell requests, bank details |
| `/api/node-sync` | Node synchronization utilities |

---

## Function Flows

### MEME Token Creation (Bonding Curve)

```
User fills form → name, symbol, logo
      ↓
Frontend validates → TokenFactory.createToken()
  msg.value = 0.003 BNB (fee) + ≥0.05 BNB (initial buy)
      ↓
Contract:
  1. Collects 0.003 BNB → Treasury
  2. Deploys TokenTemplate (1B supply, owned by BondingCurve)
  3. BondingCurve.launchToken() → registers market
  4. BondingCurve.buy() → creator receives initial tokens
      ↓
Frontend: POST /api/tokens/sync
  → Logo uploaded to Pinata IPFS
  → Metadata JSON created on IPFS
  → Token saved to SQLite DB
  → Trust Wallet PR submitted (background)
  → BSCScan verification queued (60s)
      ↓
[Users trade on BondingCurve]
      ↓
[At 10 BNB reserve — auto-migration]
  9 BNB → Treasury
  1 BNB + tokens → PancakeSwap LP
  LP tokens → Treasury (locked)
  Token: migrated = true (bonding curve locked)
```

---

### Spot Trading Flow

```
User selects FROM / TO tokens
      ↓
Frontend: PancakeSwap Router.getAmountsOut()
      ↓
User clicks Swap → wallet popup
      ↓
On-chain: Router.swapExactETHForTokens() or swapExactTokensForTokens()
      ↓
Frontend: POST /api/trades/sync
  → Trade recorded in DB
  → Fee (0.01%) logged to treasury_transfers
  → Token last_trade_at updated
      ↓
Trade appears in Profile history
```

---

### Perpetual Futures Flow

**Opening:**
```
User: select token, set Long/Short, Leverage (1x–100x), size
      ↓
Frontend: wallet.sendTransaction({ to: FEE_WALLET, value: 0.001 BNB })
  → Escrow fee on-chain
      ↓
Frontend: POST /api/trades/sync
  { tradeType: 'futures_open', positionId: 'pos_xxx', amountBNB: '0.001' }
      ↓
Position shown in Open Positions panel with live PnL
```

**Closing:**
```
User clicks Close
      ↓
Frontend: POST /api/futures/settle
  { walletAddress, positionId, pnlAmount }
      ↓
Backend:
  1. Verify positionId in DB for this wallet
  2. Check not already settled
  3. Use actual DB escrow amount (not client value)
  4. Cap payout = min(escrow + pnl, escrow × 10)
  5. Check treasury BNB balance
  6. Send BNB on-chain to trader
  7. Mark is_settled = 1
  8. Log to treasury_transfers + trades
      ↓
BNB arrives in user wallet
Position removed from UI
```

---

### Smart Money Hub Flow

```
User selects bucket:
  Pro Bucket:      BNB 24%, BTC 19%, ETH 16%, SOL 14%...
  Prestige Bucket: ETH 28%, BTC 22%, BNB 18%...
  Premium Bucket:  CAKE 25%, BNB 20%, USDT 18%...
  Custom Bucket:   User-defined allocations
      ↓
Frontend: Transfer $1.00 USDT service fee on-chain
  → to Smart Money Hub wallet
      ↓
Frontend: POST /api/wallets/smart-money/invest
  { wallet_address, bucket_id, invest_amount, tx_hash, bucket_json }
      ↓
Backend:
  1. Record in smart_money_investments
  2. Log $1 USDT fee to treasury_transfers
      ↓
Investment visible in Profile → Smart Money tab
```

---

### Market Data Engine (6,000+ Tokens)

```
Page load triggers fetchTokens()

Tier 1 — CoinGecko (Backend Proxy):
  10 pages × 250 tokens = ~2,500 real market tokens
  Backend: GET /api/tokens/markets/cg?page=1..10

Tier 2 — PancakeSwap Extended List:
  GET https://tokens.pancakeswap.finance/pancakeswap-extended.json
  Up to 5,000 BSC on-chain tokens
  Cross-referenced with CG for live prices

Tier 3 — B20 Native Tokens:
  GET /api/tokens (all platform-launched tokens)

Tier 4 — Redundancy Generator:
  If total < 6,000 → fills with protocol node tokens
  Ensures minimum 6,000 tradable pairs always available

→ De-duplicate by contract address
→ Sort by CoinGecko market cap rank
→ Render in Markets UI

Refresh: every 60 seconds

Discovery Sentinel:
  GET /api/tokens/markets/trending → 15 enriched trending
  GET /api/tokens/markets/new     → 50 newly listed
```

---

## Database Schema

| Table | Purpose |
|---|---|
| `tokens` | All tokens (B20 + external) with price, status, verification |
| `trades` | All trades — spot buys/sells + futures open/close |
| `price_history` | Per-tick price data for charts |
| `treasury_transfers` | Complete fee audit log |
| `connected_wallets` | Wallet registry with BNB balance |
| `staking_records` | Active and historical staking positions |
| `smart_money_investments` | Smart Money Hub portfolio records |
| `fiat_transactions` | INR buy/sell requests |
| `listing_submissions` | Token listing applications |
| `admin_assistants` | RBAC admin roles |
| `assistant_activities` | Admin action audit log |
| `whitepapers` | AI-generated whitepapers |
| `community_posts` | Community feed |
| `announcements` | Admin bulletin board |

---

## Environment Variables

### Backend (`backend/.env`)

```env
# Pinata IPFS
PINATA_API_KEY=your_pinata_key
PINATA_API_SECRET=your_pinata_secret
PINATA_JWT=your_pinata_jwt

# Server
PORT=3001

# Security
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
ADMIN_SECRET=change_this_before_deploy

# BSC RPC
BSC_RPC_URL=https://bsc-dataseed.binance.org

# Smart Contracts
FACTORY_ADDRESS=0x28533A2e05eF9e4Fea5d8724f073E967640A6760
BONDING_CURVE_ADDRESS=0x787288C5D305c9d8e118Ab5d36Ef06eecfEC1258
LIQUIDITY_MANAGER_ADDRESS=0x0C19DF362892024b907dF223F70199f68D30521F
DIRECT_FACTORY_ADDRESS=0xBF64c60ba9C7D903Ba5Df7efc8949f0e7B3C7832

# Treasury
FEE_WALLET=0x6e10d0414d64e37668da38b19062e3c13471e806
PRIVATE_KEY=<treasury_wallet_private_key>

# External APIs
ANTHROPIC_API_KEY=your_anthropic_key
COINGECKO_API_KEY=your_cg_key
BSCSCAN_API_KEY=your_bscscan_key
GITHUB_TOKEN=your_github_pat
GITHUB_USERNAME=NilanRitvik
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_FACTORY_ADDRESS=0x28533A2e05eF9e4Fea5d8724f073E967640A6760
NEXT_PUBLIC_FEE_WALLET=0x6e10d0414d64e37668da38b19062e3c13471e806
```

---

## Fee Structure

| Action | Fee | Destination |
|---|---|---|
| MEME token deploy | 0.003 BNB | Treasury |
| MEME initial buy | ≥ 0.050 BNB | BondingCurve AMM |
| BondingCurve buy | 5% of value | 40% Treasury / 60% LP Buffer |
| BondingCurve sell | 5% of value | Treasury |
| Migration at 10 BNB | 10 BNB total | 9 BNB Treasury / 1 BNB PancakeSwap LP |
| STANDARD token deploy | 0.003 BNB | Treasury |
| FAIR launch deploy | 0.007 BNB | Treasury |
| Token upgrade | 0.010 BNB | Treasury |
| Token boost | 0.050 BNB | Treasury |
| Spot swap fee | 0.01% of trade | Treasury |
| Futures open escrow | 0.001 BNB | Treasury |
| Futures settlement | Escrow + PnL | Returned to Trader |
| Smart Money Hub | $1.00 USDT | Smart Money Wallet |

---

## Background Services

| Service | Schedule | Role |
|---|---|---|
| **Treasury Automation** | On startup + event-driven | Indexes all on-chain TokenCreated / Buy / Sell events from BSC |
| **Token Verifier** | Every 1 hour | Submits pending tokens to BSCScan for source verification |
| **AI News Automation** | Scheduled | Generates AI market analysis for the Bulletin Board |
| **Wallet Balance Refresh** | Every 30 minutes | Refreshes BNB balances + `isLinked` status for all wallets |

---

## Security Architecture

```
┌─────────────────────────────────────────────┐
│         FRONTEND (Next.js)                  │
│  WalletContext → MetaMask / WalletConnect    │
│  ethers.js → BSC Mainnet RPC                │
└────────────────────┬────────────────────────┘
                     │ CORS: Whitelisted Origins Only
┌────────────────────▼────────────────────────┐
│         BACKEND (Express.js)                │
│  Rate Limit: 200 req/min per IP             │
│  Futures Settle: 10 req/min per IP          │
│  Admin: wallet + x-admin-secret header      │
│  Futures: positionId verified in DB         │
└────────────────────┬────────────────────────┘
                     │
┌────────────────────▼────────────────────────┐
│  SQLite (WAL Mode)                          │
│  journal_mode=WAL · cache_size=32MB         │
│  temp_store=MEMORY · foreign_keys=ON        │
└────────────────────┬────────────────────────┘
                     │ ethers.js
┌────────────────────▼────────────────────────┐
│  BSC Mainnet                                │
│  TokenFactory · BondingCurve · PancakeSwap  │
└─────────────────────────────────────────────┘
```

---

## Running Locally

### Prerequisites
- Node.js 18+
- npm 9+
- MetaMask browser extension

### Backend

```bash
cd backend
npm install
# Copy and fill .env
cp .env.example .env
node index.js
# Backend runs at http://localhost:3001
```

### Frontend

```bash
cd frontend
npm install
# Copy and fill .env.local
cp .env.local.example .env.local
npm run dev
# Frontend runs at http://localhost:3000
```

### Contracts (optional — already deployed)

```bash
cd contracts
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network bsc
```

---

## Deployment

### Production Checklist

```
[ ] Set ALLOWED_ORIGINS to production domain in backend/.env
[ ] Set ADMIN_SECRET to a secure random value
[ ] Rotate PRIVATE_KEY — use a hardware wallet / HSM in production
[ ] Rotate all API keys (Pinata, GitHub, Anthropic, CoinGecko, BSCScan)
[ ] Point BSC_RPC_URL to a paid RPC (Moralis / Alchemy / QuickNode)
[ ] Set NEXT_PUBLIC_API_URL to production backend URL
[ ] Ensure backend/.env is NOT committed to Git (.gitignore)
[ ] Ensure treasury wallet has ≥ 2 BNB for futures payout liquidity
[ ] Run `npm run build` in frontend and verify production bundle
[ ] Put backend behind Nginx reverse proxy with SSL
[ ] Set up monitoring for /health endpoint
```

---

## GitHub Repository

```
Repository: NilanRitvik/B20LAB-FA
Branch:     main
```

---

*B20 Exchange — BSC Mainnet · Built with Next.js + Express + Solidity*
