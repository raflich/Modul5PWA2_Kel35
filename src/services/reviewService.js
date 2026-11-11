import { apiClient, IS_SUPABASE } from '../config/api'

// ---------------------------------------------------------------------------
// ReviewService — product reviews & ratings with local persistence,
// edit/delete for author, and Like/Dislike reaction system.
// ---------------------------------------------------------------------------

const LOCAL_REVIEWS_PREFIX = 'bore_barrel_local_reviews_'
const REVIEW_VOTES_PREFIX = 'bore_barrel_user_votes_' // key per userId
const REVIEW_STATS_KEY = 'bore_barrel_review_stats'     // reviewId -> { likes, dislikes }

function getLocalReviews(gunId) {
  try {
    const raw = localStorage.getItem(`${LOCAL_REVIEWS_PREFIX}${gunId}`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLocalReviews(gunId, reviews) {
  try {
    localStorage.setItem(`${LOCAL_REVIEWS_PREFIX}${gunId}`, JSON.stringify(reviews))
  } catch {
    /* quota exceeded */
  }
}

function getLocalReviewStats(reviewId) {
  try {
    const raw = localStorage.getItem(REVIEW_STATS_KEY)
    const map = raw ? JSON.parse(raw) : {}
    return map[reviewId] || null
  } catch {
    return null
  }
}

function saveLocalReviewStats(reviewId, stats) {
  try {
    const raw = localStorage.getItem(REVIEW_STATS_KEY)
    const map = raw ? JSON.parse(raw) : {}
    map[reviewId] = stats
    localStorage.setItem(REVIEW_STATS_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

function getUserVoteForReview(reviewId, userId) {
  if (!userId) return null
  try {
    const raw = localStorage.getItem(`${REVIEW_VOTES_PREFIX}${userId}`)
    const map = raw ? JSON.parse(raw) : {}
    return map[reviewId] || null // 'like' | 'dislike' | null
  } catch {
    return null
  }
}

function setUserVoteForReview(reviewId, userId, voteType) {
  if (!userId) return
  try {
    const key = `${REVIEW_VOTES_PREFIX}${userId}`
    const raw = localStorage.getItem(key)
    const map = raw ? JSON.parse(raw) : {}
    if (voteType) {
      map[reviewId] = voteType
    } else {
      delete map[reviewId]
    }
    localStorage.setItem(key, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

class ReviewService {
  /**
   * Fetch all reviews for a given product.
   */
  async getReviews(gunId) {
    const local = getLocalReviews(gunId)

    if (IS_SUPABASE && !String(gunId).startsWith('local-')) {
      try {
        const data = await apiClient.get(
          `/rest/v1/reviews?product_id=eq.${gunId}&select=*&order=created_at.desc`,
        )
        const remoteList = Array.isArray(data)
          ? data.map((r) => {
              const localStats = getLocalReviewStats(r.id)
              return {
                id: r.id,
                product_id: r.product_id,
                user_id: r.user_id,
                user_identifier: r.user_id ? `Operator ${String(r.user_id).substring(0, 8)}` : 'Anonymous',
                rating: Number(r.rating || 5),
                comment: r.comment || '',
                likes: localStats?.likes !== undefined ? localStats.likes : Number(r.likes || 0),
                dislikes: localStats?.dislikes !== undefined ? localStats.dislikes : Number(r.dislikes || 0),
                created_at: r.created_at,
              }
            })
          : []

        // Merge any locally created reviews not yet on server
        const merged = [...remoteList]
        for (const loc of local) {
          if (!merged.some((r) => r.id === loc.id)) {
            merged.push(loc)
          }
        }

        return { success: true, data: merged }
      } catch {
        // Network or table issue, fallback to local reviews
        return { success: true, data: local }
      }
    }

    return { success: true, data: local }
  }

  /**
   * Submit a new review.
   * @param {string|number} gunId
   * @param {Object} reviewData  { user_id, user_identifier, rating, comment }
   */
  async createReview(gunId, reviewData) {
    const userId = reviewData.user_id || reviewData.user_identifier
    const newReview = {
      id: Date.now(),
      product_id: gunId,
      user_id: userId,
      user_identifier: userId ? `Operator ${String(userId).substring(0, 8)}` : 'Anonymous',
      rating: Number(reviewData.rating),
      comment: reviewData.comment || '',
      likes: 0,
      dislikes: 0,
      created_at: new Date().toISOString(),
    }

    if (IS_SUPABASE && !String(gunId).startsWith('local-')) {
      try {
        const payload = {
          product_id: Number(gunId),
          user_id: userId,
          rating: Number(reviewData.rating),
          comment: reviewData.comment || '',
        }

        const res = await apiClient.post('/rest/v1/reviews', payload, {
          headers: { Prefer: 'return=representation' },
        })
        const created = Array.isArray(res) ? res[0] : res
        if (created) {
          newReview.id = created.id
        }
      } catch (err) {
        console.warn('[reviewService] Supabase review failed, saving locally:', err)
      }
    }

    // Always preserve locally for resilience
    const local = getLocalReviews(gunId)
    local.unshift(newReview)
    saveLocalReviews(gunId, local)

    return { success: true, data: newReview }
  }

  /**
   * Edit an existing review.
   */
  async updateReview(gunId, reviewId, reviewData) {
    if (IS_SUPABASE && typeof reviewId === 'number' && reviewId < 1000000000000) {
      try {
        await apiClient.patch(
          `/rest/v1/reviews?id=eq.${reviewId}`,
          {
            rating: Number(reviewData.rating),
            comment: reviewData.comment,
          },
          { headers: { Prefer: 'return=representation' } },
        )
      } catch (err) {
        console.warn('[reviewService] Supabase update review failed:', err)
      }
    }

    // Update in local store
    if (gunId) {
      const local = getLocalReviews(gunId)
      const idx = local.findIndex((r) => String(r.id) === String(reviewId))
      if (idx > -1) {
        local[idx] = {
          ...local[idx],
          rating: Number(reviewData.rating),
          comment: reviewData.comment,
          updated_at: new Date().toISOString(),
        }
        saveLocalReviews(gunId, local)
      }
    }

    return { success: true }
  }

  /**
   * Delete a review.
   */
  async deleteReview(gunId, reviewId) {
    if (IS_SUPABASE && typeof reviewId === 'number' && reviewId < 1000000000000) {
      try {
        await apiClient.delete(`/rest/v1/reviews?id=eq.${reviewId}`)
      } catch (err) {
        console.warn('[reviewService] Supabase delete review failed:', err)
      }
    }

    // Delete from local store
    if (gunId) {
      const local = getLocalReviews(gunId)
      const filtered = local.filter((r) => String(r.id) !== String(reviewId))
      saveLocalReviews(gunId, filtered)
    }

    return { success: true }
  }

  /**
   * Vote on a review made by another operator (Thumbs Up / Thumbs Down).
   *
   * @param {string|number} reviewId
   * @param {'like'|'dislike'} voteType
   * @param {string} userId
   */
  async voteReview(reviewId, voteType, userId) {
    if (!userId || !reviewId) return { success: false }

    const currentVote = getUserVoteForReview(reviewId, userId)
    let stats = getLocalReviewStats(reviewId) || { likes: 0, dislikes: 0 }
    let newVote = voteType

    if (currentVote === voteType) {
      // User clicked same vote -> Toggle off
      newVote = null
      if (voteType === 'like') stats.likes = Math.max(0, stats.likes - 1)
      if (voteType === 'dislike') stats.dislikes = Math.max(0, stats.dislikes - 1)
    } else {
      // Switching vote or voting for first time
      if (currentVote === 'like') stats.likes = Math.max(0, stats.likes - 1)
      if (currentVote === 'dislike') stats.dislikes = Math.max(0, stats.dislikes - 1)

      if (voteType === 'like') stats.likes = stats.likes + 1
      if (voteType === 'dislike') stats.dislikes = stats.dislikes + 1
    }

    setUserVoteForReview(reviewId, userId, newVote)
    saveLocalReviewStats(reviewId, stats)

    // Attempt Supabase patch if column exists
    if (IS_SUPABASE && typeof reviewId === 'number' && reviewId < 1000000000000) {
      try {
        await apiClient.patch(`/rest/v1/reviews?id=eq.${reviewId}`, {
          likes: stats.likes,
          dislikes: stats.dislikes,
        })
      } catch {
        /* fail silently if column not present */
      }
    }

    return {
      success: true,
      data: {
        reviewId,
        userVote: newVote,
        likes: stats.likes,
        dislikes: stats.dislikes,
      },
    }
  }

  /**
   * Get reaction state for a review.
   */
  getReviewReaction(reviewId, userId) {
    const stats = getLocalReviewStats(reviewId) || { likes: 0, dislikes: 0 }
    const userVote = getUserVoteForReview(reviewId, userId)
    return {
      likes: stats.likes || 0,
      dislikes: stats.dislikes || 0,
      userVote,
    }
  }
}

export const reviewService = new ReviewService()
export default reviewService
