import { ethers } from 'ethers';

// Multi-URL fallback strategy
// Priority: Custom WSS > PublicNode > DRPC > HTTP fallback
const WSS_URLS = [
  process.env.POLYGON_AMOY_WSS_URL, // Custom (Alchemy/Infura if provided)
  'wss://polygon-amoy-bor-rpc.publicnode.com', // PublicNode (most stable)
  'wss://polygon-amoy.drpc.org', // DRPC (backup)
].filter(Boolean) as string[];

// Fallback to HTTP if all WSS fail
const HTTP_RPC_URL = process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology';

interface ProviderConfig {
  chainId: number;
  name: string;
}

class WebSocketManager {
  private listenerProvider: ethers.WebSocketProvider | ethers.JsonRpcProvider | null = null;
  private urlIndex: number = 0;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 3000; // Start with 3 seconds
  private maxReconnectDelay: number = 30000; // Max 30 seconds
  private config: ProviderConfig;
  private currentUrl: string = '';

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  /**
   * Start WebSocket connection with graceful fallback
   */
  async connect(): Promise<ethers.WebSocketProvider | ethers.JsonRpcProvider> {
    return this.attemptConnection();
  }

  /**
   * Internal: Attempt connection with retry logic
   */
  private async attemptConnection(): Promise<ethers.WebSocketProvider | ethers.JsonRpcProvider> {
    if (this.listenerProvider) {
      console.log('✅ Provider already connected');
      return this.listenerProvider;
    }

    // Try each WSS URL
    for (let i = 0; i < WSS_URLS.length; i++) {
      const url = WSS_URLS[i];
      if (!url) continue;

      try {
        console.log(`🔌 Attempting WebSocket connection (${i + 1}/${WSS_URLS.length}): ${url.substring(0, 50)}...`);
        
        const provider = new ethers.WebSocketProvider(url, this.config);
        
        // Setup event handlers
        this.setupWebSocketHandlers(provider, url);
        
        this.listenerProvider = provider;
        this.currentUrl = url;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 3000; // Reset delay on success
        
        console.log(`✅ WebSocket connected successfully to: ${url.substring(0, 50)}...`);
        return provider;
      } catch (error) {
        console.warn(`⚠️  Failed to connect to ${url.substring(0, 50)}:`, error instanceof Error ? error.message : error);
        continue; // Try next URL
      }
    }

    // All WSS URLs failed, fallback to HTTP
    console.warn('⚠️  All WebSocket URLs failed, falling back to HTTP polling');
    this.currentUrl = HTTP_RPC_URL;
    this.listenerProvider = new ethers.JsonRpcProvider(HTTP_RPC_URL, this.config);
    return this.listenerProvider;
  }

  /**
   * Setup WebSocket event handlers for graceful reconnection
   */
  private setupWebSocketHandlers(provider: ethers.WebSocketProvider, url: string): void {
    const ws = (provider as any).websocket;

    if (!ws) {
      console.warn('⚠️  WebSocket object not available on provider');
      return;
    }

    ws.onopen = () => {
      console.log(`✅ WebSocket OPEN: ${url.substring(0, 50)}...`);
      this.reconnectAttempts = 0;
      this.startKeepAlive();
    };

    ws.onclose = (code: number) => {
      console.warn(`⚠️  WebSocket CLOSED (code: ${code}): ${url.substring(0, 50)}...`);
      this.listenerProvider = null;
      this.stopKeepAlive();
      this.scheduleReconnect();
    };

    ws.onerror = (err: Event) => {
      console.error(`❌ WebSocket ERROR:`, err);
      // Don't do anything here - onclose will handle reconnection
    };
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached. Switching to HTTP polling.');
      this.listenerProvider = new ethers.JsonRpcProvider(HTTP_RPC_URL, this.config);
      this.currentUrl = HTTP_RPC_URL;
      return;
    }

    this.reconnectAttempts++;
    
    // Exponential backoff: 3s, 6s, 12s, ... up to 30s
    const delay = Math.min(
      this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    console.log(`🔄 Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.attemptConnection();
    }, delay);
  }

  /**
   * Keep-alive ping to detect stale connections
   */
  private startKeepAlive(): void {
    this.stopKeepAlive(); // Clear any existing
    
    this.keepAliveInterval = setInterval(() => {
      if (!this.listenerProvider) return;
      
      // Send a simple eth_getBlockNumber call to keep connection alive
      this.listenerProvider.getBlockNumber()
        .catch((err: Error) => {
          console.warn('⚠️  Keep-alive ping failed:', err.message);
          // Connection might be stale, trigger reconnect
          this.listenerProvider = null;
          this.scheduleReconnect();
        });
    }, 30000); // Ping every 30 seconds
  }

  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  /**
   * Get current provider (or wait for connection)
   */
  getProvider(): ethers.WebSocketProvider | ethers.JsonRpcProvider | null {
    return this.listenerProvider;
  }

  /**
   * Disconnect gracefully
   */
  disconnect(): void {
    this.stopKeepAlive();
    if (this.listenerProvider && 'websocket' in this.listenerProvider) {
      const ws = (this.listenerProvider as any).websocket;
      if (ws && ws.close) {
        ws.close();
      }
    }
    this.listenerProvider = null;
  }

  /**
   * Get current status
   */
  getStatus(): {
    connected: boolean;
    urlIndex: number;
    reconnectAttempts: number;
    currentUrl?: string;
  } {
    return {
      connected: !!this.listenerProvider,
      urlIndex: this.urlIndex,
      reconnectAttempts: this.reconnectAttempts,
      currentUrl: this.currentUrl || undefined,
    };
  }
}

// Export singleton
export const webSocketManager = new WebSocketManager({
  chainId: 80002,
  name: 'Polygon Amoy Testnet',
});
