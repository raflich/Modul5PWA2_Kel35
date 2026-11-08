/**
 * QueryCache — In-memory & Persistent Cache Manager for PWA queries.
 *
 * Implements:
 *  - Key serialization for primitives, arrays, and objects
 *  - In-flight request deduplication (prevents redundant parallel fetches)
 *  - Multi-tier caching (synchronous Memory cache + persistent LocalStorage fallback)
 *  - Stale-While-Revalidate caching strategy
 *  - Reactive query invalidation and pub/sub event system
 */

const STORAGE_PREFIX = 'bore_barrel_qc_'
const DEFAULT_STALE_TIME = 1000 * 60 * 3 // 3 minutes
const DEFAULT_CACHE_TIME = 1000 * 60 * 60 * 24 // 24 hours

/**
 * Deterministically serialize any query key into a string.
 * Supports strings, numbers, arrays, and objects with any key order.
 */
export function serializeQueryKey(key) {
  if (typeof key === 'string') return key
  if (key === null || key === undefined) return ''

  if (Array.isArray(key)) {
    return key
      .map((part) => {
        if (part === null || part === undefined) return ''
        if (typeof part === 'object') {
          return serializeObject(part)
        }
        return String(part)
      })
      .filter(Boolean)
      .join(':')
  }

  if (typeof key === 'object') {
    return serializeObject(key)
  }

  return String(key)
}

function serializeObject(obj) {
  const sorted = Object.keys(obj)
    .sort()
    .reduce((acc, k) => {
      if (obj[k] !== undefined) acc[k] = obj[k]
      return acc
    }, {})
  return JSON.stringify(sorted)
}

class QueryCache {
  constructor() {
    this.memoryCache = new Map() // key -> { data, timestamp, cacheTime, isStale }
    this.inFlight = new Map()    // key -> Promise
    this.listeners = new Set()   // (key, data, isInvalidated) => void
  }

