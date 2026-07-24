import type { Request, Response, NextFunction } from 'express'
import { prisma } from '@kanavu/database'
import { logger } from '../utils/logger.js'

declare global {
  namespace Express {
    interface Request {
      whiteLabel?: {
        organizationId: string
        brandName: string
        logoUrl?: string
        primaryColor?: string
        domain: string
      }
    }
  }
}

const domainCache = new Map<string, { orgId: string; branding: any; expiresAt: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function resolveOrg(domain: string): Promise<{ orgId: string; branding: any } | null> {
  const cached = domainCache.get(domain)
  if (cached && cached.expiresAt > Date.now()) {
    return { orgId: cached.orgId, branding: cached.branding }
  }

  try {
    const org = await (prisma as any).organization.findFirst({
      where: { settings: { path: ['whiteLabel', 'customDomain'], equals: domain } },
      select: { id: true, settings: true, name: true },
    })

    if (!org) return null
    const branding = (org.settings as any)?.whiteLabel ?? {}
    domainCache.set(domain, { orgId: org.id, branding: { ...branding, brandName: branding.brandName ?? org.name }, expiresAt: Date.now() + CACHE_TTL })
    return { orgId: org.id, branding: { ...branding, brandName: branding.brandName ?? org.name } }
  } catch (err) {
    logger.warn({ domain, err }, 'white label domain resolve error')
    return null
  }
}

export function whiteLabelMiddleware(req: Request, _res: Response, next: NextFunction) {
  const host = req.hostname ?? req.headers.host?.split(':')[0] ?? ''
  const isKanavuDomain = host.endsWith('.kanavu.ai') || host === 'kanavu.ai' || host === 'localhost' || host === '127.0.0.1'

  if (isKanavuDomain) return next()

  resolveOrg(host)
    .then(result => {
      if (result) {
        req.whiteLabel = {
          organizationId: result.orgId,
          brandName: result.branding.brandName,
          logoUrl: result.branding.logoUrl,
          primaryColor: result.branding.primaryColor,
          domain: host,
        }
      }
      next()
    })
    .catch(() => next())
}
