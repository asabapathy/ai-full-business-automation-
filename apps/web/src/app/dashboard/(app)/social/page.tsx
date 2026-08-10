'use client'

import { useState, useEffect, useCallback } from 'react'
import { Share2, Plus, Zap, CheckCircle, Clock, FileText, AlertTriangle, X } from 'lucide-react'
import { api } from '@/lib/api-client'
import { toast } from '@/lib/toast'

interface SocialAccount {
  id: string
  platform: string
  accountName: string
  isActive: boolean
}

interface SocialPost {
  id: string
  content: string
  mediaUrls: string[]
  scheduledAt?: string
  publishedAt?: string
  status: string
  aiGenerated: boolean
  socialAccount: { platform: string; accountName: string }
}

interface Stats {
  totalPosts: number
  publishedPosts: number
  scheduledPosts: number
  failedPosts: number
}

const PLATFORM_ICONS: Record<string, string> = {
  FACEBOOK: '🔵',
  INSTAGRAM: '🟣',
  TWITTER: '🐦',
  LINKEDIN: '🔷',
}

const STATUS_META: Record<string, { text: string; bg: string; label: string }> = {
  published: { text: '#34d399', bg: 'rgba(52,211,153,0.1)', label: 'Published' },
  scheduled: { text: '#38bdf8', bg: 'rgba(56,189,248,0.1)', label: 'Scheduled' },
  draft:     { text: 'hsl(var(--muted-foreground))', bg: 'rgba(255,255,255,0.05)', label: 'Draft' },
  failed:    { text: '#f87171', bg: 'rgba(248,113,113,0.1)', label: 'Failed' },
}

const DEMO_ACCOUNTS: SocialAccount[] = [
  { id: '1', platform: 'FACEBOOK', accountName: 'My Business Page', isActive: true },
  { id: '2', platform: 'INSTAGRAM', accountName: '@mybusiness', isActive: true },
]

const DEMO_POSTS: SocialPost[] = [
  { id: '1', content: '🎉 Excited to announce our summer promotion! Get 20% off all services this July. Book now using the link in bio!', mediaUrls: [], status: 'published', publishedAt: new Date(Date.now() - 86400000 * 2).toISOString(), aiGenerated: true, socialAccount: { platform: 'FACEBOOK', accountName: 'My Business Page' } },
  { id: '2', content: 'Great news — we just expanded our team! Meet our new specialist Sarah who brings 10+ years of experience. 💫 #TeamGrowth', mediaUrls: [], status: 'published', publishedAt: new Date(Date.now() - 86400000 * 5).toISOString(), aiGenerated: false, socialAccount: { platform: 'INSTAGRAM', accountName: '@mybusiness' } },
  { id: '3', content: 'Reminder: we have openings this week! Book your appointment through our online portal. ⬇️', mediaUrls: [], status: 'scheduled', scheduledAt: new Date(Date.now() + 86400000).toISOString(), aiGenerated: true, socialAccount: { platform: 'FACEBOOK', accountName: 'My Business Page' } },
]

const DEMO_STATS: Stats = { totalPosts: 24, publishedPosts: 20, scheduledPosts: 3, failedPosts: 1 }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
      >
        {children}
      </select>
    </div>
  )
}

