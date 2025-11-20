// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DepositEscrow
 * @dev Hold GBC tokens in custody while player plays blackjack
 * 
 * Features:
 * - Receives GBC via approve() + transferFrom()
 * - Keeps tokens in secure escrow during gameplay
 * - Emits DepositEvent when tokens received
 * - Backend listens to events and credits off-chain balance
 * - Supports multiple deposits from same wallet
 */
contract DepositEscrow is Ownable, ReentrancyGuard {
    IERC20 public gbcToken;
    
    mapping(address => uint256) public escrowBalance;
    uint256 public totalEscrow;
    
    event Deposit(
        address indexed player,
        uint256 amount,
        uint256 timestamp,
        uint256 totalBalance
    );
    event Withdrawal(
        address indexed player,
        uint256 amount,
        uint256 timestamp
    );
    
    constructor(address _gbcToken) Ownable(msg.sender) {
        require(_gbcToken != address(0), "Invalid token address");
        gbcToken = IERC20(_gbcToken);
    }
    
    /**
     * @dev Deposit GBC to escrow
     * Player must call approve() on GBCToken first
     */
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(
            gbcToken.balanceOf(msg.sender) >= amount,
            "Insufficient balance"
        );
        
        // Transfer from player to contract
        require(
            gbcToken.transferFrom(msg.sender, address(this), amount),
            "TransferFrom failed"
        );
        
        escrowBalance[msg.sender] += amount;
        totalEscrow += amount;
        
        emit Deposit(msg.sender, amount, block.timestamp, escrowBalance[msg.sender]);
    }
    
    /**
     * @dev Get escrow balance for a player
     */
    function getBalance(address player) external view returns (uint256) {
        return escrowBalance[player];
    }
    
    /**
     * @dev Get total escrow amount
     */
    function getTotalEscrow() external view returns (uint256) {
        return totalEscrow;
    }
    
    /**
     * @dev Verify contract has enough tokens (for validation)
     */
    function getTokenBalance() external view returns (uint256) {
        return gbcToken.balanceOf(address(this));
    }
    
    /**
     * @dev Check if contract is solvent (tokens >= escrow balance)
     */
    function isSolvent() external view returns (bool) {
        return gbcToken.balanceOf(address(this)) >= totalEscrow;
    }
    
    /**
     * @dev Owner emergency withdraw (only if insolvency detected)
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be > 0");
        require(
            gbcToken.balanceOf(address(this)) >= amount,
            "Insufficient contract balance"
        );
        
        require(gbcToken.transfer(owner(), amount), "Transfer failed");
    }
    
    /**
     * @dev Update GBC token address (emergency)
     */
    function setTokenAddress(address _newToken) external onlyOwner {
        require(_newToken != address(0), "Invalid token address");
        gbcToken = IERC20(_newToken);
    }
}
