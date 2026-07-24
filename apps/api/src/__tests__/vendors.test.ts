import { describe, it, expect, vi } from 'vitest'
import { vendorsService } from '../services/vendors.service.js'
import { prisma } from '@kanavu/database'

const ORG = 'org-1'

const MOCK_VENDOR = {
  id: 'v-1',
  organizationId: ORG,
  name: 'Acme Corp',
  email: 'billing@acme.com',
  phone: '+1555000001',
  website: 'https://acme.com',
  category: 'Software',
  isActive: true,
}

describe('vendorsService', () => {
  describe('getVendors', () => {
    it('returns active vendors for org', async () => {
      vi.mocked(prisma.vendor.findMany).mockResolvedValue([MOCK_VENDOR] as never)
      const result = await vendorsService.getVendors(ORG)
      expect(prisma.vendor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: ORG, isActive: true } })
      )
      expect(result).toHaveLength(1)
    })

    it('adds OR search condition when search is provided', async () => {
      vi.mocked(prisma.vendor.findMany).mockResolvedValue([MOCK_VENDOR] as never)
      await vendorsService.getVendors(ORG, 'Acme')
      const call = vi.mocked(prisma.vendor.findMany).mock.calls[0][0] as any
      expect(call.where.OR).toBeDefined()
      expect(call.where.OR).toHaveLength(3)
    })
  })

  describe('createVendor', () => {
    it('creates vendor with provided fields', async () => {
      vi.mocked(prisma.vendor.create).mockResolvedValue(MOCK_VENDOR as never)
      await vendorsService.createVendor(ORG, {
        name: 'Acme Corp',
        email: 'billing@acme.com',
        category: 'Software',
      })
      expect(prisma.vendor.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: ORG,
            name: 'Acme Corp',
            email: 'billing@acme.com',
            category: 'Software',
          }),
        })
      )
    })
  })

  describe('deleteVendor', () => {
    it('soft-deletes by setting isActive to false', async () => {
      vi.mocked(prisma.vendor.updateMany).mockResolvedValue({ count: 1 } as never)
      await vendorsService.deleteVendor(ORG, 'v-1')
      expect(prisma.vendor.updateMany).toHaveBeenCalledWith({
        where: { id: 'v-1', organizationId: ORG },
        data: { isActive: false },
      })
    })
  })

  describe('getStats', () => {
    it('returns total, active, and categories', async () => {
      vi.mocked(prisma.vendor.count)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(8)
      vi.mocked(prisma.vendor.findMany).mockResolvedValue([
        { category: 'Software' },
        { category: 'Office' },
        { category: null },
      ] as never)
      const stats = await vendorsService.getStats(ORG)
      expect(stats.total).toBe(10)
      expect(stats.active).toBe(8)
      expect(stats.categories).toEqual(['Software', 'Office']) // null filtered out
    })
  })
})
