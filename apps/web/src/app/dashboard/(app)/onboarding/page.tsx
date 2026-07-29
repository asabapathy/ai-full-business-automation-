'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '../../../../lib/api-client'
import { useAuthStore } from '../../../../stores/auth.store'

const INDUSTRIES = [
  { value: 'HEALTHCARE', label: 'Healthcare', icon: '🏥' },
  { value: 'LEGAL', label: 'Legal', icon: '⚖️' },
  { value: 'REAL_ESTATE', label: 'Real Estate', icon: '🏠' },
  { value: 'HVAC', label: 'HVAC', icon: '❄️' },
  { value: 'PLUMBING', label: 'Plumbing', icon: '🔧' },
  { value: 'ELECTRICAL', label: 'Electrical', icon: '⚡' },
  { value: 'DENTAL', label: 'Dental', icon: '🦷' },
  { value: 'BEAUTY_SALON', label: 'Beauty & Salon', icon: '💅' },
  { value: 'RESTAURANT', label: 'Restaurant', icon: '🍽️' },
  { value: 'FITNESS', label: 'Fitness', icon: '💪' },
  { value: 'RETAIL', label: 'Retail', icon: '🛍️' },
  { value: 'GENERAL', label: 'Other / General', icon: '🏢' },
]

const TEAM_SIZES = [
  { value: 'solo', label: 'Just me', desc: 'Solo operator', icon: '1️⃣' },
  { value: 'small', label: '2–10', desc: 'Small team', icon: '👥' },
  { value: 'medium', label: '11–50', desc: 'Growing business', icon: '🏢' },
  { value: 'large', label: '50+', desc: 'Enterprise', icon: '🏙️' },
]

const GOALS = [
  { value: 'capture_leads', label: 'Capture more leads', icon: '🎯' },
  { value: 'automate_followups', label: 'Automate follow-ups', icon: '🤖' },
  { value: 'manage_invoices', label: 'Manage invoices & payments', icon: '💳' },
  { value: 'book_appointments', label: 'Fill appointment calendar', icon: '📅' },
  { value: 'manage_reviews', label: 'Manage online reviews', icon: '⭐' },
  { value: 'marketing', label: 'Run marketing campaigns', icon: '📣' },
  { value: 'website', label: 'Build & optimize website', icon: '🌐' },
  { value: 'operations', label: 'Streamline operations', icon: '⚙️' },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [industry, setIndustry] = useState('')
  const [teamSize, setTeamSize] = useState('')
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])
  const [businessName, setBusinessName] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const { organization, refreshUser } = useAuthStore()

  function toggleGoal(goal: string) {
    setSelectedGoals(prev =>
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    )
  }

  async function finish() {
    setSaving(true)
    try {
      await apiClient.patch('/org', {
        name: businessName || organization?.name,
        industry,
        onboardingDone: true,
      })
      await refreshUser()
    } catch {}
    router.push('/dashboard')
  }

  const totalSteps = 3

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a] p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🧠</div>
          <h1 className="text-3xl font-bold text-white">Welcome to Kanavu AI</h1>
          <p className="text-gray-400 mt-2">Let's set up your AI business operating system</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className={`flex-1 h-1.5 rounded-full transition-colors ${i < step ? 'bg-purple-500' : 'bg-white/10'}`} />
            </div>
          ))}
        </div>

        {/* Step 1: Industry */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">What type of business do you run?</h2>
              <p className="text-sm text-gray-400">Your AI will be customized for your industry</p>
            </div>
            <div className="mb-4">
              <label className="text-xs text-gray-400 mb-1.5 block">Business name</label>
              <input
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                placeholder={organization?.name ?? 'Your business name'}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {INDUSTRIES.map(ind => (
                <button
                  key={ind.value}
                  onClick={() => setIndustry(ind.value)}
                  className={`p-4 rounded-xl border text-left transition-all ${industry === ind.value ? 'border-purple-500 bg-purple-600/20 text-white' : 'border-white/10 bg-white/5 text-gray-400 hover:text-white hover:border-white/20'}`}
                >
                  <span className="text-2xl block mb-2">{ind.icon}</span>
                  <span className="text-sm font-medium">{ind.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!industry}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-colors disabled:opacity-40"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2: Team size */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">How big is your team?</h2>
              <p className="text-sm text-gray-400">We'll tailor features to your scale</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {TEAM_SIZES.map(size => (
                <button
                  key={size.value}
                  onClick={() => setTeamSize(size.value)}
                  className={`p-6 rounded-xl border text-left transition-all ${teamSize === size.value ? 'border-purple-500 bg-purple-600/20' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
                >
                  <span className="text-3xl block mb-3">{size.icon}</span>
                  <p className="text-white font-bold text-lg">{size.label}</p>
                  <p className="text-sm text-gray-400">{size.desc}</p>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="px-6 py-3 bg-white/5 text-gray-400 rounded-xl hover:text-white transition-colors">
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!teamSize}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-colors disabled:opacity-40"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Goals */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">What are your top priorities?</h2>
              <p className="text-sm text-gray-400">Select all that apply — your AI will focus here first</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {GOALS.map(goal => {
                const isSelected = selectedGoals.includes(goal.value)
                return (
                  <button
                    key={goal.value}
                    onClick={() => toggleGoal(goal.value)}
                    className={`p-4 rounded-xl border text-left transition-all flex items-center gap-3 ${isSelected ? 'border-purple-500 bg-purple-600/20 text-white' : 'border-white/10 bg-white/5 text-gray-400 hover:text-white hover:border-white/20'}`}
                  >
                    <span className="text-2xl">{goal.icon}</span>
                    <span className="text-sm font-medium">{goal.label}</span>
                    {isSelected && <span className="ml-auto text-purple-400">✓</span>}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="px-6 py-3 bg-white/5 text-gray-400 rounded-xl hover:text-white transition-colors">
                ← Back
              </button>
              <button
                onClick={finish}
                disabled={saving || selectedGoals.length === 0}
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white rounded-xl font-medium transition-opacity disabled:opacity-40"
              >
                {saving ? 'Setting up your AI...' : '🚀 Launch Kanavu AI'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
