'use client'

import { useState, useEffect } from 'react'
import {
  FlaskConical, Plus, Play, Pause, CheckCircle, AlertCircle, Trash2,
  TrendingUp, TrendingDown, BarChart2, X, ChevronRight, ArrowRight
} from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'

type Status = 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED'
type ExperimentType = 'email_subject' | 'email_body' | 'landing_page' | 'cta_text' | 'pricing' | 'onboarding'

interface Variant { id: string; name: string; content: string; trafficSplit: number }
interface Experiment {
  id: string
  name: string
  type: ExperimentType
  hypothesis: string
  status: Status
  variants: Variant[]
  minSampleSize: number
  confidenceLevel: number
  createdAt: string
}

interface VariantStat {
  variantId: string
  variantName?: string
  impressions: number
  conversions: number
  conversionRate: number
  revenue?: number
  uplift?: number
  significance?: number
  isWinner?: boolean
}

interface Results {
  experiment: Experiment
  variantStats: VariantStat[]
  control: VariantStat
  winners: VariantStat[]
  totalImpressions: number
  hasSignificantWinner: boolean
  recommendation: string
}

const STATUS_CONFIG: Record<Status, { label: string; cls: string; icon: any }> = {
  DRAFT: { label: 'Draft', cls: 'bg-gray-100 text-gray-600', icon: FlaskConical },
  RUNNING: { label: 'Running', cls: 'bg-green-100 text-green-700', icon: Play },
  PAUSED: { label: 'Paused', cls: 'bg-amber-100 text-amber-700', icon: Pause },
  COMPLETED: { label: 'Completed', cls: 'bg-blue-100 text-blue-700', icon: CheckCircle },
}

const TYPE_LABELS: Record<ExperimentType, string> = {
  email_subject: 'Email Subject',
  email_body: 'Email Body',
  landing_page: 'Landing Page',
  cta_text: 'CTA Text',
  pricing: 'Pricing',
  onboarding: 'Onboarding',
}

const DEMO_EXPERIMENTS: Experiment[] = [
  {
    id: 'demo_1', name: 'Welcome Email Subject Lines', type: 'email_subject', status: 'RUNNING',
    hypothesis: 'Adding a first name and urgent CTA in the subject line will increase open rates by 15%.',
    variants: [
      { id: 'v1', name: 'Control', content: 'Welcome to Kanavu AI!', trafficSplit: 50 },
      { id: 'v2', name: 'Personalized + Urgency', content: 'Hi {first_name}, your free trial starts now 🚀', trafficSplit: 50 },
    ],
    minSampleSize: 100, confidenceLevel: 95, createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 'demo_2', name: 'Book Now CTA Button', type: 'cta_text', status: 'COMPLETED',
    hypothesis: 'Using "Book Your Free Consultation" will convert better than "Get Started".',
    variants: [
      { id: 'v3', name: 'Control', content: 'Get Started', trafficSplit: 50 },
      { id: 'v4', name: 'Specific Value', content: 'Book Your Free Consultation', trafficSplit: 50 },
    ],
    minSampleSize: 200, confidenceLevel: 95, createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'demo_3', name: 'Pricing Page - Monthly vs Annual', type: 'pricing', status: 'DRAFT',
    hypothesis: 'Leading with annual pricing will increase annual plan adoption by 20%.',
    variants: [
      { id: 'v5', name: 'Monthly First', content: 'Show monthly pricing prominently', trafficSplit: 50 },
      { id: 'v6', name: 'Annual First', content: 'Show annual pricing with savings badge', trafficSplit: 50 },
    ],
    minSampleSize: 500, confidenceLevel: 95, createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
]

const DEMO_RESULTS: Record<string, Results> = {
  demo_1: {
    experiment: DEMO_EXPERIMENTS[0],
    control: { variantId: 'v1', variantName: 'Control', impressions: 234, conversions: 47, conversionRate: 0.201, revenue: 0 },
    variantStats: [
      { variantId: 'v1', variantName: 'Control', impressions: 234, conversions: 47, conversionRate: 0.201 },
      { variantId: 'v2', variantName: 'Personalized + Urgency', impressions: 241, conversions: 68, conversionRate: 0.282, uplift: 40.3, significance: 92.1, isWinner: true },
    ],
    winners: [{ variantId: 'v2', variantName: 'Personalized + Urgency', impressions: 241, conversions: 68, conversionRate: 0.282, uplift: 40.3, significance: 92.1, isWinner: true }],
    totalImpressions: 475,
    hasSignificantWinner: false,
    recommendation: 'Collecting data... 475/100 impressions. Variant "Personalized + Urgency" is leading at 40% uplift — nearing significance at 92.1%. Continue running.',
  },
  demo_2: {
    experiment: DEMO_EXPERIMENTS[1],
    control: { variantId: 'v3', variantName: 'Control', impressions: 412, conversions: 58, conversionRate: 0.141 },
    variantStats: [
      { variantId: 'v3', variantName: 'Control', impressions: 412, conversions: 58, conversionRate: 0.141 },
      { variantId: 'v4', variantName: 'Specific Value', impressions: 389, conversions: 79, conversionRate: 0.203, uplift: 43.9, significance: 97.8, isWinner: true },
    ],
    winners: [{ variantId: 'v4', variantName: 'Specific Value', impressions: 389, conversions: 79, conversionRate: 0.203, uplift: 43.9, significance: 97.8, isWinner: true }],
    totalImpressions: 801,
    hasSignificantWinner: true,
    recommendation: 'Variant "Book Your Free Consultation" is the winner at 97.8% confidence with +43.9% uplift. Roll it out to 100% of users.',
  },
}

function ExperimentCard({ exp, onStatusChange, onView, onDelete }: {
  exp: Experiment
  onStatusChange: (id: string, status: Status) => void
  onView: (e: Experiment) => void
  onDelete: (id: string) => void
}) {
  const cfg = STATUS_CONFIG[exp.status]
  const StatusIcon = cfg.icon

  const nextStatus: Partial<Record<Status, Status>> = {
    DRAFT: 'RUNNING',
    RUNNING: 'PAUSED',
    PAUSED: 'RUNNING',
  }
  const nextStatusLabel: Partial<Record<Status, string>> = {
    DRAFT: 'Start',
    RUNNING: 'Pause',
    PAUSED: 'Resume',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900">{exp.name}</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${cfg.cls}`}>
              <StatusIcon className="h-3 w-3" />{cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-400">{TYPE_LABELS[exp.type]}</span>
            <span className="text-xs text-gray-300">·</span>
            <span className="text-xs text-gray-400">{exp.variants.length} variants</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {nextStatus[exp.status] && (
            <button
              onClick={() => onStatusChange(exp.id, nextStatus[exp.status]!)}
              className="text-xs px-2.5 py-1 border rounded-lg text-gray-600 hover:bg-gray-50 font-medium"
            >
              {nextStatusLabel[exp.status]}
            </button>
          )}
          {exp.status !== 'COMPLETED' && (
            <button onClick={() => onStatusChange(exp.id, 'COMPLETED')}
              className="text-xs px-2.5 py-1 border rounded-lg text-gray-600 hover:bg-gray-50 font-medium">
              Complete
            </button>
          )}
          <button onClick={() => onDelete(exp.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-3 line-clamp-2 italic">"{exp.hypothesis}"</p>

      <div className="space-y-1.5 mb-3">
        {exp.variants.map((v, i) => (
          <div key={v.id} className="flex items-center gap-2">
            <span className={`text-[10px] font-semibold w-5 h-5 rounded flex items-center justify-center ${i === 0 ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700'}`}>
              {String.fromCharCode(65 + i)}
            </span>
            <span className="text-xs text-gray-700 flex-1 truncate">{v.content}</span>
            <span className="text-xs text-gray-400">{v.trafficSplit}%</span>
          </div>
        ))}
      </div>

      <button onClick={() => onView(exp)}
        className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 py-1.5 hover:bg-blue-50 rounded-lg transition-colors">
        <BarChart2 className="h-3.5 w-3.5" />View Results
      </button>
    </div>
  )
}

function ResultsDrawer({ exp, onClose }: { exp: Experiment; onClose: () => void }) {
  const [results, setResults] = useState<Results | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (DEMO_RESULTS[exp.id]) {
      setResults(DEMO_RESULTS[exp.id])
      setLoading(false)
      return
    }
    apiClient.get<{ data: Results }>(`/ab-testing/${exp.id}/results`)
      .then(r => setResults((r as any).data ?? null))
      .catch(() => setResults(null))
      .finally(() => setLoading(false))
  }, [exp.id])

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-semibold text-gray-900">{exp.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{TYPE_LABELS[exp.type]} · {exp.status}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : !results ? (
            <div className="text-center py-8 text-gray-400">No data yet — start the experiment to collect impressions.</div>
          ) : (
            <>
              {/* Hypothesis */}
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-700 mb-1">Hypothesis</p>
                <p className="text-sm text-blue-800 italic">"{exp.hypothesis}"</p>
              </div>

              {/* Recommendation */}
              <div className={`rounded-xl p-4 flex items-start gap-3 ${results.hasSignificantWinner ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                {results.hasSignificantWinner
                  ? <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  : <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />}
                <p className="text-sm text-gray-800">{results.recommendation}</p>
              </div>

              {/* Variant stats */}
              <div className="space-y-3">
                {results.variantStats.map((stat, i) => {
                  const isControl = i === 0
                  const winner = !isControl && results.winners.find(w => w.variantId === stat.variantId && w.isWinner && (w.significance ?? 0) >= exp.confidenceLevel)
                  return (
                    <div key={stat.variantId} className={`rounded-xl border p-4 ${winner ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold w-5 h-5 rounded flex items-center justify-center ${isControl ? 'bg-gray-200 text-gray-600' : 'bg-blue-100 text-blue-700'}`}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{stat.variantName ?? exp.variants[i]?.name}</span>
                          {winner && <CheckCircle className="h-4 w-4 text-green-600" />}
                        </div>
                        {!isControl && stat.uplift !== undefined && (
                          <span className={`text-xs font-semibold flex items-center gap-0.5 ${stat.uplift >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {stat.uplift >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                            {Math.abs(stat.uplift).toFixed(1)}% uplift
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-lg font-bold text-gray-900 tabular-nums">{stat.impressions.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-400">Impressions</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-gray-900 tabular-nums">{stat.conversions}</p>
                          <p className="text-[10px] text-gray-400">Conversions</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-gray-900 tabular-nums">{(stat.conversionRate * 100).toFixed(1)}%</p>
                          <p className="text-[10px] text-gray-400">Conv. Rate</p>
                        </div>
                      </div>
                      {!isControl && stat.significance !== undefined && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-500">Statistical significance</span>
                            <span className={`font-medium ${stat.significance >= exp.confidenceLevel ? 'text-green-600' : 'text-gray-500'}`}>
                              {stat.significance}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className={`h-2 rounded-full transition-all ${stat.significance >= exp.confidenceLevel ? 'bg-green-500' : 'bg-blue-400'}`}
                              style={{ width: `${Math.min(stat.significance, 100)}%` }} />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-gray-400 mt-0.5">
                            <span>0%</span>
                            <span className="text-gray-500">Target: {exp.confidenceLevel}%</span>
                            <span>100%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="text-xs text-gray-400 text-center">
                Total: {results.totalImpressions.toLocaleString()} impressions · Min required: {exp.minSampleSize}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function NewExperimentModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: any) => void }) {
  const [form, setForm] = useState({
    name: '',
    type: 'email_subject' as ExperimentType,
    hypothesis: '',
    confidenceLevel: 95,
    minSampleSize: 100,
  })
  const [variants, setVariants] = useState([
    { name: 'Control', content: '', trafficSplit: 50 },
    { name: 'Variant B', content: '', trafficSplit: 50 },
  ])
  const [saving, setSaving] = useState(false)

  const addVariant = () => {
    const split = Math.floor(100 / (variants.length + 1))
    setVariants(prev => [...prev.map(v => ({ ...v, trafficSplit: split })), { name: `Variant ${String.fromCharCode(66 + prev.length)}`, content: '', trafficSplit: split }])
  }

  const removeVariant = (i: number) => {
    if (variants.length <= 2) return
    const updated = variants.filter((_, idx) => idx !== i)
    const split = Math.floor(100 / updated.length)
    setVariants(updated.map(v => ({ ...v, trafficSplit: split })))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onCreate({ ...form, variants })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">New A/B Experiment</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-700">Experiment Name *</label>
              <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">Type *</label>
              <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as ExperimentType }))}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">Confidence Level</label>
              <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={form.confidenceLevel} onChange={e => setForm(f => ({ ...f, confidenceLevel: parseInt(e.target.value) }))}>
                <option value="90">90%</option>
                <option value="95">95% (recommended)</option>
                <option value="99">99%</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-700">Hypothesis *</label>
              <textarea rows={2} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="If we change X, then Y will improve by Z because..."
                value={form.hypothesis} onChange={e => setForm(f => ({ ...f, hypothesis: e.target.value }))} required />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-700">Variants</label>
              {variants.length < 4 && (
                <button type="button" onClick={addVariant} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add variant</button>
              )}
            </div>
            <div className="space-y-2">
              {variants.map((v, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className={`text-xs font-bold w-6 h-6 mt-2 rounded flex items-center justify-center flex-shrink-0 ${i === 0 ? 'bg-gray-200 text-gray-600' : 'bg-blue-100 text-blue-700'}`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <input className="border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Name" value={v.name}
                      onChange={e => setVariants(prev => prev.map((vv, ii) => ii === i ? { ...vv, name: e.target.value } : vv))} />
                    <input className="col-span-2 border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Content / Value" value={v.content}
                      onChange={e => setVariants(prev => prev.map((vv, ii) => ii === i ? { ...vv, content: e.target.value } : vv))} />
                  </div>
                  {i > 1 && (
                    <button type="button" onClick={() => removeVariant(i)} className="mt-2 p-1 text-gray-400 hover:text-red-500">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving || !form.name || !form.hypothesis}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Experiment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ABTestingPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Experiment | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [filter, setFilter] = useState<Status | 'ALL'>('ALL')

  useEffect(() => {
    apiClient.get<{ data: Experiment[] }>('/ab-testing')
      .then(r => {
        const data = (r as any).data ?? []
        setExperiments(data.length ? data : DEMO_EXPERIMENTS)
      })
      .catch(() => setExperiments(DEMO_EXPERIMENTS))
      .finally(() => setLoading(false))
  }, [])

  const handleStatusChange = async (id: string, status: Status) => {
    try {
      await apiClient.patch(`/ab-testing/${id}/status`, { status })
      setExperiments(prev => prev.map(e => e.id === id ? { ...e, status } : e))
    } catch {
      setExperiments(prev => prev.map(e => e.id === id ? { ...e, status } : e))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this experiment?')) return
    try {
      await apiClient.delete(`/ab-testing/${id}`)
    } catch {}
    setExperiments(prev => prev.filter(e => e.id !== id))
  }

  const handleCreate = async (data: any) => {
    try {
      const res = await apiClient.post<{ data: Experiment }>('/ab-testing', data)
      setExperiments(prev => [(res as any).data, ...prev])
    } catch {
      const newExp = { ...data, id: `local_${Date.now()}`, status: 'DRAFT', createdAt: new Date().toISOString() }
      setExperiments(prev => [newExp, ...prev])
    }
    setShowNew(false)
  }

  const filtered = filter === 'ALL' ? experiments : experiments.filter(e => e.status === filter)
  const counts: Record<Status, number> = { DRAFT: 0, RUNNING: 0, PAUSED: 0, COMPLETED: 0 }
  experiments.forEach(e => { if (e.status in counts) counts[e.status]++ })

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
            <FlaskConical className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">A/B Testing</h1>
            <p className="text-sm text-gray-500">Run experiments to optimize conversions and engagement</p>
          </div>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="h-4 w-4" />New Experiment
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['ALL', 'RUNNING', 'DRAFT', 'COMPLETED'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-left rounded-xl border p-4 transition-all ${filter === s ? 'border-blue-500 bg-blue-50' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
            <p className="text-2xl font-bold text-gray-900">{s === 'ALL' ? experiments.length : counts[s as Status]}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s === 'ALL' ? 'Total' : s.charAt(0) + s.slice(1).toLowerCase()}</p>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="bg-gray-100 rounded-xl h-48 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No experiments</p>
          <p className="text-sm mt-1">Create your first A/B experiment to start optimizing</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(exp => (
            <ExperimentCard key={exp.id} exp={exp} onStatusChange={handleStatusChange} onView={setSelected} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {selected && <ResultsDrawer exp={selected} onClose={() => setSelected(null)} />}
      {showNew && <NewExperimentModal onClose={() => setShowNew(false)} onCreate={handleCreate} />}
    </div>
  )
}
