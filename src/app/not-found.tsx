'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, RefreshCw } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-green-400 flex items-center justify-center p-4">
      <Card className="bg-black border-green-900/30 max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-green-400">
            404 - Page Not Found
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-green-300">
            Oops! The page you're looking for doesn't exist.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/">
              <Button className="bg-green-600 text-black hover:bg-green-500 w-full sm:w-auto">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </Link>
            
            <Button 
              variant="outline" 
              onClick={() => window.history.back()}
              className="border-green-600 text-green-400 hover:bg-green-900/20 w-full sm:w-auto"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}