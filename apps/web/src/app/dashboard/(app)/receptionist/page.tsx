'use client'

import { useState, useEffect } from 'react'
import { PhoneCall, PhoneMissed, Phone, TrendingUp, Clock, MessageSquare } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'

interface CallLog {
  id: string
  fromNumber: string
  toNumber: string
  direction: string
  status: string
  duration?: number
  summary?: string
  sentiment?: string
  missedAt?: string
  createdAt: string
}

interface CallStats {
  total: number
  missed: number
  inbound: number
  outbound: number
  missedRate: number
  avgDuration: number
}

export default function ReceptionistPage() {
  const [calls, setCalls] = useState<CallLog[]>([])
  const [stats, setStats] = useState<CallStats | null>(null)
  const [filter, setFilter] = useState<'all' | 'missed' | 'inbound' | 'outbound'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [callsRes, statsRes] = await Promise.all([
          apiClient.get(`/call-log?${filter !== 'all' ? (filter === 'missed' ? 'status=no-answer' : `direction=${filter}`) : ''}`),
          apiClient.get('/call-log/stats'),
        ])
        setCalls((callsRes as any).calls ?? [])
        setStats(statsRes as CallStats)
      } catch {}
      setLoading(false)
    }
    load()
  }, [filter])

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '—'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const sentimentColor = (s?: string) => {
    if (s === 'positive') return 'text-green-600'
    if (s === 'negative') return 'text-red-600'
    return 'text-gray-500'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Phone Receptionist</h1>
        <p className="text-sm text-gray-500 mt-1">Call logs, missed call follow-ups, and AI summaries</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Calls', value: stats.total, icon: Phone, color: 'text-blue-600' },
            { label: 'Missed', value: stats.missed, icon: PhoneMissed, color: 'text-red-600' },
            { label: 'Miss Rate', value: `${stats.missedRate}%`, icon: TrendingUp, color: 'text-orange-600' },
            { label: 'Avg Duration', value: formatDuration(stats.avgDuration), icon: Clock, color: 'text-green-600' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-xs text-gray-500">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {(['all', 'missed', 'inbound', 'outbound'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : calls.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No calls found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">From</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Direction</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Summary</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {calls.map(call => (
                <tr key={call.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{call.fromNumber}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${call.direction === 'inbound' ? 'text-blue-600' : 'text-purple-600'}`}>
                      <PhoneCall className="h-3 w-3" />
                      {call.direction}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${call.status === 'no-answer' || call.status === 'missed' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {call.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDuration(call.duration)}</td>
                  <td className="px-4 py-3 max-w-xs">
                    {call.summary ? (
                      <div>
                        <p className="text-gray-700 truncate">{call.summary}</p>
                        <span className={`text-xs ${sentimentColor(call.sentiment)}`}>{call.sentiment}</span>
                      </div>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-400">
                        <MessageSquare className="h-3 w-3" />
                        No summary
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(call.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
