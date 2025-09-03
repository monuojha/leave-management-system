import express from "express"
import multer from "multer"
import { v2 as cloudinary } from "cloudinary"
import { authenticate, type AuthRequest } from "../middleware/auth"
import { prisma } from "../config/database"
import { logger } from "../utils/logger"

const router = express.Router()

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true)
    } else {
      cb(new Error("Only image files are allowed"))
    }
  },
})

// Upload profile image
router.post("/profile-image", authenticate, upload.single("image"), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image file provided",
      })
    }

    // Get current user to check for existing image
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { profileImage: true },
    })

    // Delete existing image from Cloudinary if exists
    if (user?.profileImage) {
      const publicId = user.profileImage.split("/").pop()?.split(".")[0]
      if (publicId) {
        await cloudinary.uploader.destroy(`profile-images/${publicId}`)
      }
    }

    // Upload new image to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "profile-images",
            public_id: `${req.user!.id}-${Date.now()}`,
            transformation: [{ width: 400, height: 400, crop: "fill" }, { quality: "auto" }],
          },
          (error, result) => {
            if (error) reject(error)
            else resolve(result)
          },
        )
        .end(req.file!.buffer)
    })

    const uploadResult = result as any

    // Update user profile image
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { profileImage: uploadResult.secure_url },
    })

    logger.info(`Profile image updated for user: ${req.user!.id}`)

    res.json({
      success: true,
      message: "Profile image updated successfully",
      data: {
        imageUrl: uploadResult.secure_url,
      },
    })
  } catch (error) {
    logger.error("Upload profile image error:", error)
    res.status(500).json({
      success: false,
      error: "Failed to upload image",
    })
  }
})

export default router
