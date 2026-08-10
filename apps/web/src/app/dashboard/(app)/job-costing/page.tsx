'use client'

import { useState, useEffect, useRef } from 'react'
import { Wrench, AlertTriangle, TrendingUp, Package, Plus, Camera, Upload, Trash2, X } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'

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

interface JobPhoto {
  id: string
  label: 'before' | 'after'
  dataUrl: string
  jobName: string
  createdAt: string
}

type Tab = 'inventory' | 'alerts' | 'summary' | 'trends' | 'photos'

const inputCls = 'w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground bg-background focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { border: '1px solid hsl(var(--border))' }
const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }

const MONTHLY_PROFIT = [
  { month: 'Mar', revenue: 18400, labor: 6200, materials: 4100 },
  { month: 'Apr', revenue: 21200, labor: 7100, materials: 4800 },
  { month: 'May', revenue: 19800, labor: 6800, materials: 4300 },
  { month: 'Jun', revenue: 24500, labor: 7900, materials: 5600 },
  { month: 'Jul', revenue: 26100, labor: 8200, materials: 5900 },
  { month: 'Aug', revenue: 23400, labor: 7600, materials: 5200 },
]

const SEED_GRADIENTS = [
  'linear-gradient(135deg, #06b6d4, #a78bfa)',
  'linear-gradient(135deg, #a78bfa, #06b6d4)',
  'linear-gradient(135deg, #34d399, #06b6d4)',
  'linear-gradient(135deg, #fbbf24, #a78bfa)',
]

const SEED_PHOTOS: JobPhoto[] = [
  { id: 'seed-1', label: 'before', dataUrl: '', jobName: 'Kitchen Remodel', createdAt: '2026-07-14T09:00:00Z' },
  { id: 'seed-2', label: 'after', dataUrl: '', jobName: 'Kitchen Remodel', createdAt: '2026-07-28T16:30:00Z' },
  { id: 'seed-3', label: 'before', dataUrl: '', jobName: 'Deck Restoration', createdAt: '2026-08-02T08:15:00Z' },
  { id: 'seed-4', label: 'after', dataUrl: '', jobName: 'Deck Restoration', createdAt: '2026-08-08T17:45:00Z' },
]

function gradientFor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return SEED_GRADIENTS[h % SEED_GRADIENTS.length] as string
}

function marginColor(m: number): string {
  if (m >= 40) return '#34d399'
  if (m >= 25) return '#fbbf24'
  return '#f87171'
}

const MAX_PHOTO_BYTES = 2 * 1024 * 1024

