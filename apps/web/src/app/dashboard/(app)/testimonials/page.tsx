'use client'

import { useState, useEffect } from 'react'
import { Video, Plus, Share2, Trash2, Star, QrCode } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'

interface Testimonial {
  id: string
  token: string
  status: string
  videoUrl?: string
  thumbnailUrl?: string
  summary?: string
  rating?: number
  isPublished: boolean
  publishedTo: string[]
  createdAt: string
  contact?: { firstName: string; lastName: string }
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const STATUS_META: Record<string, { text: string; bg: string }> = {
  pending:   { text: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  submitted: { text: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  published: { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
}

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState({ contactId: '', appointmentId: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [publishTarget, setPublishTarget] = useState<{ id: string; platforms: string[] } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { fetchTestimonials() }, [])

  async function fetchTestimonials() {
    try {
      const data = await apiClient.get('/testimonials') as any
      setTestimonials(data.testimonials ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      await apiClient.post('/testimonials/request', createForm)
      setShowCreate(false)
      setCreateForm({ contactId: '', appointmentId: '' })
      fetchTestimonials()
    } catch (e: any) {
      toast(e.message || 'Failed to create request', 'error')
    } finally {
      setCreating(false)
    }
  }

  async function handlePublish(id: string, platforms: string[]) {
    try {
      await apiClient.post(`/testimonials/${id}/publish`, { platforms })
      setPublishTarget(null)
      fetchTestimonials()
    } catch (e: any) {
      toast(e.message || 'Failed to publish', 'error')
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    setTestimonials(prev => prev.filter(t => t.id !== id))
    try {
      await apiClient.delete(`/testimonials/${id}`)
    } catch (e: any) {
      toast(e.message || 'Failed to delete', 'error')
      fetchTestimonials()
    } finally { setDeletingId(null) }
  }

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <div {...anim(0)} className="kv-anim flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Video className="h-6 w-6" style={{ color: '#06b6d4' }} />
          <h1 className="text-2xl font-bold text-foreground">Video Testimonials</h1>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
          <Plus className="h-4 w-4" /> Request Testimonial
        </button>
      </div>

      {showCreate && (
        <div {...anim(1)} className="kv-anim rounded-xl p-6 space-y-4" style={cardStyle}>
          <h2 className="font-semibold text-foreground">Request Video Testimonial</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Contact ID (optional)</label>
              <input className={inputCls} style={inputStyle} placeholder="Contact UUID"
                value={createForm.contactId} onChange={e => setCreateForm(f => ({ ...f, contactId: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Appointment ID (optional)</label>
              <input className={inputCls} style={inputStyle} placeholder="Appointment UUID"
                value={createForm.appointmentId} onChange={e => setCreateForm(f => ({ ...f, appointmentId: e.target.value }))} />
            </div>
            <div className="col-span-2 flex gap-2">
              <button type="submit" disabled={creating}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                {creating ? 'Creating…' : 'Create Request'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                style={{ border: '1px solid hsl(var(--border))' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div {...anim(2)} className="kv-anim text-center text-muted-foreground py-8">Loading testimonials…</div>
      ) : testimonials.length === 0 ? (
        <div {...anim(2)} className="kv-anim rounded-xl p-12 text-center text-muted-foreground" style={cardStyle}>
          <Video className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No testimonials yet. Send video capture requests to your clients.</p>
        </div>
      ) : (
        <div {...anim(2)} className="kv-anim grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {testimonials.map(t => {
            const sm = STATUS_META[t.status] ?? STATUS_META.pending
            return (
              <div key={t.id} className="rounded-xl overflow-hidden" style={cardStyle}>
                {t.videoUrl ? (
                  <div className="aspect-video" style={{ background: '#000' }}>
                    <video src={t.videoUrl} className="w-full h-full object-cover" controls />
                  </div>
                ) : (
                  <div className="aspect-video flex items-center justify-center" style={{ background: 'hsl(var(--muted))' }}>
                    {t.status === 'pending' ? (
                      <div className="text-center">
                        <QrCode className="h-8 w-8 mx-auto mb-2 opacity-40 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Awaiting response</p>
                      </div>
                    ) : (
                      <Video className="h-8 w-8 opacity-30 text-muted-foreground" />
                    )}
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm text-foreground">
                      {t.contact ? `${t.contact.firstName} ${t.contact.lastName}` : 'Anonymous'}
                    </p>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ color: sm.text, background: sm.bg }}>
                      {t.status}
                    </span>
                  </div>
                  {t.rating && (
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star key={i} className="h-3.5 w-3.5" style={i <= t.rating! ? { color: '#fbbf24', fill: '#fbbf24' } : { color: 'hsl(var(--muted-foreground))' }} />
                      ))}
                    </div>
                  )}
                  {t.summary && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{t.summary}</p>
                  )}
                  {t.isPublished && t.publishedTo.length > 0 && (
                    <p className="text-xs" style={{ color: '#34d399' }}>Published to: {t.publishedTo.join(', ')}</p>
                  )}
                  <div className="flex gap-1 pt-1">
                    {t.status === 'submitted' && !t.isPublished && (
                      <button onClick={() => setPublishTarget({ id: t.id, platforms: ['website'] })}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                        <Share2 className="h-3.5 w-3.5" /> Publish
                      </button>
                    )}
                    <button onClick={() => handleDelete(t.id)} disabled={deletingId === t.id}
                      className="p-1.5 rounded hover:bg-muted transition-colors">
                      <Trash2 className="h-3.5 w-3.5" style={{ color: '#f87171' }} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {publishTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <h2 className="font-semibold text-foreground">Publish Testimonial</h2>
            <p className="text-sm text-muted-foreground">Select platforms to publish this testimonial to:</p>
            <div className="space-y-2">
              {['website', 'google', 'facebook', 'instagram'].map(p => (
                <label key={p} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={publishTarget.platforms.includes(p)}
                    onChange={e => setPublishTarget(pt => pt ? {
                      ...pt,
                      platforms: e.target.checked ? [...pt.platforms, p] : pt.platforms.filter(x => x !== p)
                    } : null)}
                    className="rounded" />
                  <span className="text-sm text-foreground capitalize">{p}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => handlePublish(publishTarget.id, publishTarget.platforms)}
                disabled={publishTarget.platforms.length === 0}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                Publish
              </button>
              <button onClick={() => setPublishTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                style={{ border: '1px solid hsl(var(--border))' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
