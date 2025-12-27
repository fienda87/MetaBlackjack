/**
 * HTTP POLLING SPY MODE (VERSION: BUILD FIX)
 * Teknik "Nanya Terus" setiap 5 detik. 
 * Fix: Class DepositListener disesuaikan dengan index.ts (.start)
 */
import { ethers } from 'ethers'; 
// @ts-ignore
import { 
  createProvider,
  CONTRACT_ADDRESSES
} from './config.js';

const DEPOSIT_ESCROW_ADDRESS = CONTRACT_ADDRESSES.DEPOSIT_ESCROW;
const EXPECTED_SIGNATURE = 'Deposit(address,uint256,uint256,uint256)';
const EXPECTED_SIGNATURE_HASH = ethers.id(EXPECTED_SIGNATURE);

// Variable tracking
let lastCheckedBlock = 0;
let isScanning = false;

// Fungsi Analisis Log
const analyzeLog = (log: any) => {
    console.log('\n' + '▀'.repeat(50));
    console.log(`🚨 EVENT DETECTED (Block ${log?.blockNumber}) 🚨`);
    console.log('▄'.repeat(50));
    
    const topic0 = log?.topics?.[0];
    console.log(`🔑 Topic Hash: ${topic0}`);

    if (topic0 === EXPECTED_SIGNATURE_HASH) {
        console.log("✅ HASH COCOK! Ini event Deposit.");
    } else {
        console.log("❌ HASH BEDA! Signature event di contract berbeda.");
    }

    console.log("\n🔓 COBA DECODE DATA (HEX):");
    console.log(`📦 Raw Data: ${log.data}`);
    
    const abiCoder = new ethers.AbiCoder();
    try {
        const types = ['address', 'uint256', 'uint256', 'uint256'];
        const decoded = abiCoder.decode(types, log.data);
        const result = Array.from(decoded).map(d => d.toString());
        
        console.log(`   ✅ BERHASIL DECODE:`);
        console.log(`   User: ${result[0]}`);
        console.log(`   Amount: ${result[1]}`);
        console.log(`   Balance: ${result[2]}`);
        console.log(`   Rewards: ${result[3]}`);
    } catch (e: any) {
        console.log("   ⚠️ Decode Standar Gagal.");
    }
    console.log('─'.repeat(50) + '\n');
};

async function startSpyListener() {
  try {
      const provider = createProvider();
      
      let currentBlock = await provider.getBlockNumber();
      lastCheckedBlock = currentBlock - 5; 

      console.log('\n🚜 HTTP POLLING SPY ACTIVATED');
      console.log('💪 Method: Polling 5s (Anti-WebSocket Error)');
      console.log(`📍 Watching: ${DEPOSIT_ESCROW_ADDRESS}`);
      console.log("\n🔴 MENUNGGU DEPOSIT BARU... SILAKAN DEPOSIT SEKARANG!");

      setInterval(async () => {
          if (isScanning) return; 
          isScanning = true;

          try {
              const latestBlock = await provider.getBlockNumber();
              
              if (latestBlock > lastCheckedBlock) {
                  const logs = await provider.getLogs({
                      address: DEPOSIT_ESCROW_ADDRESS,
                      fromBlock: lastCheckedBlock + 1,
                      toBlock: latestBlock
                  });

                  if (logs.length > 0) {
                      logs.forEach((log: any) => analyzeLog(log));
                  }

                  lastCheckedBlock = latestBlock;
              }
          } catch (error: any) {
              const msg = error?.message || "Unknown error";
              console.log("⚠️ Polling error (ignore):", msg);
          } finally {
              isScanning = false;
          }
      }, 5000); 

  } catch (err: any) {
      console.error("FATAL SPY ERROR:", err);
  }
}

// Jalankan Spy
startSpyListener().catch((err) => console.error("Startup Error:", err));

// 👇 FIXED: Method renamed from listen() to start()
export class DepositListener {
    constructor(io: any) {}

    // ✅ METHOD NAME CHANGED: listen() → start()
    // NOW MATCHES index.ts EXPECTATIONS
    public async start() { 
        console.log("⚠️ DepositListener.start() bypassed by HTTP SPY.");
    }
}
