'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { UserCircle, Mail, ArrowRight, CheckCircle } from 'lucide-react'

function PortalLoginForm() {
  const searchParams = useSearchParams()
  const orgId = searchParams.get('org') ?? ''

  const [step, setStep] = useState<'email' | 'otp' | 'done'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const sendOtp = async () => {
    if (!email || !orgId) {
      setError('Missing organization. Use the link provided by your service provider.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/client-portal/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, email }),
      })
      if (!res.ok) throw new Error('Failed to send code')
      setStep('otp')
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
    }
    setLoading(false)
  }

  const verifyOtp = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/client-portal/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, email, otp }),
      })
      const data = await res.json()
      if (!res.ok || !data.token) throw new Error(data.error ?? 'Invalid code')
      localStorage.setItem('portal_token', data.token)
      localStorage.setItem('portal_org', orgId)
      window.location.href = '/portal/dashboard'
    } catch (e: any) {
      setError(e.message ?? 'Invalid code')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 mb-4">
            <UserCircle className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Client Portal</h1>
          <p className="text-gray-500 mt-1 text-sm">View your appointments and invoices</p>
        </div>

        {step === 'email' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendOtp()}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              onClick={sendOtp}
              disabled={loading || !email}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Sending...' : <>Send Code <ArrowRight className="h-4 w-4" /></>}
            </button>
            <p className="text-xs text-center text-gray-400">We'll send a 6-digit code to your email</p>
          </div>
        )}

        {step === 'otp' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Enter the 6-digit code sent to <span className="font-medium">{email}</span>
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && verifyOtp()}
              placeholder="000000"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <button
              onClick={verifyOtp}
              disabled={loading || otp.length < 6}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Verifying...' : <>Verify & Sign In <ArrowRight className="h-4 w-4" /></>}
            </button>
            <button onClick={() => { setStep('email'); setOtp(''); setError('') }} className="w-full text-sm text-gray-500 hover:text-gray-700">
              Use a different email
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PortalLoginPage() {
  return (
    <Suspense>
      <PortalLoginForm />
    </Suspense>
  )
}
