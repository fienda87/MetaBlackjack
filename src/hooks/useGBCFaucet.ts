import { useState } from 'react';
import { useReadContract } from 'wagmi';
import { CONTRACTS, FAUCET_ABI } from '@/lib/web3-config';
import type { Address } from 'viem';
import { useTransactionPolling } from './useTransactionPolling';
import { toast } from './use-toast';

/**
 * Hook to check faucet claim eligibility and claim tokens
 * Migrated to backend-initiated transactions with HTTP polling
 */
export function useGBCFaucet(address?: Address) {
  const { monitorTransaction } = useTransactionPolling();

  // Check if user can claim
  const { 
    data: canClaimData, 
    isLoading: isCheckingClaim,
    refetch: refetchCanClaim 
  } = useReadContract({
    address: CONTRACTS.GBC_FAUCET,
    abi: FAUCET_ABI,
    functionName: 'canClaim',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Get claim amount
  const { data: claimAmount } = useReadContract({
    address: CONTRACTS.GBC_FAUCET,
    abi: FAUCET_ABI,
    functionName: 'CLAIM_AMOUNT',
  });

  // Get next claim time
  const { 
    data: nextClaimTime, 
    refetch: refetchNextClaimTime 
  } = useReadContract({
    address: CONTRACTS.GBC_FAUCET,
    abi: FAUCET_ABI,
    functionName: 'getNextClaimTime',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Transaction state managed by polling
  const [isClaiming, setIsClaiming] = useState(false);
  const [hash, setHash] = useState<string | null>(null);
  const [isClaimConfirmed, setIsClaimConfirmed] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const claim = async () => {
    try {
      if (!address) throw new Error('Wallet not connected');
      setIsClaiming(true);
      setIsClaimConfirmed(false);
      setError(null);

      // Step 1: Request backend to handle claim
      const response = await fetch('/api/transaction/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          type: 'FAUCET',
          amount: '100' // Faucet amount is constant 100 GBC
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Claim request failed');
      }

      const { txHash } = await response.json();
      setHash(txHash);

      // Step 2: Start polling for confirmation
      monitorTransaction(txHash, {
        onSuccess: (data) => {
          setIsClaiming(false);
          setIsClaimConfirmed(true);
          toast({
            title: 'Claim Successful',
            description: `Successfully claimed 100 GBC.`,
          });
          refetchCanClaim();
          refetchNextClaimTime();
        },
        onFailed: (err) => {
          setIsClaiming(false);
          setError(new Error(err));
          toast({
            title: 'Claim Failed',
            description: err,
            variant: 'destructive',
          });
        }
      });

      return {
        success: true,
        txHash,
        message: 'Claim initiated'
      };
    } catch (err) {
      console.error('Claim error:', err);
      setIsClaiming(false);
      const errorObj = err instanceof Error ? err : new Error('Claim failed');
      setError(errorObj);
      throw errorObj;
    }
  };

  // Format claim amount for display
  const formattedClaimAmount = claimAmount 
    ? (Number(claimAmount) / 1e18).toFixed(0)
    : '0';

  // Calculate time until next claim
  const timeUntilNextClaim = nextClaimTime 
    ? Math.max(0, Number(nextClaimTime) - Math.floor(Date.now() / 1000))
    : 0;

  const nextClaimDate = nextClaimTime 
    ? new Date(Number(nextClaimTime) * 1000)
    : null;

  return {
    // State
    canClaim: canClaimData === true,
    isCheckingClaim,
    claimAmount: claimAmount ? claimAmount.toString() : '0',
    formattedClaimAmount,
    nextClaimTime: nextClaimTime ? Number(nextClaimTime) : 0,
    timeUntilNextClaim,
    nextClaimDate,

    // Transaction state
    isClaiming,
    isClaimConfirmed,
    hash,
    error,

    // Actions
    claim,
    refetch: async () => {
      await refetchCanClaim();
      await refetchNextClaimTime();
    },
  };
}

export default useGBCFaucet;
