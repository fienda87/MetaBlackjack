import { db as prisma } from './db';
import { ethers } from 'ethers';

export interface TransactionRequest {
  userId: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'FAUCET';
  amount: string;
  txHash?: string; // For DEPOSIT, user provides hash
}

/**
 * Step 1: Create transaction record
 * For WITHDRAW/FAUCET: Send transaction on-chain, get txHash
 * For DEPOSIT: Validate txHash format
 */
export async function createTransaction(req: TransactionRequest) {
  const { userId, type, amount, txHash: userProvidedHash } = req;
  
  let txHash: string;
  
  if (type === 'DEPOSIT') {
    // Validate format (user provides hash)
    if (!userProvidedHash || !userProvidedHash.startsWith('0x')) {
      throw new Error('Invalid transaction hash format');
    }
    txHash = userProvidedHash;
  } else if (type === 'WITHDRAW' || type === 'FAUCET') {
    // Server sends transaction on-chain
    txHash = await sendBlockchainTransaction(userId, type, amount);
  } else {
    throw new Error('Invalid transaction type');
  }
  
  // Save to database with PENDING status
  // Note: balanceBefore/After di-set 0 dulu, nanti diupdate saat SUCCESS
  const transaction = await prisma.transaction.create({
    data: {
      userId,
      txHash,
      type,
      amount,
      status: 'PENDING', // Hanya satu status!
      balanceBefore: 0,
      balanceAfter: 0,
      description: `${type} request`
    }
  });
  
  return {
    success: true,
    txHash,
    message: 'Transaction processing'
  };
}

/**
 * Step 2: Poll blockchain for status updates
 * Check transaction receipt, update status if confirmed
 */
export async function checkTransactionStatus(txHash: string) {
  // Find transaction in database
  const transaction = await prisma.transaction.findUnique({
    where: { txHash },
    include: { user: true }
  });
  
  if (!transaction) {
    throw new Error('Transaction not found');
  }
  
  // If already final (SUCCESS/FAILED), return immediately
  if (transaction.status !== 'PENDING') {
    return {
      status: transaction.status,
      newBalance: transaction.user.balance,
      confirmations: transaction.confirmations
    };
  }
  
  // Check blockchain for receipt
  const provider = new ethers.JsonRpcProvider(process.env.POLYGON_AMOY_RPC_URL);
  const receipt = await provider.getTransactionReceipt(txHash);
  
  if (!receipt) {
    // Transaction not yet included in a block
    return {
      status: 'PENDING',
      newBalance: transaction.user.balance,
      confirmations: 0
    };
  }
  
  // Calculate confirmations
  const currentBlock = await provider.getBlockNumber();
  const confirmations = currentBlock - receipt.blockNumber;
  
  // Check if successful
  if (receipt.status === 1 && confirmations >= 1) {
    // SUCCESS! Update database
    await updateTransactionSuccess(transaction, receipt, confirmations);
    
    // Fetch updated user to get new balance
    const updatedUser = await prisma.user.findUnique({
      where: { id: transaction.userId }
    });

    return {
      status: 'SUCCESS',
      newBalance: updatedUser?.balance || transaction.user.balance,
      confirmations
    };
  } else if (receipt.status === 0) {
    // FAILED! Update database
    await updateTransactionFailed(transaction, 'Transaction reverted');
    
    return {
      status: 'FAILED',
      newBalance: transaction.user.balance,
      confirmations
    };
  }
  
  // Still pending, update confirmations
  await prisma.transaction.update({
    where: { txHash },
    data: { confirmations }
  });
  
  return {
    status: 'PENDING',
    newBalance: transaction.user.balance,
    confirmations
  };
}

/**
 * Internal: Send blockchain transaction (WITHDRAW/FAUCET)
 * Only backend can call this
 */
async function sendBlockchainTransaction(
  userId: string,
  type: 'WITHDRAW' | 'FAUCET',
  amount: string
): Promise<string> {
  // Get user wallet address from database
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');
  
  // Backend signer (from private key in env)
  const provider = new ethers.JsonRpcProvider(process.env.POLYGON_AMOY_RPC_URL);
  const signer = new ethers.Wallet(process.env.BACKEND_PRIVATE_KEY!, provider);
  
  // Send transaction based on type
  let tx;
  const amountWei = ethers.parseEther(amount);
  
  if (type === 'WITHDRAW') {
    // Send to GameWithdraw contract
    const contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_WITHDRAW_ADDRESS!,
      ['function withdraw(uint256 amount) external'],
      signer
    );
    tx = await contract.withdraw(amountWei);
  } else if (type === 'FAUCET') {
    // Send to GBCFaucet contract
    const contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_FAUCET_ADDRESS!,
      ['function claim() external'],
      signer
    );
    tx = await contract.claim();
  } else {
    throw new Error('Invalid transaction type for blockchain');
  }
  
  return tx.hash;
}

/**
 * Internal: Update user balance and transaction status on success
 */
async function updateTransactionSuccess(
  transaction: any,
  receipt: any,
  confirmations: number
) {
  // Parse amount string to number for Float balance
  const amountValue = parseFloat(transaction.amount);

  await prisma.$transaction([
    // Update user balance
    prisma.user.update({
      where: { id: transaction.userId },
      data: {
        balance: {
          increment: transaction.type === 'DEPOSIT' ? amountValue : -amountValue
        },
        // Also update totalDeposited/Withdrawn if applicable
        ...(transaction.type === 'DEPOSIT' ? { totalDeposited: { increment: amountValue } } : {}),
        ...(transaction.type === 'WITHDRAW' ? { totalWithdrawn: { increment: amountValue } } : {})
      }
    }),
    // Update transaction status
    prisma.transaction.update({
      where: { txHash: transaction.txHash },
      data: {
        status: 'SUCCESS', // Hanya satu status!
        blockNumber: receipt.blockNumber,
        confirmations,
        balanceAfter: transaction.type === 'DEPOSIT' ? transaction.user.balance + amountValue : transaction.user.balance
      }
    })
  ]);
}

/**
 * Internal: Mark transaction as failed
 */
async function updateTransactionFailed(transaction: any, error: string) {
  await prisma.transaction.update({
    where: { txHash: transaction.txHash },
    data: {
      status: 'FAILED',
      errorMessage: error
    }
  });
}
