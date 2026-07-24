import { describe, it, expect, vi } from 'vitest'
import { timeTrackingService } from '../services/time-tracking.service.js'
import { prisma } from '@kanavu/database'

const ORG = 'org-1'
const START = new Date('2024-01-01T09:00:00Z')
const END = new Date('2024-01-01T10:30:00Z') // 90 minutes later

const MOCK_ENTRY = {
  id: 'te-1',
  organizationId: ORG,
  userId: 'user-1',
  description: 'Feature work',
  startTime: START,
  endTime: null,
  duration: null,
  billable: true,
  hourlyRate: '100.00',
}

describe('timeTrackingService', () => {
  describe('createEntry', () => {
    it('auto-calculates duration from startTime and endTime', async () => {
      vi.mocked(prisma.timeEntry.create).mockResolvedValue({ ...MOCK_ENTRY, endTime: END, duration: 90 } as never)
      await timeTrackingService.createEntry(ORG, {
        userId: 'user-1',
        description: 'Feature work',
        startTime: START,
        endTime: END,
      })
      expect(prisma.timeEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ duration: 90 }),
        })
      )
    })

    it('creates running timer with no endTime', async () => {
      vi.mocked(prisma.timeEntry.create).mockResolvedValue(MOCK_ENTRY as never)
      await timeTrackingService.createEntry(ORG, { userId: 'user-1', startTime: START })
      expect(prisma.timeEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ endTime: undefined }),
        })
      )
    })

    it('defaults billable to true', async () => {
      vi.mocked(prisma.timeEntry.create).mockResolvedValue(MOCK_ENTRY as never)
      await timeTrackingService.createEntry(ORG, { userId: 'user-1', startTime: START })
      expect(prisma.timeEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ billable: true }) })
      )
    })
  })

  describe('stopTimer', () => {
    it('sets endTime and calculates duration', async () => {
      vi.mocked(prisma.timeEntry.findFirst).mockResolvedValue(MOCK_ENTRY as never)
      vi.mocked(prisma.timeEntry.update).mockResolvedValue({ ...MOCK_ENTRY, endTime: new Date(), duration: 30 } as never)
      const result = await timeTrackingService.stopTimer(ORG, 'te-1')
      expect(prisma.timeEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'te-1' },
          data: expect.objectContaining({ endTime: expect.any(Date), duration: expect.any(Number) }),
        })
      )
      expect(result.duration).toBeGreaterThanOrEqual(0)
    })

    it('throws when entry not found', async () => {
      vi.mocked(prisma.timeEntry.findFirst).mockResolvedValue(null)
      await expect(timeTrackingService.stopTimer(ORG, 'bad-id')).rejects.toThrow('Entry not found')
    })

    it('throws when timer already stopped', async () => {
      vi.mocked(prisma.timeEntry.findFirst).mockResolvedValue({ ...MOCK_ENTRY, endTime: END } as never)
      await expect(timeTrackingService.stopTimer(ORG, 'te-1')).rejects.toThrow('Timer already stopped')
    })
  })

  describe('getStats', () => {
    it('calculates hours and billable revenue', async () => {
      vi.mocked(prisma.timeEntry.findMany).mockResolvedValue([
        { duration: 60, billable: true, hourlyRate: '100.00' },
        { duration: 120, billable: true, hourlyRate: '50.00' },
        { duration: 30, billable: false, hourlyRate: null },
      ] as never)
      const stats = await timeTrackingService.getStats(ORG)
      expect(stats.totalHours).toBe('3.5') // (60+120+30)/60
      expect(stats.billableHours).toBe('3.0') // (60+120)/60
      expect(stats.billableRevenue).toBeCloseTo(100 + 100) // 1hr*100 + 2hr*50
      expect(stats.entries).toBe(3)
    })

    it('returns zeros for no entries', async () => {
      vi.mocked(prisma.timeEntry.findMany).mockResolvedValue([] as never)
      const stats = await timeTrackingService.getStats(ORG)
      expect(stats.totalHours).toBe('0.0')
      expect(stats.billableRevenue).toBe(0)
    })
  })

  describe('deleteEntry', () => {
    it('deletes within org scope', async () => {
      vi.mocked(prisma.timeEntry.deleteMany).mockResolvedValue({ count: 1 } as never)
      await timeTrackingService.deleteEntry(ORG, 'te-1')
      expect(prisma.timeEntry.deleteMany).toHaveBeenCalledWith({
        where: { id: 'te-1', organizationId: ORG },
      })
    })
  })
})
