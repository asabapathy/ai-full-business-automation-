import { describe, it, expect, vi } from 'vitest'
import { onboardingService } from '../services/onboarding.service.js'
import { prisma } from '@kanavu/database'

const ORG = 'org-1'

const MOCK_CHECKLIST = {
  id: 'cl-1',
  organizationId: ORG,
  contactId: 'contact-1',
  title: 'Onboard Acme Corp',
  status: 'pending',
  items: [
    { id: 'item-1', checklistId: 'cl-1', title: 'Welcome call scheduled', isCompleted: false, order: 0 },
    { id: 'item-2', checklistId: 'cl-1', title: 'Contract signed', isCompleted: false, order: 1 },
  ],
}

const MOCK_ITEM = MOCK_CHECKLIST.items[0]

describe('onboardingService', () => {
  describe('createChecklist', () => {
    it('uses DEFAULT_ITEMS when no customItems provided', async () => {
      vi.mocked(prisma.onboardingChecklist.create).mockResolvedValue(MOCK_CHECKLIST as never)
      await onboardingService.createChecklist(ORG, { contactId: 'contact-1', title: 'Onboard Acme Corp' })
      const call = vi.mocked(prisma.onboardingChecklist.create).mock.calls[0][0] as any
      expect(call.data.items.create).toHaveLength(5)
      expect(call.data.items.create[0].title).toBe('Welcome call scheduled')
    })

    it('uses customItems when provided', async () => {
      vi.mocked(prisma.onboardingChecklist.create).mockResolvedValue(MOCK_CHECKLIST as never)
      const customItems = [{ title: 'Custom step', order: 0 }]
      await onboardingService.createChecklist(ORG, {
        contactId: 'contact-1',
        title: 'Onboard Acme Corp',
        customItems,
      })
      const call = vi.mocked(prisma.onboardingChecklist.create).mock.calls[0][0] as any
      expect(call.data.items.create).toHaveLength(1)
      expect(call.data.items.create[0].title).toBe('Custom step')
    })

    it('stores organizationId and contactId on checklist', async () => {
      vi.mocked(prisma.onboardingChecklist.create).mockResolvedValue(MOCK_CHECKLIST as never)
      await onboardingService.createChecklist(ORG, { contactId: 'contact-1', title: 'Onboard Acme Corp' })
      expect(prisma.onboardingChecklist.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ organizationId: ORG, contactId: 'contact-1' }),
        })
      )
    })
  })

  describe('toggleItem', () => {
    it('flips isCompleted from false to true', async () => {
      vi.mocked(prisma.onboardingChecklist.findFirst).mockResolvedValue(MOCK_CHECKLIST as never)
      vi.mocked(prisma.onboardingItem.findFirst).mockResolvedValue(MOCK_ITEM as never)
      vi.mocked(prisma.onboardingItem.update).mockResolvedValue({ ...MOCK_ITEM, isCompleted: true } as never)
      vi.mocked(prisma.onboardingItem.findMany).mockResolvedValue([
        { ...MOCK_ITEM, isCompleted: true },
        { ...MOCK_CHECKLIST.items[1], isCompleted: false },
      ] as never)
      vi.mocked(prisma.onboardingChecklist.update).mockResolvedValue(MOCK_CHECKLIST as never)

      await onboardingService.toggleItem(ORG, 'cl-1', 'item-1')
      expect(prisma.onboardingItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isCompleted: true }) })
      )
    })

    it('sets status to completed when all items are done', async () => {
      vi.mocked(prisma.onboardingChecklist.findFirst).mockResolvedValue(MOCK_CHECKLIST as never)
      vi.mocked(prisma.onboardingItem.findFirst).mockResolvedValue(MOCK_ITEM as never)
      vi.mocked(prisma.onboardingItem.update).mockResolvedValue({ ...MOCK_ITEM, isCompleted: true } as never)
      vi.mocked(prisma.onboardingItem.findMany).mockResolvedValue([
        { ...MOCK_CHECKLIST.items[0], isCompleted: true },
        { ...MOCK_CHECKLIST.items[1], isCompleted: true },
      ] as never)
      vi.mocked(prisma.onboardingChecklist.update).mockResolvedValue({ ...MOCK_CHECKLIST, status: 'completed' } as never)

      await onboardingService.toggleItem(ORG, 'cl-1', 'item-1')
      expect(prisma.onboardingChecklist.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'completed' } })
      )
    })

    it('sets status to in_progress when some items remain', async () => {
      vi.mocked(prisma.onboardingChecklist.findFirst).mockResolvedValue(MOCK_CHECKLIST as never)
      vi.mocked(prisma.onboardingItem.findFirst).mockResolvedValue(MOCK_ITEM as never)
      vi.mocked(prisma.onboardingItem.update).mockResolvedValue({ ...MOCK_ITEM, isCompleted: true } as never)
      vi.mocked(prisma.onboardingItem.findMany).mockResolvedValue([
        { ...MOCK_CHECKLIST.items[0], isCompleted: true },
        { ...MOCK_CHECKLIST.items[1], isCompleted: false },
      ] as never)
      vi.mocked(prisma.onboardingChecklist.update).mockResolvedValue(MOCK_CHECKLIST as never)

      await onboardingService.toggleItem(ORG, 'cl-1', 'item-1')
      expect(prisma.onboardingChecklist.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'in_progress' } })
      )
    })

    it('throws when checklist not found', async () => {
      vi.mocked(prisma.onboardingChecklist.findFirst).mockResolvedValue(null)
      await expect(onboardingService.toggleItem(ORG, 'bad-id', 'item-1')).rejects.toThrow('Checklist not found')
    })

    it('throws when item not found', async () => {
      vi.mocked(prisma.onboardingChecklist.findFirst).mockResolvedValue(MOCK_CHECKLIST as never)
      vi.mocked(prisma.onboardingItem.findFirst).mockResolvedValue(null)
      await expect(onboardingService.toggleItem(ORG, 'cl-1', 'bad-item')).rejects.toThrow('Item not found')
    })
  })

  describe('addItem', () => {
    it('appends item after existing items using maxOrder + 1', async () => {
      const checklistWithItems = {
        ...MOCK_CHECKLIST,
        items: [{ order: 0 }, { order: 1 }, { order: 2 }],
      }
      vi.mocked(prisma.onboardingChecklist.findFirst).mockResolvedValue(checklistWithItems as never)
      vi.mocked(prisma.onboardingItem.create).mockResolvedValue({ id: 'item-new', title: 'New Step' } as never)

      await onboardingService.addItem(ORG, 'cl-1', { title: 'New Step' })
      expect(prisma.onboardingItem.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ order: 3, title: 'New Step' }) })
      )
    })

    it('uses order 0 when no existing items', async () => {
      vi.mocked(prisma.onboardingChecklist.findFirst).mockResolvedValue({ ...MOCK_CHECKLIST, items: [] } as never)
      vi.mocked(prisma.onboardingItem.create).mockResolvedValue({ id: 'item-new', title: 'First' } as never)

      await onboardingService.addItem(ORG, 'cl-1', { title: 'First' })
      expect(prisma.onboardingItem.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ order: 0 }) })
      )
    })

    it('throws when checklist not found', async () => {
      vi.mocked(prisma.onboardingChecklist.findFirst).mockResolvedValue(null)
      await expect(onboardingService.addItem(ORG, 'bad-id', { title: 'X' })).rejects.toThrow('Checklist not found')
    })
  })

  describe('deleteChecklist', () => {
    it('deletes within org scope', async () => {
      vi.mocked(prisma.onboardingChecklist.deleteMany).mockResolvedValue({ count: 1 } as never)
      await onboardingService.deleteChecklist(ORG, 'cl-1')
      expect(prisma.onboardingChecklist.deleteMany).toHaveBeenCalledWith({
        where: { id: 'cl-1', organizationId: ORG },
      })
    })
  })

  describe('getStats', () => {
    it('returns total and byStatus counts', async () => {
      vi.mocked(prisma.onboardingChecklist.findMany).mockResolvedValue([
        { status: 'pending' },
        { status: 'in_progress' },
        { status: 'in_progress' },
        { status: 'completed' },
      ] as never)
      const stats = await onboardingService.getStats(ORG)
      expect(stats.total).toBe(4)
      expect(stats.byStatus['pending']).toBe(1)
      expect(stats.byStatus['in_progress']).toBe(2)
      expect(stats.byStatus['completed']).toBe(1)
    })

    it('returns 0 total and empty byStatus for no checklists', async () => {
      vi.mocked(prisma.onboardingChecklist.findMany).mockResolvedValue([] as never)
      const stats = await onboardingService.getStats(ORG)
      expect(stats.total).toBe(0)
      expect(stats.byStatus).toEqual({})
    })
  })
})
