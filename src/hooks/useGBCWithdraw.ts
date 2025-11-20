import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS, GBC_TOKEN_ABI, WITHDRAW_ABI } from '@/lib/web3-config';
import { parseEther } from 'viem';
import type { Address } from 'viem';

/**
 * Hook to manage GBC token withdrawals from game contract
 * Requires signature from backend for verification
 */
export function useGBCWithdraw(address?: Address) {
  // Get player nonce to prevent replay attacks
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

  // Write contract for withdrawing
  const { 
    data: hash, 
    writeContract, 
    isPending,
    error: writeError,
    reset 
  } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    error: confirmError 
  } = useWaitForTransactionReceipt({
    hash,
  });

  /**
   * Initiate withdrawal with backend signature
   * Backend verifies game state and signs transaction
   */
  const initiateWithdrawal = async (amount: string) => {
    try {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      // Request signature from backend
      const response = await fetch('/api/withdrawal/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: address,
          amount,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to initiate withdrawal');
      }

      const data = await response.json();
      return data; // { signature, nonce, finalBalance }
    } catch (err) {
      console.error('Initiate withdrawal error:', err);
      throw err;
    }
  };

  /**
   * Submit withdrawal transaction to contract
   */
  const submitWithdrawal = async (
    amount: string,
    finalBalance: string,
    nonce: number,
    signature: string
  ) => {
    try {
      reset();
      await writeContract({
        address: CONTRACTS.GAME_WITHDRAW,
        abi: WITHDRAW_ABI,
        functionName: 'withdraw',
        args: [
          parseEther(amount),
          parseEther(finalBalance),
          BigInt(nonce),
          signature as `0x${string}`,
        ],
      });
    } catch (err) {
      console.error('Submit withdrawal error:', err);
      throw err;
    }
  };

  /**
   * Complete withdrawal flow: get signature then submit
   */
  const withdraw = async (amount: string) => {
    try {
      // Step 1: Get signature from backend
      const signatureData = await initiateWithdrawal(amount);

      // Step 2: Submit to contract
      await submitWithdrawal(
        amount,
        signatureData.finalBalance,
        signatureData.nonce,
        signatureData.signature
      );

      return {
        success: true,
        hash,
        message: 'Withdrawal submitted',
      };
    } catch (err) {
      console.error('Withdrawal error:', err);
      throw err;
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
    isWithdrawing: isPending || isConfirming,
    isWithdrawConfirmed: isConfirmed,
    hash,
    error: writeError || confirmError,

    // Actions
    initiateWithdrawal,
    submitWithdrawal,
    withdraw,

    // Refresh
    refetch: async () => {
      await refetchNonce();
    },
  };
}

export default useGBCWithdraw;
