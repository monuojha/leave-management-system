import express from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { z } from "zod"
import { prisma } from "../config/database"
import { authenticate, type AuthRequest } from "../middleware/auth"
import { validate } from "../middleware/validation"
import { sendEmail, generateOTPEmail } from "../utils/email"
import { logger } from "../utils/logger"

const router = express.Router()

// Validation schemas
const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    role: z.enum(["EMPLOYEE", "MANAGER", "HR", "ADMIN"]).default("EMPLOYEE"),
    departmentId: z.string().optional(),
    phoneNumber: z.string().optional(),
    dateOfBirth: z.string().optional(),
    address: z.string().optional(),
  }),
})

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
})

const verifyOTPSchema = z.object({
  body: z.object({
    email: z.string().email(),
    otp: z.string().length(6),
  }),
})

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Register
router.post("/register", validate(registerSchema), async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, departmentId, phoneNumber, dateOfBirth, address } = req.body

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "User already exists with this email",
      })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Generate OTP
    const otp = generateOTP()
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        departmentId,
        phoneNumber,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        address,
      },
    })

    // Create OTP record
    await prisma.oTP.create({
      data: {
        userId: user.id,
        otp,
        type: "EMAIL_VERIFICATION",
        expiresAt: otpExpires,
      },
    })

    // Send OTP email
    await sendEmail(email, "Verify Your Email", generateOTPEmail(otp, firstName))

    logger.info(`User registered successfully: ${email}`)

    res.status(201).json({
      success: true,
      message: "Registration successful. Please check your email for OTP verification.",
      data: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        department: user.department,
        phoneNumber: user.phoneNumber,
        dateOfBirth: user.dateOfBirth,
        address: user.address,
      },
    })
  } catch (error) {
    logger.error("Registration error:", error)
    res.status(500).json({
      success: false,
      error: "Internal server error",
    })
  }
})

// Verify OTP
router.post("/verify-otp", validate(verifyOTPSchema), async (req, res) => {
  try {
    const { email, otp } = req.body

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      })
    }

    const otpRecord = await prisma.oTP.findFirst({
      where: {
        userId: user.id,
        otp,
        type: "EMAIL_VERIFICATION",
        expiresAt: { gt: new Date() },
        isUsed: false,
      },
    })

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired OTP",
      })
    }

    // Update user and OTP
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { isEmailVerified: true },
      }),
      prisma.oTP.update({
        where: { id: otpRecord.id },
        data: { isUsed: true },
      }),
    ])

    logger.info(`Email verified successfully: ${email}`)

    res.json({
      success: true,
      message: "Email verified successfully",
    })
  } catch (error) {
    logger.error("OTP verification error:", error)
    res.status(500).json({
      success: false,
      error: "Internal server error",
    })
  }
})

// resent OTP
router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body

    console.log(email);
    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      })
    }
   
    
   

    // Generate new OTP
    const otp = generateOTP()
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

// update the existing OTP 
    await prisma.oTP.updateMany({
      where: {
        userId: user.id,
        type: "EMAIL_VERIFICATION",
        isUsed: false,
      },
      data: {
        otp,
        expiresAt: otpExpires,
      },
    })

      

    

    // Send OTP email
    await sendEmail(email, "Verify Your Email", generateOTPEmail(otp, user.firstName))

    logger.info(`OTP resent successfully for ${email}`)

    res.json({
      success: true,
      message: "OTP resent successfully. Please check your email.",
    
    })
  
  } catch (error) {
    logger.error("Resend OTP error:", error)
    res.status(500).json({
      success: false,
      error: "Internal server error",
    })
  }
})

// forget password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      })
    }

    // Generate OTP
    const otp = generateOTP()
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // update existing OTP record
    await prisma.oTP.updateMany({
      where: {
        userId: user.id,
        type: "PASSWORD_RESET",
        isUsed: false,
      },
      data: {
        otp,
        expiresAt: otpExpires,
      },
    })

    // Send OTP email
    await sendEmail(email, "Password Reset OTP", generateOTPEmail(otp, user.firstName))

    logger.info(`Password reset OTP sent to ${email}`)

    res.json({
      success: true,
      message: "Password reset OTP sent. Please check your email.",
    })
  } catch (error) {
    logger.error("Forgot password error:", error)
    res.status(500).json({
      success: false,
      error: "Internal server error",
    })
  }
})

    


// Login
router.post("/login", validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({
      where: { email },
      include: { department: true },
    })

    if (!user || !user.isEmailVerified || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials or account not verified",
      })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      })
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    })

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    logger.info(`User logged in successfully: ${email}`)

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          department: user.department?.name,
          profileImage: user.profileImage,
          phoneNumber: user.phoneNumber,
          dateOfBirth: user.dateOfBirth,
          address: user.address,
        },
        token,
      },
    })
  } catch (error) {
    logger.error("Login error:", error)
    res.status(500).json({
      success: false,
      error: "Internal server error",
    })
  }
})

// Get current user
router.get("/me", authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: {
          select: {
            name: true,
          },
        },
      },
    })

    res.json({
      success: true,
      data: { user },
    })
  } catch (error) {
    logger.error("Get user error:", error)
    res.status(500).json({
      success: false,
      error: "Internal server error",
    })
  }
})

// Logout
router.post("/logout", (req, res) => {
  res.clearCookie("token")
  res.json({
    success: true,
    message: "Logged out successfully",
  })
})

export default router
