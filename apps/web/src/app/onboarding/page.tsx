'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight, Users, Building2, Sparkles, Mail, Plus, X, Brain, Calendar, FileText, Star, MessageSquare } from 'lucide-react'
import { apiClient } from '../../lib/api-client'
import { useAuthStore } from '../../stores/auth.store'
import { INDUSTRY_LABELS, getOrgFeatures, isHipaaIndustry } from '../../lib/features'

const STEPS = ['Your Business', 'Your Features', 'Invite Your Team']

const INDUSTRIES = Object.entries(INDUSTRY_LABELS).map(([value, label]) => ({ value, label }))

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  'ai:receptionist': <MessageSquare className="h-4 w-4" />,
  'core:appointments': <Calendar className="h-4 w-4" />,
  'core:invoices': <FileText className="h-4 w-4" />,
  'reputation:reviews': <Star className="h-4 w-4" />,
  'ai:brain': <Brain className="h-4 w-4" />,
  'core:crm': <Users className="h-4 w-4" />,
}

const FEATURE_LABELS: Record<string, string> = {
  'core:dashboard': 'Dashboard', 'core:crm': 'CRM', 'core:appointments': 'Appointments',
  'core:invoices': 'Invoices', 'core:proposals': 'Proposals', 'core:estimates': 'Estimates',
  'core:contracts': 'Contracts', 'core:sales': 'Sales Pipeline', 'core:automations': 'Automations',
  'ai:receptionist': 'AI Receptionist', 'ai:brain': 'AI Brain', 'ai:business_doctor': 'Business Doctor',
  'ai:email_writer': 'AI Email Writer', 'ai:blog_writer': 'Blog Writer',
  'marketing:hub': 'Marketing Hub', 'marketing:campaigns': 'Campaigns', 'marketing:social': 'Social Media',
  'reputation:reviews': 'Reviews', 'reputation:referrals': 'Referrals', 'reputation:loyalty': 'Loyalty',
  'comm:sms': 'SMS Inbox', 'comm:whatsapp': 'WhatsApp', 'comm:chat_widget': 'Chat Widget', 'comm:team_inbox': 'Team Inbox',
  'finance:billing': 'Billing', 'finance:expenses': 'Expenses', 'finance:payment_links': 'Payment Links',
  'ops:hub': 'Operations', 'ops:projects': 'Projects', 'ops:staff_schedule': 'Staff Schedule',
  'analytics:hub': 'Analytics', 'analytics:reports': 'Reports', 'analytics:goals': 'Goals',
  'clients:portal': 'Client Portal', 'clients:intake': 'Intake Forms', 'clients:waitlist': 'Waitlist',
  'platform:website': 'Website Builder', 'platform:white_label': 'White Label',
  'settings:settings': 'Settings', 'settings:team': 'Team', 'settings:notifications': 'Notifications',
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }

