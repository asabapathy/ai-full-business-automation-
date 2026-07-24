import { prisma } from '@kanavu/database'

export interface WhiteLabelConfig {
  enabled: boolean
  customDomain?: string
  brandName?: string
  logoUrl?: string
  faviconUrl?: string
  primaryColor?: string
  secondaryColor?: string
  supportEmail?: string
  supportPhone?: string
  hidePoweredBy?: boolean
  customCss?: string
}

export const whiteLabelService = {
  async getConfig(orgId: string): Promise<WhiteLabelConfig> {
    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { settings: true } })
    return ((org?.settings as any)?.whiteLabel ?? { enabled: false }) as WhiteLabelConfig
  },

  async saveConfig(orgId: string, config: Partial<WhiteLabelConfig>): Promise<WhiteLabelConfig> {
    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { settings: true } })
    const settings: any = org?.settings ?? {}
    settings.whiteLabel = { ...(settings.whiteLabel ?? {}), ...config }
    await prisma.organization.update({ where: { id: orgId }, data: { settings } })
    return settings.whiteLabel as WhiteLabelConfig
  },

  async verifyDomain(orgId: string, domain: string): Promise<{ verified: boolean; dnsInstructions: any[] }> {
    const expectedTxt = `kanavu-verify=${orgId}`
    try {
      const dns = await import('node:dns/promises')
      const records = await dns.resolveTxt(domain).catch(() => [])
      const verified = records.some((r: string[]) => r.join('').includes(expectedTxt))
      return {
        verified,
        dnsInstructions: [
          { type: 'TXT', host: `_kanavu-verify.${domain}`, value: expectedTxt, ttl: 3600 },
          { type: 'CNAME', host: `www.${domain}`, value: 'app.kanavu.ai', ttl: 3600 },
          { type: 'A', host: domain, value: process.env.WHITE_LABEL_IP ?? '35.0.0.0', ttl: 3600 },
        ],
      }
    } catch {
      return {
        verified: false,
        dnsInstructions: [
          { type: 'TXT', host: `_kanavu-verify.${domain}`, value: expectedTxt, ttl: 3600 },
          { type: 'CNAME', host: `www.${domain}`, value: 'app.kanavu.ai', ttl: 3600 },
          { type: 'A', host: domain, value: process.env.WHITE_LABEL_IP ?? '35.0.0.0', ttl: 3600 },
        ],
      }
    }
  },
}
