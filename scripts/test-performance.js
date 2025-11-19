#!/usr/bin/env node

/**
 * Performance Test: HTTP API vs WebSocket
 * Tests game action latency comparison
 */

const io = require('socket.io-client');
const axios = require('axios');

const API_URL = 'http://localhost:3000';
const SOCKET_URL = 'http://localhost:3000';
const TEST_USER_ID = 'test-user-' + Date.now();
const NUM_TESTS = 10;

// Colors for console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatMs(ms) {
  if (ms < 50) return `${colors.green}${ms.toFixed(2)}ms${colors.reset}`;
  if (ms < 100) return `${colors.yellow}${ms.toFixed(2)}ms${colors.reset}`;
  return `${colors.red}${ms.toFixed(2)}ms${colors.reset}`;
}

// Test HTTP API speed
async function testHttpSpeed(gameId, action) {
  const startTime = Date.now();
  
  try {
    await axios.post(`${API_URL}/api/game/action`, {
      gameId,
      action,
      userId: TEST_USER_ID
    });
    
    return Date.now() - startTime;
  } catch (error) {
    console.error('HTTP Error:', error.message);
    return -1;
  }
}

// Test WebSocket speed
async function testWebSocketSpeed(socket, gameId, action) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const timeout = setTimeout(() => {
      reject(new Error('Timeout'));
    }, 5000);
    
    socket.once('game:updated', () => {
      clearTimeout(timeout);
      resolve(Date.now() - startTime);
    });
    
    socket.once('game:error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    
    socket.emit('game:action', {
      gameId,
      action,
      userId: TEST_USER_ID
    });
  });
}

// Main test
async function runPerformanceTest() {
  log('\n🚀 Starting Performance Test: HTTP vs WebSocket\n', 'bright');
  log('═'.repeat(60), 'cyan');
  
  // Connect WebSocket
  log('\n📡 Connecting to WebSocket server...', 'blue');
  const socket = io(SOCKET_URL, {
    transports: ['websocket']
  });
  
  await new Promise((resolve) => {
    socket.on('connect', () => {
      log('✅ WebSocket connected!', 'green');
      resolve();
    });
  });
  
  // Create test game
  log('\n🎮 Creating test game...', 'blue');
  const gameResponse = await axios.post(`${API_URL}/api/game/start`, {
    userId: TEST_USER_ID,
    betAmount: 10
  });
  
  const gameId = gameResponse.data.id;
  log(`✅ Game created: ${gameId}`, 'green');
  
  // Test HTTP API
  log('\n📊 Testing HTTP API (10 requests)...', 'blue');
  const httpTimes = [];
  
  for (let i = 0; i < NUM_TESTS; i++) {
    const time = await testHttpSpeed(gameId, 'hit');
    if (time > 0) {
      httpTimes.push(time);
      log(`   Request ${i + 1}: ${formatMs(time)}`);
    }
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
  }
  
  // Test WebSocket
  log('\n📊 Testing WebSocket (10 requests)...', 'blue');
  const wsTimes = [];
  
  for (let i = 0; i < NUM_TESTS; i++) {
    try {
      const time = await testWebSocketSpeed(socket, gameId, 'hit');
      wsTimes.push(time);
      log(`   Request ${i + 1}: ${formatMs(time)}`);
    } catch (error) {
      log(`   Request ${i + 1}: Error - ${error.message}`, 'red');
    }
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
  }
  
  // Calculate statistics
  const avgHttp = httpTimes.reduce((a, b) => a + b, 0) / httpTimes.length;
  const avgWs = wsTimes.reduce((a, b) => a + b, 0) / wsTimes.length;
  const minHttp = Math.min(...httpTimes);
  const minWs = Math.min(...wsTimes);
  const maxHttp = Math.max(...httpTimes);
  const maxWs = Math.max(...wsTimes);
  const improvement = ((avgHttp - avgWs) / avgHttp * 100).toFixed(1);
  const speedup = (avgHttp / avgWs).toFixed(1);
  
  // Display results
  log('\n' + '═'.repeat(60), 'cyan');
  log('\n📈 RESULTS:\n', 'bright');
  
  log('HTTP API:', 'yellow');
  log(`   Average: ${formatMs(avgHttp)}`);
  log(`   Min: ${formatMs(minHttp)}`);
  log(`   Max: ${formatMs(maxHttp)}\n`);
  
  log('WebSocket:', 'green');
  log(`   Average: ${formatMs(avgWs)}`);
  log(`   Min: ${formatMs(minWs)}`);
  log(`   Max: ${formatMs(maxWs)}\n`);
  
  log('Performance Gain:', 'bright');
  log(`   ${colors.green}${improvement}% faster${colors.reset} (${speedup}x speedup)`);
  log(`   Latency reduced by ${(avgHttp - avgWs).toFixed(2)}ms\n`);
  
  if (avgWs < 50) {
    log('🎉 EXCELLENT! WebSocket latency under 50ms (TARGET ACHIEVED!)\n', 'green');
  } else if (avgWs < 100) {
    log('✅ GOOD! WebSocket latency under 100ms\n', 'yellow');
  } else {
    log('⚠️  WebSocket latency above 100ms - optimization needed\n', 'red');
  }
  
  log('═'.repeat(60) + '\n', 'cyan');
  
  // Cleanup
  socket.disconnect();
  process.exit(0);
}

// Run test
runPerformanceTest().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
