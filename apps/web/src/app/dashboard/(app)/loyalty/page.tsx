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

  const tierStyle: Record<string, React.CSSProperties> = {
    bronze: { background: 'rgba(251,146,60,0.15)', color: '#fb923c' },
    silver: { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' },
    gold: { background: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
    platinum: { background: 'rgba(168,85,247,0.15)', color: '#a78bfa' },
  }

  const tierFallbackStyle: React.CSSProperties = { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }

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
          <h1 className="text-2xl font-bold text-foreground">Loyalty Program</h1>
          <p className="text-sm text-muted-foreground mt-1">Reward your best customers with points and perks</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium" style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }}>
          <Plus className="h-4 w-4" />
          Add Points
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border p-4" style={{ background: 'hsl(var(--card))' }}>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Members</p>
            <Users className="h-4 w-4" style={{ color: '#06b6d4' }} />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{stats.totalAccounts}</p>
        </div>
        <div className="rounded-xl border p-4" style={{ background: 'hsl(var(--card))' }}>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Points Earned</p>
            <TrendingUp className="h-4 w-4" style={{ color: '#34d399' }} />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{stats.totalPointsEarned.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border p-4" style={{ background: 'hsl(var(--card))' }}>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Outstanding</p>
            <Gift className="h-4 w-4" style={{ color: '#fb923c' }} />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{stats.totalPointsOutstanding.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border p-4" style={{ background: 'hsl(var(--card))' }}>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Tiers</p>
            <Crown className="h-4 w-4" style={{ color: '#a78bfa' }} />
          </div>
          <div className="flex gap-1 mt-1 flex-wrap">
            {Object.entries(stats.tierBreakdown).map(([tier, count]) => (
              <span key={tier} className="text-xs rounded-full px-2 py-0.5" style={tierStyle[tier] ?? tierFallbackStyle}>{tierIcon[tier]} {count}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(['leaderboard', 'accounts'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
            {t === 'leaderboard' ? 'Leaderboard' : 'All Members'}
          </button>
        ))}
      </div>

      {tab === 'leaderboard' && (
        <div className="rounded-xl border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
          <div className="p-4 border-b">
            <h2 className="font-semibold text-foreground">Top Members</h2>
          </div>
          <div className="divide-y">
            {leaderboard.map((a, i) => (
              <div key={a.id} onClick={() => selectAccount(a)} className="flex items-center gap-4 px-4 py-3 hover:bg-muted cursor-pointer">
                <div className="text-lg font-bold w-8 text-center" style={{ color: i === 0 ? '#fbbf24' : i === 1 ? 'hsl(var(--muted-foreground))' : i === 2 ? '#fb923c' : 'hsl(var(--muted-foreground))' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{a.contact ? `${a.contact.firstName} ${a.contact.lastName}` : a.contactId.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{a.contact?.email}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-foreground">{a.points.toLocaleString()} pts</p>
                  <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" style={tierStyle[a.tier] ?? tierFallbackStyle}>
                    {tierIcon[a.tier]} {a.tier}
                  </span>
                </div>
              </div>
            ))}
            {leaderboard.length === 0 && <div className="p-8 text-center text-muted-foreground">No members yet</div>}
          </div>
        </div>
      )}

      {tab === 'accounts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                className="w-full rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                placeholder="Search members..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="rounded-xl border divide-y overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
              {filtered.map(a => (
                <div
                  key={a.id}
                  onClick={() => selectAccount(a)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted cursor-pointer"
                  style={selected?.id === a.id ? { background: 'rgba(6,182,212,0.1)' } : undefined}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm" style={{ background: 'rgba(168,85,247,0.15)' }}>
                    {tierIcon[a.tier]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{a.contact ? `${a.contact.firstName} ${a.contact.lastName}` : a.contactId.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">{a.contact?.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-foreground text-sm">{a.points.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">pts</p>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">No members</div>}
            </div>
          </div>

          {selected && (
            <div className="rounded-xl border p-5 space-y-4" style={{ background: 'hsl(var(--card))' }}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{selected.contact ? `${selected.contact.firstName} ${selected.contact.lastName}` : 'Member'}</h3>
                  <p className="text-sm text-muted-foreground">{selected.contact?.email}</p>
                </div>
                <span className="rounded-full px-3 py-1 text-sm font-medium" style={tierStyle[selected.tier] ?? tierFallbackStyle}>
                  {tierIcon[selected.tier]} {selected.tier}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg p-3" style={{ background: 'hsl(var(--muted))' }}>
                  <p className="text-xs text-muted-foreground">Current Points</p>
                  <p className="text-2xl font-bold text-foreground">{selected.points.toLocaleString()}</p>
                </div>
                <div className="rounded-lg p-3" style={{ background: 'hsl(var(--muted))' }}>
                  <p className="text-xs text-muted-foreground">Lifetime Points</p>
                  <p className="text-2xl font-bold text-foreground">{selected.lifetimePoints.toLocaleString()}</p>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Recent Transactions</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {transactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-muted-foreground">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className="font-semibold" style={{ color: tx.type === 'earn' ? '#34d399' : '#f87171' }}>
                        {tx.type === 'earn' ? '+' : '-'}{tx.points}
                      </span>
                    </div>
                  ))}
                  {transactions.length === 0 && <p className="text-xs text-muted-foreground">No transactions</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Points Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="rounded-2xl p-6 w-full max-w-md space-y-4" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            <h2 className="font-semibold text-foreground">Add Points</h2>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Contact ID</label>
              <input
                className="w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                placeholder="Contact UUID"
                value={addForm.contactId}
                onChange={e => setAddForm(f => ({ ...f, contactId: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Points</label>
              <input
                type="number"
                min="1"
                className="w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                placeholder="100"
                value={addForm.points}
                onChange={e => setAddForm(f => ({ ...f, points: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
              <input
                className="w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                placeholder="Purchase reward"
                value={addForm.description}
                onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-muted-foreground">Cancel</button>
              <button onClick={addPoints} className="px-4 py-2 text-sm rounded-lg" style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }}>Add Points</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
