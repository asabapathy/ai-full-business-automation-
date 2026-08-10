'use client'

import { useState, useEffect, useMemo } from 'react'
import { TrendingUp, Plus, DollarSign, Target, CheckCircle, LayoutList, LayoutGrid, ChevronRight, Zap, X } from 'lucide-react'
import { api } from '../../../../../lib/api-client'
import { toast } from '../../../../../lib/toast'

interface Deal {
  id: string
  title: string
  value?: number
  stage: string
  contact?: { firstName: string; lastName?: string }
  company?: { name: string }
  updatedAt: string
}

interface Analytics {
  pipeline: { stage: string; _count: number; _sum: { value: number | null } }[]
  wonRevenue: number
  wonDeals: number
  conversionRate: number
}

const STAGE_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  NEW:           { label: 'New',           color: '#06b6d4', bg: 'rgba(6,182,212,0.08)',   border: 'rgba(6,182,212,0.25)' },
  CONTACTED:     { label: 'Contacted',     color: '#a78bfa', bg: 'rgba(139,92,246,0.08)',  border: 'rgba(139,92,246,0.25)' },
  QUALIFIED:     { label: 'Qualified',     color: '#fbbf24', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)' },
  PROPOSAL_SENT: { label: 'Proposal Sent', color: '#fb923c', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.25)' },
  NEGOTIATION:   { label: 'Negotiation',   color: '#f472b6', bg: 'rgba(236,72,153,0.08)',  border: 'rgba(236,72,153,0.25)' },
  WON:           { label: 'Won',           color: '#34d399', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)' },
  LOST:          { label: 'Lost',          color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)' },
}

const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST'] as const

const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const DEMO_DEALS: Deal[] = [
  { id: '1', title: 'HVAC Installation — Johnson Home', value: 4500, stage: 'PROPOSAL_SENT', contact: { firstName: 'Mark', lastName: 'Johnson' }, updatedAt: new Date().toISOString() },
  { id: '2', title: 'Annual Maintenance Contract', value: 12000, stage: 'NEGOTIATION', company: { name: 'Riverdale Office Park' }, updatedAt: new Date().toISOString() },
  { id: '3', title: 'Emergency Repair — Williams', value: 850, stage: 'WON', contact: { firstName: 'Sarah', lastName: 'Williams' }, updatedAt: new Date().toISOString() },
  { id: '4', title: 'New AC System — Peterson', value: 7200, stage: 'QUALIFIED', contact: { firstName: 'Tom', lastName: 'Peterson' }, updatedAt: new Date().toISOString() },
  { id: '5', title: 'Duct Cleaning Service', value: 600, stage: 'NEW', contact: { firstName: 'Lisa', lastName: 'Chen' }, updatedAt: new Date().toISOString() },
  { id: '6', title: 'Commercial HVAC Upgrade', value: 28000, stage: 'CONTACTED', company: { name: 'Downtown Plaza Hotel' }, updatedAt: new Date().toISOString() },
]

