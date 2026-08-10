'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Zap, Brain, Building2, Star, Shield, ChevronRight } from 'lucide-react'
import { PLAN_META } from '../../lib/features'

const BILLING_TOGGLE = ['monthly', 'annual'] as const

const BUSINESS_TYPES = [
  { label: 'Home Services', examples: 'HVAC, Plumbing, Electrical, Roofing', icon: '🔧', plan: 'PRO' },
  { label: 'Healthcare & Therapy', examples: 'Dental, Medical, ABA, Autism Therapy', icon: '🏥', plan: 'STARTER', note: 'HIPAA-safe feature set — AI scheduling + billing only' },
  { label: 'Beauty & Wellness', examples: 'Salon, Spa, Gym, Fitness Studio', icon: '✂️', plan: 'STARTER' },
  { label: 'Food & Hospitality', examples: 'Restaurant, Café, Catering', icon: '🍽️', plan: 'STARTER' },
  { label: 'Professional Services', examples: 'Law Firm, Accounting, Consulting', icon: '💼', plan: 'PRO' },
  { label: 'Real Estate & Insurance', examples: 'Agents, Brokers, Agencies', icon: '🏠', plan: 'PRO' },
  { label: 'Retail & E-Commerce', examples: 'Boutique, Online Shop, Retail', icon: '🛍️', plan: 'PRO' },
  { label: 'Agencies', examples: 'Marketing, Design, White-label resellers', icon: '🚀', plan: 'BUSINESS' },
]

const FAQS = [
  { q: 'Is there a free trial?', a: 'Yes — every new account gets 14 days of Business plan access, no credit card required. You experience the full platform before choosing a plan.' },
  { q: 'Can I change plans later?', a: 'Absolutely. Upgrade or downgrade at any time. When upgrading, you\'re charged the prorated difference. Downgrading takes effect at the end of your billing cycle.' },
  { q: 'What happens to my data if I downgrade?', a: 'Your data is safe. Features you no longer have access to become read-only until you re-upgrade.' },
  { q: 'Is the dental / medical version HIPAA-safe?', a: 'We intentionally limit features for HIPAA-sensitive industries (dental, medical, ABA therapy, daycare) to AI receptionist, appointments, invoicing, and reviews — no bulk outreach, no contact marketing, no chat widgets. This keeps you out of PHI territory. We always recommend consulting your compliance officer.' },
  { q: 'What does white-label include?', a: 'Business plan includes custom domain, your logo and brand colors, custom "From" email address, and the ability to hide Kanavu branding — perfect for agencies reselling to their own clients.' },
  { q: 'Do you offer annual billing?', a: 'Yes. Annual plans are billed upfront and come with 2 months free (≈17% savings).' },
]

function CheckItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
      <span className="text-muted-foreground">{text}</span>
    </li>
  )
}

