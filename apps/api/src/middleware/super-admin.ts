import type { Request, Response, NextFunction } from 'express'
import { AuthorizationError } from '../utils/errors.js'

export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user?.isSuperAdmin) {
    throw new AuthorizationError('Super admin access required')
  }
  next()
}
