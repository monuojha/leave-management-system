import type { Request, Response, NextFunction } from "express"
import { sessionService, type SessionData } from "../services/sessionService"
import { logger } from "../utils/logger"

export interface AuthenticatedRequest extends Request {
  session?: SessionData
  sessionId?: string
}

export const sessionAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Get session ID from cookie or Authorization header
    const sessionId =
      req.cookies.sessionId ||
      req.headers.authorization?.replace("Bearer ", "") ||
      (req.headers["x-session-id"] as string)

    if (!sessionId) {
      return res.status(401).json({
        success: false,
        error: "No session provided",
      })
    }

    // Get session from Redis
    const session = await sessionService.getSession(sessionId)
    if (!session) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired session",
      })
    }

    // Check session activity timeout (2 hours)
    const now = Date.now()
    const maxInactivity = 2 * 60 * 60 * 1000 // 2 hours
    if (now - session.lastActivity > maxInactivity) {
      await sessionService.deleteSession(sessionId)
      return res.status(401).json({
        success: false,
        error: "Session expired due to inactivity",
      })
    }

    // Extend session
    await sessionService.extendSession(sessionId)

    // Add session data to request
    req.session = session
    req.sessionId = sessionId

    next()
  } catch (error) {
    logger.error("Session authentication error:", error)
    return res.status(500).json({
      success: false,
      error: "Authentication service error",
    })
  }
}

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.session) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      })
    }

    if (!roles.includes(req.session.role)) {
      return res.status(403).json({
        success: false,
        error: "Insufficient permissions",
      })
    }

    next()
  }
}

export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const sessionId =
      req.cookies.sessionId ||
      req.headers.authorization?.replace("Bearer ", "") ||
      (req.headers["x-session-id"] as string)

    if (sessionId) {
      const session = await sessionService.getSession(sessionId)
      if (session) {
        req.session = session
        req.sessionId = sessionId
        await sessionService.extendSession(sessionId)
      }
    }

    next()
  } catch (error) {
    logger.error("Optional authentication error:", error)
    // Continue without authentication
    next()
  }
}
