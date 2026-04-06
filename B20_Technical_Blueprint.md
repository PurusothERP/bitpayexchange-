# B20 Exchange: Institutional Web3 Trading Ecosystem

## 1. Project Overview
B20 is a high-performance decentralized exchange and token incubation platform on the **Binance Smart Chain (BSC_56)**. It combines a premium trading terminal with an automated launchpad and institutional-grade portfolio analytics.

---

## 2. Product Modules & Features

### **A. Token Creation Terminal (`/create`)**
*   **Multi-Mode Deployment:** Supports **Standard**, **Bonding Curve**, and **Fair Launch** tokens.
*   **On-Chain Factory:** All tokens are deployed via a single, audited B20 Factory Contract.
*   **IPFS Metadata:** Automatically uploads token logos and descriptions to IPFS for decentralized storage.

### **B. Launchpad Hub (`/launchpad`)**
*   **Bonding Curve Logic:** Early-stage liquidity modeling with a mathematical curve.
*   **Auto-Migration:** Once the market cap threshold is hit, the contract automatically creates a PancakeSwap V2 Pair and migrates liquidity.
*   **Verified Badges:** Tokens are automatically checked against BSCScan status and marked as 'Trusted' if verified.

### **C. Institutional Exchange (`/exchange`)**
*   **Spot Swaps:** Real-time routing through PancakeSwap V2 for low-slippage trading.
*   **Price Intelligence:** Dynamic charts, volume bars, and order books.
*   **Telemetry Sync:** Every trade is recorded in the backend's persistent ledger for audit purposes.

### **D. Perpetual Futures Terminal**
*   **Leverage Trading:** Supports 1x - 100x leverage on major pairs (BTC-PERP, ETH-PERP).
*   **Realized PnL:** All settlement profits are credited directly in BNB from the B20 Treasury Wallet.
*   **Position Persistence:** Active trades are stored on the server, ensuring they survive browser reloads and device changes.

### **E. B20 AI Agent Panel**
*   **Multi-Model Analysis:** Integrated with Gemini Pro and DeepSeek for high-fidelity price prediction.
*   **Sentiment Intelligence:** Web-scraping and social signals monitoring for trending assets.

### **F. Profile & Trading Analytics**
*   **On-Chain Ledger:** A complete, institutional-grade table of every trade (Action, Pair, Type, Status, PnL).
*   **PnL Heatmap Calendar:** Visual calendar showing daily trading performance (Green for profit, Red for loss).
*   **Live Portfolio:** Real-time balance and asset tracking across all connected wallets.

### **G. Admin Nexus Terminal (`/admin`)**
*   **Revenue Dashboard:** Daily, Weekly, and Monthly revenue monitoring from factory fees.
*   **Token Verification:** Manual and automated tools to submit tokens to **TrustWallet Asset Repo** and **BSCScan Verification**.

---

## 3. Technical Stack

### **Frontend Architecture**
*   **Framework:** Next.js 14 (App Router)
*   **Styling:** Tailwind CSS (Custom Dark Mode / Institutional Grid)
*   **Animations:** Framer Motion
*   **State Management:** React Context (WalletContext)
*   **Icons:** Lucide React

### **Backend Infrastructure**
*   **Environment:** Node.js + Express.js
*   **Database:** SQLite3 (Persistent audit logging)
*   **Private Key Management:** Secure environment variables for Institutional Treasury Payouts.

### **Blockchain Integration**
*   **Library:** Ethers.js v6
*   **Smart Contracts:** Solidity (Factory + Token Implementations)
*   **Network:** Binance Smart Chain (Mainnet / BSC_56)

### **External APIs**
*   **Price Data:** CoinGecko Pro API
*   **Explorer:** BSCScan API (Contract Verification)
*   **Metadata:** IPFS (via HTTP Pinning)
*   **Charts:** TradingView Widget Integration

---

## 4. Revenue & Fee Model
1.  **Deployment Fees:** Each token creation incurs an on-chain service fee (e.g., 0.001 - 0.01 BNB).
2.  **Trading Fees:** Standard 1% fee on Bonding Curve trades; 0.01% on spot exchange transactions.
3.  **Futures Escrow:** Tiny escrow fee on position opens to ensure on-chain commitment.

---

## 5. Security & Persistence Logic
*   **No Dummy Entry Policy:** Every trade shown in the user profile is verified against a real `tx_hash` on the blockchain.
*   **Treasury Payouts:** Fully automated, script-controlled settlements ensure traders receive PnL even when not interacting with an extension.
*   **Data Integrity:** Multi-layered sync (Backend DB + On-Chain Events) ensures zero data loss during network congestion.

---
**B20 Exchange: The Future of Institutional Decentralized Finance.**
