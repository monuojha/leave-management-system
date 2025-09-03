import Redis from "ioredis"
import { logger } from "../utils/logger"

class RedisManager {
  private client: Redis | null = null
  private subscriber: Redis | null = null
  private publisher: Redis | null = null

  constructor() {
    this.connect()
  }

  private connect() {
    try {
      const redisConfig = {
        host: process.env.REDIS_HOST || "localhost",
        port: Number.parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD,
        db: Number.parseInt(process.env.REDIS_DB || "0"),
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
      }

      // Main Redis client for general operations
      this.client = new Redis(redisConfig)

      // Separate clients for pub/sub to avoid blocking
      this.subscriber = new Redis(redisConfig)
      this.publisher = new Redis(redisConfig)

      this.setupEventHandlers()
    } catch (error) {
      logger.error("Redis connection failed:", error)
      throw error
    }
  }

  private setupEventHandlers() {
    if (this.client) {
      this.client.on("connect", () => logger.info("Redis client connected"))
      this.client.on("error", (err) => logger.error("Redis client error:", err))
      this.client.on("close", () => logger.warn("Redis client connection closed"))
    }

    if (this.subscriber) {
      this.subscriber.on("connect", () => logger.info("Redis subscriber connected"))
      this.subscriber.on("error", (err) => logger.error("Redis subscriber error:", err))
    }

    if (this.publisher) {
      this.publisher.on("connect", () => logger.info("Redis publisher connected"))
      this.publisher.on("error", (err) => logger.error("Redis publisher error:", err))
    }
  }

  getClient(): Redis {
    if (!this.client) {
      throw new Error("Redis client not initialized")
    }
    return this.client
  }

  getSubscriber(): Redis {
    if (!this.subscriber) {
      throw new Error("Redis subscriber not initialized")
    }
    return this.subscriber
  }

  getPublisher(): Redis {
    if (!this.publisher) {
      throw new Error("Redis publisher not initialized")
    }
    return this.publisher
  }

  async disconnect() {
    try {
      await Promise.all([this.client?.quit(), this.subscriber?.quit(), this.publisher?.quit()])
      logger.info("Redis connections closed")
    } catch (error) {
      logger.error("Error closing Redis connections:", error)
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client?.ping()
      return result === "PONG"
    } catch (error) {
      logger.error("Redis health check failed:", error)
      return false
    }
  }
}

export const redisManager = new RedisManager()
export const redis = redisManager.getClient()