export default function JobCostingPage() {
  const [tab, setTab] = useState<Tab>('inventory')
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [alerts, setAlerts] = useState<InventoryItem[]>([])
  const [summary, setSummary] = useState<ProfitSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', sku: '', category: '', quantity: 0, unitCost: 0, unitPrice: 0, reorderPoint: 5 })

  // Job Photos state
  const [photos, setPhotos] = useState<JobPhoto[]>(SEED_PHOTOS)
  const [photoFilter, setPhotoFilter] = useState<'all' | 'before' | 'after'>('all')
  const [lightbox, setLightbox] = useState<JobPhoto | null>(null)
  const [pendingLabel, setPendingLabel] = useState<'before' | 'after'>('before')
  const [pendingJobName, setPendingJobName] = useState('Unassigned')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchAll(); loadPhotos() }, [])

  async function loadPhotos() {
    try {
      const data = await apiClient.get<{ photos?: JobPhoto[] } | JobPhoto[]>('/jobs/photos')
      const remote = Array.isArray(data) ? data : data?.photos ?? []
      if (remote.length > 0) setPhotos(remote)
    } catch {
      // demo mode — keep seeded local photos
    }
  }

  function handleFiles(files: FileList | File[]) {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        toast(`${file.name} is not an image`, 'error')
        return
      }
      if (file.size > MAX_PHOTO_BYTES) {
        toast(`${file.name} is over the 2MB limit`, 'error')
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : ''
        if (!dataUrl) return
        const photo: JobPhoto = {
          id: `photo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          label: pendingLabel,
          dataUrl,
          jobName: pendingJobName.trim() || 'Unassigned',
          createdAt: new Date().toISOString(),
        }
        setPhotos(prev => [photo, ...prev])
        toast('Photo added', 'success')
        apiClient.post('/jobs/photos', photo).catch(() => { /* demo mode — local state is source of truth */ })
      }
      reader.readAsDataURL(file)
    })
  }

  function deletePhoto(id: string) {
    setPhotos(prev => prev.filter(p => p.id !== id))
    setLightbox(null)
    toast('Photo removed', 'success')
    apiClient.delete(`/jobs/photos/${id}`).catch(() => { /* demo mode */ })
  }

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
          <h1 className="text-2xl font-bold">Job Costing &amp; Inventory</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }}
        >
          <Plus className="h-4 w-4" />
          Add Item
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: `$${summary.totalRevenue.toLocaleString()}`, icon: TrendingUp, colorStyle: { color: '#34d399' } },
            { label: 'Total Cost', value: `$${summary.totalCost.toLocaleString()}`, icon: Package, colorStyle: { color: '#f97316' } },
            { label: 'Gross Profit', value: `$${summary.grossProfit.toLocaleString()}`, icon: TrendingUp, colorStyle: { color: '#06b6d4' } },
            { label: 'Margin', value: `${summary.margin.toFixed(1)}%`, icon: TrendingUp, colorStyle: { color: summary.margin > 30 ? '#34d399' : '#f87171' } },
          ].map(card => (
            <div key={card.label} className="rounded-xl p-4" style={cardStyle}>
              <div className="flex items-center gap-2 mb-1">
                <card.icon className="h-4 w-4" style={card.colorStyle} />
                <span className="text-xs text-muted-foreground">{card.label}</span>
              </div>
              <p className="text-xl font-bold" style={card.colorStyle}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {alerts.length > 0 && (
        <div
          className="rounded-xl p-4 flex items-start gap-3"
          style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' }}
        >
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#fbbf24' }} />
          <div>
            <p className="font-medium" style={{ color: '#fbbf24' }}>{alerts.length} low-stock items</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {alerts.slice(0, 3).map(a => a.name).join(', ')}{alerts.length > 3 ? ` and ${alerts.length - 3} more` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
        {([['inventory', 'Inventory'], ['alerts', 'Low Stock'], ['summary', 'Summary'], ['trends', 'Profit Trends'], ['photos', 'Photos']] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
            {t === 'alerts' && alerts.length > 0 && (
              <span className="ml-1.5 rounded-full text-white text-[10px] px-1.5 py-0.5" style={{ background: '#fbbf24' }}>{alerts.length}</span>
            )}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="rounded-xl p-6 space-y-4" style={cardStyle}>
          <h2 className="font-semibold text-foreground">Add Inventory Item</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Name</label>
              <input className={inputCls} style={inputStyle} required
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">SKU</label>
              <input className={inputCls} style={inputStyle}
                value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Category</label>
              <input className={inputCls} style={inputStyle}
                value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Quantity</label>
              <input type="number" min="0" className={inputCls} style={inputStyle}
                value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: parseFloat(e.target.value) }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Unit Cost ($)</label>
              <input type="number" min="0" step="0.01" className={inputCls} style={inputStyle}
                value={form.unitCost} onChange={e => setForm(f => ({ ...f, unitCost: parseFloat(e.target.value) }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Unit Price ($)</label>
              <input type="number" min="0" step="0.01" className={inputCls} style={inputStyle}
                value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: parseFloat(e.target.value) }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Reorder Point</label>
              <input type="number" min="0" className={inputCls} style={inputStyle}
                value={form.reorderPoint} onChange={e => setForm(f => ({ ...f, reorderPoint: parseInt(e.target.value) }))} />
            </div>
            <div className="col-span-2 flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }}
              >
                Add Item
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
                style={{ border: '1px solid hsl(var(--border))' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="rounded-xl overflow-hidden" style={cardStyle}>
          <table className="w-full text-sm">
            <thead style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--muted))' }}>
              <tr>
                <th className="text-left px-4 py-3 font-medium text-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-foreground">SKU</th>
                <th className="text-left px-4 py-3 font-medium text-foreground">Category</th>
                <th className="text-right px-4 py-3 font-medium text-foreground">Qty</th>
                <th className="text-right px-4 py-3 font-medium text-foreground">Unit Cost</th>
                <th className="text-right px-4 py-3 font-medium text-foreground">Unit Price</th>
                <th className="text-right px-4 py-3 font-medium text-foreground">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
              {(tab === 'alerts' ? alerts : inventory).map(item => {
                const margin = item.unitCost > 0 ? ((item.unitPrice - item.unitCost) / item.unitPrice) * 100 : 0
                const isLow = item.reorderPoint !== undefined && item.quantity <= item.reorderPoint
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-muted/30 transition-colors"
                    style={isLow ? { background: 'rgba(251,191,36,0.07)' } : undefined}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {item.name}
                      {isLow && <AlertTriangle className="inline h-3 w-3 ml-1" style={{ color: '#fbbf24' }} />}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.sku ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.category ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-foreground">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-foreground">${item.unitCost.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-foreground">${item.unitPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-medium" style={{ color: margin > 30 ? '#34d399' : '#f87171' }}>
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
