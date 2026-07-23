export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(400, 'VALIDATION_ERROR', message, details)
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'AUTHENTICATION_ERROR', message)
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(403, 'AUTHORIZATION_ERROR', message)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message)
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(429, 'RATE_LIMIT', message)
  }
}
