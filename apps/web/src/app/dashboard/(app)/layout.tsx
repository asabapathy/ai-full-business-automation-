'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { Sidebar } from '../../../components/layout/sidebar'
import { useAuthStore } from '../../../stores/auth.store'
import { GlobalSearch } from '../../../components/ui/GlobalSearch'
import { NotificationBell } from '../../../components/ui/NotificationBell'
import { TrialBanner } from '../../../components/layout/trial-banner'
import { ImpersonateBanner } from '../../../components/layout/impersonate-banner'
import { TrialExpiredGate } from '../../../components/layout/trial-expired-gate'
import { Toaster } from '../../../components/ui/Toaster'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, organization } = useAuthStore()
  const router = useRouter()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) { router.push('/login'); return }
    if (organization && organization.onboardingDone === false) { router.push('/onboarding') }
  }, [isAuthenticated, isLoading, organization?.onboardingDone, router])

  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [])

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
          <div className="flex items-center gap-3">
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

      <Toaster />
    </div>
  )
}
