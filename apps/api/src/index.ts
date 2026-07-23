import { createApp } from './app.js'
import { config } from './config/index.js'
import { connectDatabase, disconnectDatabase } from './services/database.js'
import { connectRedis, disconnectRedis } from './services/redis.js'
import { logger } from './utils/logger.js'

async function bootstrap(): Promise<void> {
  logger.info({ env: config.NODE_ENV }, 'Starting Kanavu AI API...')

  await connectDatabase()
  await connectRedis()

  const app = createApp()

  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, `API server listening`)
  })

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down...')
    server.close(async () => {
      await disconnectDatabase()
      await disconnectRedis()
      logger.info('Shutdown complete')
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 10000)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection')
  })
}

bootstrap().catch(err => {
  logger.error({ err }, 'Failed to start')
  process.exit(1)
})
