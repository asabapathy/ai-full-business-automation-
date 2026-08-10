'use client'

import { useState, useEffect } from 'react'
import { UserPlus, Settings, CheckCircle, Clock, DollarSign, TrendingUp, Users, Copy } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'

interface ReferralProgram {
  id?: string
  name: string
  rewardType: string
  rewardValue: number
  rewardCurrency: string
  isActive: boolean
  description?: string
}

interface Referral {
  id: string
  code: string
  referrerContactId: string
  referrer?: { firstName: string; lastName: string; email: string }
  referredContactId?: string
  referred?: { firstName: string; lastName: string; email: string }
  status: string
  rewardPaid: boolean
  convertedAt?: string
  createdAt: string
}

interface Stats {
  total: number
  pending: number
  converted: number
  conversionRate: number
  rewardsPaid: number
  rewardsPending: number
}

const STATUS_META: Record<string, { text: string; bg: string }> = {
  pending:   { text: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  converted: { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  expired:   { text: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

export default function ReferralsPage() {
  const [program, setProgram] = useState<ReferralProgram>({ name: 'Refer a Friend', rewardType: 'cash', rewardValue: 25, rewardCurrency: 'USD', isActive: true })
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, converted: 0, conversionRate: 0, rewardsPaid: 0, rewardsPending: 0 })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'referrals' | 'program'>('referrals')
  const [saving, setSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newForm, setNewForm] = useState({ contactId: '' })
  const [createdCode, setCreatedCode] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [progRes, refRes, statRes] = await Promise.all([
        apiClient.get('/referrals/program') as any,
        apiClient.get('/referrals') as any,
        apiClient.get('/referrals/stats') as any,
      ])
      if (progRes?.program) setProgram(progRes.program)
      setReferrals(refRes?.referrals ?? [])
      setStats(statRes ?? stats)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const saveProgram = async () => {
    setSaving(true)
    try {
      await apiClient.put('/referrals/program', program)
      toast('Program settings saved', 'success')
    } catch (e: any) {
      toast(e.message || 'Failed to save', 'error')
    }
    setSaving(false)
  }

  const createReferral = async () => {
    if (!newForm.contactId) return
    try {
      const res = await apiClient.post('/referrals', newForm) as any
      setCreatedCode(res.referral?.code ?? null)
      setShowCreate(false)
      setNewForm({ contactId: '' })
      load()
    } catch (e: any) {
      toast(e.message || 'Failed to create referral', 'error')
    }
  }

  const markPaid = async (id: string) => {
    try {
      await apiClient.post(`/referrals/${id}/pay`, {})
      load()
    } catch {}
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div {...anim(0)} className="kv-anim flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Referral Program</h1>
          <p className="text-sm text-muted-foreground mt-1">Grow your business through customer referrals</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
          <UserPlus className="h-4 w-4" /> Create Referral
        </button>
      </div>

      <div {...anim(1)} className="kv-anim grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: Users, color: '#94a3b8' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: '#fbbf24' },
          { label: 'Converted', value: stats.converted, icon: CheckCircle, color: '#34d399' },
          { label: 'Conv. Rate', value: `${stats.conversionRate.toFixed(0)}%`, icon: TrendingUp, color: '#60a5fa' },
          { label: 'Rewards Paid', value: `$${stats.rewardsPaid}`, icon: DollarSign, color: '#a78bfa' },
          { label: 'Pending Rewards', value: `$${stats.rewardsPending}`, icon: DollarSign, color: '#fb923c' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={cardStyle}>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <s.icon className="h-3.5 w-3.5" style={{ color: s.color }} />
            </div>
            <p className="text-xl font-bold text-foreground mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {createdCode && (
        <div {...anim(2)} className="kv-anim rounded-xl p-4 flex items-center gap-3" style={{ color: '#34d399', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
          <p className="text-sm flex-1">Referral code created: <span className="font-mono font-bold">{createdCode}</span></p>
          <button onClick={() => { navigator.clipboard.writeText(createdCode); toast('Copied!', 'success') }}
            className="p-1.5 rounded hover:bg-muted/20 transition-colors">
            <Copy className="h-4 w-4" />
          </button>
          <button onClick={() => setCreatedCode(null)} className="text-xs opacity-60 hover:opacity-100 transition-opacity">Dismiss</button>
        </div>
      )}

      <div {...anim(3)} className="kv-anim flex gap-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
        {(['referrals', 'program'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2.5 text-sm font-medium transition-colors capitalize"
            style={tab === t
              ? { borderBottom: '2px solid #06b6d4', color: '#06b6d4', marginBottom: '-1px' }
              : { borderBottom: '2px solid transparent', color: 'hsl(var(--muted-foreground))' }}>
            {t === 'referrals' ? 'Referrals' : 'Program Settings'}
          </button>
        ))}
      </div>

      {tab === 'referrals' && (
        <div {...anim(4)} className="kv-anim rounded-xl overflow-hidden" style={cardStyle}>
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : referrals.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No referrals yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'rgba(255,255,255,0.02)' }}>
                    {['Code', 'Referrer', 'Referred', 'Status', 'Reward', 'Date', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((r, i) => {
                    const sm = STATUS_META[r.status] ?? STATUS_META.expired
                    return (
                      <tr key={r.id} style={{ borderBottom: i < referrals.length - 1 ? '1px solid hsl(var(--border))' : undefined }}>
                        <td className="px-4 py-3 font-mono text-sm font-semibold text-foreground">{r.code}</td>
                        <td className="px-4 py-3">
                          {r.referrer
                            ? <><p className="font-medium text-foreground">{r.referrer.firstName} {r.referrer.lastName}</p><p className="text-xs text-muted-foreground">{r.referrer.email}</p></>
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {r.referred
                            ? <><p className="font-medium text-foreground">{r.referred.firstName} {r.referred.lastName}</p><p className="text-xs text-muted-foreground">{r.referred.email}</p></>
                            : <span className="text-muted-foreground">Not converted</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" style={{ color: sm.text, background: sm.bg }}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {r.status === 'converted' ? (
                            <span className="text-xs font-medium" style={{ color: r.rewardPaid ? '#34d399' : '#fb923c' }}>
                              {r.rewardPaid ? 'Paid' : 'Pending'}
                            </span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          {r.status === 'converted' && !r.rewardPaid && (
                            <button onClick={() => markPaid(r.id)}
                              className="text-xs px-2 py-1 rounded-lg font-medium text-white transition-all hover:scale-[1.02]"
                              style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                              Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'program' && (
        <div {...anim(4)} className="kv-anim rounded-xl p-6 space-y-4 max-w-lg" style={cardStyle}>
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Settings className="h-4 w-4" style={{ color: '#06b6d4' }} />
            Program Settings
          </h2>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Program Name</label>
            <input className={inputCls} style={inputStyle} value={program.name} onChange={e => setProgram(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Description</label>
            <textarea rows={2} className={`${inputCls} resize-none`} style={inputStyle} value={program.description ?? ''} onChange={e => setProgram(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Reward Type</label>
              <select className={inputCls} style={inputStyle} value={program.rewardType} onChange={e => setProgram(p => ({ ...p, rewardType: e.target.value }))}>
                <option value="cash">Cash</option>
                <option value="discount">Discount</option>
                <option value="points">Points</option>
                <option value="gift_card">Gift Card</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Reward Value</label>
              <input type="number" className={inputCls} style={inputStyle} value={program.rewardValue} onChange={e => setProgram(p => ({ ...p, rewardValue: parseFloat(e.target.value) }))} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl p-3" style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}>
            <div>
              <p className="text-sm font-medium text-foreground">Program Active</p>
              <p className="text-xs text-muted-foreground">Enable referral program for your customers</p>
            </div>
            <button onClick={() => setProgram(p => ({ ...p, isActive: !p.isActive }))}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              style={{ background: program.isActive ? '#06b6d4' : 'hsl(var(--muted))' }}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${program.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <button onClick={saveProgram} disabled={saving}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <h2 className="font-semibold text-foreground">Create Referral Code</h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Referrer Contact ID</label>
              <input className={inputCls} style={inputStyle} placeholder="Contact UUID" value={newForm.contactId} onChange={e => setNewForm({ contactId: e.target.value })} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button onClick={createReferral} disabled={!newForm.contactId}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
