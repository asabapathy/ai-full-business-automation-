'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Lock, ChevronRight, Check, Sparkles } from 'lucide-react'
import { useAuthStore } from '../../../../stores/auth.store'
import { PLAN_META } from '../../../../lib/features'
import { apiClient } from '../../../../lib/api-client'
import { useState } from 'react'

const PLAN_ORDER: (keyof typeof PLAN_META)[] = ['STARTER', 'PRO', 'BUSINESS']

function getNextPlan(current: string): keyof typeof PLAN_META {
  const normalized = current.toUpperCase() as keyof typeof PLAN_META
  const idx = PLAN_ORDER.indexOf(normalized)
  return PLAN_ORDER[Math.min(idx + 1, PLAN_ORDER.length - 1)]
}

export default function UpgradePage() {
  const params = useSearchParams()
  const feature = params.get('feature') ?? ''
  const { organization } = useAuthStore()
  const currentPlan = (organization?.plan ?? 'STARTER').toUpperCase()
  const targetPlan = getNextPlan(currentPlan)
  const meta = PLAN_META[targetPlan]
  const [loading, setLoading] = useState(false)

  async function startCheckout() {
    setLoading(true)
    try {
      const res = await apiClient.post('/stripe/checkout', {
        priceId: `price_${targetPlan.toLowerCase()}_monthly`,
        successUrl: `${window.location.origin}/dashboard`,
        cancelUrl: window.location.href,
      }) as any
      if (res.url) window.location.href = res.url
    } catch {
      alert('Unable to start checkout. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Lock icon */}
        <div className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}40` }}>
          <Lock className="h-8 w-8" style={{ color: meta.color }} />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">This feature requires {meta.name}</h1>
        {feature && (
          <p className="text-sm text-muted-foreground mb-6">
            <span className="font-mono text-primary text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(6,182,212,0.1)' }}>{feature}</span>
            {' '}is available on the {meta.name} plan and above.
          </p>
        )}
        {!feature && (
          <p className="text-sm text-muted-foreground mb-6">Upgrade to {meta.name} to unlock this and many more features.</p>
        )}

        {/* Plan card */}
        <div className="rounded-2xl p-6 mb-6 text-left" style={{ background: 'hsl(var(--card))', border: `1px solid ${meta.color}40`, boxShadow: `0 0 40px ${meta.color}15` }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Upgrade to</p>
              <h2 className="text-xl font-bold text-foreground">{meta.name}</h2>
            </div>
            <div>
              <span className="text-3xl font-bold text-foreground tabular">${meta.price}</span>
              <span className="text-muted-foreground text-sm">/mo</span>
            </div>
          </div>
          <ul className="space-y-2 mb-4">
            {meta.highlights.slice(0, 6).map(h => (
              <li key={h} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                {h}
              </li>
            ))}
          </ul>
          {meta.highlights.length > 6 && (
            <p className="text-xs text-muted-foreground">+{meta.highlights.length - 6} more features</p>
          )}
        </div>

        <button
          onClick={startCheckout}
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2 mb-3"
          style={{ background: meta.gradient, boxShadow: `0 0 24px ${meta.color}40` }}
        >
          <Sparkles className="h-4 w-4" />
          {loading ? 'Redirecting to checkout…' : `Upgrade to ${meta.name}`}
        </button>

        <div className="flex items-center justify-center gap-4">
          <Link href="/pricing" className="text-xs text-primary hover:underline flex items-center gap-1">
            View all plans
            <ChevronRight className="h-3 w-3" />
          </Link>
          <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">
            Not now
          </Link>
        </div>

        <p className="text-xs text-muted-foreground mt-4">Secure checkout via Stripe · Cancel anytime</p>
      </div>
    </div>
  )
}
