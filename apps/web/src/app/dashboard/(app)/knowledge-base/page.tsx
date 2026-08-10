'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Plus, Search, Sparkles, Tag, Trash2, X } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'

interface KBItem {
  id: string
  title: string
  category?: string
  tags: string[]
  version: number
  updatedAt: string
}

interface KBDetail extends KBItem {
  content: string
  summary?: string
}

export default function KnowledgeBasePage() {
  const [items, setItems] = useState<KBItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selected, setSelected] = useState<KBDetail | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', category: '', tags: '' })
  const [saving, setSaving] = useState(false)
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState('')
  const [asking, setAsking] = useState(false)

  const load = async (q?: string, cat?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('search', q)
      if (cat) params.set('category', cat)
      const [itemsRes, catsRes] = await Promise.all([
        apiClient.get(`/knowledge-base?${params}`) as any,
        apiClient.get('/knowledge-base/categories') as any,
      ])
      setItems(itemsRes.items ?? [])
      setCategories(catsRes.categories ?? [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load(search, categoryFilter) }, [search, categoryFilter])

  const selectItem = async (id: string) => {
    try {
      const res = await apiClient.get(`/knowledge-base/${id}`) as any
      setSelected(res.item)
    } catch {}
  }

  const create = async () => {
    setSaving(true)
    try {
      await apiClient.post('/knowledge-base', {
        title: form.title,
        content: form.content,
        category: form.category || undefined,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      })
      setShowForm(false)
      setForm({ title: '', content: '', category: '', tags: '' })
      load(search, categoryFilter)
    } catch {}
    setSaving(false)
  }

  const deleteItem = async (id: string) => {
    try {
      await apiClient.delete(`/knowledge-base/${id}`)
      if (selected?.id === id) setSelected(null)
      load(search, categoryFilter)
    } catch {}
  }

  const askAi = async () => {
    if (!aiQuestion.trim()) return
    setAsking(true)
    setAiAnswer('')
    try {
      const res = await apiClient.post('/knowledge-base/ask', { question: aiQuestion }) as any
      setAiAnswer(res.answer ?? '')
    } catch { setAiAnswer('Failed to get answer.') }
    setAsking(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Knowledge Base</h1>
          <p className="text-sm text-muted-foreground mt-1">Store and search your business knowledge — ask AI questions</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }}
        >
          <Plus className="h-4 w-4" />
          Add Article
        </button>
      </div>

      {/* AI Q&A */}
      <div className="rounded-xl border p-5" style={{ background: 'linear-gradient(to right, rgba(168,85,247,0.05), rgba(99,102,241,0.05))' }}>
        <h2 className="font-semibold text-foreground flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4" style={{ color: '#a78bfa' }} />
          Ask Your Knowledge Base
        </h2>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            placeholder="Ask anything about your business..."
            value={aiQuestion}
            onChange={e => setAiQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && askAi()}
          />
          <button
            onClick={askAi}
            disabled={asking || !aiQuestion.trim()}
            className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)', color: 'white' }}
          >
            {asking ? 'Thinking...' : 'Ask'}
          </button>
        </div>
        {aiAnswer && (
          <div className="mt-3 rounded-lg p-4 text-sm text-muted-foreground whitespace-pre-wrap" style={{ background: 'hsl(var(--card))', border: '1px solid rgba(167,139,250,0.2)' }}>
            {aiAnswer}
          </div>
        )}
      </div>

      {showForm && (
        <div className="rounded-xl border p-6 space-y-4" style={{ background: 'hsl(var(--card))' }}>
          <h2 className="font-semibold text-foreground">New Article</h2>
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
              <label className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
              <input
                className="w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                placeholder="e.g. FAQ, Policies"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Content</label>
              <textarea
                rows={5}
                className="w-full rounded-lg px-3 py-2 text-sm resize-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Tags (comma-separated)</label>
              <input
                className="w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                placeholder="pricing, services, faq"
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={create}
              disabled={saving || !form.title || !form.content}
              className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }}
            >
              {saving ? 'Saving...' : 'Save Article'}
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

      <div className="flex h-[calc(100vh-28rem)] gap-4">
        {/* List */}
        <div className="w-72 flex flex-col rounded-xl border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                className="w-full rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                placeholder="Search articles..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setCategoryFilter('')}
                  className="rounded-full px-2 py-0.5 text-xs"
                  style={!categoryFilter ? { background: 'rgba(6,182,212,0.1)', color: '#06b6d4' } : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
                >
                  All
                </button>
                {categories.map(c => (
                  <button
                    key={c}
                    onClick={() => setCategoryFilter(c === categoryFilter ? '' : c)}
                    className="rounded-full px-2 py-0.5 text-xs"
                    style={c === categoryFilter ? { background: 'rgba(6,182,212,0.1)', color: '#06b6d4' } : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto divide-y">
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
            ) : items.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No articles found</div>
            ) : items.map(item => (
              <button
                key={item.id}
                onClick={() => selectItem(item.id)}
                className="w-full text-left px-4 py-3 transition-colors"
                style={selected?.id === item.id ? { background: 'rgba(6,182,212,0.1)' } : {}}
              >
                <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {item.category && <span className="text-xs" style={{ color: '#06b6d4' }}>{item.category}</span>}
                  <span className="text-xs text-muted-foreground">v{item.version}</span>
                </div>
                {item.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.tags.slice(0, 3).map(t => (
                      <span key={t} className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px]" style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}>
                        <Tag className="h-2.5 w-2.5" />
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="flex-1 rounded-xl border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
          {!selected ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Select an article to read</p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="p-5 border-b flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{selected.title}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    {selected.category && <span className="text-xs font-medium" style={{ color: '#06b6d4' }}>{selected.category}</span>}
                    <span className="text-xs text-muted-foreground">Version {selected.version}</span>
                    <span className="text-xs text-muted-foreground">{new Date(selected.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => deleteItem(selected.id)} className="text-muted-foreground/40 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => setSelected(null)} className="text-muted-foreground/40 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {selected.summary && (
                <div className="mx-5 mt-4 rounded-lg p-3" style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}>
                  <p className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: '#a78bfa' }}>
                    <Sparkles className="h-3 w-3" />AI Summary
                  </p>
                  <p className="text-sm" style={{ color: '#a78bfa' }}>{selected.summary}</p>
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-5">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{selected.content}</p>
              </div>
              {selected.tags?.length > 0 && (
                <div className="px-5 py-3 border-t flex flex-wrap gap-1.5">
                  {selected.tags.map(t => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs" style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}>
                      <Tag className="h-3 w-3" />
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
