'use client'

import { useState, useEffect } from 'react'
import { DollarSign, Plus, Trash2, CheckCircle, Calculator } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'

interface Rule {
  id: string
  name: string
  type: 'percentage' | 'flat'
  rate: number
  employeeId?: string
  isActive: boolean
}

interface Payout {
  id: string
  employeeId: string
  periodStart: string
  periodEnd: string
  grossRevenue: number
  commissionAmount: number
  status: string
  paidAt?: string
}

interface Summary {
  pendingPayouts: number
  paidPayouts: number
  totalCommissionEarned: number
}

export default function CommissionsPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [tab, setTab] = useState<'rules' | 'payouts'>('rules')
  const [showRuleForm, setShowRuleForm] = useState(false)
  const [ruleForm, setRuleForm] = useState({ name: '', type: 'percentage', rate: 10 })
  const [calcPeriod, setCalcPeriod] = useState({ start: '', end: '' })
  const [calculating, setCalculating] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [rulesRes, payoutsRes, summaryRes] = await Promise.all([
        apiClient.get('/commission/rules') as any,
        apiClient.get('/commission/payouts') as any,
        apiClient.get('/commission/summary') as any,
      ])
      setRules(rulesRes.rules ?? [])
      setPayouts(payoutsRes.payouts ?? [])
      setSummary(summaryRes)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const createRule = async () => {
    try {
      await apiClient.post('/commission/rules', ruleForm)
      setShowRuleForm(false)
      setRuleForm({ name: '', type: 'percentage', rate: 10 })
      load()
    } catch {}
  }

  const deleteRule = async (id: string) => {
    try {
      await apiClient.delete(`/commission/rules/${id}`)
      load()
    } catch {}
  }

  const calculate = async () => {
    if (!calcPeriod.start || !calcPeriod.end) return
    setCalculating(true)
    try {
      await apiClient.post('/commission/payouts/calculate', {
        periodStart: new Date(calcPeriod.start).toISOString(),
        periodEnd: new Date(calcPeriod.end).toISOString(),
      })
      load()
    } catch {}
    setCalculating(false)
  }

  const markPaid = async (id: string) => {
    try {
      await apiClient.post(`/commission/payouts/${id}/pay`, {})
      load()
    } catch {}
  }

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const inputStyle: React.CSSProperties = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }
  const inputClass = 'w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Commission Tracking</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage commission rules and calculate staff payouts</p>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Pending Payouts', value: fmt(summary.pendingPayouts), color: '#fb923c' },
            { label: 'Paid Out', value: fmt(summary.paidPayouts), color: '#34d399' },
            { label: 'Total Earned', value: fmt(summary.totalCommissionEarned), color: '#06b6d4' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border p-4" style={{ background: 'hsl(var(--card))' }}>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 border-b">
        {(['rules', 'payouts'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'rules' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowRuleForm(true)} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium" style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }}>
              <Plus className="h-4 w-4" />
              Add Rule
            </button>
          </div>

          {showRuleForm && (
            <div className="rounded-xl border p-5 space-y-4" style={{ background: 'hsl(var(--card))' }}>
              <h3 className="font-semibold text-foreground">New Commission Rule</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Rule Name</label>
                  <input className={inputClass} style={inputStyle} value={ruleForm.name} onChange={e => setRuleForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
                  <select className={inputClass} style={inputStyle} value={ruleForm.type} onChange={e => setRuleForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="percentage">Percentage</option>
                    <option value="flat">Flat Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Rate {ruleForm.type === 'percentage' ? '(%)' : '($)'}</label>
                  <input type="number" className={inputClass} style={inputStyle} value={ruleForm.rate} onChange={e => setRuleForm(f => ({ ...f, rate: parseFloat(e.target.value) }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={createRule} className="rounded-lg px-4 py-2 text-sm font-medium" style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }}>Save Rule</button>
                <button onClick={() => setShowRuleForm(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              </div>
            </div>
          )}

          <div className="rounded-xl border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : rules.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No commission rules yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b" style={{ background: 'hsl(var(--muted))' }}>
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Rate</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rules.map(r => (
                    <tr key={r.id} className="hover:bg-muted">
                      <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{r.type}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.type === 'percentage' ? `${r.rate}%` : fmt(r.rate)}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={r.isActive ? { background: 'rgba(52,211,153,0.15)', color: '#34d399' } : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}>
                          {r.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => deleteRule(r.id)} className="text-muted-foreground hover:text-red-400" style={{}}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'payouts' && (
        <div className="space-y-4">
          <div className="rounded-xl border p-5" style={{ background: 'hsl(var(--card))' }}>
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <Calculator className="h-4 w-4" style={{ color: '#06b6d4' }} />
              Calculate Payouts
            </h3>
            <div className="flex items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Period Start</label>
                <input type="date" className="rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" style={inputStyle} value={calcPeriod.start} onChange={e => setCalcPeriod(p => ({ ...p, start: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Period End</label>
                <input type="date" className="rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" style={inputStyle} value={calcPeriod.end} onChange={e => setCalcPeriod(p => ({ ...p, end: e.target.value }))} />
              </div>
              <button onClick={calculate} disabled={calculating} className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }}>
                {calculating ? 'Calculating...' : 'Calculate'}
              </button>
            </div>
          </div>

          <div className="rounded-xl border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
            {payouts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No payouts calculated yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b" style={{ background: 'hsl(var(--muted))' }}>
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Employee</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Period</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Revenue</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Commission</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payouts.map(p => (
                    <tr key={p.id} className="hover:bg-muted">
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{p.employeeId.slice(0, 8)}...</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(p.periodStart).toLocaleDateString()} – {new Date(p.periodEnd).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-foreground font-medium">{fmt(p.grossRevenue)}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: '#34d399' }}>{fmt(p.commissionAmount)}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={p.status === 'PAID' ? { background: 'rgba(52,211,153,0.15)', color: '#34d399' } : { background: 'rgba(251,146,60,0.15)', color: '#fb923c' }}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.status !== 'PAID' && (
                          <button onClick={() => markPaid(p.id)} className="flex items-center gap-1 text-xs font-medium" style={{ color: '#34d399' }}>
                            <CheckCircle className="h-3.5 w-3.5" />
                            Mark Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
