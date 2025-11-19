// Load Testing Script for MetaBlackjack
// Simulates concurrent users playing blackjack

const io = require('socket.io-client');
const { performance } = require('perf_hooks');

const SERVER_URL = 'http://localhost:3000';
const NUM_USERS = 50; // Number of concurrent users
const TEST_DURATION = 30000; // 30 seconds
const ACTIONS_PER_USER = 20; // Actions each user will perform

class LoadTestMetrics {
  constructor() {
    this.connections = { success: 0, failed: 0 };
    this.actions = { success: 0, failed: 0 };
    this.latencies = [];
    this.errors = [];
    this.startTime = Date.now();
  }

  recordConnection(success) {
    if (success) this.connections.success++;
    else this.connections.failed++;
  }

  recordAction(success, latency) {
    if (success) {
      this.actions.success++;
      this.latencies.push(latency);
    } else {
      this.actions.failed++;
    }
  }

  recordError(error) {
    this.errors.push({ timestamp: Date.now(), error: error.message });
  }

  getReport() {
    const duration = (Date.now() - this.startTime) / 1000;
    const totalActions = this.actions.success + this.actions.failed;
    const avgLatency = this.latencies.length > 0 
      ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length 
      : 0;
    const minLatency = Math.min(...this.latencies);
    const maxLatency = Math.max(...this.latencies);
    const p95Latency = this.getPercentile(95);
    const p99Latency = this.getPercentile(99);
    
    return {
      duration,
      connections: this.connections,
      actions: this.actions,
      totalActions,
      actionsPerSecond: totalActions / duration,
      latency: {
        avg: avgLatency,
        min: minLatency,
        max: maxLatency,
        p95: p95Latency,
        p99: p99Latency
      },
      errors: this.errors.length,
      successRate: totalActions > 0 ? (this.actions.success / totalActions * 100).toFixed(2) : 0
    };
  }

  getPercentile(p) {
    if (this.latencies.length === 0) return 0;
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }
}

class VirtualUser {
  constructor(userId, metrics) {
    this.userId = userId;
    this.metrics = metrics;
    this.socket = null;
    this.balance = 1000;
    this.currentGameId = null;
    this.actionsCompleted = 0;
  }

  async connect() {
    return new Promise((resolve) => {
      this.socket = io(SERVER_URL, {
        transports: ['websocket'],
        reconnection: false
      });

      this.socket.on('connect', () => {
        this.metrics.recordConnection(true);
        this.socket.emit('player:init', {
          playerId: this.userId,
          initialBalance: this.balance
        });
        resolve(true);
      });

      this.socket.on('connect_error', (error) => {
        this.metrics.recordConnection(false);
        this.metrics.recordError(error);
        resolve(false);
      });

      this.socket.on('game:updated', (data) => {
        if (data.game) {
          this.currentGameId = data.game.id;
        }
      });

      this.socket.on('balance:current', (data) => {
        this.balance = data.balance;
      });
    });
  }

  async performAction() {
    if (!this.socket || !this.socket.connected) return false;

    const startTime = performance.now();
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.metrics.recordAction(false, 0);
        resolve(false);
      }, 5000);

      this.socket.once('balance:current', () => {
        clearTimeout(timeout);
        const latency = performance.now() - startTime;
        this.metrics.recordAction(true, latency);
        this.actionsCompleted++;
        resolve(true);
      });

      this.socket.emit('balance:update', { playerId: this.userId });
    });
  }

  async runActions() {
    while (this.actionsCompleted < ACTIONS_PER_USER) {
      await this.performAction();
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
  }
}