export default function OnboardingPage() {
  const router = useRouter()
  const { organization, refreshUser } = useAuthStore()
  const [step, setStep] = useState(0)
  const [industry, setIndustry] = useState(organization?.industry ?? '')
  const [inviteEmails, setInviteEmails] = useState<string[]>([''])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const plan = organization?.plan ?? 'STARTER'
  const features = getOrgFeatures(plan, industry || undefined)
  const hipaa = isHipaaIndustry(industry || undefined)

  function addEmail() {
    setInviteEmails(e => [...e, ''])
  }

  function removeEmail(i: number) {
    setInviteEmails(e => e.filter((_, idx) => idx !== i))
  }

  function setEmail(i: number, val: string) {
    setInviteEmails(e => e.map((v, idx) => idx === i ? val : v))
  }

  async function finish() {
    setSaving(true)
    setError('')
    try {
      await apiClient.patch('/org/onboarding', { industry: industry || undefined, onboardingDone: true, onboardingStep: 3 })

      const validEmails = inviteEmails.filter(e => e.trim() && e.includes('@'))
      if (validEmails.length) {
        await Promise.allSettled(
          validEmails.map(email =>
            apiClient.post('/team-permissions/invite', { email, role: 'MEMBER' })
          )
        )
      }

      await refreshUser()
      router.push('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'hsl(var(--background))' }}>
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 24px rgba(6,182,212,0.3)' }}>
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Welcome to Kanavu AI</h1>
        <p className="text-muted-foreground text-sm mt-1">Let's set up your workspace in 3 quick steps</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={i < step
                  ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
                  : i === step
                    ? { background: 'rgba(6,182,212,0.15)', color: '#06b6d4', border: '1px solid #06b6d4' }
                    : { background: 'rgba(255,255,255,0.05)', color: 'hsl(var(--muted-foreground))' }
                }
              >
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span className="text-xs hidden sm:block" style={{ color: i === step ? '#06b6d4' : 'hsl(var(--muted-foreground))' }}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-8 h-px" style={{ background: i < step ? '#06b6d4' : 'hsl(var(--border))' }} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="w-full max-w-lg">

        {/* Step 0: Industry */}
        {step === 0 && (
          <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">What type of business are you?</h2>
            </div>
            <p className="text-sm text-muted-foreground">We'll customize your Kanavu AI experience based on your industry.</p>

            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {INDUSTRIES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setIndustry(value)}
                  className="text-left px-3 py-2.5 rounded-xl text-sm transition-all"
                  style={industry === value
                    ? { background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.4)', color: '#06b6d4' }
                    : { background: 'rgba(255,255,255,0.03)', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            {hipaa && (
              <div className="flex gap-2 rounded-xl p-3 text-sm" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                <span style={{ color: '#fbbf24' }}>⚕️</span>
                <span className="text-xs" style={{ color: '#fbbf24' }}>HIPAA-safe mode: We hide high-risk marketing tools and keep only appointment, billing, and intake features.</span>
              </div>
            )}

            <button
              onClick={() => setStep(1)}
              className="w-full py-2.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
            >
              Continue <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Step 1: Feature preview */}
        {step === 1 && (
          <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Your features are ready</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Based on your {plan} plan{industry ? ` and ${INDUSTRY_LABELS[industry] ?? industry} industry` : ''}, here's what you get:
            </p>

            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {[...features].filter(f => FEATURE_LABELS[f]).map(f => (
                <div key={f} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.12)' }}>
                  <span style={{ color: '#06b6d4' }}>{FEATURE_ICONS[f] ?? <Check className="h-4 w-4" />}</span>
                  <span className="text-xs text-foreground">{FEATURE_LABELS[f]}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep(0)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground transition-colors hover:text-foreground" style={{ border: '1px solid hsl(var(--border))' }}>
                Back
              </button>
              <button
                onClick={() => setStep(2)}
                className="flex-[2] py-2.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
              >
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Invite team */}
        {step === 2 && (
          <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Invite your team</h2>
            </div>
            <p className="text-sm text-muted-foreground">Add your colleagues now or skip and do it later in Settings → Team.</p>

            <div className="space-y-2">
              {inviteEmails.map((email, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}>
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(i, e.target.value)}
                      placeholder="colleague@company.com"
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                  </div>
                  {inviteEmails.length > 1 && (
                    <button onClick={() => removeEmail(i)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {inviteEmails.length < 5 && (
              <button onClick={addEmail} className="flex items-center gap-2 text-sm text-primary hover:underline">
                <Plus className="h-3.5 w-3.5" /> Add another
              </button>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground transition-colors hover:text-foreground" style={{ border: '1px solid hsl(var(--border))' }}>
                Back
              </button>
              <button
                onClick={finish}
                disabled={saving}
                className="flex-[2] py-2.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
              >
                {saving ? 'Setting up…' : (
                  <><Sparkles className="h-4 w-4" /> Launch Kanavu AI</>
                )}
              </button>
            </div>

            <button onClick={finish} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
