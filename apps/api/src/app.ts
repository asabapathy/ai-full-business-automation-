import 'express-async-errors'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import { config } from './config/index.js'
import { apiRouter } from './routes/index.js'
import { errorHandler } from './middleware/error-handler.js'
import { logger } from './utils/logger.js'

export function createApp(): express.Application {
  const app = express()

  // Security headers
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: config.NODE_ENV === 'production',
  }))

  // CORS
  app.use(cors({
    origin: (origin, callback) => {
      const allowed = [config.APP_URL, config.API_URL]
      if (!origin || allowed.includes(origin) || config.NODE_ENV === 'development') {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
  }))

  // Compression
  app.use(compression())

  // Body parsing
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))
  app.use(cookieParser())

  // Logging
  if (config.NODE_ENV !== 'test') {
    app.use(morgan('combined', {
      stream: { write: msg => logger.info(msg.trim()) },
    }))
  }

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ success: false, error: 'RATE_LIMIT', message: 'Too many requests' })
    },
  })
  app.use('/api', limiter)

  // Routes
  app.use('/api/v1', apiRouter)

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Endpoint not found' })
  })

  // Error handler (must be last)
  app.use(errorHandler)

  return app
}
