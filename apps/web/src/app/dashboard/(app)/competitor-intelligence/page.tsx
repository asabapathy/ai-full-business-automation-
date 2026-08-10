'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, X, RefreshCw, Globe, Star, Cpu, Share2, Brain, Trash2, ExternalLink, Eye, AlertCircle } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'

interface Competitor {
  id: string
  name: string
  website: string
  addedAt: string
  scraped?: {
    title?: string
    description?: string
    technologies?: string[]
    reviews?: { count: number; rating: number }
    socialLinks?: Record<string, string>
    phoneNumbers?: string[]
    lastScraped?: string
    error?: string
  }
}

interface Analysis {
  summary: string
  competitorCount: number
  lastAnalyzed: string
}

const DEMO_COMPETITORS: Competitor[] = [
  {
    id: 'demo_1', name: 'Acme Services Co.', website: 'acmeservices.com', addedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    scraped: {
      title: 'Acme Services - Professional Home Services', description: 'Top-rated home services company serving the greater metro area.',
      technologies: ['WordPress', 'Google Analytics', 'Calendly', 'Stripe'],
      reviews: { count: 312, rating: 4.6 }, socialLinks: { facebook: 'fb.com/acme', instagram: 'ig.com/acme' },
      phoneNumbers: ['(555) 123-4567'], lastScraped: new Date(Date.now() - 3600000).toISOString(),
    },
  },
  {
    id: 'demo_2', name: 'ProTech Solutions', website: 'protechsolutions.io', addedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    scraped: {
      title: 'ProTech Solutions - Enterprise Service Management',
      description: 'Enterprise-grade solutions for growing businesses.',
      technologies: ['React', 'Next.js', 'Intercom', 'Hubspot'],
      reviews: { count: 89, rating: 4.2 }, socialLinks: { linkedin: 'linkedin.com/protech', twitter: 'x.com/protech' },
      phoneNumbers: ['(555) 987-6543'], lastScraped: new Date(Date.now() - 7200000).toISOString(),
    },
  },
  {
    id: 'demo_3', name: 'QuickFix Pros', website: 'quickfixpros.com', addedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    scraped: {
      title: 'QuickFix Pros - Same Day Service', description: 'Same-day service for all your repair needs.',
      technologies: ['Wix', 'Google Analytics'],
      reviews: { count: 1240, rating: 4.8 }, socialLinks: { facebook: 'fb.com/quickfix', tiktok: 'tiktok.com/@quickfix' },
      lastScraped: new Date(Date.now() - 1800000).toISOString(),
    },
  },
]

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

