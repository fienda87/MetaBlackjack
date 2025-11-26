/**
 * HTTP Cache utilities - ETags, Cache-Control headers, and 304 responses
 * Phase 2: Reduce API overhead through intelligent caching
 */

import crypto from 'crypto'

/**
 * Generate a strong ETag from response data
 * Uses MD5 hash of serialized content
 */
export function generateETag(data: any): string {
  const content = typeof data === 'string' ? data : JSON.stringify(data)
  const hash = crypto.createHash('md5').update(content).digest('hex')
  return `"${hash}"`
}

/**
 * Cache-Control presets for different response types
 */
export const CACHE_PRESETS = {
  // No caching - always fetch fresh (health checks, auth)
  NO_CACHE: 'no-cache, no-store, must-revalidate',
  
  // Short cache for frequently changing data (balance, active games)
  SHORT: 'public, max-age=30, stale-while-revalidate=60',
  
  // Medium cache for semi-static data (user profile, game history)
  MEDIUM: 'public, max-age=120, stale-while-revalidate=300',
  
  // Long cache for static data (store catalog, stats aggregates)
  LONG: 'public, max-age=600, stale-while-revalidate=1800',
  
  // Private cache for user-specific data
  PRIVATE: 'private, max-age=60, must-revalidate',
} as const

export type CachePreset = keyof typeof CACHE_PRESETS

/**
 * Check if request has matching ETag (for 304 responses)
 */
export function checkETagMatch(requestHeaders: Headers, etag: string): boolean {
  const ifNoneMatch = requestHeaders.get('if-none-match')
  if (!ifNoneMatch) return false
  
  // Handle multiple ETags (comma-separated)
  const requestETags = ifNoneMatch.split(',').map(tag => tag.trim())
  return requestETags.includes(etag) || requestETags.includes('*')
}

/**
 * Check if resource has been modified (for Last-Modified caching)
 */
export function checkIfModifiedSince(
  requestHeaders: Headers,
  lastModified: Date
): boolean {
  const ifModifiedSince = requestHeaders.get('if-modified-since')
  if (!ifModifiedSince) return true // No conditional header, treat as modified
  
  try {
    const requestDate = new Date(ifModifiedSince)
    return lastModified > requestDate
  } catch {
    return true // Invalid date format, treat as modified
  }
}

/**
 * Build cache headers for response
 */
export function buildCacheHeaders(
  preset: CachePreset | string,
  options?: {
    etag?: string
    lastModified?: Date
    vary?: string[]
  }
): Record<string, string> {
  const headers: Record<string, string> = {}
  
  // Set Cache-Control
  const cacheControl = typeof preset === 'string' && preset in CACHE_PRESETS
    ? CACHE_PRESETS[preset as CachePreset]
    : preset
  headers['Cache-Control'] = cacheControl
  
  // Add ETag if provided
  if (options?.etag) {
    headers['ETag'] = options.etag
  }
  
  // Add Last-Modified if provided
  if (options?.lastModified) {
    headers['Last-Modified'] = options.lastModified.toUTCString()
  }
  
  // Add Vary header for content negotiation
  if (options?.vary && options.vary.length > 0) {
    headers['Vary'] = options.vary.join(', ')
  }
  
  return headers
}

/**
 * Create a cached response with appropriate headers
 * Automatically handles 304 Not Modified responses
 */
export function createCachedResponse<T>(
  data: T,
  request: Request,
  options: {
    preset: CachePreset | string
    lastModified?: Date
    vary?: string[]
    generateEtagForData?: boolean
  }
): Response {
  const { preset, lastModified, vary, generateEtagForData = true } = options
  
  // Generate ETag from data
  const etag = generateEtagForData ? generateETag(data) : undefined
  
  // Check if client has matching cached version
  if (etag && checkETagMatch(request.headers, etag)) {
    // Return 304 Not Modified
    return new Response(null, {
      status: 304,
      headers: buildCacheHeaders(preset, { etag, lastModified, vary })
    })
  }
  
  // Check Last-Modified if provided
  if (lastModified && !checkIfModifiedSince(request.headers, lastModified)) {
    // Return 304 Not Modified
    return new Response(null, {
      status: 304,
      headers: buildCacheHeaders(preset, { etag, lastModified, vary })
    })
  }
  
  // Return full response with cache headers
  return Response.json(data, {
    status: 200,
    headers: buildCacheHeaders(preset, { etag, lastModified, vary })
  })
}

/**
 * Wrapper for Next.js API routes with automatic caching
 */
export function withCache<T>(
  handler: (request: Request) => Promise<T>,
  options: {
    preset: CachePreset | string
    vary?: string[]
    skipETag?: boolean
  }
) {
  return async (request: Request) => {
    try {
      const data = await handler(request)
      return createCachedResponse(data, request, {
        preset: options.preset,
        vary: options.vary,
        generateEtagForData: !options.skipETag
      })
    } catch (error) {
      // On error, return without cache headers
      throw error
    }
  }
}
