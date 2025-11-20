const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🚀 Starting deployment to Polygon Amoy Testnet...");
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  // 🔧 DIUBAH: ethers v6 syntax
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "MATIC");
  
  if (balance < ethers.parseEther("0.1")) {
    console.error("❌ Insufficient balance! Please get more test MATIC from faucet.");
    process.exit(1);
  }

  // Deploy GCWAN Token
  console.log("🪙 Deploying GCWAN Token...");
  const GCWANToken = await ethers.getContractFactory("GCWANToken");
  const gcwanToken = await GCWANToken.deploy();
  // 🔧 DIUBAH: dari .deployed() ke .waitForDeployment()
  await gcwanToken.waitForDeployment();
  console.log("✅ GCWAN Token deployed to:", await gcwanToken.getAddress());

  // Deploy NFT Collection
  console.log("🎨 Deploying NFT Collection...");
  const NFTCollection = await ethers.getContractFactory("NFTCollection");
  const nftCollection = await NFTCollection.deploy();
  await nftCollection.waitForDeployment();
  console.log("✅ NFT Collection deployed to:", await nftCollection.getAddress());

  // Deploy Staking Contract
  console.log("🏦 Deploying Staking Contract...");
  const StakingContract = await ethers.getContractFactory("StakingContract");
  const stakingContract = await StakingContract.deploy(
    // 🔧 DIUBAH: await getAddress()
    await nftCollection.getAddress(),
    await gcwanToken.getAddress()
  );
  await stakingContract.waitForDeployment();
  console.log("✅ Staking Contract deployed to:", await stakingContract.getAddress());

  // Mint initial NFT collection
  console.log("🎯 Minting initial NFT collection...");
  const mintTx = await nftCollection.mintInitialCollection(deployer.address);
  await mintTx.wait();
  console.log("✅ Initial NFT collection minted!");

  // Approve NFT collection to transfer NFTs
  console.log("🔑 Approving NFT transfers...");
  const approveTx = await nftCollection.setApprovalForAll(await stakingContract.getAddress(), true);
  await approveTx.wait();
  console.log("✅ NFT transfers approved!");

  // 🔧 DIUBAH: get addresses properly
  const gcwanTokenAddress = await gcwanToken.getAddress();
  const nftCollectionAddress = await nftCollection.getAddress();
  const stakingContractAddress = await stakingContract.getAddress();
  
  console.log("\n🎉 Deployment Summary:");
  console.log("================================");
  console.log("📱 Network: Polygon Amoy Testnet");
  console.log("🪙 GCWAN Token:", gcwanTokenAddress);
  console.log("🎨 NFT Collection:", nftCollectionAddress);
  console.log("🏦 Staking Contract:", stakingContractAddress);
  console.log("👤 Deployer:", deployer.address);
  console.log("================================");

  // Save contract addresses to file
  const contractAddresses = {
    GCWAN_TOKEN: gcwanTokenAddress,
    NFT_COLLECTION: nftCollectionAddress,
    STAKING_CONTRACT: stakingContractAddress,
    NETWORK: "polygon_amoy",
    CHAIN_ID: 80002,
    DEPLOYER: deployer.address,
    DEPLOYMENT_TIME: new Date().toISOString()
  };

  const fs = require("fs");
  fs.writeFileSync(
    "./contract-addresses.json",
    JSON.stringify(contractAddresses, null, 2)
  );
  console.log("📄 Contract addresses saved to contract-addresses.json");

  // Update frontend configuration
  console.log("🔧 Updating frontend configuration...");
  const web3Config = `// Auto-generated contract addresses
export const CONTRACTS = {
  GCWAN_TOKEN: "${gcwanTokenAddress}",
  NFT_COLLECTION: "${nftCollectionAddress}",
  STAKING_CONTRACT: "${stakingContractAddress}"
}

export const POLYGON_AMOY = {
  chainId: 80002,
  chainName: "Polygon Amoy Testnet",
  nativeCurrency: {
    name: "MATIC",
    symbol: "MATIC",
    decimals: 18,
  },
  rpcUrls: ["https://rpc-amoy.polygon.technology"],
  blockExplorerUrls: ["https://amoy.polygonscan.com"],
}`;

  fs.writeFileSync("./src/lib/contracts.ts", web3Config);
  console.log("✅ Frontend configuration updated!");

  // Verification instructions
  console.log("\n🔍 Contract Verification:");
  console.log("================================");
  console.log("To verify contracts on Polygonscan, run:");
  console.log(`npx hardhat verify --network polygon_amoy ${gcwanTokenAddress}`);
  console.log(`npx hardhat verify --network polygon_amoy ${nftCollectionAddress}`);
  console.log(`npx hardhat verify --network polygon_amoy ${stakingContractAddress} "${nftCollectionAddress}" "${gcwanTokenAddress}"`);

  console.log("\n🎯 Next Steps:");
  console.log("================================");
  console.log("1. Update your .env.local with the new contract addresses");
  console.log("2. Restart your development server");
  console.log("3. Test the application with the deployed contracts");
  console.log("4. Verify contracts on Polygonscan for transparency");

  console.log("\n🎉 Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });