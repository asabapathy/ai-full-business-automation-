'use client'

import { useState, useEffect } from 'react'
import {
  FlaskConical, Plus, Play, Pause, CheckCircle, AlertCircle, Trash2,
  TrendingUp, TrendingDown, BarChart2, X
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

const STATUS_META: Record<Status, { text: string; bg: string; icon: any }> = {
  DRAFT:     { text: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: FlaskConical },
  RUNNING:   { text: '#34d399', bg: 'rgba(52,211,153,0.12)', icon: Play },
  PAUSED:    { text: '#fbbf24', bg: 'rgba(251,191,36,0.12)', icon: Pause },
  COMPLETED: { text: '#60a5fa', bg: 'rgba(96,165,250,0.12)', icon: CheckCircle },
}

const TYPE_LABELS: Record<ExperimentType, string> = {
  email_subject: 'Email Subject',
  email_body: 'Email Body',
  landing_page: 'Landing Page',
  cta_text: 'CTA Text',
  pricing: 'Pricing',
  onboarding: 'Onboarding',
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

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
    control: { variantId: 'v1', variantName: 'Control', impressions: 234, conversions: 47, conversionRate: 0.201 },
    variantStats: [
      { variantId: 'v1', variantName: 'Control', impressions: 234, conversions: 47, conversionRate: 0.201 },
      { variantId: 'v2', variantName: 'Personalized + Urgency', impressions: 241, conversions: 68, conversionRate: 0.282, uplift: 40.3, significance: 92.1, isWinner: true },
    ],
    winners: [{ variantId: 'v2', variantName: 'Personalized + Urgency', impressions: 241, conversions: 68, conversionRate: 0.282, uplift: 40.3, significance: 92.1, isWinner: true }],
    totalImpressions: 475, hasSignificantWinner: false,
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
    totalImpressions: 801, hasSignificantWinner: true,
    recommendation: 'Variant "Book Your Free Consultation" is the winner at 97.8% confidence with +43.9% uplift. Roll it out to 100% of users.',
  },
}

