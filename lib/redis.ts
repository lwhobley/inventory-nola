import Redis from 'ioredis'

// Initialize Redis client
const redis = new Redis({
  url: process.env.REDIS_URL,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,
})

// Error handling
redis.on('error', (err) => {
  console.error('Redis Client Error', err)
})

redis.on('connect', () => {
  console.log('Redis Client Connected')
})

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

  // Gemini API cache (to avoid duplicate requests)
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
      const data = await redis.get(key)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error)
      return null
    }
  },

  /**
   * Set cached value with TTL
   */
  async set<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value))
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error)
    }
  },

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<void> {
    try {
      await redis.del(key)
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error)
    }
  },

  /**
   * Delete multiple keys with pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (error) {
      console.error(`Cache deletePattern error for pattern ${pattern}:`, error)
    }
  },

  /**
   * Increment counter (for rate limiting)
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      return await redis.incrby(key, amount)
    } catch (error) {
      console.error(`Cache increment error for key ${key}:`, error)
      return 0
    }
  },

  /**
   * Set expiration on existing key
   */
  async setExpire(key: string, ttlSeconds: number): Promise<void> {
    try {
      await redis.expire(key, ttlSeconds)
    } catch (error) {
      console.error(`Cache setExpire error for key ${key}:`, error)
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
    await redis.flushdb()
  },
}

/**
 * Rate limiting helper
 */
export const rateLimit = {
  async checkLimit(userId: string, endpoint: string, maxRequests: number = 100, windowSeconds: number = 60): Promise<boolean> {
    const key = cacheKeys.rateLimit(userId, endpoint)
    const current = await cache.increment(key)

    if (current === 1) {
      // First request in this window, set expiration
      await cache.setExpire(key, windowSeconds)
    }

    return current <= maxRequests
  },

  async getRemaining(userId: string, endpoint: string, maxRequests: number = 100): Promise<number> {
    const key = cacheKeys.rateLimit(userId, endpoint)
    const current = parseInt((await redis.get(key)) || '0')
    return Math.max(0, maxRequests - current)
  },
}

export default redis
