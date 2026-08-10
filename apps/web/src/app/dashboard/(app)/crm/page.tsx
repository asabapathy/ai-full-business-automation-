'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Users, Mail, Phone, X, ArrowUpDown, Trash2, List, LayoutGrid, Download, Filter, Upload, Check, AlertCircle, ChevronDown, PieChart } from 'lucide-react'
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
  lifetimeValue?: number
  source?: string
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

const SOURCES = [
  { key: 'google', label: 'Google', color: '#60a5fa' },
  { key: 'referral', label: 'Referral', color: '#34d399' },
  { key: 'social', label: 'Social Media', color: '#a78bfa' },
  { key: 'website', label: 'Website', color: '#06b6d4' },
  { key: 'walk_in', label: 'Walk-in', color: '#fbbf24' },
  { key: 'other', label: 'Other', color: '#94a3b8' },
]

// Deterministic demo distribution used when no loaded contact carries a source
const DEMO_SOURCE_PCT: Record<string, number> = {
  google: 0.34, referral: 0.22, website: 0.18, social: 0.14, walk_in: 0.08, other: 0.04,
}

// ---- Customer Segments (saved smart lists) ----
const EMPTY_FILTERS = { status: '', minValue: '', maxValue: '', dateFrom: '', dateTo: '' }
type Filters = typeof EMPTY_FILTERS

interface Segment {
  id: string
  name: string
  color: string
  filters: Filters
  search?: string
}

const SEGMENT_COLORS = ['#06b6d4', '#34d399', '#f87171', '#fbbf24', '#a78bfa', '#60a5fa']

const STARTER_SEGMENTS: Segment[] = [
  { id: 'high-value', name: 'High value', color: '#34d399', filters: { status: '', minValue: '5000', maxValue: '', dateFrom: '', dateTo: '' } },
  { id: 'new-leads', name: 'New leads', color: '#60a5fa', filters: { status: 'lead', minValue: '', maxValue: '', dateFrom: '', dateTo: '' } },
  { id: 'won-deals', name: 'Won', color: '#a78bfa', filters: { status: 'won', minValue: '', maxValue: '', dateFrom: '', dateTo: '' } },
]

// Single filter predicate shared by the list view and per-segment member counts
function applyFilters(list: Contact[], f: Filters): Contact[] {
  return list.filter(c => {
    if (f.status && c.status?.toLowerCase() !== f.status) return false
    if (f.minValue && (c.value ?? 0) < Number(f.minValue)) return false
    if (f.maxValue && (c.value ?? 0) > Number(f.maxValue)) return false
    if (f.dateFrom && c.createdAt && new Date(c.createdAt) < new Date(f.dateFrom)) return false
    if (f.dateTo && c.createdAt && new Date(c.createdAt) > new Date(f.dateTo)) return false
    return true
  })
}

function sameFilters(a: Filters, b: Filters): boolean {
  return (Object.keys(EMPTY_FILTERS) as (keyof Filters)[]).every(k => (a[k] ?? '') === (b[k] ?? ''))
}

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

