'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '../../../components/layout/sidebar'
import { useAuthStore } from '../../../stores/auth.store'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()
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
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
