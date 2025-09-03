import express from "express"
import { z } from "zod"
import { prisma } from "../config/database"
import { authenticate, requireRole, type AuthRequest } from "../middleware/auth"
import { validate } from "../middleware/validation"
import { logger } from "../utils/logger"

const router = express.Router()

// Validation schemas
const createLeaveRequestSchema = z.object({
  body: z.object({
    leaveType: z.enum(["ANNUAL", "SICK", "MATERNITY", "PATERNITY", "PERSONAL", "EMERGENCY"]),
    startDate: z.string(),
    endDate: z.string(),
    reason: z.string().min(1),
    isHalfDay: z.boolean().default(false),
    managerId: z.string().optional(), // Added managerId to schema
  }),
})

const updateLeaveRequestSchema = z.object({
  body: z.object({
    leaveType: z.enum(["ANNUAL", "SICK", "MATERNITY", "PATERNITY", "PERSONAL", "EMERGENCY"]).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    reason: z.string().min(1).optional(),
    isHalfDay: z.boolean().optional(),
  }),
})

// Get leave requests
router.get("/requests", authenticate, async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query

    const where: any = { userId: req.user!.id }
    if (status) {
      where.status = status
    }

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        approver: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    })

    const total = await prisma.leaveRequest.count({ where })

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    })
  } catch (error) {
    logger.error("Get leave requests error:", error)
    res.status(500).json({
      success: false,
      error: "Internal server error",
    })
  }
})

// Create leave request
router.post("/requests", authenticate, validate(createLeaveRequestSchema), async (req: AuthRequest, res) => {
  try {
    if (req.user!.role === "MANAGER") {
      return res.status(403).json({
        success: false,
        error: "Managers cannot create leave requests. Only employees can submit leave requests.",
      })
    }

    const { leaveType, startDate, endDate, reason, isHalfDay, managerId } = req.body
    console.log(req.body)

    // Calculate days
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start < new Date()) {
      return res.status(400).json({
        success: false,
        error: "Cannot apply for leave on past dates",
      })
    }

    if (start > end) {
      return res.status(400).json({
        success: false,
        error: "Start date cannot be after end date",
      })
    }

    const days = isHalfDay ? 0.5 : Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const overlappingRequest = await prisma.leaveRequest.findFirst({
      where: {
        userId: req.user!.id,
        status: { in: ["PENDING", "APPROVED"] },
        OR: [
          {
            startDate: { lte: end },
            endDate: { gte: start },
          },
        ],
      },
    })

    if (overlappingRequest) {
      return res.status(400).json({
        success: false,
        error: "You have overlapping leave requests for the selected dates",
      })
    }

    // Check leave balance
    const balance = await prisma.leaveBalance.findFirst({
      where: {
        userId: req.user!.id,
        leaveType,
      },
    })

    if (!balance || balance.remaining < days) {
      return res.status(400).json({
        success: false,
        error: "Insufficient leave balance",
        availableDays: balance?.remaining || 0,
      })
    }

    const request = await prisma.leaveRequest.create({
      data: {
        userId: req.user!.id,
        leaveType,
        startDate: start,
        endDate: end,
        reason,
        days,
        isHalfDay,
        ...(managerId && { approverId: managerId }), // Assign manager if provided
      },
    })

    logger.info(`Leave request created: ${request.id} by user ${req.user!.id}`)

    res.status(201).json({
      success: true,
      message: "Leave request submitted successfully",
      data: { request },
    })
  } catch (error) {
    logger.error("Create leave request error:", error)
    res.status(500).json({
      success: false,
      error: "Internal server error",
    })
  }
})

// Get leave balances
router.get("/balances", authenticate, async (req: AuthRequest, res) => {
  try {
    let balances = await prisma.leaveBalance.findMany({
      where: { userId: req.user!.id },
    })

    if (balances.length === 0) {
      const defaultBalances = [
        { leaveType: "ANNUAL", total: 21, used: 0, remaining: 21 },
        { leaveType: "SICK", total: 10, used: 0, remaining: 10 },
        { leaveType: "PERSONAL", total: 5, used: 0, remaining: 5 },
        { leaveType: "EMERGENCY", total: 3, used: 0, remaining: 3 },
      ]

      balances = await Promise.all(
        defaultBalances.map((balance) =>
          prisma.leaveBalance.create({
            data: {
              userId: req.user!.id,
              leaveType: balance.leaveType as any,
              total: balance.total,
              used: balance.used,
              remaining: balance.remaining,
              year: new Date().getFullYear(),
            },
          }),
        ),
      )
    }

    res.json({
      success: true,
      data: { balances },
    })
  } catch (error) {
    logger.error("Get leave balances error:", error)
    res.status(500).json({
      success: false,
      error: "Internal server error",
    })
  }
})

