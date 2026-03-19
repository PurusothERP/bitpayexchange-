// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TokenTemplate
 * @notice BEP-20 token deployed by the Factory.
 *         The OWNER is set to the BondingCurve contract — not the creator wallet.
 *         This allows BondingCurve to be in full control of the token supply
 *         throughout the bonding curve phase until DEX migration.
 *
 * Architecture:
 *   Factory → deploys TokenTemplate (owner = BondingCurve)
 *             → mints 1,000,000,000 tokens → BondingCurve
 *             BondingCurve sells tokens to users over time
 *             When threshold reached → BondingCurve migrates to PancakeSwap
 */
contract TokenTemplate is ERC20, Ownable {
    /// @notice Human-friendly creator stored for display purposes (not privileged)
    address public creator;

    event TokenDeployed(string name, string symbol, uint256 supply, address indexed creator, address indexed bondingCurve);

    /**
     * @param name_              Token name
     * @param symbol_            Token symbol
     * @param fixedSupply        Number of whole tokens (will be scaled by decimals())
     * @param _creator           Original wallet that initiated the launch (informational only)
     * @param bondingCurve_      Address that becomes the Ownable owner AND receives 900M
     * @param feeWallet_         Treasury wallet that receives 100M tokens
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 fixedSupply,
        address _creator,
        address bondingCurve_,
        address feeWallet_
    ) ERC20(name_, symbol_) Ownable(bondingCurve_) {
        require(bondingCurve_ != address(0), "Invalid bonding curve");
        require(_creator     != address(0), "Invalid creator");
        require(feeWallet_   != address(0), "Invalid fee wallet");

        creator = _creator;

        // Split supply 10% to Treasury, 90% to Curve
        uint256 total = fixedSupply * 10 ** decimals();
        uint256 treasuryShare = total / 10;
        uint256 curveShare = total - treasuryShare;

        _mint(feeWallet_, treasuryShare);
        _mint(bondingCurve_, curveShare);

        emit TokenDeployed(name_, symbol_, fixedSupply, _creator, bondingCurve_);
    }

    /// @notice BondingCurve (as owner) can burn unsold tokens after migration
    function burn(uint256 amount) external onlyOwner {
        _burn(msg.sender, amount);
    }
}
