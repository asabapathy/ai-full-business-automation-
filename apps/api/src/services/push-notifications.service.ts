import { prisma } from '@kanavu/database'

export const pushNotificationsService = {
  async saveSubscription(orgId: string, userId: string | undefined, sub: {
    endpoint: string
    p256dh: string
    auth: string
    userAgent?: string
  }) {
    return prisma.pushSubscriptionRecord.upsert({
      where: { organizationId_endpoint: { organizationId: orgId, endpoint: sub.endpoint } },
      create: { organizationId: orgId, userId, ...sub },
      update: { p256dh: sub.p256dh, auth: sub.auth, userAgent: sub.userAgent },
    })
  },

  async removeSubscription(orgId: string, endpoint: string) {
    return prisma.pushSubscriptionRecord.deleteMany({
      where: { organizationId: orgId, endpoint },
    })
  },

  async getSubscriptions(orgId: string) {
    return prisma.pushSubscriptionRecord.findMany({ where: { organizationId: orgId } })
  },

  async sendPush(orgId: string, payload: { title: string; body: string; url?: string; icon?: string }) {
    const subscriptions = await prisma.pushSubscriptionRecord.findMany({ where: { organizationId: orgId } })

    const vapidPublicKey = process.env['VAPID_PUBLIC_KEY']
    const vapidPrivateKey = process.env['VAPID_PRIVATE_KEY']

    if (!vapidPublicKey || !vapidPrivateKey) {
      return { sent: 0, failed: 0, message: 'VAPID keys not configured' }
    }

    let sent = 0
    let failed = 0

    for (const sub of subscriptions) {
      try {
        const { default: webpush } = await import('web-push')
        webpush.setVapidDetails(
          'mailto:admin@kanavu.app',
          vapidPublicKey,
          vapidPrivateKey,
        )
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        )
        sent++
      } catch {
        failed++
        await prisma.pushSubscriptionRecord.deleteMany({ where: { id: sub.id } }).catch(() => {})
      }
    }

    return { sent, failed }
  },

  async getVapidPublicKey() {
    return process.env['VAPID_PUBLIC_KEY'] ?? null
  },

  async getStats(orgId: string) {
    const total = await prisma.pushSubscriptionRecord.count({ where: { organizationId: orgId } })
    return { total }
  },
}
