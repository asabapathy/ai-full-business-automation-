import { describe, it, expect, vi } from 'vitest'
import { projectsService } from '../services/projects.service.js'
import { prisma } from '@kanavu/database'

const ORG = 'org-1'

const MOCK_PROJECT = {
  id: 'proj-1',
  organizationId: ORG,
  name: 'Website Redesign',
  status: 'active',
  tasks: [],
}

const MOCK_TASK = {
  id: 'task-1',
  projectId: 'proj-1',
  title: 'Design mockups',
  status: 'todo',
  priority: 'medium',
  order: 0,
}

describe('projectsService', () => {
  describe('getProjects', () => {
    it('returns projects with task counts', async () => {
      vi.mocked(prisma.project.findMany).mockResolvedValue([MOCK_PROJECT] as never)
      const result = await projectsService.getProjects(ORG)
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: ORG } })
      )
      expect(result).toHaveLength(1)
    })

    it('filters by status', async () => {
      vi.mocked(prisma.project.findMany).mockResolvedValue([MOCK_PROJECT] as never)
      await projectsService.getProjects(ORG, 'active')
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: ORG, status: 'active' } })
      )
    })
  })

  describe('createProject', () => {
    it('defaults status to active', async () => {
      vi.mocked(prisma.project.create).mockResolvedValue(MOCK_PROJECT as never)
      await projectsService.createProject(ORG, { name: 'Website Redesign' })
      expect(prisma.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'active', organizationId: ORG }),
        })
      )
    })
  })

  describe('createTask', () => {
    it('creates task when project belongs to org', async () => {
      vi.mocked(prisma.project.findFirst).mockResolvedValue(MOCK_PROJECT as never)
      vi.mocked(prisma.projectTask.create).mockResolvedValue(MOCK_TASK as never)
      const result = await projectsService.createTask('proj-1', ORG, { title: 'Design mockups' })
      expect(prisma.projectTask.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: 'Design mockups', status: 'todo', priority: 'medium' }),
        })
      )
      expect(result.title).toBe('Design mockups')
    })

    it('throws when project not found in org', async () => {
      vi.mocked(prisma.project.findFirst).mockResolvedValue(null)
      await expect(
        projectsService.createTask('proj-bad', ORG, { title: 'Task' })
      ).rejects.toThrow('Project not found')
    })
  })

  describe('updateTask', () => {
    it('updates when task belongs to org project', async () => {
      vi.mocked(prisma.projectTask.findFirst).mockResolvedValue(MOCK_TASK as never)
      vi.mocked(prisma.projectTask.update).mockResolvedValue({ ...MOCK_TASK, status: 'done' } as never)
      await projectsService.updateTask('task-1', ORG, { status: 'done' })
      expect(prisma.projectTask.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'task-1' }, data: { status: 'done' } })
      )
    })

    it('throws when task not found', async () => {
      vi.mocked(prisma.projectTask.findFirst).mockResolvedValue(null)
      await expect(
        projectsService.updateTask('task-bad', ORG, { status: 'done' })
      ).rejects.toThrow('Task not found')
    })
  })

  describe('deleteTask', () => {
    it('deletes when task belongs to org', async () => {
      vi.mocked(prisma.projectTask.findFirst).mockResolvedValue(MOCK_TASK as never)
      vi.mocked(prisma.projectTask.delete).mockResolvedValue(MOCK_TASK as never)
      await projectsService.deleteTask('task-1', ORG)
      expect(prisma.projectTask.delete).toHaveBeenCalledWith({ where: { id: 'task-1' } })
    })

    it('throws when task not found', async () => {
      vi.mocked(prisma.projectTask.findFirst).mockResolvedValue(null)
      await expect(projectsService.deleteTask('task-bad', ORG)).rejects.toThrow('Task not found')
    })
  })

  describe('getStats', () => {
    it('groups projects and tasks by status', async () => {
      vi.mocked(prisma.project.findMany).mockResolvedValue([
        { status: 'active' }, { status: 'active' }, { status: 'completed' },
      ] as never)
      vi.mocked(prisma.projectTask.findMany).mockResolvedValue([
        { status: 'todo' }, { status: 'done' }, { status: 'done' },
      ] as never)
      const stats = await projectsService.getStats(ORG)
      expect(stats.total).toBe(3)
      expect(stats.byStatus['active']).toBe(2)
      expect(stats.byStatus['completed']).toBe(1)
      expect(stats.tasks).toBe(3)
      expect(stats.tasksByStatus['done']).toBe(2)
    })
  })
})
