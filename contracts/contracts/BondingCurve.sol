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
    
    function swapExactETHForTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable returns (uint[] memory amounts);
    
    function factory() external pure returns (address);
    function WETH() external pure returns (address);
}

contract BondingCurve is Ownable, ReentrancyGuard {
    // ── Constants ────────────────────────────────────────────────────────────
    uint256 public constant MAX_SUPPLY          = 1_000_000_000 * 10**18;
    uint256 public constant LP_INIT_THRESHOLD   = 0.3 ether;
    uint256 public constant VIRTUAL_BNB         = 0.5 ether; // Used for starting price calculation

    // ── State ─────────────────────────────────────────────────────────────────
    address public feeWallet;
    IPancakeRouter public pancakeRouter;

    struct Market {
        address token;
        address creator;     // Wallet that launched this token
        uint256 bnbReserve;
        uint256 tokenReserve;
        bool    lpInitialized;
        bool    migrated;
    }

    mapping(address => Market) public markets;

    /// @notice Contracts allowed to call launchToken() and buy() on behalf of users (i.e. TokenFactory)
    mapping(address => bool) public authorizedFactories;

    // ── Events ────────────────────────────────────────────────────────────────
    event TokenLaunched(address indexed token, address indexed creator);
    event Buy(address indexed token, address indexed user, uint256 bnbIn, uint256 tokensOut);
    event Sell(address indexed token, address indexed user, uint256 tokensIn, uint256 bnbOut);
    event LPInitialized(address indexed token, uint256 bnbAmount, uint256 tokenAmount);
    event FirstTradeTriggered(address indexed token, uint256 bnbAmount);
    event BNBSwept(address indexed to, uint256 amount);
    event FeeWalletSet(address indexed newFeeWallet);
    event RouterSet(address indexed newRouter);
    event FactoryAuthorized(address indexed factory, bool authorized);

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

    // ── Token Setup ───────────────────────────────────────────────────────────
    function launchToken(address token, address creator) external {
        require(authorizedFactories[msg.sender] || msg.sender == owner(), "Not authorized factory");
        require(markets[token].token == address(0), "Already launched");
        markets[token] = Market({
            token:        token,
            creator:      creator,
            bnbReserve:   0,
            tokenReserve: IERC20(token).balanceOf(address(this)), // starts with all tokens
            lpInitialized: false,
            migrated:     false
        });
        emit TokenLaunched(token, creator);
    }

    // ── Trading ───────────────────────────────────────────────────────────
    function buy(address token) external payable nonReentrant {
        Market storage market = markets[token];
        require(market.token != address(0), "Market not found");
        require(!market.migrated, "Token migrated");
        require(msg.value > 0, "Send BNB");

        bool isTreasury = (msg.sender == feeWallet) || (authorizedFactories[msg.sender] && market.creator == feeWallet);
        
        // 5% fee logic
        uint256 fee = isTreasury ? 0 : (msg.value * 5) / 100;
        uint256 remaining = msg.value - fee;

        uint256 totalBnb = VIRTUAL_BNB + market.bnbReserve;
        // AMM formula: amountOut = (amountIn * tokenReserve) / (reserveIn + amountIn)
        uint256 tokensOut = (remaining * market.tokenReserve) / (totalBnb + remaining);
        require(tokensOut > 0, "Amount too small");

        uint256 lpShare = (fee * 60) / 100;
        uint256 curveShare = fee - lpShare;

        market.bnbReserve += (remaining + curveShare);
        market.tokenReserve -= tokensOut;

        address recipient = (authorizedFactories[msg.sender] && market.creator != address(0))
            ? market.creator
            : msg.sender;

        require(IERC20(token).transfer(recipient, tokensOut), "Transfer failed");

        emit Buy(token, recipient, msg.value, tokensOut);

        if (!market.lpInitialized && market.bnbReserve >= LP_INIT_THRESHOLD) {
            _initializeLP(token, lpShare);
        } else if (market.lpInitialized && lpShare > 0) {
            // Push remaining LP shares directly to maintain sync
            _pushToLP(token, lpShare, (lpShare * market.tokenReserve) / market.bnbReserve);
        }
    }

    function sell(address token, uint256 amount) external nonReentrant {
        Market storage market = markets[token];
        require(market.token != address(0), "Market not found");
        require(!market.migrated, "Token migrated");
        require(amount > 0, "Invalid amount");

        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer fail");

        uint256 totalBnb = VIRTUAL_BNB + market.bnbReserve;
        uint256 bnbOut = (amount * totalBnb) / (market.tokenReserve + amount);

        market.bnbReserve -= bnbOut;
        market.tokenReserve += amount;

        bool isTreasury = (msg.sender == feeWallet);
        uint256 fee = isTreasury ? 0 : (bnbOut * 5) / 100;
        uint256 userBnb = bnbOut - fee;

        if (fee > 0) {
            _sendBNB(feeWallet, fee); // Sell fees go to treasury directly
        }
        _sendBNB(msg.sender, userBnb);

        emit Sell(token, msg.sender, amount, bnbOut);
    }

    // ── LP Management ───────────────────────────────────────────────────────
    function _initializeLP(address token, uint256 bnbAmount) internal {
        Market storage market = markets[token];
        market.lpInitialized = true;

        if (bnbAmount == 0) return;
        
        uint256 tokenAmount = (bnbAmount * market.tokenReserve) / market.bnbReserve;
        
        // ensure we have enough tokens to pair
        if (market.tokenReserve < tokenAmount) {
            tokenAmount = market.tokenReserve;
        }
        
        market.tokenReserve -= tokenAmount;

        _pushToLP(token, bnbAmount, tokenAmount);
        
        emit LPInitialized(token, bnbAmount, tokenAmount);

        _triggerFirstTrade(token);
    }

    function _pushToLP(address token, uint256 bnbAmount, uint256 tokenAmount) internal {
        if (address(pancakeRouter) == address(0) || bnbAmount == 0 || tokenAmount == 0) return;

        IERC20(token).approve(address(pancakeRouter), tokenAmount);

        try pancakeRouter.addLiquidityETH{value: bnbAmount}(
            token,
            tokenAmount,
            0,
            0,
            feeWallet, // Lock LP tokens in the fee wallet (treasury)
            block.timestamp
        ) {} catch {
            // Fallback if LP fails
            _sendBNB(feeWallet, bnbAmount);
        }
    }

    function _triggerFirstTrade(address token) internal {
        if (address(pancakeRouter) == address(0)) return;

        uint256 tradeAmount = 0.01 ether;
        if (address(this).balance < tradeAmount) return; // not enough BNB

        address[] memory path = new address[](2);
        path[0] = pancakeRouter.WETH();
        path[1] = token;

        try pancakeRouter.swapExactETHForTokens{value: tradeAmount}(
            0,
            path,
            feeWallet, // Treasury gets the bought tokens
            block.timestamp
        ) {
            emit FirstTradeTriggered(token, tradeAmount);
        } catch {}
    }

    // ── Utilities ───────────────────────────────────────────────────────────
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

    receive() external payable {}
}
