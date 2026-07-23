import type { Request, Response, NextFunction } from 'express'
import type { ZodSchema } from 'zod'

export function validate<T>(schema: ZodSchema<T>, target: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const data = req[target]
    const result = schema.safeParse(data)
    if (!result.success) {
      throw result.error
    }
    req[target] = result.data as typeof req[typeof target]
    next()
  }
}
