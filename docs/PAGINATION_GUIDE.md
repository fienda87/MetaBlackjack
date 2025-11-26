# Pagination Guide - Phase 1 DB Tuning

## 📖 Overview

This guide explains how to use the new pagination utilities introduced in Phase 1 DB tuning. All list endpoints must enforce pagination with a maximum limit of 100 items to prevent performance issues.

## 🚀 Quick Start

### Basic Offset Pagination

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { 
  parsePaginationParams, 
  buildPaginationResponse, 
  buildPrismaOffsetParams 
} from '@/lib/pagination'

export async function GET(request: NextRequest) {
  // 1. Parse pagination parameters from query string
  const { searchParams } = new URL(request.url)
  const { page, limit } = parsePaginationParams(searchParams)
  
  // 2. Build Prisma query params
  const { skip, take } = buildPrismaOffsetParams(page, limit)
  
  // 3. Fetch data and count in parallel
  const [items, total] = await Promise.all([
    db.model.findMany({
      where: { /* your filters */ },
      skip,
      take,
      orderBy: { createdAt: 'desc' }
    }),
    db.model.count({ where: { /* same filters */ } })
  ])
  
  // 4. Build response with pagination metadata
  return NextResponse.json({
    success: true,
    ...buildPaginationResponse(items, page, limit, total)
  })
}
```

### Cursor-Based Pagination

```typescript
import { 
  buildCursorPaginationResponse,
  buildPrismaCursorParams
} from '@/lib/pagination'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const { cursor, limit } = parsePaginationParams(searchParams)
  
  // Build cursor params for Prisma
  const cursorParams = buildPrismaCursorParams(cursor, limit)
  
  // Fetch data
  const items = await db.model.findMany({
    where: { /* your filters */ },
    ...cursorParams,
    orderBy: { createdAt: 'desc' }
  })
  
  // Build response
  return NextResponse.json({
    success: true,
    ...buildCursorPaginationResponse(items, limit)
  })
}
```

## 📚 API Reference

### `parsePaginationParams(searchParams)`

Parses and validates pagination parameters from URLSearchParams.

**Parameters:**
- `searchParams: URLSearchParams` - URL query parameters

**Returns:**
```typescript
{
  page: number,      // Defaults to 1, minimum 1
  limit: number,     // Defaults to 20, max 100
  cursor?: string    // Optional cursor for cursor-based pagination
}
```

**Query Parameters:**
- `?page=1` - Page number (offset pagination)
- `?limit=20` - Items per page (max 100)
- `?cursor=xyz` - Cursor ID (cursor pagination)

**Examples:**
```typescript
// Default values
parsePaginationParams(new URLSearchParams())
// Returns: { page: 1, limit: 20 }

// Custom values
parsePaginationParams(new URLSearchParams('?page=2&limit=50'))
// Returns: { page: 2, limit: 50 }

// Enforces maximum
parsePaginationParams(new URLSearchParams('?limit=200'))
// Returns: { page: 1, limit: 100 }

// With cursor
parsePaginationParams(new URLSearchParams('?cursor=abc123&limit=30'))
// Returns: { page: 1, limit: 30, cursor: 'abc123' }
```

---

### `buildPaginationResponse(data, page, limit, total)`

Builds an offset pagination response with metadata.

**Parameters:**
- `data: T[]` - Array of items
- `page: number` - Current page
- `limit: number` - Items per page
- `total: number` - Total items count

**Returns:**
```typescript
{
  data: T[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number,
    hasMore: boolean
  }
}
```

**Example:**
```typescript
const users = [/* ... */]
const response = buildPaginationResponse(users, 1, 20, 150)

// Response:
{
  data: [...],
  pagination: {
    page: 1,
    limit: 20,
    total: 150,
    totalPages: 8,
    hasMore: true
  }
}
```

---

### `buildCursorPaginationResponse(data, limit)`

Builds a cursor-based pagination response.

**Parameters:**
- `data: T[]` - Array of items (must have `id` field)
- `limit: number` - Items per page

**Returns:**
```typescript
{
  data: T[],
  pagination: {
    limit: number,
    nextCursor?: string,
    hasMore: boolean
  }
}
```

**Example:**
```typescript
const items = [
  { id: 'a1', name: 'Item 1' },
  { id: 'a2', name: 'Item 2' },
  // ... 20 items
]
const response = buildCursorPaginationResponse(items, 20)

