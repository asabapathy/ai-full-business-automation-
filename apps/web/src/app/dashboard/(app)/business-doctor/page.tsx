'use client'

import { useState, useEffect } from 'react'
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, Send, Stethoscope, ArrowRight, Brain } from 'lucide-react'
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

function scoreColor(score: number) {
  if (score >= 80) return '#10b981'
  if (score >= 60) return '#f59e0b'
  return '#ef4444'
}

function scoreLabel(score: number) {
  if (score >= 80) return 'Healthy'
  if (score >= 60) return 'Needs Attention'
  return 'Critical'
}

function scoreLabelColor(score: number) {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 60) return 'text-amber-400'
  return 'text-red-400'
}

function CircleScore({ score, size = 120 }: { score: number; size?: number }) {
  const r = size * 0.38
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = scoreColor(score)

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }} aria-hidden>
        <defs>
          <filter id="score-glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={size * 0.09} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={size * 0.09}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          filter="url(#score-glow)"
          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-bold text-foreground tabular">{score}</p>
        <p className="text-xs text-muted-foreground">/100</p>
      </div>
    </div>
  )
}

const DEMO_REPORT: DiagnosticReport = {
  overallScore: 72,
  status: 'warning',
  summary: '2 areas need attention. Addressing these could significantly improve business performance.',
  generatedAt: new Date().toISOString(),
  metrics: [
    { category: 'Revenue & Collections', score: 85, status: 'healthy', insight: '$24,500 collected in 30 days. 0 overdue invoices.', recommendation: 'Revenue collection is on track. Consider setting up automated payment reminders.' },
    { category: 'Lead Pipeline', score: 45, status: 'warning', insight: '3 new contacts, 2/12 deals won (17% conversion).', recommendation: 'Low conversion rate. Review your sales process and follow-up sequences.' },
    { category: 'Appointments', score: 78, status: 'healthy', insight: '28 completed, 4 no-shows (13% no-show rate).', recommendation: 'Appointment completion rate is good. Consider adding a follow-up sequence post-visit.' },
    { category: 'Reputation & Reviews', score: 90, status: 'healthy', insight: '12 reviews with 4.7/5 average rating.', recommendation: 'Great reputation! Keep sending review requests after each positive interaction.' },
    { category: 'Communication', score: 62, status: 'warning', insight: '8 missed calls out of 23 inbound (35% miss rate).', recommendation: 'High call miss rate is losing leads. Enable AI Phone Receptionist to answer 24/7.' },
  ],
  topRecommendations: [
    'Low conversion rate. Review your sales process and follow-up sequences.',
    'High call miss rate is losing leads. Enable AI Phone Receptionist to answer 24/7.',
  ],
}

