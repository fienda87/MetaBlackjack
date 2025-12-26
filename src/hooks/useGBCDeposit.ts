import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS, GBC_TOKEN_ABI, DEPOSIT_ESCROW_ABI } from '@/lib/web3-config';
import { parseEther } from 'viem';
import type { Address } from 'viem';
import { useTransactionPolling } from './useTransactionPolling.js';
import { toast } from './use-toast.js';

interface DepositState {
  approvalHash?: string;
  depositHash?: string;
  isApproving: boolean;
  isApprovalConfirmed: boolean;
  isDepositing: boolean;
  isDepositConfirmed: boolean;
  error?: Error;
}

/**
 * Hook to manage GBC token deposits to escrow contract
 */
export function useGBCDeposit(address?: Address) {
  const { monitorTransaction } = useTransactionPolling();

  // Get current allowance
  const { 
    data: allowance,
    refetch: refetchAllowance 
  } = useReadContract({
    address: CONTRACTS.GBC_TOKEN,
    abi: GBC_TOKEN_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.DEPOSIT_ESCROW] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 5000,
    },
  });

  // Get escrow balance
  const { 
    data: escrowBalance,
    refetch: refetchEscrowBalance 
  } = useReadContract({
    address: CONTRACTS.DEPOSIT_ESCROW,
    abi: DEPOSIT_ESCROW_ABI,
    functionName: 'getBalance',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10000,
    },
  });

  // Approve tokens
  const { 
    data: approvalHash, 
    writeContract: writeApprove, 
    isPending: isApprovePending,
    error: approveError,
    reset: resetApprove 
  } = useWriteContract();

  const { 
    isLoading: isApprovalConfirming, 
    isSuccess: isApprovalConfirmed,
    error: approvalConfirmError 
  } = useWaitForTransactionReceipt({
    hash: approvalHash,
  });

  // Deposit tokens
  const { 
    data: depositHash, 
    writeContract: writeDeposit, 
    writeContractAsync: writeDepositAsync,
    isPending: isDepositPending,
    error: depositError,
    reset: resetDeposit 
  } = useWriteContract();

  const { 
    isLoading: isDepositConfirming, 
    isSuccess: isDepositConfirmed,
    error: depositConfirmError 
  } = useWaitForTransactionReceipt({
    hash: depositHash,
  });

  const approve = async (amount: string) => {
    try {
      resetApprove();
      await writeApprove({
        address: CONTRACTS.GBC_TOKEN,
        abi: GBC_TOKEN_ABI,
        functionName: 'approve',
        args: [CONTRACTS.DEPOSIT_ESCROW, parseEther(amount)],
      });
    } catch (err) {
      console.error('Approve error:', err);
      throw err;
    }
  };

  const deposit = async (amount: string) => {
    try {
      if (!address) throw new Error('Wallet not connected');
      resetDeposit();
      
      const txHash = await writeDepositAsync({
        address: CONTRACTS.DEPOSIT_ESCROW,
        abi: DEPOSIT_ESCROW_ABI,
        functionName: 'deposit',
        args: [parseEther(amount)],
      });

      console.log('[Deposit] Transaction sent:', txHash);

      // Notify backend and start polling
      const response = await fetch('/api/transaction/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          type: 'DEPOSIT',
          amount: amount,
          txHash
        })
      });

      if (!response.ok) throw new Error('Failed to register deposit with backend');

      // Start polling for confirmation
      monitorTransaction(txHash, {
        onSuccess: (data) => {
          console.log('[Deposit] Success:', data);
          toast({
            title: 'Deposit Successful',
            description: `Successfully deposited ${amount} GBC.`,
          });
          refetchEscrowBalance();
        },
        onFailed: (error) => {
          console.error('[Deposit] Failed:', error);
          toast({
            title: 'Deposit Failed',
            description: error,
            variant: 'destructive',
          });
        }
      });

      return txHash;
    } catch (err) {
      console.error('Deposit error:', err);
      throw err;
    }
  };

  // Format balances
  const formattedAllowance = allowance
    ? (Number(allowance) / 1e18).toFixed(2)
    : '0.00';

  const formattedEscrowBalance = escrowBalance
    ? (Number(escrowBalance) / 1e18).toFixed(2)
    : '0.00';

  return {
    // State - Approve
    allowance: allowance ? BigInt(allowance.toString()) : 0n,
    formattedAllowance,
    isApproving: isApprovePending || isApprovalConfirming,
    isApprovalConfirmed,
    approvalHash,
    approvalError: approveError || approvalConfirmError,

    // State - Deposit
    escrowBalance: escrowBalance ? BigInt(escrowBalance.toString()) : 0n,
    formattedEscrowBalance,
    isDepositing: isDepositPending || isDepositConfirming,
    isDepositConfirmed,
    depositHash,
    depositError: depositError || depositConfirmError,

    // Actions
    approve,
    deposit,

    // Refresh
    refetchAllowance,
    refetchEscrowBalance,
  };
}

export default useGBCDeposit;
