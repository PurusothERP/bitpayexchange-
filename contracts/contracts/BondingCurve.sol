// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ILiquidityManager {
    function addLiquidity(
        address token,
        uint256 tokenAmount,
        address lpReceiver
    ) external payable returns (uint256 liquidity);
}

contract BondingCurve is Ownable, ReentrancyGuard {
    // ── Constants ────────────────────────────────────────────────────────────
    uint256 public constant MAX_SUPPLY          = 1_000_000_000 * 10**18;
    uint256 public constant INITIAL_PRICE       = 0.0000001 ether;  // Starting price per token in BNB
    uint256 public constant MIGRATION_THRESHOLD = 50 ether;         // Trigger DEX migration at 50 BNB collateral
    uint256 public constant PROTOCOL_FEE_BPS    = 100;              // 1% fee on every buy/sell
    /// @dev % of collateral sent to PancakeSwap liquidity on migration (vs fee wallet)
    uint256 public constant LIQUIDITY_RATIO_BPS = 8000;            // 80% to LP, 20% to fee wallet

    // ── State ─────────────────────────────────────────────────────────────────
    address public feeWallet;
    address public liquidityManager;

    struct Market {
        address token;
        address creator;     // Wallet that launched this token
        uint256 collateral;  // Total BNB collected after protocol fees
        uint256 supply;      // Total tokens distributed from curve
        bool    migrated;    // True after DEX migration
    }

    mapping(address => Market) public markets;

    /// @notice Contracts allowed to call launchToken() and buy() on behalf of users (i.e. TokenFactory)
    mapping(address => bool)   public authorizedFactories;

    // ── Events ────────────────────────────────────────────────────────────────
    event TokenLaunched(address indexed token, address indexed creator);
    event Buy(address indexed token, address indexed user, uint256 bnbIn, uint256 tokensOut);
    event Sell(address indexed token, address indexed user, uint256 tokensIn, uint256 bnbOut);
    event Migrated(address indexed token, uint256 bnbToLP, uint256 tokensToLP, uint256 bnbToFee);
    event BNBSwept(address indexed to, uint256 amount);
    event LiquidityManagerSet(address indexed newManager);
    event FeeWalletSet(address indexed newFeeWallet);
    event FactoryAuthorized(address indexed factory, bool authorized);

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(address _owner, address _feeWallet) Ownable(_owner) {
        require(_feeWallet != address(0), "Invalid fee wallet");
        feeWallet = _feeWallet;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setFeeWallet(address _feeWallet) external onlyOwner {
        require(_feeWallet != address(0), "Invalid fee wallet");
        feeWallet = _feeWallet;
        emit FeeWalletSet(_feeWallet);
    }

    function setLiquidityManager(address _liquidityManager) external onlyOwner {
        require(_liquidityManager != address(0), "Invalid liquidity manager");
        liquidityManager = _liquidityManager;
        emit LiquidityManagerSet(_liquidityManager);
    }

    /// @notice Authorize or revoke a Factory contract to call launchToken/buy
    function setAuthorizedFactory(address factory, bool authorized) external onlyOwner {
        authorizedFactories[factory] = authorized;
        emit FactoryAuthorized(factory, authorized);
    }

    /// @notice Register a newly deployed token for curve trading.
    ///         Only callable by an authorized Factory contract.
    /// @param token   The token contract address
    /// @param creator The wallet that originally requested the launch
    function launchToken(address token, address creator) external {
        require(authorizedFactories[msg.sender] || msg.sender == owner(), "Not authorized factory");
        require(markets[token].token == address(0), "Already launched");
        markets[token] = Market({
            token:      token,
            creator:    creator,
            collateral: 0,
            supply:     0,
            migrated:   false
        });
        emit TokenLaunched(token, creator);
    }

    // ── Trading ───────────────────────────────────────────────────────────────

    /// @notice Buy tokens with BNB. 1% protocol fee is taken up front.
    /// @dev    When called via Factory during token creation, `msg.sender` is the Factory.
    ///         Bought tokens are transferred to `market.creator` in that case.
    function buy(address token) external payable nonReentrant {
        Market storage market = markets[token];
        require(market.token != address(0), "Market not found");
        require(!market.migrated, "Token already migrated to DEX");
        require(msg.value > 0, "Send BNB to buy tokens");

        bool isTreasury = (msg.sender == feeWallet) || (authorizedFactories[msg.sender] && market.creator == feeWallet);
        uint256 fee     = isTreasury ? 0 : (msg.value * PROTOCOL_FEE_BPS) / 10000;
        uint256 netBnb  = msg.value - fee;

        if (fee > 0) {
            _sendBNB(feeWallet, fee);
        }

        // Linear pricing: tokens = netBnb / INITIAL_PRICE
        uint256 tokensOut = (netBnb * 10**18) / INITIAL_PRICE;
        require(market.supply + tokensOut <= MAX_SUPPLY, "Exceeds max supply");

        market.collateral += netBnb;
        market.supply     += tokensOut;

        // If the caller is an authorized Factory, deliver tokens to the original creator.
        // Otherwise, deliver to the caller (normal user buy).
        address recipient = (authorizedFactories[msg.sender] && market.creator != address(0))
            ? market.creator
            : msg.sender;

        require(IERC20(token).transfer(recipient, tokensOut), "Token transfer failed");
        emit Buy(token, recipient, msg.value, tokensOut);

        // Auto-trigger migration once threshold is reached
        if (market.collateral >= MIGRATION_THRESHOLD) {
            _migrate(token);
        }
    }

    /// @notice Sell tokens back to the curve for BNB. 1% protocol fee taken from proceeds.
    function sell(address token, uint256 amount) external nonReentrant {
        Market storage market = markets[token];
        require(!market.migrated, "Token already migrated to DEX - trade on PancakeSwap");
        require(amount > 0, "Amount must be > 0");

        uint256 bnbOut = (amount * INITIAL_PRICE) / 10**18;
        require(market.collateral >= bnbOut, "Insufficient liquidity in curve");

        require(
            IERC20(token).transferFrom(msg.sender, address(this), amount),
            "Token pull failed"
        );

        market.collateral -= bnbOut;
        market.supply     -= amount;

        bool isTreasury = (msg.sender == feeWallet);
        uint256 fee     = isTreasury ? 0 : (bnbOut * PROTOCOL_FEE_BPS) / 10000;
        uint256 userBnb = bnbOut - fee;

        if (fee > 0) {
            _sendBNB(feeWallet, fee);
        }
        _sendBNB(msg.sender,  userBnb);

        emit Sell(token, msg.sender, amount, bnbOut);
    }

    // ── Internal ───────────────────────────────────────────────────────────────

    /// @notice Migrate liquidity to PancakeSwap via LiquidityManager.
    ///         80% of BNB + all remaining tokens → PancakeSwap LP
    ///         20% of BNB → fee wallet as migration reward
    function _migrate(address token) internal {
        Market storage market = markets[token];
        market.migrated = true;

        uint256 totalBnb    = market.collateral;
        uint256 totalTokens = IERC20(token).balanceOf(address(this));

        // Split BNB: 80% to LP, 20% to fee wallet
        uint256 bnbToLP  = (totalBnb * LIQUIDITY_RATIO_BPS) / 10000;
        uint256 bnbToFee = totalBnb - bnbToLP;

        // Clear collateral to prevent re-entrancy on state
        market.collateral = 0;
        market.supply     = 0;

        // Send fee wallet cut
        _sendBNB(feeWallet, bnbToFee);

        emit Migrated(token, bnbToLP, totalTokens, bnbToFee);

        if (liquidityManager != address(0) && totalTokens > 0 && bnbToLP > 0) {
            // Approve LiquidityManager to pull all remaining tokens
            IERC20(token).approve(liquidityManager, totalTokens);

            // LP tokens are locked in the fee wallet (acts as treasury)
            ILiquidityManager(liquidityManager).addLiquidity{value: bnbToLP}(
                token,
                totalTokens,
                feeWallet  // LP tokens receiver = treasury / fee wallet
            );
        } else {
            // Fallback: if LiquidityManager not set, send everything to fee wallet for manual LP
            _sendBNB(feeWallet, bnbToLP);
            if (totalTokens > 0) {
                IERC20(token).transfer(feeWallet, totalTokens);
            }
        }
    }

    function _sendBNB(address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool ok, ) = payable(to).call{value: amount}("");
        require(ok, "BNB transfer failed");
    }

    /// @notice Sweep all BNB in the contract to the feeWallet (Treasury sweep script)
    ///         WARNING: This sweeps ALL collateral.
    function sweepAllBNB() external nonReentrant {
        require(msg.sender == feeWallet || msg.sender == owner(), "Not Authorized");
        uint256 balance = address(this).balance;
        require(balance > 0, "No BNB to sweep");
        
        _sendBNB(feeWallet, balance);
        emit BNBSwept(feeWallet, balance);
    }

    receive() external payable {}
}
