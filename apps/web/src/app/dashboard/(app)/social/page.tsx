'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api-client'
import toast from 'react-hot-toast'

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

const STATUS_STYLES: Record<string, string> = {
  published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
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
    } catch {
      toast.error('Could not generate connection URL. Check that OAuth credentials are configured.')
    }
  }

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Disconnect this account?')) return
    try {
      await api.post(`/social/accounts/${accountId}/disconnect`)
      toast.success('Account disconnected')
      await load()
    } catch {
      toast.error('Failed to disconnect')
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const data = await api.post<{ content: string }>('/social/posts/generate', aiForm)
      setGeneratedContent(data.content)
    } catch {
      toast.error('AI generation failed')
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
      toast.success('Post created!')
      setShowCreateModal(false)
      setNewPost({ accountId: '', content: '', scheduledAt: '' })
      await load()
    } catch {
      toast.error('Failed to create post')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePublish = async (postId: string) => {
    try {
      await api.post(`/social/posts/${postId}/publish`)
      toast.success('Post published!')
      await load()
    } catch {
      toast.error('Failed to publish')
    }
  }

  const handleDelete = async (postId: string) => {
    if (!confirm('Delete this post?')) return
    try {
      await api.delete(`/social/posts/${postId}`)
      toast.success('Post deleted')
      await load()
    } catch {
      toast.error('Failed to delete')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Social Media</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage and schedule posts across platforms</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAiModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 text-sm font-medium"
          >
            ✨ AI Generate
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            + New Post
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Posts', value: stats.totalPosts, icon: '📝' },
            { label: 'Published', value: stats.publishedPosts, icon: '✅' },
            { label: 'Scheduled', value: stats.scheduledPosts, icon: '🕐' },
            { label: 'Failed', value: stats.failedPosts, icon: '❌' },
          ].map(stat => (
            <div key={stat.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-5 w-fit">
        {(['posts', 'accounts'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Posts tab */}
      {activeTab === 'posts' && (
        <div className="space-y-3">
          {posts.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">📲</div>
              <p className="font-medium">No posts yet</p>
              <p className="text-sm">Create your first post to get started</p>
            </div>
          ) : posts.map(post => (
            <div key={post.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-sm">{PLATFORM_ICONS[post.socialAccount.platform]}</span>
                    <span className="text-sm text-gray-500">{post.socialAccount.accountName}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[post.status]}`}>
                      {post.status}
                    </span>
                    {post.aiGenerated && (
                      <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-xs font-medium">
                        AI
                      </span>
                    )}
                  </div>
                  <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed line-clamp-3">{post.content}</p>
                  <div className="text-xs text-gray-400 mt-2">
                    {post.publishedAt && `Published ${new Date(post.publishedAt).toLocaleDateString()}`}
                    {post.scheduledAt && `Scheduled for ${new Date(post.scheduledAt).toLocaleDateString()} at ${new Date(post.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                    {!post.publishedAt && !post.scheduledAt && 'Draft'}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {post.status === 'draft' && (
                    <button
                      onClick={() => handlePublish(post.id)}
                      className="px-3 py-1.5 text-xs border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20"
                    >
                      Publish
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="px-3 py-1.5 text-xs border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Accounts tab */}
      {activeTab === 'accounts' && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {accounts.map(account => (
              <div key={account.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{PLATFORM_ICONS[account.platform]}</span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white text-sm">{account.accountName}</div>
                    <div className="text-xs text-gray-500 capitalize">{account.platform.toLowerCase()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <button
                    onClick={() => handleDisconnect(account.id)}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Connect a platform</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['facebook', 'instagram', 'twitter', 'linkedin'] as const).map(platform => (
                <button
                  key={platform}
                  onClick={() => handleConnect(platform)}
                  className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                >
                  <span className="text-2xl">{PLATFORM_ICONS[platform.toUpperCase()]}</span>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">{platform}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create Post</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account</label>
              <select
                value={newPost.accountId}
                onChange={e => setNewPost(p => ({ ...p, accountId: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select account...</option>
                {accounts.filter(a => a.isActive).map(a => (
                  <option key={a.id} value={a.id}>{PLATFORM_ICONS[a.platform]} {a.accountName}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
              <textarea
                rows={5}
                value={newPost.content}
                onChange={e => setNewPost(p => ({ ...p, content: e.target.value }))}
                placeholder="What would you like to share?"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="text-xs text-gray-400 mt-1 text-right">{newPost.content.length} chars</div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Schedule (optional)</label>
              <input
                type="datetime-local"
                value={newPost.scheduledAt}
                onChange={e => setNewPost(p => ({ ...p, scheduledAt: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Leave empty to post immediately</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePost}
                disabled={submitting || !newPost.accountId || !newPost.content}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
              >
                {submitting ? 'Posting...' : newPost.scheduledAt ? 'Schedule' : 'Post Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Generate Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">✨ AI Post Generator</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Platform</label>
                <select
                  value={aiForm.platform}
                  onChange={e => setAiForm(f => ({ ...f, platform: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {['facebook', 'instagram', 'twitter', 'linkedin'].map(p => (
                    <option key={p} value={p}>{PLATFORM_ICONS[p.toUpperCase()]} {p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tone</label>
                <select
                  value={aiForm.tone}
                  onChange={e => setAiForm(f => ({ ...f, tone: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {['professional', 'casual', 'friendly', 'bold', 'inspirational'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">What to post about</label>
              <textarea
                rows={3}
                value={aiForm.topic}
                onChange={e => setAiForm(f => ({ ...f, topic: e.target.value }))}
                placeholder="E.g. our summer sale, new team member, customer success story..."
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={aiForm.includeHashtags}
                onChange={e => setAiForm(f => ({ ...f, includeHashtags: e.target.checked }))}
                className="rounded"
              />
              Include hashtags
            </label>

            {generatedContent && (
              <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
                <div className="text-xs font-medium text-purple-700 dark:text-purple-400 mb-2">Generated content</div>
                <p className="text-sm text-gray-800 dark:text-gray-200">{generatedContent}</p>
                <button
                  onClick={handleUseGenerated}
                  className="mt-3 text-xs text-purple-600 dark:text-purple-400 hover:underline font-medium"
                >
                  Use this content →
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowAiModal(false); setGeneratedContent('') }}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating || !aiForm.topic}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg font-medium"
              >
                {generating ? 'Generating...' : generatedContent ? 'Regenerate' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
