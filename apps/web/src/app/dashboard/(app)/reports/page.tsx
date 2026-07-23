'use client'

import { useState, useEffect } from 'react'
import { FileText, Download, Mail, TrendingUp, Users, Calendar, Star, DollarSign } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

interface ReportData {
  revenue30d: number
  newContacts30d: number
  appointments30d: number
  dealsWon30d: number
  avgReviewRating: number
  totalReviews: number
  topContacts: Array<{ name: string; revenue: number }>
  pipeline: Array<{ stage: string; count: number; value: number }>
}

export default function ReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [emailing, setEmailing] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const token = typeof window !== 'undefined' ? localStorage.getItem('kanavu_token') : null
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    fetch(`${API_BASE}/reports/business`, { headers })
      .then(r => r.json())
      .then((d: { report: ReportData }) => { setReport(d.report); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleDownload = () => {
    window.open(`${API_BASE}/reports/business/html?token=${token}`, '_blank')
  }

  const handleEmail = async () => {
    setEmailing(true)
    await fetch(`${API_BASE}/reports/business/email`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' } })
    setEmailing(false)
    setEmailSent(true)
    setTimeout(() => setEmailSent(false), 3000)
  }

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`

  const stats = report ? [
    { label: 'Revenue (30d)', value: fmt(report.revenue30d), icon: DollarSign, color: 'text-green-400' },
    { label: 'New Contacts', value: report.newContacts30d, icon: Users, color: 'text-blue-400' },
    { label: 'Appointments', value: report.appointments30d, icon: Calendar, color: 'text-purple-400' },
    { label: 'Deals Won', value: report.dealsWon30d, icon: TrendingUp, color: 'text-indigo-400' },
    { label: 'Avg Rating', value: `${report.avgReviewRating} ⭐`, icon: Star, color: 'text-yellow-400' },
    { label: 'Total Reviews', value: report.totalReviews, icon: Star, color: 'text-orange-400' },
  ] : []

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><FileText className="w-6 h-6 text-indigo-400" /> Business Reports</h1>
          <p className="text-gray-400 text-sm mt-1">30-day snapshot of your business performance</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium">
            <Download className="w-4 h-4" /> Download HTML
          </button>
          <button onClick={handleEmail} disabled={emailing} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            <Mail className="w-4 h-4" /> {emailSent ? 'Sent!' : emailing ? 'Sending...' : 'Email Report'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-16">Generating report...</div>
      ) : !report ? (
        <div className="text-center py-16 text-gray-500">Failed to load report.</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-8">
            {stats.map((s, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className={`flex items-center gap-2 text-sm mb-1 ${s.color}`}>
                  <s.icon className="w-4 h-4" /> {s.label}
                </div>
                <div className="text-2xl font-bold text-white">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="font-semibold text-white mb-3">Top Customers (by Revenue)</h2>
              {report.topContacts.length === 0 ? (
                <p className="text-gray-500 text-sm">No paid invoices in the last 30 days.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr><th className="text-left text-gray-500 pb-2">Customer</th><th className="text-right text-gray-500 pb-2">Revenue</th></tr></thead>
                  <tbody>
                    {report.topContacts.map((c, i) => (
                      <tr key={i} className="border-t border-gray-800">
                        <td className="py-2 text-white">{c.name}</td>
                        <td className="py-2 text-right text-green-400">{fmt(c.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="font-semibold text-white mb-3">Sales Pipeline</h2>
              {report.pipeline.length === 0 ? (
                <p className="text-gray-500 text-sm">No active deals.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr><th className="text-left text-gray-500 pb-2">Stage</th><th className="text-right text-gray-500 pb-2">Deals</th><th className="text-right text-gray-500 pb-2">Value</th></tr></thead>
                  <tbody>
                    {report.pipeline.map((p, i) => (
                      <tr key={i} className="border-t border-gray-800">
                        <td className="py-2 text-white">{p.stage}</td>
                        <td className="py-2 text-right text-gray-300">{p.count}</td>
                        <td className="py-2 text-right text-indigo-400">{fmt(p.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