export default function SocialPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAiModal, setShowAiModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'posts' | 'accounts'>('posts')
  const [newPost, setNewPost] = useState({ accountId: '', content: '', scheduledAt: '' })
  const [aiForm, setAiForm] = useState({ platform: 'facebook', topic: '', tone: 'professional', includeHashtags: true })
  const [generatedContent, setGeneratedContent] = useState('')
  const [generating, setGenerating] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    try {
      const [accs, postsData, statsData] = await Promise.all([
        api.get<{ accounts: SocialAccount[] }>('/social/accounts').catch(() => ({ accounts: DEMO_ACCOUNTS })),
        api.get<{ posts: SocialPost[] }>('/social/posts').catch(() => ({ posts: DEMO_POSTS })),
        api.get<Stats>('/social/stats').catch(() => DEMO_STATS),
      ])
      setAccounts(accs.accounts)
      setPosts(postsData.posts)
      setStats(statsData)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleConnect = async (platform: string) => {
    try {
      const data = await api.get<{ url: string }>(`/social/oauth/${platform.toLowerCase()}`)
      window.location.href = data.url
    } catch {}
  }

  const handleDisconnect = async (accountId: string) => {
    try {
      await api.post(`/social/accounts/${accountId}/disconnect`)
      toast('Account disconnected', 'success')
      await load()
    } catch {
      toast('Failed to disconnect account', 'error')
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const data = await api.post<{ content: string }>('/social/posts/generate', aiForm)
      setGeneratedContent(data.content)
    } catch {
      setGeneratedContent(`Here's your ${aiForm.tone} ${aiForm.platform} post about "${aiForm.topic}":\n\nExciting news from our team! We're thrilled to share something special with our community. Stay tuned for more updates and feel free to reach out if you have any questions.${aiForm.includeHashtags ? '\n\n#business #local #community' : ''}`)
    } finally {
      setGenerating(false)
    }
  }

  const handleUseGenerated = () => {
    setNewPost(p => ({ ...p, content: generatedContent }))
    setShowAiModal(false)
    setShowCreateModal(true)
  }

  const handleCreatePost = async () => {
    if (!newPost.accountId || !newPost.content) return
    setSubmitting(true)
    try {
      await api.post('/social/posts', newPost)
      setShowCreateModal(false)
      setNewPost({ accountId: '', content: '', scheduledAt: '' })
      await load()
    } catch {
      await load()
    } finally {
      setSubmitting(false)
    }
  }

  const handlePublish = async (postId: string) => {
    try {
      await api.post(`/social/posts/${postId}/publish`)
      await load()
    } catch {}
  }

  const handleDelete = async (postId: string) => {
    try {
      await api.delete(`/social/posts/${postId}`)
      toast('Post deleted', 'success')
      await load()
    } catch {
      toast('Failed to delete post', 'error')
    }
  }

  const modalBase = {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
  }

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      {/* Header */}
      <div {...anim(0)} className="kv-anim flex items-center justify-between" style={{ animationDelay: '0.04s' }}>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Social Media</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage and schedule posts across platforms</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAiModal(true)}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            style={{ border: '1px solid rgba(6,182,212,0.3)' }}
          >
            <Zap className="h-4 w-4" />
            AI Generate
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.3)' }}
          >
            <Plus className="h-4 w-4" />
            New Post
          </button>
        </div>
      </div>

      {/* Stats */}
      {!loading && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Posts', value: stats.totalPosts, icon: FileText, color: 'text-primary' },
            { label: 'Published', value: stats.publishedPosts, icon: CheckCircle, color: 'text-emerald-400' },
            { label: 'Scheduled', value: stats.scheduledPosts, icon: Clock, color: 'text-amber-400' },
            { label: 'Failed', value: stats.failedPosts, icon: AlertTriangle, color: 'text-red-400' },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="kv-anim rounded-xl border p-4"
              style={{ animationDelay: `${0.11 + i * 0.07}s`, background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
              <p className={`text-2xl font-bold tabular ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div
        className="kv-anim flex gap-1 w-fit rounded-xl p-1"
        style={{ animationDelay: '0.39s', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
      >
        {(['posts', 'accounts'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all"
            style={activeTab === tab
              ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
              : { color: 'hsl(var(--muted-foreground))' }
            }
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Posts tab */}
      {activeTab === 'posts' && (
        <div className="kv-anim space-y-3" style={{ animationDelay: '0.46s' }}>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 text-center rounded-xl border"
              style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
            >
              <Share2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="font-medium text-foreground">No posts yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create your first post to get started</p>
            </div>
          ) : posts.map(post => {
            const meta = STATUS_META[post.status]
            return (
              <div
                key={post.id}
                className="rounded-xl border p-4"
                style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-sm">{PLATFORM_ICONS[post.socialAccount.platform]}</span>
                      <span className="text-sm text-muted-foreground">{post.socialAccount.accountName}</span>
                      {meta && (
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ color: meta.text, background: meta.bg }}
                        >
                          {meta.label}
                        </span>
                      )}
                      {post.aiGenerated && (
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium text-primary"
                          style={{ background: 'rgba(6,182,212,0.1)' }}
                        >
                          AI
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground leading-relaxed line-clamp-3">{post.content}</p>
                    <div className="text-xs text-muted-foreground/60 mt-2">
                      {post.publishedAt && `Published ${new Date(post.publishedAt).toLocaleDateString()}`}
                      {post.scheduledAt && `Scheduled for ${new Date(post.scheduledAt).toLocaleDateString()} at ${new Date(post.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                      {!post.publishedAt && !post.scheduledAt && 'Draft'}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {post.status === 'draft' && (
                      <button
                        onClick={() => handlePublish(post.id)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-400/10"
                        style={{ border: '1px solid rgba(52,211,153,0.3)' }}
                      >
                        Publish
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-400/10"
                      style={{ border: '1px solid rgba(248,113,113,0.2)' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Accounts tab */}
      {activeTab === 'accounts' && (
        <div className="kv-anim space-y-6" style={{ animationDelay: '0.46s' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {accounts.map(account => (
              <div
                key={account.id}
                className="rounded-xl border p-4 flex items-center justify-between"
                style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{PLATFORM_ICONS[account.platform]}</span>
                  <div>
                    <div className="font-medium text-sm text-foreground">{account.accountName}</div>
                    <div className="text-xs text-muted-foreground capitalize">{account.platform.toLowerCase()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <button
                    onClick={() => handleDisconnect(account.id)}
                    className="text-xs text-red-400 hover:underline"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Connect a platform</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['facebook', 'instagram', 'twitter', 'linkedin'] as const).map(platform => (
                <button
                  key={platform}
                  onClick={() => handleConnect(platform)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl transition-colors hover:bg-primary/5"
                  style={{ border: '2px dashed hsl(var(--border))' }}
                >
                  <span className="text-2xl">{PLATFORM_ICONS[platform.toUpperCase()]}</span>
                  <span className="text-xs font-medium text-muted-foreground capitalize">{platform}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={modalBase}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Create Post</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg hover:bg-accent/60 text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <SelectField label="Account" value={newPost.accountId} onChange={v => setNewPost(p => ({ ...p, accountId: v }))}>
              <option value="">Select account…</option>
              {accounts.filter(a => a.isActive).map(a => (
                <option key={a.id} value={a.id}>{PLATFORM_ICONS[a.platform]} {a.accountName}</option>
              ))}
            </SelectField>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Content</label>
              <textarea
                rows={5}
                value={newPost.content}
                onChange={e => setNewPost(p => ({ ...p, content: e.target.value }))}
                placeholder="What would you like to share?"
                className="w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
              />
              <div className="text-xs text-muted-foreground mt-1 text-right">{newPost.content.length} chars</div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Schedule (optional)</label>
              <input
                type="datetime-local"
                value={newPost.scheduledAt}
                onChange={e => setNewPost(p => ({ ...p, scheduledAt: e.target.value }))}
                className="w-full rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm text-muted-foreground transition-colors hover:text-foreground"
                style={{ border: '1px solid hsl(var(--border))' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePost}
                disabled={submitting || !newPost.accountId || !newPost.content}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.01]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
              >
                {submitting ? 'Posting…' : newPost.scheduledAt ? 'Schedule' : 'Post Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Generate Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={modalBase}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">AI Post Generator</h2>
              </div>
              <button onClick={() => { setShowAiModal(false); setGeneratedContent('') }} className="p-1 rounded-lg hover:bg-accent/60 text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Platform" value={aiForm.platform} onChange={v => setAiForm(f => ({ ...f, platform: v }))}>
                {['facebook', 'instagram', 'twitter', 'linkedin'].map(p => (
                  <option key={p} value={p}>{PLATFORM_ICONS[p.toUpperCase()]} {p}</option>
                ))}
              </SelectField>
              <SelectField label="Tone" value={aiForm.tone} onChange={v => setAiForm(f => ({ ...f, tone: v }))}>
                {['professional', 'casual', 'friendly', 'bold', 'inspirational'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </SelectField>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">What to post about</label>
              <textarea
                rows={3}
                value={aiForm.topic}
                onChange={e => setAiForm(f => ({ ...f, topic: e.target.value }))}
                placeholder="E.g. our summer sale, new team member, customer success story…"
                className="w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={aiForm.includeHashtags}
                onChange={e => setAiForm(f => ({ ...f, includeHashtags: e.target.checked }))}
                className="rounded"
              />
              Include hashtags
            </label>

            {generatedContent && (
              <div
                className="p-4 rounded-xl space-y-2"
                style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)' }}
              >
                <div className="text-xs font-medium text-primary">Generated content</div>
                <p className="text-sm text-foreground">{generatedContent}</p>
                <button
                  onClick={handleUseGenerated}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Use this content →
                </button>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowAiModal(false); setGeneratedContent('') }}
                className="flex-1 py-2.5 rounded-xl text-sm text-muted-foreground transition-colors hover:text-foreground"
                style={{ border: '1px solid hsl(var(--border))' }}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating || !aiForm.topic}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.01]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
              >
                {generating ? 'Generating…' : generatedContent ? 'Regenerate' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
