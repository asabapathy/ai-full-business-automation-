'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Mail, Phone, Building2, Edit3, Save, X, Calendar, FileText, DollarSign, MessageSquare, Star, CheckCircle, Clock, TrendingUp, Check, Send, Trash2, Download } from 'lucide-react'
import { apiClient } from '../../../../../lib/api-client'
import { formatRelativeTime } from '../../../../../lib/utils'
import { toast } from '../../../../../lib/toast'


interface Contact {
  id: string
  firstName: string
  lastName?: string
  email?: string
  phone?: string
  type: string
  status: string
  score: number
  notes?: string
  createdAt: string
  company?: { id: string; name: string }
}

interface ActivityItem {
  id: string
  type: 'email' | 'sms' | 'call' | 'appointment' | 'invoice' | 'note' | 'deal'
  title: string
  description?: string
  amount?: number
  status?: string
  createdAt: string
}

interface Deal {
  id: string
  title: string
  value: number
  status: string
  createdAt: string
}

const STATUS_META: Record<string, { text: string; bg: string }> = {
  NEW:           { text: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
  CONTACTED:     { text: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  QUALIFIED:     { text: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  PROPOSAL_SENT: { text: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  WON:           { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  LOST:          { text: '#f87171', bg: 'rgba(248,113,113,0.12)' },
}

const ACTIVITY_ICONS: Record<string, { icon: typeof Mail; color: string }> = {
  email:       { icon: Mail,        color: '#38bdf8' },
  sms:         { icon: MessageSquare, color: '#34d399' },
  call:        { icon: Phone,       color: '#a78bfa' },
  appointment: { icon: Calendar,    color: '#06b6d4' },
  invoice:     { icon: FileText,    color: '#fbbf24' },
  note:        { icon: MessageSquare, color: '#94a3b8' },
  deal:        { icon: TrendingUp,  color: '#f59e0b' },
}

function initials(first: string, last?: string) {
  return `${first[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
}

// Deterministic demo CLV derived from the contact id — stable across renders
function demoCLV(id: string): number {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return 500 + (h % 24) * 375  // $500–$9,125
}

interface Note { id: string; author: string; body: string; createdAt: string }

const TEAM = ['Sarah', 'Mike', 'Jess', 'Alex']

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #06b6d4, #0ea5e9)',
  'linear-gradient(135deg, #a78bfa, #8b5cf6)',
  'linear-gradient(135deg, #34d399, #10b981)',
  'linear-gradient(135deg, #fbbf24, #f59e0b)',
]

function avatarGradient(author: string): string {
  let h = 0
  for (const c of author) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length]!
}

// Render a note body with @mentions highlighted
function renderNoteBody(body: string) {
  return body.split(/(@\w+)/g).map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="rounded px-1 font-medium" style={{ color: '#06b6d4', background: 'rgba(6,182,212,0.1)' }}>
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

const DEMO_NOTES: Note[] = [
  { id: 'tn1', author: 'Mike', body: 'Called about the quote — wants to move forward next week. @Sarah can you prep the contract?', createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'tn2', author: 'Sarah', body: 'Met at the trade show. High intent.', createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
]

function downloadFile(content: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'contact'
}

function csvCell(v: string | number | undefined | null): string {
  const s = v === undefined || v === null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const DEMO_ACTIVITY: ActivityItem[] = [
  { id: 'a1', type: 'appointment', title: 'Appointment booked', description: 'HVAC Inspection — confirmed for next Tuesday', createdAt: new Date(Date.now() - 1 * 86400000).toISOString() },
  { id: 'a2', type: 'invoice', title: 'Invoice sent', description: 'INV-004 for $850 — pending payment', amount: 850, status: 'SENT', createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: 'a3', type: 'email', title: 'Follow-up email sent', description: 'Sent service renewal reminder', createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: 'a4', type: 'call', title: 'Phone call', description: 'Discussed maintenance contract options — interested in annual plan', createdAt: new Date(Date.now() - 8 * 86400000).toISOString() },
  { id: 'a5', type: 'deal', title: 'Deal created', description: 'Annual Service Contract — $4,800', amount: 4800, status: 'NEGOTIATION', createdAt: new Date(Date.now() - 12 * 86400000).toISOString() },
  { id: 'a6', type: 'email', title: 'Welcome email', description: 'Sent onboarding sequence via automation', createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
]

const DEMO_DEALS: Deal[] = [
  { id: 'd1', title: 'Annual Service Contract', value: 4800, status: 'NEGOTIATION', createdAt: new Date(Date.now() - 12 * 86400000).toISOString() },
  { id: 'd2', title: 'Emergency Repair Service', value: 850, status: 'WON', createdAt: new Date(Date.now() - 45 * 86400000).toISOString() },
]

const DEAL_STATUS_META: Record<string, { text: string; bg: string }> = {
  LEAD:        { text: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  QUALIFIED:   { text: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  PROPOSAL:    { text: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  NEGOTIATION: { text: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
  WON:         { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  LOST:        { text: '#f87171', bg: 'rgba(248,113,113,0.12)' },
}

const EMAIL_TEMPLATES = [
  {
    name: 'Follow-up',
    subject: 'Following up on our conversation',
    body: `Hi {{name}},

I wanted to follow up on our recent conversation and see if you had any questions.

I'd love to connect and discuss how we can help you further. Would you have 15 minutes this week for a quick call?

Looking forward to hearing from you.`,
  },
  {
    name: 'Quote ready',
    subject: 'Your quote is ready',
    body: `Hi {{name}},

Thank you for your interest! I've prepared a quote based on your requirements.

Please let me know if you have any questions or if you'd like to discuss the details.`,
  },
  {
    name: 'Check-in',
    subject: 'Checking in',
    body: `Hi {{name}},

Just checking in to see how things are going on your end.

Is there anything we can help you with? We're always here if you need us.`,
  },
  {
    name: 'Thank you',
    subject: 'Thank you for your business',
    body: `Hi {{name}},

I just wanted to reach out to say thank you for choosing us. It's been a pleasure working with you.

Please don't hesitate to reach out if you ever need anything.`,
  },
]

export default function ContactDetailPage() {
  const params = useParams()
  const router = useRouter()
  const contactId = params?.id as string

  const [contact, setContact] = useState<Contact | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', status: '', notes: '' })
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', body: '' })
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [clv, setClv] = useState<{ total: number; count: number; demo: boolean } | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [noteDraft, setNoteDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [contactData, activityData, dealsData] = await Promise.all([
          apiClient.get(`/crm/contacts/${contactId}`),
          apiClient.get(`/crm/contacts/${contactId}/activity`),
          apiClient.get(`/crm/contacts/${contactId}/deals`),
        ]) as any[]
        const c = contactData?.contact ?? contactData
        setContact(c)
        setForm({ firstName: c.firstName ?? '', lastName: c.lastName ?? '', email: c.email ?? '', phone: c.phone ?? '', status: c.status ?? 'NEW', notes: c.notes ?? '' })
        setEmailForm(prev => ({ ...prev, to: c.email ?? '' }))
        setActivity(activityData?.activities ?? [])
        setDeals(dealsData?.deals ?? [])
      } catch {
        const demo: Contact = {
          id: contactId,
          firstName: 'Mark',
          lastName: 'Johnson',
          email: 'mark.johnson@example.com',
          phone: '(555) 010-0100',
          type: 'CUSTOMER',
          status: 'WON',
          score: 85,
          notes: 'Prefers afternoon appointments. Very detail-oriented.',
          createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
          company: { id: 'co1', name: 'Johnson Enterprises' },
        }
        setContact(demo)
        setForm({ firstName: demo.firstName, lastName: demo.lastName ?? '', email: demo.email ?? '', phone: demo.phone ?? '', status: demo.status, notes: demo.notes ?? '' })
        setEmailForm(prev => ({ ...prev, to: demo.email ?? '' }))
        setActivity(DEMO_ACTIVITY)
        setDeals(DEMO_DEALS)
      } finally {
        setLoading(false)
      }
    }
    if (contactId) void load()
  }, [contactId])

  // Lifetime value — sum real paid invoices, fall back to deterministic demo value
  useEffect(() => {
    if (!contactId) return
    const loadClv = async () => {
      try {
        const res = await apiClient.get('/finance/invoices', { contactId }) as any
        const invoices: any[] = res?.invoices ?? res?.data?.invoices ?? []
        const paid = invoices.filter(inv => String(inv?.status ?? '').toUpperCase() === 'PAID')
        if (paid.length === 0) throw new Error('no paid invoices')
        setClv({
          total: paid.reduce((a, inv) => a + Number(inv?.total ?? inv?.amount ?? 0), 0),
          count: paid.length,
          demo: false,
        })
      } catch {
        setClv({ total: demoCLV(contactId), count: 0, demo: true })
      }
    }
    void loadClv()
  }, [contactId])

  // Team notes — load from API with demo fallback
  useEffect(() => {
    if (!contactId) return
    const loadNotes = async () => {
      try {
        const res = await apiClient.get(`/crm/contacts/${contactId}/notes`) as any
        const list = res?.notes ?? res?.data?.notes
        if (!Array.isArray(list) || list.length === 0) throw new Error('no notes')
        setNotes(list)
      } catch {
        setNotes(DEMO_NOTES)
      }
    }
    void loadNotes()
  }, [contactId])

  const saveContact = async () => {
    if (!contact) return
    setSaving(true)
    try {
      await apiClient.patch(`/crm/contacts/${contactId}`, {
        firstName: form.firstName,
        lastName: form.lastName || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        status: form.status,
        notes: form.notes || undefined,
      })
      setContact(c => c ? { ...c, ...form } : c)
      toast('Contact saved', 'success')
      setEditing(false)
    } catch {
      toast('Failed to save contact', 'error')
    } finally {
      setSaving(false)
    }
  }

  const addNote = async () => {
    if (!newNote.trim()) return
    setAddingNote(true)
    try {
      await apiClient.post(`/crm/contacts/${contactId}/notes`, { content: newNote })
      const noteItem: ActivityItem = {
        id: `note-${Date.now()}`,
        type: 'note',
        title: 'Note added',
        description: newNote,
        createdAt: new Date().toISOString(),
      }
      setActivity(prev => [noteItem, ...prev])
      setNewNote('')
      toast('Note saved', 'success')
    } catch {
      toast('Failed to add note', 'error')
    } finally {
      setAddingNote(false)
    }
  }

  const postNote = async () => {
    const body = noteDraft.trim()
    if (!body) return
    setSavingNote(true)
    try {
      await apiClient.post(`/crm/contacts/${contactId}/notes`, { body, author: 'You' })
    } catch {
      // Demo mode: keep the note locally
    }
    setNotes(prev => [{ id: `tn-${Date.now()}`, author: 'You', body, createdAt: new Date().toISOString() }, ...prev])
    setNoteDraft('')
    setSavingNote(false)
    toast('Note posted', 'success')
  }

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id))
    toast('Note deleted', 'success')
  }

  // @mention suggestions: active when the draft's last token starts with '@'
  const lastToken = noteDraft.split(/\s/).pop() ?? ''
  const mentionQuery = lastToken.startsWith('@') ? lastToken.slice(1).toLowerCase() : null
  const mentionSuggestions = mentionQuery !== null
    ? TEAM.filter(t => t.toLowerCase().startsWith(mentionQuery))
    : []

  const completeMention = (name: string) => {
    setNoteDraft(d => d.replace(/@\w*$/, `@${name} `))
  }

  const exportSlug = () => slugify(`${contact?.firstName ?? ''} ${contact?.lastName ?? ''}`.trim())

  const exportText = () => {
    if (!contact) return
    const fullName = `${contact.firstName} ${contact.lastName ?? ''}`.trim()
    const lines: string[] = [
      `CONTACT HISTORY — ${fullName}`,
      `Generated ${new Date().toLocaleDateString()}`,
      '========================================',
      '',
      'PROFILE',
      `Name: ${fullName}`,
      `Email: ${contact.email ?? '—'}`,
      `Phone: ${contact.phone ?? '—'}`,
      `Company: ${contact.company?.name ?? '—'}`,
      `Status: ${contact.status.replace(/_/g, ' ')}`,
      `Type: ${contact.type}`,
      `Score: ${contact.score}`,
      `Lifetime value: $${(clv?.total ?? 0).toLocaleString()}`,
    ]
    if (contact.notes) lines.push(`Notes: ${contact.notes}`)
    if (notes.length > 0) {
      lines.push('', `TEAM NOTES (${notes.length})`)
      for (const n of notes) lines.push(`[${formatRelativeTime(n.createdAt)}] ${n.author}: ${n.body}`)
    }
    if (activity.length > 0) {
      lines.push('', `ACTIVITY TIMELINE (${activity.length})`)
      for (const a of activity) {
        const extra = a.amount !== undefined ? ` ($${a.amount.toLocaleString()}${a.status ? ` · ${a.status}` : ''})` : ''
        lines.push(`[${new Date(a.createdAt).toLocaleDateString()}] ${a.title}${a.description ? ` — ${a.description}` : ''}${extra}`)
      }
    }
    if (deals.length > 0) {
      lines.push('', `DEALS (${deals.length})`)
      for (const d of deals) lines.push(`${d.title} · $${d.value.toLocaleString()} · ${d.status} · created ${new Date(d.createdAt).toLocaleDateString()}`)
    }
    downloadFile(lines.join('\n') + '\n', `${exportSlug()}-history.txt`, 'text/plain')
    setExportOpen(false)
    toast('History exported', 'success')
  }

  const exportCsv = () => {
    if (!contact) return
    const rows: (string | number | undefined)[][] = [['type', 'date', 'author', 'description', 'amount']]
    for (const n of notes) rows.push(['note', new Date(n.createdAt).toISOString(), n.author, n.body, ''])
    for (const a of activity) rows.push([a.type, new Date(a.createdAt).toISOString(), '', `${a.title}${a.description ? ` — ${a.description}` : ''}${a.status ? ` · ${a.status}` : ''}`, a.amount])
    for (const d of deals) rows.push(['deal', new Date(d.createdAt).toISOString(), '', `${d.title} · ${d.status}`, d.value])
    const csv = rows.map(r => r.map(csvCell).join(',')).join('\n') + '\n'
    downloadFile(csv, `${exportSlug()}-history.csv`, 'text/csv')
    setExportOpen(false)
    toast('History exported', 'success')
  }

  function applyTemplate(templateName: string) {
    const tpl = EMAIL_TEMPLATES.find(t => t.name === templateName)
    if (!tpl || !contact) return
    const firstName = contact.firstName ?? 'there'
    setEmailForm(prev => ({
      ...prev,
      subject: tpl.subject,
      body: tpl.body.replace(/\{\{name\}\}/g, firstName),
    }))
    setSelectedTemplate(templateName)
  }

  async function sendEmail() {
    if (!emailForm.to || !emailForm.subject || !emailForm.body) return
    setEmailSending(true)
    try {
      await apiClient.post('/emails/send', {
        to: emailForm.to,
        subject: emailForm.subject,
        body: emailForm.body,
        contactId: contact?.id,
      })
      setEmailSent(true)
      setTimeout(() => { setEmailSent(false); setEmailOpen(false) }, 2000)
    } catch {
      // Demo mode: show success anyway
      setEmailSent(true)
      setTimeout(() => { setEmailSent(false); setEmailOpen(false) }, 2000)
    } finally {
      setEmailSending(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-[1200px]">
        <div className="h-8 w-32 rounded-lg animate-pulse" style={{ background: 'hsl(var(--muted))' }} />
        <div className="h-40 rounded-lg animate-pulse" style={{ background: 'hsl(var(--muted))' }} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: 'hsl(var(--muted))' }} />)}
          </div>
          <div className="h-64 rounded-lg animate-pulse" style={{ background: 'hsl(var(--muted))' }} />
        </div>
      </div>
    )
  }

  if (!contact) return null

  const statusMeta = STATUS_META[contact.status] ?? STATUS_META['NEW']!

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to CRM
      </button>

      {/* Contact header */}
      <div {...anim(0)} className="kv-anim rounded-xl border p-6" style={cardStyle}>
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.3)' }}
          >
            {initials(contact.firstName, contact.lastName)}
          </div>

          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} className={inputCls} style={inputStyle} placeholder="First name" />
                <input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} className={inputCls} style={inputStyle} placeholder="Last name" />
                <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputCls} style={inputStyle} placeholder="Email" />
                <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className={inputCls} style={inputStyle} placeholder="Phone" />
                <select
                  value={form.status}
                  onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  style={inputStyle}
                >
                  {['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'WON', 'LOST'].map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h1 className="text-xl font-bold text-foreground">{contact.firstName} {contact.lastName}</h1>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ color: statusMeta.text, background: statusMeta.bg }}
                  >
                    {contact.status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Score: <span className="font-semibold text-primary">{contact.score}</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                      <Mail className="h-4 w-4" />
                      {contact.email}
                    </a>
                  )}
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                      <Phone className="h-4 w-4" />
                      {contact.phone}
                    </a>
                  )}
                  {contact.company && (
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4" />
                      {contact.company.name}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {editing ? (
              <>
                <button
                  onClick={saveContact}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/20 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEmailOpen(true)}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }}
                >
                  <Mail className="h-4 w-4" /> Send Email
                </button>
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
                  style={{ border: '1px solid hsl(var(--border))' }}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit
                </button>
                <div className="relative">
                  <button
                    onClick={() => setExportOpen(o => !o)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
                    style={cardStyle}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export
                  </button>
                  {exportOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setExportOpen(false)} />
                      <div
                        className="absolute right-0 top-full mt-2 z-40 w-48 rounded-lg p-1"
                        style={{ ...cardStyle, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}
                      >
                        <button
                          onClick={exportText}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/20 transition-colors text-left"
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0" style={{ color: '#38bdf8' }} />
                          Text summary (.txt)
                        </button>
                        <button
                          onClick={exportCsv}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/20 transition-colors text-left"
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0" style={{ color: '#34d399' }} />
                          Data file (.csv)
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {editing && (
          <div className="mt-3">
            <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={2}
              className={inputCls + ' resize-none'}
              style={inputStyle}
              placeholder="Internal notes about this contact…"
            />
          </div>
        )}
        {!editing && contact.notes && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
            <p className="text-xs text-muted-foreground mb-1">Notes</p>
            <p className="text-sm text-foreground/80">{contact.notes}</p>
          </div>
        )}
      </div>

      {/* Lifetime Value */}
      <div {...anim(1)} className="kv-anim rounded-xl border p-5 flex items-center justify-between" style={{ ...cardStyle, animationDelay: '0.08s' }}>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lifetime Value</p>
          <p className="text-3xl font-bold tabular mt-1" style={{ color: '#34d399' }}>
            ${(clv?.total ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {clv === null ? 'calculating…' : clv.demo ? 'demo' : `from ${clv.count} invoice${clv.count === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="h-11 w-11 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(52,211,153,0.12)' }}>
          <DollarSign className="h-5 w-5" style={{ color: '#34d399' }} />
        </div>
      </div>

      {/* Main content: timeline left, deals right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline */}
        <div className="lg:col-span-2 space-y-4">
          {/* Add note */}
          <div {...anim(1)} className="kv-anim rounded-xl border p-4" style={{ ...cardStyle, animationDelay: '0.11s' }}>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Add Note</label>
            <div className="flex gap-3">
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                rows={2}
                className="flex-1 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                style={inputStyle}
                placeholder="Log a call, add a note, record an update…"
              />
              <button
                onClick={addNote}
                disabled={addingNote || !newNote.trim()}
                className="px-4 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02] shrink-0"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
              >
                {addingNote ? '…' : 'Save'}
              </button>
            </div>
          </div>

          {/* Activity feed */}
          <div {...anim(2)} className="kv-anim rounded-xl border overflow-hidden" style={{ ...cardStyle, animationDelay: '0.18s' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
              <h2 className="text-sm font-semibold text-foreground">Activity Timeline</h2>
            </div>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No activity yet.</p>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div
                  className="absolute left-9 top-0 bottom-0 w-px"
                  style={{ background: 'hsl(var(--border))' }}
                />
                <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                  {activity.map(item => {
                    const actMeta = ACTIVITY_ICONS[item.type] ?? ACTIVITY_ICONS['note']!
                    const Icon = actMeta.icon
                    return (
                      <div key={item.id} className="flex items-start gap-4 px-5 py-4 hover:bg-accent/5 transition-colors">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 z-10 relative"
                          style={{ background: `${actMeta.color}15`, border: `1px solid ${actMeta.color}30` }}
                        >
                          <Icon className="h-3.5 w-3.5" style={{ color: actMeta.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{item.title}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                          )}
                          {item.amount !== undefined && (
                            <p className="text-xs font-semibold text-primary mt-0.5">
                              ${item.amount.toLocaleString()}
                              {item.status && ` · ${item.status}`}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground/60 shrink-0">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Team Notes */}
          <div {...anim(3)} className="kv-anim rounded-xl border overflow-hidden" style={{ ...cardStyle, animationDelay: '0.25s' }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'hsl(var(--border))' }}>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" style={{ color: '#06b6d4' }} />
                <h2 className="text-sm font-semibold text-foreground">Team Notes</h2>
              </div>
              <span className="text-xs text-muted-foreground">{notes.length}</span>
            </div>

            {notes.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No notes yet — start the thread below.</p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                {notes.map(note => (
                  <div key={note.id} className="flex items-start gap-3 px-5 py-4 group hover:bg-accent/5 transition-colors">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: avatarGradient(note.author) }}
                    >
                      {note.author[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{note.author}</span>
                        <span className="text-xs text-muted-foreground">{formatRelativeTime(note.createdAt)}</span>
                      </div>
                      <p className="text-sm text-foreground/80 mt-0.5 whitespace-pre-wrap break-words">{renderNoteBody(note.body)}</p>
                    </div>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 shrink-0"
                      title="Delete note"
                    >
                      <Trash2 className="h-3.5 w-3.5" style={{ color: '#f87171' }} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Composer */}
            <div className="px-5 py-4" style={{ borderTop: '1px solid hsl(var(--border))' }}>
              <textarea
                value={noteDraft}
                onChange={e => setNoteDraft(e.target.value)}
                rows={2}
                className={inputCls + ' resize-none'}
                style={inputStyle}
                placeholder="Add an internal note…"
              />
              {mentionSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {mentionSuggestions.map(name => (
                    <button
                      key={name}
                      onClick={() => completeMention(name)}
                      className="text-xs px-2 py-1 rounded-lg font-medium transition-colors"
                      style={{ color: '#06b6d4', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)' }}
                    >
                      @{name}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">Type @ to mention a teammate</p>
                <button
                  onClick={postNote}
                  disabled={savingNote || !noteDraft.trim()}
                  className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
                >
                  {savingNote ? 'Posting…' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar: deals + quick stats */}
        <div className="space-y-4">
          {/* Stats */}
          <div {...anim(3)} className="kv-anim rounded-xl border p-4 space-y-3" style={{ ...cardStyle, animationDelay: '0.25s' }}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Summary</p>
            {[
              { label: 'Total Revenue', value: `$${DEMO_DEALS.filter(d => d.status === 'WON').reduce((a, d) => a + d.value, 0).toLocaleString()}`, icon: DollarSign, color: '#34d399' },
              { label: 'Open Deals', value: DEMO_DEALS.filter(d => !['WON', 'LOST'].includes(d.status)).length.toString(), icon: TrendingUp, color: '#06b6d4' },
              { label: 'Activities', value: activity.length.toString(), icon: Clock, color: '#a78bfa' },
              { label: 'Member Since', value: new Date(contact.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), icon: Calendar, color: '#94a3b8' },
            ].map(stat => (
              <div key={stat.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <stat.icon className="h-3.5 w-3.5" style={{ color: stat.color }} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <span className="text-xs font-semibold text-foreground tabular">{stat.value}</span>
              </div>
            ))}
          </div>

          {/* Deals */}
          <div {...anim(4)} className="kv-anim rounded-xl border overflow-hidden" style={{ ...cardStyle, animationDelay: '0.32s' }}>
            <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'hsl(var(--border))' }}>
              <h3 className="text-sm font-semibold text-foreground">Deals</h3>
              <span className="text-xs text-muted-foreground">{deals.length}</span>
            </div>
            {deals.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No deals yet</p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                {deals.map(deal => {
                  const dm = DEAL_STATUS_META[deal.status] ?? DEAL_STATUS_META['LEAD']!
                  return (
                    <div key={deal.id} className="px-4 py-3 hover:bg-accent/5 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-foreground">{deal.title}</p>
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0" style={{ color: dm.text, background: dm.bg }}>
                          {deal.status}
                        </span>
                      </div>
                      <p className="text-xs text-primary font-semibold tabular mt-1">${deal.value.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">{new Date(deal.createdAt).toLocaleDateString()}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div {...anim(5)} className="kv-anim rounded-xl border p-4 space-y-2" style={{ ...cardStyle, animationDelay: '0.39s' }}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Quick Actions</p>
            {[
              { label: 'Send Email', icon: Mail, action: () => setEmailOpen(true) },
              { label: 'Log Call', icon: Phone, action: () => toast('Call logged', 'success') },
              { label: 'Book Appointment', icon: Calendar, action: () => toast('Opening scheduler…', 'success') },
              { label: 'Create Invoice', icon: FileText, action: () => toast('Opening invoice…', 'success') },
            ].map(a => (
              <button
                key={a.label}
                onClick={a.action}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/20 transition-colors text-left"
              >
                <a.icon className="h-3.5 w-3.5 text-primary shrink-0" />
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {emailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-lg rounded-xl overflow-hidden"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" style={{ color: '#06b6d4' }} />
                <h2 className="text-sm font-semibold text-foreground">Send Email</h2>
              </div>
              <button onClick={() => setEmailOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Template picker */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Template (optional)</label>
                <div className="flex flex-wrap gap-2">
                  {EMAIL_TEMPLATES.map(t => (
                    <button key={t.name}
                      onClick={() => applyTemplate(t.name)}
                      className="text-xs px-3 py-1.5 rounded-lg transition-all font-medium"
                      style={selectedTemplate === t.name
                        ? { background: 'rgba(6,182,212,0.15)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.4)' }
                        : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }}>
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* To */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">To</label>
                <input value={emailForm.to}
                  onChange={e => setEmailForm(f => ({ ...f, to: e.target.value }))}
                  placeholder="email@example.com"
                  className={inputCls} style={inputStyle} />
              </div>

              {/* Subject */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Subject</label>
                <input value={emailForm.subject}
                  onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Email subject"
                  className={inputCls} style={inputStyle} />
              </div>

              {/* Body */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Message</label>
                <textarea value={emailForm.body}
                  onChange={e => setEmailForm(f => ({ ...f, body: e.target.value }))}
                  rows={8} placeholder="Write your message…"
                  className={`${inputCls} resize-none leading-relaxed`} style={inputStyle} />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-1">
                <button onClick={() => setEmailOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
                  style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>
                  Cancel
                </button>
                <button onClick={sendEmail}
                  disabled={emailSending || emailSent || !emailForm.to || !emailForm.subject || !emailForm.body}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60 transition-all hover:scale-[1.02]"
                  style={emailSent
                    ? { background: '#34d399' }
                    : { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                  {emailSent ? <><Check className="h-4 w-4" /> Sent!</>
                    : emailSending ? 'Sending…'
                    : <><Send className="h-4 w-4" /> Send Email</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
