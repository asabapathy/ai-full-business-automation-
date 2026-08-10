'use client'

import { useState, useEffect, useMemo } from 'react'
import { Receipt, Plus, Trash2, X, TrendingDown, Calendar, Tag } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'

interface Expense {
  id: string
  description: string
  vendor?: string
  amount: number
  category: string
  date: string
}

const CATEGORIES = [
  { key: 'materials', label: 'Materials', color: '#06b6d4' },
  { key: 'fuel', label: 'Fuel & Vehicle', color: '#fbbf24' },
  { key: 'tools', label: 'Tools & Equipment', color: '#a78bfa' },
  { key: 'marketing', label: 'Marketing', color: '#60a5fa' },
  { key: 'other', label: 'Other', color: '#94a3b8' },
]

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }
const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)
}

const DEMO_EXPENSES: Expense[] = [
  { id: 'e1', description: 'PVC pipe & fittings', vendor: 'Home Depot', amount: 214.5, category: 'materials', date: daysAgo(2) },
  { id: 'e2', description: 'Fuel — van #2', vendor: 'Shell', amount: 68.4, category: 'fuel', date: daysAgo(4) },
  { id: 'e3', description: 'Lead gen campaign', vendor: 'Facebook Ads', amount: 350, category: 'marketing', date: daysAgo(7) },
  { id: 'e4', description: 'Cordless drill kit', vendor: 'Lowe’s', amount: 189, category: 'tools', date: daysAgo(12) },
  { id: 'e5', description: 'Copper wire spools', vendor: 'Home Depot', amount: 425.75, category: 'materials', date: daysAgo(18) },
  { id: 'e6', description: 'Oil change & tires', vendor: 'Jiffy Lube', amount: 312, category: 'fuel', date: daysAgo(25) },
  { id: 'e7', description: 'Office supplies', vendor: 'Staples', amount: 47.2, category: 'other', date: daysAgo(33) },
  { id: 'e8', description: 'Pipe inspection camera', vendor: 'Amazon', amount: 850, category: 'tools', date: daysAgo(41) },
]

const catMeta = (key: string) => CATEGORIES.find(c => c.key === key) ?? CATEGORIES[4]

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7)
}

function displayDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const emptyForm = { description: '', amount: '', category: 'materials', date: daysAgo(0) }

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>(DEMO_EXPENSES)
  const [filter, setFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    apiClient.get('/expenses')
      .then((res: any) => { const list = res?.expenses ?? res; if (Array.isArray(list) && list.length) setExpenses(list) })
      .catch(() => {})
  }, [])

  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`

  const { thisMonthTotal, lastMonthTotal, topCategory, categoryTotals } = useMemo(() => {
    let thisTotal = 0
    let lastTotal = 0
    const totals: Record<string, number> = {}
    for (const e of expenses) {
      const mk = monthKey(e.date)
      if (mk === thisMonth) {
        thisTotal += e.amount
        totals[e.category] = (totals[e.category] ?? 0) + e.amount
      } else if (mk === lastMonth) {
        lastTotal += e.amount
      }
    }
    const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0]
    return {
      thisMonthTotal: thisTotal,
      lastMonthTotal: lastTotal,
      topCategory: top ? catMeta(top[0]).label : '—',
      categoryTotals: totals,
    }
  }, [expenses, thisMonth, lastMonth])

  const filtered = filter === 'all' ? expenses : expenses.filter(e => e.category === filter)

  const handleSave = async () => {
    const amount = parseFloat(form.amount)
    if (!form.description.trim() || !amount || amount <= 0) {
      toast('Enter a description and amount', 'error')
      return
    }
    const expense: Expense = {
      id: `e${Date.now()}`,
      description: form.description.trim(),
      amount,
      category: form.category,
      date: form.date || daysAgo(0),
    }
    try {
      await apiClient.post('/expenses', expense)
    } catch {
      // Demo mode: keep local state
    }
    setExpenses(prev => [expense, ...prev])
    setShowModal(false)
    setForm(emptyForm)
    toast('Expense added', 'success')
  }

  const handleDelete = async (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id))
    try {
      await apiClient.delete(`/expenses/${id}`)
    } catch {
      // Demo mode: keep local state
    }
    toast('Expense deleted', 'success')
  }

  return (
    <div className="p-6 space-y-6 max-w-[1100px]">
      {/* Header */}
      <div {...anim(0)} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Expenses</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track spending and stay on budget</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.25)' }}
        >
          <Plus className="h-4 w-4" />
          Add Expense
        </button>
      </div>

      {/* Stats row */}
      <div {...anim(1)} className="grid grid-cols-3 gap-4">
        {[
          { label: 'This month', value: fmt(thisMonthTotal), icon: TrendingDown, color: '#f87171' },
          { label: 'Last month', value: fmt(lastMonthTotal), icon: Calendar, color: 'hsl(var(--muted-foreground))' },
          { label: 'Top category', value: topCategory, icon: Tag, color: '#fbbf24' },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl p-4" style={cardStyle}>
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
            <p className="text-2xl font-bold tabular truncate" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      <div {...anim(2)} className="rounded-xl p-5" style={cardStyle}>
        <h2 className="font-semibold text-foreground text-sm mb-4">This Month by Category</h2>
        <div className="space-y-3">
          {CATEGORIES.map(cat => {
            const total = categoryTotals[cat.key] ?? 0
            const share = thisMonthTotal > 0 ? (total / thisMonthTotal) * 100 : 0
            return (
              <div key={cat.key} className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
                <span className="text-sm text-foreground w-36 shrink-0">{cat.label}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'hsl(var(--muted))' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${share}%`, background: cat.color }} />
                </div>
                <span className="text-sm font-semibold tabular text-foreground w-24 text-right shrink-0">{fmt(total)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filter chips */}
      <div {...anim(3)} className="flex items-center gap-2 flex-wrap">
        {[{ key: 'all', label: 'All', color: '#06b6d4' }, ...CATEGORIES].map(cat => {
          const active = filter === cat.key
          return (
            <button
              key={cat.key}
              onClick={() => setFilter(cat.key)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={active
                ? { background: `${cat.color}1f`, color: cat.color, border: `1px solid ${cat.color}66` }
                : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }
              }
            >
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Expense list */}
      <div {...anim(4)} className="rounded-xl overflow-hidden" style={cardStyle}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <h2 className="font-semibold text-foreground text-sm">Recent Expenses</h2>
        </div>
        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Receipt className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">No expenses in this category yet</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
            {filtered.map(exp => {
              const cat = catMeta(exp.category)
              return (
                <div key={exp.id} className="group flex items-center gap-3 px-5 py-3 hover:bg-accent/30 transition-colors">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{exp.description}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {exp.vendor ? `${exp.vendor} · ` : ''}{displayDate(exp.date)}
                    </p>
                  </div>
                  <span className="text-sm font-bold tabular whitespace-nowrap" style={{ color: '#f87171' }}>
                    -{fmt(exp.amount)}
                  </span>
                  <button
                    onClick={() => handleDelete(exp.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all hover:bg-accent"
                    title="Delete expense"
                  >
                    <Trash2 className="h-4 w-4" style={{ color: '#f87171' }} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Expense modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Add Expense</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Description *</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className={inputCls}
                style={inputStyle}
                placeholder="e.g. PVC pipe & fittings — Home Depot"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Amount *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className={inputCls}
                style={inputStyle}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Category</label>
              <div className="flex items-center gap-2 flex-wrap">
                {CATEGORIES.map(cat => {
                  const active = form.category === cat.key
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setForm(f => ({ ...f, category: cat.key }))}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                      style={active
                        ? { background: `${cat.color}1f`, color: cat.color, border: `1px solid ${cat.color}66` }
                        : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }
                      }
                    >
                      {cat.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className={inputCls}
                style={inputStyle}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                style={{ border: '1px solid hsl(var(--border))' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.25)' }}
              >
                Save Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
