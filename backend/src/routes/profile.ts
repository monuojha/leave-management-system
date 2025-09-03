import express from "express"
import { prisma } from "../config/database"
import { authenticate, type AuthRequest } from "../middleware/auth"
import { logger } from "../utils/logger"
const router = express.Router()

//update the profile details of user
router.put("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id
    const { firstName, lastName, phoneNumber, dateOfBirth, address } = req.body

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        phoneNumber,
        dateOfBirth: new Date(dateOfBirth), // ✅ Fix here
        address,
      },
    })

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    })
  } catch (error) {
    logger.error("Update user error:", error)
    res.status(500).json({
      success: false,
      error: "Internal server error",
    })
  }
})

export default router
