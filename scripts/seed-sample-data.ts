import { PrismaClient } from '@prisma/client'
import { GameResult, GameState, MoveType } from '@prisma/client'

const prisma = new PrismaClient()

function generateRandomCard() {
  const suits = ['♠', '♥', '♦', '♣']
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
  const suit = suits[Math.floor(Math.random() * suits.length)]
  const rank = ranks[Math.floor(Math.random() * ranks.length)]!
  
  let value = parseInt(rank)
  if (isNaN(value)) {
    value = rank === 'A' ? 11 : 10
  }
  
  return { suit, rank, value }
}

function generateHand(numCards: number) {
  const cards = []
  let value = 0
  let aces = 0
  
  for (let i = 0; i < numCards; i++) {
    const card = generateRandomCard()
    cards.push(card)
    value += card.value
    if (card.rank === 'A') aces++
  }
  
  // Adjust for aces
  while (value > 21 && aces > 0) {
    value -= 10
    aces--
  }
  
  return {
    cards,
    value,
    isBust: value > 21,
    isBlackjack: numCards === 2 && value === 21,
    aces
  }
}

function generateDeck() {
  const suits = ['♠', '♥', '♦', '♣']
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
  const deck = []
  
  for (const suit of suits) {
    for (const rank of ranks) {
      let value = parseInt(rank)
      if (isNaN(value)) {
        value = rank === 'A' ? 11 : 10
      }
      deck.push({ suit, rank, value })
    }
  }
  
  // Shuffle deck
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  
  return deck
}

