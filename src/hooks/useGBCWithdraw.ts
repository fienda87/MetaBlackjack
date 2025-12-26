import { useState } from 'react';
import { useReadContract } from 'wagmi';
import { CONTRACTS, WITHDRAW_ABI } from '@/lib/web3-config';
import type { Address } from 'viem';
import { useTransactionPolling } from './useTransactionPolling';
import { toast } from './use-toast';

/**
 * Hook to manage GBC token withdrawals from game contract
 * Migrated to backend-initiated transactions with HTTP polling
 */
export function useGBCWithdraw(address?: Address) {
  const { monitorTransaction } = useTransactionPolling();

  // Get player nonce
  const { 
    data: playerNonce,
    refetch: refetchNonce 
  } = useReadContract({
    address: CONTRACTS.GAME_WITHDRAW,
    abi: WITHDRAW_ABI,
    functionName: 'getPlayerNonce',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10000,
    },
  });

  // Get contract balance
  const { 
    data: contractBalance 
  } = useReadContract({
    address: CONTRACTS.GAME_WITHDRAW,
    abi: WITHDRAW_ABI,
    functionName: 'getContractBalance',
    query: {
      refetchInterval: 15000,
    },
  });

  // Transaction state managed by polling
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [hash, setHash] = useState<string | null>(null);
  const [isWithdrawConfirmed, setIsWithdrawConfirmed] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Complete withdrawal flow: backend initiates transaction, then poll for status
   */
  const withdraw = async (amount: string) => {
    try {
      if (!address) throw new Error('Wallet not connected');
      setIsWithdrawing(true);
      setIsWithdrawConfirmed(false);
      setError(null);

      // Step 1: Request backend to handle withdrawal
      const response = await fetch('/api/transaction/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          type: 'WITHDRAW',
          amount: amount
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Withdraw request failed');
      }

      const { txHash } = await response.json();
      setHash(txHash);

      // Step 2: Start polling for confirmation
      monitorTransaction(txHash, {
        onSuccess: (data) => {
          setIsWithdrawing(false);
          setIsWithdrawConfirmed(true);
          toast({
            title: 'Withdrawal Successful',
            description: `Successfully withdrawn ${amount} GBC.`,
          });
          refetchNonce();
        },
        onFailed: (err) => {
          setIsWithdrawing(false);
          setError(new Error(err));
          toast({
            title: 'Withdrawal Failed',
            description: err,
            variant: 'destructive',
          });
        }
      });

      return {
        success: true,
        txHash,
        message: 'Withdrawal initiated'
      };
    } catch (err) {
      console.error('Withdrawal error:', err);
      setIsWithdrawing(false);
      const errorObj = err instanceof Error ? err : new Error('Withdrawal failed');
      setError(errorObj);
      throw errorObj;
    }
  };

  // Format balances
  const formattedContractBalance = contractBalance
    ? (Number(contractBalance) / 1e18).toFixed(2)
    : '0.00';

  return {
    // State
    playerNonce: playerNonce ? Number(playerNonce) : 0,
    contractBalance: contractBalance ? contractBalance.toString() : '0',
    formattedContractBalance,

    // Transaction state
    isWithdrawing,
    isWithdrawConfirmed,
    hash,
    error,

    // Actions
    withdraw,

    // Refresh
    refetch: async () => {
      await refetchNonce();
    },
  };
}

export default useGBCWithdraw;
