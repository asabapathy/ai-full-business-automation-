import { prisma } from './database.js'

export class SearchService {
  async globalSearch(organizationId: string, query: string, types?: string[]) {
    if (!query || query.length < 2) return { results: [], total: 0 }

    const q = query.toLowerCase()
    const searchAll = !types || types.length === 0
    const results: Array<{ type: string; id: string; title: string; subtitle?: string; url: string }> = []

    await Promise.all([
      // Contacts
      (searchAll || types?.includes('contacts')) && prisma.contact.findMany({
        where: {
          organizationId,
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, firstName: true, lastName: true, email: true, type: true },
      }).then(contacts => {
        results.push(...contacts.map(c => ({
          type: 'contact',
          id: c.id,
          title: `${c.firstName} ${c.lastName ?? ''}`.trim(),
          subtitle: c.email ?? c.type,
          url: `/dashboard/crm?contact=${c.id}`,
        })))
      }),

      // Deals
      (searchAll || types?.includes('deals')) && prisma.deal.findMany({
        where: {
          organizationId,
          title: { contains: q, mode: 'insensitive' },
        },
        take: 5,
        select: { id: true, title: true, stage: true, value: true },
      }).then(deals => {
        results.push(...deals.map(d => ({
          type: 'deal',
          id: d.id,
          title: d.title,
          subtitle: `${d.stage} • ${d.value ? `$${Number(d.value).toLocaleString()}` : 'No value'}`,
          url: `/dashboard/sales?deal=${d.id}`,
        })))
      }),

      // Invoices
      (searchAll || types?.includes('invoices')) && prisma.invoice.findMany({
        where: {
          organizationId,
          number: { contains: q, mode: 'insensitive' },
        },
        take: 5,
        select: { id: true, number: true, total: true, status: true },
      }).then(invoices => {
        results.push(...invoices.map(i => ({
          type: 'invoice',
          id: i.id,
          title: `Invoice #${i.number}`,
          subtitle: `${i.status} • $${Number(i.total).toLocaleString()}`,
          url: `/dashboard/invoices?invoice=${i.id}`,
        })))
      }),

      // Campaigns
      (searchAll || types?.includes('campaigns')) && prisma.campaign.findMany({
        where: {
          organizationId,
          name: { contains: q, mode: 'insensitive' },
        },
        take: 3,
        select: { id: true, name: true, type: true, status: true },
      }).then(campaigns => {
        results.push(...campaigns.map(c => ({
          type: 'campaign',
          id: c.id,
          title: c.name,
          subtitle: `${c.type} • ${c.status}`,
          url: `/dashboard/marketing?campaign=${c.id}`,
        })))
      }),
    ].filter(Boolean))

    return { results, total: results.length, query }
  }
}

export const searchService = new SearchService()
