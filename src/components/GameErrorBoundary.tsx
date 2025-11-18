'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import ErrorBoundary from './ErrorBoundary'

interface GameErrorFallbackProps {
  error?: Error
  resetError: () => void
}

function GameErrorFallback({ error, resetError }: GameErrorFallbackProps) {
  const handleGoHome = () => {
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="bg-red-900/20 border-red-600/50 max-w-md w-full">
        <CardContent className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="w-12 h-12 text-red-400" />
          </div>
          
          <h2 className="text-xl font-bold text-red-400 mb-2">
            Game Error
          </h2>
          
          <p className="text-red-300 text-sm mb-6">
            The game encountered an error. Your progress has been saved.
          </p>
          
          <div className="space-y-2">
            <Button
              onClick={resetError}
              className="bg-green-600 text-black hover:bg-green-500 w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Resume Game
            </Button>
            
            <Button
              onClick={handleGoHome}
              variant="outline"
              className="border-red-600 text-red-400 hover:bg-red-900/20 w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Home
            </Button>
          </div>
          
          {error && process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-left">
              <summary className="text-red-400 text-sm cursor-pointer hover:text-red-300">
                Debug Info
              </summary>
              <pre className="mt-2 p-2 bg-black/50 rounded text-xs text-red-300 overflow-auto">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface GameErrorBoundaryProps {
  children: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export default function GameErrorBoundary({ children, onError }: GameErrorBoundaryProps) {
  return (
    <ErrorBoundary 
      fallback={GameErrorFallback}
      onError={onError}
    >
      {children}
    </ErrorBoundary>
  )
}