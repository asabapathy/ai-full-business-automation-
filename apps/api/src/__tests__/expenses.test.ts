import { describe, it, expect, vi } from 'vitest'
import { expensesService } from '../services/expenses.service.js'
import { prisma } from '@kanavu/database'

const ORG = 'org-1'
const NOW = new Date()

const MOCK_EXPENSE = {
  id: 'exp-1',
  organizationId: ORG,
  category: 'Software',
  description: 'VS Code license',
  amount: '99.00',
  currency: 'USD',
  date: NOW,
  isRecurring: false,
  vendorId: null,
  receiptUrl: null,
}

describe('expensesService', () => {
  describe('getExpenses', () => {
    it('returns all expenses for org', async () => {
      vi.mocked(prisma.expense.findMany).mockResolvedValue([MOCK_EXPENSE] as never)
      const result = await expensesService.getExpenses(ORG)
      expect(prisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: ORG } })
      )
      expect(result).toHaveLength(1)
    })

    it('filters by category', async () => {
      vi.mocked(prisma.expense.findMany).mockResolvedValue([MOCK_EXPENSE] as never)
      await expensesService.getExpenses(ORG, { category: 'Software' })
      expect(prisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: ORG, category: 'Software' } })
      )
    })
  })

  describe('createExpense', () => {
    it('creates expense with defaults', async () => {
      vi.mocked(prisma.expense.create).mockResolvedValue(MOCK_EXPENSE as never)
      const result = await expensesService.createExpense(ORG, {
        category: 'Software',
        description: 'VS Code license',
        amount: 99,
        date: NOW,
      })
      expect(prisma.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: ORG,
            category: 'Software',
            currency: 'USD',
            isRecurring: false,
          }),
        })
      )
      expect(result.category).toBe('Software')
    })

    it('passes vendor id when provided', async () => {
      vi.mocked(prisma.expense.create).mockResolvedValue({ ...MOCK_EXPENSE, vendorId: 'v-1' } as never)
      await expensesService.createExpense(ORG, {
        category: 'Software',
        description: 'Tool',
        amount: 50,
        date: NOW,
        vendorId: 'v-1',
      })
      expect(prisma.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ vendorId: 'v-1' }) })
      )
    })
  })

  describe('updateExpense', () => {
    it('calls updateMany with org scope', async () => {
      vi.mocked(prisma.expense.updateMany).mockResolvedValue({ count: 1 } as never)
      await expensesService.updateExpense(ORG, 'exp-1', { description: 'Updated' })
      expect(prisma.expense.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'exp-1', organizationId: ORG } })
      )
    })
  })

  describe('deleteExpense', () => {
    it('deletes within org scope', async () => {
      vi.mocked(prisma.expense.deleteMany).mockResolvedValue({ count: 1 } as never)
      await expensesService.deleteExpense(ORG, 'exp-1')
      expect(prisma.expense.deleteMany).toHaveBeenCalledWith({
        where: { id: 'exp-1', organizationId: ORG },
      })
    })
  })

  describe('getStats', () => {
    it('calculates totals, thisMonth, and byCategory', async () => {
      const thisMonthDate = new Date()
      vi.mocked(prisma.expense.findMany).mockResolvedValue([
        { amount: '100.00', category: 'Software', date: thisMonthDate },
        { amount: '200.00', category: 'Office', date: thisMonthDate },
        { amount: '50.00', category: 'Software', date: new Date('2020-01-01') },
      ] as never)
      const stats = await expensesService.getStats(ORG)
      expect(stats.total).toBeCloseTo(350)
      expect(stats.thisMonth).toBeCloseTo(300)
      expect(stats.count).toBe(3)
      expect(stats.byCategory['Software']).toBeCloseTo(150)
      expect(stats.byCategory['Office']).toBeCloseTo(200)
    })

    it('returns zeros when no expenses', async () => {
      vi.mocked(prisma.expense.findMany).mockResolvedValue([] as never)
      const stats = await expensesService.getStats(ORG)
      expect(stats.total).toBe(0)
      expect(stats.count).toBe(0)
    })
  })

  describe('getCategories', () => {
    it('returns distinct categories', async () => {
      vi.mocked(prisma.expense.findMany).mockResolvedValue([
        { category: 'Software' },
        { category: 'Office' },
      ] as never)
      const cats = await expensesService.getCategories(ORG)
      expect(cats).toEqual(['Software', 'Office'])
    })
  })
})
