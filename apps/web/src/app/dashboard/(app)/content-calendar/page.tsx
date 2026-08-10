'use client'

import { useState, useEffect } from 'react'
import { CalendarDays, Plus, Sparkles, Trash2, Instagram, Twitter, Linkedin, Facebook } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'

interface ContentPost {
  id: string
  title: string
  body: string
  aiDraft?: string
  platform: string
  status: string
  scheduledAt?: string
  hashtags: string[]
}

const platformIcon: Record<string, any> = {
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  facebook: Facebook,
}

const platformStyle: Record<string, { color: string; background: string }> = {
  instagram: { color: '#db2777', background: 'rgba(219,39,119,0.1)' },
  twitter: { color: '#0284c7', background: 'rgba(2,132,199,0.1)' },
  linkedin: { color: '#06b6d4', background: 'rgba(6,182,212,0.1)' },
  facebook: { color: '#06b6d4', background: 'rgba(6,182,212,0.1)' },
}

export default function ContentCalendarPage() {
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [weekTopic, setWeekTopic] = useState('')
  const [generatingWeek, setGeneratingWeek] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', platform: 'instagram', scheduledAt: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get('/content-calendar') as any
      setPosts(res.posts ?? [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const create = async () => {
    setSaving(true)
    try {
      await apiClient.post('/content-calendar', form)
      setShowForm(false)
      setForm({ title: '', body: '', platform: 'instagram', scheduledAt: '' })
      load()
    } catch {}
    setSaving(false)
  }

  const generateWeek = async () => {
    if (!weekTopic.trim()) return
    setGeneratingWeek(true)
    try {
      const res = await apiClient.post('/content-calendar/generate-week', { topic: weekTopic }) as any
      if (res.plan?.posts?.length) {
        await apiClient.post('/content-calendar/bulk', { posts: res.plan.posts })
        load()
        setWeekTopic('')
      }
    } catch {}
    setGeneratingWeek(false)
  }

  const generateDraft = async (id: string) => {
    try {
      const res = await apiClient.post(`/content-calendar/${id}/generate-draft`, {}) as any
      setPosts(prev => prev.map(p => p.id === id ? { ...p, aiDraft: res.post?.aiDraft } : p))
    } catch {}
  }

  const deletePost = async (id: string) => {
    try {
      await apiClient.delete(`/content-calendar/${id}`)
      setPosts(prev => prev.filter(p => p.id !== id))
    } catch {}
  }

  const statusStyle: Record<string, { color: string; background: string }> = {
    DRAFT: { color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--muted))' },
    SCHEDULED: { color: '#06b6d4', background: 'rgba(6,182,212,0.1)' },
    PUBLISHED: { color: '#34d399', background: 'rgba(52,211,153,0.1)' },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Content Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">Plan and generate social media content with AI</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }}
        >
          <Plus className="h-4 w-4" />
          New Post
        </button>
      </div>

      {/* AI Week Generator */}
      <div className="rounded-xl border p-5" style={{ background: 'linear-gradient(to right, rgba(168,85,247,0.05), rgba(6,182,212,0.05))' }}>
        <h2 className="font-semibold text-foreground flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4" style={{ color: '#a78bfa' }} />
          Generate a Week of Content
        </h2>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            placeholder="Topic or business focus (e.g. 'summer promotions for a spa')"
            value={weekTopic}
            onChange={e => setWeekTopic(e.target.value)}
          />
          <button
            onClick={generateWeek}
            disabled={generatingWeek || !weekTopic.trim()}
            className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)', color: 'white' }}
          >
            {generatingWeek ? 'Generating...' : 'Generate Week'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border p-6 space-y-4" style={{ background: 'hsl(var(--card))' }}>
          <h2 className="font-semibold text-foreground">New Post</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Title</label>
              <input
                className="w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Platform</label>
              <select
                className="w-full rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                value={form.platform}
                onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
              >
                {['instagram', 'twitter', 'linkedin', 'facebook'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Body</label>
              <textarea
                rows={3}
                className="w-full rounded-lg px-3 py-2 text-sm resize-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Schedule At</label>
              <input
                type="datetime-local"
                className="w-full rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                value={form.scheduledAt}
                onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={create}
              disabled={saving}
              className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }}
            >
              {saving ? 'Saving...' : 'Create Post'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border px-4 py-2 text-sm font-medium text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-muted-foreground">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-muted-foreground">No posts yet. Create one or generate a week of content.</div>
        ) : posts.map(post => {
          const PlatIcon = platformIcon[post.platform] ?? CalendarDays
          const pStyle = platformStyle[post.platform] ?? { color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--muted))' }
          const sStyle = statusStyle[post.status] ?? { color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--muted))' }
          return (
            <div key={post.id} className="rounded-xl border p-4 flex flex-col gap-3" style={{ background: 'hsl(var(--card))' }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium" style={pStyle}>
                    <PlatIcon className="h-3 w-3" />
                    {post.platform}
                  </span>
                  <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={sStyle}>
                    {post.status}
                  </span>
                </div>
                <button onClick={() => deletePost(post.id)} className="text-muted-foreground/40 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">{post.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{post.aiDraft ?? post.body}</p>
              </div>
              {post.hashtags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {post.hashtags.slice(0, 4).map(h => (
                    <span key={h} className="text-xs" style={{ color: '#06b6d4' }}>#{h}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between mt-auto pt-2 border-t">
                <span className="text-xs text-muted-foreground">
                  {post.scheduledAt ? new Date(post.scheduledAt).toLocaleDateString() : 'Unscheduled'}
                </span>
                {!post.aiDraft && (
                  <button onClick={() => generateDraft(post.id)} className="flex items-center gap-1 text-xs font-medium" style={{ color: '#a78bfa' }}>
                    <Sparkles className="h-3 w-3" />
                    AI Draft
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
