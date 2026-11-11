import { useState, useMemo, useCallback } from 'react'
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
      staleTime: 1000 * 60 * 1, // 1 minute fresh
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
// useCreateReview — submit a new review.
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

// ---------------------------------------------------------------------------
// useUpdateReview — edit author's own review.
// ---------------------------------------------------------------------------

export function useUpdateReview() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const updateReview = async (gunId, reviewId, reviewData) => {
    try {
      setLoading(true)
      setError(null)

      const response = await reviewService.updateReview(gunId, reviewId, reviewData)

      if (response && response.success) {
        queryCache.invalidateQueries(['reviews', gunId])
        queryCache.invalidateQueries('guns')
        return true
      }
      throw new Error(response?.message || 'Failed to update review.')
    } catch (err) {
      setError(err.message || 'An error occurred while updating review.')
      return false
    } finally {
      setLoading(false)
    }
  }

  return { updateReview, loading, error }
}

// ---------------------------------------------------------------------------
// useDeleteReview — delete author's own review.
// ---------------------------------------------------------------------------

export function useDeleteReview() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const deleteReview = async (gunId, reviewId) => {
    try {
      setLoading(true)
      setError(null)

      const response = await reviewService.deleteReview(gunId, reviewId)

      if (response && response.success) {
        queryCache.invalidateQueries(['reviews', gunId])
        queryCache.invalidateQueries('guns')
        return true
      }
      throw new Error(response?.message || 'Failed to delete review.')
    } catch (err) {
      setError(err.message || 'An error occurred while deleting review.')
      return false
    } finally {
      setLoading(false)
    }
  }

  return { deleteReview, loading, error }
}

// ---------------------------------------------------------------------------
// useVoteReview — Like or Dislike another user's review.
// ---------------------------------------------------------------------------

export function useVoteReview() {
  const [voting, setVoting] = useState(false)

  const voteReview = useCallback(async (reviewId, voteType, userId) => {
    setVoting(true)
    try {
      const res = await reviewService.voteReview(reviewId, voteType, userId)
      return res
    } finally {
      setVoting(false)
    }
  }, [])

  const getReaction = useCallback((reviewId, userId) => {
    return reviewService.getReviewReaction(reviewId, userId)
  }, [])

  return { voteReview, getReaction, voting }
}
