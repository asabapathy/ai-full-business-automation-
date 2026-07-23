'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '../../../components/layout/sidebar'
import { useAuthStore } from '../../../stores/auth.store'
import { GlobalSearch } from '../../../components/ui/GlobalSearch'
import { NotificationBell } from '../../../components/ui/NotificationBell'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-white/10 flex items-center justify-between px-6 shrink-0 bg-background/80 backdrop-blur-sm">
          <GlobalSearch />
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="w-8 h-8 bg-purple-600/30 rounded-full flex items-center justify-center text-purple-300 text-sm font-bold">
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
