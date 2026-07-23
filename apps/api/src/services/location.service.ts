import { prisma } from './database.js'

interface LocationData {
  name: string
  address?: Record<string, unknown>
  phone?: string
  email?: string
  timezone?: string
  businessHours?: Record<string, unknown>
  isDefault?: boolean
}

export class LocationService {
  async createLocation(orgId: string, data: LocationData) {
    if (data.isDefault) {
      await prisma.location.updateMany({
        where: { organizationId: orgId, isDefault: true },
        data: { isDefault: false },
      })
    }
    return prisma.location.create({
      data: {
        organizationId: orgId,
        name: data.name,
        address: data.address ?? {},
        phone: data.phone,
        email: data.email,
        timezone: data.timezone ?? 'America/New_York',
        businessHours: data.businessHours ?? {},
        isDefault: data.isDefault ?? false,
      },
    })
  }

  async getLocations(orgId: string) {
    return prisma.location.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })
  }

  async getLocation(orgId: string, id: string) {
    return prisma.location.findFirst({ where: { id, organizationId: orgId } })
  }

  async updateLocation(orgId: string, id: string, data: Partial<LocationData>) {
    if (data.isDefault) {
      await prisma.location.updateMany({
        where: { organizationId: orgId, isDefault: true },
        data: { isDefault: false },
      })
    }
    return prisma.location.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.timezone !== undefined && { timezone: data.timezone }),
        ...(data.businessHours !== undefined && { businessHours: data.businessHours }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
      },
    })
  }

  async deleteLocation(orgId: string, id: string): Promise<void> {
    await prisma.location.updateMany({
      where: { id, organizationId: orgId },
      data: { isActive: false },
    })
  }
}

export const locationService = new LocationService()
