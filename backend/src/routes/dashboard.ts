import express from "express"
import { prisma } from "../config/database"
import { authenticate, type AuthRequest } from "../middleware/auth"
import { logger } from "../utils/logger"

const router = express.Router()

// Get dashboard statistics
router.get("/stats", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id
    const userRole = req.user!.role

    // Get leave balances
    const leaveBalances = await prisma.leaveBalance.findMany({
      where: { userId },
    })

    // Get recent leave requests
    const recentRequests = await prisma.leaveRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        approver: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // Get pending requests count
    const pendingRequestsCount = await prisma.leaveRequest.count({
      where: { userId, status: "PENDING" },
    })

    let managerStats = {}
    if (["MANAGER", "HR", "ADMIN"].includes(userRole)) {
      // Get pending approvals for managers
      const pendingApprovals = await prisma.leaveRequest.count({
        where: { status: "PENDING" },
      })

      // Get comprehensive approval statistics
      const totalApproved = await prisma.leaveRequest.count({
        where: {
          status: "APPROVED",
          approverId: userId,
        },
      })

      const totalRejected = await prisma.leaveRequest.count({
        where: {
          status: "REJECTED",
          approverId: userId,
        },
      })

      // Get monthly statistics
      const currentYear = new Date().getFullYear()
      const monthlyStats = await prisma.leaveRequest.groupBy({
        by: ["status"],
        _count: {
          status: true,
        },
        where: {
          approverId: userId,
          createdAt: {
            gte: new Date(currentYear, 0, 1),
            lte: new Date(currentYear, 11, 31),
          },
        },
      })

      // Get recent approval history
      const recentApprovals = await prisma.leaveRequest.findMany({
        where: {
          approverId: userId,
          status: { in: ["APPROVED", "REJECTED"] },
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      })

      // Get team member count
      const teamMemberCount = await prisma.user.count({
        where: {
          role: "EMPLOYEE",
          departmentId: req.user!.departmentId || undefined,
        },
      })

      // Get all pending requests with user details
      const allPendingRequests = await prisma.leaveRequest.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      })

      managerStats = {
        pendingApprovals,
        totalApproved,
        totalRejected,
        monthlyStats,
        recentApprovals,
        teamMemberCount,
        allPendingRequests,
      }
    }

    res.json({
      success: true,
      data: {
        leaveBalances,
        recentRequests,
        pendingRequestsCount,
        ...managerStats,
      },
    })
  } catch (error) {
    logger.error("Get dashboard stats error:", error)
    res.status(500).json({
      success: false,
      error: "Internal server error",
    })
  }
})

export default router
