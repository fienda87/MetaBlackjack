const { PrismaClient } = require('@prisma/client');

async function addSampleGames() {
  const db = new PrismaClient();
  
  try {
    console.log('Adding sample game data...');
    
    // Get or create user
    let user = await db.user.findFirst();
    if (!user) {
      user = await db.user.create({
        data: {
          email: 'player@example.com',
          name: 'Player One',
          balance: 1000
        }
      });
    }
    
    // Create a session
    const session = await db.gameSession.create({
      data: {
        userId: user.id,
        handsPlayed: 0,
        totalBet: 0,
        result: 0,
        winRate: 0,
        duration: 30,
        blackjacks: 0,
        busts: 0,
        isCompleted: false
      }
    });
    
    // Sample game data
    const sampleGames = [
      {
        playerHand: ['♠A', '♠K'],
        dealerHand: ['♠6', '♠Q'],
        playerValue: 21,
        dealerValue: 16,
        betAmount: 0.5,
        result: 'blackjack',
        winAmount: 0.75,
        isBlackjack: true,
        isBust: false,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      },
      {
        playerHand: ['♥7', '♦9'],
        dealerHand: ['♠8', '♠K'],
        playerValue: 16,
        dealerValue: 18,
        betAmount: 0.3,
        result: 'lose',
        winAmount: 0,
        isBlackjack: false,
        isBust: false,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) // 4 days ago
      },
      {
        playerHand: ['♣10', '♦8'],
        dealerHand: ['♠9', '♦7'],
        playerValue: 18,
        dealerValue: 16,
        betAmount: 0.2,
        result: 'win',
        winAmount: 0.4,
        isBlackjack: false,
        isBust: false,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      },
      {
        playerHand: ['♠5', '♥K', '♦Q'],
        dealerHand: ['♠10', '♠6'],
        playerValue: 25,
        dealerValue: 16,
        betAmount: 0.4,
        result: 'lose',
        winAmount: 0,
        isBlackjack: false,
        isBust: true,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      {
        playerHand: ['♦9', '♣9'],
        dealerHand: ['♠8', '♥10'],
        playerValue: 18,
        dealerValue: 18,
        betAmount: 0.25,
        result: 'push',
        winAmount: 0.25,
        isBlackjack: false,
        isBust: false,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        playerHand: ['♠A', '♦5', '♣5'],
        dealerHand: ['♠K', '♠9'],
        playerValue: 21,
        dealerValue: 19,
        betAmount: 0.6,
        result: 'win',
        winAmount: 1.2,
        isBlackjack: false,
        isBust: false,
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
      },
      {
        playerHand: ['♥K', '♥Q'],
        dealerHand: ['♠A', '♠9'],
        playerValue: 20,
        dealerValue: 20,
        betAmount: 0.35,
        result: 'push',
        winAmount: 0.35,
        isBlackjack: false,
        isBust: false,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
      },
      {
        playerHand: ['♣A', '♠J'],
        dealerHand: ['♥K', '♥8'],
        playerValue: 21,
        dealerValue: 18,
        betAmount: 0.5,
        result: 'blackjack',
        winAmount: 0.75,
        isBlackjack: true,
        isBust: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },
      {
        playerHand: ['♠7', '♥5', '♦9'],
        dealerHand: ['♠10', '♠6'],
        playerValue: 21,
        dealerValue: 16,
        betAmount: 0.3,
        result: 'win',
        winAmount: 0.6,
        isBlackjack: false,
        isBust: false,
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
      },
      {
        playerHand: ['♦8', '♣8'],
        dealerHand: ['♠J', '♠5'],
        playerValue: 16,
        dealerValue: 15,
        betAmount: 0.4,
        result: 'win',
        winAmount: 0.8,
        isBlackjack: false,
        isBust: false,
        createdAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      }
    ];
    
    // Insert sample games
    for (const game of sampleGames) {
      await db.gameRound.create({
        data: {
          sessionId: session.id,
          playerHand: JSON.stringify([game.playerHand]),
          dealerHand: JSON.stringify([game.dealerHand]),
          playerValue: game.playerValue,
          dealerValue: game.dealerValue,
          betAmount: game.betAmount,
          result: game.result,
          winAmount: game.winAmount,
          isBlackjack: game.isBlackjack,
          isBust: game.isBust,
          createdAt: game.createdAt
        }
      });
    }
    
    // Update session statistics
    const allRounds = await db.gameRound.findMany({
      where: { sessionId: session.id }
    });
    
    const wins = allRounds.filter(r => r.result === 'win' || r.result === 'blackjack').length;
    const totalHands = allRounds.length;
    const totalBet = allRounds.reduce((sum, r) => sum + r.betAmount, 0);
    const totalResult = allRounds.reduce((sum, r) => sum + r.winAmount - r.betAmount, 0);
    const blackjacks = allRounds.filter(r => r.isBlackjack).length;
    const busts = allRounds.filter(r => r.isBust).length;
    
    await db.gameSession.update({
      where: { id: session.id },
      data: {
        handsPlayed: totalHands,
        totalBet,
        result: totalResult,
        winRate: totalHands > 0 ? (wins / totalHands) * 100 : 0,
        blackjacks,
        busts
      }
    });
    
    console.log(`Added ${sampleGames.length} sample games successfully!`);
    console.log(`Session stats: ${totalHands} hands, ${(wins/totalHands*100).toFixed(1)}% win rate, ${totalResult.toFixed(2)} GBC net result`);
    
  } catch (error) {
    console.error('Error adding sample games:', error);
  } finally {
    await db.$disconnect();
  }
}

addSampleGames();