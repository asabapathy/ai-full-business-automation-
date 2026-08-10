'use client'

import { useState, useEffect, useRef } from 'react'
import { apiClient } from '../../lib/api-client'
import { Search, Users, FileText, Megaphone, X, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

interface PaletteItem {
  id: string
  type: string
  title: string
  subtitle: string
  href: string
  icon?: React.ElementType
}

const QUICK_ACTIONS: PaletteItem[] = [
  { id: 'qa-contact', type: 'action', title: 'New Contact', subtitle: 'Add a contact to CRM', href: '/dashboard/crm', icon: Users },
  { id: 'qa-invoice', type: 'action', title: 'New Invoice', subtitle: 'Create an invoice', href: '/dashboard/invoices', icon: FileText },
  { id: 'qa-campaign', type: 'action', title: 'New Campaign', subtitle: 'Launch an email campaign', href: '/dashboard/campaigns', icon: Megaphone },
  { id: 'qa-reports', type: 'action', title: 'View Reports', subtitle: 'Analytics and insights', href: '/dashboard/reports', icon: ArrowRight },
]

const TYPE_ICONS: Record<string, React.ElementType> = {
  contact: Users,
  invoice: FileText,
  campaign: Megaphone,
  action: ArrowRight,
}

const TYPE_COLORS: Record<string, string> = {
  contact: '#06b6d4',
  invoice: '#a78bfa',
  campaign: '#34d399',
  action: '#fbbf24',
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PaletteItem[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Focus input and reset state when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [open])

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const [contactsRes, invoicesRes, campaignsRes] = await Promise.allSettled([
          apiClient.get<{ contacts: any[] }>('/contacts', { search: query, limit: 4 }),
          apiClient.get<{ invoices: any[] }>('/invoices', { search: query, limit: 4 }),
          apiClient.get<{ campaigns: any[] }>('/campaigns', { search: query, limit: 4 }),
        ])

        const items: PaletteItem[] = []

        if (contactsRes.status === 'fulfilled') {
          const contacts: any[] = (contactsRes.value as any)?.contacts ?? []
          contacts.forEach((c: any) => items.push({
            id: `contact-${c.id}`,
            type: 'contact',
            title: `${c.firstName ?? c.name ?? ''} ${c.lastName ?? ''}`.trim() || 'Contact',
            subtitle: c.email || c.phone || '',
            href: `/dashboard/crm/${c.id}`,
          }))
        }

        if (invoicesRes.status === 'fulfilled') {
          const invoices: any[] = (invoicesRes.value as any)?.invoices ?? []
          invoices.forEach((inv: any) => items.push({
            id: `invoice-${inv.id}`,
            type: 'invoice',
            title: inv.invoiceNumber ?? `Invoice ${inv.id}`,
            subtitle: `${inv.clientName ?? (inv.contact ? `${inv.contact.firstName ?? ''} ${inv.contact.lastName ?? ''}`.trim() : '')}${inv.total ? ` · $${Number(inv.total).toLocaleString()}` : ''}`,
            href: `/dashboard/invoices`,
          }))
        }

        if (campaignsRes.status === 'fulfilled') {
          const campaigns: any[] = (campaignsRes.value as any)?.campaigns ?? []
          campaigns.forEach((c: any) => items.push({
            id: `campaign-${c.id}`,
            type: 'campaign',
            title: c.name,
            subtitle: `${c.type ?? 'Email'} · ${c.status}`,
            href: `/dashboard/campaigns`,
          }))
        }

        setResults(items)
        setSelectedIndex(0)
      } catch {
        // silently fail — search is best-effort
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const items: PaletteItem[] = query.trim() ? results : QUICK_ACTIONS

  function navigate(href: string) {
    router.push(href)
    onClose()
  }

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, items.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
      }
      if (e.key === 'Enter' && items[selectedIndex]) {
        navigate(items[selectedIndex].href)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, items, selectedIndex])

  if (!open) return null

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh' }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 576,
          margin: '0 16px',
          borderRadius: 12,
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Input row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid hsl(var(--border))' }}>
          <Search style={{ color: 'hsl(var(--muted-foreground))', width: 18, height: 18, flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0) }}
            placeholder="Search contacts, invoices, campaigns…"
            style={{
              flex: 1,
              background: 'transparent',
              outline: 'none',
              border: 'none',
              color: 'hsl(var(--foreground))',
              fontSize: 14,
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{ color: 'hsl(var(--muted-foreground))', padding: 4, cursor: 'pointer', background: 'none', border: 'none', display: 'flex', alignItems: 'center' }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          )}
          <kbd style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))', borderRadius: 4, padding: '1px 5px', fontSize: 11, color: 'hsl(var(--muted-foreground))', fontFamily: 'inherit' }}>
            esc
          </kbd>
        </div>

        {/* Results / Quick actions */}
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {!query.trim() && (
            <p style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--muted-foreground))', padding: '10px 16px 4px', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              Quick actions
            </p>
          )}
          {query.trim() && isSearching && (
            <div style={{ padding: 20, textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 14 }}>
              Searching…
            </div>
          )}
          {query.trim() && !isSearching && results.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 14 }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
          {items.map((item, idx) => {
            const Icon = item.icon ?? TYPE_ICONS[item.type] ?? ArrowRight
            const color = TYPE_COLORS[item.type] ?? '#06b6d4'
            const isSelected = idx === selectedIndex
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.href)}
                onMouseEnter={() => setSelectedIndex(idx)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 16px',
                  textAlign: 'left',
                  background: isSelected ? 'hsl(var(--muted))' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: `${color}1a`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon style={{ width: 15, height: 15, color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'hsl(var(--foreground))', margin: 0 }}>{item.title}</p>
                  {item.subtitle && (
                    <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.subtitle}
                    </p>
                  )}
                </div>
                {query.trim() && (
                  <span
                    style={{
                      fontSize: 11,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: `${color}1a`,
                      color,
                      fontWeight: 500,
                      flexShrink: 0,
                    }}
                  >
                    {item.type}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Footer hint bar */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            padding: '8px 16px',
            borderTop: '1px solid hsl(var(--border))',
            fontSize: 11,
            color: 'hsl(var(--muted-foreground))',
          }}
        >
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  )
}
