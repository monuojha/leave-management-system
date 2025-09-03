import nodemailer from "nodemailer"
import { logger } from "./logger"

const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST,
  port: Number.parseInt(process.env.MAILTRAP_PORT || "587"),
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS,
  },
})

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const info = await transporter.sendMail({
      from: '"Leave Management System" <noreply@leavemanagement.com>',
      to,
      subject,
      html,
    })

    logger.info(`Email sent successfully to ${to}:`, info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    logger.error("Failed to send email:", error)
    throw new Error("Failed to send email")
  }
}

export const generateOTPEmail = (otp: string, firstName: string) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0e877d;">Email Verification</h2>
      <p>Hello ${firstName},</p>
      <p>Thank you for registering with our Leave Management System. Please use the following OTP to verify your email address:</p>
      <div style="background-color: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0;">
        <h1 style="color: #0e877d; font-size: 32px; margin: 0;">${otp}</h1>
      </div>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you didn't create an account, please ignore this email.</p>
    </div>
  `
}

export const generatePasswordResetEmail = (resetToken: string, firstName: string) => {
  const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0e877d;">Password Reset Request</h2>
      <p>Hello ${firstName},</p>
      <p>You requested to reset your password. Click the button below to reset it:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #0e877d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
      </div>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    </div>
  `
}
