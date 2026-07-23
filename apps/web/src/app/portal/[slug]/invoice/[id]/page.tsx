'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'

interface InvoiceData {
  invoice: {
    id: string
    number: string
    status: string
    lineItems: Array<{ description: string; quantity: number; unitPrice: number; total: number }>
    subtotal: number
    taxAmount: number
    discountAmount: number
    total: number
    amountPaid: number
    currency: string
    dueAt?: string
    contact?: { firstName: string; lastName?: string; email?: string }
  }
  org: { name: string; logoUrl?: string; email?: string; phone?: string }
}

const STATUS_STYLES: Record<string, string> = {
  PAID: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PARTIAL: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export default function InvoicePage() {
  const { slug, id } = useParams() as { slug: string; id: string }
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [data, setData] = useState<InvoiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paying, setPaying] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Missing access token. Please use the link provided in your email.')
      setLoading(false)
      return
    }

    fetch(`${API_URL}/portal/${slug}/invoice/${id}?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d.data as InvoiceData)
        else setError(d.error ?? 'Unable to load invoice.')
      })
      .catch(() => setError('Unable to load invoice. Please try again.'))
      .finally(() => setLoading(false))
  }, [slug, id, token])

  const handlePayNow = async () => {
    if (!token) return
    setPaying(true)
    try {
      const res = await fetch(`${API_URL}/portal/${slug}/invoice/${id}/payment-intent?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const result = await res.json() as { success: boolean; data?: { clientSecret: string; amount: number }; error?: string }

      if (!result.success) {
        alert(result.error ?? 'Payment failed. Please try again.')
        return
      }

      // In production this would open Stripe Elements / payment sheet
      // For now we show a simulated success
      setPaymentSuccess(true)
      if (data) {
        setData({
          ...data,
          invoice: {
            ...data.invoice,
            status: 'PAID',
            amountPaid: data.invoice.total,
          },
        })
      }
    } catch {
      alert('Payment service unavailable. Please contact the business directly.')
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6">
        <div className="text-5xl">🔒</div>
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 text-center">Access Denied</h1>
        <p className="text-gray-500 text-center max-w-sm">{error}</p>
        <Link href={`/portal/${slug}`} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
          ← Back to portal
        </Link>
      </div>
    )
  }

  if (!data) return null

  const { invoice, org } = data
  const amountDue = Number(invoice.total) - Number(invoice.amountPaid)
  const isPaid = invoice.status === 'PAID' || amountDue <= 0

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: invoice.currency }).format(val)

  return (
    <div className="min-h-screen">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          {org.logoUrl ? (
            <img src={org.logoUrl} alt={org.name} className="h-9 w-9 rounded-lg object-cover" />
          ) : (
            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              {org.name[0]}
            </div>
          )}
          <span className="font-bold text-gray-900 dark:text-white">{org.name}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {paymentSuccess && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6 flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <div className="font-semibold text-green-800 dark:text-green-200">Payment received!</div>
              <div className="text-sm text-green-600 dark:text-green-400">Thank you — your invoice is now paid.</div>
            </div>
          </div>
        )}

        {/* Invoice header */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="text-sm text-gray-500 mb-1">Invoice</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">#{invoice.number}</div>
              {invoice.contact && (
                <div className="text-sm text-gray-500 mt-1">
                  For {invoice.contact.firstName} {invoice.contact.lastName}
                </div>
              )}
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[invoice.status] ?? STATUS_STYLES['DRAFT']}`}>
              {invoice.status}
            </span>
          </div>

          {invoice.dueAt && (
            <div className="text-sm text-gray-500 mb-5">
              Due {new Date(invoice.dueAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          )}

          {/* Line items */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-3">
            {(invoice.lineItems as Array<{ description: string; quantity: number; unitPrice: number; total: number }>).map((item, i) => (
              <div key={i} className="flex justify-between items-start text-sm">
                <div>
                  <div className="text-gray-800 dark:text-gray-200">{item.description}</div>
                  {item.quantity !== 1 && (
                    <div className="text-gray-400">{item.quantity} × {formatCurrency(item.unitPrice)}</div>
                  )}
                </div>
                <div className="font-medium text-gray-900 dark:text-white ml-6 shrink-0">{formatCurrency(Number(item.total))}</div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-gray-100 dark:border-gray-700 mt-4 pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>{formatCurrency(Number(invoice.subtotal))}</span>
            </div>
            {Number(invoice.taxAmount) > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Tax</span>
                <span>{formatCurrency(Number(invoice.taxAmount))}</span>
              </div>
            )}
            {Number(invoice.discountAmount) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(Number(invoice.discountAmount))}</span>
              </div>
            )}
            {Number(invoice.amountPaid) > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Amount paid</span>
                <span>-{formatCurrency(Number(invoice.amountPaid))}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-gray-700">
              <span>{isPaid ? 'Total paid' : 'Amount due'}</span>
              <span>{formatCurrency(isPaid ? Number(invoice.total) : amountDue)}</span>
            </div>
          </div>
        </div>

        {/* Pay button */}
        {!isPaid && (
          <button
            onClick={handlePayNow}
            disabled={paying}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold text-lg transition-colors mb-4"
          >
            {paying ? 'Processing...' : `Pay ${formatCurrency(amountDue)}`}
          </button>
        )}

        {isPaid && (
          <div className="w-full py-4 bg-green-500 text-white rounded-xl font-semibold text-lg text-center mb-4">
            ✓ Paid in full
          </div>
        )}

        {/* Contact info */}
        {(org.email || org.phone) && (
          <div className="text-center text-sm text-gray-400">
            Questions? {org.email && <a href={`mailto:${org.email}`} className="text-blue-600 dark:text-blue-400 hover:underline">{org.email}</a>}
            {org.email && org.phone && ' · '}
            {org.phone && <a href={`tel:${org.phone}`} className="text-blue-600 dark:text-blue-400 hover:underline">{org.phone}</a>}
          </div>
        )}
      </main>
    </div>
  )
}
