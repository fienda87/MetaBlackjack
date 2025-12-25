#!/bin/bash
# Quick setup script for blockchain event listeners

echo "🔗 Setting up Blockchain Event Listeners..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "📝 Copying .env.example to .env..."
    cp .env.example .env
    echo "✅ Done! Please edit .env with your values:"
    echo "   - POLYGON_AMOY_RPC_URL (required)"
    echo "   - BACKEND_PRIVATE_KEY (for withdrawals)"
    echo ""
else
    echo "✅ .env file exists"
fi

# Check if RPC URL is set
if grep -q "POLYGON_AMOY_RPC_URL=\"https://rpc-amoy.polygon.technology\"" .env 2>/dev/null; then
    echo "✅ Using default Polygon Amoy RPC"
else
    echo "⚠️  Custom RPC URL detected - make sure it's working"
fi

echo ""
echo "🧪 Testing RPC connection..."

# Test RPC endpoint
RPC_URL=$(grep POLYGON_AMOY_RPC_URL .env | cut -d '=' -f2 | tr -d '"' || echo "https://rpc-amoy.polygon.technology")

if command -v curl &> /dev/null; then
    RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        "$RPC_URL")
    
    if echo "$RESPONSE" | grep -q "result"; then
        BLOCK=$(echo "$RESPONSE" | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
        echo "✅ RPC connection successful!"
        echo "   Current block: $BLOCK"
    else
        echo "❌ RPC connection failed!"
        echo "   Response: $RESPONSE"
        echo ""
        echo "💡 Try using a premium RPC:"
        echo "   - Alchemy: https://alchemy.com"
        echo "   - Infura: https://infura.io"
        echo "   - QuickNode: https://quicknode.com"
    fi
else
    echo "⚠️  curl not found - skipping RPC test"
fi

echo ""
echo "📋 Contract Addresses (Polygon Amoy):"
echo "   GBC Token:       0xAb375cfac25e40Ed0e8aEc079B007DFA0ec4c29a"
echo "   Deposit Escrow:  0x4c950023B40131944c7F0D116e86D046A7e7EE20"
echo "   Game Withdraw:   0x84eb5B86e53EB5393FB29131a5A30deBA8236cC3"
echo "   Faucet:          0xa04B31b44DE6773A6018Eaed625FBE6Cb9AA18a7"
echo ""

echo "🚀 Ready to start!"
echo ""
echo "Run the server:"
echo "   npm run dev    # Development mode"
echo "   npm start      # Production mode"
echo ""
echo "The blockchain listeners will start automatically."
echo ""
