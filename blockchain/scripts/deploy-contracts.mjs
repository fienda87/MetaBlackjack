import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("🚀 Starting deployment to Polygon Amoy Testnet...\n");

  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "MATIC");

  // GBC Token address (already deployed)
  const GBC_TOKEN_ADDRESS = "0xAb375cfac25e40Ed0e8aEc079B007DFA0ec4c29a";
  console.log("\n📦 GBC Token Address:", GBC_TOKEN_ADDRESS);

  // Backend signer address (for withdrawal verification)
  const BACKEND_SIGNER = process.env.BACKEND_SIGNER_ADDRESS || deployer.address;
  console.log("🔐 Backend Signer Address:", BACKEND_SIGNER);

  try {
    // 1. Deploy Faucet
    console.log("\n------- Deploying GBCFaucet -------");
    const GBCFaucet = await ethers.getContractFactory("GBCFaucet");
    const faucet = await GBCFaucet.deploy(GBC_TOKEN_ADDRESS);
    await faucet.waitForDeployment();
    const faucetAddress = await faucet.getAddress();
    console.log("✅ GBCFaucet deployed at:", faucetAddress);

    // 2. Deploy Deposit Escrow
    console.log("\n------- Deploying DepositEscrow -------");
    const DepositEscrow = await ethers.getContractFactory("DepositEscrow");
    const deposit = await DepositEscrow.deploy(GBC_TOKEN_ADDRESS);
    await deposit.waitForDeployment();
    const depositAddress = await deposit.getAddress();
    console.log("✅ DepositEscrow deployed at:", depositAddress);

    // 3. Deploy Withdraw
    console.log("\n------- Deploying GameWithdraw -------");
    const GameWithdraw = await ethers.getContractFactory("GameWithdraw");
    const withdraw = await GameWithdraw.deploy(GBC_TOKEN_ADDRESS, BACKEND_SIGNER);
    await withdraw.waitForDeployment();
    const withdrawAddress = await withdraw.getAddress();
    console.log("✅ GameWithdraw deployed at:", withdrawAddress);

    // Save deployment addresses
    const deploymentData = {
      network: "polygon-amoy",
      chainId: 80002,
      deployer: deployer.address,
      backendSigner: BACKEND_SIGNER,
      gbcToken: GBC_TOKEN_ADDRESS,
      faucet: faucetAddress,
      deposit: depositAddress,
      withdraw: withdrawAddress,
      deploymentTime: new Date().toISOString(),
    };

    const deploymentDir = path.join(__dirname, "../deployments");
    const deploymentPath = path.join(deploymentDir, "polygon-amoy.json");

    if (!fs.existsSync(deploymentDir)) {
      fs.mkdirSync(deploymentDir, { recursive: true });
    }

    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
    console.log("\n💾 Deployment addresses saved to:", deploymentPath);

    // Print summary
    console.log("\n========================================");
    console.log("✅ DEPLOYMENT SUCCESSFUL!");
    console.log("========================================");
    console.log("\n📋 Contract Addresses:");
    console.log("  GBCFaucet:    ", faucetAddress);
    console.log("  DepositEscrow:", depositAddress);
    console.log("  GameWithdraw: ", withdrawAddress);
    console.log("\n🔗 Polygon Amoy Explorer (Polygonscan):");
    console.log(`  Faucet:      https://amoy.polygonscan.com/address/${faucetAddress}`);
    console.log(`  Deposit:     https://amoy.polygonscan.com/address/${depositAddress}`);
    console.log(`  Withdraw:    https://amoy.polygonscan.com/address/${withdrawAddress}`);

    console.log("\n📝 Next Steps:");
    console.log("  1. Fund faucet contract with GBC tokens");
    console.log("  2. Verify contracts on Polygonscan");
    console.log("  3. Update frontend with contract addresses");
    console.log("  4. Test deposit/withdraw flow");

  } catch (error) {
    console.error("\n❌ Deployment failed!");
    console.error(error);
    process.exit(1);
  }
}

main();
