'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { Shield, Users, ChevronDown, Trash2, Check } from 'lucide-react'

interface Member {
  userId: string
  role: string
  permissions: string | null
  user: { id: string; firstName: string; lastName: string; email: string; avatarUrl?: string; lastLoginAt?: string }
}

interface RoleDefaults { viewer: string[]; staff: string[]; manager: string[]; admin: string[]; owner: string[] }
interface Stats { total: number; byRole: Record<string, number> }

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MANAGER: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  MEMBER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  VIEWER: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

export default function TeamPermissionsPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [roleDefaults, setRoleDefaults] = useState<RoleDefaults | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Member | null>(null)
  const [editRole, setEditRole] = useState('')
  const [customPerms, setCustomPerms] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [mRes, sRes, rRes] = await Promise.all([
        apiClient.get<{ members: Member[] }>('/team-permissions'),
        apiClient.get<Stats>('/team-permissions/stats'),
        apiClient.get<RoleDefaults>('/team-permissions/role-defaults'),
      ])
      setMembers(mRes.members)
      setStats(sRes)
      setRoleDefaults(rRes)
    } finally { setLoading(false) }
  }

  function selectMember(m: Member) {
    setSelected(m)
    setEditRole('viewer')
    const perms = m.permissions ? JSON.parse(m.permissions) : []
    setCustomPerms(perms.join(', '))
  }

  async function updateRole() {
    if (!selected || !editRole) return
    setSaving(true)
    try {
      const perms = customPerms ? customPerms.split(',').map(p => p.trim()).filter(Boolean) : undefined
      await apiClient.put(`/team-permissions/${selected.userId}/role`, {
        role: editRole,
        customPermissions: perms,
      })
      setSelected(null)
      load()
    } catch (e: any) { alert(e.message) } finally { setSaving(false) }
  }

  async function remove(userId: string) {
    if (!confirm('Remove this member from the organization?')) return
    await apiClient.delete(`/team-permissions/${userId}`)
    load()
  }

  const rolePreviewPerms = editRole && roleDefaults ? (roleDefaults as any)[editRole] as string[] : []

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team Permissions</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage roles and permissions for team members</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Members</p>
              <Users className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          {Object.entries(stats.byRole).map(([role, count]) => (
            <div key={role} className="bg-card border rounded-xl p-4">
              <p className="text-sm text-muted-foreground mb-2 capitalize">{role.toLowerCase()}</p>
              <p className="text-2xl font-bold">{count}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-card border rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : members.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground">No team members</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  {['Member', 'Role', 'Permissions', 'Last Login', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map(m => {
                  const perms: string[] = m.permissions ? JSON.parse(m.permissions) : []
                  return (
                    <tr key={m.userId} className={`border-b last:border-0 hover:bg-muted/20 cursor-pointer transition-colors ${selected?.userId === m.userId ? 'bg-primary/5' : ''}`}
                      onClick={() => selectMember(m)}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{m.user.firstName} {m.user.lastName}</p>
                          <p className="text-xs text-muted-foreground">{m.user.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[m.role] ?? ROLE_COLORS.VIEWER}`}>
                          {m.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {perms.includes('*') ? (
                            <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded text-xs font-medium">All</span>
                          ) : perms.slice(0, 2).map(p => (
                            <span key={p} className="bg-muted px-1.5 py-0.5 rounded text-xs">{p}</span>
                          ))}
                          {perms.length > 2 && <span className="text-xs text-muted-foreground">+{perms.length - 2}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {m.user.lastLoginAt ? new Date(m.user.lastLoginAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={e => { e.stopPropagation(); remove(m.userId) }}
                          className="p-1.5 rounded hover:bg-muted">
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-card border rounded-xl p-5">
          {selected ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">{selected.user.firstName} {selected.user.lastName}</h3>
                <p className="text-sm text-muted-foreground">{selected.user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Assign Role</label>
                <select value={editRole} onChange={e => setEditRole(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                  {['viewer', 'staff', 'manager', 'admin', 'owner'].map(r => (
                    <option key={r} value={r} className="capitalize">{r}</option>
                  ))}
                </select>
              </div>
              {rolePreviewPerms.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">DEFAULT PERMISSIONS FOR ROLE</p>
                  <div className="space-y-1">
                    {rolePreviewPerms.map(p => (
                      <div key={p} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="h-3 w-3 text-green-500" />
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium block mb-1">Custom Permissions (overrides role)</label>
                <textarea value={customPerms} onChange={e => setCustomPerms(e.target.value)}
                  rows={3} placeholder="read:contacts, write:invoices (leave blank for role defaults)"
                  className="w-full border rounded-lg px-3 py-2 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSelected(null)} className="flex-1 border rounded-lg py-2 text-sm hover:bg-muted">Cancel</button>
                <button onClick={updateRole} disabled={saving}
                  className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                  {saving ? 'Saving…' : 'Update Role'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
              <Shield className="h-10 w-10 text-muted-foreground opacity-40 mb-3" />
              <p className="text-sm text-muted-foreground">Select a team member to edit their role and permissions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
