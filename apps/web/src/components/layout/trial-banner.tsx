'use client'

import Link from 'next/link'
import { Clock, X, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../../stores/auth.store'

export function TrialBanner() {
  const { organization } = useAuthStore()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null
  if (!organization?.trialEndsAt) return null
  if (organization.subscriptionStatus !== 'TRIALING') return null

  const daysLeft = Math.ceil((new Date(organization.trialEndsAt).getTime() - Date.now()) / 86400000)
  if (daysLeft > 7 || daysLeft <= 0) return null

  const urgent = daysLeft <= 2

  return (
    <div
      className="flex items-center justify-between px-4 py-2 text-sm shrink-0"
      style={{
        background: urgent ? 'rgba(248,113,113,0.12)' : 'rgba(251,191,36,0.1)',
        borderBottom: urgent ? '1px solid rgba(248,113,113,0.25)' : '1px solid rgba(251,191,36,0.2)',
      }}
    >
      <div className="flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: urgent ? '#f87171' : '#fbbf24' }} />
        <span style={{ color: urgent ? '#f87171' : '#fbbf24' }}>
          {daysLeft === 1 ? 'Your trial expires tomorrow' : `${daysLeft} days left on your free trial`}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/upgrade"
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-lg text-white transition-all hover:scale-105"
          style={{ background: urgent ? 'linear-gradient(135deg, #f87171, #ef4444)' : 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
        >
          <Sparkles className="h-3 w-3" />
          Upgrade Now
        </Link>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
