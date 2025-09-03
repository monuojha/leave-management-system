import express from "express"
import { prisma } from "../config/database"
import { authenticate, requireRole, type AuthRequest } from "../middleware/auth"
import { logger } from "../utils/logger"

const router = express.Router()

// Get all users (HR/Admin only)
router.get("/", authenticate, requireRole(["HR", "ADMIN"]), async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 10, role, department } = req.query

    const where: any = {}
    if (role) where.role = role
    if (department) where.departmentId = department

    const users = await prisma.user.findMany({
      where,
      include: {
        department: {
          select: {
            name: true,
          },
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        profileImage: true,
        phoneNumber: true,
        department: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    })

    const total = await prisma.user.count({ where })

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    })
  } catch (error) {
    logger.error("Get users error:", error)
    res.status(500).json({
      success: false,
      error: "Internal server error",
    })
  }
})

export default router
