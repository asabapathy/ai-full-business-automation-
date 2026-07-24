import { prisma } from '@kanavu/database'

function twilioAuth() {
  const accountSid = process.env['TWILIO_ACCOUNT_SID'] ?? ''
  const authToken = process.env['TWILIO_AUTH_TOKEN'] ?? ''
  return { accountSid, authToken, encoded: Buffer.from(`${accountSid}:${authToken}`).toString('base64') }
}

export const whatsappService = {
  async sendMessage(orgId: string, data: {
    to: string
    body: string
    contactId?: string
    mediaUrl?: string
  }) {
    const { accountSid, encoded } = twilioAuth()
    const from = process.env['TWILIO_WHATSAPP_FROM'] ?? 'whatsapp:+14155238886'
    const to = data.to.startsWith('whatsapp:') ? data.to : `whatsapp:${data.to}`

    let twilioSid: string | undefined
    let status = 'sent'

    if (accountSid) {
      try {
        const body = new URLSearchParams({ From: from, To: to, Body: data.body })
        if (data.mediaUrl) body.set('MediaUrl', data.mediaUrl)
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
          method: 'POST',
          headers: { Authorization: `Basic ${encoded}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        })
        const json = await res.json() as any
        twilioSid = json.sid
        status = json.status ?? 'sent'
      } catch {
        status = 'failed'
      }
    }

    return prisma.whatsAppMessage.create({
      data: {
        organizationId: orgId,
        contactId: data.contactId,
        direction: 'outbound',
        from,
        to: data.to,
        body: data.body,
        mediaUrl: data.mediaUrl,
        status,
        twilioSid,
      },
    })
  },

  async receiveMessage(orgId: string, data: {
    from: string
    to: string
    body: string
    twilioSid?: string
    mediaUrl?: string
  }) {
    const phone = data.from.replace('whatsapp:', '')
    const contact = await prisma.contact.findFirst({ where: { organizationId: orgId, phone } })

    return prisma.whatsAppMessage.create({
      data: {
        organizationId: orgId,
        contactId: contact?.id,
        direction: 'inbound',
        from: data.from,
        to: data.to,
        body: data.body,
        mediaUrl: data.mediaUrl,
        status: 'received',
        twilioSid: data.twilioSid,
      },
    })
  },

  async getConversation(orgId: string, contactPhone: string) {
    const phone = contactPhone.replace('whatsapp:', '')
    return prisma.whatsAppMessage.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { from: { contains: phone } },
          { to: { contains: phone } },
        ],
      },
      orderBy: { createdAt: 'asc' },
    })
  },

  async getMessages(orgId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit
    const [messages, total] = await Promise.all([
      prisma.whatsAppMessage.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.whatsAppMessage.count({ where: { organizationId: orgId } }),
    ])
    return { messages, total, page, pages: Math.ceil(total / limit) }
  },

  async getStats(orgId: string) {
    const [total, inbound, outbound] = await Promise.all([
      prisma.whatsAppMessage.count({ where: { organizationId: orgId } }),
      prisma.whatsAppMessage.count({ where: { organizationId: orgId, direction: 'inbound' } }),
      prisma.whatsAppMessage.count({ where: { organizationId: orgId, direction: 'outbound' } }),
    ])
    return { total, inbound, outbound }
  },
}