async function runLoadTest() {
  console.log('\n⚡ Starting Load Test for MetaBlackjack\n');
  console.log(`📍 Server: ${SERVER_URL}`);
  console.log(`👥 Virtual Users: ${NUM_USERS}`);
  console.log(`⏱️  Duration: ${TEST_DURATION / 1000}s`);
  console.log(`🎯 Actions per User: ${ACTIONS_PER_USER}`);
  console.log(`📊 Total Expected Actions: ${NUM_USERS * ACTIONS_PER_USER}\n`);

  const metrics = new LoadTestMetrics();
  const users = [];

  // Create and connect users
  console.log('🔗 Connecting users...');
  for (let i = 0; i < NUM_USERS; i++) {
    const user = new VirtualUser(`load-test-user-${i}`, metrics);
    users.push(user);
    await user.connect();
    
    if ((i + 1) % 10 === 0) {
      console.log(`   Connected: ${i + 1}/${NUM_USERS}`);
    }
  }

  console.log(`✅ ${metrics.connections.success}/${NUM_USERS} users connected\n`);

  if (metrics.connections.success === 0) {
    console.log('❌ No users connected. Aborting test.\n');
    return;
  }

  // Start load test
  console.log('🚀 Starting load test...\n');
  const testStartTime = Date.now();

  // Run actions for all users concurrently
  const userPromises = users.map(user => user.runActions());
  await Promise.all(userPromises);

  const testDuration = (Date.now() - testStartTime) / 1000;
  console.log(`\n✅ Load test completed in ${testDuration.toFixed(2)}s\n`);

  // Disconnect all users
  users.forEach(user => user.disconnect());

  // Generate report
  const report = metrics.getReport();
  
  console.log('='.repeat(70));
  console.log('📊 LOAD TEST RESULTS');
  console.log('='.repeat(70));
  console.log('\n📡 Connections:');
  console.log(`   ✅ Successful: ${report.connections.success}`);
  console.log(`   ❌ Failed: ${report.connections.failed}`);
  console.log(`   📊 Success Rate: ${(report.connections.success / NUM_USERS * 100).toFixed(1)}%`);
  
  console.log('\n🎮 Actions:');
  console.log(`   ✅ Successful: ${report.actions.success}`);
  console.log(`   ❌ Failed: ${report.actions.failed}`);
  console.log(`   📊 Total: ${report.totalActions}`);
  console.log(`   ⚡ Actions/sec: ${report.actionsPerSecond.toFixed(2)}`);
  console.log(`   📈 Success Rate: ${report.successRate}%`);
  
  console.log('\n⏱️  Latency (ms):');
  console.log(`   📊 Average: ${report.latency.avg.toFixed(2)}ms`);
  console.log(`   ⚡ Min: ${report.latency.min.toFixed(2)}ms`);
  console.log(`   🐌 Max: ${report.latency.max.toFixed(2)}ms`);
  console.log(`   📈 P95: ${report.latency.p95.toFixed(2)}ms`);
  console.log(`   📈 P99: ${report.latency.p99.toFixed(2)}ms`);
  
  if (report.errors > 0) {
    console.log(`\n❌ Errors: ${report.errors}`);
    console.log('   Recent errors:');
    report.errors.slice(0, 5).forEach((err, i) => {
      console.log(`   ${i + 1}. ${err.error}`);
    });
  }
  
  console.log('\n' + '='.repeat(70));
  
  // Performance Assessment
  console.log('\n💡 Performance Assessment:\n');
  
  const assessments = [];
  
  if (report.latency.avg < 50) {
    assessments.push('✅ Excellent latency (<50ms average)');
  } else if (report.latency.avg < 100) {
    assessments.push('✅ Good latency (50-100ms average)');
  } else if (report.latency.avg < 200) {
    assessments.push('⚠️  Acceptable latency (100-200ms average)');
  } else {
    assessments.push('❌ Poor latency (>200ms average) - Optimization needed');
  }
  
  if (report.latency.p95 < 100) {
    assessments.push('✅ P95 latency within target (<100ms)');
  } else {
    assessments.push('⚠️  P95 latency above target (>100ms)');
  }
  
  if (parseFloat(report.successRate) > 95) {
    assessments.push('✅ Excellent success rate (>95%)');
  } else if (parseFloat(report.successRate) > 90) {
    assessments.push('⚠️  Good success rate (>90%)');
  } else {
    assessments.push('❌ Poor success rate (<90%) - Investigation needed');
  }
  
  if (report.connections.success === NUM_USERS) {
    assessments.push('✅ All users connected successfully');
  } else {
    assessments.push('⚠️  Some connection failures detected');
  }
  
  assessments.forEach(assessment => console.log(`   ${assessment}`));
  
  console.log('\n📋 Recommendations:\n');
  
  if (report.latency.avg > 100) {
    console.log('   • Consider implementing request batching');
    console.log('   • Review database query performance');
    console.log('   • Enable Redis caching if not already active');
  }
  
  if (parseFloat(report.successRate) < 95) {
    console.log('   • Investigate error logs for failure patterns');
    console.log('   • Check server resources (CPU, memory)');
    console.log('   • Review timeout configurations');
  }
  
  if (report.connections.failed > 0) {
    console.log('   • Review WebSocket server configuration');
    console.log('   • Check connection limits and timeouts');
  }
  
  if (report.latency.avg < 100 && parseFloat(report.successRate) > 95) {
    console.log('   ✅ System performing well under load!');
    console.log('   ✅ Ready for production deployment');
  }
  
  console.log('\n');
}

// Run load test
runLoadTest().catch(console.error);
