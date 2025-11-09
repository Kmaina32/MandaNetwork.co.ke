// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MandaToken
 * @dev An ERC20 token for the Manda Network platform with a faucet feature.
 */
contract MandaToken is ERC20, Ownable {
    // Mapping to store the last time a user claimed from the faucet
    mapping(address => uint256) public lastClaimed;

    // Faucet gives out 100 tokens
    uint256 public constant FAUCET_AMOUNT = 100 * (10 ** 18);
    // Cooldown period for the faucet (24 hours)
    uint256 public constant FAUCET_COOLDOWN = 24 hours;

    /**
     * @dev Constructor that mints the initial supply of tokens to the contract deployer.
     */
    constructor() ERC20("MandaToken", "MDT") Ownable(msg.sender) {
        // Mint 100 million tokens to the contract deployer (treasury)
        _mint(msg.sender, 100000000 * (10 ** 18));
    }

    /**
     * @dev Allows any user to claim a fixed amount of tokens from the faucet,
     * but only once within a 24-hour period.
     * The contract itself must hold tokens for the faucet to work.
     */
    function faucet() public {
        require(block.timestamp >= lastClaimed[msg.sender] + FAUCET_COOLDOWN, "MandaToken: Faucet cooldown not over yet.");
        require(balanceOf(address(this)) >= FAUCET_AMOUNT, "MandaToken: Faucet is empty.");

        lastClaimed[msg.sender] = block.timestamp;
        _transfer(address(this), msg.sender, FAUCET_AMOUNT);
    }

    /**
     * @dev Allows the owner to fund the faucet by transferring tokens to this contract.
     * @param amount The amount of tokens to send to the faucet.
     */
    function fundFaucet(uint256 amount) public onlyOwner {
        _transfer(owner(), address(this), amount);
    }
}