export default function SalesPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [stageFilter, setStageFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [movingDeal, setMovingDeal] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', value: '', stage: 'NEW', contactName: '' })

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [dealData, analyticsData] = await Promise.all([
          api.get<{ deals: Deal[] }>('/sales/deals', { stage: stageFilter || undefined }),
          api.get<Analytics>('/sales/analytics'),
        ])
        setDeals((dealData as any).deals ?? [])
        setAnalytics(analyticsData as any)
      } catch {
        setDeals(DEMO_DEALS)
        setAnalytics({ pipeline: [], wonRevenue: 28500, wonDeals: 14, conversionRate: 42 })
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [stageFilter])

  const pipelineValue = deals
    .filter(d => !['WON', 'LOST'].includes(d.stage))
    .reduce((sum, d) => sum + (d.value ?? 0), 0)

  async function createDeal() {
    if (!form.title.trim()) return
    setCreating(true)
    try {
      const res = await api.post<{ data: { deal: Deal } }>('/sales/deals', {
        title: form.title,
        value: form.value ? parseFloat(form.value) : undefined,
        stage: form.stage,
      }) as any
      const deal = res?.data?.deal ?? res?.deal ?? {
        id: String(Date.now()), title: form.title,
        value: form.value ? parseFloat(form.value) : undefined,
        stage: form.stage, updatedAt: new Date().toISOString(),
      }
      setDeals(prev => [deal, ...prev])
      toast('Deal created', 'success')
      setShowCreate(false)
      setForm({ title: '', value: '', stage: 'NEW', contactName: '' })
    } catch {
      toast('Failed to create deal.', 'error')
    } finally {
      setCreating(false)
    }
  }

  async function moveDeal(dealId: string, newStage: string) {
    setMovingDeal(dealId)
    try {
      await api.patch(`/sales/deals/${dealId}`, { stage: newStage })
    } catch {}
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: newStage } : d))
    setMovingDeal(null)
  }

  const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div {...anim(0)} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sales Pipeline</h1>
          <p className="text-muted-foreground text-sm mt-0.5">AI-powered deal tracking and follow-ups</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-xl overflow-hidden" style={cardStyle}>
            {([['kanban', LayoutGrid], ['list', LayoutList]] as const).map(([v, Icon]) => (
              <button key={v} onClick={() => setView(v)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all"
                style={view === v
                  ? { background: 'linear-gradient(135deg,#06b6d4,#0ea5e9)', color: 'white' }
                  : { color: 'hsl(var(--muted-foreground))' }
                }>
                <Icon className="h-3.5 w-3.5" />
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.3)' }}
          >
            <Plus className="h-4 w-4" />
            Add Deal
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Pipeline Value', value: `$${(pipelineValue / 1000).toFixed(1)}k`, icon: TrendingUp, hex: null as string | null },
          { label: 'Won Revenue', value: analytics ? `$${(analytics.wonRevenue / 1000).toFixed(1)}k` : '--', icon: DollarSign, hex: '#34d399' as string | null },
          { label: 'Won Deals', value: analytics?.wonDeals ?? '--', icon: CheckCircle, hex: '#34d399' as string | null },
          { label: 'Conversion', value: analytics ? `${analytics.conversionRate}%` : '--', icon: Target, hex: '#a78bfa' as string | null },
        ].map((stat, i) => (
          <div key={stat.label} {...anim(i + 1)} className="rounded-xl border p-4" style={cardStyle}>
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`h-4 w-4${!stat.hex ? ' text-primary' : ''}`} style={stat.hex ? { color: stat.hex } : undefined} />
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
            {isLoading ? <div className="h-8 w-16 mt-1 rounded-lg animate-pulse" style={{ background: 'hsl(var(--muted))' }} /> : <p className={`text-2xl font-bold tabular${!stat.hex ? ' text-primary' : ''}`} style={stat.hex ? { color: stat.hex } : undefined}>{stat.value}</p>}
          </div>
        ))}
      </div>

      {/* Kanban view */}
      {view === 'kanban' && (
        <div {...anim(5)} className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {STAGES.map(stage => {
              const meta = STAGE_META[stage]
              const stageDeals = deals.filter(d => d.stage === stage)
              const stageValue = stageDeals.reduce((s, d) => s + (d.value ?? 0), 0)

              return (
                <div key={stage} className="w-64 flex flex-col gap-2">
                  {/* Column header */}
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color: meta.color }}>{meta.label}</span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: meta.border, color: meta.color }}>
                        {stageDeals.length}
                      </span>
                    </div>
                    {stageValue > 0 && (
                      <span className="text-[10px] font-medium tabular" style={{ color: meta.color }}>
                        ${(stageValue / 1000).toFixed(1)}k
                      </span>
                    )}
                  </div>

                  {/* Deal cards */}
                  <div className="flex flex-col gap-2">
                    {stageDeals.map(deal => (
                      <div key={deal.id} className="rounded-xl p-3 group" style={cardStyle}>
                        <p className="text-sm font-medium text-foreground leading-snug mb-1.5">{deal.title}</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          {deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName ?? ''}` : deal.company?.name ?? '—'}
                        </p>
                        <div className="flex items-center justify-between">
                          {deal.value ? (
                            <span className="text-sm font-semibold tabular" style={{ color: '#34d399' }}>${deal.value.toLocaleString()}</span>
                          ) : <span />}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              title="AI Follow-up"
                              className="p-1 rounded text-primary hover:bg-primary/10 transition-colors"
                            >
                              <Zap className="h-3 w-3" />
                            </button>
                            {/* Advance stage */}
                            {stage !== 'WON' && stage !== 'LOST' && (
                              <button
                                onClick={() => {
                                  const nextIdx = STAGES.indexOf(stage) + 1
                                  if (nextIdx < STAGES.length) moveDeal(deal.id, STAGES[nextIdx])
                                }}
                                disabled={movingDeal === deal.id}
                                title="Advance stage"
                                className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                              >
                                <ChevronRight className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {stageDeals.length === 0 && (
                      <div className="rounded-xl p-4 text-center" style={{ border: '1px dashed hsl(var(--border))' }}>
                        <p className="text-xs text-muted-foreground/50">No deals</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div {...anim(5)}>
          {/* Stage filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
            <button onClick={() => setStageFilter('')}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
              style={stageFilter === '' ? { background: 'linear-gradient(135deg,#06b6d4,#0ea5e9)', color: 'white' } : { ...cardStyle, color: 'hsl(var(--muted-foreground))' }}>
              All
            </button>
            {STAGES.map(stage => (
              <button key={stage} onClick={() => setStageFilter(stage)}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                style={stageFilter === stage ? { background: 'linear-gradient(135deg,#06b6d4,#0ea5e9)', color: 'white' } : { ...cardStyle, color: 'hsl(var(--muted-foreground))' }}>
                {STAGE_META[stage]?.label ?? stage}
              </button>
            ))}
          </div>

          <div className="rounded-xl border overflow-hidden" style={cardStyle}>
            <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Deals</h2>
              <span className="ml-auto text-xs text-muted-foreground">{deals.length} deals</span>
            </div>
            {isLoading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: 'hsl(var(--muted))' }} />)}</div>
            ) : deals.length === 0 ? (
              <div className="py-16 text-center">
                <TrendingUp className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-medium text-foreground">No deals yet</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                {deals.map(deal => {
                  const meta = STAGE_META[deal.stage] ?? STAGE_META.NEW
                  return (
                    <div key={deal.id} className="flex items-center gap-4 px-5 py-3 hover:bg-accent/40 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{deal.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName ?? ''}` : deal.company?.name ?? '—'}
                        </p>
                      </div>
                      {deal.value && <span className="text-sm font-semibold tabular" style={{ color: '#34d399' }}>${deal.value.toLocaleString()}</span>}
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>
                        {meta.label}
                      </span>
                      <button className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10">
                        <Zap className="h-3 w-3" />AI Follow-up
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create deal modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">New Deal</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Deal Title *</label>
                <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. HVAC Installation — Smith Residence"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Value ($)</label>
                  <input type="number" min="0" step="0.01" className={inputCls} style={inputStyle} placeholder="0.00"
                    value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Stage</label>
                  <select className={inputCls} style={inputStyle}
                    value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}>
                    {STAGES.map(s => <option key={s} value={s}>{STAGE_META[s]?.label ?? s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                style={{ border: '1px solid hsl(var(--border))' }}>
                Cancel
              </button>
              <button onClick={createDeal} disabled={creating || !form.title.trim()}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg,#06b6d4,#0ea5e9)' }}>
                {creating ? 'Adding…' : 'Add Deal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
