'use client'

import { useState, useEffect } from 'react'
import { Globe, Plus, Zap, FileText, ExternalLink, Search, BookOpen, RefreshCw, X, ChevronRight, Palette, Users, Briefcase } from 'lucide-react'
import { Button } from '../../../../../components/ui/button'
import { Input } from '../../../../../components/ui/input'
import { Badge } from '../../../../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/card'
import { Skeleton } from '../../../../../components/ui/skeleton'
import { api } from '../../../../../lib/api-client'

interface GenerateWizardProps {
  onClose: () => void
  onGenerated: (site: Website) => void
}

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

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'secondary',
  PUBLISHED: 'success',
  ARCHIVED: 'outline',
}

const INDUSTRIES = ['HVAC', 'Plumbing', 'Electrical', 'Roofing', 'Landscaping', 'Auto Repair', 'Restaurant', 'Salon', 'Gym', 'Law Firm', 'Medical Practice', 'Dental Clinic', 'Real Estate', 'Consulting', 'Retail', 'Other']
const COLOR_SCHEMES = [
  { name: 'Ocean Blue', primary: '#2563eb', accent: '#0ea5e9' },
  { name: 'Forest Green', primary: '#16a34a', accent: '#65a30d' },
  { name: 'Crimson Red', primary: '#dc2626', accent: '#ea580c' },
  { name: 'Royal Purple', primary: '#7c3aed', accent: '#a21caf' },
  { name: 'Slate Gray', primary: '#475569', accent: '#64748b' },
]

