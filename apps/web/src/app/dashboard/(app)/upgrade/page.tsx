'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, Check, Sparkles, Zap, Brain, Building2, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../../../../stores/auth.store'
import { PLAN_META } from '../../../../lib/features'
import { apiClient } from '../../../../lib/api-client'

const PLAN_ORDER = ['STARTER', 'PRO', 'BUSINESS'] as const
const PLAN_ICONS = { STARTER: Zap, PRO: Brain, BUSINESS: Building2 }

function UpgradePageInner() {
  const params = useSearchParams()
  const router = useRouter()
  const feature = params.get('feature') ?? ''
  const { organization } = useAuthStore()
  const currentPlan = (organization?.plan ?? 'FREE_TRIAL').toUpperCase()
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  function displayPrice(base: number) {
    return billing === 'annual' ? Math.round(base * 0.83) : base
  }

  async function startCheckout(planKey: string) {
    const priceId = process.env[`NEXT_PUBLIC_STRIPE_PRICE_${planKey}`]
      ?? `price_${planKey.toLowerCase()}`
    setLoadingPlan(planKey)
    try {
      const res = await apiClient.post<{ url: string }>('/stripe/checkout', { priceId }) as any
      if (res?.url) window.location.href = res.url
    } catch {
      alert('Unable to start checkout. Please check Stripe configuration.')
    } finally {
      setLoadingPlan(null)
    }
  }

  const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }

  return (
    <div className="min-h-full p-6">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 kv-anim" style={{ animationDelay: '0.02s' }}>
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Header */}
      <div className="text-center mb-10 kv-anim" style={{ animationDelay: '0.04s' }}>
        {feature && (
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-primary mb-4" style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}>
            <Lock className="h-3 w-3" />
            <span className="font-mono">{feature}</span> requires a plan upgrade
          </div>
        )}
        <h1 className="text-3xl font-bold text-foreground mb-2">Choose your plan</h1>
        <p className="text-muted-foreground text-sm">Upgrade anytime · Cancel anytime · Secure checkout via Stripe</p>

        {/* Billing toggle */}
        <div className="inline-flex rounded-xl p-1 gap-1 mt-6" style={cardStyle}>
          {(['monthly', 'annual'] as const).map(b => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize"
              style={billing === b
                ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
                : { color: 'hsl(var(--muted-foreground))' }
              }
            >
              {b}{b === 'annual' && <span className="text-emerald-400 text-xs ml-1.5">Save 17%</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto kv-anim" style={{ animationDelay: '0.11s' }}>
        {PLAN_ORDER.map(key => {
          const plan = PLAN_META[key]
          const Icon = PLAN_ICONS[key]
          const isCurrent = currentPlan === key
          const isPopular = (plan as any).popular
          const isLoading = loadingPlan === key

          return (
            <div
              key={key}
              className="rounded-2xl p-6 flex flex-col relative transition-transform hover:scale-[1.01]"
              style={isPopular
                ? { background: 'hsl(var(--card))', border: `1px solid ${plan.color}`, boxShadow: `0 0 40px ${plan.color}18` }
                : cardStyle
              }
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold text-white whitespace-nowrap" style={{ background: plan.gradient }}>
                  Most Popular
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 right-4 px-3 py-1 rounded-full text-[11px] font-bold" style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.4)', color: '#34d399' }}>
                  Current plan
                </div>
              )}

              {/* Plan header */}
              <div className="mb-5">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${plan.color}18`, border: `1px solid ${plan.color}40` }}>
                  <Icon className="h-5 w-5" style={{ color: plan.color }} />
                </div>
                <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
                <p className="text-sm text-muted-foreground mt-1 leading-snug">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground tabular">${displayPrice(plan.price)}</span>
                  <span className="text-muted-foreground text-sm">/mo</span>
                </div>
                {billing === 'annual' && (
                  <p className="text-xs mt-0.5" style={{ color: '#34d399' }}>
                    ${Math.round(displayPrice(plan.price) * 12)}/yr · 2 months free
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-8 flex-1">
                {plan.highlights.map(h => (
                  <li key={h} className="flex items-start gap-2.5 text-sm">
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{h}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrent ? (
                <div className="w-full py-2.5 rounded-xl text-sm font-semibold text-center" style={{ background: 'rgba(52,211,153,0.08)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}>
                  Current plan
                </div>
              ) : (
                <button
                  onClick={() => startCheckout(key)}
                  disabled={!!loadingPlan}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: plan.gradient, boxShadow: `0 0 20px ${plan.color}30` }}
                >
                  <Sparkles className="h-4 w-4" />
                  {isLoading ? 'Redirecting…' : `Upgrade to ${plan.name}`}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer links */}
      <div className="flex items-center justify-center gap-6 mt-10 text-sm text-muted-foreground kv-anim" style={{ animationDelay: '0.18s' }}>
        <Link href="/pricing" className="hover:text-foreground transition-colors">Full pricing comparison</Link>
        <span>·</span>
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Not now</Link>
      </div>
    </div>
  )
}

export default function UpgradePage() {
  return (
    <Suspense>
      <UpgradePageInner />
    </Suspense>
  )
}
