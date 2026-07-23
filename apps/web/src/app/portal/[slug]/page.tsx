'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'

interface OrgInfo {
  id: string
  name: string
  slug: string
  logoUrl?: string
  phone?: string
  email?: string
  website?: string
  industry: string
}

export default function PortalPage() {
  const { slug } = useParams() as { slug: string }
  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/portal/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setOrg(data.data.org)
        else setNotFound(true)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound || !org) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-5xl">🏢</div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Business not found</h1>
        <p className="text-gray-500">The business portal you&apos;re looking for doesn&apos;t exist.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          {org.logoUrl ? (
            <img src={org.logoUrl} alt={org.name} className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
              {org.name[0]}
            </div>
          )}
          <div>
            <h1 className="font-bold text-xl text-gray-900 dark:text-white">{org.name}</h1>
            <p className="text-sm text-gray-500 capitalize">{org.industry.toLowerCase().replace('_', ' ')}</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Welcome to {org.name}
          </h2>
          <p className="text-gray-500 text-lg">How can we help you today?</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <Link
            href={`/portal/${slug}/book`}
            className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center hover:border-blue-400 hover:shadow-lg transition-all duration-200"
          >
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Book an Appointment</h3>
            <p className="text-gray-500 text-sm">Schedule a service or consultation with us</p>
            <div className="mt-4 text-blue-600 dark:text-blue-400 text-sm font-medium group-hover:underline">
              View availability →
            </div>
          </Link>

          <Link
            href={`/portal/${slug}/invoices`}
            className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center hover:border-blue-400 hover:shadow-lg transition-all duration-200"
          >
            <div className="text-4xl mb-4">🧾</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Pay an Invoice</h3>
            <p className="text-gray-500 text-sm">View and pay your outstanding invoices</p>
            <div className="mt-4 text-blue-600 dark:text-blue-400 text-sm font-medium group-hover:underline">
              Enter invoice link →
            </div>
          </Link>
        </div>

        {/* Contact info */}
        {(org.phone || org.email) && (
          <div className="mt-12 text-center border-t border-gray-200 dark:border-gray-700 pt-8">
            <p className="text-gray-500 text-sm mb-3">Need help? Contact us</p>
            <div className="flex items-center justify-center gap-6 flex-wrap">
              {org.phone && (
                <a href={`tel:${org.phone}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  📞 {org.phone}
                </a>
              )}
              {org.email && (
                <a href={`mailto:${org.email}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  ✉️ {org.email}
                </a>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-8 text-xs text-gray-400">
        Powered by <span className="font-medium">Kanavu AI</span>
      </footer>
    </div>
  )
}
