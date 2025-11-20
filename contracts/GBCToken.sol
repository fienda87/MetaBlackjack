// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GBC Token (GOBOG COIN)
 * @notice ERC20 token for MetaBlackjack game economy
 * @dev Mintable token with game server integration
 */
contract GBCToken is ERC20, Ownable {
    bool public mintingEnabled = true;
    mapping(address => bool) public gameMinters;
    
    // Events
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event MintingStatusChanged(bool enabled);
    event GameReward(address indexed player, uint256 amount, string gameType);
    event GameBurn(address indexed player, uint256 amount, string gameType);
    
    constructor() ERC20("GOBOG COIN", "GBC") Ownable(msg.sender) {
        // Initial supply: 100,000,000 GBC tokens (100M)
        _mint(msg.sender, 100_000_000 * 10***decimals());
        
        // Owner is default game minter
        gameMinters[msg.sender] = true;
        emit MinterAdded(msg.sender);
    }
    
    modifier onlyGameMinter() {
        require(gameMinters[msg.sender] || msg.sender == owner(), "Not authorized to mint");
        _;
    }
    
    /**
     * @notice Mint GBC tokens for game rewards
     * @param to Player address
     * @param amount Amount of tokens to mint
     */
    function mintGameReward(address to, uint256 amount) external onlyGameMinter {
        require(mintingEnabled, "Minting is disabled");
        require(to != address(0), "Cannot mint to zero address");
        
        _mint(to, amount);
        emit GameReward(to, amount, "blackjack");
    }
    
    /**
     * @notice Burn GBC tokens when player loses
     * @param amount Amount of tokens to burn
     */
    function burnGameLoss(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        
        _burn(msg.sender, amount);
        emit GameBurn(msg.sender, amount, "blackjack");
    }
    
    /**
     * @notice Add game server as authorized minter
     * @param minter Address of game server
     */
    function addGameMinter(address minter) external onlyOwner {
        require(minter != address(0), "Invalid minter address");
        require(!gameMinters[minter], "Already a minter");
        
        gameMinters[minter] = true;
        emit MinterAdded(minter);
    }
    
    /**
     * @notice Remove game server minting authorization
     * @param minter Address to remove
     */
    function removeGameMinter(address minter) external onlyOwner {
        require(gameMinters[minter], "Not a minter");
        
        gameMinters[minter] = false;
        emit MinterRemoved(minter);
    }
    
    /**
     * @notice Enable or disable minting
     * @param enabled New minting status
     */
    function setMintingEnabled(bool enabled) external onlyOwner {
        mintingEnabled = enabled;
        emit MintingStatusChanged(enabled);
    }
    
    /**
     * @notice Emergency mint (only owner)
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function emergencyMint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        
        _mint(to, amount);
    }
    
    /**
     * @notice Check if address is authorized game minter
     * @param account Address to check
     * @return bool Authorization status
     */
    function isGameMinter(address account) external view returns (bool) {
        return gameMinters[account] || account == owner();
    }
}
