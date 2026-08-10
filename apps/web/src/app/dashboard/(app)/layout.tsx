'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Keyboard, Menu, MessageSquare, Monitor, Moon, Search, Sun, X } from 'lucide-react'
import { Sidebar } from '../../../components/layout/sidebar'
import { useAuthStore } from '../../../stores/auth.store'
import { GlobalSearch } from '../../../components/ui/GlobalSearch'
import { NotificationBell } from '../../../components/ui/NotificationBell'
import { AIChatPanel } from '../../../components/ui/AIChatPanel'
import { TrialBanner } from '../../../components/layout/trial-banner'
import { ImpersonateBanner } from '../../../components/layout/impersonate-banner'
import { TrialExpiredGate } from '../../../components/layout/trial-expired-gate'
import { Toaster } from '../../../components/ui/Toaster'
import { CommandPalette } from '../../../components/ui/CommandPalette'

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }

const SHORTCUTS: { keys: string[]; label: string; group: string }[] = [
  { keys: ['⌘', 'K'], label: 'Search everything', group: 'General' },
  { keys: ['?'], label: 'Show this panel', group: 'General' },
  { keys: ['Esc'], label: 'Close any panel', group: 'General' },
  { keys: ['G', 'D'], label: 'Go to Dashboard', group: 'Navigation' },
  { keys: ['G', 'C'], label: 'Go to CRM', group: 'Navigation' },
  { keys: ['G', 'I'], label: 'Go to Invoices', group: 'Navigation' },
  { keys: ['G', 'A'], label: 'Go to Appointments', group: 'Navigation' },
  { keys: ['G', 'M'], label: 'Go to Campaigns', group: 'Navigation' },
  { keys: ['G', 'R'], label: 'Go to Reports', group: 'Navigation' },
  { keys: ['N', 'C'], label: 'New contact (opens CRM)', group: 'Actions' },
  { keys: ['N', 'I'], label: 'New invoice (opens Invoices)', group: 'Actions' },
]

const CHORD_ROUTES: Record<string, string> = {
  'g:d': '/dashboard',
  'g:c': '/dashboard/crm',
  'g:i': '/dashboard/invoices',
  'g:a': '/dashboard/appointments',
  'g:m': '/dashboard/campaigns',
  'g:r': '/dashboard/reports',
  'n:c': '/dashboard/crm',
  'n:i': '/dashboard/invoices',
}

const kbdStyle: React.CSSProperties = {
  background: 'hsl(var(--muted))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 4,
  padding: '2px 7px',
  fontSize: 11,
  fontFamily: 'monospace',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, organization } = useAuthStore()
  const router = useRouter()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const pendingKey = useRef<{ key: string; at: number } | null>(null)
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('system')

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) { router.push('/login'); return }
    if (organization && organization.onboardingDone === false) { router.push('/onboarding') }
  }, [isAuthenticated, isLoading, organization?.onboardingDone, router])

  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('kv-theme') as 'dark' | 'light' | 'system' | null
    if (saved) setTheme(saved)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') {
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', theme)
    }
    localStorage.setItem('kv-theme', theme)
  }, [theme])

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div
          className="h-8 w-8 rounded-full border-2 border-t-transparent"
          style={{ borderColor: 'rgba(6,182,212,0.4)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }}
        />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background gradient-mesh">
      {/* Desktop sidebar */}
      <div className="hidden md:block shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative z-10" onClick={e => e.stopPropagation()}>
            <Sidebar />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <ImpersonateBanner />
        <TrialBanner />
        <header
          className="h-14 flex items-center justify-between px-4 md:px-6 shrink-0 border-b"
          style={{
            background: 'rgba(9,15,28,0.8)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderColor: 'rgba(28,56,96,0.4)',
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCmdOpen(true)}
              className="hidden sm:flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search</span>
              <kbd className="text-xs" style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))', borderRadius: 4, padding: '0 4px' }}>⌘K</kbd>
            </button>
            <button
              onClick={() => setTheme(t => t === 'system' ? 'light' : t === 'light' ? 'dark' : 'system')}
              title={`Theme: ${theme}`}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            >
              {theme === 'light' ? <Sun className="h-4 w-4" /> : theme === 'dark' ? <Moon className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setChatOpen(o => !o)}
              title="Ask AI"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-[1.03]"
              style={chatOpen
                ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
                : { color: '#06b6d4', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)' }
              }
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
            <NotificationBell />
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 12px rgba(6,182,212,0.3)' }}
            >
              {user?.firstName?.[0] ?? '?'}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <TrialExpiredGate>
            {children}
          </TrialExpiredGate>
        </main>
      </div>

      {shortcutsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShortcutsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl shadow-2xl"
            style={cardStyle}
            onClick={e => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid hsl(var(--border))' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Keyboard Shortcuts</span>
                <kbd style={kbdStyle}>?</kbd>
              </div>
              <button
                onClick={() => setShortcutsOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-4 py-3 max-h-[60vh] overflow-y-auto">
              {['General', 'Navigation', 'Actions'].map(group => (
                <div key={group} className="mb-3 last:mb-0">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">{group}</div>
                  {SHORTCUTS.filter(s => s.group === group).map(s => (
                    <div key={s.label} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-foreground">{s.label}</span>
                      <span className="flex items-center gap-1.5">
                        {s.keys.map((k, i) => (
                          <span key={i} className="flex items-center gap-1.5">
                            {i > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {s.keys[0] === '⌘' ? '+' : 'then'}
                              </span>
                            )}
                            <kbd style={kbdStyle}>{k}</kbd>
                          </span>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div
              className="px-4 py-2.5 text-xs text-muted-foreground"
              style={{ borderTop: '1px solid hsl(var(--border))' }}
            >
              Press ? anywhere to open this panel
            </div>
          </div>
        </div>
      )}

      <AIChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <Toaster />
    </div>
  )
}