  // Safe localStorage reading
  _readStorage(serializedKey) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + serializedKey)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed.timestamp === 'number') {
        const maxAge = parsed.cacheTime || DEFAULT_CACHE_TIME
        if (Date.now() - parsed.timestamp > maxAge) {
          this._removeStorage(serializedKey)
          return null
        }
        return parsed
      }
      return null
    } catch {
      return null
    }
  }

  // Safe localStorage writing with LRU-like pruning on quota error
  _writeStorage(serializedKey, entry) {
    try {
      localStorage.setItem(STORAGE_PREFIX + serializedKey, JSON.stringify(entry))
    } catch {
      this._pruneStorage()
      try {
        localStorage.setItem(STORAGE_PREFIX + serializedKey, JSON.stringify(entry))
      } catch {
        /* fail silently if quota completely exceeded */
      }
    }
  }

  _removeStorage(serializedKey) {
    try {
      localStorage.removeItem(STORAGE_PREFIX + serializedKey)
    } catch {
      /* ignore */
    }
  }

  _pruneStorage() {
    try {
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(k)
        }
      }
      // Drop the first half of entries
      keysToRemove.slice(0, Math.ceil(keysToRemove.length / 2)).forEach((k) => {
        localStorage.removeItem(k)
      })
    } catch {
      /* ignore */
    }
  }

  /**
   * Synchronously inspect cached data (from memory or localStorage).
   */
  getQueryData(key) {
    const serialized = serializeQueryKey(key)
    const inMem = this.memoryCache.get(serialized)
    if (inMem && !inMem.isStale) {
      return inMem.data
    }

    const fromStorage = this._readStorage(serialized)
    if (fromStorage) {
      this.memoryCache.set(serialized, fromStorage)
      return fromStorage.data
    }

    return inMem?.data ?? null
  }

  /**
   * Set or update query data directly.
   */
  setQueryData(key, data, options = {}) {
    const serialized = serializeQueryKey(key)
    const cacheTime = options.cacheTime || DEFAULT_CACHE_TIME
    const entry = {
      data,
      timestamp: Date.now(),
      cacheTime,
      isStale: false,
    }
    this.memoryCache.set(serialized, entry)
    this._writeStorage(serialized, entry)
    this.notify(serialized, data, false)
  }

  /**
   * Check if a cache entry is currently fresh.
   */
  isFresh(key, staleTime = DEFAULT_STALE_TIME) {
    const serialized = serializeQueryKey(key)
    let entry = this.memoryCache.get(serialized)
    if (!entry) {
      entry = this._readStorage(serialized)
      if (entry) this.memoryCache.set(serialized, entry)
    }
    if (!entry || entry.isStale) return false
    return Date.now() - entry.timestamp < staleTime
  }

  /**
   * Invalidate queries matching a key or prefix.
   * e.g. invalidateQueries('guns') invalidates 'guns' and 'guns:{"limit":50}'
   */
  invalidateQueries(keyOrPrefix) {
    const prefix = serializeQueryKey(keyOrPrefix)

    // Mark stale in memory
    for (const [k, entry] of this.memoryCache.entries()) {
      if (k === prefix || k.startsWith(prefix + ':') || k.startsWith(prefix)) {
        entry.isStale = true
      }
    }

    // Remove from storage to ensure fresh reload
    try {
      const toRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith(STORAGE_PREFIX)) {
          const keyName = k.replace(STORAGE_PREFIX, '')
          if (keyName === prefix || keyName.startsWith(prefix + ':') || keyName.startsWith(prefix)) {
            toRemove.push(k)
          }
        }
      }
      toRemove.forEach((k) => localStorage.removeItem(k))
    } catch {
      /* ignore */
    }

    // Broadcast invalidation event to subscribers
    this.notify(prefix, null, true)
  }

  /**
   * Fetch query data using caching, deduplication, and stale-while-revalidate.
   */
  async fetchQuery({
    queryKey,
    queryFn,
    staleTime = DEFAULT_STALE_TIME,
    cacheTime = DEFAULT_CACHE_TIME,
    force = false,
  }) {
    const serialized = serializeQueryKey(queryKey)

    // If cache is fresh and not forced, return cached data immediately
    if (!force && this.isFresh(serialized, staleTime)) {
      const cached = this.getQueryData(serialized)
      if (cached !== null && cached !== undefined) {
        return cached
      }
    }

    // Deduplicate in-flight promises
    if (this.inFlight.has(serialized)) {
      return this.inFlight.get(serialized)
    }

    const promise = (async () => {
      try {
        const result = await queryFn()
        this.setQueryData(serialized, result, { cacheTime })
        return result
      } catch (err) {
        // If network request failed (e.g. offline), fallback to existing stale cache
        const fallback = this.getQueryData(serialized)
        if (fallback !== null && fallback !== undefined) {
          console.warn(`[queryCache] Network failed for "${serialized}". Serving cached copy.`)
          return fallback
        }
        throw err
      } finally {
        this.inFlight.delete(serialized)
      }
    })()

    this.inFlight.set(serialized, promise)
    return promise
  }

  /**
   * Subscribe to cache updates and invalidations.
   */
  subscribe(keyOrPrefix, callback) {
    const target = serializeQueryKey(keyOrPrefix)
    const listener = (changedKey, data, isInvalidated) => {
      if (
        changedKey === target ||
        changedKey.startsWith(target + ':') ||
        target.startsWith(changedKey) ||
        isInvalidated
      ) {
        callback(data, isInvalidated)
      }
    }
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  notify(key, data, isInvalidated = false) {
    for (const listener of this.listeners) {
      try {
        listener(key, data, isInvalidated)
      } catch (err) {
        console.error('[queryCache] Error in listener:', err)
      }
    }
  }

  clear() {
    this.memoryCache.clear()
    this.inFlight.clear()
    try {
      const toRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith(STORAGE_PREFIX)) {
          toRemove.push(k)
        }
      }
      toRemove.forEach((k) => localStorage.removeItem(k))
    } catch {
      /* ignore */
    }
  }
}

export const queryCache = new QueryCache()
export default queryCache

