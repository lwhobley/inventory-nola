import Redis from 'ioredis'

// Lazy-load Redis connection only when actually used
// This prevents connection attempts during build/prerender
let redisInstance: Redis | null = null

function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis({
      url: process.env.REDIS_URL || '',
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: true,
      lazyConnect: true, // Don't connect immediately
    })

    // Error handling
    redisInstance.on('error', (err) => {
      console.error('Redis Client Error', err)
    })

    redisInstance.on('connect', () => {
      console.log('Redis Client Connected')
    })

    // Try to connect when first requested
    redisInstance.connect().catch((err) => {
      console.warn('Redis connection warning (will retry):', err.message)
    })
  }

  return redisInstance
}

/**
 * Cache patterns for different data types
 */
export const cacheKeys = {
  // Session cache
  session: (userId: string) => `session:${userId}`,
  allSessions: () => 'sessions:all',

  // User cache
  user: (userId: string) => `user:${userId}`,
  userByPin: (pin: string) => `user:pin:${pin}`,
  allUsers: () => 'users:all',

  // Inventory cache
  inventory: (locationId: string) => `inventory:${locationId}`,
  inventoryItem: (itemId: string) => `inventory:item:${itemId}`,
  allInventory: () => 'inventory:all',

  // Analysis results cache
  analysisResult: (resultId: string) => `analysis:${resultId}`,
  agentAnalysis: (agentId: string) => `analysis:agent:${agentId}`,

  // Rate limiting
  rateLimit: (userId: string, endpoint: string) => `ratelimit:${userId}:${endpoint}`,

  // Gemini API cache
  geminiResult: (hash: string) => `gemini:${hash}`,
}

/**
 * Cache operations
 */
export const cache = {
  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const redis = getRedis()
      const data = await redis.get(key)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.warn(`Cache get error for key ${key}:`, error)
      return null
    }
  },

  /**
   * Set cached value with TTL
   */
  async set<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
    try {
      const redis = getRedis()
      await redis.setex(key, ttlSeconds, JSON.stringify(value))
    } catch (error) {
      console.warn(`Cache set error for key ${key}:`, error)
    }
  },

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<void> {
    try {
      const redis = getRedis()
      await redis.del(key)
    } catch (error) {
      console.warn(`Cache delete error for key ${key}:`, error)
    }
  },

  /**
   * Delete multiple keys with pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const redis = getRedis()
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (error) {
      console.warn(`Cache deletePattern error for pattern ${pattern}:`, error)
    }
  },

  /**
   * Increment counter (for rate limiting)
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      const redis = getRedis()
      return await redis.incrby(key, amount)
    } catch (error) {
      console.warn(`Cache increment error for key ${key}:`, error)
      return 0
    }
  },

  /**
   * Set expiration on existing key
   */
  async setExpire(key: string, ttlSeconds: number): Promise<void> {
    try {
      const redis = getRedis()
      await redis.expire(key, ttlSeconds)
    } catch (error) {
      console.warn(`Cache setExpire error for key ${key}:`, error)
    }
  },
}

/**
 * Cache invalidation helpers
 */
export const cacheInvalidation = {
  async invalidateUser(userId: string): Promise<void> {
    await cache.delete(cacheKeys.user(userId))
    await cache.deletePattern(cacheKeys.allUsers())
  },

  async invalidateInventory(locationId: string): Promise<void> {
    await cache.delete(cacheKeys.inventory(locationId))
    await cache.deletePattern(cacheKeys.allInventory())
  },

  async invalidateAnalysis(agentId: string): Promise<void> {
    await cache.deletePattern(cacheKeys.agentAnalysis(agentId))
  },

  async invalidateAll(): Promise<void> {
    try {
      const redis = getRedis()
      await redis.flushdb()
    } catch (error) {
      console.warn('Cache invalidateAll error:', error)
    }
  },
}

/**
 * Rate limiting helper
 */
export const rateLimit = {
  async checkLimit(
    userId: string,
    endpoint: string,
    maxRequests: number = 100,
    windowSeconds: number = 60
  ): Promise<boolean> {
    try {
      const redis = getRedis()
      const key = cacheKeys.rateLimit(userId, endpoint)
      const current = await redis.incrby(key, 1)

      if (current === 1) {
        // First request in this window, set expiration
        await redis.expire(key, windowSeconds)
      }

      return current <= maxRequests
    } catch (error) {
      console.warn('Rate limit check error:', error)
      // If Redis fails, allow the request (fail open)
      return true
    }
  },

  async getRemaining(
    userId: string,
    endpoint: string,
    maxRequests: number = 100
  ): Promise<number> {
    try {
      const redis = getRedis()
      const key = cacheKeys.rateLimit(userId, endpoint)
      const current = parseInt((await redis.get(key)) || '0')
      return Math.max(0, maxRequests - current)
    } catch (error) {
      console.warn('Get remaining error:', error)
      return maxRequests
    }
  },
}

export default getRedis()
