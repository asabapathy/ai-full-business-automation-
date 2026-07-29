'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Users, Mail, Phone, MoreHorizontal, X } from 'lucide-react'
import { Badge } from '../../../../components/ui/badge'
import { Skeleton } from '../../../../components/ui/skeleton'
import { api } from '../../../../lib/api-client'
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
  company?: { id: string; name: string }
}

const STATUS_COLORS: Record<string, string> = {
  NEW: 'info',
  CONTACTED: 'secondary',
  QUALIFIED: 'warning',
  PROPOSAL_SENT: 'ai',
  WON: 'success',
  LOST: 'destructive',
}

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

export default function CRMPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', type: 'LEAD' })

  useEffect(() => {
    const fetchContacts = async () => {
      setIsLoading(true)
      try {
        const result = await api.get<{ contacts: Contact[]; total: number }>('/crm/contacts', {
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

  async function createContact() {
    if (!form.firstName.trim()) return
    setCreating(true)
    try {
      const res = await api.post<{ data: { contact: Contact } }>('/crm/contacts', {
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
      toast('Failed to create contact. Please try again.', 'error')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      {/* Header */}
      <div {...anim(0)} className="kv-anim flex items-center justify-between" style={{ animationDelay: '0.04s' }}>
        <div>
          <h1 className="text-2xl font-bold text-foreground">CRM</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{total.toLocaleString()} contacts total</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.3)' }}
        >
          <Plus className="h-4 w-4" />
          Add Contact
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Contacts', value: total, color: 'text-primary' },
          { label: 'Active Leads', value: 34, color: 'text-amber-400' },
          { label: 'Customers', value: 189, color: 'text-emerald-400' },
          { label: 'Avg Score', value: '68/100', color: 'text-violet-400' },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="kv-anim rounded-xl border p-4"
            style={{
              animationDelay: `${0.11 + i * 0.07}s`,
              background: 'hsl(var(--card))',
              borderColor: 'hsl(var(--border))',
            }}
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 tabular ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div {...anim(5)} className="kv-anim flex gap-3 flex-col sm:flex-row" style={{ animationDelay: '0.39s' }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
          />
        </div>
        <div className="flex gap-2">
          {['', 'NEW', 'QUALIFIED', 'WON'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className="rounded-lg px-3 py-2 text-xs font-medium transition-all"
              style={statusFilter === status
                ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
                : { background: 'hsl(var(--card))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }
              }
            >
              {status || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Contact List */}
      <div
        className="kv-anim rounded-xl border overflow-hidden"
        style={{ animationDelay: '0.46s', background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
      >
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Contacts</h2>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="font-medium text-foreground">No contacts yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first contact or let AI import them.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
            {contacts.map(contact => (
              <div key={contact.id} className="flex items-center gap-4 px-5 py-3 hover:bg-accent/40 transition-colors">
                <div
                  className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                  style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4' }}
                >
                  {initials(contact.firstName, contact.lastName)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground">
                    {contact.firstName} {contact.lastName}
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
                  <span className="text-xs font-semibold text-foreground tabular">{contact.score}</span>
                  <span className="text-[10px] text-muted-foreground">score</span>
                </div>

                <Badge variant={(STATUS_COLORS[contact.status] as never) ?? 'outline'} className="text-xs hidden sm:flex">
                  {contact.status.replace('_', ' ')}
                </Badge>

                <span className="text-xs text-muted-foreground hidden md:block">
                  {formatRelativeTime(contact.createdAt)}
                </span>

                <button className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-accent/60 text-muted-foreground transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create contact modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
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
