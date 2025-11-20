import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const deploymentPath = path.join(__dirname, "../deployments/polygon-amoy.json");

async function main() {
  console.log("🔍 Verifying Smart Contracts on Polygonscan...\n");

  // Read deployment data
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ Deployment file not found:", deploymentPath);
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  const { faucet, deposit, withdraw, gbcToken } = deployment;

  console.log("📋 Contracts to verify:");
  console.log("  - Faucet:   ", faucet);
  console.log("  - Deposit:  ", deposit);
  console.log("  - Withdraw: ", withdraw);
  console.log("\n");

  const contracts = [
    {
      name: "GBCFaucet",
      address: faucet,
      args: `["${gbcToken}"]`,
    },
    {
      name: "DepositEscrow",
      address: deposit,
      args: `["${gbcToken}"]`,
    },
    {
      name: "GameWithdraw",
      address: withdraw,
      args: `["${gbcToken}", "${deployment.backendSigner}"]`,
    },
  ];

  let verified = 0;

  for (const contract of contracts) {
    try {
      console.log(`Verifying ${contract.name}...`);

      // Run hardhat verify command
      const cmd = `npx hardhat verify --network polygonAmoy --constructor-args ${contract.args} ${contract.address}`;
      console.log(`  Running: ${cmd}\n`);

      const output = execSync(cmd, { encoding: "utf-8" });
      console.log(output);
      verified++;
    } catch (error: any) {
      // Check if it's already verified
      if (error.message.includes("Already Verified")) {
        console.log(`  ✅ ${contract.name} already verified\n`);
        verified++;
      } else {
        console.error(`  ❌ Failed to verify ${contract.name}`);
        console.error(error.message);
        console.log("\n");
      }
    }
  }

  // Summary
  console.log("\n========================================");
  console.log(`✅ Verification Summary: ${verified}/${contracts.length} verified`);
  console.log("========================================\n");

  console.log("🔗 Verified contracts on Polygonscan:");
  for (const contract of contracts) {
    console.log(`  https://amoy.polygonscan.com/address/${contract.address}`);
  }

  console.log("\n📝 Next Steps:");
  console.log("  1. Fund faucet contract with GBC tokens");
  console.log("  2. Update frontend with contract addresses");
  console.log("  3. Test deposit/withdraw functionality");
}

main().catch((error) => {
  console.error("❌ Verification failed:", error);
  process.exit(1);
});
