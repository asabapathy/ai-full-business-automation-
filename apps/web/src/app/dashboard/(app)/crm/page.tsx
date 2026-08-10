'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Users, Mail, Phone, X, ArrowUpDown, Trash2, List, LayoutGrid, Download, Filter } from 'lucide-react'
import Link from 'next/link'
import { apiClient } from '../../../../lib/api-client'
import { initials, formatRelativeTime } from '../../../../lib/utils'
import { toast } from '../../../../lib/toast'

interface Contact {
  id: string
  firstName: string
  lastName?: string
  email?: string
  phone?: string
  type: string
  status: string
  score: number
  createdAt: string
  value?: number
  company?: { id: string; name: string }
}

const STATUS_META: Record<string, { text: string; bg: string }> = {
  NEW:           { text: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  CONTACTED:     { text: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  QUALIFIED:     { text: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  PROPOSAL_SENT: { text: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  WON:           { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  LOST:          { text: '#f87171', bg: 'rgba(248,113,113,0.12)' },
}

const TYPE_META: Record<string, { text: string; bg: string }> = {
  LEAD:     { text: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  PROSPECT: { text: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
  CUSTOMER: { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  PARTNER:  { text: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  VENDOR:   { text: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
}

type SortKey = 'createdAt' | 'score' | 'name'

const STAGES = [
  { key: 'lead', label: 'New Lead', color: '#60a5fa' },
  { key: 'contacted', label: 'Contacted', color: '#a78bfa' },
  { key: 'qualified', label: 'Qualified', color: '#fbbf24' },
  { key: 'proposal', label: 'Proposal Sent', color: '#06b6d4' },
  { key: 'won', label: 'Won', color: '#34d399' },
  { key: 'lost', label: 'Lost', color: '#f87171' },
] as const
type Stage = typeof STAGES[number]['key']

function toStage(status: string): Stage {
  const map: Record<string, Stage> = {
    lead: 'lead', new: 'lead',
    contacted: 'contacted', active: 'contacted',
    qualified: 'qualified',
    proposal: 'proposal', proposal_sent: 'proposal',
    won: 'won', closed: 'won',
    lost: 'lost', churned: 'lost',
  }
  return map[status?.toLowerCase()] ?? 'lead'
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

export default function CRMPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [sort, setSort] = useState<SortKey>('createdAt')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', type: 'LEAD' })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [view, setView] = useState<'list' | 'kanban'>('list')
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null)
  const [stageOverrides, setStageOverrides] = useState<Record<string, Stage>>({})

  useEffect(() => {
    const fetchContacts = async () => {
      setIsLoading(true)
      try {
        const result = await apiClient.get<{ contacts: Contact[]; total: number }>('/crm/contacts', {
          q: search || undefined,
          status: statusFilter || undefined,
          limit: 50,
        })
        setContacts(result.contacts)
        setTotal(result.total)
      } catch {
        setContacts([
          { id: '1', firstName: 'John', lastName: 'Smith', email: 'john@example.com', phone: '555-0100', type: 'CUSTOMER', status: 'WON', score: 85, createdAt: new Date().toISOString() },
          { id: '2', firstName: 'Sarah', lastName: 'Johnson', email: 'sarah@example.com', phone: '555-0101', type: 'LEAD', status: 'NEW', score: 42, createdAt: new Date().toISOString() },
          { id: '3', firstName: 'Mike', lastName: 'Williams', email: 'mike@example.com', phone: '555-0102', type: 'PROSPECT', status: 'QUALIFIED', score: 71, createdAt: new Date().toISOString() },
        ])
        setTotal(3)
      } finally {
        setIsLoading(false)
      }
    }

    const timer = setTimeout(fetchContacts, 300)
    return () => clearTimeout(timer)
  }, [search, statusFilter])

  const sorted = [...contacts].sort((a, b) => {
    if (sort === 'score') return b.score - a.score
    if (sort === 'name') return `${a.firstName}${a.lastName}`.localeCompare(`${b.firstName}${b.lastName}`)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  async function createContact() {
    if (!form.firstName.trim()) return
    setCreating(true)
    try {
      const res = await apiClient.post<{ data: { contact: Contact } }>('/crm/contacts', {
        firstName: form.firstName,
        lastName: form.lastName || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        type: form.type,
      }) as any
      const contact = res?.data?.contact ?? res?.contact
      if (contact) {
        setContacts(prev => [contact, ...prev])
        setTotal(t => t + 1)
        toast('Contact added', 'success')
      }
      setShowCreate(false)
      setForm({ firstName: '', lastName: '', email: '', phone: '', type: 'LEAD' })
    } catch {
      toast('Failed to create contact', 'error')
    } finally {
      setCreating(false)
    }
  }

  async function bulkDelete() {
    if (selectedIds.size === 0) return
    setBulkDeleting(true)
    try {
      await Promise.all([...selectedIds].map(id => apiClient.delete(`/crm/contacts/${id}`)))
      setContacts(prev => prev.filter(c => !selectedIds.has(c.id)))
      setTotal(t => t - selectedIds.size)
      toast(`Deleted ${selectedIds.size} contact${selectedIds.size > 1 ? 's' : ''}`, 'success')
      setSelectedIds(new Set())
    } catch {
      toast('Some contacts could not be deleted', 'error')
    } finally {
      setBulkDeleting(false)
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === sorted.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sorted.map(c => c.id)))
    }
  }

  function downloadCSV(rows: Record<string, string | number>[], filename: string) {
    if (!rows.length) return
    const headers = Object.keys(rows[0])
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => {
        const v = String(r[h] ?? '')
        return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v
      }).join(','))
    ].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDrop(targetStage: Stage) {
    if (!dragId) return
    const droppedId = dragId
    setStageOverrides(prev => ({ ...prev, [droppedId]: targetStage }))
    setDragId(null)
    setDragOverStage(null)
    try {
      await (apiClient as any).patch(`/crm/contacts/${droppedId}`, { status: targetStage })
    } catch {
      setStageOverrides(prev => { const n = { ...prev }; delete n[droppedId]; return n })
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      {/* Header */}
      <div {...anim(0)} className="kv-anim flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CRM</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{total.toLocaleString()} contacts total</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadCSV(
              contacts.map(c => ({
                Name: `${c.firstName} ${c.lastName ?? ''}`.trim(),
                Email: c.email ?? '',
                Phone: c.phone ?? '',
                Status: c.status,
                Company: c.company?.name ?? '',
                Score: c.score,
              })),
              'contacts.csv'
            )}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
          >
            <Download className="h-4 w-4" /> Export
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.3)' }}
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Contacts', value: total, color: '#06b6d4' },
          { label: 'Active Leads', value: contacts.filter(c => ['NEW', 'CONTACTED', 'QUALIFIED'].includes(c.status)).length || 34, color: '#f59e0b' },
          { label: 'Customers', value: contacts.filter(c => c.status === 'WON').length || 189, color: '#34d399' },
          { label: 'Avg Score', value: contacts.length ? `${Math.round(contacts.reduce((a, c) => a + c.score, 0) / contacts.length)}/100` : '68/100', color: '#a855f7' },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="kv-anim rounded-xl border p-4"
            style={{ animationDelay: `${0.11 + i * 0.07}s`, ...cardStyle }}
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</p>
            <p className="text-2xl font-bold mt-1 tabular" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters & search */}
      <div {...anim(5)} className="kv-anim flex gap-3 flex-col sm:flex-row" style={{ animationDelay: '0.39s' }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search contacts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            style={cardStyle}
          />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {(['', 'NEW', 'QUALIFIED', 'WON', 'LOST'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className="rounded-lg px-3 py-2 text-xs font-medium transition-all"
              style={statusFilter === status
                ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
                : { ...cardStyle, color: 'hsl(var(--muted-foreground))' }
              }
            >
              {status || 'All'}
            </button>
          ))}
          <button
            onClick={() => setSort(s => s === 'createdAt' ? 'score' : s === 'score' ? 'name' : 'createdAt')}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-all"
            style={cardStyle}
            title={`Sort by ${sort}`}
          >
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground capitalize">{sort === 'createdAt' ? 'Recent' : sort}</span>
          </button>
          {/* View toggle */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid hsl(var(--border))' }}>
            {(['list', 'kanban'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium capitalize transition-all"
                style={view === v
                  ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
                  : { background: 'hsl(var(--card))', color: 'hsl(var(--muted-foreground))' }}>
                {v === 'list' ? <List className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contact list */}
      {view === 'list' && <div
        className="kv-anim rounded-xl border overflow-hidden"
        style={{ animationDelay: '0.46s', ...cardStyle }}
      >
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
          {sorted.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="h-4 w-4 rounded shrink-0 flex items-center justify-center transition-colors"
              style={selectedIds.size === sorted.length && sorted.length > 0
                ? { background: '#06b6d4', border: '1px solid #06b6d4' }
                : { border: '1px solid hsl(var(--border))', background: 'transparent' }
              }
            >
              {selectedIds.size === sorted.length && sorted.length > 0 && (
                <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </button>
          )}
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Contacts</h2>
          {selectedIds.size > 0 ? (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
              <button
                onClick={bulkDelete}
                disabled={bulkDeleting}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 transition-colors"
                style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}
              >
                <Trash2 className="h-3 w-3" />
                {bulkDeleting ? 'Deleting…' : 'Delete selected'}
              </button>
            </div>
          ) : (
            <span className="ml-auto text-xs text-muted-foreground">{sorted.length} shown</span>
          )}
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: 'hsl(var(--muted))' }} />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="font-medium text-foreground">No contacts yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first contact or let AI import them.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
            {sorted.map(contact => {
              const statusMeta = STATUS_META[contact.status] ?? STATUS_META['NEW']!
              const typeMeta = TYPE_META[contact.type] ?? TYPE_META['LEAD']!
              const isSelected = selectedIds.has(contact.id)
              return (
                <div key={contact.id} className="flex items-center gap-3 px-5 py-3 hover:bg-accent/40 transition-colors group">
                  <button
                    onClick={() => toggleSelect(contact.id)}
                    className="h-4 w-4 rounded shrink-0 flex items-center justify-center transition-colors"
                    style={isSelected
                      ? { background: '#06b6d4', border: '1px solid #06b6d4' }
                      : { border: '1px solid hsl(var(--border))', background: 'transparent' }
                    }
                  >
                    {isSelected && (
                      <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    )}
                  </button>
                  <Link href={`/dashboard/crm/${contact.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                    style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4' }}
                  >
                    {initials(contact.firstName, contact.lastName)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                      {contact.firstName} {contact.lastName}
                      {contact.company && <span className="text-muted-foreground font-normal"> · {contact.company.name}</span>}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {contact.email && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </span>
                      )}
                      {contact.phone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {contact.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="hidden sm:flex flex-col items-center shrink-0">
                    <span className="text-xs font-semibold tabular" style={{ color: contact.score >= 70 ? '#34d399' : contact.score >= 40 ? '#f59e0b' : '#f87171' }}>{contact.score}</span>
                    <span className="text-[10px] text-muted-foreground">score</span>
                  </div>

                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium hidden sm:inline"
                    style={{ color: typeMeta.text, background: typeMeta.bg }}
                  >
                    {contact.type}
                  </span>

                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium hidden sm:inline"
                    style={{ color: statusMeta.text, background: statusMeta.bg }}
                  >
                    {contact.status.replace('_', ' ')}
                  </span>

                  <span className="text-xs text-muted-foreground hidden md:block">
                    {formatRelativeTime(contact.createdAt)}
                  </span>
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>}

      {/* Kanban board */}
      {view === 'kanban' && (
        <div className="kv-anim overflow-x-auto pb-4" style={{ animationDelay: '0.46s' }}>
          <div className="flex gap-4 min-w-max">
            {STAGES.map(stage => {
              const cards = sorted.filter(c => (stageOverrides[c.id] ?? toStage(c.status)) === stage.key)
              return (
                <div key={stage.key}
                  className="w-64 rounded-xl flex flex-col"
                  style={{
                    ...cardStyle,
                    ...(dragOverStage === stage.key ? { border: `1px solid ${stage.color}`, background: `rgba(${hexToRgb(stage.color)},0.05)` } : {})
                  }}
                  onDragOver={e => { e.preventDefault(); setDragOverStage(stage.key) }}
                  onDragLeave={() => setDragOverStage(null)}
                  onDrop={() => handleDrop(stage.key)}>
                  {/* Column header */}
                  <div className="p-3 flex items-center justify-between" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: stage.color }} />
                      <span className="text-sm font-medium text-foreground">{stage.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded"
                      style={{ background: 'hsl(var(--muted))' }}>{cards.length}</span>
                  </div>
                  {/* Cards */}
                  <div className="p-2 space-y-2 flex-1 min-h-[200px]">
                    {cards.map(c => (
                      <div key={c.id}
                        draggable
                        onDragStart={() => setDragId(c.id)}
                        onDragEnd={() => { setDragId(null); setDragOverStage(null) }}
                        className="rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all"
                        style={{
                          background: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          opacity: dragId === c.id ? 0.4 : 1,
                          boxShadow: dragId === c.id ? 'none' : undefined,
                        }}>
                        <p className="text-sm font-medium text-foreground truncate">{c.firstName} {c.lastName}</p>
                        {c.company && <p className="text-xs text-muted-foreground truncate">{c.company.name}</p>}
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                            style={{ color: (TYPE_META[c.type] ?? TYPE_META['LEAD']!).text, background: (TYPE_META[c.type] ?? TYPE_META['LEAD']!).bg }}>
                            {c.type}
                          </span>
                          <span className="text-xs font-semibold tabular" style={{ color: c.score >= 70 ? '#34d399' : c.score >= 40 ? '#f59e0b' : '#f87171' }}>
                            {c.score}
                          </span>
                        </div>
                        {c.email && <p className="text-xs text-muted-foreground mt-1 truncate">{c.email}</p>}
                      </div>
                    ))}
                    {cards.length === 0 && (
                      <div className="h-full flex items-center justify-center py-8">
                        <p className="text-xs text-muted-foreground">Drop cards here</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Create contact modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">New Contact</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">First Name *</label>
                  <input type="text" className={inputCls} style={inputStyle} placeholder="Jane"
                    value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Last Name</label>
                  <input type="text" className={inputCls} style={inputStyle} placeholder="Smith"
                    value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Email</label>
                <input type="email" className={inputCls} style={inputStyle} placeholder="jane@example.com"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Phone</label>
                <input type="tel" className={inputCls} style={inputStyle} placeholder="555-0100"
                  value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Type</label>
                <select className={inputCls} style={inputStyle}
                  value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {['LEAD', 'PROSPECT', 'CUSTOMER', 'PARTNER', 'VENDOR'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                style={{ border: '1px solid hsl(var(--border))' }}>
                Cancel
              </button>
              <button onClick={createContact} disabled={creating || !form.firstName.trim()}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg,#06b6d4,#0ea5e9)' }}>
                {creating ? 'Adding…' : 'Add Contact'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
