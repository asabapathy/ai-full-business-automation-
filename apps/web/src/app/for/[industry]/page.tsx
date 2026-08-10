import Link from 'next/link'
import { Check, ArrowRight, ShieldCheck } from 'lucide-react'
import { INDUSTRY_LABELS, PLAN_META, getOrgFeatures, isHipaaIndustry } from '../../../lib/features'
import { notFound } from 'next/navigation'

interface IndustryMeta {
  headline: string
  subline: string
  emoji: string
  useCases: string[]
  color: string
}

const INDUSTRY_CONTENT: Record<string, IndustryMeta> = {
  DENTAL_CLINIC: {
    headline: 'Run Your Dental Practice Smarter',
    subline: 'HIPAA-compliant AI tools for scheduling, patient intake, invoicing, and reviews — nothing that touches PHI.',
    emoji: '🦷',
    color: '#06b6d4',
    useCases: [
      'AI Receptionist answers calls & books appointments 24/7',
      'Digital intake forms sent to patients before their visit',
      'Automated appointment reminders to cut no-shows',
      'One-click invoice generation and online payment',
      'Automated review requests after every appointment',
    ],
  },
  MEDICAL_PRACTICE: {
    headline: 'AI for Your Medical Practice',
    subline: 'HIPAA-safe tools that handle the front-office so your staff can focus on patient care.',
    emoji: '🏥',
    color: '#06b6d4',
    useCases: [
      '24/7 AI Receptionist for scheduling and triage routing',
      'Patient intake and consent forms online',
      'Appointment management with automated reminders',
      'Invoicing and payment collection',
      'Post-visit review automation',
    ],
  },
  HVAC: {
    headline: 'Grow Your HVAC Business with AI',
    subline: 'Book more jobs, send estimates faster, collect payment on-site, and keep reviews flowing.',
    emoji: '🔧',
    color: '#f59e0b',
    useCases: [
      'AI Receptionist captures every inbound call and books service calls',
      'Instant estimates and proposals sent from the field',
      'Automated follow-ups for seasonal tune-up campaigns',
      'GPS-synced staff scheduling and job costing',
      'Google review requests after every completed job',
    ],
  },
  PLUMBING: {
    headline: 'Plumbing Business — Automated',
    subline: 'From the first call to the final invoice, let Kanavu AI handle the office work.',
    emoji: '🔩',
    color: '#f59e0b',
    useCases: [
      '24/7 AI call answering — never miss an emergency call',
      'On-site invoice and payment collection',
      'Job costing to protect your margins',
      'Staff schedule and dispatch management',
      'Automated review requests',
    ],
  },
  SALON: {
    headline: 'AI for Salons & Spas',
    subline: 'Book appointments, sell gift cards, manage staff commissions, and build your reputation — on autopilot.',
    emoji: '💅',
    color: '#a855f7',
    useCases: [
      'Online booking with AI Receptionist for phone overflow',
      'Automated appointment reminders and confirmations',
      'Staff commission tracking',
      'Loyalty points and gift card programs',
      'Review requests after every visit',
    ],
  },
  RESTAURANT: {
    headline: 'Restaurant Operations, Reimagined',
    subline: 'Handle reservations, manage reviews, run loyalty programs, and automate your marketing.',
    emoji: '🍽️',
    color: '#34d399',
    useCases: [
      'Online reservation management with reminders',
      'Review monitoring and response templates',
      'Loyalty and gift card programs',
      'Marketing campaigns for specials and events',
      'Staff scheduling and time tracking',
    ],
  },
  LAW_FIRM: {
    headline: 'Modern Tools for Law Firms',
    subline: 'Intake, proposals, contracts, billing, and client communications — all in one place.',
    emoji: '⚖️',
    color: '#60a5fa',
    useCases: [
      'Digital client intake and conflict-check forms',
      'Proposal and engagement letter automation',
      'Contract management with e-signature',
      'Time tracking and billing by matter',
      'Client portal for document sharing',
    ],
  },
  REAL_ESTATE: {
    headline: 'Real Estate — Powered by AI',
    subline: 'Manage leads, nurture clients, track deals, and automate follow-ups across your entire pipeline.',
    emoji: '🏡',
    color: '#34d399',
    useCases: [
      'CRM built for real estate pipelines',
      'Automated lead follow-up sequences',
      'AI email writer for listing outreach',
      'Deal tracking from lead to close',
      'Referral management program',
    ],
  },
  GYM: {
    headline: 'Fitness Business on Autopilot',
    subline: 'Manage memberships, book sessions, run campaigns, and track retention — all from one dashboard.',
    emoji: '💪',
    color: '#f87171',
    useCases: [
      'Recurring membership billing and renewals',
      'Class and personal training booking',
      'Automated win-back campaigns for lapsed members',
      'Loyalty and referral programs',
      'Review automation',
    ],
  },
  ABA_PROVIDER: {
    headline: 'ABA Therapy — HIPAA-Safe Tools',
    subline: 'Scheduling, billing, and intake for your ABA practice, with no tools that touch protected health information.',
    emoji: '🧩',
    color: '#06b6d4',
    useCases: [
      'Intake forms and waitlist management',
      'Recurring appointment scheduling',
      'Session notes and billing workflows',
      'Review automation with families',
      'Client portal for parent communication',
    ],
  },
  ACCOUNTING_FIRM: {
    headline: 'CPA & Accounting — Run Efficiently',
    subline: 'Proposals, contracts, recurring billing, and client portals for accounting practices of any size.',
    emoji: '📊',
    color: '#a855f7',
    useCases: [
      'Proposal and engagement letter templates',
      'Recurring client billing and invoicing',
      'Document management and e-signature',
      'Client portal for secure file sharing',
      'Task and project tracking by client',
    ],
  },
  CLEANING_COMPANY: {
    headline: 'Scale Your Cleaning Business',
    subline: 'Book more jobs, schedule crews, track time, and collect payment — all from Kanavu AI.',
    emoji: '🧹',
    color: '#34d399',
    useCases: [
      'Online booking with automated confirmations',
      'Staff scheduling and GPS routing',
      'Job costing and invoice generation',
      'Recurring job management for regular clients',
      'Review automation after every job',
    ],
  },
}

