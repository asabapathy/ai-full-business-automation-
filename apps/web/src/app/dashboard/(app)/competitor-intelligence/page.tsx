'use client'

import { useState, useEffect } from 'react'
import {
  Search, Plus, X, RefreshCw, Globe, Star, Cpu, Share2,
  ChevronRight, AlertCircle, Brain, Trash2, ExternalLink, Eye
} from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'

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
      reviews: { count: 312, rating: 4.6 }, socialLinks: { facebook: 'https://facebook.com/acme', instagram: 'https://instagram.com/acme' },
      phoneNumbers: ['(555) 123-4567'], lastScraped: new Date(Date.now() - 3600000).toISOString(),
    },
  },
  {
    id: 'demo_2', name: 'ProTech Solutions', website: 'protechsolutions.io', addedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    scraped: {
      title: 'ProTech Solutions - Enterprise Service Management',
      description: 'Enterprise-grade solutions for growing businesses.',
      technologies: ['React', 'Next.js', 'Intercom', 'Hubspot', 'Stripe'],
      reviews: { count: 89, rating: 4.2 }, socialLinks: { linkedin: 'https://linkedin.com/company/protech', twitter: 'https://twitter.com/protech' },
      phoneNumbers: ['(555) 987-6543'], lastScraped: new Date(Date.now() - 7200000).toISOString(),
    },
  },
  {
    id: 'demo_3', name: 'QuickFix Pros', website: 'quickfixpros.com', addedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    scraped: {
      title: 'QuickFix Pros - Same Day Service',
      description: 'Same-day service for all your repair needs.',
      technologies: ['Wix', 'Google Analytics'],
      reviews: { count: 1240, rating: 4.8 }, socialLinks: { facebook: 'https://facebook.com/quickfix', tiktok: 'https://tiktok.com/@quickfix' },
      lastScraped: new Date(Date.now() - 1800000).toISOString(),
    },
  },
]

function CompetitorCard({
  competitor, onScrape, onRemove, onSelect, scraping
}: {
  competitor: Competitor
  onScrape: (id: string) => void
  onRemove: (id: string) => void
  onSelect: (c: Competitor) => void
  scraping: boolean
}) {
  const s = competitor.scraped
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{competitor.name}</h3>
          <a href={`https://${competitor.website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline flex items-center gap-0.5 mt-0.5" onClick={e => e.stopPropagation()}>
            <Globe className="h-3 w-3" />
            {competitor.website}
          </a>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => onScrape(competitor.id)} disabled={scraping}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Refresh data">
            <RefreshCw className={`h-3.5 w-3.5 ${scraping ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => onSelect(competitor)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="View details">
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onRemove(competitor.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Remove">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {s?.error && (
        <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-3">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          Failed to scrape: {s.error}
        </div>
      )}

      {s && !s.error ? (
        <div className="space-y-3">
          {s.description && <p className="text-xs text-gray-600 line-clamp-2">{s.description}</p>}

          <div className="flex flex-wrap gap-2">
            {s.reviews && (
              <div className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                <Star className="h-3 w-3" />
                {s.reviews.rating} · {s.reviews.count.toLocaleString()} reviews
              </div>
            )}
            {s.socialLinks && Object.keys(s.socialLinks).length > 0 && (
              <div className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                <Share2 className="h-3 w-3" />
                {Object.keys(s.socialLinks).join(', ')}
              </div>
            )}
          </div>

          {s.technologies && s.technologies.length > 0 && (
            <div className="flex items-center gap-2">
              <Cpu className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <div className="flex flex-wrap gap-1">
                {s.technologies.map(t => (
                  <span key={t} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{t}</span>
                ))}
              </div>
            </div>
          )}

          {s.lastScraped && (
            <p className="text-[10px] text-gray-400">
              Last scraped {new Date(s.lastScraped).toLocaleString()}
            </p>
          )}
        </div>
      ) : !s && (
        <div className="text-xs text-gray-400 italic">No data yet — click refresh to scrape</div>
      )}
    </div>
  )
}

