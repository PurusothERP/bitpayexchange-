// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IPancakeRouter {
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);

    function factory() external pure returns (address);
    function WETH() external pure returns (address);
}

/**
 * @title BondingCurve
 * @notice AMM bonding curve for meme tokens.
 *
 * Migration Rule:
 *   When a token's BNB reserve hits MIGRATION_THRESHOLD (10 BNB):
 *     ‣  9 BNB  → feeWallet (treasury)
 *     ‣  1 BNB  → PancakeSwap (paired with remaining tokens as LP)
 *     ‣  LP tokens → feeWallet (treasury locks them)
 *     ‣  token.migrated = true  (bonding curve trading locked forever)
 */
contract BondingCurve is Ownable, ReentrancyGuard {

    // ── Constants ────────────────────────────────────────────────────────────
    uint256 public constant MAX_SUPPLY         = 1_000_000_000 * 10**18;

    /// @notice 10 BNB triggers auto-migration to PancakeSwap
    uint256 public MIGRATION_THRESHOLD         = 10 ether;

    /// @notice Of the 10 BNB: 9 to treasury, 1 to PancakeSwap LP
    uint256 public TREASURY_SHARE              = 9 ether;
    uint256 public PANCAKE_LP_SHARE            = 1 ether;

    // ── State ─────────────────────────────────────────────────────────────────
    address public feeWallet;
    IPancakeRouter public pancakeRouter;

    struct Market {
        address token;
        address creator;
        uint256 bnbReserve;
        uint256 tokenReserve;
        uint256 virtualBnb;
        bool    migrated;
    }

    mapping(address => Market) public markets;

    /// @notice Factories authorized to call launchToken() and buy()
    mapping(address => bool) public authorizedFactories;

    // ── Events ────────────────────────────────────────────────────────────────
    event TokenLaunched(address indexed token, address indexed creator);
    event Buy(address indexed token, address indexed user, uint256 bnbIn, uint256 tokensOut);
    event Sell(address indexed token, address indexed user, uint256 tokensIn, uint256 bnbOut);
    event Migrated(
        address indexed token,
        uint256 treasuryBnb,
        uint256 pancakeBnb,
        uint256 tokensToLP
    );
    event BNBSwept(address indexed to, uint256 amount);
    event FeeWalletSet(address indexed newFeeWallet);
    event RouterSet(address indexed newRouter);
    event FactoryAuthorized(address indexed factory, bool authorized);
    event ThresholdUpdated(uint256 newThreshold, uint256 treasuryShare, uint256 pancakeShare);

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(address _owner, address _feeWallet, address _router) Ownable(_owner) {
        require(_feeWallet != address(0), "Invalid fee wallet");
        feeWallet = _feeWallet;
        if (_router != address(0)) {
            pancakeRouter = IPancakeRouter(_router);
        }
    }

    // ── Admin ─────────────────────────────────────────────────────────────────
    function setFeeWallet(address _feeWallet) external onlyOwner {
        require(_feeWallet != address(0), "Invalid fee wallet");
        feeWallet = _feeWallet;
        emit FeeWalletSet(_feeWallet);
    }

    function setPancakeRouter(address _router) external onlyOwner {
        require(_router != address(0), "Invalid router");
        pancakeRouter = IPancakeRouter(_router);
        emit RouterSet(_router);
    }

    function setAuthorizedFactory(address factory, bool authorized) external onlyOwner {
        authorizedFactories[factory] = authorized;
        emit FactoryAuthorized(factory, authorized);
    }

    /// @notice Update migration thresholds (owner only)
    function setMigrationThreshold(
        uint256 _threshold,
        uint256 _treasuryShare,
        uint256 _pancakeShare
    ) external onlyOwner {
        require(_treasuryShare + _pancakeShare == _threshold, "Shares must equal threshold");
        MIGRATION_THRESHOLD = _threshold;
        TREASURY_SHARE      = _treasuryShare;
        PANCAKE_LP_SHARE    = _pancakeShare;
        emit ThresholdUpdated(_threshold, _treasuryShare, _pancakeShare);
    }

    // ── Token Setup ───────────────────────────────────────────────────────────
    function launchToken(address token, address creator, uint256 _virtualBnb) external {
        require(authorizedFactories[msg.sender] || msg.sender == owner(), "Not authorized factory");
        require(markets[token].token == address(0), "Already launched");
        markets[token] = Market({
            token:        token,
            creator:      creator,
            bnbReserve:   0,
            tokenReserve: IERC20(token).balanceOf(address(this)),
            virtualBnb:   _virtualBnb > 0 ? _virtualBnb : 0.5 ether,
            migrated:     false
        });
        emit TokenLaunched(token, creator);
    }

    // ── Trading ───────────────────────────────────────────────────────────────
    function buy(address token) external payable nonReentrant {
        Market storage market = markets[token];
        require(market.token != address(0), "Market not found");
        require(!market.migrated,           "Token migrated to DEX");
        require(msg.value > 0,              "Send BNB");

        bool isTreasury = (msg.sender == feeWallet) ||
                          (authorizedFactories[msg.sender] && market.creator == feeWallet);

        // 5% fee (waived for treasury)
        uint256 fee       = isTreasury ? 0 : (msg.value * 5) / 100;
        uint256 remaining = msg.value - fee;

        // AMM: tokensOut = (amountIn * reserve) / (virtualBnb + bnbReserve + amountIn)
        uint256 totalBnb  = market.virtualBnb + market.bnbReserve;
        uint256 tokensOut = (remaining * market.tokenReserve) / (totalBnb + remaining);
        require(tokensOut > 0, "Amount too small");

        // Split fee: 60% to LP buffer (kept in contract), 40% to treasury
        uint256 lpBuffer      = (fee * 60) / 100;
        uint256 treasuryShare = fee - lpBuffer;

        market.bnbReserve    += (remaining + lpBuffer);
        market.tokenReserve  -= tokensOut;

        // Resolve recipient – factories buy on behalf of the creator
        address recipient = (authorizedFactories[msg.sender] && market.creator != address(0))
            ? market.creator
            : msg.sender;

        if (treasuryShare > 0) {
            _sendBNB(feeWallet, treasuryShare);
        }

        require(IERC20(token).transfer(recipient, tokensOut), "Transfer failed");
        emit Buy(token, recipient, msg.value, tokensOut);

        // ── Auto-migration check ──────────────────────────────────────────
        if (!market.migrated && market.bnbReserve >= MIGRATION_THRESHOLD) {
            _migrate(token);
        }
    }

    function sell(address token, uint256 amount) external nonReentrant {
        Market storage market = markets[token];
        require(market.token != address(0), "Market not found");
        require(!market.migrated,           "Token migrated to DEX");
        require(amount > 0,                 "Invalid amount");

        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer fail");

        uint256 totalBnb = market.virtualBnb + market.bnbReserve;
        uint256 bnbOut   = (amount * totalBnb) / (market.tokenReserve + amount);

        market.bnbReserve   -= bnbOut;
        market.tokenReserve += amount;

        bool isTreasury = (msg.sender == feeWallet);
        uint256 fee    = isTreasury ? 0 : (bnbOut * 5) / 100;
        uint256 userBnb = bnbOut - fee;

        if (fee > 0) {
            _sendBNB(feeWallet, fee);
        }
        _sendBNB(msg.sender, userBnb);

        emit Sell(token, msg.sender, amount, bnbOut);
    }

    // ── Auto-Migration (10 BNB reached) ──────────────────────────────────────
    /**
     * @notice Triggered automatically when bnbReserve >= 10 BNB.
     *         9 BNB  → treasury (feeWallet)
     *         1 BNB  → PancakeSwap LP (paired with remaining token supply)
     *         LP tokens → feeWallet (treasury locks them)
     *         Token marked migrated — bonding curve trading disabled forever.
     */
    function _migrate(address token) internal {
        Market storage market = markets[token];
        market.migrated = true;

        uint256 bnbForTreasury = TREASURY_SHARE;   // 9 BNB
        uint256 bnbForPancake  = PANCAKE_LP_SHARE; // 1 BNB
        uint256 availableBnb   = market.bnbReserve;

        // Safety: if somehow reserve < threshold, just send everything to treasury
        if (availableBnb < bnbForTreasury + bnbForPancake) {
            _sendBNB(feeWallet, availableBnb);
            market.bnbReserve = 0;
            emit Migrated(token, availableBnb, 0, 0);
            return;
        }

        // 1. Send 9 BNB to treasury
        market.bnbReserve -= bnbForTreasury;
        _sendBNB(feeWallet, bnbForTreasury);

        // 2. Add 1 BNB + all remaining tokens to PancakeSwap
        market.bnbReserve -= bnbForPancake;
        uint256 tokensForLP = market.tokenReserve;
        market.tokenReserve = 0;

        uint256 tokensActuallyAdded = 0;

        if (address(pancakeRouter) != address(0) && tokensForLP > 0 && bnbForPancake > 0) {
            IERC20(token).approve(address(pancakeRouter), tokensForLP);

            try pancakeRouter.addLiquidityETH{value: bnbForPancake}(
                token,
                tokensForLP,
                0,          // amountTokenMin (accept any)
                0,          // amountETHMin   (accept any)
                feeWallet,  // LP tokens locked in treasury
                block.timestamp + 600
            ) returns (uint amountToken, uint, uint) {
                tokensActuallyAdded = amountToken;
            } catch {
                // If PancakeSwap call fails, send 1 BNB to treasury as fallback
                _sendBNB(feeWallet, bnbForPancake);
            }
        } else {
            // No router configured → send 1 BNB to treasury
            _sendBNB(feeWallet, bnbForPancake);
        }

        // Any leftover BNB in contract → treasury
        uint256 leftover = address(this).balance;
        if (leftover > 0) {
            _sendBNB(feeWallet, leftover);
        }

        emit Migrated(token, bnbForTreasury, bnbForPancake, tokensActuallyAdded);
    }

    /// @notice Owner can manually trigger migration for a specific token
    function migrateToken(address token) external onlyOwner nonReentrant {
        Market storage market = markets[token];
        require(market.token != address(0), "Market not found");
        require(!market.migrated,           "Already migrated");
        _migrate(token);
    }

    // ── Utilities ─────────────────────────────────────────────────────────────
    function _sendBNB(address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool ok, ) = payable(to).call{value: amount}("");
        require(ok, "BNB transfer failed");
    }

    function sweepAllBNB() external nonReentrant {
        require(msg.sender == feeWallet || msg.sender == owner(), "Not Authorized");
        uint256 balance = address(this).balance;
        require(balance > 0, "No BNB");
        _sendBNB(feeWallet, balance);
        emit BNBSwept(feeWallet, balance);
    }

    // ── Views ─────────────────────────────────────────────────────────────────
    function getMigrationProgress(address token) external view returns (
        uint256 currentReserve,
        uint256 threshold,
        uint256 percentFilled,
        bool migrated
    ) {
        Market storage m = markets[token];
        currentReserve = m.bnbReserve;
        threshold      = MIGRATION_THRESHOLD;
        percentFilled  = threshold > 0 ? (currentReserve * 100) / threshold : 0;
        migrated       = m.migrated;
    }

    receive() external payable {}
}
