'use client'

import { useState, useEffect } from 'react'
import { Video, Plus, Share2, Trash2, Star, QrCode } from 'lucide-react'
import { Button } from '../../../../components/ui/button'
import { apiClient } from '../../../../lib/api-client'

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

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState({ contactId: '', appointmentId: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [publishTarget, setPublishTarget] = useState<{ id: string; platforms: string[] } | null>(null)

  useEffect(() => { fetchTestimonials() }, [])

  async function fetchTestimonials() {
    try {
      const data = await apiClient.get('/testimonials')
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
    } finally {
      setCreating(false)
    }
  }

  async function handlePublish(id: string, platforms: string[]) {
    await apiClient.post(`/testimonials/${id}/publish`, { platforms })
    setPublishTarget(null)
    fetchTestimonials()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this testimonial?')) return
    await apiClient.delete(`/testimonials/${id}`)
    fetchTestimonials()
  }

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Video className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Video Testimonials</h1>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Request Testimonial
        </Button>
      </div>

      {showCreate && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Request Video Testimonial</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Contact ID (optional)</label>
              <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                placeholder="Contact UUID"
                value={createForm.contactId}
                onChange={e => setCreateForm(f => ({ ...f, contactId: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Appointment ID (optional)</label>
              <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                placeholder="Appointment UUID"
                value={createForm.appointmentId}
                onChange={e => setCreateForm(f => ({ ...f, appointmentId: e.target.value }))} />
            </div>
            <div className="col-span-2 flex gap-2">
              <Button type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create Request'}</Button>
              <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading testimonials...</p>
      ) : testimonials.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <Video className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No testimonials yet. Send video capture requests to your clients.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {testimonials.map(t => (
            <div key={t.id} className="rounded-xl border bg-card overflow-hidden">
              {t.videoUrl ? (
                <div className="aspect-video bg-black relative">
                  <video src={t.videoUrl} className="w-full h-full object-cover" controls />
                </div>
              ) : (
                <div className="aspect-video bg-muted/40 flex items-center justify-center">
                  {t.status === 'pending' ? (
                    <div className="text-center">
                      <QrCode className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-xs text-muted-foreground">Awaiting response</p>
                    </div>
                  ) : (
                    <Video className="h-8 w-8 opacity-30" />
                  )}
                </div>
              )}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">
                    {t.contact ? `${t.contact.firstName} ${t.contact.lastName}` : 'Anonymous'}
                  </p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor[t.status] ?? ''}`}>
                    {t.status}
                  </span>
                </div>
                {t.rating && (
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i <= t.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                    ))}
                  </div>
                )}
                {t.summary && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{t.summary}</p>
                )}
                {t.isPublished && t.publishedTo.length > 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400">Published to: {t.publishedTo.join(', ')}</p>
                )}
                <div className="flex gap-1 pt-1">
                  {t.status === 'submitted' && !t.isPublished && (
                    <Button size="sm" variant="outline" className="flex-1"
                      onClick={() => setPublishTarget({ id: t.id, platforms: ['website'] })}>
                      <Share2 className="h-3.5 w-3.5 mr-1" />
                      Publish
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Publish modal */}
      {publishTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-card border p-6 space-y-4">
            <h2 className="font-semibold">Publish Testimonial</h2>
            <p className="text-sm text-muted-foreground">Select platforms to publish this testimonial to:</p>
            <div className="space-y-2">
              {['website', 'google', 'facebook', 'instagram'].map(p => (
                <label key={p} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publishTarget.platforms.includes(p)}
                    onChange={e => setPublishTarget(pt => pt ? {
                      ...pt,
                      platforms: e.target.checked
                        ? [...pt.platforms, p]
                        : pt.platforms.filter(x => x !== p)
                    } : null)}
                    className="rounded"
                  />
                  <span className="text-sm capitalize">{p}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handlePublish(publishTarget.id, publishTarget.platforms)}
                disabled={publishTarget.platforms.length === 0}>
                Publish
              </Button>
              <Button variant="outline" onClick={() => setPublishTarget(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
