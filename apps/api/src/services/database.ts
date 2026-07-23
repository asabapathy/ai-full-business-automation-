import { PrismaClient } from '@kanavu/database'
import { logger } from '../utils/logger.js'

declare global {
  var __prisma: PrismaClient | undefined
}

export const prisma: PrismaClient =
  globalThis.__prisma ??
  new PrismaClient({
    log:
      process.env['NODE_ENV'] === 'development'
        ? [{ emit: 'event', level: 'query' }, 'info', 'warn', 'error']
        : ['warn', 'error'],
  })

if (process.env['NODE_ENV'] === 'development') {
  globalThis.__prisma = prisma
}

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect()
    logger.info('Database connected')
  } catch (err) {
    logger.error({ err }, 'Failed to connect to database')
    throw err
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect()
  logger.info('Database disconnected')
}
