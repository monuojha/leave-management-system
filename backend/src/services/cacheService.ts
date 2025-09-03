import { redis } from "../config/redis"
import { logger } from "../utils/logger"

export class CacheService {
  private readonly DEFAULT_TTL = 3600 // 1 hour in seconds

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(key)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      logger.error("Cache get error:", error)
      return null
    }
  }

  async set(key: string, value: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value))
    } catch (error) {
      logger.error("Cache set error:", error)
    }
  }

  async del(key: string): Promise<void> {
    try {
      await redis.del(key)
    } catch (error) {
      logger.error("Cache delete error:", error)
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key)
      return result === 1
    } catch (error) {
      logger.error("Cache exists error:", error)
      return false
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (error) {
      logger.error("Cache invalidate pattern error:", error)
    }
  }

  // Cache with automatic refresh
  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl: number = this.DEFAULT_TTL): Promise<T> {
    try {
      const cached = await this.get<T>(key)
      if (cached !== null) {
        return cached
      }

      const fresh = await fetcher()
      await this.set(key, fresh, ttl)
      return fresh
    } catch (error) {
      logger.error("Cache getOrSet error:", error)
      throw error
    }
  }

  // Increment counter with expiry
  async increment(key: string, ttl: number = this.DEFAULT_TTL): Promise<number> {
    try {
      const pipeline = redis.pipeline()
      pipeline.incr(key)
      pipeline.expire(key, ttl)
      const results = await pipeline.exec()
      return (results?.[0]?.[1] as number) || 0
    } catch (error) {
      logger.error("Cache increment error:", error)
      return 0
    }
  }

  // Rate limiting helper
  async checkRateLimit(
    identifier: string,
    limit: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    try {
      const key = `rate_limit:${identifier}`
      const now = Date.now()
      const windowStart = now - windowSeconds * 1000

      // Remove old entries and count current
      await redis.zremrangebyscore(key, 0, windowStart)
      const current = await redis.zcard(key)

      if (current >= limit) {
        const oldestEntry = await redis.zrange(key, 0, 0, "WITHSCORES")
        const resetTime =
          oldestEntry.length > 0
            ? Number.parseInt(oldestEntry[1] as string) + windowSeconds * 1000
            : now + windowSeconds * 1000

        return {
          allowed: false,
          remaining: 0,
          resetTime,
        }
      }

      // Add current request
      const pipeline = redis.pipeline()
      pipeline.zadd(key, now, `${now}-${Math.random()}`)
      pipeline.expire(key, windowSeconds)
      await pipeline.exec()

      return {
        allowed: true,
        remaining: limit - current - 1,
        resetTime: now + windowSeconds * 1000,
      }
    } catch (error) {
      logger.error("Rate limit check error:", error)
      return { allowed: true, remaining: limit - 1, resetTime: Date.now() + windowSeconds * 1000 }
    }
  }
}

export const cacheService = new CacheService()
