import { describe, it, expect, vi } from 'vitest'
import { emailTemplatesService } from '../services/email-templates.service.js'
import { prisma } from '@kanavu/database'

const ORG = 'org-1'

const MOCK_TEMPLATE = {
  id: 'tpl-1',
  organizationId: ORG,
  name: 'Welcome Email',
  subject: 'Welcome to {{company_name}}!',
  htmlContent: '<h1>Hello {{first_name}}</h1>',
  category: 'Welcome',
  variables: ['first_name', 'company_name'],
  isActive: true,
}

describe('emailTemplatesService', () => {
  describe('getTemplates', () => {
    it('returns active templates for org', async () => {
      vi.mocked(prisma.emailTemplate.findMany).mockResolvedValue([MOCK_TEMPLATE] as never)
      const result = await emailTemplatesService.getTemplates(ORG)
      expect(prisma.emailTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: ORG, isActive: true } })
      )
      expect(result).toHaveLength(1)
    })

    it('filters by category when provided', async () => {
      vi.mocked(prisma.emailTemplate.findMany).mockResolvedValue([MOCK_TEMPLATE] as never)
      await emailTemplatesService.getTemplates(ORG, 'Welcome')
      expect(prisma.emailTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: ORG, isActive: true, category: 'Welcome' } })
      )
    })
  })

  describe('createTemplate', () => {
    it('creates with empty variables array by default', async () => {
      vi.mocked(prisma.emailTemplate.create).mockResolvedValue(MOCK_TEMPLATE as never)
      await emailTemplatesService.createTemplate(ORG, {
        name: 'Welcome Email',
        subject: 'Welcome!',
        htmlContent: '<h1>Hello</h1>',
      })
      expect(prisma.emailTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ variables: [] }),
        })
      )
    })

    it('stores provided variables', async () => {
      vi.mocked(prisma.emailTemplate.create).mockResolvedValue(MOCK_TEMPLATE as never)
      await emailTemplatesService.createTemplate(ORG, {
        name: 'Welcome Email',
        subject: 'Welcome {{first_name}}!',
        htmlContent: '<p>Hi {{first_name}}</p>',
        variables: ['first_name'],
      })
      expect(prisma.emailTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ variables: ['first_name'] }),
        })
      )
    })
  })

  describe('deleteTemplate', () => {
    it('soft-deletes by setting isActive to false', async () => {
      vi.mocked(prisma.emailTemplate.updateMany).mockResolvedValue({ count: 1 } as never)
      await emailTemplatesService.deleteTemplate(ORG, 'tpl-1')
      expect(prisma.emailTemplate.updateMany).toHaveBeenCalledWith({
        where: { id: 'tpl-1', organizationId: ORG },
        data: { isActive: false },
      })
    })
  })

  describe('duplicateTemplate', () => {
    it('creates a copy with "(Copy)" suffix', async () => {
      vi.mocked(prisma.emailTemplate.findFirst).mockResolvedValue(MOCK_TEMPLATE as never)
      vi.mocked(prisma.emailTemplate.create).mockResolvedValue({
        ...MOCK_TEMPLATE, id: 'tpl-2', name: 'Welcome Email (Copy)',
      } as never)
      const result = await emailTemplatesService.duplicateTemplate(ORG, 'tpl-1')
      expect(prisma.emailTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Welcome Email (Copy)' }),
        })
      )
      expect(result.name).toBe('Welcome Email (Copy)')
    })

    it('throws when original template not found', async () => {
      vi.mocked(prisma.emailTemplate.findFirst).mockResolvedValue(null)
      await expect(emailTemplatesService.duplicateTemplate(ORG, 'bad-id')).rejects.toThrow('Template not found')
    })
  })

  describe('getCategories', () => {
    it('returns non-null distinct categories', async () => {
      vi.mocked(prisma.emailTemplate.findMany).mockResolvedValue([
        { category: 'Welcome' },
        { category: 'Newsletter' },
        { category: null },
      ] as never)
      const cats = await emailTemplatesService.getCategories(ORG)
      expect(cats).toEqual(['Welcome', 'Newsletter'])
    })
  })

  describe('getStats', () => {
    it('returns total and active counts', async () => {
      vi.mocked(prisma.emailTemplate.count)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(8)
      const stats = await emailTemplatesService.getStats(ORG)
      expect(stats.total).toBe(10)
      expect(stats.active).toBe(8)
    })
  })
})