function ExperimentCard({ exp, onStatusChange, onView, onDelete }: {
  exp: Experiment
  onStatusChange: (id: string, status: Status) => void
  onView: (e: Experiment) => void
  onDelete: (id: string) => void
}) {
  const cfg = STATUS_META[exp.status]
  const StatusIcon = cfg.icon
  const nextStatus: Partial<Record<Status, Status>> = { DRAFT: 'RUNNING', RUNNING: 'PAUSED', PAUSED: 'RUNNING' }
  const nextStatusLabel: Partial<Record<Status, string>> = { DRAFT: 'Start', RUNNING: 'Pause', PAUSED: 'Resume' }

  return (
    <div className="rounded-xl p-5 transition-shadow" style={cardStyle}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground">{exp.name}</h3>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
              style={{ color: cfg.text, background: cfg.bg }}>
              <StatusIcon className="h-3 w-3" />{exp.status.charAt(0) + exp.status.slice(1).toLowerCase()}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">{TYPE_LABELS[exp.type]}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{exp.variants.length} variants</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {nextStatus[exp.status] && (
            <button onClick={() => onStatusChange(exp.id, nextStatus[exp.status]!)}
              className="text-xs px-2.5 py-1 rounded-lg font-medium text-muted-foreground hover:text-foreground transition-colors"
              style={{ border: '1px solid hsl(var(--border))' }}>
              {nextStatusLabel[exp.status]}
            </button>
          )}
          {exp.status !== 'COMPLETED' && (
            <button onClick={() => onStatusChange(exp.id, 'COMPLETED')}
              className="text-xs px-2.5 py-1 rounded-lg font-medium text-muted-foreground hover:text-foreground transition-colors"
              style={{ border: '1px solid hsl(var(--border))' }}>
              Complete
            </button>
          )}
          <button onClick={() => onDelete(exp.id)} className="p-1.5 rounded hover:bg-muted transition-colors">
            <Trash2 className="h-3.5 w-3.5" style={{ color: '#f87171' }} />
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-3 line-clamp-2 italic">"{exp.hypothesis}"</p>

      <div className="space-y-1.5 mb-3">
        {exp.variants.map((v, i) => (
          <div key={v.id} className="flex items-center gap-2">
            <span className="text-[10px] font-semibold w-5 h-5 rounded flex items-center justify-center"
              style={i === 0
                ? { color: '#94a3b8', background: 'rgba(148,163,184,0.12)' }
                : { color: '#60a5fa', background: 'rgba(96,165,250,0.12)' }}>
              {String.fromCharCode(65 + i)}
            </span>
            <span className="text-xs text-foreground flex-1 truncate">{v.content}</span>
            <span className="text-xs text-muted-foreground">{v.trafficSplit}%</span>
          </div>
        ))}
      </div>

      <button onClick={() => onView(exp)}
        className="w-full flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg transition-colors"
        style={{ color: '#06b6d4', background: 'rgba(6,182,212,0.08)' }}>
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
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div className="relative w-full max-w-lg shadow-2xl flex flex-col overflow-hidden" style={{ background: 'hsl(var(--card))', borderLeft: '1px solid hsl(var(--border))' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <div>
            <h2 className="font-semibold text-foreground">{exp.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{TYPE_LABELS[exp.type]} · {exp.status}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'hsl(var(--muted))' }} />)}
            </div>
          ) : !results ? (
            <div className="text-center py-8 text-muted-foreground">No data yet — start the experiment to collect impressions.</div>
          ) : (
            <>
              <div className="rounded-xl p-4" style={{ color: '#60a5fa', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}>
                <p className="text-xs font-semibold mb-1">Hypothesis</p>
                <p className="text-sm italic">"{exp.hypothesis}"</p>
              </div>

              <div className="rounded-xl p-4 flex items-start gap-3"
                style={results.hasSignificantWinner
                  ? { color: '#34d399', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)' }
                  : { color: '#fbbf24', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}>
                {results.hasSignificantWinner
                  ? <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  : <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />}
                <p className="text-sm text-foreground">{results.recommendation}</p>
              </div>

              <div className="space-y-3">
                {results.variantStats.map((stat, i) => {
                  const isControl = i === 0
                  const winner = !isControl && results.winners.find(w => w.variantId === stat.variantId && w.isWinner && (w.significance ?? 0) >= exp.confidenceLevel)
                  return (
                    <div key={stat.variantId} className="rounded-xl p-4"
                      style={winner
                        ? { border: '1px solid rgba(52,211,153,0.4)', background: 'rgba(52,211,153,0.04)' }
                        : cardStyle}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold w-5 h-5 rounded flex items-center justify-center"
                            style={isControl
                              ? { color: '#94a3b8', background: 'rgba(148,163,184,0.12)' }
                              : { color: '#60a5fa', background: 'rgba(96,165,250,0.12)' }}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className="text-sm font-medium text-foreground">{stat.variantName ?? exp.variants[i]?.name}</span>
                          {winner && <CheckCircle className="h-4 w-4" style={{ color: '#34d399' }} />}
                        </div>
                        {!isControl && stat.uplift !== undefined && (
                          <span className="text-xs font-semibold flex items-center gap-0.5"
                            style={{ color: stat.uplift >= 0 ? '#34d399' : '#f87171' }}>
                            {stat.uplift >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                            {Math.abs(stat.uplift).toFixed(1)}% uplift
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                          { label: 'Impressions', value: stat.impressions.toLocaleString() },
                          { label: 'Conversions', value: stat.conversions },
                          { label: 'Conv. Rate', value: `${(stat.conversionRate * 100).toFixed(1)}%` },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <p className="text-lg font-bold text-foreground tabular-nums">{value}</p>
                            <p className="text-[10px] text-muted-foreground">{label}</p>
                          </div>
                        ))}
                      </div>
                      {!isControl && stat.significance !== undefined && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Statistical significance</span>
                            <span className="font-medium" style={{ color: stat.significance >= exp.confidenceLevel ? '#34d399' : 'hsl(var(--muted-foreground))' }}>
                              {stat.significance}%
                            </span>
                          </div>
                          <div className="w-full rounded-full h-2" style={{ background: 'hsl(var(--background))' }}>
                            <div className="h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(stat.significance, 100)}%`, background: stat.significance >= exp.confidenceLevel ? '#34d399' : '#60a5fa' }} />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5">
                            <span>0%</span>
                            <span>Target: {exp.confidenceLevel}%</span>
                            <span>100%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="text-xs text-muted-foreground text-center">
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
  const [form, setForm] = useState({ name: '', type: 'email_subject' as ExperimentType, hypothesis: '', confidenceLevel: 95, minSampleSize: 100 })
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
    try { await onCreate({ ...form, variants }) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-xl rounded-2xl overflow-hidden" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <h2 className="font-semibold text-foreground">New A/B Experiment</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition-colors"><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Experiment Name *</label>
              <input className={`mt-1 ${inputCls}`} style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Type *</label>
              <select className={`mt-1 ${inputCls}`} style={inputStyle} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as ExperimentType }))}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Confidence Level</label>
              <select className={`mt-1 ${inputCls}`} style={inputStyle} value={form.confidenceLevel} onChange={e => setForm(f => ({ ...f, confidenceLevel: parseInt(e.target.value) }))}>
                <option value="90">90%</option>
                <option value="95">95% (recommended)</option>
                <option value="99">99%</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Hypothesis *</label>
              <textarea rows={2} className={`mt-1 ${inputCls} resize-none`} style={inputStyle}
                placeholder="If we change X, then Y will improve by Z because..."
                value={form.hypothesis} onChange={e => setForm(f => ({ ...f, hypothesis: e.target.value }))} required />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground">Variants</label>
              {variants.length < 4 && (
                <button type="button" onClick={addVariant} className="text-xs font-medium transition-colors" style={{ color: '#06b6d4' }}>+ Add variant</button>
              )}
            </div>
            <div className="space-y-2">
              {variants.map((v, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs font-bold w-6 h-6 mt-2 rounded flex items-center justify-center flex-shrink-0"
                    style={i === 0
                      ? { color: '#94a3b8', background: 'rgba(148,163,184,0.12)' }
                      : { color: '#60a5fa', background: 'rgba(96,165,250,0.12)' }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <input className="rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      style={inputStyle} placeholder="Name" value={v.name}
                      onChange={e => setVariants(prev => prev.map((vv, ii) => ii === i ? { ...vv, name: e.target.value } : vv))} />
                    <input className="col-span-2 rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      style={inputStyle} placeholder="Content / Value" value={v.content}
                      onChange={e => setVariants(prev => prev.map((vv, ii) => ii === i ? { ...vv, content: e.target.value } : vv))} />
                  </div>
                  {i > 1 && (
                    <button type="button" onClick={() => removeVariant(i)} className="mt-2 p-1 text-muted-foreground hover:text-foreground transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
            <button type="submit" disabled={saving || !form.name || !form.hypothesis}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
              {saving ? 'Creating…' : 'Create Experiment'}
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
    } catch {}
    setExperiments(prev => prev.map(e => e.id === id ? { ...e, status } : e))
  }

  const handleDelete = async (id: string) => {
    setExperiments(prev => prev.filter(e => e.id !== id))
    try { await apiClient.delete(`/ab-testing/${id}`) } catch {}
  }

  const handleCreate = async (data: any) => {
    try {
      const res = await apiClient.post<{ data: Experiment }>('/ab-testing', data)
      setExperiments(prev => [(res as any).data, ...prev])
    } catch {
      setExperiments(prev => [{ ...data, id: `local_${Date.now()}`, status: 'DRAFT', createdAt: new Date().toISOString() }, ...prev])
    }
    setShowNew(false)
  }

  const filtered = filter === 'ALL' ? experiments : experiments.filter(e => e.status === filter)
  const counts: Record<Status, number> = { DRAFT: 0, RUNNING: 0, PAUSED: 0, COMPLETED: 0 }
  experiments.forEach(e => { if (e.status in counts) counts[e.status]++ })

  return (
    <div className="space-y-6 p-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(248,113,113,0.12)' }}>
            <FlaskConical className="h-5 w-5" style={{ color: '#f87171' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">A/B Testing</h1>
            <p className="text-sm text-muted-foreground">Run experiments to optimize conversions and engagement</p>
          </div>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
          <Plus className="h-4 w-4" />New Experiment
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['ALL', 'RUNNING', 'DRAFT', 'COMPLETED'] as const).map(s => {
          const active = filter === s
          const count = s === 'ALL' ? experiments.length : counts[s as Status]
          const meta = s !== 'ALL' ? STATUS_META[s as Status] : null
          return (
            <button key={s} onClick={() => setFilter(s)}
              className="text-left rounded-xl p-4 transition-all"
              style={active && meta
                ? { border: `1px solid ${meta.text}40`, background: meta.bg }
                : active
                  ? { border: '1px solid rgba(6,182,212,0.4)', background: 'rgba(6,182,212,0.08)' }
                  : cardStyle}>
              <p className="text-2xl font-bold text-foreground">{count}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s === 'ALL' ? 'Total' : s.charAt(0) + s.slice(1).toLowerCase()}</p>
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="rounded-xl h-48 animate-pulse" style={{ background: 'hsl(var(--muted))' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
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
