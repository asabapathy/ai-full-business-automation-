'use client'

import { useState, useEffect } from 'react'
import { Wrench, AlertTriangle, TrendingUp, Package, Plus } from 'lucide-react'
import { Button } from '../../../../components/ui/button'
import { apiClient } from '../../../../lib/api-client'

interface InventoryItem {
  id: string
  name: string
  sku?: string
  category?: string
  quantity: number
  unitCost: number
  unitPrice: number
  reorderPoint?: number
}

interface ProfitSummary {
  totalCost: number
  totalRevenue: number
  grossProfit: number
  margin: number
  itemCount: number
}

type Tab = 'inventory' | 'alerts' | 'summary'

export default function JobCostingPage() {
  const [tab, setTab] = useState<Tab>('inventory')
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [alerts, setAlerts] = useState<InventoryItem[]>([])
  const [summary, setSummary] = useState<ProfitSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', sku: '', category: '', quantity: 0, unitCost: 0, unitPrice: 0, reorderPoint: 5 })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      const [invData, alertData, sumData] = await Promise.all([
        apiClient.get('/job-costing/inventory'),
        apiClient.get('/job-costing/inventory/alerts'),
        apiClient.get('/job-costing/profit-summary'),
      ])
      setInventory(invData.items ?? [])
      setAlerts(alertData.alerts ?? [])
      setSummary(sumData)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    await apiClient.post('/job-costing/inventory', form)
    setShowForm(false)
    setForm({ name: '', sku: '', category: '', quantity: 0, unitCost: 0, unitPrice: 0, reorderPoint: 5 })
    fetchAll()
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wrench className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Job Costing & Inventory</h1>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: `$${summary.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-green-500' },
            { label: 'Total Cost', value: `$${summary.totalCost.toLocaleString()}`, icon: Package, color: 'text-orange-500' },
            { label: 'Gross Profit', value: `$${summary.grossProfit.toLocaleString()}`, icon: TrendingUp, color: 'text-blue-500' },
            { label: 'Margin', value: `${summary.margin.toFixed(1)}%`, icon: TrendingUp, color: summary.margin > 30 ? 'text-green-500' : 'text-red-500' },
          ].map(card => (
            <div key={card.label} className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <card.icon className={`h-4 w-4 ${card.color}`} />
                <span className="text-xs text-muted-foreground">{card.label}</span>
              </div>
              <p className="text-xl font-bold">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {alerts.length > 0 && (
        <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-orange-800 dark:text-orange-300">{alerts.length} low-stock items</p>
            <p className="text-sm text-orange-600 dark:text-orange-400 mt-0.5">
              {alerts.slice(0, 3).map(a => a.name).join(', ')}{alerts.length > 3 ? ` and ${alerts.length - 3} more` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {([['inventory', 'Inventory'], ['alerts', 'Low Stock'], ['summary', 'Summary']] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
            {t === 'alerts' && alerts.length > 0 && (
              <span className="ml-1.5 rounded-full bg-orange-500 text-white text-[10px] px-1.5 py-0.5">{alerts.length}</span>
            )}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Add Inventory Item</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm" required
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">SKU</label>
              <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <input type="number" min="0" className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: parseFloat(e.target.value) }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unit Cost ($)</label>
              <input type="number" min="0" step="0.01" className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={form.unitCost} onChange={e => setForm(f => ({ ...f, unitCost: parseFloat(e.target.value) }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unit Price ($)</label>
              <input type="number" min="0" step="0.01" className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: parseFloat(e.target.value) }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reorder Point</label>
              <input type="number" min="0" className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={form.reorderPoint} onChange={e => setForm(f => ({ ...f, reorderPoint: parseInt(e.target.value) }))} />
            </div>
            <div className="col-span-2 flex gap-2">
              <Button type="submit">Add Item</Button>
              <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">SKU</th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-right px-4 py-3 font-medium">Qty</th>
                <th className="text-right px-4 py-3 font-medium">Unit Cost</th>
                <th className="text-right px-4 py-3 font-medium">Unit Price</th>
                <th className="text-right px-4 py-3 font-medium">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(tab === 'alerts' ? alerts : inventory).map(item => {
                const margin = item.unitCost > 0 ? ((item.unitPrice - item.unitCost) / item.unitPrice) * 100 : 0
                const isLow = item.reorderPoint !== undefined && item.quantity <= item.reorderPoint
                return (
                  <tr key={item.id} className={`hover:bg-muted/30 transition-colors ${isLow ? 'bg-orange-50/50 dark:bg-orange-950/10' : ''}`}>
                    <td className="px-4 py-3 font-medium">
                      {item.name}
                      {isLow && <AlertTriangle className="inline h-3 w-3 ml-1 text-orange-500" />}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.sku ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.category ?? '—'}</td>
                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">${item.unitCost.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">${item.unitPrice.toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${margin > 30 ? 'text-green-600' : 'text-red-500'}`}>
                      {margin.toFixed(1)}%
                    </td>
                  </tr>
                )
              })}
              {(tab === 'alerts' ? alerts : inventory).length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  {tab === 'alerts' ? 'No low-stock alerts.' : 'No inventory items yet.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