export default function PricingPage() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')

  function price(base: number) {
    return billing === 'annual' ? Math.round(base * 0.83) : base
  }

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--background))' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 16px rgba(6,182,212,0.3)' }}>
            <Brain className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-foreground">Kanavu <span className="text-primary">AI</span></span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
          <Link href="/register" className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
            Start free trial
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="text-center pt-16 pb-12 px-4">
        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-primary mb-6" style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}>
          <Zap className="h-3 w-3" />
          14-day free trial · No credit card required
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4" style={{ textWrap: 'balance' }}>
          Simple pricing for every business
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
          One AI platform that adapts to your industry. Start free, scale as you grow.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex rounded-xl p-1 gap-1" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
          {BILLING_TOGGLE.map(b => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize"
              style={billing === b
                ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
                : { color: 'hsl(var(--muted-foreground))' }
              }
            >
              {b} {b === 'annual' && <span className="text-emerald-400 text-xs ml-1">Save 17%</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-3 gap-6">
          {(Object.entries(PLAN_META) as [string, typeof PLAN_META.STARTER][]).map(([key, plan]) => {
            const isPopular = (plan as any).popular
            return (
              <div
                key={key}
                className="rounded-2xl p-6 flex flex-col relative"
                style={isPopular
                  ? { background: 'hsl(var(--card))', border: `1px solid ${plan.color}`, boxShadow: `0 0 40px ${plan.color}20` }
                  : { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
                }
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold text-white" style={{ background: plan.gradient }}>
                    Most Popular
                  </div>
                )}
                <div className="mb-4">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${plan.color}18`, border: `1px solid ${plan.color}40` }}>
                    {key === 'STARTER' && <Zap className="h-4 w-4" style={{ color: plan.color }} />}
                    {key === 'PRO' && <Brain className="h-4 w-4" style={{ color: plan.color }} />}
                    {key === 'BUSINESS' && <Building2 className="h-4 w-4" style={{ color: plan.color }} />}
                  </div>
                  <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-foreground tabular">${price(plan.price)}</span>
                  <span className="text-muted-foreground text-sm">/month</span>
                  {billing === 'annual' && (
                    <p className="text-xs text-emerald-400 mt-0.5">Billed annually (${Math.round(price(plan.price) * 12)}/yr)</p>
                  )}
                </div>

                <ul className="space-y-2 mb-8 flex-1">
                  {plan.highlights.map(h => <CheckItem key={h} text={h} />)}
                </ul>

                <Link
                  href={`/register?plan=${key.toLowerCase()}`}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-center transition-all hover:scale-[1.02] block"
                  style={isPopular
                    ? { background: plan.gradient, color: 'white', boxShadow: `0 0 24px ${plan.color}40` }
                    : { background: `${plan.color}12`, color: plan.color, border: `1px solid ${plan.color}40` }
                  }
                >
                  Start free trial
                </Link>
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          All plans include a 14-day free trial at Business level. No credit card required.
        </p>
      </div>

      {/* Industry fit section */}
      <div className="max-w-5xl mx-auto px-4 pb-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-foreground mb-2">Built for your industry</h2>
          <p className="text-muted-foreground text-sm">Features automatically adapt based on your business type</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {BUSINESS_TYPES.map(bt => {
            const planMeta = PLAN_META[bt.plan as keyof typeof PLAN_META]
            return (
              <div
                key={bt.label}
                className="rounded-xl p-4"
                style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              >
                <div className="text-2xl mb-2">{bt.icon}</div>
                <p className="text-sm font-semibold text-foreground mb-0.5">{bt.label}</p>
                <p className="text-xs text-muted-foreground mb-3">{bt.examples}</p>
                {bt.note && (
                  <p className="text-[11px] mb-2 leading-tight" style={{ color: '#fbbf24' }}>
                    <Shield className="h-3 w-3 inline mr-1" />
                    {bt.note}
                  </p>
                )}
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ color: planMeta.color, background: `${planMeta.color}15` }}>
                  Starts on {planMeta.name}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* FAQs */}
      <div className="max-w-2xl mx-auto px-4 pb-24">
        <h2 className="text-2xl font-bold text-foreground text-center mb-8">Frequently asked questions</h2>
        <div className="space-y-4">
          {FAQS.map(faq => (
            <div key={faq.q} className="rounded-xl p-5" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
              <p className="text-sm font-semibold text-foreground mb-2">{faq.q}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA banner */}
      <div className="max-w-4xl mx-auto px-4 pb-24">
        <div className="rounded-2xl p-10 text-center" style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)' }}>
          <div className="flex justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 text-amber-400 fill-amber-400" />)}
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Start growing today</h2>
          <p className="text-muted-foreground mb-6 text-sm max-w-md mx-auto">Join businesses already using Kanavu AI to automate their operations, win more customers, and grow revenue on autopilot.</p>
          <Link href="/register" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 24px rgba(6,182,212,0.35)' }}>
            Start your 14-day free trial
            <ChevronRight className="h-4 w-4" />
          </Link>
          <p className="text-xs text-muted-foreground mt-3">No credit card required · Cancel anytime</p>
        </div>
      </div>
    </div>
  )
}