function CompetitorDetailDrawer({ competitor, onClose }: { competitor: Competitor; onClose: () => void }) {
  const s = competitor.scraped
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-semibold text-gray-900">{competitor.name}</h2>
            <a href={`https://${competitor.website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-0.5">
              {competitor.website} <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {s?.description && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Description</h3>
              <p className="text-sm text-gray-700">{s.description}</p>
            </div>
          )}

          {s?.reviews && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Reviews</h3>
              <div className="flex items-center gap-3">
                <div className="text-3xl font-bold text-gray-900">{s.reviews.rating}</div>
                <div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} className={`h-4 w-4 ${i <= Math.round(s.reviews!.rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{s.reviews.count.toLocaleString()} reviews</p>
                </div>
              </div>
            </div>
          )}

          {s?.technologies && s.technologies.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tech Stack</h3>
              <div className="flex flex-wrap gap-2">
                {s.technologies.map(t => (
                  <span key={t} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-lg">{t}</span>
                ))}
              </div>
            </div>
          )}

          {s?.socialLinks && Object.keys(s.socialLinks).length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Social Presence</h3>
              <div className="space-y-1.5">
                {Object.entries(s.socialLinks).map(([platform, url]) => (
                  <a key={platform} href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline capitalize">
                    <ExternalLink className="h-3.5 w-3.5" />
                    {platform}
                  </a>
                ))}
              </div>
            </div>
          )}

          {s?.phoneNumbers && s.phoneNumbers.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Phone Numbers</h3>
              {s.phoneNumbers.map(p => (
                <p key={p} className="text-sm text-gray-700">{p}</p>
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
    } catch {
      setCompetitors(DEMO_COMPETITORS)
    }
    setLoading(false)
  }

  const loadAnalysis = async () => {
    setAnalysisLoading(true)
    try {
      const res = await apiClient.get<{ data: Analysis }>('/competitors/analysis')
      setAnalysis((res as any).data ?? null)
    } catch {
      setAnalysis({
        summary: `**Competitive Analysis**\n\nYour top competitor, QuickFix Pros, has 1,240 reviews at 4.8 stars — making reputation their strongest asset. Key gaps you can exploit:\n\n1. **Tech stack advantage**: Most competitors use basic platforms (Wix, WordPress). Leaning into AI-powered operations gives you a technology edge.\n\n2. **LinkedIn & B2B presence**: None of your local competitors have a strong LinkedIn presence — this is an untapped channel for B2B referrals.\n\n3. **Content marketing**: No competitor appears to have a blog or content strategy. Publishing helpful how-to guides could drive significant organic traffic.\n\n**Recommendation**: Focus on review generation in the next 30 days to close the gap with QuickFix Pros, then launch a content strategy to capture organic search traffic competitors are ignoring.`,
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
    } catch {
      alert('Failed to add competitor')
    }
    setAdding(false)
  }

  const handleScrape = async (id: string) => {
    setScrapingIds(prev => new Set(prev).add(id))
    try {
      const res = await apiClient.post<{ data: any }>(`/competitors/${id}/scrape`, {})
      setCompetitors(prev => prev.map(c => c.id === id ? { ...c, scraped: (res as any).data } : c))
    } catch {
      alert('Failed to scrape competitor website')
    }
    setScrapingIds(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  const handleScrapeAll = async () => {
    setScrapeAll(true)
    try {
      const res = await apiClient.post<{ data: Record<string, any> }>('/competitors/scrape-all', {})
      const scraped = (res as any).data ?? {}
      setCompetitors(prev => prev.map(c => scraped[c.id] ? { ...c, scraped: scraped[c.id] } : c))
    } catch {
      alert('Failed to scrape all competitors')
    }
    setScrapeAll(false)
  }

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this competitor?')) return
    try {
      await apiClient.delete(`/competitors/${id}`)
      setCompetitors(prev => prev.filter(c => c.id !== id))
    } catch {
      setCompetitors(prev => prev.filter(c => c.id !== id))
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Search className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Competitor Intelligence</h1>
            <p className="text-sm text-gray-500">Monitor competitors and uncover market opportunities</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleScrapeAll} disabled={scrapeAll || competitors.length === 0}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${scrapeAll ? 'animate-spin' : ''}`} />
            {scrapeAll ? 'Refreshing...' : 'Refresh All'}
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            <Plus className="h-4 w-4" />
            Add Competitor
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="bg-gray-100 rounded-xl h-48 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {competitors.map(c => (
            <CompetitorCard
              key={c.id}
              competitor={c}
              onScrape={handleScrape}
              onRemove={handleRemove}
              onSelect={setSelected}
              scraping={scrapingIds.has(c.id)}
            />
          ))}
          {competitors.length === 0 && (
            <div className="col-span-3 text-center py-16 text-gray-400">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">No competitors added</p>
              <p className="text-sm mt-1">Add competitors to start tracking their online presence</p>
            </div>
          )}
        </div>
      )}

      {/* AI Analysis */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-indigo-600" />
            <div>
              <h2 className="text-base font-semibold text-gray-900">AI Competitive Analysis</h2>
              <p className="text-xs text-gray-500">AI-powered insights from competitor data</p>
            </div>
          </div>
          <button onClick={loadAnalysis} disabled={analysisLoading || competitors.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50">
            <Brain className="h-3.5 w-3.5" />
            {analysisLoading ? 'Analyzing...' : 'Generate Analysis'}
          </button>
        </div>
        <div className="p-5">
          {analysisLoading ? (
            <div className="space-y-2">
              {[100, 80, 90, 60].map((w, i) => (
                <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${w}%` }} />
              ))}
            </div>
          ) : analysis ? (
            <div className="prose prose-sm max-w-none text-gray-700">
              {analysis.summary.split('\n').map((line, i) => {
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <h3 key={i} className="font-semibold text-gray-900 mt-3 first:mt-0">{line.replace(/\*\*/g, '')}</h3>
                }
                if (line.match(/^\d+\.\s+\*\*/)) {
                  const [num, ...rest] = line.split(/\.\s+/)
                  const cleaned = rest.join('. ').replace(/\*\*/g, '')
                  return <p key={i} className="text-sm my-1"><strong>{num}.</strong> {cleaned}</p>
                }
                return line.trim() ? <p key={i} className="text-sm my-1">{line.replace(/\*\*/g, '')}</p> : null
              })}
              <p className="text-xs text-gray-400 mt-4">
                Last analyzed: {new Date(analysis.lastAnalyzed).toLocaleString()}
              </p>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Brain className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Click "Generate Analysis" to get AI-powered competitive insights</p>
            </div>
          )}
        </div>
      </div>

      {/* Add competitor modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAdd(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Add Competitor</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-700">Business Name *</label>
                <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Acme Services" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Website URL *</label>
                <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="acmeservices.com" value={addForm.website} onChange={e => setAddForm(f => ({ ...f, website: e.target.value }))} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleAdd} disabled={adding || !addForm.name || !addForm.website}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                  {adding ? 'Adding...' : 'Add'}
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
