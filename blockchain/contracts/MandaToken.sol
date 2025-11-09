// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

error MandaToken__FaucetIsEmpty();
error MandaToken__FaucetCooldownNotOver();

/**
 * @title MandaToken
 * @dev An ERC20 token for the Manda Network platform with a faucet feature.
 */
contract MandaToken is ERC20 {
    address private immutable i_owner;
    uint256 private constant FAUCET_AMOUNT = 10 * (10**18); // 10 MDT
    uint256 private constant FAUCET_COOLDOWN = 24 hours;

    mapping(address => uint256) private s_lastClaimTimestamp;

    event FaucetClaimed(address indexed to, uint256 amount);

    /**
     * @dev Mints the initial supply to the contract deployer.
     */
    constructor() ERC20("MandaToken", "MDT") {
        i_owner = msg.sender;
        // Mint 100 million tokens to the owner.
        _mint(i_owner, 100_000_000 * (10**18));
    }

    /**
     * @notice Allows the contract owner to fund the faucet from their own balance.
     * @param amount The amount of tokens to add to the faucet's reserve.
     */
    function fundFaucet(uint256 amount) public {
        require(msg.sender == i_owner, "Only owner can fund the faucet.");
        transferFrom(i_owner, address(this), amount);
    }

    /**
     * @notice Allows any user to claim a fixed amount of tokens from the faucet.
     * Reverts if the faucet is empty or if the user is on cooldown.
     */
    function faucet() public {
        if (balanceOf(address(this)) < FAUCET_AMOUNT) {
            revert MandaToken__FaucetIsEmpty();
        }
        if (block.timestamp < s_lastClaimTimestamp[msg.sender] + FAUCET_COOLDOWN) {
            revert MandaToken__FaucetCooldownNotOver();
        }

        s_lastClaimTimestamp[msg.sender] = block.timestamp;
        _transfer(address(this), msg.sender, FAUCET_AMOUNT);
        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }

    /**
     * @return The owner of the contract.
     */
    function getOwner() public view returns (address) {
        return i_owner;
    }
}
