import { describe, it, expect, vi } from 'vitest'
import { goalsService } from '../services/goals.service.js'
import { prisma } from '@kanavu/database'

const ORG = 'org-1'

const MOCK_GOAL = {
  id: 'goal-1',
  organizationId: ORG,
  title: 'Reach $100k MRR',
  category: 'Revenue',
  targetValue: '100000',
  currentValue: '50000',
  unit: '$',
  status: 'active',
}

describe('goalsService', () => {
  describe('createGoal', () => {
    it('creates with default currentValue of 0', async () => {
      vi.mocked(prisma.goal.create).mockResolvedValue(MOCK_GOAL as never)
      await goalsService.createGoal(ORG, { title: 'Reach $100k MRR', targetValue: 100000 })
      expect(prisma.goal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: ORG,
            title: 'Reach $100k MRR',
            targetValue: 100000,
            currentValue: 0,
          }),
        })
      )
    })
  })

  describe('updateProgress', () => {
    it('updates currentValue and keeps active status when below target', async () => {
      vi.mocked(prisma.goal.findFirst).mockResolvedValue(MOCK_GOAL as never)
      vi.mocked(prisma.goal.update).mockResolvedValue({ ...MOCK_GOAL, currentValue: '75000' } as never)
      await goalsService.updateProgress(ORG, 'goal-1', 75000)
      expect(prisma.goal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { currentValue: 75000, status: 'active' },
        })
      )
    })

    it('auto-sets status to achieved when currentValue >= targetValue', async () => {
      vi.mocked(prisma.goal.findFirst).mockResolvedValue(MOCK_GOAL as never)
      vi.mocked(prisma.goal.update).mockResolvedValue({ ...MOCK_GOAL, currentValue: '100000', status: 'achieved' } as never)
      await goalsService.updateProgress(ORG, 'goal-1', 100000)
      expect(prisma.goal.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { currentValue: 100000, status: 'achieved' } })
      )
    })

    it('sets achieved when currentValue exceeds targetValue', async () => {
      vi.mocked(prisma.goal.findFirst).mockResolvedValue(MOCK_GOAL as never)
      vi.mocked(prisma.goal.update).mockResolvedValue({ ...MOCK_GOAL, status: 'achieved' } as never)
      await goalsService.updateProgress(ORG, 'goal-1', 150000)
      expect(prisma.goal.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { currentValue: 150000, status: 'achieved' } })
      )
    })

    it('throws when goal not found', async () => {
      vi.mocked(prisma.goal.findFirst).mockResolvedValue(null)
      await expect(goalsService.updateProgress(ORG, 'bad-id', 50000)).rejects.toThrow('Goal not found')
    })
  })

  describe('getGoals', () => {
    it('returns all goals for org', async () => {
      vi.mocked(prisma.goal.findMany).mockResolvedValue([MOCK_GOAL] as never)
      const result = await goalsService.getGoals(ORG)
      expect(result).toHaveLength(1)
    })

    it('filters by status', async () => {
      vi.mocked(prisma.goal.findMany).mockResolvedValue([MOCK_GOAL] as never)
      await goalsService.getGoals(ORG, 'achieved')
      expect(prisma.goal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: ORG, status: 'achieved' } })
      )
    })
  })

  describe('getStats', () => {
    it('calculates achieved, active, and avgProgress', async () => {
      vi.mocked(prisma.goal.findMany).mockResolvedValue([
        { status: 'achieved', targetValue: '100', currentValue: '100' },
        { status: 'active', targetValue: '100', currentValue: '50' },
        { status: 'active', targetValue: '200', currentValue: '100' },
      ] as never)
      const stats = await goalsService.getStats(ORG)
      expect(stats.total).toBe(3)
      expect(stats.achieved).toBe(1)
      expect(stats.active).toBe(2)
      // avg: (100% + 50% + 50%) / 3 = 66.67 → "67"
      expect(Number(stats.avgProgress)).toBeCloseTo(67, 0)
    })

    it('returns 0 avgProgress for empty goals list', async () => {
      vi.mocked(prisma.goal.findMany).mockResolvedValue([] as never)
      const stats = await goalsService.getStats(ORG)
      expect(stats.total).toBe(0)
      expect(Number(stats.avgProgress)).toBe(0)
    })

    it('caps individual progress at 100% for avgProgress', async () => {
      vi.mocked(prisma.goal.findMany).mockResolvedValue([
        { status: 'achieved', targetValue: '100', currentValue: '200' },
      ] as never)
      const stats = await goalsService.getStats(ORG)
      expect(Number(stats.avgProgress)).toBe(100)
    })
  })

  describe('deleteGoal', () => {
    it('hard-deletes within org scope', async () => {
      vi.mocked(prisma.goal.deleteMany).mockResolvedValue({ count: 1 } as never)
      await goalsService.deleteGoal(ORG, 'goal-1')
      expect(prisma.goal.deleteMany).toHaveBeenCalledWith({
        where: { id: 'goal-1', organizationId: ORG },
      })
    })
  })
})
