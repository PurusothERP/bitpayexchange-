# B20 Exchange: Omnibus Ecosystem Audit & Technical Reference

## 1. Blockchain & Smart Contract Architecture

### **Core Contract Protocols**
*   **Chain:** Binance Smart Chain (Mainnet)
*   **Chain ID:** 56
*   **Factory Contract (B20_FACTORY):** `0xc4F46f4ee4F48498f8243D63b026d321e5C2aCe2`
    *   *Role:* Deployer for all Standard, Bonding Curve, and Fair Launch tokens.
    *   *Functions:* `createToken`, `addLiquidityForToken`, `isLinked(address)`.
*   **PancakeSwap V2 Router:** `0x10ED43C718714eb63d5aA57B78B54704E256024E`
*   **WBNB Address:** `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c`

### **ABI Specifications (Condensed)**
*   **Token (ERC20):** `[ "function approve(address,uint256) returns (bool)", "function allowance(address,address) view returns (uint256)", "function balanceOf(address) view returns (uint256)" ]`
*   **PancakeRouter:** `[ "function swapExactETHForTokens(uint,address[],address,uint) payable", "function swapExactTokensForETH(uint,uint,address[],address,uint)", "function getAmountsOut(uint,address[]) view returns (uint[])" ]`
*   **B20_Factory:** `[ "function addLiquidityForToken(address,uint256) external payable", "function isLinked(address) view returns (bool)" ]`

---

## 2. Wallet & Treasury Infrastructure

### **Institutional Treasury Protocol**
*   **Treasury/Admin Wallet:** `0x6451EE4DEf4a8b8FbC2c64301A79e267De378935`
*   **Private Key Cache:** Located in Backend `.env` as `PRIVATE_KEY`.
*   **Operational Role:** 
    *   Primary receiver for all token deployment service fees.
    *   Institutional Payout Wallet for all Futures trading profits.
    *   Authorized agent for TrustWallet PR submissions and BSCScan Verification.

### **Service Fee Structure**
*   **Escrow Service Fee:** 0.001 BNB (Spot/Futures Opening).
*   **Standard Token Listing:** 0.01 BNB.
*   **Liquidity Migration Fee:** 0.003 BNB.

---

## 3. Backend API & Engine Documentation (REST)

### **Module: Tokens (`/api/tokens`)**
*   `GET /by-wallet/:address` - Fetches all assets owned by the connected wallet.
*   `POST /create` - Records new on-chain token metadata and IPFS CID.
*   `GET /chart/:address` - Aggregates historical price action for terminal displays.

### **Module: Trading Analytics (`/api/wallets`)**
*   `GET /stats/:address` - Returns aggregate volume, win-rate, and total PnL.
*   `GET /trades/:address` - Fetches the full institutional ledger (Audit Table).
*   `GET /active/:address` - Persistent check for unclosed futures positions using `position_id`.

### **Module: Futures Engine (`/api/futures`)**
*   `POST /settle` - Backend treasury payout logic. Verifies PnL and broadcasts real BNB from Treasury to User.

### **Module: Admin & Social**
*   `GET /admin/revenue` - Provides daily/weekly fee collection metrics.
*   `POST /bulletin` - Disseminates global exchange announcements.

---

## 4. AI Intelligence Architecture

### **Integrated Models**
*   **Google Gemini Pro:** Primary engine for technical analysis and candlestick pattern recognition.
*   **DeepSeek-V3:** Secondary engine for tokenomic sentiment and contract auditing.

### **Intelligence Features**
*   **Predictive Sentiment:** 0-100 score based on social signals and on-chain whale activity.
*   **Market Guard:** Automated pattern detection within the Trading Panel to notify users of potential volatility.

---

## 5. Technical Stack & Dependencies

### **Frontend (UI/UX)**
*   **Framework:** Next.js 14 (Turbopack Enabled).
*   **Design:** Tailwind CSS with Custom Institutional Dark-Grid (Indigo/Emerald/Rose palette).
*   **Interactivity:** Framer Motion (Micro-animations).
*   **Wallet Comms:** `ethers.js v6` + BrowserProvider.

### **Backend (Infrastructure)**
*   **Runtime:** Node.js v20.
*   **Server:** Express.js + CORS.
*   **Storage:** SQLite3 (Persistent audit logging for all non-blockchain metadata).
*   **Automation:** `node-cron` managed cycles for Token Verification and Treasury PnL Audit.

---

## 6. End-to-End Workflow Map

1.  **Creation:** User pays service fee → Factory deploys contract → Backend logs metadata + IPFS.
2.  **Trading:** Ethers.js triggers Wallet Extension → PancakeSwap Swaps tokens → Telemetry Sync records Ledger entry.
3.  **Futures:** User Escrows 0.001 BNB → Backend tracks Position ID → Settlement triggers Manual Payout from Treasury.
4.  **Analytics:** Ledger processes timestamp data → Heatmap highlights Red/Green based on realized daily delta.

---
**This document constitutes the definitive technical signature of the B20 Exchange Platform.**