// Response:
{
  data: [...],
  pagination: {
    limit: 20,
    nextCursor: 'a2',  // Last item's ID
    hasMore: true
  }
}
```

---

### `buildPrismaOffsetParams(page, limit)`

Builds Prisma query parameters for offset pagination.

**Parameters:**
- `page: number` - Current page
- `limit: number` - Items per page

**Returns:**
```typescript
{
  skip: number,
  take: number
}
```

**Example:**
```typescript
const { skip, take } = buildPrismaOffsetParams(2, 20)
// Returns: { skip: 20, take: 20 }

await db.user.findMany({
  skip,    // Skip first 20 items
  take     // Take next 20 items
})
```

---

### `buildPrismaCursorParams(cursor, limit)`

Builds Prisma query parameters for cursor-based pagination.

**Parameters:**
- `cursor: string | undefined` - Cursor ID
- `limit: number` - Items per page

**Returns:**
```typescript
{
  take: number,
  skip?: number,
  cursor?: { id: string }
}
```

**Example:**
```typescript
// First page (no cursor)
const params = buildPrismaCursorParams(undefined, 20)
// Returns: { take: 20 }

// Next page (with cursor)
const params = buildPrismaCursorParams('xyz123', 20)
// Returns: { take: 20, skip: 1, cursor: { id: 'xyz123' } }

await db.user.findMany({
  ...params,
  orderBy: { createdAt: 'desc' }
})
```

---

## 🎯 Best Practices

### 1. Always Use Parallel Queries

```typescript
// ✅ Good - Parallel
const [items, total] = await Promise.all([
  db.model.findMany({ skip, take }),
  db.model.count()
])

// ❌ Bad - Sequential
const items = await db.model.findMany({ skip, take })
const total = await db.model.count()
```

### 2. Enforce Maximum Limit

```typescript
// ✅ Good - parsePaginationParams enforces max 100
const { limit } = parsePaginationParams(searchParams)

// ❌ Bad - No limit enforcement
const limit = parseInt(searchParams.get('limit') || '20')
```

### 3. Use Consistent Response Format

```typescript
// ✅ Good - Standard pagination response
return NextResponse.json({
  success: true,
  ...buildPaginationResponse(items, page, limit, total)
})

// ❌ Bad - Custom format
return NextResponse.json({
  items,
  count: total,
  currentPage: page
})
```

### 4. Order Results for Consistency

```typescript
// ✅ Good - Explicit ordering
db.model.findMany({
  orderBy: { createdAt: 'desc' },
  skip,
  take
})

// ❌ Bad - No ordering (non-deterministic)
db.model.findMany({ skip, take })
```

### 5. Use Same Filters for Count

```typescript
// ✅ Good - Same WHERE clause
const where = { status: 'active', userId }
const [items, total] = await Promise.all([
  db.model.findMany({ where, skip, take }),
  db.model.count({ where })
])

