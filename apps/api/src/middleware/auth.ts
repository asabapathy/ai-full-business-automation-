import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { JwtPayload } from '@kanavu/types'
import { config } from '../config/index.js'
import { AuthenticationError, AuthorizationError } from '../utils/errors.js'
import { prisma } from '../services/database.js'

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        isSuperAdmin: boolean
        organizationId?: string
        role?: string
        permissions?: string[]
      }
      organizationId?: string
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthenticationError()
  }

  const token = authHeader.slice(7)
  let payload: JwtPayload

  try {
    payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload
  } catch {
    throw new AuthenticationError('Invalid or expired token')
  }

  if (payload.type !== 'access') {
    throw new AuthenticationError('Invalid token type')
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub, isActive: true },
    select: { id: true, email: true, isSuperAdmin: true },
  })

  if (!user) {
    throw new AuthenticationError('User not found')
  }

  req.user = { ...user, organizationId: payload.organizationId, role: payload.role }
  req.organizationId = payload.organizationId
  next()
}

export function requireRole(...roles: string[]) {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    const userRole = _req.user?.role
    if (!userRole || !roles.includes(userRole)) {
      throw new AuthorizationError(`Required role: ${roles.join(' or ')}`)
    }
    next()
  }
}

export function requireOrganization(req: Request, _res: Response, next: NextFunction): void {
  if (!req.organizationId) {
    throw new AuthenticationError('Organization context required')
  }
  next()
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    next()
    return
  }
  authenticate(req, res, next)
}