// Get pending approvals (Manager/HR/Admin only)
router.get("/approvals", authenticate, requireRole(["MANAGER", "HR", "ADMIN"]), async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 10 } = req.query

    const requests = await prisma.leaveRequest.findMany({
      where: { status: "PENDING" },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            department: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    })

    const total = await prisma.leaveRequest.count({
      where: { status: "PENDING" },
    })

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    })
  } catch (error) {
    logger.error("Get pending approvals error:", error)
    res.status(500).json({
      success: false,
      error: "Internal server error",
    })
  }
})

// Approve leave request
router.post(
  "/approvals/:id/approve",
  authenticate,
  requireRole(["MANAGER", "HR", "ADMIN"]),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params
      const { comments } = req.body

      const request = await prisma.leaveRequest.findUnique({
        where: { id },
        include: { user: true },
      })

      if (!request) {
        return res.status(404).json({
          success: false,
          error: "Leave request not found",
        })
      }

      if (request.status !== "PENDING") {
        return res.status(400).json({
          success: false,
          error: "Leave request is not pending",
        })
      }

      // Update request and deduct balance
      await prisma.$transaction([
        prisma.leaveRequest.update({
          where: { id },
          data: {
            status: "APPROVED",
            approverId: req.user!.id,
            approvedAt: new Date(),
            comments,
          },
        }),
        prisma.leaveBalance.updateMany({
          where: {
            userId: request.userId,
            leaveType: request.leaveType,
          },
          data: {
            used: { increment: request.days },
            remaining: { decrement: request.days },
          },
        }),
      ])

      logger.info(`Leave request approved: ${id} by ${req.user!.id}`)

      res.json({
        success: true,
        message: "Leave request approved successfully",
      })
    } catch (error) {
      logger.error("Approve leave request error:", error)
      res.status(500).json({
        success: false,
        error: "Internal server error",
      })
    }
  },
)

// Reject leave request
router.post(
  "/approvals/:id/reject",
  authenticate,
  requireRole(["MANAGER", "HR", "ADMIN"]),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params
      const { comments } = req.body

      const request = await prisma.leaveRequest.findUnique({
        where: { id },
      })

      if (!request) {
        return res.status(404).json({
          success: false,
          error: "Leave request not found",
        })
      }

      if (request.status !== "PENDING") {
        return res.status(400).json({
          success: false,
          error: "Leave request is not pending",
        })
      }

      await prisma.leaveRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          approverId: req.user!.id,
          approvedAt: new Date(),
          comments,
        },
      })

      logger.info(`Leave request rejected: ${id} by ${req.user!.id}`)

      res.json({
        success: true,
        message: "Leave request rejected successfully",
      })
    } catch (error) {
      logger.error("Reject leave request error:", error)
      res.status(500).json({
        success: false,
        error: "Internal server error",
      })
    }
  },
)

router.get("/managers", authenticate, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== "EMPLOYEE") {
      return res.status(403).json({
        success: false,
        error: "Only employees can access manager list",
      })
    }

    const managers = await prisma.user.findMany({
      where: {
        role: { in: ["MANAGER", "HR", "ADMIN"] },
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        department: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { firstName: "asc" }],
    })

    res.json({
      success: true,
      data: { managers },
    })
  } catch (error) {
    logger.error("Get managers error:", error)
    res.status(500).json({
      success: false,
      error: "Internal server error",
    })
  }
})

router.get("/history", authenticate, async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 10, status, startDate, endDate } = req.query

    const where: any = {}

    if (req.user!.role === "EMPLOYEE") {
      where.userId = req.user!.id
    }

    if (status) {
      where.status = status
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      }
    }

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            department: {
              select: {
                name: true,
              },
            },
          },
        },
        approver: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    })

    const total = await prisma.leaveRequest.count({ where })

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    })
  } catch (error) {
    logger.error("Get leave history error:", error)
    res.status(500).json({
      success: false,
      error: "Internal server error",
    })
  }
})

export default router
