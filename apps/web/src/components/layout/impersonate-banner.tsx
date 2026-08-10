'use client'

import { useRouter } from 'next/navigation'
import { ShieldCheck, LogOut } from 'lucide-react'
import { useAuthStore } from '../../stores/auth.store'

export function ImpersonateBanner() {
  const { isImpersonating, impersonatingOrg, exitImpersonation } = useAuthStore()
  const router = useRouter()

  if (!isImpersonating || !impersonatingOrg) return null

  function handleExit() {
    exitImpersonation()
    router.push('/login')
  }

  return (
    <div
      className="flex items-center justify-between px-4 py-2 text-sm shrink-0"
      style={{
        background: 'rgba(245,158,11,0.12)',
        borderBottom: '1px solid rgba(245,158,11,0.3)',
      }}
    >
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" style={{ color: '#f59e0b' }} />
        <span style={{ color: '#f59e0b' }}>
          Admin view — Viewing as <strong>{impersonatingOrg.name}</strong>
        </span>
      </div>
      <button
        onClick={handleExit}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg transition-all hover:scale-105"
        style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
      >
        <LogOut className="h-3 w-3" />
        Exit to Admin
      </button>
    </div>
  )
}
