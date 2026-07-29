'use client'

import Link from 'next/link'
import { Lock, Sparkles, Clock } from 'lucide-react'
import { useAuthStore } from '../../stores/auth.store'

export function TrialExpiredGate({ children }: { children: React.ReactNode }) {
  const { organization } = useAuthStore()

  if (!organization) return <>{children}</>
  if (organization.subscriptionStatus !== 'TRIALING' || !organization.trialEndsAt) return <>{children}</>

  const daysLeft = Math.ceil(
    (new Date(organization.trialEndsAt).getTime() - Date.now()) / 86400000,
  )
  if (daysLeft > 0) return <>{children}</>

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(5,8,20,0.92)', backdropFilter: 'blur(16px)' }}
    >
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div
          className="h-20 w-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          <Lock className="h-10 w-10" style={{ color: '#f87171' }} />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-white mb-2">Your free trial has ended</h1>
        <p className="text-sm mb-8" style={{ color: 'rgba(148,163,184,0.9)', lineHeight: 1.6 }}>
          Your 14-day trial expired. Upgrade now to keep all your data and continue
          automating your business with Kanavu AI.
        </p>

        {/* Plan cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { name: 'Starter', price: 49, color: '#34d399', gradient: 'linear-gradient(135deg,#34d399,#059669)' },
            { name: 'Pro', price: 97, color: '#a855f7', gradient: 'linear-gradient(135deg,#a855f7,#7c3aed)', popular: true },
            { name: 'Business', price: 197, color: '#f59e0b', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
          ].map(plan => (
            <div
              key={plan.name}
              className="rounded-xl p-3 text-center relative"
              style={{
                background: plan.popular ? `${plan.color}12` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${plan.popular ? plan.color + '40' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              {plan.popular && (
                <span
                  className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold px-2 py-0.5 rounded-full text-white whitespace-nowrap"
                  style={{ background: plan.gradient }}
                >
                  Most Popular
                </span>
              )}
              <p className="text-xs font-medium text-white mb-1">{plan.name}</p>
              <p className="text-lg font-bold tabular" style={{ color: plan.color }}>${plan.price}</p>
              <p className="text-[10px] text-slate-400">/mo</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/dashboard/upgrade"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white transition-all hover:scale-105 w-full justify-center mb-4"
          style={{ background: 'linear-gradient(135deg,#06b6d4,#0ea5e9)', boxShadow: '0 0 32px rgba(6,182,212,0.35)' }}
        >
          <Sparkles className="h-4 w-4" />
          Upgrade to continue
        </Link>

        <p className="text-xs text-slate-500">
          No setup fees · Cancel anytime ·{' '}
          <a href="mailto:support@kanavu.ai" className="text-slate-400 hover:text-white transition-colors underline">
            Contact support
          </a>
        </p>

        {/* Data safety note */}
        <div
          className="mt-6 rounded-xl p-3 flex items-center gap-2 text-left"
          style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}
        >
          <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: '#34d399' }} />
          <p className="text-xs" style={{ color: 'rgba(148,163,184,0.8)' }}>
            Your data is safe — we keep it for 30 days after trial expiry.
          </p>
        </div>
      </div>
    </div>
  )
}
