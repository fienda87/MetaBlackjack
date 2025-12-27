/**
 * SPY MODE: Raw Event Listener for Deposit Diagnostics
 * Captures ALL logs from DEPOSIT_ESCROW_ADDRESS to diagnose signature mismatches
 */
import { ethers } from 'ethers'; 
import { 
  createProvider,
  CONTRACT_ADDRESSES, 
  NETWORK_CONFIG 
} from './config';

// Address shortcut
const DEPOSIT_ESCROW_ADDRESS = CONTRACT_ADDRESSES.DEPOSIT_ESCROW;

// Expected event signature hash
const EXPECTED_SIGNATURE = 'Deposit(address,uint256,uint256,uint256)';
const EXPECTED_SIGNATURE_HASH = ethers.id(EXPECTED_SIGNATURE);

console.log('='.repeat(70));
console.log('🔍 DEPOSIT ESCROW SPY MODE - RAW EVENT DIAGNOSTICS');
console.log('='.repeat(70));
console.log(`📍 Contract Address: ${DEPOSIT_ESCROW_ADDRESS}`);
console.log(`🔑 Expected Signature: ${EXPECTED_SIGNATURE}`);
console.log(`🔑 Expected Signature Hash: ${EXPECTED_SIGNATURE_HASH}`);
console.log(`🌐 RPC URL: ${NETWORK_CONFIG.RPC_URL}`);
console.log('='.repeat(70));

