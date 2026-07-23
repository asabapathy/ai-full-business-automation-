import { describe, it, expect, vi } from 'vitest'
import { NotificationService } from '../services/notification.service.js'
import { prisma } from '../services/database.js'

const notificationService = new NotificationService()
const ORG_ID = 'org-123'
const USER_ID = 'user-456'

describe('NotificationService', () => {
  it('fetches notifications with correct where clause', async () => {
    vi.mocked(prisma.notification.findMany).mockResolvedValue([])
    vi.mocked(prisma.notification.count).mockResolvedValue(0)
    await notificationService.getNotifications(ORG_ID, USER_ID, { unreadOnly: true })
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ readAt: null }),
      })
    )
  })

  it('marks specific notifications as read', async () => {
    vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 2 })
    await notificationService.markRead(ORG_ID, USER_ID, ['n1', 'n2'])
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ['n1', 'n2'] } }),
        data: expect.objectContaining({ readAt: expect.any(Date) }),
      })
    )
  })

  it('marks all notifications as read', async () => {
    vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 5 })
    await notificationService.markAllRead(ORG_ID, USER_ID)
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ readAt: null }),
        data: expect.objectContaining({ readAt: expect.any(Date) }),
      })
    )
  })

  it('creates a notification', async () => {
    const mockNotif = { id: 'n1', organizationId: ORG_ID, type: 'test', title: 'Test', body: 'Body', data: {}, createdAt: new Date() }
    vi.mocked(prisma.notification.create).mockResolvedValue(mockNotif as never)
    const result = await notificationService.create(ORG_ID, { type: 'test', title: 'Test', body: 'Body' })
    expect(result).toEqual(mockNotif)
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'test', title: 'Test' }),
      })
    )
  })

  it('returns unread count', async () => {
    vi.mocked(prisma.notification.count).mockResolvedValue(7)
    const result = await notificationService.getUnreadCount(ORG_ID, USER_ID)
    expect(result).toEqual({ count: 7 })
    expect(prisma.notification.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ readAt: null }) })
    )
  })
})
