// Comprehensive error handling system
'use client'

import { useState, useEffect, useCallback } from 'react'

export enum ErrorType {
  NETWORK_ERROR = 'network_error',
  WALLET_ERROR = 'wallet_error',
  CONTRACT_ERROR = 'contract_error',
  VALIDATION_ERROR = 'validation_error',
  USER_ERROR = 'user_error',
  SYSTEM_ERROR = 'system_error',
  UNKNOWN_ERROR = 'unknown_error'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface AppError {
  id: string
  type: ErrorType
  severity: ErrorSeverity
  message: string
  userMessage: string
  technicalMessage?: string
  timestamp: number
  retryable: boolean
  retryCount?: number
  maxRetries?: number
  context?: Record<string, any>
  code?: string
  stack?: string
}

export interface ErrorContext {
  componentStack?: string
  useErrorBoundary?: boolean
  userAgent?: string
  url?: string
  walletAddress?: string
  networkId?: number
  [key: string]: any
}

export class ErrorHandler {
  private static instance: ErrorHandler
  private errors: AppError[] = []
  private maxErrors = 100
  private listeners: ((error: AppError) => void)[] = []

  private constructor() {
    // Setup global error handlers
    if (typeof window !== 'undefined') {
      window.addEventListener('error', this.handleGlobalError.bind(this))
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this))
    }
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  handleError(error: Error | string, context?: ErrorContext): AppError {
    const appError = this.createError(error, context)
    this.addError(appError)
    this.notifyListeners(appError)
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('App Error:', appError)
    }

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logToService(appError)
    }

    return appError
  }

  private createError(error: Error | string, context?: ErrorContext): AppError {
    const timestamp = Date.now()
    const errorId = `error_${timestamp}_${Math.random().toString(36).substr(2, 9)}`

    if (typeof error === 'string') {
      return {
        id: errorId,
        type: ErrorType.USER_ERROR,
        severity: ErrorSeverity.MEDIUM,
        message: error,
        userMessage: error,
        timestamp,
        retryable: false,
        context
      }
    }

    // Determine error type and severity
    const { type, severity, userMessage, retryable } = this.categorizeError(error)
    
    return {
      id: errorId,
      type,
      severity,
      message: error.message,
      userMessage: userMessage || error.message,
      technicalMessage: error.message,
      timestamp,
      retryable,
      stack: error.stack,
      context
    }
  }

  private categorizeError(error: Error): {
    type: ErrorType
    severity: ErrorSeverity
    userMessage?: string
    retryable: boolean
  } {
    const message = error.message.toLowerCase()

    // Network errors
    if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
      return {
        type: ErrorType.NETWORK_ERROR,
        severity: ErrorSeverity.MEDIUM,
        userMessage: 'Network connection issue. Please check your internet connection.',
        retryable: true
      }
    }

    // Wallet errors
    if (message.includes('wallet') || message.includes('metamask') || message.includes('provider')) {
      return {
        type: ErrorType.WALLET_ERROR,
        severity: ErrorSeverity.HIGH,
        userMessage: 'Wallet connection issue. Please ensure MetaMask is installed and unlocked.',
        retryable: true
      }
    }

    // Contract errors
    if (message.includes('contract') || message.includes('transaction') || message.includes('gas')) {
      return {
        type: ErrorType.CONTRACT_ERROR,
        severity: ErrorSeverity.HIGH,
        userMessage: 'Transaction failed. Please check your balance and try again.',
        retryable: true
      }
    }

    // Validation errors
    if (message.includes('invalid') || message.includes('validation') || message.includes('required')) {
      return {
        type: ErrorType.VALIDATION_ERROR,
        severity: ErrorSeverity.LOW,
        userMessage: 'Invalid input. Please check your entries and try again.',
        retryable: false
      }
    }

    // Default
    return {
      type: ErrorType.UNKNOWN_ERROR,
      severity: ErrorSeverity.MEDIUM,
      userMessage: 'An unexpected error occurred. Please try again.',
      retryable: true
    }
  }

  private addError(error: AppError): void {
    this.errors.unshift(error)
    
    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors)
    }
  }

  private notifyListeners(error: AppError): void {
    this.listeners.forEach(listener => {
      try {
        listener(error)
      } catch (err) {
        console.error('Error in error listener:', err)
      }
    })
  }

  private handleGlobalError(event: ErrorEvent): void {
    this.handleError(event.error || new Error(event.message), {
      url: event.filename,
      line: event.lineno,
      column: event.colno,
      userAgent: navigator.userAgent
    })
  }

  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    this.handleError(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      {
        unhandledRejection: true,
        userAgent: navigator.userAgent
      }
    )
  }

  private async logToService(error: AppError): Promise<void> {
    try {
      // In production, you would send this to your error tracking service
      // like Sentry, LogRocket, or a custom endpoint
      console.log('Error logged to service:', error.id)
    } catch (err) {
      console.error('Failed to log error to service:', err)
    }
  }

  // Public API
  getErrors(): AppError[] {
    return [...this.errors]
  }

  getErrorsByType(type: ErrorType): AppError[] {
    return this.errors.filter(error => error.type === type)
  }

  getErrorsBySeverity(severity: ErrorSeverity): AppError[] {
    return this.errors.filter(error => error.severity === severity)
  }

  clearErrors(): void {
    this.errors = []
  }

  clearError(id: string): void {
    this.errors = this.errors.filter(error => error.id !== id)
  }

  addListener(listener: (error: AppError) => void): () => void {
    this.listeners.push(listener)
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  retryError(id: string): boolean {
    const error = this.errors.find(e => e.id === id)
    if (!error || !error.retryable) return false

    if (error.maxRetries && error.retryCount! >= error.maxRetries) {
      return false
    }

    error.retryCount = (error.retryCount || 0) + 1
    return true
  }
}

// Convenience functions
export const handleError = (error: Error | string, context?: ErrorContext): AppError => {
  return ErrorHandler.getInstance().handleError(error, context)
}

export const getErrors = (): AppError[] => {
  return ErrorHandler.getInstance().getErrors()
}

export const clearErrors = (): void => {
  ErrorHandler.getInstance().clearErrors()
}

// React hook for error handling
export const useErrorHandler = () => {
  const [errors, setErrors] = useState<AppError[]>([])

  useEffect(() => {
    const unsubscribe = ErrorHandler.getInstance().addListener((error) => {
      setErrors(prev => [error, ...prev.slice(0, 9)]) // Keep only 10 most recent
    })

    return unsubscribe
  }, [])

  const handleError = useCallback((error: Error | string, context?: ErrorContext) => {
    return ErrorHandler.getInstance().handleError(error, context)
  }, [])

  const clearError = useCallback((id: string) => {
    ErrorHandler.getInstance().clearError(id)
    setErrors(prev => prev.filter(e => e.id !== id))
  }, [])

  const clearAllErrors = useCallback(() => {
    ErrorHandler.getInstance().clearErrors()
    setErrors([])
  }, [])

  return {
    errors,
    handleError,
    clearError,
    clearAllErrors
  }
}