// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;  // 🔧 DIUBAH: dari ^0.8.20

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./NFTCollection.sol";

contract StakingContract is Ownable {
    NFTCollection public nftCollection;
    IERC20 public gcwanToken;
    
    struct StakingInfo {
        address owner;
        uint256 tokenId;
        uint256 stakingTime;
        uint256 duration;
        uint256 rewards;
        bool active;
    }
    
    mapping(uint256 => StakingInfo) public stakingInfo;
    mapping(address => uint256[]) public stakedNFTs;
    mapping(address => uint256) public totalRewards;
    
    // 🔧 DIUBAH: dari constant ke public
    uint256 public APY = 500; // 5% APY
    uint256 public constant MIN_STAKING_DURATION = 1 hours;
    uint256 public constant MAX_STAKING_DURATION = 7 days;
    
    event Staked(address indexed owner, uint256 tokenId, uint256 duration);
    event Unstaked(address indexed owner, uint256 tokenId);
    event RewardsClaimed(address indexed owner, uint256 tokenId, uint256 amount);
    
    // 🔧 DIUBAH: tambah Ownable(msg.sender)
    constructor(address _nftCollection, address _gcwanToken) Ownable(msg.sender) {
        nftCollection = NFTCollection(_nftCollection);
        gcwanToken = IERC20(_gcwanToken);
    }
    
    function stake(uint256[] memory tokenIds, uint256 duration) external {
        require(duration >= MIN_STAKING_DURATION && duration <= MAX_STAKING_DURATION, 
                "Invalid staking duration");
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            
            require(nftCollection.ownerOf(tokenId) == msg.sender, "Not the owner");
            require(!stakingInfo[tokenId].active, "Already staked");
            
            nftCollection.transferFrom(msg.sender, address(this), tokenId);
            
            stakingInfo[tokenId] = StakingInfo({
                owner: msg.sender,
                tokenId: tokenId,
                stakingTime: block.timestamp,
                duration: duration,
                rewards: 0,
                active: true
            });
            
            stakedNFTs[msg.sender].push(tokenId);
            
            emit Staked(msg.sender, tokenId, duration);
        }
    }
    
    function unstake(uint256 tokenId) external {
        require(stakingInfo[tokenId].active, "Not staked");
        require(stakingInfo[tokenId].owner == msg.sender, "Not the owner");
        
        _calculateRewards(tokenId);
        uint256 rewards = stakingInfo[tokenId].rewards;
        
        if (rewards > 0) {
            require(gcwanToken.transfer(msg.sender, rewards), "Reward transfer failed");
            totalRewards[msg.sender] += rewards;
            emit RewardsClaimed(msg.sender, tokenId, rewards);
        }
        
        nftCollection.transferFrom(address(this), msg.sender, tokenId);
        stakingInfo[tokenId].active = false;
        _removeFromStakedNFTs(msg.sender, tokenId);
        
        emit Unstaked(msg.sender, tokenId);
    }
    
    function claimRewards(uint256 tokenId) external {
        require(stakingInfo[tokenId].active, "Not staked");
        require(stakingInfo[tokenId].owner == msg.sender, "Not the owner");
        
        _calculateRewards(tokenId);
        uint256 rewards = stakingInfo[tokenId].rewards;
        
        require(rewards > 0, "No rewards to claim");
        
        stakingInfo[tokenId].rewards = 0;
        
        require(gcwanToken.transfer(msg.sender, rewards), "Reward transfer failed");
        totalRewards[msg.sender] += rewards;
        
        emit RewardsClaimed(msg.sender, tokenId, rewards);
    }
    
    function claimAllRewards() external {
        uint256[] memory tokenIds = stakedNFTs[msg.sender];
        uint256 totalClaimAmount = 0;
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            if (stakingInfo[tokenId].active) {
                _calculateRewards(tokenId);
                uint256 rewards = stakingInfo[tokenId].rewards;
                totalClaimAmount += rewards;
                stakingInfo[tokenId].rewards = 0;
                
                emit RewardsClaimed(msg.sender, tokenId, rewards);
            }
        }
        
        require(totalClaimAmount > 0, "No rewards to claim");
        require(gcwanToken.transfer(msg.sender, totalClaimAmount), "Reward transfer failed");
        totalRewards[msg.sender] += totalClaimAmount;
    }
    
    function getStakedNFTs(address owner) external view returns (uint256[] memory) {
        return stakedNFTs[owner];
    }
    
    function getStakingInfo(uint256 tokenId) external view returns (
        uint256 stakingTime,
        uint256 duration,
        uint256 rewards,
        bool active
    ) {
        StakingInfo memory info = stakingInfo[tokenId];
        return (info.stakingTime, info.duration, info.rewards, info.active);
    }
    
    function calculateRewards(uint256 tokenId) external view returns (uint256) {
        if (!stakingInfo[tokenId].active) return 0;
        
        StakingInfo memory info = stakingInfo[tokenId];
        uint256 timeElapsed = block.timestamp - info.stakingTime;
        
        if (timeElapsed > info.duration) {
            timeElapsed = info.duration;
        }
        
        uint256 dailyReward = nftCollection.getTokenDailyReward(tokenId);
        
        return (dailyReward * timeElapsed * APY) / (24 hours * 365 days * 100);
    }
    
    function getTotalStaked(address owner) external view returns (uint256) {
        return stakedNFTs[owner].length;
    }
    
    function getTotalRewards(address owner) external view returns (uint256) {
        return totalRewards[owner];
    }
    
    function _calculateRewards(uint256 tokenId) internal {
        StakingInfo storage info = stakingInfo[tokenId];
        uint256 timeElapsed = block.timestamp - info.stakingTime;
        
        if (timeElapsed > info.duration) {
            timeElapsed = info.duration;
        }
        
        uint256 dailyReward = nftCollection.getTokenDailyReward(tokenId);
        
        uint256 newRewards = (dailyReward * timeElapsed * APY) / (24 hours * 365 days * 100);
        
        info.rewards = newRewards;
    }
    
    function _removeFromStakedNFTs(address owner, uint256 tokenId) internal {
        uint256[] storage tokenIds = stakedNFTs[owner];
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (tokenIds[i] == tokenId) {
                tokenIds[i] = tokenIds[tokenIds.length - 1];
                tokenIds.pop();
                break;
            }
        }
    }
    
    function emergencyUnstake(uint256 tokenId) external onlyOwner {
        require(stakingInfo[tokenId].active, "Not staked");
        
        address owner = stakingInfo[tokenId].owner;
        
        nftCollection.transferFrom(address(this), owner, tokenId);
        
        stakingInfo[tokenId].active = false;
        
        _removeFromStakedNFTs(owner, tokenId);
        
        emit Unstaked(owner, tokenId);
    }
    
    // 🔧 DIUBAH: sekarang bisa update APY
    function updateAPY(uint256 newAPY) external onlyOwner {
        APY = newAPY;
    }
    
    function updateNFTCollection(address _nftCollection) external onlyOwner {
        nftCollection = NFTCollection(_nftCollection);
    }
    
    function updateGCWANToken(address _gcwanToken) external onlyOwner {
        gcwanToken = IERC20(_gcwanToken);
    }
}