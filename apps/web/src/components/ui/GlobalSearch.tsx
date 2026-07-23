'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface SearchResult {
  type: string
  id: string
  title: string
  subtitle?: string
  url: string
}

const TYPE_ICONS: Record<string, string> = {
  contact: '👤',
  deal: '💰',
  invoice: '📄',
  campaign: '📣',
}

const TYPE_COLORS: Record<string, string> = {
  contact: 'text-blue-400',
  deal: 'text-green-400',
  invoice: 'text-amber-400',
  campaign: 'text-purple-400',
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResults([])
    }
  }, [open])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.results ?? [])
    } catch {
      setResults([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => search(query), 250)
    return () => clearTimeout(t)
  }, [query, search])

  function navigate(url: string) {
    router.push(url)
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && results[selected]) navigate(results[selected]!.url)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white hover:border-white/20 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span>Search...</span>
        <kbd className="ml-2 text-xs bg-white/10 px-1.5 py-0.5 rounded">⌘K</kbd>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0) }}
            onKeyDown={onKeyDown}
            placeholder="Search contacts, deals, invoices..."
            className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm"
          />
          {loading && <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />}
          <kbd className="text-xs bg-white/10 text-gray-400 px-1.5 py-0.5 rounded">Esc</kbd>
        </div>

        {results.length > 0 && (
          <ul className="py-2 max-h-80 overflow-y-auto">
            {results.map((result, i) => (
              <li key={`${result.type}-${result.id}`}>
                <button
                  onClick={() => navigate(result.url)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === selected ? 'bg-purple-600/20' : 'hover:bg-white/5'}`}
                >
                  <span className="text-lg">{TYPE_ICONS[result.type] ?? '📌'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{result.title}</p>
                    {result.subtitle && <p className="text-xs text-gray-400 truncate">{result.subtitle}</p>}
                  </div>
                  <span className={`text-xs font-medium capitalize ${TYPE_COLORS[result.type] ?? 'text-gray-400'}`}>{result.type}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {query.length >= 2 && results.length === 0 && !loading && (
          <div className="px-4 py-8 text-center text-sm text-gray-500">No results for "{query}"</div>
        )}

        {query.length === 0 && (
          <div className="px-4 py-4">
            <p className="text-xs text-gray-500 mb-2">Quick actions</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Add Contact', url: '/dashboard/crm', icon: '👤' },
                { label: 'New Deal', url: '/dashboard/sales', icon: '💰' },
                { label: 'Create Invoice', url: '/dashboard/invoices', icon: '📄' },
                { label: 'Book Appointment', url: '/dashboard/appointments', icon: '📅' },
              ].map(action => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.url)}
                  className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-300 transition-colors"
                >
                  <span>{action.icon}</span>
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
