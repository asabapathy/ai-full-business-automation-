'use client'

import { useState, useEffect } from 'react'
import { ClipboardList, Plus, Send, Trash2, ExternalLink, FileSignature } from 'lucide-react'
import { Button } from '../../../../components/ui/button'
import { apiClient } from '../../../../lib/api-client'

interface Proposal {
  id: string
  title: string
  status: 'DRAFT' | 'SENT' | 'SIGNED'
  totalAmount: number
  createdAt: string
  signedAt?: string
  contact?: { firstName: string; lastName: string; email: string }
}

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ contactId: '', title: '', context: '' })

  useEffect(() => {
    fetchProposals()
  }, [])

  async function fetchProposals() {
    try {
      const data = await apiClient.get('/proposals')
      setProposals(data.proposals ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      await apiClient.post('/proposals', form)
      setShowForm(false)
      setForm({ contactId: '', title: '', context: '' })
      fetchProposals()
    } finally {
      setCreating(false)
    }
  }

  async function handleSend(id: string) {
    await apiClient.post(`/proposals/${id}/send`, {})
    fetchProposals()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this proposal?')) return
    await apiClient.delete(`/proposals/${id}`)
    fetchProposals()
  }

  const statusColor: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    SIGNED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Proposals</h1>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Proposal
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold text-lg">Generate AI Proposal</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Contact ID</label>
              <input
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                placeholder="Contact UUID"
                value={form.contactId}
                onChange={e => setForm(f => ({ ...f, contactId: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                placeholder="Proposal title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Context / Description</label>
              <textarea
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[100px]"
                placeholder="Describe the work, services, and any relevant context for the AI to generate the proposal..."
                value={form.context}
                onChange={e => setForm(f => ({ ...f, context: e.target.value }))}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={creating}>
                {creating ? 'Generating...' : 'Generate Proposal'}
              </Button>
              <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading proposals...</p>
      ) : proposals.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No proposals yet. Generate your first AI-powered proposal.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Title</th>
                <th className="text-left px-4 py-3 font-medium">Client</th>
                <th className="text-left px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {proposals.map(p => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{p.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.contact ? `${p.contact.firstName} ${p.contact.lastName}` : '—'}
                  </td>
                  <td className="px-4 py-3">${(p.totalAmount ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[p.status]}`}>
                      {p.status === 'SIGNED' && <FileSignature className="h-3 w-3" />}
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {p.status === 'DRAFT' && (
                        <Button size="sm" variant="outline" onClick={() => handleSend(p.id)}>
                          <Send className="h-3 w-3 mr-1" />
                          Send
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
