// server.ts - Next.js Standalone + Socket.IO + Redis + Blockchain Listeners + BullMQ Workers
import { setupSocket } from './src/lib/socket';
import { setSocketInstance } from './src/lib/socket-instance';
import { initRedis, getCacheStats, isRedisConnected } from './src/lib/redis';
import { initQueue, initWorker, getQueueStats } from './src/lib/queue';
import { initBlockchainListeners } from './blockchain/listeners';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Server } from 'socket.io';
import next from 'next';
import compression from 'compression';

const dev = process.env.NODE_ENV !== 'production';
const currentPort = 3000;
const hostname = '0.0.0.0';

// Custom server with Socket.IO integration
async function createCustomServer() {
  try {
    // Create Next.js app
    const nextApp = next({ 
      dev,
      dir: process.cwd(),
      // In production, use the current directory where .next is located
      conf: dev ? undefined : { distDir: './.next' }
    });

    await nextApp.prepare();
    const handle = nextApp.getRequestHandler();

    // Setup compression middleware (typed for Node.js HTTP server)
    const compressionMiddleware = compression({
      threshold: 1024, // Only compress responses > 1KB
      level: 6, // Balanced compression level (0-9)
      filter: (req: IncomingMessage, res: ServerResponse) => {
        // Don't compress Server-Sent Events or Socket.IO
        if (req.url?.startsWith('/socket.io')) {
          return false;
        }
        // Compress everything else
        return true;
      }
    });

    // Create HTTP server that will handle both Next.js and Socket.IO
    const server = createServer((req, res) => {
      // Let Socket.IO handle its own requests (no compression)
      if (req.url?.startsWith('/socket.io')) {
        return;
      }
      
      // Apply compression middleware for all other requests
      // Type cast needed because compression expects Express-style req/res
      compressionMiddleware(req as any, res as any, () => {
        handle(req, res);
      });
    });

    // Setup Socket.IO with correct path and compression
    const io = new Server(server, {
      path: '/socket.io',
      cors: {
        origin: ["http://localhost:3000", "http://127.0.0.1:3000", "http://0.0.0.0:3000"],
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true,
      // Enable WebSocket compression for reduced payload sizes
      perMessageDeflate: {
        threshold: 1024, // Only compress messages > 1KB
        zlibDeflateOptions: {
          level: 6, // Balanced compression level
        },
      },
      // HTTP compression for polling transport
      httpCompression: {
        threshold: 1024,
        chunkSize: 8 * 1024,
        windowBits: 15,
        level: 6,
      },
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

          // Initialize BullMQ queue and worker (requires Redis)
          try {
            await initQueue();
            await initWorker();
            const queueStats = await getQueueStats();
            console.log(`> Queue: ✅ Initialized (${queueStats.waiting} waiting, ${queueStats.active} active)`);
          } catch (error) {
            console.error('> Queue: ⚠️  Failed to initialize:', error);
          }
        } else {
          console.log(`> Redis: ⚠️  Not available (using in-memory cache)`);
          console.log(`> Cache: Install Redis for better performance (optional)`);
          console.log(`> Queue: ⚠️  Disabled (requires Redis)`);
        }
      } catch {
        console.log(`> Redis: ⚠️  Not available (using in-memory cache)`);
        console.log(`> Queue: ⚠️  Disabled (requires Redis)`);
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
