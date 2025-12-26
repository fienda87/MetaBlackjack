// Test approve function directly
const { ethers } = require('ethers');
require('dotenv').config({ path: '.env.local' });

const GBC_TOKEN = "0xAb375cfac25e40Ed0e8aEc079B007DFA0ec4c29a";
const DEPOSIT_ESCROW = "0x188D3aC5AE2D2B87EdFc1A46f3Ce900c0e7D4E22";
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://rpc-amoy.polygon.technology";

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)"
];

async function testApprove() {
    console.log('🧪 Testing GBC Token Approve Function\n');
    console.log('Configuration:');
    console.log('  RPC URL:', RPC_URL);
    console.log('  GBC Token:', GBC_TOKEN);
    console.log('  Deposit Escrow:', DEPOSIT_ESCROW);
    console.log('');

    try {
        // Connect to network
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
        const network = await provider.getNetwork();
        console.log('✅ Connected to network:', network.name, '(chainId:', network.chainId, ')');
        
        // Create wallet
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        console.log('✅ Wallet address:', wallet.address);
        
        // Get MATIC balance
        const maticBalance = await wallet.getBalance();
        console.log('💰 MATIC balance:', ethers.utils.formatEther(maticBalance), 'MATIC');
        
        // Get GBC token contract
        const token = new ethers.Contract(GBC_TOKEN, ERC20_ABI, wallet);
        
        // Get token info
        const symbol = await token.symbol();
        const decimals = await token.decimals();
        console.log('🪙 Token:', symbol, '(decimals:', decimals, ')');
        
        // Get GBC balance
        const balance = await token.balanceOf(wallet.address);
        console.log('💎 GBC balance:', ethers.utils.formatUnits(balance, decimals), 'GBC');
        
        // Check current allowance
        const currentAllowance = await token.allowance(wallet.address, DEPOSIT_ESCROW);
        console.log('📋 Current allowance:', ethers.utils.formatUnits(currentAllowance, decimals), 'GBC');
        console.log('');
        
        // Estimate gas for approve
        console.log('⛽ Estimating gas...');
        const gasEstimate = await token.estimateGas.approve(
            DEPOSIT_ESCROW,
            ethers.constants.MaxUint256
        );
        console.log('  Gas estimate:', gasEstimate.toString());
        
        // Get gas price
        const gasPrice = await provider.getGasPrice();
        console.log('  Gas price:', ethers.utils.formatUnits(gasPrice, 'gwei'), 'gwei');
        
        const gasCost = gasEstimate.mul(gasPrice);
        console.log('  Estimated cost:', ethers.utils.formatEther(gasCost), 'MATIC');
        console.log('');
        
        // Send approve transaction
        console.log('📝 Sending approve transaction...');
        const tx = await token.approve(
            DEPOSIT_ESCROW,
            ethers.constants.MaxUint256,
            {
                gasLimit: gasEstimate.mul(120).div(100) // Add 20% buffer
            }
        );
        
        console.log('✅ Transaction sent!');
        console.log('  Tx hash:', tx.hash);
        console.log('  Waiting for confirmation...');
        
        // Wait for confirmation
        const receipt = await tx.wait();
        console.log('✅ Transaction confirmed!');
        console.log('  Block number:', receipt.blockNumber);
        console.log('  Gas used:', receipt.gasUsed.toString());
        console.log('  Status:', receipt.status === 1 ? 'SUCCESS' : 'FAILED');
        console.log('');
        
        // Check new allowance
        const newAllowance = await token.allowance(wallet.address, DEPOSIT_ESCROW);
        console.log('📋 New allowance:', ethers.utils.formatUnits(newAllowance, decimals), 'GBC');
        console.log('');
        
        console.log('🎉 Test completed successfully!');
        console.log('View on PolygonScan:', `https://amoy.polygonscan.com/tx/${tx.hash}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        if (error.code) {
            console.error('  Error code:', error.code);
        }
        
        if (error.reason) {
            console.error('  Reason:', error.reason);
        }
        
        if (error.transaction) {
            console.error('  Transaction:', JSON.stringify(error.transaction, null, 2));
        }
        
        console.error('\nFull error:', error);
    }
}

testApprove().catch(console.error);
