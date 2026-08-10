'use client'

import { useEffect, useState } from 'react'
import { UserCircle, Link2, Copy, Check, Loader2, FileText, FileCheck, CalendarDays } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }

interface PortalInvoice { id: string; invoiceNumber: string; total: number; status: string; dueDate?: string }
interface PortalEstimate { id: string; title: string; total: number; status: string }
interface PortalAppointment { id: string; title: string; date: string; status: string }

type PortalTab = 'invoices' | 'estimates' | 'appointments'

const DEMO_INVOICES: PortalInvoice[] = [
  { id: 'demo-inv-1', invoiceNumber: 'INV-041', total: 2400, status: 'PAID' },
  { id: 'demo-inv-2', invoiceNumber: 'INV-042', total: 3200, status: 'SENT', dueDate: new Date(Date.now() + 86400000 * 12).toISOString() },
  { id: 'demo-inv-3', invoiceNumber: 'INV-043', total: 1150, status: 'OVERDUE' },
]

const DEMO_ESTIMATES: PortalEstimate[] = [
  { id: 'demo-est-1', title: 'Kitchen remodel — phase 2', total: 8500, status: 'PENDING' },
  { id: 'demo-est-2', title: 'Bathroom tile work', total: 2300, status: 'APPROVED' },
]

const DEMO_APPOINTMENTS: PortalAppointment[] = [
  { id: 'demo-apt-1', title: 'Site walkthrough', date: new Date(Date.now() + 86400000).toISOString(), status: 'CONFIRMED' },
  { id: 'demo-apt-2', title: 'Final inspection', date: new Date(Date.now() + 86400000 * 7).toISOString(), status: 'PENDING' },
]

