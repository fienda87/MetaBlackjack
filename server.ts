// server.ts - Next.js Standalone + Socket.IO + Redis + Blockchain Listeners
import { setupSocket } from './src/lib/socket.js';
import { setSocketInstance } from './src/lib/socket-instance.js';
import { initRedis, getCacheStats, isRedisConnected } from './src/lib/redis.js';
import { initBlockchainListeners } from './blockchain/listeners/index.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { execSync } from 'child_process';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const currentPort = 3000;
const hostname = '0.0.0.0';

// Run Prisma migrations at startup
async function runMigrations() {
  try {
    console.log('🔄 Running Prisma migrations...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Custom server with Socket.IO integration
async function createCustomServer() {
  try {
    // Run migrations first before starting the server
    await runMigrations();

    // Create Next.js app
    const nextApp = next({ 
      dev,
      dir: process.cwd(),
      // In production, use the current directory where .next is located
      conf: dev ? undefined : { distDir: './.next' }
    });

    await nextApp.prepare();
    const handle = nextApp.getRequestHandler();

    // Create HTTP server that will handle both Next.js and Socket.IO
    const server = createServer((req, res) => {
      // Let Socket.IO handle its own requests
      if (req.url?.startsWith('/socket.io')) {
        return;
      }
      handle(req, res);
    });

    // Setup Socket.IO with correct path
    const io = new Server(server, {
      path: '/socket.io',
      cors: {
        origin: "*", // Allow all origins for development/testing
        methods: ["GET", "POST"],
        allowedHeaders: ["content-type"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true
    });

    setupSocket(io);
    
    // Set socket instance for API routes
    setSocketInstance(io);

    // Start the server first
    server.listen(currentPort, hostname, async () => {
      console.log(`> Ready on http://${hostname}:${currentPort}`);
      console.log(`> Socket.IO server running at ws://${hostname}:${currentPort}/socket.io`);
      console.log(`> Environment: ${dev ? 'development' : 'production'}`);
      
      // Try to initialize Redis after server is up (non-blocking)
      try {
        const redis = await initRedis();
        if (redis && isRedisConnected()) {
          const stats = await getCacheStats();
          console.log(`> Redis: ✅ Connected (${stats.totalKeys} keys, ${stats.memory || 'N/A'})`);
          console.log(`> Cache: Hit rate ${stats.hitRate}% (target: >80%)`);
        } else {
          console.log(`> Redis: ⚠️  Not available (using in-memory cache)`);
          console.log(`> Cache: Install Redis for better performance (optional)`);
        }
      } catch {
        console.log(`> Redis: ⚠️  Not available (using in-memory cache)`);
      }

      // Initialize blockchain event listeners (non-blocking)
      try {
        console.log('\n' + '═'.repeat(70));
        await initBlockchainListeners(io);
        console.log('═'.repeat(70) + '\n');
      } catch (error) {
        console.error('\n❌ Failed to start blockchain listeners:', error);
        console.log('⚠️  Server will continue without blockchain event monitoring');
        console.log('   Check RPC_URL and contract addresses in .env\n');
      }
    });

  } catch (err) {
    console.error('Server startup error:', err);
    process.exit(1);
  }
}

// Start the server
createCustomServer();