async function seedSampleData() {
  console.log('🌱 Starting to seed sample data...')
  
  try {
    // Clean existing data
    await prisma.gameMove.deleteMany()
    await prisma.game.deleteMany()
    await prisma.gameSession.deleteMany()
    await prisma.user.deleteMany()
    console.log('🧹 Cleaned existing data')
    
    // Create user
    const user = await prisma.user.create({
      data: {
        username: 'demo_player',
        email: 'demo@blackjack.com',
        passwordHash: 'demo_hash',
        balance: 1500.0
      }
    })
    console.log('✅ Created demo user')
    
    // Create game sessions
    const sessions = []
    const numSessions = 10
    
    for (let i = 0; i < numSessions; i++) {
      const sessionDate = new Date()
      sessionDate.setHours(sessionDate.getHours() - (i * 24))
      
      const totalGames = Math.floor(Math.random() * 20) + 5
      const totalBet = Math.random() * 300 + 100
      const totalWin = Math.random() * 250 + 50
      const netProfit = totalWin - totalBet
      
      const session = await prisma.gameSession.create({
        data: {
          playerId: user.id,
          startTime: sessionDate,
          endTime: new Date(sessionDate.getTime() + Math.random() * 3600000),
          totalGames,
          totalBet,
          totalWin,
          netProfit,
          stats: {
            handsPlayed: totalGames,
            totalBet,
            totalWin,
            netProfit,
            winRate: totalBet > 0 ? (totalWin / totalBet) * 100 : 0,
            blackjacks: Math.floor(Math.random() * 3),
            busts: Math.floor(Math.random() * 5),
            pushes: Math.floor(Math.random() * 4)
          }
        }
      })
      sessions.push(session)
    }
    console.log(`✅ Created ${numSessions} game sessions`)
    
    // Create games
    let totalGamesCreated = 0
    const results: GameResult[] = ['WIN', 'LOSE', 'PUSH', 'BLACKJACK']
    const resultWeights = [0.42, 0.48, 0.08, 0.02]
    
    for (const session of sessions) {
      const gamesInSession = Math.floor(Math.random() * 15) + 3
      
      for (let i = 0; i < gamesInSession; i++) {
        // Weighted random result
        const random = Math.random()
        let result: GameResult
        let cumulative = 0
        
        for (let j = 0; j < resultWeights.length; j++) {
          cumulative += resultWeights[j]
          if (random <= cumulative) {
            result = results[j]
            break
          }
          result = results[results.length - 1]
        }
        
        const betAmount = Math.random() * 30 + 10 // 10-40 GBC bets
        const gameDate = new Date(session.startTime.getTime() + (i * 300000))
        
        let winAmount = 0
        let netProfit = -betAmount
        
        switch (result) {
          case 'WIN':
            winAmount = betAmount * 2
            netProfit = betAmount
            break
          case 'BLACKJACK':
            winAmount = betAmount * 2.5
            netProfit = betAmount * 1.5
            break
          case 'PUSH':
            winAmount = betAmount
            netProfit = 0
            break
          case 'LOSE':
            winAmount = 0
            netProfit = -betAmount
            break
        }
        
        // Generate hands
        const playerHand = generateHand(Math.floor(Math.random() * 3) + 2)
        const dealerHand = generateHand(Math.floor(Math.random() * 3) + 2)
        
        // Adjust values based on result
        switch (result) {
          case 'BLACKJACK':
            playerHand.value = 21
            playerHand.isBlackjack = true
            playerHand.cards = [
              { suit: '♠', rank: 'A', value: 11 },
              { suit: '♥', rank: 'K', value: 10 }
            ]
            dealerHand.value = Math.floor(Math.random() * 17) + 4
            break
          case 'WIN':
            if (playerHand.value > 21) playerHand.value = 18
            if (dealerHand.value >= playerHand.value && dealerHand.value <= 21) {
              dealerHand.value = playerHand.value - 1
            }
            break
          case 'LOSE':
            if (dealerHand.value > 21) dealerHand.value = 19
            if (playerHand.value >= dealerHand.value && playerHand.value <= 21) {
              playerHand.value = Math.min(dealerHand.value + 1, 22)
              if (playerHand.value > 21) playerHand.isBust = true
            }
            break
          case 'PUSH':
            const pushValue = Math.floor(Math.random() * 8) + 13
            playerHand.value = pushValue
            dealerHand.value = pushValue
            break
        }
        
        const game = await prisma.game.create({
          data: {
            playerId: user.id,
            sessionId: session.id,
            betAmount,
            insuranceBet: 0,
            currentBet: betAmount,
            state: GameState.ENDED,
            playerHand,
            dealerHand,
            deck: generateDeck().slice(0, 30), // Save only first 30 cards
            gameStats: {
              handsPlayed: 1,
              totalBet: betAmount,
              totalWin: winAmount,
              netProfit,
              blackjacks: result === 'BLACKJACK' ? 1 : 0,
              busts: playerHand.isBust ? 1 : 0
            },
            result,
            winAmount,
            netProfit,
            createdAt: gameDate,
            updatedAt: gameDate,
            endedAt: new Date(gameDate.getTime() + Math.random() * 60000)
          }
        })
        
        // Create game moves
        const moves: MoveType[] = ['DEAL']
        if (result !== 'BLACKJACK') {
          moves.push('HIT')
        }
        moves.push('STAND')
        
        for (let j = 0; j < moves.length; j++) {
          await prisma.gameMove.create({
            data: {
              gameId: game.id,
              moveType: moves[j],
              timestamp: new Date(gameDate.getTime() + (j * 3000))
            }
          })
        }
        
        totalGamesCreated++
      }
    }
    
    console.log(`✅ Created ${totalGamesCreated} games`)
    
    // Update user balance
    const gameStats = await prisma.game.aggregate({
      where: { playerId: user.id },
      _sum: { netProfit: true },
      _count: { id: true }
    })
    
    const finalBalance = 1500 + (gameStats._sum.netProfit || 0)
    
    await prisma.user.update({
      where: { id: user.id },
      data: { balance: Math.max(finalBalance, 100) }
    })
    
    console.log(`✅ Updated user balance to ${finalBalance.toFixed(2)} GBC`)
    
    // Create system configs
    try {
      await prisma.systemConfig.create({
        data: {
          key: 'min_bet',
          value: 10,
          description: 'Minimum bet amount in GBC'
        }
      })
    } catch {}
    
    try {
      await prisma.systemConfig.create({
        data: {
          key: 'max_bet',
          value: 500,
          description: 'Maximum bet amount in GBC'
        }
      })
    } catch {}
    
    try {
      await prisma.systemConfig.create({
        data: {
          key: 'blackjack_payout',
          value: 1.5,
          description: 'Blackjack payout multiplier'
        }
      })
    } catch {}
    
    console.log('✅ Created system configurations')
    
    // Create audit logs
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          resource: 'auth',
          ipAddress: '127.0.0.1',
          userAgent: 'BlackJack Game Client'
        }
      })
    } catch {}
    
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'GAME_SESSION_STARTED',
          resource: 'session',
          resourceId: sessions[0]?.id,
          ipAddress: '127.0.0.1',
          userAgent: 'BlackJack Game Client'
        }
      })
    } catch {}
    
    console.log('✅ Created audit logs')
    
    console.log(`\n🎉 Sample data creation completed!`)
    console.log(`📊 Summary:`)
    console.log(`   - User: ${user.username}`)
    console.log(`   - Balance: ${finalBalance.toFixed(2)} GBC`)
    console.log(`   - Sessions: ${numSessions}`)
    console.log(`   - Total Games: ${totalGamesCreated}`)
    console.log(`   - Win Rate: ${((gameStats._count.id || 0) > 0 ? ((await prisma.game.count({ where: { playerId: user.id, result: { in: ['WIN', 'BLACKJACK'] } } })) / gameStats._count.id) * 100 : 0).toFixed(1)}%`)
    
  } catch (error) {
    console.error('❌ Error seeding data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  seedSampleData().catch(console.error)
}

export { seedSampleData }