function GenerateWizardModal({ onClose, onGenerated }: GenerateWizardProps) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    businessName: '',
    industry: '',
    description: '',
    phone: '',
    email: '',
    address: '',
    services: '',
    targetAudience: '',
    colorScheme: COLOR_SCHEMES[0]!,
    includesBlog: true,
    includesBooking: true,
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
        businessGoals: [
          'increase leads',
          'showcase services',
          ...(form.includesBlog ? ['seo blog content'] : []),
          ...(form.includesBooking ? ['online booking'] : []),
        ],
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

  const canProceed = step === 1
    ? form.businessName.trim() && form.industry
    : step === 2
    ? form.services.trim()
    : true

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">AI Website Generator</h2>
            <p className="text-xs text-gray-500 mt-0.5">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {generating ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <Zap className="h-8 w-8 text-blue-600 animate-pulse" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Building Your Website</h3>
            <p className="text-sm text-gray-500 mb-6">AI is designing pages, writing copy, and optimizing for SEO…</p>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-2">{progress}%</p>
          </div>
        ) : (
          <>
            <div className="p-6 space-y-4">
              {step === 1 && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Business Info</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Business Name *</label>
                      <Input placeholder="e.g. Smith's HVAC Services" value={form.businessName} onChange={e => setForm(p => ({ ...p, businessName: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Industry *</label>
                      <select
                        value={form.industry}
                        onChange={e => setForm(p => ({ ...p, industry: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select industry…</option>
                        {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Business Description</label>
                      <textarea
                        rows={2}
                        placeholder="What does your business do? What makes you unique?"
                        value={form.description}
                        onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                        <Input placeholder="+1 (555) 123-4567" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                        <Input placeholder="info@yourbiz.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
                      <Input placeholder="123 Main St, City, State" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Services & Audience</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Services (comma-separated) *</label>
                      <textarea
                        rows={3}
                        placeholder="e.g. AC Installation, Heating Repair, HVAC Maintenance, Duct Cleaning"
                        value={form.services}
                        onChange={e => setForm(p => ({ ...p, services: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Target Audience</label>
                      <Input placeholder="e.g. Homeowners in Austin, TX" value={form.targetAudience} onChange={e => setForm(p => ({ ...p, targetAudience: e.target.value }))} />
                    </div>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.includesBlog} onChange={e => setForm(p => ({ ...p, includesBlog: e.target.checked }))} className="rounded" />
                        <span className="text-sm text-gray-700">Include Blog</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.includesBooking} onChange={e => setForm(p => ({ ...p, includesBooking: e.target.checked }))} className="rounded" />
                        <span className="text-sm text-gray-700">Booking Page</span>
                      </label>
                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Palette className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Design & Style</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">Color Scheme</label>
                      <div className="grid grid-cols-5 gap-2">
                        {COLOR_SCHEMES.map(scheme => (
                          <button
                            key={scheme.name}
                            onClick={() => setForm(p => ({ ...p, colorScheme: scheme }))}
                            className={`rounded-lg p-2 border-2 transition-all ${form.colorScheme.name === scheme.name ? 'border-blue-500 shadow-sm' : 'border-transparent'}`}
                            title={scheme.name}
                          >
                            <div className="flex gap-1 justify-center">
                              <div className="w-4 h-4 rounded-full" style={{ background: scheme.primary }} />
                              <div className="w-4 h-4 rounded-full" style={{ background: scheme.accent }} />
                            </div>
                            <p className="text-[10px] text-center mt-1 text-gray-600 leading-tight">{scheme.name.split(' ')[0]}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4">
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">Summary</h4>
                      <dl className="space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between"><dt className="text-gray-500">Business</dt><dd className="font-medium">{form.businessName}</dd></div>
                        <div className="flex justify-between"><dt className="text-gray-500">Industry</dt><dd>{form.industry}</dd></div>
                        <div className="flex justify-between"><dt className="text-gray-500">Services</dt><dd className="text-right max-w-[200px] truncate">{form.services}</dd></div>
                        <div className="flex justify-between"><dt className="text-gray-500">Extras</dt><dd>{[form.includesBlog && 'Blog', form.includesBooking && 'Booking'].filter(Boolean).join(', ') || 'None'}</dd></div>
                      </dl>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t">
              <button
                onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                {step > 1 ? 'Back' : 'Cancel'}
              </button>
              {step < 3 ? (
                <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleGenerate}>
                  <Zap className="h-4 w-4 mr-1" />
                  Generate Website
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
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
        setWebsites([
          {
            id: '1',
            name: "Smith's HVAC Services",
            domain: 'smithshvac.com',
            status: 'PUBLISHED',
            template: 'professional',
            createdAt: new Date().toISOString(),
            pages: [
              { id: 'p1', title: 'Home', slug: '/', status: 'PUBLISHED' },
              { id: 'p2', title: 'Services', slug: '/services', status: 'PUBLISHED' },
              { id: 'p3', title: 'About', slug: '/about', status: 'DRAFT' },
              { id: 'p4', title: 'Contact', slug: '/contact', status: 'PUBLISHED' },
            ],
          },
        ])
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
        topic: blogTopic,
        targetKeyword: blogTopic,
        wordCount: 800,
      })
      setBlogResult(result.content)
      setBlogTopic('')
    } catch {
      setBlogResult(`# ${blogTopic}\n\nYour AI-generated blog post will appear here. It will be optimized for search engines with the keyword "${blogTopic}" and tailored to your business and local market.\n\nThe post will include:\n- Engaging introduction that hooks readers\n- 4-5 detailed sections with practical tips\n- Local SEO optimization\n- Call to action to contact your business`)
    } finally {
      setGeneratingBlog(false)
    }
  }

  const seoGrade = analytics
    ? analytics.seoScore >= 80 ? 'A'
    : analytics.seoScore >= 60 ? 'B'
    : analytics.seoScore >= 40 ? 'C' : 'D'
  const seoColor = analytics?.seoScore ? (analytics.seoScore >= 80 ? 'text-green-600' : analytics.seoScore >= 60 ? 'text-amber-600' : 'text-red-600') : ''

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {showWizard && (
        <GenerateWizardModal
          onClose={() => setShowWizard(false)}
          onGenerated={site => { setWebsites(prev => [site, ...prev]); setShowWizard(false) }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Website Builder</h1>
          <p className="text-muted-foreground text-sm mt-0.5">AI-generated websites and SEO content</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowWizard(true)}>
            <Zap className="h-4 w-4" />
            AI Build Site
          </Button>
          <Button>
            <Plus className="h-4 w-4" />
            New Page
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'SEO Score', value: analytics ? `${analytics.seoScore}/100` : '--', extra: analytics ? `Grade ${seoGrade}` : '', icon: Search, color: seoColor || 'text-blue-600' },
          { label: 'Total Pages', value: analytics?.totalPages ?? '--', icon: FileText, color: 'text-purple-600' },
          { label: 'Published', value: analytics?.publishedPages ?? '--', icon: Globe, color: 'text-green-600' },
          { label: 'Blog Posts', value: analytics?.recentBlogPosts ?? '--', icon: BookOpen, color: 'text-orange-600' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <div className="flex items-baseline gap-1 mt-1">
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  {stat.extra && <span className="text-xs text-muted-foreground">{stat.extra}</span>}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Websites */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Websites
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
            ) : websites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <Globe className="h-8 w-8 text-muted-foreground/50 mb-3" />
                <p className="font-medium text-sm">No website yet</p>
                <p className="text-xs text-muted-foreground mt-1">Let AI build one in seconds.</p>
                <Button size="sm" className="mt-3" onClick={() => setShowWizard(true)}>
                  <Zap className="h-3 w-3 mr-1" />
                  AI Build Site
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {websites.map(site => (
                  <div key={site.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{site.name}</p>
                        {site.domain && (
                          <a href={`https://${site.domain}`} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-0.5 mt-0.5">
                            {site.domain} <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                      <Badge variant={(STATUS_COLORS[site.status] as never) ?? 'outline'} className="text-xs">
                        {site.status}
                      </Badge>
                    </div>

                    {/* Pages */}
                    <div className="grid grid-cols-2 gap-1">
                      {site.pages.map(page => (
                        <div key={page.id} className="flex items-center justify-between rounded bg-muted/50 px-2 py-1">
                          <span className="text-xs font-medium">{page.title}</span>
                          <span className={`text-[10px] font-medium ${page.status === 'PUBLISHED' ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {page.status === 'PUBLISHED' ? 'Live' : 'Draft'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Blog Generator */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-kanavu-600" />
              AI Blog Generator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Generate SEO-optimized blog posts to attract local customers and rank higher on Google.</p>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. 'How to know when to replace your AC unit'"
                value={blogTopic}
                onChange={e => setBlogTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerateBlog()}
              />
              <Button onClick={handleGenerateBlog} disabled={generatingBlog || !blogTopic.trim() || !websites[0]}>
                {generatingBlog ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              </Button>
            </div>
            {blogResult ? (
              <div className="max-h-64 overflow-y-auto rounded-lg bg-muted/50 border p-3 text-xs text-muted-foreground whitespace-pre-wrap">
                {blogResult}
              </div>
            ) : (
              <div className="space-y-1.5">
                {['5 Signs Your HVAC Needs Servicing', 'Winter Prep: HVAC Checklist for Homeowners', 'Energy-Saving Tips for Summer AC Use'].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => setBlogTopic(suggestion)}
                    className="w-full text-left rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  >
                    <BookOpen className="h-3 w-3 inline mr-1.5 text-muted-foreground/70" />
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
