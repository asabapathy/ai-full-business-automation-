'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { Receipt, Plus, Trash2, Edit2, TrendingDown, Calendar, Tag } from 'lucide-react'

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

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ category: '', description: '', amount: '', currency: 'USD', date: new Date().toISOString().split('T')[0], receiptUrl: '' })
  const [saving, setSaving] = useState(false)
  const [filterCat, setFilterCat] = useState('')
  const [categories, setCategories] = useState<string[]>([])

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
    } catch (e: any) { alert(e.message) } finally { setSaving(false) }
  }

  async function remove(id: string) {
    if (!confirm('Delete this expense?')) return
    await apiClient.delete(`/expenses/${id}`)
    load()
  }

  const COMMON_CATEGORIES = ['Software', 'Office', 'Travel', 'Marketing', 'Utilities', 'Rent', 'Equipment', 'Meals', 'Other']

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-muted-foreground text-sm mt-1">Track and categorize business expenses</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> Add Expense
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border rounded-xl p-4 md:col-span-2">
            <p className="text-sm text-muted-foreground mb-2">Total Expenses</p>
            <p className="text-3xl font-bold">${stats.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.count} transactions</p>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <p className="text-sm text-muted-foreground">This Month</p>
            </div>
            <p className="text-2xl font-bold">${stats.thisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-2">Top Category</p>
            {Object.keys(stats.byCategory).length > 0 ? (
              <p className="text-lg font-bold truncate">
                {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1])[0]?.[0]}
              </p>
            ) : <p className="text-muted-foreground text-sm">—</p>}
          </div>
        </div>
      )}

      {stats && Object.keys(stats.byCategory).length > 0 && (
        <div className="bg-card border rounded-xl p-4">
          <p className="text-sm font-medium mb-3">Spending by Category</p>
          <div className="space-y-2">
            {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
              const pct = stats.total > 0 ? (amt / stats.total) * 100 : 0
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-sm w-24 truncate">{cat}</span>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-20 text-right">${amt.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterCat('')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!filterCat ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>
          All
        </button>
        {categories.map(c => (
          <button key={c} onClick={() => setFilterCat(c)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filterCat === c ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>
            {c}
          </button>
        ))}
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No expenses yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                {['Date', 'Category', 'Description', 'Vendor', 'Amount', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 text-muted-foreground">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className="bg-muted px-2 py-0.5 rounded text-xs">{e.category}</span>
                  </td>
                  <td className="px-4 py-3 font-medium">{e.description}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.vendor?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold">${Number(e.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {e.currency}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => remove(e.id)} className="p-1.5 rounded hover:bg-muted">
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold">Add Expense</h2>
            <div>
              <label className="text-sm font-medium block mb-1">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">Select category…</option>
                {COMMON_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Description</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="What was this expense for?"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1">Amount</label>
                <input value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                  type="number" min="0.01" step="0.01" placeholder="0.00"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Date</label>
                <input value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  type="date"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 border rounded-lg py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={save} disabled={saving || !form.category || !form.description || !form.amount}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving…' : 'Add Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
