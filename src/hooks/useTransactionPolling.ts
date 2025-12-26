import { useState, useCallback, useRef, useEffect } from 'react';

interface TransactionStatus {
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  newBalance?: number;
  confirmations?: number;
}

interface PollingOptions {
  interval?: number;      // Polling interval in ms (default 3000)
  timeout?: number;       // Max duration before giving up (default 60000)
  onSuccess?: (data: TransactionStatus) => void;
  onFailed?: (error: string) => void;
  onPending?: (data: TransactionStatus) => void;
}

export function useTransactionPolling() {
  const [isPolling, setIsPolling] = useState(false);
  const [currentTxHash, setCurrentTxHash] = useState<string | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, []);
  
  /**
   * Start polling for transaction status
   * Automatically stops on SUCCESS/FAILED or timeout
   */
  const monitorTransaction = useCallback(
    async (txHash: string, options: PollingOptions = {}) => {
      const {
        interval = 3000,      // Poll every 3 seconds
        timeout = 60000,      // 60 second timeout
        onSuccess,
        onFailed,
        onPending
      } = options;
      
      setIsPolling(true);
      setCurrentTxHash(txHash);
      
      const startTime = Date.now();
      
      const pollStatus = async () => {
        if (!isMountedRef.current || !isPolling) return;

        try {
          // Check if timeout reached
          if (Date.now() - startTime > timeout) {
            console.warn(`[TransactionPolling] Timeout reached for ${txHash}`);
            setIsPolling(false);
            onFailed?.('Transaction took too long. Please check status manually.');
            return;
          }
          
          // Call status endpoint
          const response = await fetch(`/api/transaction/status/${txHash}`);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const data: TransactionStatus = await response.json();
          
          console.log(`[TransactionPolling] Status for ${txHash}:`, data.status);
          
          if (!isMountedRef.current) return;

          if (data.status === 'SUCCESS') {
            // ✅ SUCCESS - Stop polling
            setIsPolling(false);
            onSuccess?.(data);
            return;
          } else if (data.status === 'FAILED') {
            // ❌ FAILED - Stop polling
            setIsPolling(false);
            onFailed?.('Transaction failed on blockchain');
            return;
          } else {
            // 🟡 PENDING - Continue polling
            onPending?.(data);
            pollTimerRef.current = setTimeout(pollStatus, interval);
          }
        } catch (error) {
          console.error('[TransactionPolling] Error checking status:', error);
          if (isMountedRef.current) {
            onFailed?.(error instanceof Error ? error.message : 'Failed to check status');
            setIsPolling(false);
          }
        }
      };
      
      // Start first poll immediately
      pollStatus();
    },
    [isPolling]
  );
  
  /**
   * Stop polling manually
   */
  const stopPolling = useCallback(() => {
    setIsPolling(false);
    setCurrentTxHash(null);
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
    }
  }, []);
  
  return {
    isPolling,
    currentTxHash,
    monitorTransaction,
    stopPolling
  };
}
