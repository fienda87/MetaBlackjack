// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title GBCFaucet
 * @dev One-time GBC token airdrop for new players (onboarding)
 * 
 * Features:
 * - One-time claim per wallet (100 GBC)
 * - 30-day cooldown for re-claiming
 * - Reentrancy guard
 * - Owner can withdraw unclaimed funds
 */
contract GBCFaucet is Ownable, ReentrancyGuard {
    IERC20 public gbcToken;
    
    uint256 public constant CLAIM_AMOUNT = 100 * 10**18; // 100 GBC
    uint256 public constant CLAIM_COOLDOWN = 30 days;
    
    mapping(address => bool) public hasClaimed;
    mapping(address => uint256) public lastClaimTime;
    
    event Claim(address indexed claimer, uint256 amount, uint256 timestamp);
    event ClaimReset(address indexed user, uint256 newClaimTime);
    
    constructor(address _gbcToken) Ownable(msg.sender) {
        require(_gbcToken != address(0), "Invalid token address");
        gbcToken = IERC20(_gbcToken);
    }
    
    /**
     * @dev Claim 100 GBC tokens (one-time or after cooldown)
     */
    function claim() external nonReentrant {
        // Check if can claim
        if (hasClaimed[msg.sender]) {
            require(
                block.timestamp >= lastClaimTime[msg.sender] + CLAIM_COOLDOWN,
                "Claim cooldown not met"
            );
        }
        
        hasClaimed[msg.sender] = true;
        lastClaimTime[msg.sender] = block.timestamp;
        
        require(
            gbcToken.transfer(msg.sender, CLAIM_AMOUNT),
            "Transfer failed"
        );
        
        emit Claim(msg.sender, CLAIM_AMOUNT, block.timestamp);
    }
    
    /**
     * @dev Check if user can claim
     */
    function canClaim(address user) external view returns (bool) {
        if (!hasClaimed[user]) {
            return true;
        }
        
        return block.timestamp >= lastClaimTime[user] + CLAIM_COOLDOWN;
    }
    
    /**
     * @dev Get time until next claim is available
     */
    function getNextClaimTime(address user) external view returns (uint256) {
        if (!hasClaimed[user]) {
            return 0;
        }
        
        uint256 nextClaimTime = lastClaimTime[user] + CLAIM_COOLDOWN;
        if (block.timestamp >= nextClaimTime) {
            return 0;
        }
        
        return nextClaimTime - block.timestamp;
    }
    
    /**
     * @dev Owner can reset claim for a user (emergency)
     */
    function resetClaim(address user) external onlyOwner {
        hasClaimed[user] = false;
        lastClaimTime[user] = 0;
        emit ClaimReset(user, 0);
    }
    
    /**
     * @dev Owner withdraw unclaimed funds
     */
    function withdrawFunds() external onlyOwner {
        uint256 balance = gbcToken.balanceOf(address(this));
        require(balance > 0, "No funds to withdraw");
        require(gbcToken.transfer(owner(), balance), "Transfer failed");
    }
    
    /**
     * @dev Update GBC token address (emergency)
     */
    function setTokenAddress(address _newToken) external onlyOwner {
        require(_newToken != address(0), "Invalid token address");
        gbcToken = IERC20(_newToken);
    }
}
