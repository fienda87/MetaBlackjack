'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-black text-green-400 flex items-center justify-center p-4">
      <Card className="bg-black border-green-900/30 max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-red-400">
            Something went wrong!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-green-300">
            An unexpected error occurred. Please try again.
          </p>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="text-left bg-red-900/20 p-3 rounded border border-red-800">
              <p className="text-red-400 text-sm font-mono">
                {error.message}
              </p>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={reset}
              className="bg-blue-600 text-white hover:bg-blue-500 w-full sm:w-auto"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            
            <Link href="/">
              <Button variant="outline" className="border-green-600 text-green-400 hover:bg-green-900/20 w-full sm:w-auto">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}