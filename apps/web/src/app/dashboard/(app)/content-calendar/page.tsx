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

const platformColor: Record<string, string> = {
  instagram: 'text-pink-600 bg-pink-50',
  twitter: 'text-sky-600 bg-sky-50',
  linkedin: 'text-blue-700 bg-blue-50',
  facebook: 'text-blue-600 bg-blue-50',
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

  const statusColor: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-600',
    SCHEDULED: 'bg-blue-100 text-blue-700',
    PUBLISHED: 'bg-green-100 text-green-700',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Content Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">Plan and generate social media content with AI</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          New Post
        </button>
      </div>

      {/* AI Week Generator */}
      <div className="rounded-xl border bg-gradient-to-r from-purple-50 to-blue-50 p-5">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-purple-600" />
          Generate a Week of Content
        </h2>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            placeholder="Topic or business focus (e.g. 'summer promotions for a spa')"
            value={weekTopic}
            onChange={e => setWeekTopic(e.target.value)}
          />
          <button
            onClick={generateWeek}
            disabled={generatingWeek || !weekTopic.trim()}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 whitespace-nowrap"
          >
            {generatingWeek ? 'Generating...' : 'Generate Week'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-900">New Post</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Platform</label>
              <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                {['instagram', 'twitter', 'linkedin', 'facebook'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Body</label>
              <textarea rows={3} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Schedule At</label>
              <input type="datetime-local" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={create} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Create Post'}
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-gray-400">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-gray-400">No posts yet. Create one or generate a week of content.</div>
        ) : posts.map(post => {
          const PlatIcon = platformIcon[post.platform] ?? CalendarDays
          return (
            <div key={post.id} className="rounded-xl border bg-white p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${platformColor[post.platform] ?? 'bg-gray-100 text-gray-600'}`}>
                    <PlatIcon className="h-3 w-3" />
                    {post.platform}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[post.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {post.status}
                  </span>
                </div>
                <button onClick={() => deletePost(post.id)} className="text-gray-300 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">{post.title}</p>
                <p className="text-xs text-gray-500 mt-1 line-clamp-3">{post.aiDraft ?? post.body}</p>
              </div>
              {post.hashtags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {post.hashtags.slice(0, 4).map(h => (
                    <span key={h} className="text-xs text-blue-600">#{h}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between mt-auto pt-2 border-t">
                <span className="text-xs text-gray-400">
                  {post.scheduledAt ? new Date(post.scheduledAt).toLocaleDateString() : 'Unscheduled'}
                </span>
                {!post.aiDraft && (
                  <button onClick={() => generateDraft(post.id)} className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium">
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
