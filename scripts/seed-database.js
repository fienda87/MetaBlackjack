const { PrismaClient } = require('@prisma/client')

const db = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Clear existing data
  console.log('🧹 Cleaning existing data...')
  await db.auditLog.deleteMany()
  await db.transaction.deleteMany()
  await db.gameMove.deleteMany()
  await db.game.deleteMany()
  await db.gameSession.deleteMany()
  await db.user.deleteMany()
  await db.systemConfig.deleteMany()

  // Setup system configuration
  console.log('⚙️ Setting up system configuration...')
  const configs = [
    {
      key: 'STARTING_BALANCE',
      value: 1000,
      description: 'Starting balance for new users in GBC'
    },
    {
      key: 'MIN_BET',
      value: 0.01,
      description: 'Minimum bet amount in GBC'
    },
    {
      key: 'MAX_BET',
      value: 10,
      description: 'Maximum bet amount in GBC'
    },
    {
      key: 'DAILY_BONUS',
      value: 10,
      description: 'Daily login bonus in GBC'
    }
  ]

  for (const config of configs) {
    await db.systemConfig.create({
      data: config
    })
    console.log(`✅ Created config: ${config.key} = ${config.value}`)
  }

  // Create demo user
  console.log('👤 Creating demo user...')
  const bcrypt = require('bcryptjs')
  const hashedPassword = await bcrypt.hash('demo123', 10)

  const demoUser = await db.user.create({
    data: {
      username: 'demoplayer',
      email: 'demo@blackjack.com',
      passwordHash: hashedPassword,
      balance: 1000,
      startingBalance: 1000,
      isActive: true
    }
  })

  console.log(`✅ Created demo user: ${demoUser.username} with ${demoUser.balance} GBC`)

  // Create signup bonus transaction for demo user
  await db.transaction.create({
    data: {
      userId: demoUser.id,
      type: 'SIGNUP_BONUS',
      amount: 1000,
      description: 'Welcome bonus - 1000 GBC',
      balanceBefore: 0,
      balanceAfter: 1000,
      status: 'COMPLETED',
      metadata: {
        signupDate: new Date().toISOString(),
        isDemoUser: true
      }
    }
  })

  // Create sample game sessions and games
  console.log('🎮 Creating sample game data...')
  
  const gameSession = await db.gameSession.create({
    data: {
      playerId: demoUser.id,
      startTime: new Date(Date.now() - 86400000), // 1 day ago
      endTime: new Date(),
      totalGames: 10,
      totalBet: 5.0,
      totalWin: 7.5,
      netProfit: 2.5,
      stats: {
        winRate: 0.6,
        blackjacks: 2,
        busts: 1,
        surrenders: 0
      }
    }
  })

  // Create sample games
  const gameResults = ['WIN', 'LOSE', 'WIN', 'PUSH', 'BLACKJACK', 'WIN', 'LOSE', 'WIN', 'LOSE', 'PUSH']
  const betAmounts = [0.5, 0.5, 1.0, 0.5, 0.5, 1.0, 0.5, 0.5, 1.0, 0.5]
  const createdGames = []
  
  for (let i = 0; i < 10; i++) {
    const result = gameResults[i]
    const betAmount = betAmounts[i]
    let winAmount = 0
    
    switch (result) {
      case 'WIN':
        winAmount = betAmount
        break
      case 'BLACKJACK':
        winAmount = betAmount * 1.5
        break
      case 'PUSH':
        winAmount = betAmount
        break
      case 'LOSE':
        winAmount = 0
        break
    }

    const game = await db.game.create({
      data: {
        playerId: demoUser.id,
        sessionId: gameSession.id,
        betAmount,
        insuranceBet: 0,
        currentBet: betAmount,
        state: 'ENDED',
        result,
        winAmount,
        netProfit: winAmount - betAmount,
        playerHand: JSON.stringify([
          { suit: 'hearts', rank: 'A', value: 11 },
          { suit: 'spades', rank: '7', value: 7 }
        ]),
        dealerHand: JSON.stringify([
          { suit: 'clubs', rank: 'K', value: 10 },
          { suit: 'diamonds', rank: '9', value: 9 }
        ]),
        deck: JSON.stringify([]),
        gameStats: JSON.stringify({
          playerScore: result === 'BLACKJACK' ? 21 : 18,
          dealerScore: 19,
          duration: Math.floor(Math.random() * 30000) + 10000
        }),
        createdAt: new Date(Date.now() - (86400000 - (i * 3600000))), // Spread over last day
        updatedAt: new Date(Date.now() - (86400000 - (i * 3600000))),
        endedAt: new Date(Date.now() - (86400000 - (i * 3600000)))
      }
    })
    
    createdGames.push(game)
  }

  // Create game moves with valid game IDs
  for (let i = 0; i < createdGames.length; i++) {
    const game = createdGames[i]
    await db.gameMove.create({
      data: {
        gameId: game.id,
        moveType: i % 3 === 0 ? 'HIT' : i % 3 === 1 ? 'STAND' : 'DOUBLE_DOWN',
        timestamp: new Date(Date.now() - (86400000 - (i * 3600000))),
        processingTimeMs: Math.floor(Math.random() * 100) + 50
      }
    })
  }

  // Create audit logs
  console.log('📋 Creating audit logs...')
  await db.auditLog.create({
    data: {
      userId: demoUser.id,
      action: 'USER_REGISTERED',
      resource: 'user',
      resourceId: demoUser.id,
      newValues: {
        username: demoUser.username,
        email: demoUser.email,
        startingBalance: 1000
      }
    }
  })

  await db.auditLog.create({
    data: {
      userId: demoUser.id,
      action: 'CONFIG_UPDATED',
      resource: 'system_config',
      newValues: {
        STARTING_BALANCE: 1000,
        MIN_BET: 0.01,
        MAX_BET: 10
      }
    }
  })

  console.log('✅ Database seeding completed!')
  console.log('')
  console.log('🎰 Demo Account Created:')
  console.log('   Email: demo@blackjack.com')
  console.log('   Password: demo123')
  console.log('   Balance: 1000 GBC')
  console.log('')
  console.log('⚙️ System Configuration:')
  console.log('   Starting Balance: 1000 GBC')
  console.log('   Min Bet: 0.01 GBC')
  console.log('   Max Bet: 10 GBC')
  console.log('   Daily Bonus: 10 GBC')
  console.log('')
  console.log('🚀 You can now start the application with: npm run dev')
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })