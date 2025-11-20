import { useReadContract } from 'wagmi';
import { CONTRACTS, GBC_TOKEN_ABI } from '@/lib/web3-config';
import type { Address } from 'viem';

/**
 * Hook to get GBC token balance for a specific address
 * @param address - Wallet address to check balance
 * @returns Balance data from wagmi useReadContract
 */
export function useGBCBalance(address?: Address) {
  const result = useReadContract({
    address: CONTRACTS.GBC_TOKEN,
    abi: GBC_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });

  return {
    ...result,
    balance: result.data ? result.data.toString() : '0',
    formatted: result.data 
      ? (Number(result.data) / 1e18).toFixed(2)
      : '0.00',
  };
}

/**
 * Hook to get GBC token details (name, symbol, decimals)
 */
export function useGBCTokenInfo() {
  const name = useReadContract({
    address: CONTRACTS.GBC_TOKEN,
    abi: GBC_TOKEN_ABI,
    functionName: 'name',
  });

  const symbol = useReadContract({
    address: CONTRACTS.GBC_TOKEN,
    abi: GBC_TOKEN_ABI,
    functionName: 'symbol',
  });

  const decimals = useReadContract({
    address: CONTRACTS.GBC_TOKEN,
    abi: GBC_TOKEN_ABI,
    functionName: 'decimals',
  });

  return {
    name: name.data as string | undefined,
    symbol: symbol.data as string | undefined,
    decimals: decimals.data as number | undefined,
    isLoading: name.isLoading || symbol.isLoading || decimals.isLoading,
  };
}
