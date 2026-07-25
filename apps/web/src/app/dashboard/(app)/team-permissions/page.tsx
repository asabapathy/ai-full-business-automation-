'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { Shield, Users, Trash2, Check } from 'lucide-react'

interface Member {
  userId: string
  role: string
  permissions: string | null
  user: { id: string; firstName: string; lastName: string; email: string; avatarUrl?: string; lastLoginAt?: string }
}

interface RoleDefaults { viewer: string[]; staff: string[]; manager: string[]; admin: string[]; owner: string[] }
interface Stats { total: number; byRole: Record<string, number> }

const ROLE_META: Record<string, { text: string; bg: string }> = {
  ADMIN:   { text: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  MANAGER: { text: '#c084fc', bg: 'rgba(192,132,252,0.1)' },
  MEMBER:  { text: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  VIEWER:  { text: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  OWNER:   { text: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
}

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }

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
      await apiClient.put(`/team-permissions/${selected.userId}/role`, { role: editRole, customPermissions: perms })
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
    <div className="p-6 space-y-6 max-w-[1200px]">
      <div {...anim(0)} className="kv-anim">
        <h1 className="text-2xl font-bold text-foreground">Team Permissions</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage roles and permissions for team members</p>
      </div>

      {stats && (
        <div {...anim(1)} className="kv-anim grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl p-4" style={cardStyle}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Members</p>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground tabular">{stats.total}</p>
          </div>
          {Object.entries(stats.byRole).map(([role, count]) => (
            <div key={role} className="rounded-xl p-4" style={cardStyle}>
              <p className="text-sm text-muted-foreground mb-2 capitalize">{role.toLowerCase()}</p>
              <p className="text-2xl font-bold text-foreground tabular">{count}</p>
            </div>
          ))}
        </div>
      )}

      <div {...anim(2)} className="kv-anim grid md:grid-cols-3 gap-6">
        {/* Member table */}
        <div className="md:col-span-2 rounded-xl overflow-hidden" style={cardStyle}>
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : members.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground">No team members</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'rgba(255,255,255,0.02)' }}>
                    {['Member', 'Role', 'Permissions', 'Last Login', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.map((m, i) => {
                    const perms: string[] = m.permissions ? JSON.parse(m.permissions) : []
                    const isSelected = selected?.userId === m.userId
                    return (
                      <tr
                        key={m.userId}
                        className="cursor-pointer transition-colors"
                        style={{
                          borderBottom: i < members.length - 1 ? '1px solid hsl(var(--border))' : undefined,
                          background: isSelected ? 'rgba(6,182,212,0.05)' : undefined,
                        }}
                        onClick={() => selectMember(m)}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{m.user.firstName} {m.user.lastName}</p>
                          <p className="text-xs text-muted-foreground">{m.user.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          {(() => {
                            const meta = ROLE_META[m.role] ?? ROLE_META.VIEWER
                            return (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ color: meta.text, background: meta.bg }}>
                                {m.role}
                              </span>
                            )
                          })()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {perms.includes('*') ? (
                              <span className="px-1.5 py-0.5 rounded text-xs font-semibold" style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.1)' }}>All</span>
                            ) : perms.slice(0, 2).map(p => (
                              <span key={p} className="px-1.5 py-0.5 rounded text-xs text-muted-foreground" style={{ background: 'rgba(255,255,255,0.06)' }}>{p}</span>
                            ))}
                            {perms.length > 2 && <span className="text-xs text-muted-foreground">+{perms.length - 2}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {m.user.lastLoginAt ? new Date(m.user.lastLoginAt).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={e => { e.stopPropagation(); remove(m.userId) }}
                            className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Role editor panel */}
        <div className="rounded-xl p-5" style={cardStyle}>
          {selected ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground">{selected.user.firstName} {selected.user.lastName}</h3>
                <p className="text-sm text-muted-foreground">{selected.user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Assign Role</label>
                <select
                  value={editRole}
                  onChange={e => setEditRole(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                >
                  {['viewer', 'staff', 'manager', 'admin', 'owner'].map(r => (
                    <option key={r} value={r} className="capitalize">{r}</option>
                  ))}
                </select>
              </div>
              {rolePreviewPerms.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 tracking-wide uppercase">Default Permissions for Role</p>
                  <div className="space-y-1">
                    {rolePreviewPerms.map(p => (
                      <div key={p} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="h-3 w-3 text-emerald-400" />
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Custom Permissions <span className="text-muted-foreground font-normal">(overrides role)</span></label>
                <textarea
                  value={customPerms}
                  onChange={e => setCustomPerms(e.target.value)}
                  rows={3}
                  placeholder="read:contacts, write:invoices (leave blank for role defaults)"
                  className="w-full rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none font-mono"
                  style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelected(null)}
                  className="flex-1 rounded-lg py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  style={{ border: '1px solid hsl(var(--border))' }}
                >
                  Cancel
                </button>
                <button
                  onClick={updateRole}
                  disabled={saving}
                  className="flex-1 rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
                >
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
