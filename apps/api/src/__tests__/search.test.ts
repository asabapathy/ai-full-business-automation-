import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SearchService } from '../services/search.service.js'
import { prisma } from '../services/database.js'

const searchService = new SearchService()

const ORG_ID = 'org-123'

describe('SearchService', () => {
  beforeEach(() => {
    vi.mocked(prisma.contact.findMany).mockResolvedValue([
      { id: 'c1', firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com', type: 'LEAD' as never },
    ])
    vi.mocked(prisma.deal.findMany).mockResolvedValue([
      { id: 'd1', title: 'Test Deal', stage: 'PROPOSAL', value: 5000 } as never,
    ])
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([
      { id: 'i1', number: 'INV-001', total: 1200, status: 'SENT' } as never,
    ])
    vi.mocked(prisma.campaign.findMany).mockResolvedValue([
      { id: 'ca1', name: 'Summer Campaign', type: 'EMAIL', status: 'ACTIVE' } as never,
    ])
  })

  it('returns empty when query is too short', async () => {
    const result = await searchService.globalSearch(ORG_ID, 'a')
    expect(result.results).toHaveLength(0)
    expect(result.total).toBe(0)
  })

  it('returns empty for blank query', async () => {
    const result = await searchService.globalSearch(ORG_ID, '')
    expect(result.results).toHaveLength(0)
  })

  it('searches all entity types when no filter', async () => {
    const result = await searchService.globalSearch(ORG_ID, 'test')
    expect(result.total).toBe(4)
    const types = result.results.map(r => r.type)
    expect(types).toContain('contact')
    expect(types).toContain('deal')
    expect(types).toContain('invoice')
    expect(types).toContain('campaign')
  })

  it('filters to only contacts when type specified', async () => {
    vi.mocked(prisma.deal.findMany).mockResolvedValue([])
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([])
    vi.mocked(prisma.campaign.findMany).mockResolvedValue([])
    const result = await searchService.globalSearch(ORG_ID, 'alice', ['contacts'])
    expect(result.results.every(r => r.type === 'contact')).toBe(true)
  })

  it('builds correct contact URL', async () => {
    vi.mocked(prisma.deal.findMany).mockResolvedValue([])
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([])
    vi.mocked(prisma.campaign.findMany).mockResolvedValue([])
    const result = await searchService.globalSearch(ORG_ID, 'alice')
    const contact = result.results.find(r => r.type === 'contact')
    expect(contact?.url).toBe('/dashboard/crm?contact=c1')
  })

  it('builds invoice title from number', async () => {
    vi.mocked(prisma.contact.findMany).mockResolvedValue([])
    vi.mocked(prisma.deal.findMany).mockResolvedValue([])
    vi.mocked(prisma.campaign.findMany).mockResolvedValue([])
    const result = await searchService.globalSearch(ORG_ID, 'inv')
    const invoice = result.results.find(r => r.type === 'invoice')
    expect(invoice?.title).toBe('Invoice #INV-001')
  })
})
