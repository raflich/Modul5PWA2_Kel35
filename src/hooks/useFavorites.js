import { useState, useMemo } from 'react'
import favoriteService from '../services/favoriteService'
import { getUserIdentifier } from '../services/userService'
import { useQuery } from './useQuery'
import queryCache from '../utils/queryCache'

// ---------------------------------------------------------------------------
// localStorage fallback — used when the backend is unavailable so that
// favourites are still fully functional offline.
// ---------------------------------------------------------------------------

const LOCAL_KEY = 'bore_barrel_favorites'

const readLocalFavs = () => {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const writeLocalFavs = (ids) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(ids))
  } catch {
    /* quota exceeded — silently fail */
  }
}

// ---------------------------------------------------------------------------
// useFavorites — list all favourited product IDs with query caching.
// ---------------------------------------------------------------------------

export function useFavorites() {
  const userIdentifier = getUserIdentifier()
  const queryKey = useMemo(() => ['favorites', userIdentifier], [userIdentifier])

  const { data, loading, error, isFetching, refetch } = useQuery(
    queryKey,
    async () => {
      try {
        const response = await favoriteService.getFavorites(userIdentifier)
        if (response.success) {
          return { data: response.data || [], isLocal: false }
        }
        throw new Error(response.message)
      } catch {
        return { data: readLocalFavs(), isLocal: true }
      }
    },
    {
      staleTime: 1000 * 60 * 2, // 2 minutes fresh
      cacheTime: 1000 * 60 * 60 * 24,
    },
  )

  const favorites = useMemo(() => data?.data || [], [data])
  const isLocal = Boolean(data?.isLocal)

  return { favorites, loading, error, isLocal, isFetching, refetch }
}

// ---------------------------------------------------------------------------
// useToggleFavorite — toggle a product in/out of favourites with cache invalidation.
// ---------------------------------------------------------------------------

export function useToggleFavorite() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const userIdentifier = getUserIdentifier()

  const toggleFavorite = async (gunId) => {
    try {
      setLoading(true)
      setError(null)

      const response = await favoriteService.toggleFavorite({
        recipe_id: gunId,
        user_identifier: userIdentifier,
      })

      // Invalidate favorites query cache across all components
      queryCache.invalidateQueries(['favorites', userIdentifier])

      if (response.success) {
        return response.data
      }
      throw new Error(response.message)
    } catch {
      // Fallback: toggle in localStorage
      const current = readLocalFavs()
      const idx = current.findIndex((id) => String(id) === String(gunId))
      let isFavorited

      if (idx === -1) {
        current.push(gunId)
        isFavorited = true
      } else {
        current.splice(idx, 1)
        isFavorited = false
      }
      writeLocalFavs(current)

      // Invalidate favorites query cache so state reflects immediately
      queryCache.invalidateQueries(['favorites', userIdentifier])
      return { is_favorited: isFavorited }
    } finally {
      setLoading(false)
    }
  }

  return { toggleFavorite, loading, error }
}

// ---------------------------------------------------------------------------
// useIsFavorited — convenience wrapper for a single product.
// ---------------------------------------------------------------------------

export function useIsFavorited(gunId) {
  const { favorites, loading: fetchLoading, refetch } = useFavorites()
  const { toggleFavorite: toggle, loading: toggleLoading } = useToggleFavorite()

  // Check both server-format (objects with .id) and local-format (plain ids)
  const isFavorited = useMemo(() => {
    return favorites.some((fav) => {
      const favId =
        typeof fav === 'object' && fav !== null
          ? (fav.id ?? fav.product_id ?? fav.recipe_id)
          : fav
      return String(favId) === String(gunId)
    })
  }, [favorites, gunId])

  const toggleFavorite = async () => {
    const result = await toggle(gunId)
    if (result) await refetch()
    return result
  }

  return {
    isFavorited,
    loading: fetchLoading || toggleLoading,
    toggleFavorite,
  }
}

export { getUserIdentifier }
