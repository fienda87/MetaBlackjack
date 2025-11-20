// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;  // 🔧 DIUBAH: dari ^0.8.20

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GCWANToken is ERC20, Ownable {
    bool public mintingEnabled = true;
    mapping(address => bool) public minters;
    
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event MintingStatusChanged(bool enabled);
    
    // 🔧 DIUBAH: tambah Ownable(msg.sender)
    constructor() ERC20("GCWAN Token", "GCWAN") Ownable(msg.sender) {
        _mint(msg.sender, 1000000 * 10**decimals());
        minters[msg.sender] = true;
        emit MinterAdded(msg.sender);
    }
    
    modifier onlyMinter() {
        require(minters[msg.sender] || msg.sender == owner(), "Not authorized to mint");
        _;
    }
    
    function mint(address to, uint256 amount) external onlyMinter {
        require(mintingEnabled, "Minting is disabled");
        _mint(to, amount);
    }
    
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
    
    function addMinter(address minter) external onlyOwner {
        require(!minters[minter], "Already a minter");
        minters[minter] = true;
        emit MinterAdded(minter);
    }
    
    function removeMinter(address minter) external onlyOwner {
        require(minters[minter], "Not a minter");
        minters[minter] = false;
        emit MinterRemoved(minter);
    }
    
    function setMintingEnabled(bool enabled) external onlyOwner {
        mintingEnabled = enabled;
        emit MintingStatusChanged(enabled);
    }
    
    function emergencyMint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}