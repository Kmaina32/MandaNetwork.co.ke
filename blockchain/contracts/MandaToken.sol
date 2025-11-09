// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MandaToken
 * @dev A simple ERC20 token for the Manda Network platform.
 */
contract MandaToken is ERC20 {
    /**
     * @dev Constructor that mints the initial supply of tokens to the contract deployer.
     * The deployer's address will become the owner and receive all tokens.
     */
    constructor() ERC20("MandaToken", "MDT") {
        // Mint 100 million tokens.
        // ERC20 contracts use a number of decimals (usually 18), so we add 18 zeros.
        _mint(msg.sender, 100000000 * (10 ** 18));
    }
}
