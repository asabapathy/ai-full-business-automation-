import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    })
    return
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      details: err.flatten().fieldErrors,
    })
    return
  }

  logger.error({ err }, 'Unhandled error')
  res.status(500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  })
}
