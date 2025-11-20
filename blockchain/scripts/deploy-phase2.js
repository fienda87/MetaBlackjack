import hre from "hardhat";
import { ethers as ethersLib } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("🚀 Starting deployment of 3 contracts to Polygon Amoy Testnet...\n");

  // Setup provider and wallet manually
  const provider = new ethersLib.JsonRpcProvider(
    process.env.POLYGON_AMOY_RPC || "https://rpc-amoy.polygon.technology"
  );
  
  const deployer = new ethersLib.Wallet(process.env.PRIVATE_KEY, provider);
  console.log("📝 Deploying with account:", deployer.address);

  // Check balance
  const balance = await provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethersLib.formatEther(balance), "MATIC");

  if (balance === 0n) {
    console.error("❌ Error: Deployer account has no MATIC!");
    console.log("Get test MATIC from: https://faucet.polygon.technology/");
    process.exit(1);
  }

  // GBC Token address (already deployed)
  const GBC_TOKEN_ADDRESS = "0xAb375cfac25e40Ed0e8aEc079B007DFA0ec4c29a";
  console.log("\n📦 GBC Token Address:", GBC_TOKEN_ADDRESS);

  // Backend signer address (for withdrawal verification)
  const BACKEND_SIGNER = process.env.BACKEND_SIGNER_ADDRESS || deployer.address;
  console.log("🔐 Backend Signer Address:", BACKEND_SIGNER);

  try {
    // 1. Deploy GBCFaucet
    console.log("\n===== Deploying GBCFaucet =====");
    const faucetArtifactPath = path.join(
      process.cwd(),
      "artifacts/contracts/GBCFaucet.sol/GBCFaucet.json"
    );
    const faucetArtifact = JSON.parse(fs.readFileSync(faucetArtifactPath, "utf8"));
    
    const faucetFactory = new ethersLib.ContractFactory(
      faucetArtifact.abi,
      faucetArtifact.bytecode,
      deployer
    );

    const faucet = await faucetFactory.deploy(GBC_TOKEN_ADDRESS);
    const faucetReceipt = await faucet.deploymentTransaction()?.wait();
    const faucetAddress = await faucet.getAddress();
    
    console.log("✅ GBCFaucet deployed at:", faucetAddress);
    console.log("   TX Hash:", faucetReceipt?.hash);

    // 2. Deploy DepositEscrow
    console.log("\n===== Deploying DepositEscrow =====");
    const depositArtifactPath = path.join(
      process.cwd(),
      "artifacts/contracts/DepositEscrow.sol/DepositEscrow.json"
    );
    const depositArtifact = JSON.parse(fs.readFileSync(depositArtifactPath, "utf8"));
    
    const depositFactory = new ethersLib.ContractFactory(
      depositArtifact.abi,
      depositArtifact.bytecode,
      deployer
    );

    const deposit = await depositFactory.deploy(GBC_TOKEN_ADDRESS);
    const depositReceipt = await deposit.deploymentTransaction()?.wait();
    const depositAddress = await deposit.getAddress();
    
    console.log("✅ DepositEscrow deployed at:", depositAddress);
    console.log("   TX Hash:", depositReceipt?.hash);

    // 3. Deploy GameWithdraw
    console.log("\n===== Deploying GameWithdraw =====");
    const withdrawArtifactPath = path.join(
      process.cwd(),
      "artifacts/contracts/GameWithdraw.sol/GameWithdraw.json"
    );
    const withdrawArtifact = JSON.parse(fs.readFileSync(withdrawArtifactPath, "utf8"));
    
    const withdrawFactory = new ethersLib.ContractFactory(
      withdrawArtifact.abi,
      withdrawArtifact.bytecode,
      deployer
    );

    const withdraw = await withdrawFactory.deploy(GBC_TOKEN_ADDRESS, BACKEND_SIGNER);
    const withdrawReceipt = await withdraw.deploymentTransaction()?.wait();
    const withdrawAddress = await withdraw.getAddress();
    
    console.log("✅ GameWithdraw deployed at:", withdrawAddress);
    console.log("   TX Hash:", withdrawReceipt?.hash);

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
      blockNumber: await provider.getBlockNumber(),
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

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
