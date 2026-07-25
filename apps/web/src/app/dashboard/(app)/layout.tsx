'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '../../../components/layout/sidebar'
import { useAuthStore } from '../../../stores/auth.store'
import { GlobalSearch } from '../../../components/ui/GlobalSearch'
import { NotificationBell } from '../../../components/ui/NotificationBell'
import { TrialBanner } from '../../../components/layout/trial-banner'
import { ImpersonateBanner } from '../../../components/layout/impersonate-banner'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, organization } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) { router.push('/login'); return }
    if (organization && organization.onboardingDone === false) { router.push('/onboarding') }
  }, [isAuthenticated, isLoading, organization?.onboardingDone, router])

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
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <ImpersonateBanner />
        <TrialBanner />
        {/* Topbar */}
        <header
          className="h-14 flex items-center justify-between px-6 shrink-0 border-b"
          style={{
            background: 'rgba(9,15,28,0.8)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderColor: 'rgba(28,56,96,0.4)',
          }}
        >
          <GlobalSearch />
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
          {children}
        </main>
      </div>
    </div>
  )
}
