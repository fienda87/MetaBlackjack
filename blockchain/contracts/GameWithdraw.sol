// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title GameWithdraw
 * @dev Safely return GBC to player wallet with backend signature verification
 * 
 * Features:
 * - Verifies signature from backend (anti-cheat)
 * - ECDSA signature verification on-chain
 * - Transfers tokens from escrow to player wallet
 * - Nonce tracking to prevent replay attacks
 * - Emits WithdrawEvent for audit trail
 */
contract GameWithdraw is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;
    
    IERC20 public gbcToken;
    address public backendSigner;
    
    mapping(uint256 => bool) public usedNonces;
    mapping(address => uint256) public playerNonce;
    
    uint256 public totalWithdrawn;
    
    event Withdraw(
        address indexed player,
        uint256 amount,
        uint256 finalBalance,
        uint256 nonce,
        uint256 timestamp
    );
    event BackendSignerChanged(address indexed newSigner);
    event NonceTracking(address indexed player, uint256 nonce);
    
    constructor(address _gbcToken, address _backendSigner) Ownable(msg.sender) {
        require(_gbcToken != address(0), "Invalid token address");
        require(_backendSigner != address(0), "Invalid signer address");
        
        gbcToken = IERC20(_gbcToken);
        backendSigner = _backendSigner;
    }
    
    /**
     * @dev Withdraw GBC with backend signature verification
     * 
     * @param player - Player wallet address
     * @param amount - Amount to withdraw (in Wei)
     * @param finalBalance - Balance after withdrawal
     * @param nonce - Unique nonce to prevent replay
     * @param signature - Backend's ECDSA signature
     */
    function withdraw(
        address payable player,
        uint256 amount,
        uint256 finalBalance,
        uint256 nonce,
        bytes memory signature
    ) external nonReentrant {
        require(player != address(0), "Invalid player address");
        require(amount > 0, "Amount must be > 0");
        require(!usedNonces[nonce], "Nonce already used");
        require(
            gbcToken.balanceOf(address(this)) >= amount,
            "Insufficient contract balance"
        );
        
        // Verify signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(player, amount, finalBalance, nonce)
        );
        
        bytes32 signedHash = messageHash.toEthSignedMessageHash();
        address signer = signedHash.recover(signature);
        
        require(signer == backendSigner, "Invalid signature");
        
        // Mark nonce as used
        usedNonces[nonce] = true;
        playerNonce[player] = nonce;
        
        // Transfer tokens
        require(
            gbcToken.transfer(player, amount),
            "Transfer failed"
        );
        
        totalWithdrawn += amount;
        
        emit Withdraw(player, amount, finalBalance, nonce, block.timestamp);
        emit NonceTracking(player, nonce);
    }
    
    /**
     * @dev Check if nonce has been used
     */
    function isNonceUsed(uint256 nonce) external view returns (bool) {
        return usedNonces[nonce];
    }
    
    /**
     * @dev Get player's last nonce
     */
    function getPlayerNonce(address player) external view returns (uint256) {
        return playerNonce[player];
    }
    
    /**
     * @dev Get contract token balance
     */
    function getContractBalance() external view returns (uint256) {
        return gbcToken.balanceOf(address(this));
    }
    
    /**
     * @dev Verify a signature (for frontend validation)
     */
    function verifySignature(
        address player,
        uint256 amount,
        uint256 finalBalance,
        uint256 nonce,
        bytes memory signature
    ) external view returns (bool) {
        bytes32 messageHash = keccak256(
            abi.encodePacked(player, amount, finalBalance, nonce)
        );
        
        bytes32 signedHash = messageHash.toEthSignedMessageHash();
        address signer = signedHash.recover(signature);
        
        return signer == backendSigner;
    }
    
    /**
     * @dev Update backend signer (must be done carefully)
     */
    function setBackendSigner(address _newSigner) external onlyOwner {
        require(_newSigner != address(0), "Invalid signer address");
        backendSigner = _newSigner;
        emit BackendSignerChanged(_newSigner);
    }
    
    /**
     * @dev Owner emergency withdraw
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be > 0");
        require(
            gbcToken.balanceOf(address(this)) >= amount,
            "Insufficient balance"
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
