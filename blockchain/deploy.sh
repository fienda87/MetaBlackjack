#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 MetaBlackjack Smart Contract Deployment${NC}"
echo "=============================================="

# Check if we're in blockchain directory
if [ ! -f "hardhat.config.js" ]; then
    echo -e "${RED}❌ Error: hardhat.config.js not found${NC}"
    echo "Please run this script from the blockchain directory"
    exit 1
fi

# Check environment variables
if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}❌ Error: PRIVATE_KEY not set in .env${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment variables configured${NC}"

# Get network from argument or default to polygonAmoy
NETWORK=${1:-polygonAmoy}
echo -e "\n📡 Deploying to network: ${YELLOW}$NETWORK${NC}"

# Check if contracts are compiled
if [ ! -d "artifacts" ]; then
    echo -e "\n🔨 Compiling contracts..."
    npx hardhat compile
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Compilation failed${NC}"
        exit 1
    fi
fi

# Run deployment
echo -e "\n${GREEN}📝 Running deployment script...${NC}"
npx hardhat run scripts/deploy.ts --network "$NETWORK"

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ Deployment completed successfully!${NC}"
    echo -e "\n📋 Next steps:"
    echo "  1. Check deployments/polygon-amoy.json for contract addresses"
    echo "  2. Fund the faucet contract with GBC tokens"
    echo "  3. Update frontend .env with contract addresses"
    echo "  4. Verify contracts on Polygonscan (optional)"
else
    echo -e "\n${RED}❌ Deployment failed${NC}"
    exit 1
fi
