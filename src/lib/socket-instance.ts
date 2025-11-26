/**
 * Socket.IO Instance Manager
 * Provides access to Socket.IO instance from API routes
 */

import { Server as SocketIOServer } from 'socket.io'

let socketInstance: SocketIOServer | null = null

/**
 * Set the global socket instance (called from server.ts)
 */
export function setSocketInstance(io: SocketIOServer) {
  socketInstance = io
  console.log('✅ Socket.IO instance set for API routes')
}

/**
 * Get the global socket instance (used in API routes)
 */
export function getSocketInstance(): SocketIOServer | null {
  return socketInstance
}

/**
 * Check if socket instance is available
 */
export function isSocketAvailable(): boolean {
  return socketInstance !== null
}

/**
 * Emit event to all connected clients
 */
export function emitToAll(event: string, data: any) {
  if (!socketInstance) {
    console.warn('⚠️ Socket.IO not available, cannot emit:', event)
    return false
  }
  
  socketInstance.emit(event, data)
  return true
}

/**
 * Emit event to specific room
 */
export function emitToRoom(room: string, event: string, data: any) {
  if (!socketInstance) {
    console.warn('⚠️ Socket.IO not available, cannot emit to room:', room)
    return false
  }
  
  socketInstance.to(room).emit(event, data)
  return true
}

/**
 * Emit blockchain balance update to connected clients
 * Called after deposit/withdraw/faucet transactions are confirmed
 */
export function emitBlockchainBalanceUpdate(
  walletAddress: string,
  type: 'deposit' | 'withdraw' | 'faucet',
  amount: number,
  txHash: string
) {
  const io = getSocketInstance()
  if (!io) {
    console.warn('⚠️ Socket.IO not available, skipping blockchain balance update emit')
    return false
  }

  const data = {
    walletAddress: walletAddress.toLowerCase(),
    type,
    amount: amount.toString(),
    txHash,
    timestamp: Date.now()
  }

  // Broadcast to all connected clients
  io.emit('blockchain:balance-updated', data)
  console.log(`📡 Emitted blockchain:balance-updated for ${walletAddress}: ${type} ${amount} GBC`)
  
  return true
}

/**
 * Emit game balance update (off-chain) to connected clients
 * Called after game balance changes in database
 */
export function emitGameBalanceUpdate(
  walletAddress: string,
  newGameBalance: number
) {
  const io = getSocketInstance()
  if (!io) {
    console.warn('⚠️ Socket.IO not available, skipping game balance update emit')
    return false
  }

  const data = {
    walletAddress: walletAddress.toLowerCase(),
    gameBalance: newGameBalance.toString(),
    timestamp: Date.now()
  }

  // Broadcast to all connected clients
  io.emit('game:balance-updated', data)
  console.log(`🎮 Emitted game:balance-updated for ${walletAddress}: ${newGameBalance} GBC`)
  
  return true
}
