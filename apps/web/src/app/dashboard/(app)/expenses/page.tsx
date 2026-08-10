'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'
import { Receipt, Plus, Trash2, Calendar } from 'lucide-react'

interface Expense {
  id: string
  category: string
  description: string
  amount: string
  currency: string
  date: string
  receiptUrl?: string
  vendor?: { id: string; name: string }
}

interface Stats { total: number; thisMonth: number; count: number; byCategory: Record<string, number> }

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const COMMON_CATEGORIES = ['Software', 'Office', 'Travel', 'Marketing', 'Utilities', 'Rent', 'Equipment', 'Meals', 'Other']

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ category: '', description: '', amount: '', currency: 'USD', date: new Date().toISOString().split('T')[0], receiptUrl: '' })
  const [saving, setSaving] = useState(false)
  const [filterCat, setFilterCat] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { load() }, [filterCat])

  async function load() {
    setLoading(true)
    try {
      const [eRes, sRes, cRes] = await Promise.all([
        apiClient.get<{ expenses: Expense[] }>(`/expenses${filterCat ? `?category=${filterCat}` : ''}`),
        apiClient.get<Stats>('/expenses/stats'),
        apiClient.get<{ categories: string[] }>('/expenses/categories'),
      ])
      setExpenses(eRes.expenses)
      setStats(sRes)
      setCategories(cRes.categories)
    } finally { setLoading(false) }
  }

  async function save() {
    if (!form.category || !form.description || !form.amount) return
    setSaving(true)
    try {
      await apiClient.post('/expenses', {
        ...form,
        amount: parseFloat(form.amount),
        date: new Date(form.date).toISOString(),
        receiptUrl: form.receiptUrl || undefined,
      })
      setShowCreate(false)
      setForm({ category: '', description: '', amount: '', currency: 'USD', date: new Date().toISOString().split('T')[0], receiptUrl: '' })
      load()
    } catch (e: any) {
      toast(e.message || 'Failed to save expense', 'error')
    } finally { setSaving(false) }
  }

  async function remove(id: string) {
    setDeletingId(id)
    setExpenses(prev => prev.filter(e => e.id !== id))
    try {
      await apiClient.delete(`/expenses/${id}`)
    } catch (e: any) {
      toast(e.message || 'Failed to delete expense', 'error')
      load()
    } finally { setDeletingId(null) }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div {...anim(0)} className="kv-anim flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Expenses</h1>
          <p className="text-muted-foreground text-sm mt-1">Track and categorize business expenses</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
          <Plus className="h-4 w-4" /> Add Expense
        </button>
      </div>

      {stats && (
        <div {...anim(1)} className="kv-anim grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl p-4 md:col-span-2" style={cardStyle}>
            <p className="text-sm text-muted-foreground mb-2">Total Expenses</p>
            <p className="text-3xl font-bold text-foreground">${stats.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.count} transactions</p>
          </div>
          <div className="rounded-xl p-4" style={cardStyle}>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4" style={{ color: '#60a5fa' }} />
              <p className="text-sm text-muted-foreground">This Month</p>
            </div>
            <p className="text-2xl font-bold text-foreground">${stats.thisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="rounded-xl p-4" style={cardStyle}>
            <p className="text-sm text-muted-foreground mb-2">Top Category</p>
            {Object.keys(stats.byCategory).length > 0 ? (
              <p className="text-lg font-bold text-foreground truncate">
                {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1])[0]?.[0]}
              </p>
            ) : <p className="text-muted-foreground text-sm">—</p>}
          </div>
        </div>
      )}

      {stats && Object.keys(stats.byCategory).length > 0 && (
        <div {...anim(2)} className="kv-anim rounded-xl p-4" style={cardStyle}>
          <p className="text-sm font-medium text-foreground mb-3">Spending by Category</p>
          <div className="space-y-2">
            {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
              const pct = stats.total > 0 ? (amt / stats.total) * 100 : 0
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-sm text-foreground w-24 truncate">{cat}</span>
                  <div className="flex-1 rounded-full h-2" style={{ background: 'hsl(var(--background))' }}>
                    <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-20 text-right font-variant-numeric tabular-nums">${amt.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div {...anim(3)} className="kv-anim flex gap-2 flex-wrap">
        {(['', ...categories]).map(c => {
          const active = filterCat === c
          return (
            <button key={c || 'all'} onClick={() => setFilterCat(c)}
              className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
              style={active
                ? { color: '#06b6d4', background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.4)' }
                : { color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}>
              {c || 'All'}
            </button>
          )
        })}
      </div>

      <div {...anim(4)} className="kv-anim rounded-xl overflow-hidden" style={cardStyle}>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No expenses yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'rgba(255,255,255,0.02)' }}>
                  {['Date', 'Category', 'Description', 'Vendor', 'Amount', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map((e, i) => (
                  <tr key={e.id} style={{ borderBottom: i < expenses.length - 1 ? '1px solid hsl(var(--border))' : undefined }}>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(e.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}>{e.category}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{e.description}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.vendor?.name ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold text-foreground font-variant-numeric tabular-nums">${Number(e.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {e.currency}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => remove(e.id)} disabled={deletingId === e.id} className="p-1.5 rounded hover:bg-muted transition-colors">
                        <Trash2 className="h-4 w-4" style={{ color: '#f87171' }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <h2 className="text-lg font-bold text-foreground">Add Expense</h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className={inputCls} style={inputStyle}>
                <option value="">Select category…</option>
                {COMMON_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Description</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="What was this expense for?"
                className={inputCls} style={inputStyle} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Amount</label>
                <input value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                  type="number" min="0.01" step="0.01" placeholder="0.00"
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Date</label>
                <input value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  type="date" className={inputCls} style={inputStyle} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button onClick={save} disabled={saving || !form.category || !form.description || !form.amount}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                {saving ? 'Saving…' : 'Add Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
