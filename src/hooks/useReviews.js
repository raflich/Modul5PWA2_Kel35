import { useState, useMemo } from 'react'
import reviewService from '../services/reviewService'
import { useQuery } from './useQuery'
import queryCache from '../utils/queryCache'

// ---------------------------------------------------------------------------
// useReviews — fetch reviews for a specific product with query caching.
// ---------------------------------------------------------------------------

export function useReviews(gunId) {
  const queryKey = useMemo(() => ['reviews', gunId], [gunId])

  const { data, loading, error, isFetching, refetch } = useQuery(
    queryKey,
    () => reviewService.getReviews(gunId),
    {
      enabled: Boolean(gunId),
      staleTime: 1000 * 60 * 2, // 2 minutes fresh
      cacheTime: 1000 * 60 * 60 * 24,
    },
  )

  const reviews = useMemo(() => {
    if (!data) return []
    if (data.success && Array.isArray(data.data)) return data.data
    if (Array.isArray(data.data)) return data.data
    if (Array.isArray(data)) return data
    return []
  }, [data])

  return { reviews, loading, error, isFetching, refetch }
}

// ---------------------------------------------------------------------------
// useCreateReview — submit a new review and invalidate reviews query cache.
// ---------------------------------------------------------------------------

export function useCreateReview() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const createReview = async (gunId, reviewData) => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(false)

      const response = await reviewService.createReview(gunId, reviewData)

      if (response && (response.success || response.data)) {
        setSuccess(true)
        // Invalidate review query for this gun & products
        queryCache.invalidateQueries(['reviews', gunId])
        queryCache.invalidateQueries('guns')
        return response.data || response
      } else {
        setError(response?.message || 'Failed to submit review.')
        return null
      }
    } catch (err) {
      setError(err.message || 'An error occurred while submitting review.')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { createReview, loading, error, success }
}
