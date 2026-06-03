// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DirectDexLaunchFactory v2
 * @notice Fair Launch factory with automatic 10% treasury allocation.
 *
 * Supply Split on every createTokenDirect():
 *   1,000,000,000 total minted
 *   ├── 100,000,000 (10%) → Treasury Wallet  (PERMANENT — treasury controls these)
 *   └── 900,000,000 (90%) → tokensLocked[tokenAddress] in this factory
 *                           Creator can call addLiquidityForToken() MULTIPLE TIMES
 *                           to release any portion to PancakeSwap DEX.
 *
 * Creator Flow:
 *   1. createTokenDirect(name, symbol, tokensToLiquidate, {value: 0.003 BNB})
 *      → Factory mints 1B
 *      → 100M sent to TREASURY_WALLET
 *      → tokensToLiquidate (≤ 900M) added to PancakeSwap pool with creator's BNB
 *      → Remaining (900M - tokensToLiquidate) locked in factory
 *
 *   2. Creator returns to Profile page → Fair Launch tab → Release & Add Liquidity
 *      → Frontend calls addLiquidityForToken(tokenAddress, amount, {value: bnb})
 *      → Factory releases amount from lock → adds to PancakeSwap pool
 *      → Creator can do this as many times as they want until locked = 0
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IPancakeRouter {
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
    function WETH() external pure returns (address);
}

interface IPancakeFactory {
    function createPair(address tokenA, address tokenB) external returns (address pair);
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

// ── Minimal ERC-20 created per token ────────────────────────────────────────
contract FairLaunchToken is ERC20, Ownable {
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        address factory_
    ) ERC20(name_, symbol_) Ownable(factory_) {
        _mint(factory_, totalSupply_);
    }
}