async function startSpyListener() {
  const provider = createProvider();
  console.log(`📡 Provider created: ${provider.constructor.name}\n`);

  // Verify contract is deployed
  console.log(`🔎 Verifying contract deployment at ${DEPOSIT_ESCROW_ADDRESS}...`);
  const code = await provider.getCode(DEPOSIT_ESCROW_ADDRESS);
  if (code === '0x') {
    console.error('❌ Contract not found at address!');
    process.exit(1);
  }
  console.log('✅ Contract verified on-chain\n');

  // Get current block
  const currentBlock = await provider.getBlockNumber();
  const startBlock = Math.max(0, currentBlock - 100); // Scan last 100 blocks
  
  console.log(`📦 Scanning blocks ${startBlock} to ${currentBlock} for ALL logs...\n`);

  // Capture ALL logs (no filtering - raw mode)
  const filter = {
    address: DEPOSIT_ESCROW_ADDRESS,
    fromBlock: startBlock,
    toBlock: 'latest',
  };

  console.log('⏳ Fetching all logs (this may take a moment)...');
  const logs = await provider.getLogs(filter);
  
  console.log(`\n📊 Total logs found: ${logs.length}`);
  console.log('-'.repeat(70));

  if (logs.length === 0) {
    console.log('⚠️  No logs found in the specified block range.');
    console.log('   Try increasing the block range or check if the contract has emitted any events.');
    return;
  }

  // Analyze each log
  for (const log of logs) {
    console.log('\n' + '='.repeat(70));
    console.log('📜 RAW LOG DETECTED');
    console.log('='.repeat(70));
    
    // Log basic info
    console.log(`🧱 Block: ${log.blockNumber}`);
    console.log(`📝 Transaction: ${log.transactionHash}`);
    console.log(`🔢 Log Index: ${log.index}`);
    console.log(`📭 Contract: ${log.address}`);
    
    // Raw topics analysis
    console.log('\n🔑 RAW TOPICS:');
    console.log(`   topics.length: ${log.topics.length}`);
    
    log.topics.forEach((topic, idx) => {
      console.log(`   topics[${idx}]: ${topic}`);
    });
    
    // Extract signature from topic[0]
    const rawSignature = log.topics[0] || 'undefined';
    console.log('\n🎯 SIGNATURE ANALYSIS:');
    console.log(`   Raw topic[0]: ${rawSignature}`);
    console.log(`   Expected:     ${EXPECTED_SIGNATURE_HASH}`);
    
    // Compare signatures
    const signatureMatch = rawSignature === EXPECTED_SIGNATURE_HASH;
    console.log(`   Match:        ${signatureMatch ? '✅ YES' : '❌ NO'}`);
    
    if (!signatureMatch && rawSignature !== 'undefined') {
      console.log('\n⚠️  SIGNATURE MISMATCH DETECTED!');
      console.log('   Possible causes:');
      console.log('   1. The event signature in the contract differs from our expected one');
      console.log('   2. Different parameter types or order');
      console.log('   3. Indexed parameters that moved to topics');
      console.log('   4. Different event name entirely');
      
      // Try to identify what event this might be
      console.log('\n🔬 EVENT IDENTIFICATION ATTEMPTS:');
      
      // Try common variations
      const variations = [
        'Deposit(address indexed sender, uint256 amount, uint256 balance, uint256 availableRewards)',
        'Deposit(uint256 amount, uint256 balance, uint256 availableRewards)',
        'Deposit(address,uint256,uint256,uint256)',
        'Deposit(address indexed,uint256,uint256,uint256)',
      ];
      
      for (const variation of variations) {
        const hash = ethers.id(variation);
        console.log(`   ${variation.substring(0, 50)}... => ${hash}`);
        if (hash === rawSignature) {
          console.log(`   ✅ MATCH FOUND: This is the actual signature!`);
        }
      }
    }
    
    // Try manual decoding with AbiCoder
    console.log('\n🧪 MANUAL DECODING ATTEMPT:');
    
    try {
      const abiCoder = new ethers.AbiCoder();
      
      // Try different decoding strategies
      const decodeStrategies = [
        {
          name: 'Standard Deposit',
          types: ['address', 'uint256', 'uint256', 'uint256'],
          values: log.topics.slice(1),
          data: log.data,
        },
        {
          name: 'Deposit with indexed sender',
          types: ['address indexed', 'uint256', 'uint256', 'uint256'],
          values: log.topics.slice(1),
          data: log.data,
        },
        {
          name: 'Deposit with only data (no topics)',
          types: ['address', 'uint256', 'uint256', 'uint256'],
          values: [],
          data: log.data,
        },
      ];
      
      for (const strategy of decodeStrategies) {
        try {
          console.log(`   Trying: ${strategy.name}`);
          
          // ✅ FIX: Only 2 arguments to decode()
          const dataToDecode = strategy.data || log.data;
          const decoded = abiCoder.decode(strategy.types, dataToDecode);
          
          console.log(`   ✅ Decoded Success: ${strategy.name}`);
          const decodedArr = Array.from(decoded).map(d => d.toString());
          console.log(`   📄 Result: ${JSON.stringify(decodedArr, null, 2)}`);
          break;
        } catch (e: any) {
          // Error is normal if strategy doesn't match, continue loop
          // console.log(`   Failed strategy ${strategy.name}`);
        }
      }
    } catch (e: any) {
      console.log(`   AbiCoder error: ${e.message}`);
    }
    
    // Raw data analysis
    console.log('\n📦 RAW DATA:');
    console.log(`   Data (hex): ${log.data}`);
    console.log(`   Data (hex, 0x prefixed): ${log.data.startsWith('0x') ? log.data : '0x' + log.data}`);
    
    if (log.data !== '0x') {
      try {
        const dataBytes = ethers.getBytes(log.data);
        console.log(`   Data (bytes): [${Array.from(dataBytes).join(', ')}]`);
        console.log(`   Data length: ${dataBytes.length} bytes`);
      } catch (e) {
        console.log(`   Could not parse as bytes`);
      }
    }
    
    // Summary for this log
    console.log('\n' + '-'.repeat(70));
    const logSummary = signatureMatch 
      ? '✅ Standard Deposit event detected'
      : '❓ Unknown event - signature mismatch';
    console.log(`📋 Summary: ${logSummary}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('🔍 SPY MODE SCAN COMPLETE');
  console.log('='.repeat(70));
  console.log('\nIf no events matched the expected signature:');
  console.log('1. Verify the actual event signature in the smart contract source');
  console.log('2. Check if the contract has been upgraded');
  console.log('3. Look for events with different names or parameter counts');
  console.log('4. Consider checking transaction receipts for event signatures');
  console.log('='.repeat(70));
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled rejection:', reason);
  process.exit(1);
});

// Start the spy listener
startSpyListener()
  .then(() => {
    console.log('\n✅ Spy listener scan complete. Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
