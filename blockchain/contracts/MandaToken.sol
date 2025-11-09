// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MandaToken
 * @dev An ERC20 token for the Manda Network platform with a faucet feature.
 */
contract MandaToken is ERC20 {
    address public owner;
    uint256 public faucetAmount;
    uint256 public faucetCooldown = 24 hours;
    mapping(address => uint256) public lastFaucetClaim;
    uint256 public faucetBalance;

    event FaucetFunded(address indexed from, uint256 amount);
    event FaucetClaimed(address indexed to, uint256 amount);

    /**
     * @dev Sets the values for {name} and {symbol}.
     */
    constructor() ERC20("MandaToken", "MDT") {
        owner = msg.sender;
        // Mint 100 million tokens to the contract deployer (owner)
        _mint(owner, 100000000 * (10 ** decimals()));
        faucetAmount = 10 * (10 ** decimals()); // Set faucet to claim 10 MDT
    }

    /**
     * @dev Allows the owner to fund the faucet from their balance.
     */
    function fundFaucet(uint256 _amount) public {
        require(msg.sender == owner, "MandaToken: Only owner can fund the faucet.");
        require(balanceOf(owner) >= _amount, "MandaToken: Insufficient owner balance to fund faucet.");
        _transfer(owner, address(this), _amount);
        faucetBalance += _amount;
        emit FaucetFunded(owner, _amount);
    }

    /**
     * @dev Allows any user to claim a fixed amount of tokens from the faucet,
     * subject to a cooldown period.
     */
    function faucet() public {
        require(block.timestamp >= lastFaucetClaim[msg.sender] + faucetCooldown, "MandaToken: Faucet cooldown not over yet.");
        require(faucetBalance >= faucetAmount, "MandaToken: Faucet is empty.");
        
        lastFaucetClaim[msg.sender] = block.timestamp;
        faucetBalance -= faucetAmount;
        _transfer(address(this), msg.sender, faucetAmount);

        emit FaucetClaimed(msg.sender, faucetAmount);
    }
}
