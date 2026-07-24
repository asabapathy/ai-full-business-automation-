import { describe, it, expect, vi } from 'vitest'
import { inventoryService } from '../services/inventory.service.js'
import { prisma } from '@kanavu/database'

const ORG = 'org-1'

const MOCK_ITEM = {
  id: 'item-1',
  organizationId: ORG,
  name: 'Widget A',
  sku: 'WGT-001',
  category: 'Electronics',
  quantity: 50,
  reorderPoint: 10,
  reorderQty: 20,
  unitCost: '5.00',
  unitPrice: '12.00',
  isActive: true,
}

describe('inventoryService', () => {
  describe('getItems', () => {
    it('returns active items for org', async () => {
      vi.mocked(prisma.inventoryItem.findMany).mockResolvedValue([MOCK_ITEM] as never)
      const result = await inventoryService.getItems(ORG)
      expect(prisma.inventoryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ organizationId: ORG, isActive: true }) })
      )
      expect(result).toHaveLength(1)
    })

    it('filters low stock after fetching', async () => {
      const lowItem = { ...MOCK_ITEM, quantity: 5, reorderPoint: 10 }
      const okItem = { ...MOCK_ITEM, id: 'item-2', quantity: 50 }
      vi.mocked(prisma.inventoryItem.findMany).mockResolvedValue([lowItem, okItem] as never)
      const result = await inventoryService.getItems(ORG, { lowStock: true })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('item-1')
    })
  })

  describe('createItem', () => {
    it('creates with default quantity and reorder values', async () => {
      vi.mocked(prisma.inventoryItem.create).mockResolvedValue(MOCK_ITEM as never)
      await inventoryService.createItem(ORG, { name: 'Widget A' })
      expect(prisma.inventoryItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: ORG,
            name: 'Widget A',
            quantity: 0,
            reorderPoint: 0,
            reorderQty: 0,
          }),
        })
      )
    })
  })

  describe('adjustQuantity', () => {
    it('increases quantity correctly', async () => {
      vi.mocked(prisma.inventoryItem.findFirst).mockResolvedValue(MOCK_ITEM as never)
      vi.mocked(prisma.inventoryItem.update).mockResolvedValue({ ...MOCK_ITEM, quantity: 60 } as never)
      const result = await inventoryService.adjustQuantity(ORG, 'item-1', 10)
      expect(prisma.inventoryItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { quantity: 60 } })
      )
      expect(result.quantity).toBe(60)
    })

    it('decreases quantity correctly', async () => {
      vi.mocked(prisma.inventoryItem.findFirst).mockResolvedValue(MOCK_ITEM as never)
      vi.mocked(prisma.inventoryItem.update).mockResolvedValue({ ...MOCK_ITEM, quantity: 40 } as never)
      await inventoryService.adjustQuantity(ORG, 'item-1', -10)
      expect(prisma.inventoryItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { quantity: 40 } })
      )
    })

    it('throws on insufficient stock', async () => {
      vi.mocked(prisma.inventoryItem.findFirst).mockResolvedValue({ ...MOCK_ITEM, quantity: 5 } as never)
      await expect(inventoryService.adjustQuantity(ORG, 'item-1', -10)).rejects.toThrow('Insufficient stock')
    })

    it('throws when item not found', async () => {
      vi.mocked(prisma.inventoryItem.findFirst).mockResolvedValue(null)
      await expect(inventoryService.adjustQuantity(ORG, 'bad-id', 5)).rejects.toThrow('Item not found')
    })
  })

  describe('deleteItem', () => {
    it('soft-deletes by setting isActive false', async () => {
      vi.mocked(prisma.inventoryItem.updateMany).mockResolvedValue({ count: 1 } as never)
      await inventoryService.deleteItem(ORG, 'item-1')
      expect(prisma.inventoryItem.updateMany).toHaveBeenCalledWith({
        where: { id: 'item-1', organizationId: ORG },
        data: { isActive: false },
      })
    })
  })

  describe('getStats', () => {
    it('calculates totalItems, lowStock, outOfStock, totalValue', async () => {
      vi.mocked(prisma.inventoryItem.findMany).mockResolvedValue([
        { quantity: 0, reorderPoint: 5, unitCost: '10.00', unitPrice: null },
        { quantity: 3, reorderPoint: 5, unitCost: '20.00', unitPrice: null },
        { quantity: 100, reorderPoint: 5, unitCost: '5.00', unitPrice: null },
      ] as never)
      const stats = await inventoryService.getStats(ORG)
      expect(stats.totalItems).toBe(3)
      expect(stats.outOfStock).toBe(1)
      expect(stats.lowStock).toBe(2) // 0 and 3 are both <= reorderPoint 5
      expect(stats.totalValue).toBeCloseTo(0 + 60 + 500)
    })

    it('returns zeros for empty inventory', async () => {
      vi.mocked(prisma.inventoryItem.findMany).mockResolvedValue([] as never)
      const stats = await inventoryService.getStats(ORG)
      expect(stats.totalItems).toBe(0)
      expect(stats.totalValue).toBe(0)
    })
  })
})
