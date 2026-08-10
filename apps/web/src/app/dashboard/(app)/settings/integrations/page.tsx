'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../../lib/api-client'
import { toast } from '../../../../../lib/toast'

import { CheckCircle, XCircle, AlertCircle, RefreshCw, ExternalLink, Zap, Mail, Calendar, Phone, CreditCard } from 'lucide-react'

interface Integration {
  id: string
  name: string
  description: string
  status: 'connected' | 'disconnected' | 'error'
  connectedAt?: string
  lastTestedAt?: string
  icon: React.ReactNode
  accentColor: string
  connectUrl?: string
  testEndpoint?: string
}

const STATUS_META: Record<string, { text: string; bg: string; label: string }> = {
  connected:    { text: '#34d399', bg: 'rgba(52,211,153,0.12)',  label: 'Connected' },
  disconnected: { text: '#94a3b8', bg: 'rgba(148,163,184,0.12)', label: 'Not Connected' },
  error:        { text: '#f87171', bg: 'rgba(248,113,113,0.12)', label: 'Error' },
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

function StatusChip({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META['disconnected']!
  const Icon = status === 'connected' ? CheckCircle : status === 'error' ? AlertCircle : XCircle
  return (
    <span
      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
      style={{ color: meta.text, background: meta.bg }}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  )
}

export default function IntegrationsPage() {
  const [statuses, setStatuses] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null)

  const INTEGRATIONS: Integration[] = [
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Accept payments, manage invoices, and create payment links via Stripe.',
      status: (statuses['stripe'] as any) ?? 'disconnected',
      accentColor: '#635bff',
      icon: <CreditCard className="h-6 w-6" style={{ color: '#635bff' }} />,
      testEndpoint: '/integrations/stripe/test',
    },
    {
      id: 'google_calendar',
      name: 'Google Calendar',
      description: 'Sync appointments and bookings directly with Google Calendar.',
      status: (statuses['google_calendar'] as any) ?? 'disconnected',
      accentColor: '#4285f4',
      icon: <Calendar className="h-6 w-6" style={{ color: '#4285f4' }} />,
      testEndpoint: '/integrations/google_calendar/test',
    },
    {
      id: 'gmail',
      name: 'Gmail',
      description: 'Send emails and track conversations from your Gmail account.',
      status: (statuses['gmail'] as any) ?? 'disconnected',
      accentColor: '#ea4335',
      icon: <Mail className="h-6 w-6" style={{ color: '#ea4335' }} />,
      testEndpoint: '/integrations/gmail/test',
    },
    {
      id: 'twilio',
      name: 'Twilio',
      description: 'Send SMS messages and make automated phone calls via Twilio.',
      status: (statuses['twilio'] as any) ?? 'disconnected',
      accentColor: '#f22f46',
      icon: <Phone className="h-6 w-6" style={{ color: '#f22f46' }} />,
      testEndpoint: '/integrations/twilio/test',
    },
  ]

  useEffect(() => {
    apiClient.get('/integrations/status')
      .then((data: any) => {
        if (data?.statuses) setStatuses(data.statuses)
      })
      .catch(() => {
        setStatuses({ stripe: 'connected', google_calendar: 'disconnected', gmail: 'error', twilio: 'disconnected' })
      })
      .finally(() => setLoading(false))
  }, [])

  const handleTest = async (integration: Integration) => {
    if (!integration.testEndpoint) return
    setTestingId(integration.id)
    try {
      await apiClient.post(integration.testEndpoint, {})
      setStatuses(prev => ({ ...prev, [integration.id]: 'connected' }))
      toast(`${integration.name} connection verified`, 'success')
    } catch {
      setStatuses(prev => ({ ...prev, [integration.id]: 'error' }))
      toast(`${integration.name} connection failed`, 'error')
    } finally {
      setTestingId(null)
    }
  }

  const handleDisconnect = async (integration: Integration) => {
    setDisconnectingId(integration.id)
    try {
      await apiClient.post(`/integrations/${integration.id}/disconnect`, {})
      setStatuses(prev => ({ ...prev, [integration.id]: 'disconnected' }))
      toast(`${integration.name} disconnected`, 'success')
    } catch {
      toast(`Failed to disconnect ${integration.name}`, 'error')
    } finally {
      setDisconnectingId(null)
    }
  }

  const handleConnect = async (integration: Integration) => {
    try {
      const data = await apiClient.get(`/integrations/${integration.id}/oauth-url`) as any
      if (data?.url) {
        window.location.href = data.url
      } else {
        toast('OAuth URL unavailable — configure in settings', 'error')
      }
    } catch {
      toast('Connect via your admin settings to set up credentials', 'error')
    }
  }

  const connected = INTEGRATIONS.filter(i => (statuses[i.id] ?? 'disconnected') === 'connected').length

  return (
    <div className="p-6 space-y-6 max-w-[900px]">
      {/* Header */}
      <div {...anim(0)} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Connect your tools to power your business automation</p>
        </div>
        <div
          className="kv-anim flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
          style={{ ...cardStyle, animationDelay: '0.1s' }}
        >
          <Zap className="h-4 w-4" style={{ color: '#fbbf24' }} />
          <span className="text-foreground font-medium tabular">{loading ? '—' : connected}</span>
          <span className="text-muted-foreground">/ {INTEGRATIONS.length} connected</span>
        </div>
      </div>

      {/* Integration cards */}
      <div className="space-y-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-lg animate-pulse" style={{ background: 'hsl(var(--muted))', animationDelay: `${0.11 + i * 0.07}s` }} />
            ))
          : INTEGRATIONS.map((integration, i) => {
              const status = statuses[integration.id] ?? 'disconnected'
              const isTesting = testingId === integration.id
              const isDisconnecting = disconnectingId === integration.id
              return (
                <div
                  key={integration.id}
                  className="kv-anim rounded-xl border p-5"
                  style={{ ...cardStyle, animationDelay: `${0.11 + i * 0.07}s` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {/* Icon */}
                      <div
                        className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ background: `${integration.accentColor}18`, border: `1px solid ${integration.accentColor}30` }}
                      >
                        {integration.icon}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1">
                          <h2 className="text-sm font-semibold text-foreground">{integration.name}</h2>
                          <StatusChip status={status} />
                        </div>
                        <p className="text-sm text-muted-foreground">{integration.description}</p>
                        {status === 'connected' && integration.connectedAt && (
                          <p className="text-xs text-muted-foreground/60 mt-1">
                            Connected {new Date(integration.connectedAt).toLocaleDateString()}
                          </p>
                        )}
                        {status === 'error' && (
                          <p className="text-xs mt-1" style={{ color: '#f87171' }}>
                            Connection error — click Test to re-verify or re-connect.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {status === 'connected' || status === 'error' ? (
                        <>
                          <button
                            onClick={() => handleTest(integration)}
                            disabled={isTesting}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid hsl(var(--border))' }}
                          >
                            <RefreshCw className={`h-3 w-3 ${isTesting ? 'animate-spin' : ''}`} />
                            {isTesting ? 'Testing…' : 'Test'}
                          </button>
                          <button
                            onClick={() => handleDisconnect(integration)}
                            disabled={isDisconnecting}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                            style={{ color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}
                          >
                            {isDisconnecting ? 'Removing…' : 'Disconnect'}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleConnect(integration)}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:scale-[1.02]"
                          style={{ background: `linear-gradient(135deg, ${integration.accentColor}, ${integration.accentColor}cc)` }}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
        }
      </div>

      {/* Footer note */}
      <div
        {...anim(6)}
        className="kv-anim rounded-xl p-4 text-sm text-muted-foreground"
        style={{ ...cardStyle, animationDelay: '0.53s', borderStyle: 'dashed' }}
      >
        <span className="font-medium text-foreground">Need another integration?</span> Additional connectors like QuickBooks, Zapier, and Webhooks can be configured under{' '}
        <a
          href="/dashboard/settings"
          className="underline decoration-dotted hover:text-foreground transition-colors"
          style={{ color: '#06b6d4' }}
        >
          General Settings
        </a>.
      </div>
    </div>
  )
}
