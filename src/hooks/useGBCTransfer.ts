import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS, GBC_TOKEN_ABI } from '@/lib/web3-config';
import { parseEther } from 'viem';
import type { Address } from 'viem';

/**
 * Hook to transfer GBC tokens to another address
 */
export function useGBCTransfer() {
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

  const transfer = async (to: Address, amount: string) => {
    try {
      await writeContract({
        address: CONTRACTS.GBC_TOKEN,
        abi: GBC_TOKEN_ABI,
        functionName: 'transfer',
        args: [to, parseEther(amount)],
      });
    } catch (err) {
      console.error('Transfer error:', err);
      throw err;
    }
  };

  return {
    transfer,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error: writeError || confirmError,
  };
}

/**
 * Hook to approve GBC token spending
 */
export function useGBCApprove() {
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

  const approve = async (spender: Address, amount: string) => {
    try {
      await writeContract({
        address: CONTRACTS.GBC_TOKEN,
        abi: GBC_TOKEN_ABI,
        functionName: 'approve',
        args: [spender, parseEther(amount)],
      });
    } catch (err) {
      console.error('Approve error:', err);
      throw err;
    }
  };

  return {
    approve,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error: writeError || confirmError,
  };
}

/**
 * Hook to burn GBC tokens (for betting)
 */
export function useGBCBurn() {
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

  const burn = async (amount: string) => {
    try {
      await writeContract({
        address: CONTRACTS.GBC_TOKEN,
        abi: GBC_TOKEN_ABI,
        functionName: 'burnGameLoss',
        args: [parseEther(amount)],
      });
    } catch (err) {
      console.error('Burn error:', err);
      throw err;
    }
  };

  return {
    burn,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error: writeError || confirmError,
  };
}
