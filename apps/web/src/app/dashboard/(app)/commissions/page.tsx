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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Commission Tracking</h1>
        <p className="text-sm text-gray-500 mt-1">Manage commission rules and calculate staff payouts</p>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Pending Payouts', value: fmt(summary.pendingPayouts), color: 'text-orange-600' },
            { label: 'Paid Out', value: fmt(summary.paidPayouts), color: 'text-green-600' },
            { label: 'Total Earned', value: fmt(summary.totalCommissionEarned), color: 'text-blue-600' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 border-b">
        {(['rules', 'payouts'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'rules' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowRuleForm(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              Add Rule
            </button>
          </div>

          {showRuleForm && (
            <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
              <h3 className="font-semibold text-gray-900">New Commission Rule</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Rule Name</label>
                  <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={ruleForm.name} onChange={e => setRuleForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={ruleForm.type} onChange={e => setRuleForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="percentage">Percentage</option>
                    <option value="flat">Flat Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Rate {ruleForm.type === 'percentage' ? '(%)' : '($)'}</label>
                  <input type="number" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={ruleForm.rate} onChange={e => setRuleForm(f => ({ ...f, rate: parseFloat(e.target.value) }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={createRule} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Save Rule</button>
                <button onClick={() => setShowRuleForm(false)} className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          )}

          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Loading...</div>
            ) : rules.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No commission rules yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Rate</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rules.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{r.type}</td>
                      <td className="px-4 py-3 text-gray-600">{r.type === 'percentage' ? `${r.rate}%` : fmt(r.rate)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {r.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => deleteRule(r.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
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
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Calculator className="h-4 w-4 text-blue-600" />
              Calculate Payouts
            </h3>
            <div className="flex items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Period Start</label>
                <input type="date" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" value={calcPeriod.start} onChange={e => setCalcPeriod(p => ({ ...p, start: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Period End</label>
                <input type="date" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" value={calcPeriod.end} onChange={e => setCalcPeriod(p => ({ ...p, end: e.target.value }))} />
              </div>
              <button onClick={calculate} disabled={calculating} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {calculating ? 'Calculating...' : 'Calculate'}
              </button>
            </div>
          </div>

          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            {payouts.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No payouts calculated yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Period</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Revenue</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Commission</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payouts.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{p.employeeId.slice(0, 8)}...</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {new Date(p.periodStart).toLocaleDateString()} – {new Date(p.periodEnd).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{fmt(p.grossRevenue)}</td>
                      <td className="px-4 py-3 text-green-700 font-semibold">{fmt(p.commissionAmount)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.status !== 'PAID' && (
                          <button onClick={() => markPaid(p.id)} className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-800">
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
