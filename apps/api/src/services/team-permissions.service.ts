import { prisma } from '@kanavu/database'

const ROLE_HIERARCHY = ['viewer', 'staff', 'manager', 'admin', 'owner'] as const
type Role = typeof ROLE_HIERARCHY[number]

const DEFAULT_PERMISSIONS: Record<Role, string[]> = {
  viewer:  ['read:contacts', 'read:appointments', 'read:invoices'],
  staff:   ['read:contacts', 'write:appointments', 'read:invoices', 'read:crm'],
  manager: ['read:contacts', 'write:contacts', 'write:appointments', 'write:invoices', 'read:reports', 'write:crm'],
  admin:   ['read:contacts', 'write:contacts', 'write:appointments', 'write:invoices', 'write:reports', 'write:crm', 'write:settings', 'manage:team'],
  owner:   ['*'],
}

function toUserRole(role: string) {
  const map: Record<string, string> = { viewer: 'VIEWER', staff: 'MEMBER', manager: 'MANAGER', admin: 'ADMIN', owner: 'ADMIN' }
  return (map[role] ?? 'MEMBER') as any
}

export const teamPermissionsService = {
  async getMembers(orgId: string) {
    return prisma.organizationMember.findMany({
      where: { organizationId: orgId, isActive: true },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, lastLoginAt: true } } },
      orderBy: { joinedAt: 'desc' },
    })
  },

  async getMember(orgId: string, userId: string) {
    return prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    })
  },

  async updateRole(orgId: string, userId: string, role: Role, customPermissions?: string[]) {
    const permissions = customPermissions ?? DEFAULT_PERMISSIONS[role]
    return prisma.organizationMember.update({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      data: { role: toUserRole(role), permissions: JSON.stringify(permissions) },
    })
  },

  async updatePermissions(orgId: string, userId: string, permissions: string[]) {
    return prisma.organizationMember.update({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      data: { permissions: JSON.stringify(permissions) },
    })
  },

  async removeMember(orgId: string, userId: string) {
    return prisma.organizationMember.update({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      data: { isActive: false },
    })
  },

  async getRoleDefaults() {
    return DEFAULT_PERMISSIONS
  },

  async getStats(orgId: string) {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { role: true },
    })
    const byRole = members.reduce((acc, m) => {
      const r = m.role as string
      acc[r] = (acc[r] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
    return { total: members.length, byRole }
  },
}
