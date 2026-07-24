import { describe, it, expect, vi } from 'vitest'
import { estimatesService } from '../services/estimates.service.js'
import { prisma } from '@kanavu/database'

const ORG = 'org-1'

const LINE_ITEMS = [
  { description: 'Design', quantity: 1, unitPrice: 500, total: 500 },
  { description: 'Dev', quantity: 2, unitPrice: 1000, total: 2000 },
]

const MOCK_ESTIMATE = {
  id: 'est-1',
  organizationId: ORG,
  estimateNumber: 'EST-0001',
  title: 'Website project',
  status: 'draft',
  subtotal: '2500.00',
  tax: '0.00',
  total: '2500.00',
  lineItems: LINE_ITEMS,
  currency: 'USD',
}

describe('estimatesService', () => {
  describe('createEstimate', () => {
    it('auto-generates EST number and calculates totals', async () => {
      vi.mocked(prisma.estimate.count).mockResolvedValue(0)
      vi.mocked(prisma.estimate.create).mockResolvedValue(MOCK_ESTIMATE as never)
      await estimatesService.createEstimate(ORG, { lineItems: LINE_ITEMS })
      expect(prisma.estimate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estimateNumber: 'EST-0001',
            subtotal: 2500,
            tax: 0,
            total: 2500,
          }),
        })
      )
    })

    it('numbers sequentially from existing count', async () => {
      vi.mocked(prisma.estimate.count).mockResolvedValue(4)
      vi.mocked(prisma.estimate.create).mockResolvedValue({ ...MOCK_ESTIMATE, estimateNumber: 'EST-0005' } as never)
      await estimatesService.createEstimate(ORG, { lineItems: LINE_ITEMS })
      expect(prisma.estimate.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ estimateNumber: 'EST-0005' }) })
      )
    })

    it('applies tax rate to subtotal', async () => {
      vi.mocked(prisma.estimate.count).mockResolvedValue(0)
      vi.mocked(prisma.estimate.create).mockResolvedValue(MOCK_ESTIMATE as never)
      await estimatesService.createEstimate(ORG, { lineItems: LINE_ITEMS, taxRate: 10 })
      expect(prisma.estimate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: 2500,
            tax: 250,
            total: 2750,
          }),
        })
      )
    })
  })

  describe('sendEstimate', () => {
    it('transitions draft to sent', async () => {
      vi.mocked(prisma.estimate.findFirst).mockResolvedValue(MOCK_ESTIMATE as never)
      vi.mocked(prisma.estimate.update).mockResolvedValue({ ...MOCK_ESTIMATE, status: 'sent' } as never)
      await estimatesService.sendEstimate(ORG, 'est-1')
      expect(prisma.estimate.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'sent' }) })
      )
    })

    it('throws when estimate not found', async () => {
      vi.mocked(prisma.estimate.findFirst).mockResolvedValue(null)
      await expect(estimatesService.sendEstimate(ORG, 'bad-id')).rejects.toThrow('Estimate not found')
    })

    it('throws when estimate is not draft', async () => {
      vi.mocked(prisma.estimate.findFirst).mockResolvedValue({ ...MOCK_ESTIMATE, status: 'sent' } as never)
      await expect(estimatesService.sendEstimate(ORG, 'est-1')).rejects.toThrow('Only draft estimates can be sent')
    })
  })

  describe('acceptEstimate', () => {
    it('marks sent estimate as accepted', async () => {
      vi.mocked(prisma.estimate.updateMany).mockResolvedValue({ count: 1 } as never)
      await estimatesService.acceptEstimate(ORG, 'est-1')
      expect(prisma.estimate.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'est-1', organizationId: ORG, status: 'sent' },
          data: expect.objectContaining({ status: 'accepted' }),
        })
      )
    })
  })

  describe('rejectEstimate', () => {
    it('marks sent estimate as rejected', async () => {
      vi.mocked(prisma.estimate.updateMany).mockResolvedValue({ count: 1 } as never)
      await estimatesService.rejectEstimate(ORG, 'est-1')
      expect(prisma.estimate.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'est-1', organizationId: ORG, status: 'sent' },
          data: expect.objectContaining({ status: 'rejected' }),
        })
      )
    })
  })

  describe('deleteEstimate', () => {
    it('only deletes drafts', async () => {
      vi.mocked(prisma.estimate.deleteMany).mockResolvedValue({ count: 1 } as never)
      await estimatesService.deleteEstimate(ORG, 'est-1')
      expect(prisma.estimate.deleteMany).toHaveBeenCalledWith({
        where: { id: 'est-1', organizationId: ORG, status: 'draft' },
      })
    })
  })

  describe('getStats', () => {
    it('groups by status and sums accepted value', async () => {
      vi.mocked(prisma.estimate.findMany).mockResolvedValue([
        { status: 'draft', total: '500.00' },
        { status: 'accepted', total: '1000.00' },
        { status: 'accepted', total: '2000.00' },
        { status: 'rejected', total: '300.00' },
      ] as never)
      const stats = await estimatesService.getStats(ORG)
      expect(stats.total).toBe(4)
      expect(stats.byStatus['draft']).toBe(1)
      expect(stats.byStatus['accepted']).toBe(2)
      expect(stats.acceptedValue).toBeCloseTo(3000)
    })
  })
})
