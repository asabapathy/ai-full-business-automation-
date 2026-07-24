'use client'

import { useState, useEffect } from 'react'
import { Award, Plus, TrendingUp, Users, Gift, Crown, Search } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'

interface LoyaltyAccount {
  id: string
  contactId: string
  contact?: { firstName: string; lastName: string; email: string }
  points: number
  lifetimePoints: number
  tier: string
  transactions?: LoyaltyTransaction[]
}

interface LoyaltyTransaction {
  id: string
  points: number
  type: string
  description: string
  createdAt: string
}

interface Stats {
  totalAccounts: number
  totalPointsOutstanding: number
  totalPointsEarned: number
  tierBreakdown: Record<string, number>
}

export default function LoyaltyPage() {
  const [accounts, setAccounts] = useState<LoyaltyAccount[]>([])
  const [leaderboard, setLeaderboard] = useState<LoyaltyAccount[]>([])
  const [stats, setStats] = useState<Stats>({ totalAccounts: 0, totalPointsOutstanding: 0, totalPointsEarned: 0, tierBreakdown: {} })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'accounts' | 'leaderboard'>('leaderboard')
  const [selected, setSelected] = useState<LoyaltyAccount | null>(null)
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ contactId: '', points: '', description: '' })
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [accRes, lbRes, statRes] = await Promise.all([
        apiClient.get('/loyalty/accounts') as any,
        apiClient.get('/loyalty/leaderboard') as any,
        apiClient.get('/loyalty/stats') as any,
      ])
      setAccounts(accRes?.accounts ?? [])
      setLeaderboard(lbRes?.accounts ?? [])
      setStats(statRes ?? stats)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const loadTransactions = async (contactId: string) => {
    try {
      const res = await apiClient.get(`/loyalty/accounts/${contactId}`) as any
      setTransactions(res?.transactions ?? [])
    } catch {}
  }

  const selectAccount = (a: LoyaltyAccount) => {
    setSelected(a)
    loadTransactions(a.contactId)
  }

  const addPoints = async () => {
    if (!addForm.contactId || !addForm.points) return
    try {
      await apiClient.post(`/loyalty/accounts/${addForm.contactId}/add`, {
        points: parseInt(addForm.points),
        description: addForm.description || 'Manual adjustment',
      })
      setShowAdd(false)
      setAddForm({ contactId: '', points: '', description: '' })
      load()
    } catch {}
  }

  const tierColor: Record<string, string> = {
    bronze: 'bg-orange-100 text-orange-700',
    silver: 'bg-gray-100 text-gray-700',
    gold: 'bg-yellow-100 text-yellow-700',
    platinum: 'bg-purple-100 text-purple-700',
  }

  const tierIcon: Record<string, string> = {
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇',
    platinum: '💎',
  }

  const filtered = accounts.filter(a =>
    !search || (a.contact && `${a.contact.firstName} ${a.contact.lastName} ${a.contact.email}`.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Loyalty Program</h1>
          <p className="text-sm text-gray-500 mt-1">Reward your best customers with points and perks</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Add Points
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Members</p>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalAccounts}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Points Earned</p>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalPointsEarned.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Outstanding</p>
            <Gift className="h-4 w-4 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalPointsOutstanding.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Tiers</p>
            <Crown className="h-4 w-4 text-purple-600" />
          </div>
          <div className="flex gap-1 mt-1 flex-wrap">
            {Object.entries(stats.tierBreakdown).map(([tier, count]) => (
              <span key={tier} className={`text-xs rounded-full px-2 py-0.5 ${tierColor[tier] ?? 'bg-gray-100 text-gray-600'}`}>{tierIcon[tier]} {count}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(['leaderboard', 'accounts'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'leaderboard' ? 'Leaderboard' : 'All Members'}
          </button>
        ))}
      </div>

      {tab === 'leaderboard' && (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-900">Top Members</h2>
          </div>
          <div className="divide-y">
            {leaderboard.map((a, i) => (
              <div key={a.id} onClick={() => selectAccount(a)} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer">
                <div className={`text-lg font-bold w-8 text-center ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-gray-300'}`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{a.contact ? `${a.contact.firstName} ${a.contact.lastName}` : a.contactId.slice(0, 8)}</p>
                  <p className="text-xs text-gray-500">{a.contact?.email}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{a.points.toLocaleString()} pts</p>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tierColor[a.tier] ?? 'bg-gray-100 text-gray-600'}`}>
                    {tierIcon[a.tier]} {a.tier}
                  </span>
                </div>
              </div>
            ))}
            {leaderboard.length === 0 && <div className="p-8 text-center text-gray-400">No members yet</div>}
          </div>
        </div>
      )}

      {tab === 'accounts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input className="w-full rounded-lg border border-gray-200 pl-9 pr-4 py-2 text-sm" placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="rounded-xl border bg-white shadow-sm divide-y overflow-hidden">
              {filtered.map(a => (
                <div key={a.id} onClick={() => selectAccount(a)} className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer ${selected?.id === a.id ? 'bg-blue-50' : ''}`}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm">
                    {tierIcon[a.tier]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{a.contact ? `${a.contact.firstName} ${a.contact.lastName}` : a.contactId.slice(0, 8)}</p>
                    <p className="text-xs text-gray-500">{a.contact?.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-gray-900 text-sm">{a.points.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">pts</p>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <div className="p-6 text-center text-gray-400 text-sm">No members</div>}
            </div>
          </div>

          {selected && (
            <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{selected.contact ? `${selected.contact.firstName} ${selected.contact.lastName}` : 'Member'}</h3>
                  <p className="text-sm text-gray-500">{selected.contact?.email}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${tierColor[selected.tier] ?? 'bg-gray-100 text-gray-600'}`}>
                  {tierIcon[selected.tier]} {selected.tier}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Current Points</p>
                  <p className="text-2xl font-bold text-gray-900">{selected.points.toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Lifetime Points</p>
                  <p className="text-2xl font-bold text-gray-900">{selected.lifetimePoints.toLocaleString()}</p>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Recent Transactions</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {transactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-gray-700">{tx.description}</p>
                        <p className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`font-semibold ${tx.type === 'earn' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'earn' ? '+' : '-'}{tx.points}
                      </span>
                    </div>
                  ))}
                  {transactions.length === 0 && <p className="text-xs text-gray-400">No transactions</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Points Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h2 className="font-semibold text-gray-900">Add Points</h2>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contact ID</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Contact UUID" value={addForm.contactId} onChange={e => setAddForm(f => ({ ...f, contactId: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Points</label>
              <input type="number" min="1" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="100" value={addForm.points} onChange={e => setAddForm(f => ({ ...f, points: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Purchase reward" value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={addPoints} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add Points</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
