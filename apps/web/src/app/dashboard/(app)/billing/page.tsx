'use client'

import { useState, useEffect } from 'react'
import { CreditCard, ExternalLink, RefreshCw, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'

interface Subscription {
  plan: string
  status: string
  currentPeriodStart?: string
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
}

interface BillingInvoice {
  id: string
  amount: number
  status: string
  createdAt: string
  invoiceUrl?: string
}

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const statusMeta: Record<string, { text: string; bg: string }> = {
  ACTIVE: { text: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  active: { text: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  PAID: { text: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  paid: { text: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  CANCELED: { text: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  canceled: { text: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  OPEN: { text: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  open: { text: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
}

const fallbackStatus = { text: '#94a3b8', bg: 'rgba(148,163,184,0.1)' }

const fmt = (n: number) => `$${(n / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [invoices, setInvoices] = useState<BillingInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [subRes, invRes] = await Promise.all([
        apiClient.get('/billing-portal/subscription') as any,
        apiClient.get('/billing-portal/invoices') as any,
      ])
      setSubscription(subRes.subscription)
      setInvoices(invRes.invoices ?? [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const sync = async () => {
    setSyncing(true)
    try {
      await apiClient.post('/billing-portal/sync', {})
      load()
    } catch {}
    setSyncing(false)
  }

  const openPortal = async () => {
    setPortalLoading(true)
    try {
      const res = await apiClient.post('/billing-portal/portal-session', { returnUrl: window.location.href }) as any
      if (res.url) window.location.href = res.url
    } catch {
      alert('Failed to open billing portal. Please check your Stripe configuration.')
    }
    setPortalLoading(false)
  }

  const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }

  return (
    <div className="p-6 space-y-6 max-w-[900px]">
      {/* Header */}
      <div {...anim(0)} className="kv-anim flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing & Subscription</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your subscription plan and billing history</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={sync}
            disabled={syncing}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync
          </button>
          <button
            onClick={openPortal}
            disabled={portalLoading}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
          >
            <ExternalLink className="h-4 w-4" />
            {portalLoading ? 'Opening…' : 'Manage in Stripe'}
          </button>
        </div>
      </div>

      {loading ? (
        <div {...anim(1)} className="kv-anim text-center py-12 text-muted-foreground">Loading…</div>
      ) : (
        <>
          {subscription ? (
            <div {...anim(1)} className="kv-anim rounded-xl p-6" style={cardStyle}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold text-foreground text-lg capitalize">{subscription.plan} Plan</h2>
                    {(() => {
                      const m = statusMeta[subscription.status] ?? fallbackStatus
                      return (
                        <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ color: m.text, background: m.bg }}>
                          {subscription.status}
                        </span>
                      )
                    })()}
                  </div>
                  {subscription.currentPeriodEnd && (
                    <p className="text-sm ml-8">
                      {subscription.cancelAtPeriodEnd ? (
                        <span className="flex items-center gap-1" style={{ color: '#f87171' }}>
                          <AlertCircle className="h-3.5 w-3.5" />
                          Cancels {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1" style={{ color: '#34d399' }}>
                          <CheckCircle className="h-3.5 w-3.5" />
                          Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
              {subscription.currentPeriodStart && subscription.currentPeriodEnd && (
                <div className="mt-4 pt-4 grid grid-cols-2 gap-4" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                  <div>
                    <p className="text-xs text-muted-foreground">Billing Period Start</p>
                    <p className="text-sm font-medium text-foreground">{new Date(subscription.currentPeriodStart).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Billing Period End</p>
                    <p className="text-sm font-medium text-foreground">{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div {...anim(1)} className="kv-anim rounded-xl p-6" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}>
              <p className="text-sm" style={{ color: '#fbbf24' }}>No active subscription found. Please set up a Stripe subscription to access billing details.</p>
            </div>
          )}

          {/* Invoice History */}
          <div {...anim(2)} className="kv-anim rounded-xl overflow-hidden" style={cardStyle}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Invoice History
              </h2>
            </div>
            {invoices.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No invoices yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'rgba(255,255,255,0.02)' }}>
                      {['Date', 'Amount', 'Status', ''].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv, i) => {
                      const m = statusMeta[inv.status] ?? fallbackStatus
                      return (
                        <tr key={inv.id} style={{ borderBottom: i < invoices.length - 1 ? '1px solid hsl(var(--border))' : undefined }}>
                          <td className="px-5 py-3 text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString()}</td>
                          <td className="px-5 py-3 font-medium text-foreground tabular">{fmt(inv.amount)}</td>
                          <td className="px-5 py-3">
                            <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ color: m.text, background: m.bg }}>{inv.status}</span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            {inv.invoiceUrl && (
                              <a href={inv.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-primary hover:underline">
                                View
                              </a>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