// ❌ Bad - Different filters
const items = await db.model.findMany({ where: { status: 'active' }, skip, take })
const total = await db.model.count()  // Wrong count!
```

---

## 🔍 Examples

### Example 1: User List with Search

```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const { page, limit } = parsePaginationParams(searchParams)
  const search = searchParams.get('search') || ''
  
  const where = search ? {
    OR: [
      { username: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ]
  } : {}
  
  const { skip, take } = buildPrismaOffsetParams(page, limit)
  
  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    }),
    db.user.count({ where })
  ])
  
  return NextResponse.json({
    success: true,
    ...buildPaginationResponse(users, page, limit, total)
  })
}
```

### Example 2: Transaction History

```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const { page, limit } = parsePaginationParams(searchParams)
  const userId = searchParams.get('userId')
  const status = searchParams.get('status')
  
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }
  
  const where = {
    userId,
    ...(status && { status: status as TransactionStatus })
  }
  
  const { skip, take } = buildPrismaOffsetParams(page, limit)
  
  const [transactions, total] = await Promise.all([
    db.transaction.findMany({
      where,
      select: {
        id: true,
        type: true,
        amount: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    }),
    db.transaction.count({ where })
  ])
  
  return NextResponse.json({
    success: true,
    ...buildPaginationResponse(transactions, page, limit, total)
  })
}
```

### Example 3: Cursor-Based Feed

```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const { cursor, limit } = parsePaginationParams(searchParams)
  
  const cursorParams = buildPrismaCursorParams(cursor, limit)
  
  const items = await db.post.findMany({
    ...cursorParams,
    where: { published: true },
    select: {
      id: true,
      title: true,
      content: true,
      createdAt: true,
      author: {
        select: { id: true, username: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
  
  return NextResponse.json({
    success: true,
    ...buildCursorPaginationResponse(items, limit)
  })
}
```

---

## 📊 Frontend Integration

### React Hook Example

```typescript
import { useState, useEffect } from 'react'

interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

function usePagination<T>(url: string, initialPage = 1, initialLimit = 20) {
  const [data, setData] = useState<T[]>([])
  const [page, setPage] = useState(initialPage)
  const [limit] = useState(initialLimit)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const response = await fetch(`${url}?page=${page}&limit=${limit}`)
        const result: PaginatedResponse<T> = await response.json()
        setData(result.data)
        setTotal(result.pagination.total)
      } catch (error) {
        console.error('Fetch error:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [url, page, limit])
  
  return {
    data,
    page,
    total,
    loading,
    setPage,
    hasNext: page * limit < total,
    hasPrev: page > 1
  }
}
```

### Usage in Component

```tsx
function UserList() {
  const { data, page, total, loading, setPage, hasNext, hasPrev } = 
    usePagination<User>('/api/users', 1, 20)
  
  if (loading) return <div>Loading...</div>
  
  return (
    <div>
      <ul>
        {data.map(user => (
          <li key={user.id}>{user.username}</li>
        ))}
      </ul>
      
      <div>
        <button disabled={!hasPrev} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <span>Page {page} of {Math.ceil(total / 20)}</span>
        <button disabled={!hasNext} onClick={() => setPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  )
}
```

---

## 🎓 When to Use Offset vs Cursor

### Offset Pagination

**Use when:**
- ✅ You need page numbers (Page 1, 2, 3...)
- ✅ Users need random access to pages
- ✅ Data is relatively stable
- ✅ You need total count

**Example:** User management, transaction history, admin dashboards

### Cursor Pagination

**Use when:**
- ✅ Data changes frequently (feeds, real-time updates)
- ✅ Infinite scroll UI
- ✅ Performance is critical (very large datasets)
- ✅ Don't need total count

**Example:** Social media feeds, activity streams, logs

---

## ✅ Checklist for New Endpoints

When creating a new list endpoint:

- [ ] Import pagination utilities
- [ ] Use `parsePaginationParams()` to get page/limit
- [ ] Build Prisma params with `buildPrismaOffsetParams()` or `buildPrismaCursorParams()`
- [ ] Fetch data and count in parallel with `Promise.all()`
- [ ] Use explicit `select` clause (no SELECT *)
- [ ] Add `orderBy` for consistent results
- [ ] Build response with `buildPaginationResponse()` or `buildCursorPaginationResponse()`
- [ ] Test with various page/limit values
- [ ] Test edge cases (page 0, limit 1000, empty results)
- [ ] Document endpoint in API docs

---

## 📞 Support

For questions or issues with pagination:
1. Check this guide
2. Review example implementations in `/api/users/route.ts`
3. See `src/lib/pagination.ts` for implementation details
4. Consult `PHASE1_DB_TUNING_SUMMARY.md` for context

---

**Last Updated:** November 26, 2025 (Phase 1 DB Tuning)
