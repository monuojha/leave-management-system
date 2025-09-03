import type { Request, Response, NextFunction } from "express"
import { cacheService } from "../services/cacheService"
import { logger } from "../utils/logger"

interface RateLimitOptions {
  windowMs: number
  max: number
  message?: string
  standardHeaders?: boolean
  legacyHeaders?: boolean
  keyGenerator?: (req: Request) => string
}

export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = "Too many requests, please try again later.",
    standardHeaders = true,
    legacyHeaders = false,
    keyGenerator = (req: Request) => req.ip || "unknown",
  } = options

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = keyGenerator(req)
      const windowSeconds = Math.ceil(windowMs / 1000)

      const result = await cacheService.checkRateLimit(key, max, windowSeconds)

      // Set headers
      if (standardHeaders) {
        res.set({
          "RateLimit-Limit": max.toString(),
          "RateLimit-Remaining": result.remaining.toString(),
          "RateLimit-Reset": new Date(result.resetTime).toISOString(),
        })
      }

      if (legacyHeaders) {
        res.set({
          "X-RateLimit-Limit": max.toString(),
          "X-RateLimit-Remaining": result.remaining.toString(),
          "X-RateLimit-Reset": Math.ceil(result.resetTime / 1000).toString(),
        })
      }

      if (!result.allowed) {
        logger.warn(`Rate limit exceeded for ${key}`, {
          ip: req.ip,
          userAgent: req.get("User-Agent"),
          path: req.path,
        })

        return res.status(429).json({
          success: false,
          error: message,
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        })
      }

      next()
    } catch (error) {
      logger.error("Rate limiter error:", error)
      // Fail open - allow request if rate limiter fails
      next()
    }
  }
}

// Predefined rate limiters
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: "Too many authentication attempts, please try again later.",
  keyGenerator: (req: Request) => `auth:${req.ip}:${req.body?.email || "unknown"}`,
})

export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  keyGenerator: (req: Request) => `api:${req.ip}`,
})

export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: "Upload limit exceeded, please try again later.",
  keyGenerator: (req: Request) => `upload:${req.ip}`,
})
