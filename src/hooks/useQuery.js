import { useState, useEffect, useCallback, useRef } from 'react'
import queryCache, { serializeQueryKey } from '../utils/queryCache'

/**
 * useQuery — React hook for cached data fetching with Stale-While-Revalidate,
 * in-flight deduplication, and offline persistence.
 *
 * @param {string|Array} queryKey - Unique query identifier
 * @param {Function} queryFn - Async function returning data
 * @param {Object} options - { staleTime, cacheTime, enabled, initialData }
 * @returns {{ data: any, loading: boolean, error: string|null, isFetching: boolean, refetch: Function }}
 */
export function useQuery(queryKey, queryFn, options = {}) {
  const {
    staleTime = 1000 * 60 * 3, // 3 minutes
    cacheTime = 1000 * 60 * 60 * 24, // 24 hours
    enabled = true,
    initialData = null,
  } = options

  const serializedKey = serializeQueryKey(queryKey)
  const queryFnRef = useRef(queryFn)

  useEffect(() => {
    queryFnRef.current = queryFn
  }, [queryFn])

  // Synchronously initialize from cache to eliminate UI flashes
  const [data, setData] = useState(() => {
    const cached = queryCache.getQueryData(serializedKey)
    if (cached !== null && cached !== undefined) return cached
    return initialData
  })

  const [loading, setLoading] = useState(() => {
    if (!enabled) return false
    const cached = queryCache.getQueryData(serializedKey)
    return cached === null || cached === undefined
  })

  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!enabled) return

    let isMounted = true

    // Fetch initial or revalidate stale data asynchronously
    queryCache
      .fetchQuery({
        queryKey: serializedKey,
        queryFn: () => queryFnRef.current(),
        staleTime,
        cacheTime,
        force: false,
      })
      .then((result) => {
        if (!isMounted) return
        setData(result)
        setError(null)
        setLoading(false)
        setIsFetching(false)
      })
      .catch((err) => {
        if (!isMounted) return
        setError(err.message || 'Failed to fetch query.')
        setLoading(false)
        setIsFetching(false)
      })

    // Subscribe to cache invalidation / external updates
    const unsubscribe = queryCache.subscribe(serializedKey, (updatedData, isInvalidated) => {
      if (!isMounted) return
      if (isInvalidated) {
        setIsFetching(true)
        queryCache
          .fetchQuery({
            queryKey: serializedKey,
            queryFn: () => queryFnRef.current(),
            staleTime,
            cacheTime,
            force: true,
          })
          .then((result) => {
            if (!isMounted) return
            setData(result)
            setError(null)
            setIsFetching(false)
          })
          .catch((err) => {
            if (!isMounted) return
            setError(err.message || 'Failed to fetch query.')
            setIsFetching(false)
          })
      } else if (updatedData !== undefined && updatedData !== null) {
        setData(updatedData)
      }
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [serializedKey, enabled, staleTime, cacheTime])

  const refetch = useCallback(() => {
    setIsFetching(true)
    return queryCache
      .fetchQuery({
        queryKey: serializedKey,
        queryFn: () => queryFnRef.current(),
        staleTime,
        cacheTime,
        force: true,
      })
      .then((result) => {
        setData(result)
        setError(null)
        setLoading(false)
        setIsFetching(false)
        return result
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch query.')
        setLoading(false)
        setIsFetching(false)
        throw err
      })
  }, [serializedKey, staleTime, cacheTime])

  return {
    data,
    loading,
    error,
    isFetching,
    refetch,
  }
}

export default useQuery
