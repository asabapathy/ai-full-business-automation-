'use client'

import { useState, useEffect } from 'react'
import { Globe, Plus, Zap, FileText, ExternalLink, Search, BookOpen, BarChart2, RefreshCw } from 'lucide-react'
import { Button } from '../../../../../components/ui/button'
import { Input } from '../../../../../components/ui/input'
import { Badge } from '../../../../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/card'
import { Skeleton } from '../../../../../components/ui/skeleton'
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

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'secondary',
  PUBLISHED: 'success',
  ARCHIVED: 'outline',
}

export default function WebsitePage() {
  const [websites, setWebsites] = useState<Website[]>([])
  const [analytics, setAnalytics] = useState<SeoAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
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

  const handleGenerateSite = async () => {
    setGenerating(true)
    try {
      const result = await api.post<{ website: Website }>('/website/generate', {
        businessGoals: ['increase leads', 'showcase services'],
        targetAudience: 'local homeowners',
      })
      setWebsites(prev => [result.website, ...prev])
    } catch {
      // silently ignore in demo
    } finally {
      setGenerating(false)
    }
  }

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Website Builder</h1>
          <p className="text-muted-foreground text-sm mt-0.5">AI-generated websites and SEO content</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGenerateSite} disabled={generating}>
            {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {generating ? 'Building...' : 'AI Build Site'}
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
                <Button size="sm" className="mt-3" onClick={handleGenerateSite} disabled={generating}>
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