const DEFAULT_CONTENT: IndustryMeta = {
  headline: 'AI Tools Built for Your Business',
  subline: 'Automate your front office, manage clients, track revenue, and grow your reputation with Kanavu AI.',
  emoji: '🚀',
  color: '#06b6d4',
  useCases: [
    'AI Receptionist answers calls and books appointments 24/7',
    'CRM to manage every contact and deal',
    'Automated invoicing and payment collection',
    'Review management to build your reputation',
    'Marketing automation for growth',
  ],
}

const PLAN_PRICES = [
  { id: 'FREE_TRIAL' as const, name: 'Free Trial', price: 0, sub: '14 days, no card required' },
  { id: 'STARTER' as const, name: 'Starter', price: 49, sub: '/month' },
  { id: 'PRO' as const, name: 'Pro', price: 97, sub: '/month', popular: true },
  { id: 'BUSINESS' as const, name: 'Business', price: 197, sub: '/month' },
]

export async function generateStaticParams() {
  return Object.keys(INDUSTRY_LABELS).map(industry => ({ industry: industry.toLowerCase().replace(/_/g, '-') }))
}

export default function IndustryLandingPage({ params }: { params: { industry: string } }) {
  const slug = params.industry.toUpperCase().replace(/-/g, '_')

  if (!INDUSTRY_LABELS[slug] && !INDUSTRY_CONTENT[slug]) {
    notFound()
  }

  const content = INDUSTRY_CONTENT[slug] ?? DEFAULT_CONTENT
  const industryLabel = INDUSTRY_LABELS[slug] ?? params.industry
  const hipaa = isHipaaIndustry(slug)
  const features = getOrgFeatures('PRO', slug)
  const featureList = [...features].slice(0, 16)

  const FEATURE_LABELS: Record<string, string> = {
    'core:dashboard': 'Dashboard', 'core:crm': 'CRM', 'core:appointments': 'Appointments',
    'core:invoices': 'Invoices', 'core:proposals': 'Proposals', 'core:estimates': 'Estimates',
    'core:contracts': 'Contracts', 'core:sales': 'Sales Pipeline', 'core:automations': 'Automations',
    'ai:receptionist': 'AI Receptionist', 'ai:brain': 'AI Brain', 'ai:business_doctor': 'Business Doctor',
    'ai:email_writer': 'AI Email Writer', 'ai:blog_writer': 'Blog Writer',
    'marketing:hub': 'Marketing Hub', 'marketing:campaigns': 'Campaigns', 'marketing:social': 'Social Media',
    'reputation:reviews': 'Reviews', 'reputation:referrals': 'Referrals', 'reputation:loyalty': 'Loyalty',
    'comm:sms': 'SMS Inbox', 'comm:whatsapp': 'WhatsApp', 'comm:chat_widget': 'Chat Widget',
    'finance:billing': 'Billing', 'finance:expenses': 'Expenses',
    'ops:hub': 'Operations', 'ops:projects': 'Projects', 'ops:staff_schedule': 'Staff Schedule',
    'analytics:hub': 'Analytics', 'analytics:reports': 'Reports',
    'clients:portal': 'Client Portal', 'clients:intake': 'Intake Forms', 'clients:waitlist': 'Waitlist',
    'platform:website': 'Website Builder',
    'settings:settings': 'Settings', 'settings:team': 'Team',
  }

  return (
    <div style={{ background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/" className="text-lg font-bold text-foreground">Kanavu AI</Link>
        <div className="flex items-center gap-4">
          <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
          <Link href="/register" className="text-sm font-semibold px-4 py-1.5 rounded-lg text-white" style={{ background: `linear-gradient(135deg, ${content.color}, ${content.color}cc)` }}>
            Start free trial
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
        <div className="text-5xl mb-4">{content.emoji}</div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-5" style={{ background: `${content.color}15`, color: content.color, border: `1px solid ${content.color}30` }}>
          Built for {industryLabel}
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4 leading-tight">{content.headline}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">{content.subline}</p>

        {hipaa && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm mb-8" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24' }}>
            <ShieldCheck className="h-4 w-4 shrink-0" />
            HIPAA-safe: No PHI-touching tools. Only front-office features.
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/register" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105" style={{ background: `linear-gradient(135deg, ${content.color}, ${content.color}cc)`, boxShadow: `0 0 24px ${content.color}40` }}>
            Start free 14-day trial
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/pricing" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-foreground transition-all hover:bg-white/5" style={{ border: '1px solid hsl(var(--border))' }}>
            View pricing
          </Link>
        </div>
      </div>

      {/* Use cases */}
      <div className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-xl font-bold text-foreground mb-6 text-center">How {industryLabel} businesses use Kanavu AI</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {content.useCases.map((uc, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl p-4" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
              <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${content.color}20` }}>
                <Check className="h-3 w-3" style={{ color: content.color }} />
              </div>
              <p className="text-sm text-muted-foreground">{uc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="max-w-4xl mx-auto px-6 pb-16">
        <div className="rounded-2xl p-6" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
          <h2 className="text-lg font-bold text-foreground mb-4">
            {hipaa ? 'HIPAA-safe features included' : `Everything included for ${industryLabel}`}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {featureList.filter(f => FEATURE_LABELS[f]).map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-3.5 w-3.5 shrink-0" style={{ color: content.color }} />
                {FEATURE_LABELS[f]}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-xl font-bold text-foreground mb-2 text-center">Simple, transparent pricing</h2>
        <p className="text-muted-foreground text-center text-sm mb-8">Start free. No credit card required.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLAN_PRICES.map(p => {
            const meta = p.id !== 'FREE_TRIAL' ? PLAN_META[p.id] : null
            const isPopular = p.popular
            return (
              <div
                key={p.id}
                className="rounded-2xl p-5 relative"
                style={{
                  background: 'hsl(var(--card))',
                  border: isPopular ? `1px solid ${content.color}60` : '1px solid hsl(var(--border))',
                  boxShadow: isPopular ? `0 0 32px ${content.color}15` : undefined,
                }}
              >
                {isPopular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-0.5 rounded-full text-white" style={{ background: content.color }}>
                    Most Popular
                  </div>
                )}
                <p className="text-sm font-semibold text-foreground">{p.name}</p>
                <div className="mt-2 mb-1">
                  <span className="text-2xl font-bold text-foreground tabular">${p.price}</span>
                  <span className="text-muted-foreground text-xs ml-1">{p.sub}</span>
                </div>
                {meta && (
                  <ul className="mt-3 space-y-1.5">
                    {meta.highlights.slice(0, 4).map(h => (
                      <li key={h} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Check className="h-3 w-3 shrink-0 text-emerald-400" />{h}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-6">
          All plans include a <strong className="text-foreground">14-day free trial</strong> with full Business features. No credit card required.
        </p>
        <div className="text-center mt-6">
          <Link href="/register" className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105" style={{ background: `linear-gradient(135deg, ${content.color}, ${content.color}cc)`, boxShadow: `0 0 24px ${content.color}30` }}>
            Start free trial for {industryLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