// ── Main Factory ─────────────────────────────────────────────────────────────
contract DirectDexLaunchFactoryV2 is Ownable {

    // ── Constants ────────────────────────────────────────────────────────────
    uint256 public constant TOTAL_SUPPLY        = 1_000_000_000 ether; // 1B tokens
    uint256 public constant TREASURY_PERCENT    = 10;                   // 10%
    uint256 public constant CREATOR_PERCENT     = 90;                   // 90%
    uint256 public constant MAX_LIQUIDATE       = 900_000_000 ether;    // Max creator can liquidate
    uint256 public constant DEPLOY_FEE          = 0.003 ether;

    // ── State ────────────────────────────────────────────────────────────────
    address public treasuryWallet;
    address public pancakeRouter;
    address public pancakeFactory;

    mapping(address => uint256) public tokensLocked;    // Creator's releasable locked balance
    mapping(address => address) public tokenCreator;    // token → creator wallet
    mapping(address => address) public tokenAddress;    // creator → last token (for convenience)
    mapping(address => uint256) public treasuryAllocation; // token → amount sent to treasury

    // ── Events ───────────────────────────────────────────────────────────────
    event TokenCreated(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        uint256 treasuryAmount,
        uint256 liquidatedAmount,
        uint256 lockedAmount,
        address pairAddress
    );
    event LiquidityAdded(
        address indexed token,
        address indexed creator,
        uint256 tokenAmount,
        uint256 bnbAmount,
        uint256 remainingLocked
    );

    // ── Constructor ──────────────────────────────────────────────────────────
    constructor(
        address _treasuryWallet,
        address _pancakeRouter,
        address _pancakeFactory
    ) Ownable(msg.sender) {
        treasuryWallet  = _treasuryWallet;
        pancakeRouter   = _pancakeRouter;
        pancakeFactory  = _pancakeFactory;
    }

    // ── CREATE TOKEN ─────────────────────────────────────────────────────────
    /**
     * @param name              Token name
     * @param symbol            Token symbol
     * @param tokensToLiquidate How many of the 900M to put on DEX immediately (≤ 900M)
     *                          The rest stays locked for creator to release later.
     *
     * msg.value must include:
     *   • DEPLOY_FEE (0.003 BNB) — goes to treasury
     *   • BNB for initial liquidity (anything above DEPLOY_FEE)
     */
    function createTokenDirect(
        string calldata name,
        string calldata symbol,
        uint256 tokensToLiquidate
    ) external payable returns (address) {
        require(msg.value > DEPLOY_FEE, "Must send BNB for liquidity + 0.003 fee");
        require(tokensToLiquidate <= MAX_LIQUIDATE, "Cannot liquidate more than 900M");

        uint256 bnbForLiquidity = msg.value - DEPLOY_FEE;

        // 1. Deploy token — mints TOTAL_SUPPLY to this factory
        FairLaunchToken token = new FairLaunchToken(name, symbol, TOTAL_SUPPLY, address(this));
        address tokenAddr = address(token);

        // 2. Calculate treasury allocation (10% = 100M)
        uint256 treasuryAmount = (TOTAL_SUPPLY * TREASURY_PERCENT) / 100; // 100,000,000 ether

        // 3. Send 100M directly to treasury wallet (permanent — treasury controls these)
        token.transfer(treasuryWallet, treasuryAmount);
        treasuryAllocation[tokenAddr] = treasuryAmount;

        // 4. Approve PancakeSwap router for initial liquidity
        uint256 lockedAmount = MAX_LIQUIDATE - tokensToLiquidate;
        token.approve(pancakeRouter, tokensToLiquidate);

        // 5. Add initial liquidity to PancakeSwap (creator's chosen amount + BNB)
        address pair;
        if (tokensToLiquidate > 0) {
            IPancakeRouter(pancakeRouter).addLiquidityETH{value: bnbForLiquidity}(
                tokenAddr,
                tokensToLiquidate,
                0, // slippage: accept any amount
                0,
                msg.sender, // LP tokens go to creator
                block.timestamp + 300
            );
            pair = IPancakeFactory(pancakeFactory).getPair(
                tokenAddr,
                IPancakeRouter(pancakeRouter).WETH()
            );
        } else {
            // Creator chose to release 0 at launch — everything locked
            pair = address(0);
        }

        // 6. Lock remaining creator tokens in factory
        tokensLocked[tokenAddr]  = lockedAmount;
        tokenCreator[tokenAddr]  = msg.sender;
        tokenAddress[msg.sender] = tokenAddr;

        // 7. Send deploy fee to treasury
        (bool sent, ) = treasuryWallet.call{value: DEPLOY_FEE}("");
        require(sent, "Fee transfer failed");

        emit TokenCreated(
            tokenAddr,
            msg.sender,
            name,
            symbol,
            treasuryAmount,
            tokensToLiquidate,
            lockedAmount,
            pair
        );

        return tokenAddr;
    }

    // ── RELEASE LOCKED TOKENS (Multiple times allowed) ───────────────────────
    /**
     * @notice Creator can call this as many times as they want until lockedBalance = 0
     * @param token         The token contract address
     * @param tokenAmount   Amount of locked tokens to release to DEX (in wei, 18 decimals)
     *
     * msg.value = BNB to pair with the released tokens as new liquidity
     *
     * Example: Release 50M tokens with 2 BNB
     *   addLiquidityForToken(tokenAddr, 50_000_000 ether, {value: 2 ether})
     */
    function addLiquidityForToken(
        address token,
        uint256 tokenAmount
    ) external payable {
        require(tokenCreator[token] == msg.sender, "Only token creator can release");
        require(tokenAmount > 0, "Amount must be > 0");
        require(tokensLocked[token] >= tokenAmount, "Insufficient locked balance");
        require(msg.value > 0, "Must provide BNB for liquidity");

        // Deduct from locked balance BEFORE external calls (re-entrancy safe)
        tokensLocked[token] -= tokenAmount;

        // Approve router and add liquidity
        IERC20(token).approve(pancakeRouter, tokenAmount);
        IPancakeRouter(pancakeRouter).addLiquidityETH{value: msg.value}(
            token,
            tokenAmount,
            0,
            0,
            msg.sender, // LP tokens go to creator
            block.timestamp + 300
        );

        emit LiquidityAdded(
            token,
            msg.sender,
            tokenAmount,
            msg.value,
            tokensLocked[token]
        );
    }

    // ── VIEW FUNCTIONS ────────────────────────────────────────────────────────

    /// @return locked Creator's remaining releasable locked balance
    function getCreatorLockedBalance(address token) external view returns (uint256) {
        return tokensLocked[token];
    }

    /// @return amount Tokens sent to treasury wallet at creation
    function getTreasuryAllocation(address token) external view returns (uint256) {
        return treasuryAllocation[token];
    }

    // ── ADMIN ─────────────────────────────────────────────────────────────────

    /// @notice Update treasury wallet address (owner only)
    function setTreasuryWallet(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Zero address");
        treasuryWallet = newTreasury;
    }

    /// @notice Emergency: withdraw stuck BNB (owner only)
    function emergencyWithdrawBNB() external onlyOwner {
        (bool sent, ) = owner().call{value: address(this).balance}("");
        require(sent, "Withdraw failed");
    }

    receive() external payable {}
}
