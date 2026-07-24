'use client'

import { useState, useEffect } from 'react'
import { UserPlus, Settings, CheckCircle, Clock, DollarSign, TrendingUp, Users } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'

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

export default function ReferralsPage() {
  const [program, setProgram] = useState<ReferralProgram>({ name: 'Refer a Friend', rewardType: 'cash', rewardValue: 25, rewardCurrency: 'USD', isActive: true })
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, converted: 0, conversionRate: 0, rewardsPaid: 0, rewardsPending: 0 })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'referrals' | 'program'>('referrals')
  const [saving, setSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newForm, setNewForm] = useState({ contactId: '' })

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
    } catch {}
    setSaving(false)
  }

  const createReferral = async () => {
    if (!newForm.contactId) return
    try {
      const res = await apiClient.post('/referrals', newForm) as any
      alert(`Referral code: ${res.referral?.code}`)
      setShowCreate(false)
      setNewForm({ contactId: '' })
      load()
    } catch {}
  }

  const markPaid = async (id: string) => {
    try {
      await apiClient.post(`/referrals/${id}/pay`, {})
      load()
    } catch {}
  }

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    converted: 'bg-green-100 text-green-700',
    expired: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Referral Program</h1>
          <p className="text-sm text-gray-500 mt-1">Grow your business through customer referrals</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <UserPlus className="h-4 w-4" />
          Create Referral
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: Users, color: 'text-gray-600' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-yellow-600' },
          { label: 'Converted', value: stats.converted, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Conv. Rate', value: `${stats.conversionRate.toFixed(0)}%`, icon: TrendingUp, color: 'text-blue-600' },
          { label: 'Rewards Paid', value: `$${stats.rewardsPaid}`, icon: DollarSign, color: 'text-purple-600' },
          { label: 'Pending Rewards', value: `$${stats.rewardsPending}`, icon: DollarSign, color: 'text-orange-600' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">{s.label}</p>
              <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
            </div>
            <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(['referrals', 'program'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'referrals' ? 'Referrals' : 'Program Settings'}
          </button>
        ))}
      </div>

      {tab === 'referrals' && (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : referrals.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No referrals yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Referrer</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Referred</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Reward</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {referrals.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-900">{r.code}</td>
                    <td className="px-4 py-3">
                      {r.referrer ? <><p className="font-medium text-gray-900">{r.referrer.firstName} {r.referrer.lastName}</p><p className="text-xs text-gray-500">{r.referrer.email}</p></> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {r.referred ? <><p className="font-medium text-gray-900">{r.referred.firstName} {r.referred.lastName}</p><p className="text-xs text-gray-500">{r.referred.email}</p></> : <span className="text-gray-400">Not converted</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.status === 'converted' ? (
                        <span className={`text-xs font-medium ${r.rewardPaid ? 'text-green-600' : 'text-orange-600'}`}>
                          {r.rewardPaid ? 'Paid' : 'Pending'}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {r.status === 'converted' && !r.rewardPaid && (
                        <button onClick={() => markPaid(r.id)} className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'program' && (
        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4 max-w-lg">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Settings className="h-4 w-4 text-blue-600" />
            Program Settings
          </h2>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Program Name</label>
            <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={program.name} onChange={e => setProgram(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none" value={program.description ?? ''} onChange={e => setProgram(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Reward Type</label>
              <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={program.rewardType} onChange={e => setProgram(p => ({ ...p, rewardType: e.target.value }))}>
                <option value="cash">Cash</option>
                <option value="discount">Discount</option>
                <option value="points">Points</option>
                <option value="gift_card">Gift Card</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Reward Value</label>
              <input type="number" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={program.rewardValue} onChange={e => setProgram(p => ({ ...p, rewardValue: parseFloat(e.target.value) }))} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Program Active</p>
              <p className="text-xs text-gray-500">Enable referral program for your customers</p>
            </div>
            <button onClick={() => setProgram(p => ({ ...p, isActive: !p.isActive }))} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${program.isActive ? 'bg-blue-600' : 'bg-gray-300'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${program.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <button onClick={saveProgram} disabled={saving} className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h2 className="font-semibold text-gray-900">Create Referral Code</h2>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Referrer Contact ID</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Contact UUID" value={newForm.contactId} onChange={e => setNewForm({ contactId: e.target.value })} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={createReferral} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
