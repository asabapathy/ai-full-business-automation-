'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'
import { ThumbsUp, Plus, Send, Trash2, Edit2, Star, BarChart2 } from 'lucide-react'

interface Survey { id: string; name: string; question: string; isActive: boolean; createdAt: string }
interface Stats { total: number; responses: number; avgScore: number; responseRate: number; distribution: Record<string, number> }

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const SCORE_COLORS: Record<number, string> = {
  1: '#f87171',
  2: '#fb923c',
  3: '#fbbf24',
  4: '#a3e635',
  5: '#34d399',
}

export default function CsatPage() {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<Survey | null>(null)
  const [form, setForm] = useState({ name: '', question: 'How satisfied are you with our service?' })
  const [saving, setSaving] = useState(false)
  const [sendForm, setSendForm] = useState({ surveyId: '', contactId: '' })
  const [showSend, setShowSend] = useState(false)
  const [sending, setSending] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [sRes, stRes] = await Promise.all([
        apiClient.get<{ surveys: Survey[] }>('/csat'),
        apiClient.get<Stats>('/csat/stats'),
      ])
      setSurveys(sRes.surveys)
      setStats(stRes)
    } catch {
      setSurveys([])
    } finally { setLoading(false) }
  }

  async function save() {
    if (!form.name || !form.question) return
    setSaving(true)
    try {
      if (editTarget) {
        await apiClient.put(`/csat/${editTarget.id}`, form)
      } else {
        await apiClient.post('/csat', form)
      }
      setShowCreate(false)
      setEditTarget(null)
      setForm({ name: '', question: 'How satisfied are you with our service?' })
      load()
    } catch (e: any) {
      toast(e.message || 'Failed to save survey', 'error')
    } finally { setSaving(false) }
  }

  async function remove(id: string) {
    setDeletingId(id)
    setSurveys(prev => prev.filter(s => s.id !== id))
    try {
      await apiClient.delete(`/csat/${id}`)
    } catch (e: any) {
      toast(e.message || 'Failed to delete survey', 'error')
      load()
    } finally { setDeletingId(null) }
  }

  async function sendSurvey() {
    if (!sendForm.surveyId || !sendForm.contactId) return
    setSending(true)
    try {
      await apiClient.post(`/csat/${sendForm.surveyId}/send`, { contactId: sendForm.contactId })
      setShowSend(false)
      setSendForm({ surveyId: '', contactId: '' })
      toast('Survey sent successfully', 'success')
    } catch (e: any) {
      toast(e.message || 'Failed to send survey', 'error')
    } finally { setSending(false) }
  }

  function edit(s: Survey) {
    setEditTarget(s)
    setForm({ name: s.name, question: s.question })
    setShowCreate(true)
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div {...anim(0)} className="kv-anim flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CSAT Surveys</h1>
          <p className="text-muted-foreground text-sm mt-1">Customer satisfaction surveys sent via email</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSend(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            style={{ border: '1px solid hsl(var(--border))' }}>
            <Send className="h-4 w-4" /> Send Survey
          </button>
          <button onClick={() => { setEditTarget(null); setForm({ name: '', question: 'How satisfied are you with our service?' }); setShowCreate(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
            <Plus className="h-4 w-4" /> New Survey
          </button>
        </div>
      </div>

      {stats && (
        <div {...anim(1)} className="kv-anim grid md:grid-cols-2 gap-6">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Surveys', value: stats.total, icon: ThumbsUp, color: '#a78bfa' },
              { label: 'Responses', value: stats.responses, icon: BarChart2, color: '#60a5fa' },
              { label: 'Avg Score', value: stats.avgScore.toFixed(1) + ' / 5', icon: Star, color: '#fbbf24' },
              { label: 'Response Rate', value: stats.responseRate.toFixed(0) + '%', icon: Send, color: '#34d399' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-4" style={cardStyle}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <s.icon className="h-4 w-4" style={{ color: s.color }} />
                </div>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl p-4" style={cardStyle}>
            <p className="text-sm font-medium text-foreground mb-3">Score Distribution</p>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map(score => {
                const count = stats.distribution[score] ?? 0
                const pct = stats.responses > 0 ? (count / stats.responses) * 100 : 0
                return (
                  <div key={score} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground w-4">{score}</span>
                    <Star className="h-3.5 w-3.5" style={{ color: '#fbbf24' }} />
                    <div className="flex-1 rounded-full h-2" style={{ background: 'hsl(var(--background))' }}>
                      <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: SCORE_COLORS[score] }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div {...anim(2)} className="kv-anim rounded-xl overflow-hidden" style={cardStyle}>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : surveys.length === 0 ? (
          <div className="p-12 text-center">
            <ThumbsUp className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No surveys yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'rgba(255,255,255,0.02)' }}>
                  {['Name', 'Question', 'Created', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {surveys.map((s, i) => (
                  <tr key={s.id} style={{ borderBottom: i < surveys.length - 1 ? '1px solid hsl(var(--border))' : undefined }}>
                    <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{s.question}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => edit(s)} className="p-1.5 rounded transition-colors hover:text-foreground text-muted-foreground">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => { setSendForm({ surveyId: s.id, contactId: '' }); setShowSend(true) }}
                          className="p-1.5 rounded transition-colors hover:text-primary text-muted-foreground">
                          <Send className="h-4 w-4" />
                        </button>
                        <button onClick={() => remove(s.id)} disabled={deletingId === s.id}
                          className="p-1.5 rounded transition-colors" style={{ color: '#f87171' }}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <h2 className="text-lg font-bold text-foreground">{editTarget ? 'Edit Survey' : 'New Survey'}</h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Survey Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Post-service survey"
                className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Question</label>
              <textarea value={form.question} onChange={e => setForm({ ...form, question: e.target.value })}
                rows={3}
                className={`${inputCls} resize-none`} style={inputStyle} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button onClick={save} disabled={saving || !form.name}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <h2 className="text-lg font-bold text-foreground">Send Survey</h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Survey</label>
              <select value={sendForm.surveyId} onChange={e => setSendForm({ ...sendForm, surveyId: e.target.value })}
                className={inputCls} style={inputStyle}>
                <option value="">Select a survey…</option>
                {surveys.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Contact ID</label>
              <input value={sendForm.contactId} onChange={e => setSendForm({ ...sendForm, contactId: e.target.value })}
                placeholder="UUID of the contact"
                className={inputCls} style={inputStyle} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowSend(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button onClick={sendSurvey} disabled={sending || !sendForm.surveyId || !sendForm.contactId}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                {sending ? 'Sending…' : 'Send Survey'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
