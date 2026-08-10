'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'
import { Shield, Users, Trash2, Check, UserPlus, X, Mail } from 'lucide-react'

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
  STAFF:   { text: '#34d399', bg: 'rgba(52,211,153,0.1)' },
}

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

export default function TeamPermissionsPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [roleDefaults, setRoleDefaults] = useState<RoleDefaults | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Member | null>(null)
  const [editRole, setEditRole] = useState('viewer')
  const [customPerms, setCustomPerms] = useState('')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', firstName: '', lastName: '', role: 'staff' })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [mRes, sRes, rRes] = await Promise.all([
        apiClient.get<{ members: Member[] }>('/team-permissions'),
        apiClient.get<Stats>('/team-permissions/stats'),
        apiClient.get<RoleDefaults>('/team-permissions/role-defaults'),
      ])
      setMembers((mRes as any).members ?? [])
      setStats(sRes as any)
      setRoleDefaults(rRes as any)
    } catch {
      setMembers([
        { userId: '1', role: 'ADMIN', permissions: null, user: { id: '1', firstName: 'Sarah', lastName: 'Chen', email: 'sarah@example.com', lastLoginAt: new Date().toISOString() } },
        { userId: '2', role: 'STAFF', permissions: null, user: { id: '2', firstName: 'Mike', lastName: 'Torres', email: 'mike@example.com', lastLoginAt: new Date(Date.now() - 86400000 * 2).toISOString() } },
      ])
      setStats({ total: 2, byRole: { ADMIN: 1, STAFF: 1 } })
    } finally { setLoading(false) }
  }

  function selectMember(m: Member) {
    setSelected(m)
    setEditRole(m.role.toLowerCase())
    const perms = m.permissions ? JSON.parse(m.permissions) : []
    setCustomPerms(perms.join(', '))
  }

  async function updateRole() {
    if (!selected || !editRole) return
    setSaving(true)
    try {
      const perms = customPerms ? customPerms.split(',').map(p => p.trim()).filter(Boolean) : undefined
      await apiClient.put(`/team-permissions/${selected.userId}/role`, { role: editRole, customPermissions: perms })
      toast('Role updated', 'success')
      setSelected(null)
      load()
    } catch {
      toast('Failed to update role', 'error')
    } finally { setSaving(false) }
  }

  async function remove(userId: string) {
    setRemoving(userId)
    try {
      await apiClient.delete(`/team-permissions/${userId}`)
      setMembers(prev => prev.filter(m => m.userId !== userId))
      if (selected?.userId === userId) setSelected(null)
      toast('Member removed', 'success')
    } catch {
      toast('Failed to remove member', 'error')
    } finally { setRemoving(null) }
  }

  async function handleInvite() {
    if (!inviteForm.email.trim() || !inviteForm.firstName.trim()) return
    setInviting(true)
    try {
      await apiClient.post('/team-permissions/invite', inviteForm)
      toast(`Invite sent to ${inviteForm.email}`, 'success')
      setShowInvite(false)
      setInviteForm({ email: '', firstName: '', lastName: '', role: 'staff' })
      load()
    } catch {
      toast('Failed to send invite. The email may already be a member.', 'error')
    } finally { setInviting(false) }
  }

  const rolePreviewPerms = editRole && roleDefaults ? (roleDefaults as any)[editRole] as string[] ?? [] : []

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      <div {...anim(0)} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Permissions</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage roles and permissions for team members</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.25)' }}
        >
          <UserPlus className="h-4 w-4" />
          Invite Member
        </button>
      </div>

      {stats && (
        <div {...anim(1)} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl p-4" style={cardStyle}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Members</p>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground tabular">{stats.total}</p>
          </div>
          {Object.entries(stats.byRole).slice(0, 3).map(([role, count]) => {
            const meta = ROLE_META[role] ?? ROLE_META.VIEWER
            return (
              <div key={role} className="rounded-xl p-4" style={cardStyle}>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">{role.toLowerCase()}</p>
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-bold text-foreground tabular">{count as number}</p>
                  <span className="text-xs px-1.5 py-0.5 rounded-full mb-0.5 font-medium" style={{ color: meta.text, background: meta.bg }}>{role}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div {...anim(2)} className="grid md:grid-cols-3 gap-6">
        {/* Member table */}
        <div className="md:col-span-2 rounded-xl overflow-hidden" style={cardStyle}>
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
          ) : members.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="text-muted-foreground text-sm">No team members yet</p>
              <button onClick={() => setShowInvite(true)} className="mt-3 text-xs text-primary hover:underline">Invite someone</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'rgba(255,255,255,0.02)' }}>
                    {['Member', 'Role', 'Permissions', 'Last Login', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.map((m, i) => {
                    const perms: string[] = m.permissions ? JSON.parse(m.permissions) : []
                    const meta = ROLE_META[m.role] ?? ROLE_META.VIEWER
                    const isSelected = selected?.userId === m.userId
                    return (
                      <tr
                        key={m.userId}
                        className="cursor-pointer transition-colors hover:bg-accent/30"
                        style={{
                          borderBottom: i < members.length - 1 ? '1px solid hsl(var(--border))' : undefined,
                          background: isSelected ? 'rgba(6,182,212,0.05)' : undefined,
                        }}
                        onClick={() => selectMember(m)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4' }}>
                              {m.user.firstName[0]}{m.user.lastName?.[0]}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{m.user.firstName} {m.user.lastName}</p>
                              <p className="text-xs text-muted-foreground">{m.user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ color: meta.text, background: meta.bg }}>
                            {m.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {perms.includes('*') ? (
                              <span className="px-1.5 py-0.5 rounded text-xs font-semibold" style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.1)' }}>All</span>
                            ) : perms.slice(0, 2).map(p => (
                              <span key={p} className="px-1.5 py-0.5 rounded text-xs text-muted-foreground" style={{ background: 'rgba(255,255,255,0.06)' }}>{p}</span>
                            ))}
                            {perms.length > 2 && <span className="text-xs text-muted-foreground">+{perms.length - 2}</span>}
                            {perms.length === 0 && <span className="text-xs text-muted-foreground/40">Role defaults</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs tabular">
                          {m.user.lastLoginAt ? new Date(m.user.lastLoginAt).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={e => { e.stopPropagation(); remove(m.userId) }}
                            disabled={removing === m.userId}
                            className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 disabled:opacity-50"
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
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Assign Role</label>
                <select
                  value={editRole}
                  onChange={e => setEditRole(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                >
                  {['viewer', 'staff', 'manager', 'admin', 'owner'].map(r => (
                    <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>
              {rolePreviewPerms.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Default Permissions</p>
                  <div className="space-y-1">
                    {rolePreviewPerms.map(p => (
                      <div key={p} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
                  Custom Permissions <span className="normal-case font-normal">(overrides role)</span>
                </label>
                <textarea
                  value={customPerms}
                  onChange={e => setCustomPerms(e.target.value)}
                  rows={3}
                  placeholder="read:contacts, write:invoices"
                  className={inputCls + ' resize-none font-mono text-xs'}
                  style={inputStyle}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSelected(null)} className="flex-1 rounded-lg py-2 text-sm text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>
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
              <Shield className="h-10 w-10 text-muted-foreground opacity-30 mb-3" />
              <p className="text-sm text-muted-foreground">Click a team member to edit their role and permissions</p>
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={cardStyle}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Invite Team Member</h2>
              </div>
              <button onClick={() => setShowInvite(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Email Address *</label>
                <input type="email" className={inputCls} style={inputStyle} placeholder="jane@example.com" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">First Name *</label>
                  <input className={inputCls} style={inputStyle} placeholder="Jane" value={inviteForm.firstName} onChange={e => setInviteForm(f => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Last Name</label>
                  <input className={inputCls} style={inputStyle} placeholder="Smith" value={inviteForm.lastName} onChange={e => setInviteForm(f => ({ ...f, lastName: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Role</label>
                <select className={inputCls} style={inputStyle} value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}>
                  {['viewer', 'staff', 'manager', 'admin'].map(r => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">They'll receive an email invitation to join your organization.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowInvite(false)} className="flex-1 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button
                onClick={handleInvite}
                disabled={inviting || !inviteForm.email.trim() || !inviteForm.firstName.trim()}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
              >
                {inviting ? 'Sending…' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
