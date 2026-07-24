import { describe, it, expect, vi } from 'vitest'
import { contractsService } from '../services/contracts.service.js'
import { prisma } from '@kanavu/database'

const ORG = 'org-1'

const MOCK_CONTRACT = {
  id: 'contract-1',
  organizationId: ORG,
  title: 'Service Agreement',
  content: 'Terms and conditions...',
  status: 'draft',
  value: '5000.00',
  currency: 'USD',
}

describe('contractsService', () => {
  describe('createContract', () => {
    it('creates with draft status and USD default', async () => {
      vi.mocked(prisma.contract.create).mockResolvedValue(MOCK_CONTRACT as never)
      await contractsService.createContract(ORG, {
        title: 'Service Agreement',
        content: 'Terms...',
        value: 5000,
      })
      expect(prisma.contract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: ORG,
            title: 'Service Agreement',
            currency: 'USD',
          }),
        })
      )
    })
  })

  describe('sendContract', () => {
    it('transitions draft to sent using updateMany', async () => {
      vi.mocked(prisma.contract.updateMany).mockResolvedValue({ count: 1 } as never)
      await contractsService.sendContract(ORG, 'contract-1')
      expect(prisma.contract.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'contract-1', organizationId: ORG, status: 'draft' },
          data: expect.objectContaining({ status: 'sent' }),
        })
      )
    })
  })

  describe('markSigned', () => {
    it('transitions sent to signed using updateMany', async () => {
      vi.mocked(prisma.contract.updateMany).mockResolvedValue({ count: 1 } as never)
      await contractsService.markSigned(ORG, 'contract-1')
      expect(prisma.contract.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'contract-1', organizationId: ORG, status: 'sent' },
          data: expect.objectContaining({ status: 'signed', signedAt: expect.any(Date) }),
        })
      )
    })
  })

  describe('updateContract', () => {
    it('only updates draft or sent contracts', async () => {
      vi.mocked(prisma.contract.updateMany).mockResolvedValue({ count: 1 } as never)
      await contractsService.updateContract(ORG, 'contract-1', { title: 'Updated' })
      expect(prisma.contract.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'contract-1', organizationId: ORG, status: { in: ['draft', 'sent'] } },
        })
      )
    })
  })

  describe('deleteContract', () => {
    it('only deletes draft contracts', async () => {
      vi.mocked(prisma.contract.deleteMany).mockResolvedValue({ count: 1 } as never)
      await contractsService.deleteContract(ORG, 'contract-1')
      expect(prisma.contract.deleteMany).toHaveBeenCalledWith({
        where: { id: 'contract-1', organizationId: ORG, status: 'draft' },
      })
    })
  })

  describe('getStats', () => {
    it('calculates byStatus and signedValue', async () => {
      vi.mocked(prisma.contract.findMany).mockResolvedValue([
        { status: 'draft', value: '1000.00' },
        { status: 'sent', value: '2000.00' },
        { status: 'signed', value: '5000.00' },
        { status: 'signed', value: '3000.00' },
      ] as never)
      const stats = await contractsService.getStats(ORG)
      expect(stats.total).toBe(4)
      expect(stats.byStatus['draft']).toBe(1)
      expect(stats.byStatus['signed']).toBe(2)
      expect(stats.signedValue).toBeCloseTo(8000)
    })

    it('signedValue is 0 when no signed contracts', async () => {
      vi.mocked(prisma.contract.findMany).mockResolvedValue([
        { status: 'draft', value: null },
      ] as never)
      const stats = await contractsService.getStats(ORG)
      expect(stats.signedValue).toBe(0)
    })
  })
})
