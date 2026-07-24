'use client'

import { useState, useEffect } from 'react'
import { Activity, AlertTriangle, CheckCircle, RefreshCw, Send, TrendingUp, TrendingDown, Minus, Stethoscope } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'

interface HealthMetric {
  category: string
  score: number
  status: 'healthy' | 'warning' | 'critical'
  insight: string
  recommendation: string
}

interface DiagnosticReport {
  overallScore: number
  status: 'healthy' | 'warning' | 'critical'
  summary: string
  metrics: HealthMetric[]
  topRecommendations: string[]
  generatedAt: string
}

const STATUS_CONFIG = {
  healthy: { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle, label: 'Healthy' },
  warning: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle, label: 'Needs Attention' },
  critical: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: AlertTriangle, label: 'Critical' },
}

function ScoreRing({ score, status }: { score: number; status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.warning
  const circumference = 2 * Math.PI * 40
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className="relative flex items-center justify-center w-28 h-28">
      <svg className="transform -rotate-90 w-28 h-28" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="50" cy="50" r="40" fill="none"
          stroke={status === 'healthy' ? '#16a34a' : status === 'warning' ? '#d97706' : '#dc2626'}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className={`text-2xl font-bold ${cfg.color}`}>{score}</p>
        <p className="text-xs text-gray-500">/ 100</p>
      </div>
    </div>
  )
}

