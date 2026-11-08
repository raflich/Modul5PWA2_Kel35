import { useMemo } from 'react'
import gunService from '../services/gunService'
import { useQuery } from './useQuery'
import queryCache from '../utils/queryCache'

// ---------------------------------------------------------------------------
// useGuns — fetch the paginated / filtered product list from the API with query caching.
//
// Returns { guns, loading, error, pagination, isFetching, refetch }.
// Features:
//  - Instant cache hit (no flash when switching tabs or navigating back)
//  - Background revalidation (stale-while-revalidate)
//  - Automatic reactive updates when products are added, edited, or deleted
// ---------------------------------------------------------------------------

export function useGuns(params = {}) {
  const { data, loading, error, isFetching, refetch } = useQuery(
    ['guns', params],
    () => gunService.getGuns(params),
    {
      staleTime: 1000 * 60 * 3, // 3 minutes fresh
      cacheTime: 1000 * 60 * 60 * 24, // 24 hours persistent
    },
  )

  const guns = useMemo(() => {
    if (!data) return []
    if (data.success && Array.isArray(data.data)) return data.data
    if (Array.isArray(data.data)) return data.data
    if (Array.isArray(data)) return data
    return []
  }, [data])

  const pagination = data?.pagination || null

  return {
    guns,
    loading,
    error,
    pagination,
    isFetching,
    refetch,
  }
}

// ---------------------------------------------------------------------------
// useGunById — fetch a single product by its UUID with query caching.
//
// Returns { gun, loading, error, isFetching, refetch }.
// ---------------------------------------------------------------------------

export function useGunById(id) {
  const { data, loading, error, isFetching, refetch } = useQuery(
    ['gun', id],
    () => gunService.getGunById(id),
    {
      enabled: Boolean(id),
      staleTime: 1000 * 60 * 5, // 5 minutes fresh
      cacheTime: 1000 * 60 * 60 * 24,
    },
  )

  const gun = useMemo(() => {
    if (!data) return null
    if (data.success && data.data) return data.data
    if (data.data) return data.data
    if (data.id) return data
    return null
  }, [data])

  return {
    gun,
    loading,
    error,
    isFetching,
    refetch,
  }
}

export { queryCache }
