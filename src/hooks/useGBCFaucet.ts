import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS, FAUCET_ABI } from '@/lib/web3-config';
import { parseEther } from 'viem';
import type { Address } from 'viem';

/**
 * Hook to check faucet claim eligibility and claim tokens
 */
export function useGBCFaucet(address?: Address) {
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

  // Write contract for claiming
  const { 
    data: hash, 
    writeContract, 
    isPending,
    error: writeError 
  } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    error: confirmError 
  } = useWaitForTransactionReceipt({
    hash,
  });

  const claim = async () => {
    try {
      await writeContract({
        address: CONTRACTS.GBC_FAUCET,
        abi: FAUCET_ABI,
        functionName: 'claim',
      });
    } catch (err) {
      console.error('Claim error:', err);
      throw err;
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
    isClaiming: isPending || isConfirming,
    isClaimConfirmed: isConfirmed,
    hash,
    error: writeError || confirmError,

    // Actions
    claim,
    refetch: async () => {
      await refetchCanClaim();
      await refetchNextClaimTime();
    },
  };
}

export default useGBCFaucet;
