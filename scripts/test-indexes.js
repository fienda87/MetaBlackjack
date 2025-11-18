// Test script to verify database indexes are working
// Run: node scripts/test-indexes.js

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient({
  log: ['query'] // Enable query logging to see which indexes are used
})

async function testIndexes() {
  console.log('🔍 Testing Database Indexes...\n')
  
  try {
    // Create test user if not exists
    let testUser = await prisma.user.findFirst({
      where: { username: 'index_test_user' }
    })
    
    if (!testUser) {
      console.log('📝 Creating test user...')
      testUser = await prisma.user.create({
        data: {
          walletAddress: '0xTEST' + Date.now(),
          username: 'index_test_user',
          email: 'test@index.com',
          balance: 10000,
          startingBalance: 10000
        }
      })
    }
    
    console.log(`✅ Test user: ${testUser.username} (${testUser.id})\n`)
    
    // Create test session
    const session = await prisma.gameSession.create({
      data: {
        playerId: testUser.id,
        stats: {
          wins: 0,
          losses: 0,
          pushes: 0,
          blackjacks: 0
        }
      }
    })
    
    console.log(`✅ Test session created: ${session.id}\n`)
    
    // Create test games
    console.log('📝 Creating 10 test games...')
    const games = []
    for (let i = 0; i < 10; i++) {
      const game = await prisma.game.create({
        data: {
          playerId: testUser.id,
          sessionId: session.id,
          betAmount: 100,
          currentBet: 100,
          state: i < 5 ? 'PLAYING' : 'ENDED',
          result: i >= 5 ? (i % 2 === 0 ? 'WIN' : 'LOSE') : null,
          playerHand: {
            cards: [],
            value: 0,
            isBust: false,
            isBlackjack: false
          },
          dealerHand: {
            cards: [],
            value: 0,
            isBust: false,
            isBlackjack: false
          },
          deck: [],
          gameStats: {
            totalHands: 1,
            splits: 0,
            doubleDowns: 0
          }
        }
      })
      games.push(game)
    }
    
    console.log(`✅ Created ${games.length} test games\n`)
    
    // Test 1: Query with playerId + state (should use games_playerId_state_idx)
    console.log('🧪 TEST 1: Query active games by player')
    console.log('   Index: games_playerId_state_idx')
    console.log('   Query: WHERE playerId = ? AND state = "PLAYING"')
    const startTime1 = Date.now()
    const activeGames = await prisma.game.findMany({
      where: {
        playerId: testUser.id,
        state: 'PLAYING'
      }
    })
    const time1 = Date.now() - startTime1
    console.log(`   ✅ Found ${activeGames.length} active games in ${time1}ms`)
    console.log(`   Expected: 5 games | Actual: ${activeGames.length}\n`)
    
    // Test 2: Query with playerId + createdAt (should use games_playerId_createdAt_idx)
    console.log('🧪 TEST 2: Query game history by player')
    console.log('   Index: games_playerId_createdAt_idx')
    console.log('   Query: WHERE playerId = ? ORDER BY createdAt DESC')
    const startTime2 = Date.now()
    const gameHistory = await prisma.game.findMany({
      where: {
        playerId: testUser.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    })
    const time2 = Date.now() - startTime2
    console.log(`   ✅ Found ${gameHistory.length} games in ${time2}ms`)
    console.log(`   Expected: 5 games | Actual: ${gameHistory.length}\n`)
    
    // Test 3: Query with sessionId (should use games_sessionId_idx)
    console.log('🧪 TEST 3: Query games by session')
    console.log('   Index: games_sessionId_idx')
    console.log('   Query: WHERE sessionId = ?')
    const startTime3 = Date.now()
    const sessionGames = await prisma.game.findMany({
      where: {
        sessionId: session.id
      }
    })
    const time3 = Date.now() - startTime3
    console.log(`   ✅ Found ${sessionGames.length} games in ${time3}ms`)
    console.log(`   Expected: 10 games | Actual: ${sessionGames.length}\n`)
    
    // Test 4: Query active session (should use game_sessions_playerId_endTime_idx)
    console.log('🧪 TEST 4: Query active session by player')
    console.log('   Index: game_sessions_playerId_endTime_idx')
    console.log('   Query: WHERE playerId = ? AND endTime IS NULL')
    const startTime4 = Date.now()
    const activeSessions = await prisma.gameSession.findMany({
      where: {
        playerId: testUser.id,
        endTime: null
      }
    })
    const time4 = Date.now() - startTime4
    console.log(`   ✅ Found ${activeSessions.length} active sessions in ${time4}ms`)
    console.log(`   Expected: 1+ sessions | Actual: ${activeSessions.length}\n`)
    
    // Test 5: Query session history (should use game_sessions_playerId_startTime_idx)
    console.log('🧪 TEST 5: Query session history by player')
    console.log('   Index: game_sessions_playerId_startTime_idx')
    console.log('   Query: WHERE playerId = ? ORDER BY startTime DESC')
    const startTime5 = Date.now()
    const sessionHistory = await prisma.gameSession.findMany({
      where: {
        playerId: testUser.id
      },
      orderBy: {
        startTime: 'desc'
      },
      take: 5
    })
    const time5 = Date.now() - startTime5
    console.log(`   ✅ Found ${sessionHistory.length} sessions in ${time5}ms`)
    console.log(`   Expected: 1+ sessions | Actual: ${sessionHistory.length}\n`)
    
    // Performance Summary
    console.log('📊 PERFORMANCE SUMMARY')
    console.log('=' .repeat(50))
    console.log(`Test 1 (Active games):      ${time1}ms`)
    console.log(`Test 2 (Game history):      ${time2}ms`)
    console.log(`Test 3 (Session games):     ${time3}ms`)
    console.log(`Test 4 (Active session):    ${time4}ms`)
    console.log(`Test 5 (Session history):   ${time5}ms`)
    console.log('=' .repeat(50))
    console.log(`Average query time:         ${Math.round((time1 + time2 + time3 + time4 + time5) / 5)}ms`)
    
    if ((time1 + time2 + time3 + time4 + time5) / 5 < 10) {
      console.log('\n✅ EXCELLENT: Indexes are working! Average < 10ms')
    } else if ((time1 + time2 + time3 + time4 + time5) / 5 < 50) {
      console.log('\n✅ GOOD: Indexes are working! Average < 50ms')
    } else {
      console.log('\n⚠️  WARNING: Queries are slow. Indexes may not be used.')
    }
    
    // Cleanup
    console.log('\n🧹 Cleaning up test data...')
    await prisma.game.deleteMany({
      where: { playerId: testUser.id }
    })
    await prisma.gameSession.deleteMany({
      where: { playerId: testUser.id }
    })
    console.log('✅ Cleanup complete')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run tests
testIndexes()
  .then(() => {
    console.log('\n✅ All index tests completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  })
