'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Plus, Search, Sparkles, Tag, Trash2, ChevronRight, X } from 'lucide-react'
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
          <h1 className="text-2xl font-bold text-gray-900">AI Knowledge Base</h1>
          <p className="text-sm text-gray-500 mt-1">Store and search your business knowledge — ask AI questions</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Add Article
        </button>
      </div>

      {/* AI Q&A */}
      <div className="rounded-xl border bg-gradient-to-r from-purple-50 to-indigo-50 p-5">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-purple-600" />
          Ask Your Knowledge Base
        </h2>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            placeholder="Ask anything about your business..."
            value={aiQuestion}
            onChange={e => setAiQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && askAi()}
          />
          <button onClick={askAi} disabled={asking || !aiQuestion.trim()} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
            {asking ? 'Thinking...' : 'Ask'}
          </button>
        </div>
        {aiAnswer && (
          <div className="mt-3 rounded-lg bg-white border border-purple-100 p-4 text-sm text-gray-700 whitespace-pre-wrap">
            {aiAnswer}
          </div>
        )}
      </div>

      {showForm && (
        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-900">New Article</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="e.g. FAQ, Policies" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Content</label>
              <textarea rows={5} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="pricing, services, faq" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={create} disabled={saving || !form.title || !form.content} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Article'}
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex h-[calc(100vh-28rem)] gap-4">
        {/* List */}
        <div className="w-72 flex flex-col rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <input
                className="w-full rounded-lg border border-gray-200 pl-8 pr-3 py-2 text-sm"
                placeholder="Search articles..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <button onClick={() => setCategoryFilter('')} className={`rounded-full px-2 py-0.5 text-xs ${!categoryFilter ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>All</button>
                {categories.map(c => (
                  <button key={c} onClick={() => setCategoryFilter(c === categoryFilter ? '' : c)} className={`rounded-full px-2 py-0.5 text-xs ${c === categoryFilter ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{c}</button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto divide-y">
            {loading ? (
              <div className="p-4 text-center text-sm text-gray-400">Loading...</div>
            ) : items.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-400">No articles found</div>
            ) : items.map(item => (
              <button key={item.id} onClick={() => selectItem(item.id)} className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selected?.id === item.id ? 'bg-blue-50' : ''}`}>
                <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {item.category && <span className="text-xs text-blue-600">{item.category}</span>}
                  <span className="text-xs text-gray-400">v{item.version}</span>
                </div>
                {item.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.tags.slice(0, 3).map(t => (
                      <span key={t} className="inline-flex items-center gap-0.5 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
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
        <div className="flex-1 rounded-xl border bg-white shadow-sm overflow-hidden">
          {!selected ? (
            <div className="flex h-full items-center justify-center text-gray-400">
              <div className="text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Select an article to read</p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="p-5 border-b flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selected.title}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    {selected.category && <span className="text-xs text-blue-600 font-medium">{selected.category}</span>}
                    <span className="text-xs text-gray-400">Version {selected.version}</span>
                    <span className="text-xs text-gray-400">{new Date(selected.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => deleteItem(selected.id)} className="text-gray-300 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => setSelected(null)} className="text-gray-300 hover:text-gray-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {selected.summary && (
                <div className="mx-5 mt-4 rounded-lg bg-purple-50 border border-purple-100 p-3">
                  <p className="text-xs font-medium text-purple-700 mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3" />AI Summary</p>
                  <p className="text-sm text-purple-800">{selected.summary}</p>
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-5">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selected.content}</p>
              </div>
              {selected.tags?.length > 0 && (
                <div className="px-5 py-3 border-t flex flex-wrap gap-1.5">
                  {selected.tags.map(t => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
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
