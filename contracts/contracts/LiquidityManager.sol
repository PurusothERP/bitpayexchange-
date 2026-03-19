// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
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

    function factory() external pure returns (address);
    function WETH() external pure returns (address);
}

interface IPancakeFactory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

contract LiquidityManager is Ownable {
    IPancakeRouter public pancakeRouter;
    
    // Addresses that are allowed to call addLiquidity (e.g., BondingCurve)
    mapping(address => bool) public authorizedCallers;

    event LiquidityAdded(address indexed token, uint256 tokenAmount, uint256 ethAmount, address pair);
    event CallerAuthorized(address indexed caller, bool authorized);

    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    constructor(address _router, address _owner) Ownable(_owner) {
        require(_router != address(0), "Invalid router");
        pancakeRouter = IPancakeRouter(_router);
    }

    /// @notice Owner can grant/revoke authorization to contracts (e.g., BondingCurve)
    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        authorizedCallers[caller] = authorized;
        emit CallerAuthorized(caller, authorized);
    }

    /// @notice Add liquidity to PancakeSwap. Called automatically by BondingCurve on migration.
    /// @dev    Caller must send BNB (msg.value) and approve this contract for tokenAmount first.
    function addLiquidity(
        address token,
        uint256 tokenAmount,
        address lpReceiver
    ) external payable onlyAuthorized returns (uint256 liquidity) {
        require(msg.value > 0, "No BNB sent");
        require(tokenAmount > 0, "No tokens provided");
        require(lpReceiver != address(0), "Invalid LP receiver");

        // Pull tokens from caller (BondingCurve) to this contract
        require(
            IERC20(token).transferFrom(msg.sender, address(this), tokenAmount),
            "Token transfer failed"
        );

        // Approve router to spend tokens
        IERC20(token).approve(address(pancakeRouter), tokenAmount);

        // Add liquidity — LP tokens go to lpReceiver (e.g., fee wallet or dead address)
        (, , uint256 lp) = pancakeRouter.addLiquidityETH{value: msg.value}(
            token,
            tokenAmount,
            0, // accept any amount of tokens (slippage managed by caller)
            0, // accept any amount of ETH
            lpReceiver,
            block.timestamp + 600
        );

        // Return any excess tokens to caller
        uint256 leftover = IERC20(token).balanceOf(address(this));
        if (leftover > 0) {
            IERC20(token).transfer(msg.sender, leftover);
        }

        // Return any excess BNB to caller
        uint256 bnbLeft = address(this).balance;
        if (bnbLeft > 0) {
            (bool ok, ) = payable(msg.sender).call{value: bnbLeft}("");
            require(ok, "BNB refund failed");
        }

        // Lookup the pair address for the event
        address factory = pancakeRouter.factory();
        address weth   = pancakeRouter.WETH();
        address pair   = IPancakeFactory(factory).getPair(token, weth);

        emit LiquidityAdded(token, tokenAmount, msg.value, pair);
        return lp;
    }

    receive() external payable {}
}
