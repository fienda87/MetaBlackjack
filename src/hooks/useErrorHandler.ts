'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'

interface ErrorHandlerState {
  error: Error | null
  isLoading: boolean
}

export function useErrorHandler() {
  const [state, setState] = useState<ErrorHandlerState>({
    error: null,
    isLoading: false
  })

  const handleError = useCallback((error: Error | string, showToast = true) => {
    const errorObj = typeof error === 'string' ? new Error(error) : error
    
    console.error('Error handled:', errorObj)
    
    setState(prev => ({ ...prev, error: errorObj, isLoading: false }))
    
    if (showToast) {
      toast.error(errorObj.message, {
        description: 'Please try again or contact support if the problem persists.',
        action: {
          label: 'Dismiss',
          onClick: () => {}
        }
      })
    }
    
    return errorObj
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }))
  }, [])

  const executeWithErrorHandling = useCallback(async <T,>(
    asyncFn: () => Promise<T>,
    errorMessage?: string
  ): Promise<T | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const result = await asyncFn()
      setState(prev => ({ ...prev, isLoading: false }))
      return result
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(errorMessage || 'An error occurred')
      handleError(errorObj)
      return null
    }
  }, [handleError])

  return {
    error: state.error,
    isLoading: state.isLoading,
    handleError,
    clearError,
    setLoading,
    executeWithErrorHandling
  }
}

// Game-specific error handler
export function useGameErrorHandler() {
  const { handleError, clearError, executeWithErrorHandling, ...rest } = useErrorHandler()

  const handleGameError = useCallback((error: Error | string, context?: string) => {
    const message = typeof error === 'string' ? error : error.message
    const contextMessage = context ? `[${context}] ${message}` : message
    
    return handleError(new Error(contextMessage))
  }, [handleError])

  const executeGameAction = useCallback(async <T,>(
    actionName: string,
    asyncFn: () => Promise<T>
  ): Promise<T | null> => {
    return executeWithErrorHandling(
      asyncFn,
      `Failed to ${actionName}`
    )
  }, [executeWithErrorHandling])

  return {
    ...rest,
    handleGameError,
    clearError,
    executeGameAction
  }
}