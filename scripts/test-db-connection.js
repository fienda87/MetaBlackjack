/**
 * Test database connection speed and reliability
 * Run with: node scripts/test-db-connection.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function testConnection() {
  console.log('🔍 Testing database connection...\n');
  
  try {
    // Test 1: Basic connection
    console.log('[Test 1] Basic Connection Test');
    const start1 = Date.now();
    await prisma.$connect();
    const duration1 = Date.now() - start1;
    console.log(`✅ Connected in ${duration1}ms\n`);
    
    // Test 2: Simple query
    console.log('[Test 2] Simple Query Test');
    const start2 = Date.now();
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    const duration2 = Date.now() - start2;
    console.log(`✅ Query executed in ${duration2}ms`);
    console.log(`   Result:`, result, '\n');
    
    // Test 3: User count query
    console.log('[Test 3] User Count Query');
    const start3 = Date.now();
    const userCount = await prisma.user.count();
    const duration3 = Date.now() - start3;
    console.log(`✅ User count query in ${duration3}ms`);
    console.log(`   Users found: ${userCount}\n`);
    
    // Test 4: User fetch with select (optimized)
    console.log('[Test 4] Optimized User Query');
    const start4 = Date.now();
    const users = await prisma.user.findMany({
      take: 5,
      select: { id: true, username: true, balance: true }
    });
    const duration4 = Date.now() - start4;
    console.log(`✅ Optimized user query in ${duration4}ms`);
    console.log(`   Users found: ${users.length}\n`);
    
    // Test 5: Game query
    console.log('[Test 5] Game Query Test');
    const start5 = Date.now();
    const gameCount = await prisma.game.count();
    const duration5 = Date.now() - start5;
    console.log(`✅ Game count query in ${duration5}ms`);
    console.log(`   Games found: ${gameCount}\n`);
    
    // Test 6: Concurrent queries (parallel)
    console.log('[Test 6] Parallel Queries Test');
    const start6 = Date.now();
    const [users2, games, sessions] = await Promise.all([
      prisma.user.count(),
      prisma.game.count(),
      prisma.gameSession.count()
    ]);
    const duration6 = Date.now() - start6;
    console.log(`✅ Parallel queries in ${duration6}ms`);
    console.log(`   Users: ${users2}, Games: ${games}, Sessions: ${sessions}\n`);
    
    // Summary
    console.log('📊 Performance Summary:');
    console.log(`   - Connection: ${duration1}ms`);
    console.log(`   - Simple query: ${duration2}ms`);
    console.log(`   - User count: ${duration3}ms`);
    console.log(`   - Optimized fetch: ${duration4}ms`);
    console.log(`   - Game count: ${duration5}ms`);
    console.log(`   - Parallel queries: ${duration6}ms`);
    
    const avgTime = Math.round((duration1 + duration2 + duration3 + duration4 + duration5 + duration6) / 6);
    console.log(`   - Average: ${avgTime}ms\n`);
    
    if (avgTime < 100) {
      console.log('✅ Database performance: EXCELLENT (<100ms)');
    } else if (avgTime < 500) {
      console.log('⚠️  Database performance: ACCEPTABLE (100-500ms)');
    } else {
      console.log('❌ Database performance: POOR (>500ms)');
      console.log('   Consider checking:');
      console.log('   - Network latency to Supabase');
      console.log('   - Database indexes');
      console.log('   - Connection pooling settings');
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    console.error('\nPossible issues:');
    console.error('   - DATABASE_URL not set correctly in .env');
    console.error('   - Supabase project is paused or unavailable');
    console.error('   - Network connectivity issues');
    console.error('   - Invalid credentials');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('\n✅ Test completed, connection closed.');
  }
}

testConnection();
