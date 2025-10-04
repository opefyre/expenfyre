'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { authenticatedFetch } from '@/lib/auth'

// Types
interface FetchState<T> {
  data: T | null
  loading: boolean
  error: string | null
  lastFetched: number | null
}

interface FetchOptions {
  enabled?: boolean
  staleTime?: number
  cacheTime?: number
  retry?: boolean
  retryDelay?: number
  maxRetries?: number
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  promise?: Promise<T>
}

// Global cache to prevent duplicate requests
const globalCache = new Map<string, CacheEntry<any>>()
const activeRequests = new Map<string, Promise<any>>()

// Default options
const DEFAULT_OPTIONS: Required<FetchOptions> = {
  enabled: true,
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
  retry: true,
  retryDelay: 1000,
  maxRetries: 3
}

// Utility functions
const isStale = (timestamp: number, staleTime: number): boolean => {
  return Date.now() - timestamp > staleTime
}

const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Main hook
export function useDataFetching<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: FetchOptions = {}
) {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: false,
    error: null,
    lastFetched: null
  })

  const mountedRef = useRef(true)
  const fetchCountRef = useRef(0)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Fetch function with caching and deduplication
  const fetchData = useCallback(async (force = false): Promise<T | null> => {
    if (!opts.enabled) return null

    const cacheKey = key
    const cached = globalCache.get(cacheKey)
    
    // Return cached data if fresh and not forcing
    if (!force && cached && !isStale(cached.timestamp, opts.staleTime)) {
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          data: cached.data,
          error: null,
          lastFetched: cached.timestamp
        }))
      }
      return cached.data
    }

    // Check if request is already in progress
    const activeRequest = activeRequests.get(cacheKey)
    if (activeRequest) {
      try {
        const result = await activeRequest
        return result
      } catch (error) {
        // Let the original request handle the error
        throw error
      }
    }

    // Start new request
    const requestId = `${cacheKey}-${++fetchCountRef.current}`
    const requestPromise = performFetch()
    activeRequests.set(cacheKey, requestPromise)

    try {
      const result = await requestPromise
      
      // Store in cache
      globalCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      })

      // Update state if component is still mounted
      if (mountedRef.current) {
        setState({
          data: result,
          loading: false,
          error: null,
          lastFetched: Date.now()
        })
      }

      return result
    } catch (error) {
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }))
      }
      throw error
    } finally {
      activeRequests.delete(cacheKey)
    }
  }, [key, fetcher, opts.enabled, opts.staleTime])

  // Perform the actual fetch with retry logic
  const performFetch = async (): Promise<T> => {
    let lastError: Error

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      try {
        if (mountedRef.current) {
          setState(prev => ({ ...prev, loading: true, error: null }))
        }

        const result = await fetcher()
        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        if (attempt === opts.maxRetries) {
          throw lastError
        }

        // Wait before retry
        await sleep(opts.retryDelay * Math.pow(2, attempt))
      }
    }

    throw lastError!
  }

  // Initial fetch
  useEffect(() => {
    if (opts.enabled) {
      fetchData()
    }
  }, [key, opts.enabled]) // Only depend on key and enabled

  // Cleanup old cache entries
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now()
      for (const [cacheKey, entry] of globalCache.entries()) {
        if (now - entry.timestamp > opts.cacheTime) {
          globalCache.delete(cacheKey)
        }
      }
    }

    const interval = setInterval(cleanup, 60000) // Clean every minute
    return () => clearInterval(interval)
  }, [opts.cacheTime])

  return {
    ...state,
    refetch: () => fetchData(true),
    invalidate: () => {
      globalCache.delete(key)
      activeRequests.delete(key)
    }
  }
}

// Specialized hooks for different data types
export function useExpenses(filters?: Record<string, any>, options: FetchOptions = {}) {
  return useDataFetching(
    `expenses-${JSON.stringify(filters || {})}`,
    async () => {
      const params = new URLSearchParams()
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value))
          }
        })
      }
      // Use reasonable default limit
      params.append('limit', '100')
      
      const response = await authenticatedFetch(`/api/expenses?${params.toString()}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch expenses: ${response.status}`)
      }
      
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch expenses')
      }
      
      return data.data || []
    },
    {
      staleTime: 2 * 60 * 1000, // 2 minutes for expenses
      cacheTime: 5 * 60 * 1000, // 5 minutes cache
      ...options
    }
  )
}

export function useBudgets(filters?: Record<string, any>, options: FetchOptions = {}) {
  return useDataFetching(
    `budgets-${JSON.stringify(filters || {})}`,
    async () => {
      const params = new URLSearchParams()
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value))
          }
        })
      }
      
      const response = await authenticatedFetch(`/api/budgets?${params.toString()}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch budgets: ${response.status}`)
      }
      
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch budgets')
      }
      
      return data.data || []
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes for budgets
      cacheTime: 10 * 60 * 1000, // 10 minutes cache
      ...options
    }
  )
}

export function useCategories(options: FetchOptions = {}) {
  return useDataFetching(
    'categories',
    async () => {
      const response = await authenticatedFetch('/api/categories')
      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.status}`)
      }
      
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch categories')
      }
      
      return data.data || []
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes for categories
      cacheTime: 30 * 60 * 1000, // 30 minutes cache
      ...options
    }
  )
}

// Cache management utilities
export const cacheUtils = {
  clear: () => {
    globalCache.clear()
    activeRequests.clear()
  },
  
  clearByPattern: (pattern: string) => {
    for (const key of globalCache.keys()) {
      if (key.includes(pattern)) {
        globalCache.delete(key)
        activeRequests.delete(key)
      }
    }
  },
  
  getStats: () => ({
    cacheSize: globalCache.size,
    activeRequests: activeRequests.size,
    cacheKeys: Array.from(globalCache.keys())
  })
}
