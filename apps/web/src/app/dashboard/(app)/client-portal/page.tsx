'use client'

import { useState } from 'react'
import { UserCircle, Link2, Copy, Check } from 'lucide-react'

export default function ClientPortalPage() {
  const [copied, setCopied] = useState(false)
  const webUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const portalUrl = `${webUrl}/portal/login`

  const copyLink = () => {
    navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Client Portal</h1>
        <p className="text-sm text-gray-500 mt-1">Self-service portal for your clients to view appointments and invoices</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Secure OTP Login', desc: 'Clients log in with a one-time code sent to their email — no password needed.' },
          { title: 'Appointment History', desc: 'Clients can view all their past and upcoming appointments.' },
          { title: 'Invoice Access', desc: 'Clients can view and download their invoices at any time.' },
        ].map(f => (
          <div key={f.title} className="rounded-xl border bg-white p-5 shadow-sm">
            <UserCircle className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-semibold text-gray-900">{f.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-blue-600" />
          Portal Link
        </h2>
        <p className="text-sm text-gray-500 mb-3">Share this link with your clients so they can access their portal:</p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={portalUrl}
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 font-mono"
          />
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-3">How It Works</h2>
        <ol className="space-y-3">
          {[
            'Client visits the portal link and enters their email address.',
            'They receive a 6-digit OTP code via email (expires in 10 minutes).',
            'After entering the code, they can view their appointments and invoices.',
            'Sessions are valid for 30 days for convenience.',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
