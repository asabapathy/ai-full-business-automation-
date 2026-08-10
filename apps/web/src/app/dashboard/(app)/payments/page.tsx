'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Loader2, DollarSign, Clock, Receipt, CalendarCheck } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'

interface Transaction {
  id: string
  type: 'charge' | 'refund' | 'payout'
  amount: number
  customer: string
  method: string
  time: string
  status: 'succeeded' | 'pending' | 'failed'
}

interface Stats { volume: number; pending: number; fees: number }

const PROVIDERS = [
  { key: 'stripe', name: 'Stripe', description: 'Accept cards, wallets and bank payments worldwide.' },
  { key: 'square', name: 'Square', description: 'In-person and online payments with POS hardware.' },
]

const STATUS_META: Record<string, { text: string; bg: string }> = {
  succeeded: { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  pending:   { text: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  failed:    { text: '#f87171', bg: 'rgba(248,113,113,0.12)' },
}

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }
const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`

const DEMO_STATS: Stats = { volume: 12480, pending: 3120, fees: 374 }

const DEMO_TRANSACTIONS: Transaction[] = [
  { id: 't1', type: 'charge', amount: 249, customer: 'Mark Johnson', method: 'Visa •• 4242', time: '2h ago', status: 'succeeded' },
  { id: 't2', type: 'charge', amount: 1200, customer: 'Sarah Williams', method: 'Mastercard •• 5100', time: '5h ago', status: 'succeeded' },
  { id: 't3', type: 'refund', amount: 89, customer: 'Tom Nguyen', method: 'Visa •• 9812', time: '8h ago', status: 'succeeded' },
  { id: 't4', type: 'payout', amount: 2840, customer: 'Payout to bank ••6721', method: '—', time: 'Yesterday', status: 'succeeded' },
  { id: 't5', type: 'charge', amount: 480, customer: 'Priya Patel', method: 'Amex •• 1005', time: 'Yesterday', status: 'pending' },
  { id: 't6', type: 'charge', amount: 156, customer: 'James Carter', method: 'Visa •• 3320', time: '2d ago', status: 'failed' },
  { id: 't7', type: 'charge', amount: 720, customer: 'Elena Garcia', method: 'Mastercard •• 8844', time: '2d ago', status: 'succeeded' },
  { id: 't8', type: 'payout', amount: 1960, customer: 'Payout to bank ••6721', method: '—', time: '3d ago', status: 'succeeded' },
]

const TYPE_COLOR: Record<Transaction['type'], string> = {
  charge: '#34d399',
  refund: '#f87171',
  payout: '#60a5fa',
}

function amountLabel(tx: Transaction) {
  if (tx.type === 'charge') return `+${fmt(tx.amount)}`
  if (tx.type === 'refund') return `−${fmt(tx.amount)}`
  return fmt(tx.amount)
}

function feeLabel(tx: Transaction) {
  if (tx.type !== 'charge') return '—'
  return fmt(tx.amount * 0.029 + 0.3)
}

function nextPayoutDate(cadence: string) {
  const days = cadence === 'daily' ? 1 : cadence === 'weekly' ? 7 : 30
  return new Date(Date.now() + 86400000 * days).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function PaymentsPage() {
  const [connected, setConnected] = useState<Record<string, boolean>>({ stripe: false, square: false })
  const [connecting, setConnecting] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>(DEMO_TRANSACTIONS)
  const [cadence, setCadence] = useState('weekly')

  const anyConnected = Object.values(connected).some(Boolean)

  useEffect(() => {
    apiClient.get('/payments/providers')
      .then((res: any) => { if (res && typeof res === 'object') setConnected(prev => ({ ...prev, ...res })) })
      .catch(() => {})
    apiClient.get('/payments/stats')
      .then((res: any) => { if (res) setStats(res) })
      .catch(() => setStats(DEMO_STATS))
    apiClient.get('/payments/transactions?limit=10')
      .then((res: any) => { const list = res?.transactions ?? res; if (Array.isArray(list) && list.length) setTransactions(list) })
      .catch(() => setTransactions(DEMO_TRANSACTIONS))
  }, [])

  const handleConnect = async (key: string, name: string) => {
    setConnecting(key)
    try {
      await apiClient.post(`/payments/providers/${key}/connect`, {})
      setConnected(prev => ({ ...prev, [key]: true }))
      toast(`${name} connected`, 'success')
    } catch {
      // Demo mode: simulate connection flow
      await new Promise(r => setTimeout(r, 1000))
      setConnected(prev => ({ ...prev, [key]: true }))
      toast(`${name} connected (demo)`, 'success')
    } finally {
      setConnecting(null)
    }
  }

  const handleDisconnect = (key: string, name: string) => {
    setConnected(prev => ({ ...prev, [key]: false }))
    toast(`${name} disconnected`, 'success')
  }

  const handleCadence = async (value: string) => {
    setCadence(value)
    try {
      await apiClient.put('/payments/payout-schedule', { cadence: value })
    } catch {
      // Demo mode: keep local state
    }
    toast(`Payout schedule set to ${value}`, 'success')
  }

  const displayStats: Stats = anyConnected ? (stats ?? DEMO_STATS) : { volume: 0, pending: 0, fees: 0 }

  return (
    <div className="p-6 space-y-6 max-w-[1100px]">
      {/* Header */}
      <div {...anim(0)}>
        <h1 className="text-2xl font-bold text-foreground">Payments</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Connect payment providers and track payouts</p>
      </div>

      {/* Provider cards */}
      <div {...anim(1)} className="grid grid-cols-2 gap-4">
        {PROVIDERS.map(provider => {
          const isConnected = connected[provider.key]
          const isConnecting = connecting === provider.key
          return (
            <div key={provider.key} className="rounded-xl p-5" style={cardStyle}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0" style={{ background: 'hsl(var(--muted))' }}>
                    <CreditCard className="h-5 w-5" style={{ color: '#06b6d4' }} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{provider.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{provider.description}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                {isConnected ? (
                  <>
                    <span className="flex items-center gap-2 text-sm font-medium" style={{ color: '#34d399' }}>
                      <span className="h-2 w-2 rounded-full" style={{ background: '#34d399', boxShadow: '0 0 8px rgba(52,211,153,0.6)' }} />
                      Connected
                    </span>
                    <button
                      onClick={() => handleDisconnect(provider.key, provider.name)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-muted-foreground">Not connected</span>
                    <button
                      onClick={() => handleConnect(provider.key, provider.name)}
                      disabled={isConnecting}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.25)' }}
                    >
                      {isConnecting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {isConnecting ? 'Connecting…' : 'Connect'}
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Stats row */}
      <div {...anim(2)} className="grid grid-cols-3 gap-4">
        {[
          { label: 'This month volume', value: fmt(displayStats.volume), icon: DollarSign, color: '#06b6d4' },
          { label: 'Pending payout', value: fmt(displayStats.pending), icon: Clock, color: '#fbbf24' },
          { label: 'Fees paid', value: fmt(displayStats.fees), icon: Receipt, color: 'hsl(var(--muted-foreground))' },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl p-4" style={cardStyle}>
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
            <p className="text-2xl font-bold tabular" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Payout schedule */}
      <div {...anim(3)} className="rounded-xl p-5" style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <CalendarCheck className="h-4 w-4" style={{ color: '#34d399' }} />
          <h2 className="font-semibold text-foreground text-sm">Payout Schedule</h2>
        </div>
        <div className="flex items-end gap-6">
          <div className="w-56">
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Cadence</label>
            <select value={cadence} onChange={e => handleCadence(e.target.value)} className={inputCls} style={inputStyle}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="pb-1">
            <p className="text-xs text-muted-foreground mb-1">Next payout</p>
            <p className="text-sm font-semibold" style={{ color: '#34d399' }}>{nextPayoutDate(cadence)}</p>
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div {...anim(4)} className="rounded-xl overflow-hidden" style={cardStyle}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <h2 className="font-semibold text-foreground text-sm">Recent Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Method</th>
                <th className="px-5 py-3 font-medium text-right">Amount</th>
                <th className="px-5 py-3 font-medium text-right">Fee</th>
                <th className="px-5 py-3 font-medium">When</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
              {transactions.map(tx => {
                const meta = STATUS_META[tx.status] ?? STATUS_META.pending
                return (
                  <tr key={tx.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-5 py-3">
                      <span className="capitalize font-medium" style={{ color: TYPE_COLOR[tx.type] }}>{tx.type}</span>
                    </td>
                    <td className="px-5 py-3 text-foreground whitespace-nowrap">{tx.customer}</td>
                    <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{tx.method}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular whitespace-nowrap" style={{ color: TYPE_COLOR[tx.type] }}>
                      {amountLabel(tx)}
                    </td>
                    <td className="px-5 py-3 text-right text-muted-foreground tabular whitespace-nowrap">{feeLabel(tx)}</td>
                    <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{tx.time}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: meta.text, background: meta.bg }}>{tx.status}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
