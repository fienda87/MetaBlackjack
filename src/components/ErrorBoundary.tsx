'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo })
    
    // Log error to console (in production, send to error tracking service)
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  resetError = () => {
    this.setState({ hasError: false })
  }

  override render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return (
        <FallbackComponent 
          error={this.state.error} 
          resetError={this.resetError} 
        />
      )
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error, resetError }: { error?: Error; resetError: () => void }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="bg-red-900/20 border-red-600/50 max-w-md w-full">
        <CardContent className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="w-12 h-12 text-red-400" />
          </div>
          
          <h2 className="text-xl font-bold text-red-400 mb-2">
            Something went wrong
          </h2>
          
          <p className="text-red-300 text-sm mb-4">
            We encountered an unexpected error. Please try again.
          </p>
          
          {error && (
            <details className="mb-4 text-left">
              <summary className="text-red-400 text-sm cursor-pointer hover:text-red-300">
                Error details
              </summary>
              <pre className="mt-2 p-2 bg-black/50 rounded text-xs text-red-300 overflow-auto">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
          
          <Button
            onClick={resetError}
            className="bg-red-600 text-white hover:bg-red-500 w-full"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// Hook for handling async errors in functional components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const captureError = React.useCallback((error: Error) => {
    console.error('Async error captured:', error)
    setError(error)
  }, [])

  // Throw error to be caught by ErrorBoundary
  if (error) {
    throw error
  }

  return { captureError, resetError }
}

export default ErrorBoundary