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
      const res = await apiClient.post('/billing-portal/portal-session', {
        returnUrl: window.location.href,
      }) as any
      if (res.url) window.location.href = res.url
    } catch {
      alert('Failed to open billing portal. Please check your Stripe configuration.')
    }
    setPortalLoading(false)
  }

  const statusColor = (s: string) => {
    if (s === 'ACTIVE' || s === 'active') return 'bg-green-100 text-green-700'
    if (s === 'CANCELED' || s === 'canceled') return 'bg-red-100 text-red-700'
    return 'bg-yellow-100 text-yellow-700'
  }

  const fmt = (n: number) => `$${(n / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your subscription plan and billing history</p>
        </div>
        <div className="flex gap-2">
          <button onClick={sync} disabled={syncing} className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync
          </button>
          <button onClick={openPortal} disabled={portalLoading} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            <ExternalLink className="h-4 w-4" />
            {portalLoading ? 'Opening...' : 'Manage in Stripe'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <>
          {subscription ? (
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                    <h2 className="font-semibold text-gray-900 text-lg capitalize">{subscription.plan} Plan</h2>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(subscription.status)}`}>
                      {subscription.status}
                    </span>
                  </div>
                  {subscription.currentPeriodEnd && (
                    <p className="text-sm text-gray-500 ml-8">
                      {subscription.cancelAtPeriodEnd ? (
                        <span className="flex items-center gap-1 text-orange-600">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Cancels {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
              {subscription.currentPeriodStart && subscription.currentPeriodEnd && (
                <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Billing Period Start</p>
                    <p className="text-sm font-medium text-gray-900">{new Date(subscription.currentPeriodStart).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Billing Period End</p>
                    <p className="text-sm font-medium text-gray-900">{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border bg-yellow-50 border-yellow-200 p-6">
              <p className="text-sm text-yellow-800">No active subscription found. Please set up a Stripe subscription to access billing details.</p>
            </div>
          )}

          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Invoice History
              </h2>
            </div>
            {invoices.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No invoices yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">{new Date(inv.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{fmt(inv.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(inv.status)}`}>{inv.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {inv.invoiceUrl && (
                          <a href={inv.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                            View
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
