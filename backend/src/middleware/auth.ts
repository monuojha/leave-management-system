import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { prisma } from "../config/database"
import { logger } from "../utils/logger"

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    role: string
    firstName: string
    lastName: string
  }
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Access denied. No token provided.",
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        isActive: true,
        isEmailVerified: true,
      },
    })

    if (!user || !user.isActive || !user.isEmailVerified) {
      return res.status(401).json({
        success: false,
        error: "Invalid token or user not found.",
      })
    }

    req.user = user
    next()
  } catch (error) {
    logger.error("Authentication error:", error)
    return res.status(401).json({
      success: false,
      error: "Invalid token.",
    })
  }
}

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required.",
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: "Insufficient permissions.",
      })
    }

    next()
  }
}
