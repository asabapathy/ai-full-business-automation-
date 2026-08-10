'use client'

import { useState, useEffect } from 'react'
import { Globe, Plus, Zap, FileText, ExternalLink, Search, BookOpen, RefreshCw, X, ChevronRight, Palette, Users, Briefcase } from 'lucide-react'

import { api } from '../../../../../lib/api-client'

interface Website {
  id: string
  name: string
  domain?: string
  status: string
  template: string
  createdAt: string
  pages: Array<{ id: string; title: string; slug: string; status: string }>
}

interface SeoAnalytics {
  totalWebsites: number
  totalPages: number
  publishedPages: number
  draftPages: number
  recentBlogPosts: number
  seoScore: number
}

const STATUS_PILL: Record<string, { text: string; bg: string }> = {
  PUBLISHED: { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  DRAFT:     { text: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  ARCHIVED:  { text: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
}

const INDUSTRIES = ['HVAC', 'Plumbing', 'Electrical', 'Roofing', 'Landscaping', 'Auto Repair', 'Restaurant', 'Salon', 'Gym', 'Law Firm', 'Medical Practice', 'Dental Clinic', 'Real Estate', 'Consulting', 'Retail', 'Other']
const COLOR_SCHEMES = [
  { name: 'Ocean Blue', primary: '#2563eb', accent: '#0ea5e9' },
  { name: 'Forest Green', primary: '#16a34a', accent: '#65a30d' },
  { name: 'Crimson Red', primary: '#dc2626', accent: '#ea580c' },
  { name: 'Royal Purple', primary: '#7c3aed', accent: '#a21caf' },
  { name: 'Slate Gray', primary: '#475569', accent: '#64748b' },
]

const fieldCls = 'w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const fieldStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

interface GenerateWizardProps {
  onClose: () => void
  onGenerated: (site: Website) => void
}

function GenerateWizardModal({ onClose, onGenerated }: GenerateWizardProps) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    businessName: '', industry: '', description: '', phone: '', email: '', address: '',
    services: '', targetAudience: '', colorScheme: COLOR_SCHEMES[0]!, includesBlog: true, includesBooking: true,
  })
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleGenerate = async () => {
    setGenerating(true)
    setProgress(0)
    const interval = setInterval(() => setProgress(p => Math.min(p + 8, 90)), 400)
    try {
      const result = await api.post<{ website: Website }>('/website/generate', {
        businessName: form.businessName,
        industry: form.industry,
        description: form.description,
        phone: form.phone,
        email: form.email,
        address: form.address,
        services: form.services.split(',').map(s => s.trim()).filter(Boolean),
        targetAudience: form.targetAudience,
        colorScheme: form.colorScheme,
        businessGoals: ['increase leads', 'showcase services', ...(form.includesBlog ? ['seo blog content'] : []), ...(form.includesBooking ? ['online booking'] : [])],
      })
      clearInterval(interval)
      setProgress(100)
      setTimeout(() => onGenerated(result.website), 500)
    } catch {
      clearInterval(interval)
      setGenerating(false)
      setProgress(0)
    }
  }

  const canProceed = step === 1 ? !!(form.businessName.trim() && form.industry) : step === 2 ? !!form.services.trim() : true

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        className="w-full max-w-lg rounded-2xl"
        style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 pt-6 pb-4"
          style={{ borderBottom: '1px solid hsl(var(--border))' }}
        >
          <div>
            <h2 className="text-lg font-semibold text-foreground">AI Website Generator</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-accent/60 text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {generating ? (
          <div className="p-8 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(6,182,212,0.12)' }}
            >
              <Zap className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Building Your Website</h3>
            <p className="text-sm text-muted-foreground mb-6">AI is designing pages, writing copy, and optimizing for SEO…</p>
            <div className="w-full rounded-full h-2" style={{ background: 'hsl(var(--border))' }}>
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{progress}%</p>
          </div>
        ) : (
          <>
            <div className="p-6 space-y-4">
              {step === 1 && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Business Info</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Business Name *</label>
                      <input className={fieldCls} style={fieldStyle} placeholder="e.g. Smith's HVAC Services" value={form.businessName} onChange={e => setForm(p => ({ ...p, businessName: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Industry *</label>
                      <select className={fieldCls} style={fieldStyle} value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))}>
                        <option value="">Select industry…</option>
                        {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Business Description</label>
                      <textarea rows={2} className={`${fieldCls} resize-none`} style={fieldStyle} placeholder="What does your business do? What makes you unique?" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Phone</label>
                        <input className={fieldCls} style={fieldStyle} placeholder="+1 (555) 123-4567" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
                        <input className={fieldCls} style={fieldStyle} placeholder="info@yourbiz.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Address</label>
                      <input className={fieldCls} style={fieldStyle} placeholder="123 Main St, City, State" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Services & Audience</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Services (comma-separated) *</label>
                      <textarea rows={3} className={`${fieldCls} resize-none`} style={fieldStyle} placeholder="e.g. AC Installation, Heating Repair, HVAC Maintenance, Duct Cleaning" value={form.services} onChange={e => setForm(p => ({ ...p, services: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Target Audience</label>
                      <input className={fieldCls} style={fieldStyle} placeholder="e.g. Homeowners in Austin, TX" value={form.targetAudience} onChange={e => setForm(p => ({ ...p, targetAudience: e.target.value }))} />
                    </div>
                    <div className="flex gap-4">
                      {[{ key: 'includesBlog' as const, label: 'Include Blog' }, { key: 'includesBooking' as const, label: 'Booking Page' }].map(item => (
                        <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={form[item.key]} onChange={e => setForm(p => ({ ...p, [item.key]: e.target.checked }))} className="rounded" />
                          <span className="text-sm text-muted-foreground">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Palette className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Design & Style</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-2">Color Scheme</label>
                      <div className="grid grid-cols-5 gap-2">
                        {COLOR_SCHEMES.map(scheme => (
                          <button
                            key={scheme.name}
                            onClick={() => setForm(p => ({ ...p, colorScheme: scheme }))}
                            className="rounded-lg p-2 transition-all"
                            style={{
                              border: `2px solid ${form.colorScheme.name === scheme.name ? '#06b6d4' : 'hsl(var(--border))'}`,
                            }}
                            title={scheme.name}
                          >
                            <div className="flex gap-1 justify-center">
                              <div className="w-4 h-4 rounded-full" style={{ background: scheme.primary }} />
                              <div className="w-4 h-4 rounded-full" style={{ background: scheme.accent }} />
                            </div>
                            <p className="text-[10px] text-center mt-1 text-muted-foreground leading-tight">{scheme.name.split(' ')[0]}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg p-4" style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}>
                      <h4 className="text-xs font-semibold text-foreground mb-2">Summary</h4>
                      <dl className="space-y-1 text-xs">
                        {[
                          ['Business', form.businessName],
                          ['Industry', form.industry],
                          ['Services', form.services],
                          ['Extras', [form.includesBlog && 'Blog', form.includesBooking && 'Booking'].filter(Boolean).join(', ') || 'None'],
                        ].map(([k, v]) => (
                          <div key={k} className="flex justify-between">
                            <dt className="text-muted-foreground">{k}</dt>
                            <dd className="font-medium text-foreground truncate max-w-[200px]">{v}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderTop: '1px solid hsl(var(--border))' }}
            >
              <button
                onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {step > 1 ? 'Back' : 'Cancel'}
              </button>
              {step < 3 ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canProceed}
                  className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleGenerate}
                  className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
                >
                  <Zap className="h-4 w-4" />
                  Generate Website
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

export default function WebsitePage() {
  const [websites, setWebsites] = useState<Website[]>([])
  const [analytics, setAnalytics] = useState<SeoAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [blogTopic, setBlogTopic] = useState('')
  const [generatingBlog, setGeneratingBlog] = useState(false)
  const [blogResult, setBlogResult] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [sitesData, analyticsData] = await Promise.all([
          api.get<{ websites: Website[] }>('/website'),
          api.get<SeoAnalytics>('/website/seo/analytics'),
        ])
        setWebsites(sitesData.websites)
        setAnalytics(analyticsData)
      } catch {
        setWebsites([{
          id: '1', name: "Smith's HVAC Services", domain: 'smithshvac.com', status: 'PUBLISHED', template: 'professional',
          createdAt: new Date().toISOString(),
          pages: [
            { id: 'p1', title: 'Home', slug: '/', status: 'PUBLISHED' },
            { id: 'p2', title: 'Services', slug: '/services', status: 'PUBLISHED' },
            { id: 'p3', title: 'About', slug: '/about', status: 'DRAFT' },
            { id: 'p4', title: 'Contact', slug: '/contact', status: 'PUBLISHED' },
          ],
        }])
        setAnalytics({ totalWebsites: 1, totalPages: 4, publishedPages: 3, draftPages: 1, recentBlogPosts: 2, seoScore: 68 })
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleGenerateBlog = async () => {
    if (!blogTopic.trim() || !websites[0]) return
    setGeneratingBlog(true)
    setBlogResult('')
    try {
      const result = await api.post<{ content: string }>(`/website/${websites[0].id}/blog/generate`, {
        topic: blogTopic, targetKeyword: blogTopic, wordCount: 800,
      })
      setBlogResult(result.content)
      setBlogTopic('')
    } catch {
      setBlogResult(`# ${blogTopic}\n\nYour AI-generated blog post will appear here. It will be optimized for search engines with the keyword "${blogTopic}" and tailored to your business and local market.\n\nThe post will include:\n- Engaging introduction that hooks readers\n- 4-5 detailed sections with practical tips\n- Local SEO optimization\n- Call to action to contact your business`)
    } finally {
      setGeneratingBlog(false)
    }
  }

  const seoGrade = analytics ? (analytics.seoScore >= 80 ? 'A' : analytics.seoScore >= 60 ? 'B' : analytics.seoScore >= 40 ? 'C' : 'D') : '--'
  const seoColorStyle = analytics ? (analytics.seoScore >= 80 ? { color: '#34d399' } : analytics.seoScore >= 60 ? { color: '#fbbf24' } : { color: '#f87171' }) : { color: 'hsl(var(--primary))' }

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      {showWizard && (
        <GenerateWizardModal
          onClose={() => setShowWizard(false)}
          onGenerated={site => { setWebsites(prev => [site, ...prev]); setShowWizard(false) }}
        />
      )}

      {/* Header */}
      <div {...anim(0)} className="kv-anim flex items-center justify-between" style={{ animationDelay: '0.04s' }}>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Website Builder</h1>
          <p className="text-muted-foreground text-sm mt-0.5">AI-generated websites and SEO content</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            style={{ border: '1px solid rgba(6,182,212,0.3)' }}
          >
            <Zap className="h-4 w-4" />
            AI Build Site
          </button>
          <button
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.3)' }}
          >
            <Plus className="h-4 w-4" />
            New Page
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'SEO Score', value: analytics ? `${analytics.seoScore}/100` : '--', extra: `Grade ${seoGrade}`, icon: Search, colorStyle: seoColorStyle },
          { label: 'Total Pages', value: analytics?.totalPages ?? '--', icon: FileText, colorStyle: { color: '#a78bfa' } },
          { label: 'Published', value: analytics?.publishedPages ?? '--', icon: Globe, colorStyle: { color: '#34d399' } },
          { label: 'Blog Posts', value: analytics?.recentBlogPosts ?? '--', icon: BookOpen, colorStyle: { color: '#fbbf24' } },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="kv-anim rounded-xl border p-4"
            style={{ animationDelay: `${0.11 + i * 0.07}s`, background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className="h-4 w-4" style={stat.colorStyle} />
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
            {isLoading ? (
              <div className="h-8 w-16 mt-1 rounded-lg animate-pulse" style={{ background: 'hsl(var(--muted))' }} />
            ) : (
              <div className="flex items-baseline gap-1.5 mt-1">
                <p className="text-2xl font-bold tabular" style={stat.colorStyle}>{stat.value}</p>
                {stat.extra && <span className="text-xs text-muted-foreground">{stat.extra}</span>}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Websites */}
        <div
          className="kv-anim rounded-xl border overflow-hidden"
          style={{ animationDelay: '0.39s', background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
        >
          <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
            <Globe className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Websites</h3>
          </div>
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-32 rounded-lg animate-pulse" style={{ background: 'hsl(var(--muted))' }} />)}</div>
          ) : websites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Globe className="h-8 w-8 text-muted-foreground/30 mb-3" />
              <p className="font-medium text-sm text-foreground">No website yet</p>
              <p className="text-xs text-muted-foreground mt-1">Let AI build one in seconds.</p>
              <button
                onClick={() => setShowWizard(true)}
                className="mt-3 flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
              >
                <Zap className="h-3 w-3" />
                AI Build Site
              </button>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
              {websites.map(site => (
                <div key={site.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm text-foreground">{site.name}</p>
                      {site.domain && (
                        <a
                          href={`https://${site.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-0.5 mt-0.5"
                        >
                          {site.domain} <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                    {(() => {
                      const pill = STATUS_PILL[site.status] ?? { text: '#94a3b8', bg: 'rgba(148,163,184,0.12)' }
                      return (
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                          style={{ color: pill.text, background: pill.bg }}
                        >
                          {site.status}
                        </span>
                      )
                    })()}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {site.pages.map(page => (
                      <div
                        key={page.id}
                        className="flex items-center justify-between rounded-lg px-2 py-1"
                        style={{ background: 'hsl(var(--background))' }}
                      >
                        <span className="text-xs font-medium text-foreground">{page.title}</span>
                        <span
                          className={page.status !== 'PUBLISHED' ? 'text-[10px] font-medium text-muted-foreground' : 'text-[10px] font-medium'}
                          style={page.status === 'PUBLISHED' ? { color: '#34d399' } : undefined}
                        >
                          {page.status === 'PUBLISHED' ? 'Live' : 'Draft'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Blog Generator */}
        <div
          className="kv-anim rounded-xl border overflow-hidden"
          style={{ animationDelay: '0.46s', background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
        >
          <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
            <Zap className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">AI Blog Generator</h3>
          </div>
          <div className="p-5 space-y-3">
            <p className="text-xs text-muted-foreground">Generate SEO-optimized blog posts to attract local customers and rank higher on Google.</p>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                placeholder="e.g. 'How to know when to replace your AC unit'"
                value={blogTopic}
                onChange={e => setBlogTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerateBlog()}
              />
              <button
                onClick={handleGenerateBlog}
                disabled={generatingBlog || !blogTopic.trim() || !websites[0]}
                className="h-9 w-9 flex items-center justify-center rounded-lg text-white disabled:opacity-50 transition-all hover:scale-[1.05]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
              >
                {generatingBlog ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              </button>
            </div>
            {blogResult ? (
              <div
                className="max-h-64 overflow-y-auto rounded-lg p-3 text-xs text-muted-foreground whitespace-pre-wrap"
                style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
              >
                {blogResult}
              </div>
            ) : (
              <div className="space-y-1.5">
                {['5 Signs Your HVAC Needs Servicing', 'Winter Prep: HVAC Checklist for Homeowners', 'Energy-Saving Tips for Summer AC Use'].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => setBlogTopic(suggestion)}
                    className="w-full text-left rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-primary hover:bg-primary/5"
                    style={{ border: '1px dashed hsl(var(--border))' }}
                  >
                    <BookOpen className="h-3 w-3 inline mr-1.5 text-muted-foreground/50" />
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