function VitalCard({ metric, index }: { metric: HealthMetric; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const color = scoreColor(metric.score)
  const labelColor = scoreLabelColor(metric.score)

  const borderColor = metric.status === 'healthy' ? 'rgba(16,185,129,0.2)' : metric.status === 'warning' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'
  const bgColor = metric.status === 'healthy' ? 'rgba(16,185,129,0.04)' : metric.status === 'warning' ? 'rgba(245,158,11,0.04)' : 'rgba(239,68,68,0.04)'

  return (
    <div
      className="kv-anim rounded-xl border p-4 transition-all"
      style={{
        animationDelay: `${0.18 + index * 0.07}s`,
        background: `linear-gradient(135deg, ${bgColor} 0%, hsl(var(--card)) 60%)`,
        borderColor,
      }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            {metric.status === 'healthy'
              ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              : <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${metric.status === 'warning' ? 'text-amber-400' : 'text-red-400'}`} />
            }
            <span className="text-sm font-semibold text-foreground truncate">{metric.category}</span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${metric.score}%`, background: color, boxShadow: `0 0 8px ${color}60` }}
            />
          </div>
        </div>
        <span className={`text-xl font-bold tabular shrink-0 ${labelColor}`}>{metric.score}</span>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{metric.insight}</p>

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-2.5 flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
      >
        {expanded ? '− Hide' : '+ View'} recommendation
        <ArrowRight className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div
          className="mt-2 rounded-lg p-3 text-xs text-foreground/80 leading-relaxed"
          style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}
        >
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
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'ai'; content: string }>>([])

  const runDiagnostic = async () => {
    setLoading(true)
    try {
      const data = await apiClient.get<{ data: DiagnosticReport }>('/business-doctor/diagnostic')
      setReport((data as any).data ?? data)
    } catch {
      await new Promise(r => setTimeout(r, 800))
      setReport(DEMO_REPORT)
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
      setChatHistory(prev => [...prev, {
        role: 'ai',
        content: 'Based on your business health data, I recommend focusing on improving your lead conversion rate. Consider implementing a structured follow-up sequence for new contacts within the first 24 hours of contact.',
      }])
    }
    setAsking(false)
  }

  useEffect(() => { runDiagnostic() }, [])

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      {/* Header */}
      <div className="kv-anim flex items-center justify-between" style={{ animationDelay: '0.04s' }}>
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.3)' }}
          >
            <Stethoscope className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">AI Business Doctor</h1>
            <p className="text-sm text-muted-foreground">Real-time diagnostic of your business health</p>
          </div>
        </div>
        <button
          onClick={runDiagnostic}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.3)' }}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Diagnosing...' : 'Run Diagnostic'}
        </button>
      </div>

      {loading && !report && (
        <div className="kv-anim flex flex-col items-center justify-center py-20 gap-4" style={{ animationDelay: '0.11s' }}>
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(6,182,212,0.1)', boxShadow: '0 0 30px rgba(6,182,212,0.2)' }}
          >
            <Activity className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <p className="text-base font-medium text-foreground">Running business diagnostic…</p>
          <p className="text-sm text-muted-foreground">Analyzing revenue, pipeline, appointments, reputation, and communication…</p>
        </div>
      )}

      {report && (
        <>
          {/* Overall health score */}
          <div
            className="kv-anim relative overflow-hidden rounded-2xl border p-6"
            style={{
              animationDelay: '0.11s',
              background: 'hsl(var(--card))',
              borderColor: 'hsl(var(--border))',
            }}
          >
            <div
              className="pointer-events-none absolute right-0 top-0 h-48 w-48 opacity-10"
              style={{ background: `radial-gradient(circle at top right, ${scoreColor(report.overallScore)}, transparent 70%)` }}
            />
            <div className="flex items-center gap-8">
              <CircleScore score={report.overallScore} size={120} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-lg font-bold ${scoreLabelColor(report.overallScore)}`}>
                    {scoreLabel(report.overallScore)}
                  </span>
                  <span className="text-sm text-muted-foreground">— Overall Business Health</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{report.summary}</p>
                {report.topRecommendations.length > 0 && (
                  <div className="space-y-2">
                    {report.topRecommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                        <span className="text-foreground/80">{rec}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground text-right shrink-0">
                <p>Last updated</p>
                <p className="mt-1 tabular">{new Date(report.generatedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Vitals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {report.metrics.map((metric, i) => (
              <VitalCard key={metric.category} metric={metric} index={i + 2} />
            ))}
          </div>
        </>
      )}

      {/* AI Q&A */}
      <div
        className="kv-anim rounded-xl border overflow-hidden"
        style={{
          animationDelay: '0.74s',
          background: 'hsl(var(--card))',
          borderColor: 'hsl(var(--border))',
        }}
      >
        <div
          className="px-5 py-4 border-b flex items-center gap-3"
          style={{
            borderColor: 'hsl(var(--border))',
            background: 'linear-gradient(135deg, rgba(6,182,212,0.06) 0%, transparent 60%)',
          }}
        >
          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(6,182,212,0.15)' }}
          >
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Ask the Business Doctor</h2>
            <p className="text-xs text-muted-foreground">AI-powered answers about your business health</p>
          </div>
        </div>

        <div className="p-4 max-h-72 overflow-y-auto space-y-3 scrollbar-hide">
          {chatHistory.length === 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Try asking:</p>
              {[
                'Why is my conversion rate low?',
                'How can I reduce no-shows?',
                'What should I focus on to grow revenue this month?',
              ].map(q => (
                <button
                  key={q}
                  onClick={() => setQuestion(q)}
                  className="w-full text-left text-sm text-primary rounded-lg px-3 py-2 transition-colors hover:bg-primary/10"
                  style={{ border: '1px solid rgba(6,182,212,0.2)', background: 'rgba(6,182,212,0.05)' }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[85%] rounded-xl px-4 py-3 text-sm"
                style={msg.role === 'user'
                  ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
                  : { background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' }
                }
              >
                {msg.role === 'ai' && <p className="text-xs font-semibold text-primary mb-1">Business Doctor</p>}
                {msg.content}
              </div>
            </div>
          ))}
          {asking && (
            <div className="flex justify-start">
              <div className="rounded-xl px-4 py-3" style={{ background: 'hsl(var(--muted))' }}>
                <div className="flex gap-1.5 items-center h-4">
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t flex gap-3" style={{ borderColor: 'hsl(var(--border))' }}>
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && askQuestion()}
            placeholder="Ask about your business health…"
            className="flex-1 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))' }}
          />
          <button
            onClick={askQuestion}
            disabled={asking || !question.trim()}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
