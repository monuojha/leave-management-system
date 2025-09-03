import { redis } from "../config/redis"
import { logger } from "../utils/logger"
import crypto from "crypto"

export interface SessionData {
  userId: string
  email: string
  role: string
  firstName: string
  lastName: string
  loginTime: number
  lastActivity: number
  ipAddress?: string
  userAgent?: string
  deviceId?: string
}

export class SessionService {
  private readonly SESSION_PREFIX = "session:"
  private readonly USER_SESSIONS_PREFIX = "user_sessions:"
  private readonly SESSION_EXPIRY = 24 * 60 * 60 // 24 hours in seconds
  private readonly MAX_SESSIONS_PER_USER = 5

  async createSession(sessionData: SessionData): Promise<string> {
    const sessionId = crypto.randomUUID()

    try {
      // Check existing sessions for user
      await this.cleanupExpiredSessions(sessionData.userId)
      const existingSessions = await this.getUserSessions(sessionData.userId)

      // Limit concurrent sessions
      if (existingSessions.length >= this.MAX_SESSIONS_PER_USER) {
        // Remove oldest session
        const oldestSession = existingSessions.sort((a, b) => a.loginTime - b.loginTime)[0]
        await this.deleteSessionByUserId(sessionData.userId, oldestSession.deviceId || "")
      }

      const pipeline = redis.pipeline()

      // Store session data
      pipeline.setex(`${this.SESSION_PREFIX}${sessionId}`, this.SESSION_EXPIRY, JSON.stringify(sessionData))

      // Track user sessions
      pipeline.sadd(`${this.USER_SESSIONS_PREFIX}${sessionData.userId}`, sessionId)
      pipeline.expire(`${this.USER_SESSIONS_PREFIX}${sessionData.userId}`, this.SESSION_EXPIRY)

      await pipeline.exec()

      logger.info(`Session created for user ${sessionData.userId}`, { sessionId })
      return sessionId
    } catch (error) {
      logger.error("Error creating session:", error)
      throw new Error("Failed to create session")
    }
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const sessionData = await redis.get(`${this.SESSION_PREFIX}${sessionId}`)
      if (!sessionData) return null

      const session = JSON.parse(sessionData) as SessionData

      // Update last activity
      session.lastActivity = Date.now()
      await this.updateSession(sessionId, { lastActivity: session.lastActivity })

      return session
    } catch (error) {
      logger.error("Error getting session:", error)
      return null
    }
  }

  async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<void> {
    try {
      const existingSession = await this.getSessionWithoutUpdate(sessionId)
      if (!existingSession) return

      const updatedSession = { ...existingSession, ...updates }
      await redis.setex(`${this.SESSION_PREFIX}${sessionId}`, this.SESSION_EXPIRY, JSON.stringify(updatedSession))
    } catch (error) {
      logger.error("Error updating session:", error)
    }
  }

  private async getSessionWithoutUpdate(sessionId: string): Promise<SessionData | null> {
    try {
      const sessionData = await redis.get(`${this.SESSION_PREFIX}${sessionId}`)
      return sessionData ? JSON.parse(sessionData) : null
    } catch (error) {
      logger.error("Error getting session without update:", error)
      return null
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      const session = await this.getSessionWithoutUpdate(sessionId)
      if (!session) return

      const pipeline = redis.pipeline()
      pipeline.del(`${this.SESSION_PREFIX}${sessionId}`)
      pipeline.srem(`${this.USER_SESSIONS_PREFIX}${session.userId}`, sessionId)
      await pipeline.exec()

      logger.info(`Session deleted for user ${session.userId}`, { sessionId })
    } catch (error) {
      logger.error("Error deleting session:", error)
    }
  }

  async deleteSessionByUserId(userId: string, deviceId?: string): Promise<void> {
    try {
      const sessions = await this.getUserSessions(userId)
      const sessionToDelete = deviceId ? sessions.find((s) => s.deviceId === deviceId) : sessions[0]

      if (sessionToDelete) {
        const sessionIds = await redis.smembers(`${this.USER_SESSIONS_PREFIX}${userId}`)
        for (const sessionId of sessionIds) {
          const session = await this.getSessionWithoutUpdate(sessionId)
          if (session && (!deviceId || session.deviceId === deviceId)) {
            await this.deleteSession(sessionId)
            break
          }
        }
      }
    } catch (error) {
      logger.error("Error deleting session by user ID:", error)
    }
  }

  async deleteAllUserSessions(userId: string): Promise<void> {
    try {
      const sessionIds = await redis.smembers(`${this.USER_SESSIONS_PREFIX}${userId}`)
      if (sessionIds.length === 0) return

      const pipeline = redis.pipeline()
      sessionIds.forEach((sessionId) => {
        pipeline.del(`${this.SESSION_PREFIX}${sessionId}`)
      })
      pipeline.del(`${this.USER_SESSIONS_PREFIX}${userId}`)
      await pipeline.exec()

      logger.info(`All sessions deleted for user ${userId}`)
    } catch (error) {
      logger.error("Error deleting all user sessions:", error)
    }
  }

  async getUserSessions(userId: string): Promise<SessionData[]> {
    try {
      const sessionIds = await redis.smembers(`${this.USER_SESSIONS_PREFIX}${userId}`)
      const sessions: SessionData[] = []

      for (const sessionId of sessionIds) {
        const session = await this.getSessionWithoutUpdate(sessionId)
        if (session) {
          sessions.push(session)
        }
      }

      return sessions
    } catch (error) {
      logger.error("Error getting user sessions:", error)
      return []
    }
  }

  async extendSession(sessionId: string): Promise<void> {
    try {
      await redis.expire(`${this.SESSION_PREFIX}${sessionId}`, this.SESSION_EXPIRY)
    } catch (error) {
      logger.error("Error extending session:", error)
    }
  }

  private async cleanupExpiredSessions(userId: string): Promise<void> {
    try {
      const sessionIds = await redis.smembers(`${this.USER_SESSIONS_PREFIX}${userId}`)
      const validSessionIds: string[] = []

      for (const sessionId of sessionIds) {
        const exists = await redis.exists(`${this.SESSION_PREFIX}${sessionId}`)
        if (exists) {
          validSessionIds.push(sessionId)
        }
      }

      // Update the user sessions set with only valid sessions
      if (validSessionIds.length !== sessionIds.length) {
        const pipeline = redis.pipeline()
        pipeline.del(`${this.USER_SESSIONS_PREFIX}${userId}`)
        if (validSessionIds.length > 0) {
          pipeline.sadd(`${this.USER_SESSIONS_PREFIX}${userId}`, ...validSessionIds)
          pipeline.expire(`${this.USER_SESSIONS_PREFIX}${userId}`, this.SESSION_EXPIRY)
        }
        await pipeline.exec()
      }
    } catch (error) {
      logger.error("Error cleaning up expired sessions:", error)
    }
  }
}

export const sessionService = new SessionService()
