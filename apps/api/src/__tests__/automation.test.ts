import { describe, it, expect, vi } from 'vitest'
import { AutomationService } from '../services/automation.service.js'
import { prisma } from '../services/database.js'

const automationService = new AutomationService()
const ORG_ID = 'org-123'

const MOCK_WORKFLOW = {
  id: 'wf-1',
  organizationId: ORG_ID,
  name: 'Test Workflow',
  triggerType: 'MANUAL',
  isActive: false,
  runCount: 0,
  steps: [],
  _count: { executions: 0 },
}

describe('AutomationService', () => {
  it('creates a workflow', async () => {
    vi.mocked(prisma.workflow.create).mockResolvedValue(MOCK_WORKFLOW as never)
    const result = await automationService.createWorkflow(ORG_ID, {
      name: 'Test Workflow',
      triggerType: 'MANUAL',
    })
    expect(prisma.workflow.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Test Workflow', isActive: false }),
      })
    )
    expect(result.name).toBe('Test Workflow')
  })

  it('throws when updating non-existent workflow', async () => {
    vi.mocked(prisma.workflow.findFirst).mockResolvedValue(null)
    await expect(
      automationService.updateWorkflow(ORG_ID, 'bad-id', { name: 'New name' })
    ).rejects.toThrow('Workflow not found')
  })

  it('throws when deleting non-existent workflow', async () => {
    vi.mocked(prisma.workflow.findFirst).mockResolvedValue(null)
    await expect(
      automationService.deleteWorkflow(ORG_ID, 'bad-id')
    ).rejects.toThrow('Workflow not found')
  })

  it('executes workflow steps and records result', async () => {
    const workflowWithSteps = {
      ...MOCK_WORKFLOW,
      isActive: true,
      steps: [
        { id: 's1', type: 'WAIT_DELAY', name: 'Wait', order: 1, config: { minutes: 5 } },
        { id: 's2', type: 'NOTIFY_TEAM', name: 'Notify', order: 2, config: { title: 'Alert', body: 'Hello' } },
      ],
    }
    vi.mocked(prisma.workflow.findFirst).mockResolvedValue(workflowWithSteps as never)
    vi.mocked(prisma.workflowExecution.create).mockResolvedValue({ id: 'exec-1' } as never)
    vi.mocked(prisma.workflowExecution.update).mockResolvedValue({ id: 'exec-1' } as never)
    vi.mocked(prisma.workflow.update).mockResolvedValue(MOCK_WORKFLOW as never)
    vi.mocked(prisma.notification.create).mockResolvedValue({ id: 'n1' } as never)

    const result = await automationService.executeWorkflow(ORG_ID, 'wf-1')
    expect(result.status).toBe('COMPLETED')
    expect(result.stepResults).toHaveLength(2)
    expect(result.stepResults[0]).toMatchObject({ type: 'WAIT_DELAY', status: 'completed' })
  })

  it('throws when executing non-existent workflow', async () => {
    vi.mocked(prisma.workflow.findFirst).mockResolvedValue(null)
    await expect(
      automationService.executeWorkflow(ORG_ID, 'bad-id')
    ).rejects.toThrow('Workflow not found')
  })

  it('returns workflow stats', async () => {
    vi.mocked(prisma.workflow.count).mockResolvedValueOnce(10).mockResolvedValueOnce(6)
    vi.mocked(prisma.workflowExecution.count).mockResolvedValueOnce(150).mockResolvedValueOnce(3)
    const stats = await automationService.getStats(ORG_ID)
    expect(stats.total).toBe(10)
    expect(stats.active).toBe(6)
    expect(stats.totalRuns).toBe(150)
    expect(stats.recentFailures).toBe(3)
  })
})
