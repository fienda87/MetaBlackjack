const { PrismaClient } = require('@prisma/client');

async function initDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    
    console.log('Creating sample user...');
    const user = await prisma.user.upsert({
      where: { email: 'player@example.com' },
      update: {},
      create: {
        email: 'player@example.com',
        name: 'Player One',
        balance: 1000.0,
      },
    });
    
    console.log('Sample user created:', user);
    
    console.log('Creating sample crypto prices...');
    const cryptoPrices = [
      { id: 'btc', currency: 'BTC', priceGBC: 1000000, priceUSD: 45000, change24h: 2.5, volume24h: 1000000 },
      { id: 'eth', currency: 'ETH', priceGBC: 150000, priceUSD: 3000, change24h: -1.2, volume24h: 500000 },
      { id: 'usdt', currency: 'USDT', priceGBC: 1000, priceUSD: 1, change24h: 0, volume24h: 2000000 },
    ];
    
    for (const crypto of cryptoPrices) {
      await prisma.cryptoPrice.upsert({
        where: { id: crypto.id },
        update: crypto,
        create: crypto,
      });
    }
    
    console.log('Sample crypto prices created');
    
    console.log('Database initialized successfully!');
    
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

initDatabase();