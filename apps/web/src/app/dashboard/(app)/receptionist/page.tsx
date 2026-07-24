'use client'

import { useState, useEffect } from 'react'
import { PhoneCall, PhoneMissed, Phone, TrendingUp, Clock, MessageSquare, Settings, Copy, CheckCircle } from 'lucide-react'
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

interface WebhookUrls {
  inbound: string
  respond: string
  voicemail: string
  status: string
}

export default function ReceptionistPage() {
  const [tab, setTab] = useState<'calls' | 'setup'>('calls')
  const [calls, setCalls] = useState<CallLog[]>([])
  const [stats, setStats] = useState<CallStats | null>(null)
  const [filter, setFilter] = useState<'all' | 'missed' | 'inbound' | 'outbound'>('all')
  const [loading, setLoading] = useState(true)
  const [webhookUrls, setWebhookUrls] = useState<WebhookUrls | null>(null)
  const [slug, setSlug] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [voiceConfig, setVoiceConfig] = useState({
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioPhoneNumber: '',
    elevenLabsApiKey: '',
    elevenLabsVoiceId: 'Rachel',
    useElevenLabs: false,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const loadCalls = async () => {
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
    loadCalls()
  }, [filter])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await apiClient.get('/voice/settings')
        const data = res as any
        setSlug(data.slug ?? '')
        if (data.slug) {
          const urls = await apiClient.get(`/voice/${data.slug}/webhook-urls`)
          setWebhookUrls(urls as WebhookUrls)
        }
        if (data.config) setVoiceConfig(prev => ({ ...prev, ...data.config }))
      } catch {}
    }
    if (tab === 'setup') loadSettings()
  }, [tab])

  const copyUrl = (url: string, key: string) => {
    navigator.clipboard.writeText(url)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const saveConfig = async () => {
    setSaving(true)
    try {
      await apiClient.post('/voice/settings', voiceConfig)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {}
    setSaving(false)
  }

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Phone Receptionist</h1>
          <p className="text-sm text-gray-500 mt-1">Answer calls 24/7 with AI, log summaries, and never miss a lead</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('calls')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'calls' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Call Log
          </button>
          <button
            onClick={() => setTab('setup')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'setup' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            <Settings className="h-4 w-4" />
            Setup
          </button>
        </div>
      </div>

      {tab === 'calls' && (
        <>
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
        </>
      )}

      {tab === 'setup' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Twilio Configuration</h2>
              <p className="text-sm text-gray-500 mb-4">
                Connect your Twilio account to enable AI call handling. Point your Twilio phone number webhooks to the URLs shown on the right.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Account SID</label>
                  <input
                    type="text"
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={voiceConfig.twilioAccountSid}
                    onChange={e => setVoiceConfig(p => ({ ...p, twilioAccountSid: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Auth Token</label>
                  <input
                    type="password"
                    placeholder="••••••••••••••••••••••••••••••••"
                    value={voiceConfig.twilioAuthToken}
                    onChange={e => setVoiceConfig(p => ({ ...p, twilioAuthToken: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Twilio Phone Number</label>
                  <input
                    type="text"
                    placeholder="+15551234567"
                    value={voiceConfig.twilioPhoneNumber}
                    onChange={e => setVoiceConfig(p => ({ ...p, twilioPhoneNumber: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">ElevenLabs Voice (Optional)</h2>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-gray-500">Enable</span>
                  <div
                    onClick={() => setVoiceConfig(p => ({ ...p, useElevenLabs: !p.useElevenLabs }))}
                    className={`relative w-9 h-5 rounded-full transition-colors ${voiceConfig.useElevenLabs ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${voiceConfig.useElevenLabs ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                </label>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Use ElevenLabs for ultra-realistic AI voice instead of Amazon Polly.
              </p>
              {voiceConfig.useElevenLabs && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">ElevenLabs API Key</label>
                    <input
                      type="password"
                      placeholder="sk-..."
                      value={voiceConfig.elevenLabsApiKey}
                      onChange={e => setVoiceConfig(p => ({ ...p, elevenLabsApiKey: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Voice ID</label>
                    <select
                      value={voiceConfig.elevenLabsVoiceId}
                      onChange={e => setVoiceConfig(p => ({ ...p, elevenLabsVoiceId: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Rachel">Rachel (Female, American)</option>
                      <option value="Drew">Drew (Male, American)</option>
                      <option value="Clyde">Clyde (Male, American)</option>
                      <option value="Bella">Bella (Female, American)</option>
                      <option value="Antoni">Antoni (Male, American)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={saveConfig}
              disabled={saving}
              className="w-full rounded-lg bg-blue-600 text-white py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {saving ? 'Saving...' : saved ? <><CheckCircle className="h-4 w-4" /> Saved!</> : 'Save Configuration'}
            </button>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-2">Twilio Webhook URLs</h2>
            <p className="text-sm text-gray-500 mb-4">
              In your{' '}
              <span className="font-medium text-blue-600">Twilio Console → Phone Numbers → Active Numbers</span>,
              configure these webhook URLs for your phone number:
            </p>
            {webhookUrls ? (
              <div className="space-y-3">
                {[
                  { label: 'Incoming Call (Voice URL)', key: 'inbound', url: webhookUrls.inbound, method: 'HTTP POST' },
                  { label: 'Speech Response', key: 'respond', url: webhookUrls.respond, method: 'HTTP POST' },
                  { label: 'Voicemail / Recording', key: 'voicemail', url: webhookUrls.voicemail, method: 'HTTP POST' },
                  { label: 'Call Status Callback', key: 'status', url: webhookUrls.status, method: 'HTTP POST' },
                ].map(item => (
                  <div key={item.key} className="rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">{item.label}</span>
                      <span className="text-xs text-gray-400">{item.method}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs text-blue-700 bg-blue-50 rounded px-2 py-1 truncate">{item.url}</code>
                      <button
                        onClick={() => copyUrl(item.url, item.key)}
                        className="flex-shrink-0 p-1 rounded hover:bg-gray-200 transition-colors"
                      >
                        {copied === item.key ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                Enter your organization slug and save Twilio credentials to see your webhook URLs.
              </div>
            )}

            <div className="mt-6 rounded-lg bg-blue-50 border border-blue-200 p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Quick Setup Guide</h3>
              <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                <li>Save your Twilio Account SID, Auth Token, and phone number above</li>
                <li>Go to <strong>console.twilio.com → Phone Numbers → Active Numbers</strong></li>
                <li>Click your phone number and set the Voice URL to the Incoming Call webhook</li>
                <li>Test by calling your Twilio number — the AI will answer!</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
