/**
 * Cache utility for managing localStorage with user-specific namespacing and TTL
 */

interface CacheOptions {
  ttl?: number // Time to live in milliseconds (default: 5 minutes)
}

const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

interface CacheEntry<T> {
  data: T
  timestamp: number
  userId: string
}

/**
 * Save data to cache with user ID and timestamp
 */
export function setCache<T>(
  key: string,
  data: T,
  userId: string,
  options: CacheOptions = {}
): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      userId,
    }
    localStorage.setItem(key, JSON.stringify(entry))
  } catch (error) {
  }
}

/**
 * Get data from cache, returns null if expired or belongs to different user
 */
export function getCache<T>(
  key: string,
  userId: string,
  options: CacheOptions = {}
): T | null {
  try {
    const item = localStorage.getItem(key)
    if (!item) return null

    const entry: CacheEntry<T> = JSON.parse(item)
    
    // Check if cache belongs to current user
    if (entry.userId !== userId) {
      localStorage.removeItem(key)
      return null
    }

    // Check if cache is expired
    const ttl = options.ttl || DEFAULT_TTL
    const isExpired = Date.now() - entry.timestamp > ttl
    
    if (isExpired) {
      localStorage.removeItem(key)
      return null
    }

    return entry.data
  } catch (error) {
    // Clear corrupted cache
    localStorage.removeItem(key)
    return null
  }
}

/**
 * Clear cache for specific key
 */
export function clearCache(key: string): void {
  localStorage.removeItem(key)
}

/**
 * Clear all cache entries for a specific user
 */
export function clearUserCache(userId: string): void {
  try {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      try {
        const item = localStorage.getItem(key)
        if (!item) return

        const entry = JSON.parse(item)
        if (entry.userId === userId) {
          localStorage.removeItem(key)
        }
      } catch {
        // Skip non-JSON items
      }
    })
  } catch (error) {
  }
}

/**
 * Check if cached data exists and is valid
 */
export function hasFreshCache(
  key: string,
  userId: string,
  options: CacheOptions = {}
): boolean {
  return getCache(key, userId, options) !== null
}
