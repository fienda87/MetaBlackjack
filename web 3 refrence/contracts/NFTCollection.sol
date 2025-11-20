// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;  // 🔧 DIUBAH: dari ^0.8.20

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTCollection is ERC721, Ownable {
    uint256 private _tokenIdCounter;
    enum Rarity { NORMAL, RARE, EPIC, LEGENDARY }

    // 🔧 DIUBAH: tokenURI -> tokenUri
    struct NFTData {
        uint256 tokenId;
        Rarity rarity;
        uint256 dailyReward;
        string specialAbility;
        string tokenUri;  // 🔧 DIUBAH: dari tokenURI
    }

    mapping(uint256 => NFTData) public nftData;
    mapping(uint256 => address) public tokenOwner;
    mapping(address => uint256[]) public ownedTokens;

    event NFTMinted(address indexed to, uint256 tokenId, Rarity rarity);
    event TokenURISet(uint256 tokenId, string tokenURI);

    // 🔧 DIUBAH: tambah Ownable(msg.sender)
    constructor() ERC721("GCWAN NFT Collection", "GCWANNFT") Ownable(msg.sender) {
        _tokenIdCounter = 1;
    }

    // 🔧 DIUBAH: parameter _tokenURI -> _tokenUri
    function mintNFT(
        address to,
        Rarity rarity,
        uint256 dailyReward,
        string memory specialAbility,
        string memory _tokenUri  // 🔧 DIUBAH: dari _tokenURI
    ) external onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        _safeMint(to, tokenId);

        nftData[tokenId] = NFTData({
            tokenId: tokenId,
            rarity: rarity,
            dailyReward: dailyReward,
            specialAbility: specialAbility,
            tokenUri: _tokenUri  // 🔧 DIUBAH: dari tokenURI
        });

        tokenOwner[tokenId] = to;
        ownedTokens[to].push(tokenId);

        emit NFTMinted(to, tokenId, rarity);
        emit TokenURISet(tokenId, _tokenUri);

        return tokenId;
    }

    // 🔧 DIUBAH: return nftData[tokenId].tokenUri
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "ERC721: URI query for nonexistent token");
        return nftData[tokenId].tokenUri;  // 🔧 DIUBAH: dari tokenURI
    }

    function getTokenRarity(uint256 tokenId) external view returns (uint8) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return uint8(nftData[tokenId].rarity);
    }

    function getTokenDailyReward(uint256 tokenId) external view returns (uint256) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return nftData[tokenId].dailyReward;
    }

    function getTokenSpecialAbility(uint256 tokenId) external view returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return nftData[tokenId].specialAbility;
    }

    function getOwnedTokens(address owner) external view returns (uint256[] memory) {
        return ownedTokens[owner];
    }

    function getNextTokenId() external view returns (uint256) {
        return _tokenIdCounter;
    }

    // 🔧 DIUBAH: ganti recursive call dengan direct minting
    function mintInitialCollection(address to) external onlyOwner {
        string[6] memory uris = [
            "https://z-cdn-media.chatglm.cn/files/16112e68-bda5-404e-94c6-95bca3ff18f2_WhatsApp%20Image%202024-06-30%20at%2002.30.39_4161e686.jpg?auth_key=1793352997-bcd74aed062747b292fb69eb9a5f9028-0-ba3a7aaf125e9773bb08785a0b2aab83",
            "https://z-cdn-media.chatglm.cn/files/71a432ca-f512-4187-a898-aeb5151ffd35_WhatsApp%20Image%202024-06-30%20at%2002.38.06_6bd9a7c3.jpg?auth_key=1793352997-46c651973ae84266a93ed372cac1d4b5-0-7a5d752d2229391d0f2bfe3387cdf827",
            "https://z-cdn-media.chatglm.cn/files/1505a001-616c-4df6-bd89-873436924820_WhatsApp%20Image%202024-07-02%20at%2001.44.40_7106e026.jpg?auth_key=1793352997-1ac9ef9d77234e84bdc906209ee7b23a-0-efd03208dc19938a89dc7606f7567937",
            "https://z-cdn-media.chatglm.cn/files/2ed183ea-c5c1-420d-aeaf-103816850175_WhatsApp%20Image%202024-07-02%20at%2001.44.50_260636dc.jpg?auth_key=1793352997-22caa42caddf42c3a3fa88c8e5cb028e-0-28cf2a6a9d08e306937e48360d14412e",
            "https://z-cdn-media.chatglm.cn/files/634241dd-d993-4243-976d-aa1118f02911_WhatsApp%20Image%202024-07-09%20at%2001.18.02_17be3d5a.jpg?auth_key=1793352997-039e43bb5b574c0498e03f1d3971b960-0-043b2a6456350bfbb764f4f874bd216ee",
            "https://z-cdn-media.chatglm.cn/files/44b28c87-791e-4825-b263-bce825ae7c61_WhatsApp%20Image%202024-07-10%20at%2001.30.20_c6b009bb.jpg?auth_key=1793352997-01c59fe71eec497da91b17b5aded501f-0-8fb5aaf6f0cdee1613d07b85c9d7a34b"
        ];

        string[6] memory abilities = [
            "Basic income generation + 10% bonus during study sessions",
            "2x rewards during night hours (8PM - 6AM)",
            "3x weekend bonus + butterfly luck multiplier",
            "5x all rewards + bonus for staking with others + master of fortune",
            "5x all rewards + dark power bonus + midnight supremacy",
            "3x weekend bonus + knowledge multiplier + elegant aura"
        ];

        // 🔧 DIUBAH: tambah uint256() casting
        uint256[6] memory rewards = [uint256(10), 25, 50, 100, 100, 50];
        Rarity[6] memory rarities = [Rarity.NORMAL, Rarity.RARE, Rarity.EPIC, Rarity.LEGENDARY, Rarity.LEGENDARY, Rarity.EPIC];

        for (uint256 i = 0; i < 6; i++) {
            uint256 tokenId = _tokenIdCounter;
            _tokenIdCounter++;

            // 🔧 DIUBAH: direct minting, bukan recursive call
            _safeMint(to, tokenId);

            nftData[tokenId] = NFTData({
                tokenId: tokenId,
                rarity: rarities[i],
                dailyReward: rewards[i],
                specialAbility: abilities[i],
                tokenUri: uris[i]
            });

            tokenOwner[tokenId] = to;
            ownedTokens[to].push(tokenId);

            emit NFTMinted(to, tokenId, rarities[i]);
            emit TokenURISet(tokenId, uris[i]);
        }
    }

    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
}