function CompetitorCard({ competitor, onScrape, onRemove, onSelect, scraping }: {
  competitor: Competitor
  onScrape: (id: string) => void
  onRemove: (id: string) => void
  onSelect: (c: Competitor) => void
  scraping: boolean
}) {
  const s = competitor.scraped
  return (
    <div className="rounded-xl p-5 transition-all" style={cardStyle}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{competitor.name}</h3>
          <a href={`https://${competitor.website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-0.5 mt-0.5" onClick={e => e.stopPropagation()}>
            <Globe className="h-3 w-3" />
            {competitor.website}
          </a>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onScrape(competitor.id)} disabled={scraping}
            className="p-1.5 text-muted-foreground hover:text-primary rounded-lg transition-colors disabled:opacity-40" title="Refresh data">
            <RefreshCw className={`h-3.5 w-3.5 ${scraping ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => onSelect(competitor)}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors" title="View details">
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onRemove(competitor.id)}
            className="p-1.5 text-muted-foreground hover:text-red-400 rounded-lg transition-colors" title="Remove">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {s?.error && (
        <div className="flex items-center gap-2 text-xs rounded-lg px-3 py-2 mb-3" style={{ color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          Failed to scrape: {s.error}
        </div>
      )}

      {s && !s.error ? (
        <div className="space-y-3">
          {s.description && <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>}
          <div className="flex flex-wrap gap-2">
            {s.reviews && (
              <div className="flex items-center gap-1 text-xs rounded-full px-2 py-0.5" style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}>
                <Star className="h-3 w-3" />
                {s.reviews.rating} · {s.reviews.count.toLocaleString()} reviews
              </div>
            )}
            {s.socialLinks && Object.keys(s.socialLinks).length > 0 && (
              <div className="flex items-center gap-1 text-xs rounded-full px-2 py-0.5" style={{ color: '#a78bfa', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}>
                <Share2 className="h-3 w-3" />
                {Object.keys(s.socialLinks).join(', ')}
              </div>
            )}
          </div>
          {s.technologies && s.technologies.length > 0 && (
            <div className="flex items-center gap-2">
              <Cpu className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex flex-wrap gap-1">
                {s.technologies.map(t => (
                  <span key={t} className="text-xs rounded px-1.5 py-0.5" style={{ background: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}>{t}</span>
                ))}
              </div>
            </div>
          )}
          {s.lastScraped && (
            <p className="text-[10px] text-muted-foreground">Last scraped {new Date(s.lastScraped).toLocaleString()}</p>
          )}
        </div>
      ) : !s && (
        <div className="text-xs text-muted-foreground italic">No data yet — click refresh to scrape</div>
      )}
    </div>
  )
}

function CompetitorDetailDrawer({ competitor, onClose }: { competitor: Competitor; onClose: () => void }) {
  const s = competitor.scraped
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div className="relative w-full max-w-lg shadow-2xl flex flex-col overflow-hidden" style={{ background: 'hsl(var(--card))', borderLeft: '1px solid hsl(var(--border))' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <div>
            <h2 className="font-semibold text-foreground">{competitor.name}</h2>
            <a href={`https://${competitor.website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5">
              {competitor.website} <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {s?.description && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Description</p>
              <p className="text-sm text-foreground">{s.description}</p>
            </div>
          )}
          {s?.reviews && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Reviews</p>
              <div className="flex items-center gap-3">
                <div className="text-3xl font-bold text-foreground tabular">{s.reviews.rating}</div>
                <div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} className="h-4 w-4" style={{ color: i <= Math.round(s.reviews!.rating) ? '#fbbf24' : 'hsl(var(--border))' }} />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.reviews.count.toLocaleString()} reviews</p>
                </div>
              </div>
            </div>
          )}
          {s?.technologies && s.technologies.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tech Stack</p>
              <div className="flex flex-wrap gap-2">
                {s.technologies.map(t => (
                  <span key={t} className="text-xs rounded-lg px-2 py-1" style={{ color: '#60a5fa', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}>{t}</span>
                ))}
              </div>
            </div>
          )}
          {s?.socialLinks && Object.keys(s.socialLinks).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Social Presence</p>
              <div className="space-y-1.5">
                {Object.entries(s.socialLinks).map(([platform, url]) => (
                  <a key={platform} href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline capitalize">
                    <ExternalLink className="h-3.5 w-3.5" />
                    {platform}
                  </a>
                ))}
              </div>
            </div>
          )}
          {s?.phoneNumbers && s.phoneNumbers.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Phone Numbers</p>
              {s.phoneNumbers.map(p => (
                <p key={p} className="text-sm text-foreground">{p}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CompetitorIntelligencePage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [scrapingIds, setScrapingIds] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Competitor | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', website: '' })
  const [adding, setAdding] = useState(false)
  const [scrapeAll, setScrapeAll] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get<{ data: Competitor[] }>('/competitors')
      const data = (res as any).data ?? []
      setCompetitors(data.length ? data : DEMO_COMPETITORS)
    } catch { setCompetitors(DEMO_COMPETITORS) }
    setLoading(false)
  }

  const loadAnalysis = async () => {
    setAnalysisLoading(true)
    try {
      const res = await apiClient.get<{ data: Analysis }>('/competitors/analysis')
      setAnalysis((res as any).data ?? null)
    } catch {
      setAnalysis({
        summary: `**Competitive Analysis**\n\nYour top competitor, QuickFix Pros, has 1,240 reviews at 4.8 stars — making reputation their strongest asset. Key gaps you can exploit:\n\n1. **Tech stack advantage**: Most competitors use basic platforms (Wix, WordPress). Leaning into AI-powered operations gives you a technology edge.\n\n2. **LinkedIn & B2B presence**: None of your local competitors have a strong LinkedIn presence — untapped channel for B2B referrals.\n\n3. **Content marketing**: No competitor appears to have a blog or content strategy. Publishing helpful how-to guides could drive significant organic traffic.\n\n**Recommendation**: Focus on review generation in the next 30 days to close the gap with QuickFix Pros, then launch a content strategy to capture organic search traffic competitors are ignoring.`,
        competitorCount: 3,
        lastAnalyzed: new Date().toISOString(),
      })
    }
    setAnalysisLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    setAdding(true)
    try {
      const res = await apiClient.post<{ data: Competitor }>('/competitors', addForm)
      const newComp = (res as any).data
      setCompetitors(prev => [...prev, newComp])
      setAddForm({ name: '', website: '' })
      setShowAdd(false)
    } catch { toast('Failed to add competitor', 'error') }
    setAdding(false)
  }

  const handleScrape = async (id: string) => {
    setScrapingIds(prev => new Set(prev).add(id))
    try {
      const res = await apiClient.post<{ data: any }>(`/competitors/${id}/scrape`, {})
      setCompetitors(prev => prev.map(c => c.id === id ? { ...c, scraped: (res as any).data } : c))
    } catch { toast('Failed to scrape competitor website', 'error') }
    setScrapingIds(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  const handleScrapeAll = async () => {
    setScrapeAll(true)
    try {
      const res = await apiClient.post<{ data: Record<string, any> }>('/competitors/scrape-all', {})
      const scraped = (res as any).data ?? {}
      setCompetitors(prev => prev.map(c => scraped[c.id] ? { ...c, scraped: scraped[c.id] } : c))
    } catch { toast('Failed to refresh all competitors', 'error') }
    setScrapeAll(false)
  }

  const handleRemove = async (id: string) => {
    setCompetitors(prev => prev.filter(c => c.id !== id))
    try { await apiClient.delete(`/competitors/${id}`) } catch {}
  }

  const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
  const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div {...anim(0)} className="kv-anim flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}>
            <Search className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Competitor Intelligence</h1>
            <p className="text-sm text-muted-foreground">Monitor competitors and uncover market opportunities</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleScrapeAll} disabled={scrapeAll || competitors.length === 0}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
            style={cardStyle}>
            <RefreshCw className={`h-4 w-4 ${scrapeAll ? 'animate-spin' : ''}`} />
            {scrapeAll ? 'Refreshing…' : 'Refresh All'}
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.25)' }}>
            <Plus className="h-4 w-4" />
            Add Competitor
          </button>
        </div>
      </div>

      {loading ? (
        <div {...anim(1)} className="kv-anim grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <div key={i} className="rounded-xl h-48 animate-pulse" style={{ background: 'hsl(var(--card))' }} />)}
        </div>
      ) : (
        <div {...anim(1)} className="kv-anim grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {competitors.map(c => (
            <CompetitorCard key={c.id} competitor={c} onScrape={handleScrape} onRemove={handleRemove} onSelect={setSelected} scraping={scrapingIds.has(c.id)} />
          ))}
          {competitors.length === 0 && (
            <div className="col-span-3 text-center py-16 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium text-foreground">No competitors added</p>
              <p className="text-sm mt-1">Add competitors to start tracking their online presence</p>
            </div>
          )}
        </div>
      )}

      {/* AI Analysis */}
      <div {...anim(2)} className="kv-anim rounded-xl overflow-hidden" style={cardStyle}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid hsl(var(--border))', background: 'rgba(6,182,212,0.03)' }}>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-base font-semibold text-foreground">AI Competitive Analysis</h2>
              <p className="text-xs text-muted-foreground">AI-powered insights from competitor data</p>
            </div>
          </div>
          <button onClick={loadAnalysis} disabled={analysisLoading || competitors.length === 0}
            className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
            <Brain className="h-3.5 w-3.5" />
            {analysisLoading ? 'Analyzing…' : 'Generate Analysis'}
          </button>
        </div>
        <div className="p-5">
          {analysisLoading ? (
            <div className="space-y-2">
              {[100, 80, 90, 60].map((w, i) => (
                <div key={i} className="h-4 rounded animate-pulse" style={{ width: `${w}%`, background: 'hsl(var(--border))' }} />
              ))}
            </div>
          ) : analysis ? (
            <div className="space-y-2">
              {analysis.summary.split('\n').map((line, i) => {
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <h3 key={i} className="font-semibold text-foreground mt-3 first:mt-0 text-sm">{line.replace(/\*\*/g, '')}</h3>
                }
                if (line.match(/^\d+\.\s+\*\*/)) {
                  const cleaned = line.replace(/\*\*/g, '')
                  return <p key={i} className="text-sm text-muted-foreground my-1">{cleaned}</p>
                }
                return line.trim() ? <p key={i} className="text-sm text-muted-foreground my-1">{line.replace(/\*\*/g, '')}</p> : null
              })}
              <p className="text-xs text-muted-foreground mt-4 pt-4" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                Last analyzed: {new Date(analysis.lastAnalyzed).toLocaleString()}
              </p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Click "Generate Analysis" to get AI-powered competitive insights</p>
            </div>
          )}
        </div>
      </div>

      {/* Add competitor modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="relative rounded-2xl w-full max-w-sm mx-4 p-6 space-y-4" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            <h2 className="font-semibold text-foreground">Add Competitor</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Business Name *</label>
                <input className={inputCls} style={inputStyle} placeholder="Acme Services" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Website URL *</label>
                <input className={inputCls} style={inputStyle} placeholder="acmeservices.com" value={addForm.website} onChange={e => setAddForm(f => ({ ...f, website: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowAdd(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
                  style={{ border: '1px solid hsl(var(--border))' }}>
                  Cancel
                </button>
                <button onClick={handleAdd} disabled={adding || !addForm.name || !addForm.website}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                  {adding ? 'Adding…' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selected && <CompetitorDetailDrawer competitor={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
