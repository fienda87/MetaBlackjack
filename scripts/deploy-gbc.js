import hre from "hardhat";

async function main() {
  console.log("🚀 Starting GBC Token deployment to Polygon Amoy...");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);

  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "MATIC");

  if (balance === 0n) {
    console.error("❌ Error: Deployer account has no MATIC!");
    console.log("Get test MATIC from: https://faucet.polygon.technology/");
    process.exit(1);
  }

  // Deploy GBC Token
  console.log("\n📦 Deploying GBCToken contract...");
  const GBCToken = await hre.ethers.getContractFactory("GBCToken");
  const gbcToken = await GBCToken.deploy();
  await gbcToken.waitForDeployment();

  const contractAddress = await gbcToken.getAddress();
  console.log("✅ GBCToken deployed to:", contractAddress);

  // Get initial supply
  const totalSupply = await gbcToken.totalSupply();
  console.log("💎 Initial supply:", hre.ethers.formatEther(totalSupply), "GBC");

  // Get token details
  const name = await gbcToken.name();
  const symbol = await gbcToken.symbol();
  const decimals = await gbcToken.decimals();
  console.log(`📋 Token: ${name} (${symbol}), Decimals: ${decimals}`);

  // Add game server as minter (if GAME_SERVER_ADDRESS is provided)
  if (process.env.GAME_SERVER_ADDRESS) {
    console.log("\n🎮 Adding game server as authorized minter...");
    const tx = await gbcToken.addGameMinter(process.env.GAME_SERVER_ADDRESS);
    await tx.wait();
    console.log("✅ Game server added:", process.env.GAME_SERVER_ADDRESS);
  }

  // Verify contract on Polygonscan
  if (process.env.POLYGONSCAN_API_KEY) {
    console.log("\n🔍 Waiting for block confirmations before verification...");
    await gbcToken.deploymentTransaction().wait(6); // Wait 6 blocks

    console.log("📝 Verifying contract on Polygonscan...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("✅ Contract verified successfully!");
    } catch (error) {
      if (error.message.includes("already verified")) {
        console.log("ℹ️ Contract already verified");
      } else {
        console.log("⚠️ Verification error:", error.message);
      }
    }
  }

  // Print deployment summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log("\n📋 Deployment Summary:");
  console.log("━".repeat(60));
  console.log(`Contract Address:     ${contractAddress}`);
  console.log(`Network:              Polygon Amoy (Chain ID: 80002)`);
  console.log(`Explorer:             https://amoy.polygonscan.com/address/${contractAddress}`);
  console.log(`Deployer:             ${deployer.address}`);
  console.log(`Initial Supply:       ${hre.ethers.formatEther(totalSupply)} GBC`);
  console.log("━".repeat(60));

  console.log("\n⚙️ Next Steps:");
  console.log("1. Add to .env.local:");
  console.log(`   NEXT_PUBLIC_GBC_TOKEN_ADDRESS=${contractAddress}`);
  console.log("\n2. Import GBC tokens to MetaMask:");
  console.log(`   Token Address: ${contractAddress}`);
  console.log(`   Symbol: GBC`);
  console.log(`   Decimals: 18`);
  console.log("\n3. Authorize game server as minter (if not done):");
  console.log(`   await gbcToken.addGameMinter(gameServerAddress)`);
  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