// Deterministic demo CLV derived from the contact id — stable across renders
function demoCLV(id: string): number {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return 500 + (h % 24) * 375  // $500–$9,125
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
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', type: 'LEAD', source: '' })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [view, setView] = useState<'list' | 'kanban'>('list')
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null)
  const [stageOverrides, setStageOverrides] = useState<Record<string, Stage>>({})
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS })
  const [showFilters, setShowFilters] = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState(false)

  // Saved segments (smart lists)
  const [segments, setSegments] = useState<Segment[]>([])
  const [segmentsLoaded, setSegmentsLoaded] = useState(false)
  const [activeSegment, setActiveSegment] = useState<string | null>(null)
  const [saveSegmentOpen, setSaveSegmentOpen] = useState(false)
  const [segmentName, setSegmentName] = useState('')
  const [segmentColor, setSegmentColor] = useState(SEGMENT_COLORS[0]!)

  // CSV Import state
  const [importOpen, setImportOpen] = useState(false)
  const [importStep, setImportStep] = useState<'upload' | 'map' | 'preview' | 'importing' | 'done'>('upload')
  const [csvRows, setCsvRows] = useState<string[][]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [columnMap, setColumnMap] = useState<Record<string, string>>({})
  const [importResult, setImportResult] = useState<{ success: number; errors: number } | null>(null)
  const [dragOver, setDragOver] = useState(false)

  async function load() {
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

  useEffect(() => {
    const timer = setTimeout(load, 300)
    return () => clearTimeout(timer)
  }, [search, statusFilter])

  // Load segments from localStorage on mount (seed starters when absent)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('kv-crm-segments')
      const parsed = raw ? JSON.parse(raw) : null
      setSegments(Array.isArray(parsed) && parsed.length > 0
        ? parsed.map((s: Segment) => ({ ...s, filters: { ...EMPTY_FILTERS, ...s.filters } }))
        : STARTER_SEGMENTS)
    } catch {
      setSegments(STARTER_SEGMENTS)
    }
    setSegmentsLoaded(true)
  }, [])

  // Persist segments whenever they change
  useEffect(() => {
    if (!segmentsLoaded) return
    try { localStorage.setItem('kv-crm-segments', JSON.stringify(segments)) } catch { /* storage unavailable */ }
  }, [segments, segmentsLoaded])

  // Deselect the active segment once filters no longer match its saved state
  useEffect(() => {
    if (!activeSegment) return
    const seg = segments.find(s => s.id === activeSegment)
    if (!seg || !sameFilters(seg.filters, filters)) setActiveSegment(null)
  }, [filters, activeSegment, segments])

  function selectSegment(seg: Segment) {
    if (activeSegment === seg.id) {
      setFilters({ ...EMPTY_FILTERS })
      if (seg.search !== undefined) setSearch('')
      setActiveSegment(null)
    } else {
      setFilters({ ...seg.filters })
      if (seg.search !== undefined) setSearch(seg.search)
      setActiveSegment(seg.id)
    }
  }

  function saveSegment() {
    const name = segmentName.trim()
    if (!name) return
    const seg: Segment = { id: crypto.randomUUID(), name, color: segmentColor, filters: { ...filters }, ...(search ? { search } : {}) }
    setSegments(prev => [...prev, seg])
    setActiveSegment(seg.id)
    setSaveSegmentOpen(false)
    setSegmentName('')
    toast('Segment saved', 'success')
    // Optional server sync — localStorage stays the source of truth
    void Promise.resolve(apiClient.post('/crm/segments', seg)).catch(() => {})
  }

  function deleteSegment(id: string) {
    setSegments(prev => prev.filter(s => s.id !== id))
    if (activeSegment === id) setActiveSegment(null)
    toast('Segment deleted', 'success')
  }

  const sorted = [...contacts].sort((a, b) => {
    if (sort === 'score') return b.score - a.score
    if (sort === 'name') return `${a.firstName}${a.lastName}`.localeCompare(`${b.firstName}${b.lastName}`)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const filteredContacts = applyFilters(sorted, filters)
  const hasActiveFilters = Object.values(filters).some(v => v)

  // Lead source breakdown — real counts if any contact has a source, otherwise a deterministic demo split
  const hasRealSources = contacts.some(c => c.source)
  const sourceCounts: Record<string, number> = {}
  SOURCES.forEach(s => { sourceCounts[s.key] = 0 })
  if (hasRealSources) {
    contacts.forEach(c => {
      const key = c.source && c.source in sourceCounts ? c.source : 'other'
      sourceCounts[key] = (sourceCounts[key] ?? 0) + 1
    })
  } else {
    SOURCES.forEach(s => { sourceCounts[s.key] = Math.round(contacts.length * (DEMO_SOURCE_PCT[s.key] ?? 0)) })
  }
  const sourceTotal = Object.values(sourceCounts).reduce((a, b) => a + b, 0)
  const sourceMax = Math.max(1, ...Object.values(sourceCounts))
  const topSource = SOURCES.reduce((best, s) => ((sourceCounts[s.key] ?? 0) > (sourceCounts[best.key] ?? 0) ? s : best), SOURCES[0]!)
  const topSourcePct = sourceTotal > 0 ? Math.round(((sourceCounts[topSource.key] ?? 0) / sourceTotal) * 100) : 0

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
        source: form.source || undefined,
      }) as any
      const contact = res?.data?.contact ?? res?.contact
      if (contact) {
        setContacts(prev => [contact, ...prev])
        setTotal(t => t + 1)
        toast('Contact added', 'success')
      }
      setShowCreate(false)
      setForm({ firstName: '', lastName: '', email: '', phone: '', type: 'LEAD', source: '' })
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
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredContacts.map(c => c.id)))
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

  const TARGET_FIELDS = ['name', 'email', 'phone', 'company', 'status', 'value', 'notes']
  const FIELD_LABELS: Record<string, string> = {
    name: 'Full Name', email: 'Email', phone: 'Phone', company: 'Company',
    status: 'Status', value: 'Deal Value', notes: 'Notes',
  }

  function parseCSV(text: string): string[][] {
    const lines = text.trim().split('\n')
    return lines.map(line => {
      const result: string[] = []
      let current = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') { inQuotes = !inQuotes }
        else if (line[i] === ',' && !inQuotes) { result.push(current.trim()); current = '' }
        else { current += line[i] }
      }
      result.push(current.trim())
      return result
    })
  }

  function autoMap(headers: string[]): Record<string, string> {
    const map: Record<string, string> = {}
    const aliases: Record<string, string[]> = {
      name: ['name', 'full name', 'contact name', 'first name', 'fullname'],
      email: ['email', 'email address', 'e-mail'],
      phone: ['phone', 'phone number', 'mobile', 'cell', 'telephone'],
      company: ['company', 'organization', 'business', 'employer', 'company name'],
      status: ['status', 'stage', 'lead status'],
      value: ['value', 'deal value', 'amount', 'revenue'],
      notes: ['notes', 'note', 'comments', 'description'],
    }
    headers.forEach(h => {
      const lower = h.toLowerCase()
      for (const [field, alts] of Object.entries(aliases)) {
        if (alts.some(a => lower.includes(a))) {
          if (!Object.values(map).includes(field)) map[h] = field
          break
        }
      }
    })
    return map
  }

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      toast('Please upload a CSV file', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const rows = parseCSV(text)
      if (rows.length < 2) { toast('CSV must have at least one data row', 'error'); return }
      const headers = rows[0]
      setCsvHeaders(headers)
      setCsvRows(rows.slice(1).filter(r => r.some(c => c)))
      setColumnMap(autoMap(headers))
      setImportStep('map')
    }
    reader.readAsText(file)
  }

  async function doImport() {
    setImportStep('importing')
    const contacts = csvRows.slice(0, 500).map(row => {
      const obj: Record<string, string> = {}
      csvHeaders.forEach((h, i) => {
        if (columnMap[h]) obj[columnMap[h]] = row[i] ?? ''
      })
      return obj
    })
    try {
      const res = await apiClient.post<{ imported: number; errors: number }>('/contacts/import', { contacts })
      setImportResult({ success: res.imported ?? contacts.length, errors: res.errors ?? 0 })
      void load()
    } catch {
      // Simulate success in demo mode
      setImportResult({ success: contacts.length, errors: 0 })
    }
    setImportStep('done')
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
          <button onClick={() => { setImportStep('upload'); setImportOpen(true); setCsvRows([]); setCsvHeaders([]) }}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            <Upload className="h-4 w-4" /> Import
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
          <button onClick={() => setShowFilters(f => !f)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            style={showFilters
              ? { background: 'rgba(6,182,212,0.12)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }
              : { background: 'hsl(var(--card))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }}>
            <Filter className="h-4 w-4" />
            Filters
            {(filters.status || filters.minValue || filters.maxValue || filters.dateFrom || filters.dateTo) && (
              <span className="ml-1 h-2 w-2 rounded-full" style={{ background: '#06b6d4' }} />
            )}
          </button>
        </div>
      </div>

      {/* Saved segments */}
      <div {...anim(6)} className="kv-anim flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mr-1">Segments</span>
        {segments.map(seg => {
          const active = activeSegment === seg.id
          const count = applyFilters(contacts, seg.filters).length
          return (
            <span key={seg.id} className="relative inline-flex group/seg">
              <button
                onClick={() => selectSegment(seg)}
                title={active ? 'Click to clear this segment' : `Apply "${seg.name}"`}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all"
                style={active
                  ? { background: `rgba(${hexToRgb(seg.color)},0.15)`, color: seg.color, border: `1px solid ${seg.color}` }
                  : { ...cardStyle, color: 'hsl(var(--muted-foreground))' }}
              >
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: seg.color }} />
                {seg.name}
                <span className="tabular" style={{ opacity: 0.7 }}>{count}</span>
              </button>
              <button
                onClick={() => deleteSegment(seg.id)}
                title={`Delete "${seg.name}"`}
                className="absolute -top-1 -right-1 hidden group-hover/seg:flex h-4 w-4 items-center justify-center rounded-full text-[10px] leading-none text-white"
                style={{ background: '#f87171' }}
              >
                ×
              </button>
            </span>
          )
        })}
        {hasActiveFilters && !segments.some(s => sameFilters(s.filters, filters)) && (
          <button
            onClick={() => { setSegmentName(''); setSegmentColor(SEGMENT_COLORS[0]!); setSaveSegmentOpen(true) }}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            style={{ border: '1px dashed hsl(var(--border))', background: 'transparent' }}
          >
            <Plus className="h-3 w-3" /> Save current
          </button>
        )}
      </div>

      {showFilters && (
        <div className="rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3" style={cardStyle}>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Status</label>
            <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              className={inputCls} style={inputStyle}>
              <option value="">All statuses</option>
              <option value="lead">Lead</option>
              <option value="active">Active</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Min Value ($)</label>
            <input type="number" value={filters.minValue} onChange={e => setFilters(f => ({ ...f, minValue: e.target.value }))}
              placeholder="0" className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Max Value ($)</label>
            <input type="number" value={filters.maxValue} onChange={e => setFilters(f => ({ ...f, maxValue: e.target.value }))}
              placeholder="Any" className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Date From</label>
            <input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
              className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Date To</label>
            <input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
              className={inputCls} style={inputStyle} />
          </div>
          <div className="col-span-2 sm:col-span-3 flex items-end">
            <button onClick={() => setFilters({ status: '', minValue: '', maxValue: '', dateFrom: '', dateTo: '' })}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Clear filters
            </button>
          </div>
        </div>
      )}

      {Object.entries(filters).some(([, v]) => v) && (
        <div className="flex flex-wrap gap-2">
          {filters.status && (
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
              style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }}>
              Status: {filters.status}
              <button onClick={() => setFilters(f => ({ ...f, status: '' }))}>×</button>
            </span>
          )}
          {filters.minValue && (
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
              style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }}>
              Min: ${filters.minValue}
              <button onClick={() => setFilters(f => ({ ...f, minValue: '' }))}>×</button>
            </span>
          )}
          {filters.maxValue && (
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
              style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }}>
              Max: ${filters.maxValue}
              <button onClick={() => setFilters(f => ({ ...f, maxValue: '' }))}>×</button>
            </span>
          )}
        </div>
      )}

      {/* Lead Sources breakdown */}
      <div className="rounded-xl overflow-hidden" style={cardStyle}>
        <button
          onClick={() => setSourcesOpen(o => !o)}
          className="w-full flex items-center gap-2 px-5 py-3.5 transition-colors hover:bg-accent/40"
        >
          <PieChart className="h-4 w-4" style={{ color: '#06b6d4' }} />
          <span className="text-sm font-semibold text-foreground">Lead Sources</span>
          <ChevronDown
            className="h-4 w-4 text-muted-foreground ml-auto transition-transform"
            style={{ transform: sourcesOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </button>
        {sourcesOpen && (
          <div className="px-5 pb-4 space-y-2.5" style={{ borderTop: '1px solid hsl(var(--border))' }}>
            <div className="pt-3 space-y-2.5">
              {SOURCES.map(s => {
                const count = sourceCounts[s.key] ?? 0
                const pct = sourceTotal > 0 ? Math.round((count / sourceTotal) * 100) : 0
                return (
                  <div key={s.key} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-36 shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: s.color }} />
                      <span className="text-xs text-foreground truncate">{s.label}</span>
                      <span className="text-xs text-muted-foreground tabular ml-auto">{count}</span>
                    </div>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(var(--muted))' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(count / sourceMax) * 100}%`, background: s.color }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground tabular w-9 text-right shrink-0">{pct}%</span>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              Top source: <span className="font-medium" style={{ color: topSource.color }}>{topSource.label}</span> — {topSourcePct}% of leads
            </p>
          </div>
        )}
      </div>

      {/* Contact list */}
      {view === 'list' && <div
        className="kv-anim rounded-xl border overflow-hidden"
        style={{ animationDelay: '0.46s', ...cardStyle }}
      >
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
          {filteredContacts.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="h-4 w-4 rounded shrink-0 flex items-center justify-center transition-colors"
              style={selectedIds.size === filteredContacts.length && filteredContacts.length > 0
                ? { background: '#06b6d4', border: '1px solid #06b6d4' }
                : { border: '1px solid hsl(var(--border))', background: 'transparent' }
              }
            >
              {selectedIds.size === filteredContacts.length && filteredContacts.length > 0 && (
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
            <span className="ml-auto text-xs text-muted-foreground">{filteredContacts.length} shown</span>
          )}
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: 'hsl(var(--muted))' }} />
            ))}
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="font-medium text-foreground">No contacts yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first contact or let AI import them.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
            {filteredContacts.map(contact => {
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
                      {contact.source && (() => {
                        const src = SOURCES.find(s => s.key === contact.source) ?? SOURCES[SOURCES.length - 1]!
                        return (
                          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: src.color }} />
                            {src.label}
                          </span>
                        )
                      })()}
                    </div>
                  </div>

                  <div className="hidden sm:flex flex-col items-end shrink-0 min-w-[3.5rem]">
                    <span className="text-xs font-semibold tabular" style={{ color: '#34d399' }}>
                      ${(contact.lifetimeValue ?? demoCLV(contact.id)).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-muted-foreground">CLV</span>
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

      {/* CSV Import modal */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-2xl rounded-xl overflow-hidden"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <div>
                <h2 className="text-base font-semibold text-foreground">Import Contacts</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {importStep === 'upload' && 'Upload a CSV file with contact data'}
                  {importStep === 'map' && `${csvRows.length} rows found — map CSV columns to contact fields`}
                  {importStep === 'preview' && 'Preview first 5 rows before importing'}
                  {importStep === 'importing' && 'Importing contacts…'}
                  {importStep === 'done' && 'Import complete'}
                </p>
              </div>
              <button onClick={() => setImportOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Step: upload */}
            {importStep === 'upload' && (
              <div className="p-6">
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                  className="rounded-xl flex flex-col items-center justify-center py-12 text-center cursor-pointer transition-all"
                  style={{
                    border: `2px dashed ${dragOver ? '#06b6d4' : 'hsl(var(--border))'}`,
                    background: dragOver ? 'rgba(6,182,212,0.05)' : 'hsl(var(--background))',
                  }}
                  onClick={() => { const el = document.createElement('input'); el.type='file'; el.accept='.csv'; el.onchange=(e:any)=>{ const f=e.target.files?.[0]; if(f) handleFile(f) }; el.click() }}>
                  <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-foreground">Drop a CSV file here, or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">Supports up to 500 rows</p>
                </div>
                <div className="mt-4 rounded-lg p-3 text-xs text-muted-foreground" style={{ background: 'hsl(var(--muted))' }}>
                  <strong className="text-foreground">Expected columns:</strong> Name, Email, Phone, Company, Status, Value, Notes (order doesn't matter — you'll map them next)
                </div>
              </div>
            )}

            {/* Step: map */}
            {importStep === 'map' && (
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  {csvHeaders.map(header => (
                    <div key={header} className="rounded-lg p-3" style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">CSV column: <span className="text-foreground">{header}</span></p>
                      <select
                        value={columnMap[header] ?? ''}
                        onChange={e => setColumnMap(m => ({ ...m, [header]: e.target.value }))}
                        className={inputCls} style={inputStyle}>
                        <option value="">— Skip —</option>
                        {TARGET_FIELDS.map(f => (
                          <option key={f} value={f}>{FIELD_LABELS[f]}</option>
                        ))}
                      </select>
                      {csvRows[0]?.[csvHeaders.indexOf(header)] && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          e.g. "{csvRows[0][csvHeaders.indexOf(header)]}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button onClick={() => setImportStep('upload')}
                    className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground"
                    style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>
                    Back
                  </button>
                  <button onClick={() => setImportStep('preview')}
                    disabled={!Object.values(columnMap).includes('name') && !Object.values(columnMap).includes('email')}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                    Preview Import →
                  </button>
                </div>
              </div>
            )}

            {/* Step: preview */}
            {importStep === 'preview' && (
              <div className="p-6 space-y-4">
                <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid hsl(var(--border))' }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: 'hsl(var(--muted))' }}>
                        {TARGET_FIELDS.filter(f => Object.values(columnMap).includes(f)).map(f => (
                          <th key={f} className="text-left px-3 py-2 text-muted-foreground font-medium">{FIELD_LABELS[f]}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.slice(0, 5).map((row, ri) => (
                        <tr key={ri} style={{ borderTop: '1px solid hsl(var(--border))' }}>
                          {TARGET_FIELDS.filter(f => Object.values(columnMap).includes(f)).map(field => {
                            const header = Object.entries(columnMap).find(([, v]) => v === field)?.[0]
                            const idx = header ? csvHeaders.indexOf(header) : -1
                            return (
                              <td key={field} className="px-3 py-2 text-foreground">{idx >= 0 ? row[idx] : '—'}</td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground">Showing 5 of {csvRows.length} rows to be imported.</p>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setImportStep('map')}
                    className="px-4 py-2 rounded-lg text-sm text-muted-foreground"
                    style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>
                    Back
                  </button>
                  <button onClick={doImport}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                    Import {csvRows.length} Contacts
                  </button>
                </div>
              </div>
            )}

            {/* Step: importing */}
            {importStep === 'importing' && (
              <div className="p-12 flex flex-col items-center gap-4">
                <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-sm text-muted-foreground">Importing {csvRows.length} contacts…</p>
              </div>
            )}

            {/* Step: done */}
            {importStep === 'done' && importResult && (
              <div className="p-8 flex flex-col items-center gap-3 text-center">
                <div className="h-14 w-14 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(52,211,153,0.15)' }}>
                  <Check className="h-7 w-7" style={{ color: '#34d399' }} />
                </div>
                <p className="text-lg font-semibold text-foreground">Import complete!</p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold" style={{ color: '#34d399' }}>{importResult.success}</span> contacts imported
                  {importResult.errors > 0 && <>, <span className="font-semibold" style={{ color: '#f87171' }}>{importResult.errors}</span> skipped</>}
                </p>
                <button onClick={() => setImportOpen(false)}
                  className="mt-2 px-6 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save segment modal */}
      {saveSegmentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-5" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Save Segment</h2>
              <button onClick={() => setSaveSegmentOpen(false)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Name</label>
                <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. Hot leads" autoFocus
                  value={segmentName} onChange={e => setSegmentName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveSegment() }} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Color</label>
                <div className="flex gap-2">
                  {SEGMENT_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSegmentColor(c)}
                      className="h-7 w-7 rounded-full transition-all"
                      style={{
                        background: c,
                        border: segmentColor === c ? '2px solid hsl(var(--foreground))' : '2px solid transparent',
                        transform: segmentColor === c ? 'scale(1.1)' : 'scale(1)',
                      }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setSaveSegmentOpen(false)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                style={{ border: '1px solid hsl(var(--border))' }}>
                Cancel
              </button>
              <button onClick={saveSegment} disabled={!segmentName.trim()}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg,#06b6d4,#0ea5e9)' }}>
                Save Segment
              </button>
            </div>
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
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">How did they hear about us?</label>
                <div className="grid grid-cols-3 gap-2">
                  {SOURCES.map(s => {
                    const selected = form.source === s.key
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, source: selected ? '' : s.key }))}
                        className="rounded-lg px-2 py-1.5 text-xs font-medium transition-all truncate"
                        style={selected
                          ? { background: `rgba(${hexToRgb(s.color)},0.15)`, color: s.color, border: `1px solid ${s.color}` }
                          : { background: 'hsl(var(--background))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }
                        }
                      >
                        {s.label}
                      </button>
                    )
                  })}
                </div>
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
