import { PrismaClient } from "@prisma/client"
import { logger } from "../utils/logger"

declare global {
  var __prisma: PrismaClient | undefined
}

let prisma: PrismaClient

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient()
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient()
  }
  prisma = global.__prisma
}

// Connect to database
prisma
  .$connect()
  .then(() => {
    logger.info("Connected to database successfully")
  })
  .catch((error) => {
    logger.error("Failed to connect to database:", error)
    process.exit(1)
  })

export { prisma }