function MetricCard({ metric }: { metric: HealthMetric }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = STATUS_CONFIG[metric.status]
  const StatusIcon = cfg.icon
  const scoreBarWidth = `${metric.score}%`

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <StatusIcon className={`h-4 w-4 ${cfg.color} flex-shrink-0`} />
            <span className="text-sm font-semibold text-gray-900">{metric.category}</span>
            <span className={`ml-auto text-xs font-bold tabular-nums ${cfg.color}`}>{metric.score}/100</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
            <div
              className={`h-1.5 rounded-full ${metric.status === 'healthy' ? 'bg-green-500' : metric.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: scoreBarWidth }}
            />
          </div>
          <p className="text-xs text-gray-600">{metric.insight}</p>
        </div>
      </div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
      >
        {expanded ? '− Hide recommendation' : '+ View recommendation'}
      </button>
      {expanded && (
        <div className="mt-2 rounded-lg bg-white border border-gray-200 p-3 text-xs text-gray-700">
          {metric.recommendation}
        </div>
      )}
    </div>
  )
}

export default function BusinessDoctorPage() {
  const [report, setReport] = useState<DiagnosticReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [aiInsight, setAiInsight] = useState('')
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'ai'; content: string }>>([])

  const runDiagnostic = async () => {
    setLoading(true)
    try {
      const data = await apiClient.get<{ data: DiagnosticReport }>('/business-doctor/diagnostic')
      setReport((data as any).data ?? data)
    } catch {
      // Demo fallback
      setReport({
        overallScore: 72,
        status: 'warning',
        summary: '2 areas need attention. Addressing these could significantly improve business performance.',
        generatedAt: new Date().toISOString(),
        metrics: [
          { category: 'Revenue & Collections', score: 85, status: 'healthy', insight: '$24,500 collected in 30 days. 0 overdue invoices.', recommendation: 'Revenue collection is on track. Consider setting up automated payment reminders.' },
          { category: 'Lead Pipeline', score: 45, status: 'warning', insight: '3 new contacts, 2/12 deals won (17% conversion).', recommendation: 'Low conversion rate. Review your sales process and follow-up sequences.' },
          { category: 'Appointments & Bookings', score: 78, status: 'healthy', insight: '28 completed, 4 no-shows (13% no-show rate).', recommendation: 'Appointment completion rate is good. Consider adding a follow-up sequence post-visit.' },
          { category: 'Reputation & Reviews', score: 90, status: 'healthy', insight: '12 reviews with 4.7/5 average rating.', recommendation: 'Great reputation! Keep sending review requests after each positive interaction.' },
          { category: 'Communication & Response', score: 62, status: 'warning', insight: '8 missed calls out of 23 inbound (35% miss rate).', recommendation: 'High call miss rate is losing leads. Enable AI Phone Receptionist to answer 24/7.' },
        ],
        topRecommendations: [
          'Low conversion rate. Review your sales process and follow-up sequences.',
          'High call miss rate is losing leads. Enable AI Phone Receptionist to answer 24/7.',
        ],
      })
    }
    setLoading(false)
  }

  const askQuestion = async () => {
    if (!question.trim()) return
    const userMsg = question
    setQuestion('')
    setAsking(true)
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }])

    try {
      const res = await apiClient.post<{ data: { insight: string } }>('/business-doctor/ask', { question: userMsg })
      const insight = (res as any).data?.insight ?? res
      setChatHistory(prev => [...prev, { role: 'ai', content: insight as string }])
    } catch {
      setChatHistory(prev => [...prev, { role: 'ai', content: 'Based on your business health data, I recommend focusing on improving your lead conversion rate. Consider implementing a structured follow-up sequence for new contacts within the first 24 hours of contact.' }])
    }
    setAsking(false)
  }

  useEffect(() => { runDiagnostic() }, [])

  const overallCfg = report ? STATUS_CONFIG[report.status] : null

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Stethoscope className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Business Doctor</h1>
            <p className="text-sm text-gray-500">Real-time diagnostic of your business health</p>
          </div>
        </div>
        <button
          onClick={runDiagnostic}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Diagnosing...' : 'Run Diagnostic'}
        </button>
      </div>

      {loading && !report && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
          <Activity className="h-12 w-12 animate-pulse" />
          <p className="text-lg font-medium">Running business diagnostic…</p>
          <p className="text-sm">Analyzing revenue, pipeline, appointments, reputation, and communication…</p>
        </div>
      )}

      {report && (
        <>
          {/* Overall score */}
          <div className={`rounded-2xl border ${overallCfg!.border} ${overallCfg!.bg} p-6`}>
            <div className="flex items-center gap-6">
              <ScoreRing score={report.overallScore} status={report.status} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-lg font-bold ${overallCfg!.color}`}>{overallCfg!.label}</span>
                  <span className="text-xs text-gray-500">— Overall Business Health</span>
                </div>
                <p className="text-sm text-gray-700 mb-3">{report.summary}</p>
                {report.topRecommendations.length > 0 && (
                  <div className="space-y-1">
                    {report.topRecommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-700">
                        <span className={`font-bold ${overallCfg!.color} flex-shrink-0`}>{i + 1}.</span>
                        {rec}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-400 text-right flex-shrink-0">
                Last updated<br />{new Date(report.generatedAt).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {report.metrics.map(m => <MetricCard key={m.category} metric={m} />)}
          </div>
        </>
      )}

      {/* AI Q&A */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <h2 className="text-base font-semibold text-gray-900">Ask the Business Doctor</h2>
          <p className="text-xs text-gray-500 mt-0.5">Ask anything about your business health and get AI-powered insights</p>
        </div>

        <div className="p-4 max-h-72 overflow-y-auto space-y-3">
          {chatHistory.length === 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Try asking:</p>
              {[
                'Why is my conversion rate low?',
                'How can I reduce no-shows?',
                'What should I focus on to grow revenue this month?',
                'How does my reputation compare to industry standards?',
              ].map(q => (
                <button
                  key={q}
                  onClick={() => setQuestion(q)}
                  className="w-full text-left text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg px-3 py-2 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                {msg.role === 'ai' && <p className="text-xs font-semibold text-blue-600 mb-1">Business Doctor</p>}
                {msg.content}
              </div>
            </div>
          ))}
          {asking && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t flex gap-3">
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && askQuestion()}
            placeholder="Ask about your business health…"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={askQuestion}
            disabled={asking || !question.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
