// WebSocket E2E Testing Script
// Test real-time game actions via Socket.IO

const io = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';
const PLAYER_ID = 'test-player-' + Date.now();
const INITIAL_BALANCE = 1000;

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function log(message, type = 'info') {
  const prefix = type === 'pass' ? '✅' : type === 'fail' ? '❌' : '📋';
  console.log(`${prefix} ${message}`);
}

function recordTest(testName, passed, message) {
  results.tests.push({ testName, passed, message });
  if (passed) {
    results.passed++;
    log(`${testName}: ${message}`, 'pass');
  } else {
    results.failed++;
    log(`${testName}: ${message}`, 'fail');
  }
}

// Test 1: Socket.IO Connection
function testConnection(socket) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      recordTest('Connection Test', false, 'Connection timeout after 5s');
      resolve(false);
    }, 5000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      recordTest('Connection Test', true, `Connected with ID: ${socket.id}`);
      resolve(true);
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      recordTest('Connection Test', false, `Connection error: ${error.message}`);
      resolve(false);
    });
  });
}

// Test 2: Player Initialization
function testPlayerInit(socket) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      recordTest('Player Init Test', false, 'No response after 3s');
      resolve(false);
    }, 3000);

    socket.once('player:initialized', (data) => {
      clearTimeout(timeout);
      if (data.playerId === PLAYER_ID && data.balance === INITIAL_BALANCE) {
        recordTest('Player Init Test', true, `Player initialized: ${data.playerId}, Balance: ${data.balance}`);
        resolve(true);
      } else {
        recordTest('Player Init Test', false, `Unexpected data: ${JSON.stringify(data)}`);
        resolve(false);
      }
    });

    socket.emit('player:init', { playerId: PLAYER_ID, initialBalance: INITIAL_BALANCE });
  });
}

// Test 3: Game Action - Hit (requires active game)
function testGameAction(socket, gameId) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      recordTest('Game Action Test', false, 'No game:updated event after 5s');
      resolve(false);
    }, 5000);

    socket.once('game:updated', (data) => {
      clearTimeout(timeout);
      if (data.game && data.game.id === gameId) {
        recordTest('Game Action Test', true, `Game updated: ${data.game.state}, Cards: ${data.game.playerHand.cards.length}`);
        resolve(true);
      } else {
        recordTest('Game Action Test', false, `Unexpected response: ${JSON.stringify(data)}`);
        resolve(false);
      }
    });

    socket.once('game:error', (error) => {
      clearTimeout(timeout);
      recordTest('Game Action Test', false, `Game error: ${error.error}`);
      resolve(false);
    });

    socket.emit('game:action', {
      gameId: gameId,
      action: 'hit',
      userId: PLAYER_ID
    });
  });
}

// Test 4: Balance Update Event
function testBalanceUpdate(socket) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      recordTest('Balance Update Test', false, 'No balance:current event after 3s');
      resolve(false);
    }, 3000);

    socket.once('balance:current', (data) => {
      clearTimeout(timeout);
      if (data.playerId === PLAYER_ID && typeof data.balance === 'number') {
        recordTest('Balance Update Test', true, `Balance retrieved: ${data.balance} GBC`);
        resolve(true);
      } else {
        recordTest('Balance Update Test', false, `Invalid balance data: ${JSON.stringify(data)}`);
        resolve(false);
      }
    });

    socket.emit('balance:update', { playerId: PLAYER_ID });
  });
}

// Test 5: Error Handling - Invalid Action
function testInvalidAction(socket) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      recordTest('Error Handling Test', false, 'No game:error event after 3s');
      resolve(false);
    }, 3000);

    socket.once('game:error', (error) => {
      clearTimeout(timeout);
      if (error.error && error.code) {
        recordTest('Error Handling Test', true, `Error handled: ${error.error} (${error.code})`);
        resolve(true);
      } else {
        recordTest('Error Handling Test', false, `Invalid error format: ${JSON.stringify(error)}`);
        resolve(false);
      }
    });

    socket.emit('game:action', {
      gameId: 'invalid-game-id',
      action: 'invalid-action',
      userId: PLAYER_ID
    });
  });
}

// Test 6: Latency Test
async function testLatency(socket, iterations = 10) {
  const latencies = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    
    await new Promise((resolve) => {
      socket.once('balance:current', () => {
        const latency = Date.now() - start;
        latencies.push(latency);
        resolve();
      });
      
      socket.emit('balance:update', { playerId: PLAYER_ID });
    });
  }
  
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const maxLatency = Math.max(...latencies);
  const minLatency = Math.min(...latencies);
  
  const passed = avgLatency < 100; // Target: <100ms average
  recordTest('Latency Test', passed, 
    `Avg: ${avgLatency.toFixed(2)}ms, Min: ${minLatency}ms, Max: ${maxLatency}ms (Target: <100ms)`);
  
  return passed;
}

// Main test runner
async function runTests() {
  console.log('\n🧪 Starting WebSocket E2E Tests...\n');
  console.log(`📍 Server: ${SERVER_URL}`);
  console.log(`👤 Player ID: ${PLAYER_ID}\n`);

  const socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 3
  });

  try {
    // Test 1: Connection
    const connected = await testConnection(socket);
    if (!connected) {
      console.log('\n❌ Connection failed. Aborting tests.\n');
      socket.close();
      process.exit(1);
    }

    // Wait a bit for connection to stabilize
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 2: Player Init
    await testPlayerInit(socket);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 3: Balance Update
    await testBalanceUpdate(socket);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 4: Error Handling
    await testInvalidAction(socket);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 5: Latency Test
    console.log('\n📊 Running latency tests (10 iterations)...');
    await testLatency(socket, 10);

    // Print Results
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📊 Total: ${results.tests.length}`);
    console.log(`🎯 Success Rate: ${((results.passed / results.tests.length) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));

    console.log('\n📝 Detailed Results:');
    results.tests.forEach((test, index) => {
      const status = test.passed ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${test.testName}: ${test.message}`);
    });

    // Recommendations
    console.log('\n💡 Recommendations:');
    if (results.failed === 0) {
      console.log('✅ All WebSocket tests passed! Ready for production.');
    } else {
      console.log('⚠️  Some tests failed. Review the errors above.');
    }

    const latencyTest = results.tests.find(t => t.testName === 'Latency Test');
    if (latencyTest && latencyTest.passed) {
      console.log('✅ Latency is within acceptable range (<100ms).');
    } else if (latencyTest) {
      console.log('⚠️  Latency is higher than target. Consider optimization.');
    }

    console.log('\n');

  } catch (error) {
    console.error('\n❌ Test execution error:', error.message);
    results.failed++;
  } finally {
    socket.close();
    process.exit(results.failed > 0 ? 1 : 0);
  }
}

// Run tests
runTests();
