'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { ThumbsUp, Plus, Send, Trash2, Edit2, Star, BarChart2 } from 'lucide-react'

interface Survey { id: string; name: string; question: string; isActive: boolean; createdAt: string }
interface Stats { total: number; responses: number; avgScore: number; responseRate: number; distribution: Record<string, number> }

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
    } catch (e: any) { alert(e.message) } finally { setSaving(false) }
  }

  async function remove(id: string) {
    if (!confirm('Delete this survey?')) return
    await apiClient.delete(`/csat/${id}`)
    load()
  }

  async function sendSurvey() {
    if (!sendForm.surveyId || !sendForm.contactId) return
    setSending(true)
    try {
      await apiClient.post(`/csat/${sendForm.surveyId}/send`, { contactId: sendForm.contactId })
      setShowSend(false)
      setSendForm({ surveyId: '', contactId: '' })
      alert('Survey sent successfully!')
    } catch (e: any) { alert(e.message) } finally { setSending(false) }
  }

  function edit(s: Survey) {
    setEditTarget(s)
    setForm({ name: s.name, question: s.question })
    setShowCreate(true)
  }

  const scoreColors = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-lime-400', 'bg-green-500']

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CSAT Surveys</h1>
          <p className="text-muted-foreground text-sm mt-1">Customer satisfaction surveys sent via email</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSend(true)}
            className="flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted">
            <Send className="h-4 w-4" /> Send Survey
          </button>
          <button onClick={() => { setEditTarget(null); setForm({ name: '', question: 'How satisfied are you with our service?' }); setShowCreate(true) }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
            <Plus className="h-4 w-4" /> New Survey
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Surveys', value: stats.total, icon: ThumbsUp, color: 'text-purple-500' },
              { label: 'Responses', value: stats.responses, icon: BarChart2, color: 'text-blue-500' },
              { label: 'Avg Score', value: stats.avgScore.toFixed(1) + ' / 5', icon: Star, color: 'text-yellow-500' },
              { label: 'Response Rate', value: stats.responseRate.toFixed(0) + '%', icon: Send, color: 'text-green-500' },
            ].map(s => (
              <div key={s.label} className="bg-card border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-card border rounded-xl p-4">
            <p className="text-sm font-medium mb-3">Score Distribution</p>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map(score => {
                const count = stats.distribution[score] ?? 0
                const pct = stats.responses > 0 ? (count / stats.responses) * 100 : 0
                return (
                  <div key={score} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-4">{score}</span>
                    <Star className="h-3.5 w-3.5 text-yellow-400" />
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div className={`h-2 rounded-full ${scoreColors[score]}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : surveys.length === 0 ? (
          <div className="p-12 text-center">
            <ThumbsUp className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No surveys yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                {['Name', 'Question', 'Created', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {surveys.map(s => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{s.question}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => edit(s)} className="p-1.5 rounded hover:bg-muted">
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button onClick={() => { setSendForm({ surveyId: s.id, contactId: '' }); setShowSend(true) }}
                        className="p-1.5 rounded hover:bg-muted">
                        <Send className="h-4 w-4 text-blue-500" />
                      </button>
                      <button onClick={() => remove(s.id)} className="p-1.5 rounded hover:bg-muted">
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold">{editTarget ? 'Edit Survey' : 'New Survey'}</h2>
            <div>
              <label className="text-sm font-medium block mb-1">Survey Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Post-service survey"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Question</label>
              <textarea value={form.question} onChange={e => setForm({ ...form, question: e.target.value })}
                rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 border rounded-lg py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={save} disabled={saving || !form.name}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSend && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold">Send Survey</h2>
            <div>
              <label className="text-sm font-medium block mb-1">Survey</label>
              <select value={sendForm.surveyId} onChange={e => setSendForm({ ...sendForm, surveyId: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">Select a survey…</option>
                {surveys.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Contact ID</label>
              <input value={sendForm.contactId} onChange={e => setSendForm({ ...sendForm, contactId: e.target.value })}
                placeholder="UUID of the contact"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowSend(false)} className="flex-1 border rounded-lg py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={sendSurvey} disabled={sending || !sendForm.surveyId || !sendForm.contactId}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                {sending ? 'Sending…' : 'Send Survey'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