const BADGE_COLORS: Record<string, { text: string; bg: string }> = {
  PAID: { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  APPROVED: { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  CONFIRMED: { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  SENT: { text: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  OVERDUE: { text: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  DECLINED: { text: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  CANCELLED: { text: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  PENDING: { text: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
}

function StatusBadge({ status }: { status: string }) {
  const meta = BADGE_COLORS[status] ?? { text: 'hsl(var(--muted-foreground))', bg: 'hsl(var(--muted))' }
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ color: meta.text, background: meta.bg }}
    >
      {status}
    </span>
  )
}

const fmtMoney = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

const fmtDate = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const mapInvoiceStatus = (s: string) => {
  const u = (s || '').toUpperCase()
  if (u === 'PAID') return 'PAID'
  if (u === 'OVERDUE') return 'OVERDUE'
  return 'SENT'
}

const mapEstimateStatus = (s: string) => {
  const u = (s || '').toUpperCase()
  if (u === 'ACCEPTED' || u === 'APPROVED') return 'APPROVED'
  if (u === 'REJECTED' || u === 'DECLINED') return 'DECLINED'
  return 'PENDING'
}

const mapAppointmentStatus = (s: string) => {
  const u = (s || '').toUpperCase()
  if (u === 'CONFIRMED' || u === 'COMPLETED') return 'CONFIRMED'
  if (u === 'CANCELLED' || u === 'CANCELED' || u === 'NO_SHOW') return 'CANCELLED'
  return 'PENDING'
}

export default function ClientPortalPage() {
  const [copied, setCopied] = useState(false)
  const webUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const portalUrl = `${webUrl}/portal/login`

  const [portalTab, setPortalTab] = useState<PortalTab>('invoices')
  const [invoices, setInvoices] = useState<PortalInvoice[]>(DEMO_INVOICES)
  const [estimates, setEstimates] = useState<PortalEstimate[]>(DEMO_ESTIMATES)
  const [appointments, setAppointments] = useState<PortalAppointment[]>(DEMO_APPOINTMENTS)
  const [payingId, setPayingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    apiClient.get<{ invoices: { id: string; invoiceNumber: string; total: number; status: string; dueDate?: string }[] }>('/finance/invoices', { limit: 5 })
      .then(res => {
        const list = (res?.invoices ?? []).slice(0, 5)
        if (!cancelled && list.length > 0) {
          setInvoices(list.map(inv => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            total: Number(inv.total) || 0,
            status: mapInvoiceStatus(inv.status),
            dueDate: inv.dueDate,
          })))
        }
      })
      .catch(() => { /* keep demo data */ })

    apiClient.get<{ estimates: { id: string; title: string; total: string | number; status: string }[] } | { id: string; title: string; total: string | number; status: string }[]>('/estimates', { limit: 5 })
      .then(res => {
        const list = (Array.isArray(res) ? res : res?.estimates ?? []).slice(0, 5)
        if (!cancelled && list.length > 0) {
          setEstimates(list.map(est => ({
            id: est.id,
            title: est.title,
            total: Number(est.total) || 0,
            status: mapEstimateStatus(est.status),
          })))
        }
      })
      .catch(() => { /* keep demo data */ })

    apiClient.get<{ appointments: { id: string; title: string; startTime: string; status: string }[] }>('/receptionist/appointments', { limit: 5 })
      .then(res => {
        const list = (res?.appointments ?? []).slice(0, 5)
        if (!cancelled && list.length > 0) {
          setAppointments(list.map(apt => ({
            id: apt.id,
            title: apt.title,
            date: apt.startTime,
            status: mapAppointmentStatus(apt.status),
          })))
        }
      })
      .catch(() => { /* keep demo data */ })

    return () => { cancelled = true }
  }, [])

  const copyLink = () => {
    navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const payInvoice = (id: string) => {
    if (payingId) return
    setPayingId(id)
    setTimeout(() => {
      setInvoices(prev => prev.map(inv => (inv.id === id ? { ...inv, status: 'PAID' } : inv)))
      setPayingId(null)
      toast('Payment received (demo)', 'success')
    }, 1200)
  }

  const decideEstimate = (id: string, approved: boolean) => {
    setEstimates(prev => prev.map(est => (est.id === id ? { ...est, status: approved ? 'APPROVED' : 'DECLINED' } : est)))
    toast(approved ? 'Estimate approved (demo)' : 'Estimate declined (demo)', approved ? 'success' : 'info')
  }

  const requestReschedule = () => {
    toast('Reschedule request sent (demo)', 'info')
  }

  const tabs: { key: PortalTab; label: string }[] = [
    { key: 'invoices', label: 'Invoices' },
    { key: 'estimates', label: 'Estimates' },
    { key: 'appointments', label: 'Appointments' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Client Portal</h1>
        <p className="text-sm text-muted-foreground mt-1">Self-service portal for your clients to view appointments and invoices</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Secure OTP Login', desc: 'Clients log in with a one-time code sent to their email — no password needed.' },
          { title: 'Appointment History', desc: 'Clients can view all their past and upcoming appointments.' },
          { title: 'Invoice Access', desc: 'Clients can view and download their invoices at any time.' },
        ].map(f => (
          <div key={f.title} className="rounded-xl p-5" style={cardStyle}>
            <UserCircle className="h-8 w-8 mb-3" style={{ color: '#06b6d4' }} />
            <h3 className="font-semibold text-foreground">{f.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-6" style={cardStyle}>
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Link2 className="h-4 w-4" style={{ color: '#06b6d4' }} />
          Portal Link
        </h2>
        <p className="text-sm text-muted-foreground mb-3">Share this link with your clients so they can access their portal:</p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={portalUrl}
            className="flex-1 rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
            style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
          />
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="rounded-xl p-6" style={cardStyle}>
        <h2 className="font-semibold text-foreground mb-3">How It Works</h2>
        <ol className="space-y-3">
          {[
            'Client visits the portal link and enters their email address.',
            'They receive a 6-digit OTP code via email (expires in 10 minutes).',
            'After entering the code, they can view their appointments and invoices.',
            'Sessions are valid for 30 days for convenience.',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4' }}
              >
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* ── Portal Preview ─────────────────────────────────────────────── */}
      <div>
        <h2 className="font-semibold text-foreground">Portal Preview</h2>
        <p className="text-xs text-muted-foreground mt-1 mb-4">
          Live preview — this is what your clients see. Interactions here are demo-only.
        </p>

        <div className="max-w-md mx-auto rounded-2xl overflow-hidden" style={cardStyle}>
          {/* Portal header */}
          <div className="p-5 flex items-center gap-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #a78bfa)', color: 'white' }}
            >
              CP
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-sm">Your Client Portal</p>
              <p className="text-xs text-muted-foreground">Welcome back, Mark Johnson</p>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setPortalTab(t.key)}
                className="flex-1 py-2.5 text-xs font-medium transition-colors"
                style={{
                  color: portalTab === t.key ? '#06b6d4' : 'hsl(var(--muted-foreground))',
                  borderBottom: portalTab === t.key ? '2px solid #06b6d4' : '2px solid transparent',
                  background: portalTab === t.key ? 'rgba(6,182,212,0.06)' : 'transparent',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-4 space-y-3" style={{ background: 'hsl(var(--background))' }}>
            {portalTab === 'invoices' && (
              invoices.length === 0 ? (
                <div className="py-10 text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No invoices yet</p>
                </div>
              ) : (
                invoices.map(inv => (
                  <div key={inv.id} className="rounded-xl p-3.5" style={cardStyle}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{inv.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {fmtMoney(inv.total)}
                          {inv.dueDate && inv.status !== 'PAID' ? ` · Due ${fmtDate(inv.dueDate)}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={inv.status} />
                        {inv.status !== 'PAID' && (
                          <button
                            onClick={() => payInvoice(inv.id)}
                            disabled={payingId !== null}
                            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-70"
                            style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }}
                          >
                            {payingId === inv.id ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Paying…
                              </>
                            ) : (
                              'Pay Now'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )
            )}

            {portalTab === 'estimates' && (
              estimates.length === 0 ? (
                <div className="py-10 text-center">
                  <FileCheck className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No estimates yet</p>
                </div>
              ) : (
                estimates.map(est => (
                  <div key={est.id} className="rounded-xl p-3.5" style={cardStyle}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{est.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{fmtMoney(est.total)}</p>
                      </div>
                      <StatusBadge status={est.status} />
                    </div>
                    {est.status === 'PENDING' && (
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => decideEstimate(est.id, true)}
                          className="flex-1 rounded-lg px-3 py-1.5 text-xs font-medium"
                          style={{ background: '#34d399', color: '#052e22' }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => decideEstimate(est.id, false)}
                          className="flex-1 rounded-lg px-3 py-1.5 text-xs font-medium"
                          style={{ background: 'transparent', border: '1px solid #f87171', color: '#f87171' }}
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )
            )}

            {portalTab === 'appointments' && (
              appointments.length === 0 ? (
                <div className="py-10 text-center">
                  <CalendarDays className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No appointments yet</p>
                </div>
              ) : (
                appointments.map(apt => (
                  <div key={apt.id} className="rounded-xl p-3.5" style={cardStyle}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{apt.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(apt.date)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={apt.status} />
                        <button
                          onClick={requestReschedule}
                          className="text-xs font-medium"
                          style={{ color: '#06b6d4', background: 'transparent' }}
                        >
                          Reschedule
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
