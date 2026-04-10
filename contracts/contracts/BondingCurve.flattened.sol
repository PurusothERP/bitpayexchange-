// Sources flattened

// SPDX-License-Identifier: MIT

// File @openzeppelin/contracts/utils/Context.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

pragma solidity ^0.8.20;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}


// File @openzeppelin/contracts/access/Ownable.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}


// File @openzeppelin/contracts/utils/StorageSlot.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (utils/StorageSlot.sol)
// This file was procedurally generated from scripts/generate/templates/StorageSlot.js.

pragma solidity ^0.8.20;

/**
 * @dev Library for reading and writing primitive types to specific storage slots.
 *
 * Storage slots are often used to avoid storage conflict when dealing with upgradeable contracts.
 * This library helps with reading and writing to such slots without the need for inline assembly.
 *
 * The functions in this library return Slot structs that contain a `value` member that can be used to read or write.
 *
 * Example usage to set ERC-1967 implementation slot:
 * ```solidity
 * contract ERC1967 {
 *     // Define the slot. Alternatively, use the SlotDerivation library to derive the slot.
 *     bytes32 internal constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
 *
 *     function _getImplementation() internal view returns (address) {
 *         return StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value;
 *     }
 *
 *     function _setImplementation(address newImplementation) internal {
 *         require(newImplementation.code.length > 0);
 *         StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value = newImplementation;
 *     }
 * }
 * ```
 *
 * TIP: Consider using this library along with {SlotDerivation}.
 */
library StorageSlot {
    struct AddressSlot {
        address value;
    }

    struct BooleanSlot {
        bool value;
    }

    struct Bytes32Slot {
        bytes32 value;
    }

    struct Uint256Slot {
        uint256 value;
    }

    struct Int256Slot {
        int256 value;
    }

    struct StringSlot {
        string value;
    }

    struct BytesSlot {
        bytes value;
    }

    /**
     * @dev Returns an `AddressSlot` with member `value` located at `slot`.
     */
    function getAddressSlot(bytes32 slot) internal pure returns (AddressSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `BooleanSlot` with member `value` located at `slot`.
     */
    function getBooleanSlot(bytes32 slot) internal pure returns (BooleanSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Bytes32Slot` with member `value` located at `slot`.
     */
    function getBytes32Slot(bytes32 slot) internal pure returns (Bytes32Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Uint256Slot` with member `value` located at `slot`.
     */
    function getUint256Slot(bytes32 slot) internal pure returns (Uint256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Int256Slot` with member `value` located at `slot`.
     */
    function getInt256Slot(bytes32 slot) internal pure returns (Int256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `StringSlot` with member `value` located at `slot`.
     */
    function getStringSlot(bytes32 slot) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns an `StringSlot` representation of the string storage pointer `store`.
     */
    function getStringSlot(string storage store) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }

    /**
     * @dev Returns a `BytesSlot` with member `value` located at `slot`.
     */
    function getBytesSlot(bytes32 slot) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns an `BytesSlot` representation of the bytes storage pointer `store`.
     */
    function getBytesSlot(bytes storage store) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }
}


// File @openzeppelin/contracts/utils/ReentrancyGuard.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.5.0) (utils/ReentrancyGuard.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 *
 * IMPORTANT: Deprecated. This storage-based reentrancy guard will be removed and replaced
 * by the {ReentrancyGuardTransient} variant in v6.0.
 *
 * @custom:stateless
 */
abstract contract ReentrancyGuard {
    using StorageSlot for bytes32;

    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.ReentrancyGuard")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant REENTRANCY_GUARD_STORAGE =
        0x9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f00;

    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _reentrancyGuardStorageSlot().getUint256Slot().value = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    /**
     * @dev A `view` only version of {nonReentrant}. Use to block view functions
     * from being called, preventing reading from inconsistent contract state.
     *
     * CAUTION: This is a "view" modifier and does not change the reentrancy
     * status. Use it only on view functions. For payable or non-payable functions,
     * use the standard {nonReentrant} modifier instead.
     */
    modifier nonReentrantView() {
        _nonReentrantBeforeView();
        _;
    }

    function _nonReentrantBeforeView() private view {
        if (_reentrancyGuardEntered()) {
            revert ReentrancyGuardReentrantCall();
        }
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        _nonReentrantBeforeView();

        // Any calls to nonReentrant after this point will fail
        _reentrancyGuardStorageSlot().getUint256Slot().value = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _reentrancyGuardStorageSlot().getUint256Slot().value = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _reentrancyGuardStorageSlot().getUint256Slot().value == ENTERED;
    }

    function _reentrancyGuardStorageSlot() internal pure virtual returns (bytes32) {
        return REENTRANCY_GUARD_STORAGE;
    }
}


// File @openzeppelin/contracts/token/ERC20/IERC20.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (token/ERC20/IERC20.sol)

pragma solidity >=0.4.16;

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}


// File contracts/BondingCurve.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.20;



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
