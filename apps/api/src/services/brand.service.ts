import { prisma } from './database.js'

interface BrandData {
  brandName?: string
  logoUrl?: string
  faviconUrl?: string
  primaryColor?: string
  accentColor?: string
  customDomain?: string
  customCss?: string
  emailFromName?: string
  emailFromAddr?: string
  hideKanavuBranding?: boolean
}

export class BrandService {
  async getBrandConfig(orgId: string) {
    return prisma.brandConfig.findUnique({ where: { organizationId: orgId } })
  }

  async upsertBrandConfig(orgId: string, data: BrandData) {
    return prisma.brandConfig.upsert({
      where: { organizationId: orgId },
      create: {
        organizationId: orgId,
        brandName: data.brandName,
        logoUrl: data.logoUrl,
        faviconUrl: data.faviconUrl,
        primaryColor: data.primaryColor ?? '#6366f1',
        accentColor: data.accentColor ?? '#8b5cf6',
        customDomain: data.customDomain,
        customCss: data.customCss,
        emailFromName: data.emailFromName,
        emailFromAddr: data.emailFromAddr,
        hideKanavuBranding: data.hideKanavuBranding ?? false,
      },
      update: {
        ...(data.brandName !== undefined && { brandName: data.brandName }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
        ...(data.faviconUrl !== undefined && { faviconUrl: data.faviconUrl }),
        ...(data.primaryColor !== undefined && { primaryColor: data.primaryColor }),
        ...(data.accentColor !== undefined && { accentColor: data.accentColor }),
        ...(data.customDomain !== undefined && { customDomain: data.customDomain }),
        ...(data.customCss !== undefined && { customCss: data.customCss }),
        ...(data.emailFromName !== undefined && { emailFromName: data.emailFromName }),
        ...(data.emailFromAddr !== undefined && { emailFromAddr: data.emailFromAddr }),
        ...(data.hideKanavuBranding !== undefined && { hideKanavuBranding: data.hideKanavuBranding }),
      },
    })
  }
}

export const brandService = new BrandService()
