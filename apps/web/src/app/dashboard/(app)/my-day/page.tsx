'use client'

import { useState, useEffect } from 'react'
import { MapPin, Phone, Car, Play, CheckCircle, Star } from 'lucide-react'

import { api } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'

interface DayJob {
  id: string
  time: string
  client: string
  address: string
  phone?: string
  service: string
  status: 'upcoming' | 'en_route' | 'in_progress' | 'done'
  notes?: string
}

const DEMO_JOBS: DayJob[] = [
  { id: 'j1', time: '9:00 AM', client: 'Mark Johnson', address: '1420 Maple Ave, Springfield', phone: '555-0182', service: 'HVAC tune-up', status: 'done' },
  { id: 'j2', time: '11:30 AM', client: 'Linda Chen', address: '87 Birchwood Dr, Springfield', phone: '555-0147', service: 'Drain cleaning', status: 'in_progress' },
  { id: 'j3', time: '2:00 PM', client: 'Robert Alvarez', address: '305 Sycamore Ct, Springfield', phone: '555-0119', service: 'Panel inspection', status: 'upcoming' },
  { id: 'j4', time: '4:30 PM', client: 'Emily Foster', address: '2211 Willow Ln, Springfield', phone: '555-0163', service: 'Quote visit', status: 'upcoming' },
]

const STATUS_DOT: Record<DayJob['status'], string> = {
  done: '#34d399',
  in_progress: '#06b6d4',
  en_route: '#fbbf24',
  upcoming: 'hsl(var(--muted-foreground))',
}

const STATUS_LABEL: Record<DayJob['status'], string> = {
  done: 'Done',
  in_progress: 'In progress',
  en_route: 'En route',
  upcoming: 'Upcoming',
}

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function mapsUrl(address: string) {
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`
}

export default function MyDayPage() {
  const [jobs, setJobs] = useState<DayJob[]>(DEMO_JOBS)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)
  const [completionNotes, setCompletionNotes] = useState('')
  const [requestReview, setRequestReview] = useState(true)

  useEffect(() => {
    api.get<{ jobs: DayJob[] }>('/my-day/jobs')
      .then(res => { const list = res?.jobs ?? res; if (Array.isArray(list) && list.length) setJobs(list) })
      .catch(() => {})
  }, [])

  const doneCount = jobs.filter(j => j.status === 'done').length
  const allDone = jobs.length > 0 && doneCount === jobs.length
  const activeJob = jobs.find(j => j.status === 'in_progress')
    ?? jobs.find(j => j.status === 'en_route')
    ?? jobs.find(j => j.status === 'upcoming')

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : 'Good afternoon'
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  async function setStatus(id: string, status: DayJob['status'], notes?: string) {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status, ...(notes ? { notes } : {}) } : j))
    try {
      await api.patch(`/my-day/jobs/${id}`, { status, ...(notes ? { notes } : {}) })
    } catch { /* demo mode */ }
  }

  function advance(job: DayJob) {
    if (job.status === 'upcoming') {
      setStatus(job.id, 'en_route')
      toast(`En route to ${job.client}`, 'success')
    } else if (job.status === 'en_route') {
      setStatus(job.id, 'in_progress')
      toast('Job started', 'success')
    } else if (job.status === 'in_progress') {
      setCompleting(true)
    }
  }

  function finishJob(job: DayJob) {
    setStatus(job.id, 'done', completionNotes.trim() || undefined)
    toast(requestReview ? 'Job completed — review request queued' : 'Job completed', 'success')
    setCompleting(false)
    setCompletionNotes('')
    setRequestReview(true)
  }

  return (
    <div className="p-4 pb-10 max-w-md mx-auto space-y-5">
      {/* Greeting header */}
      <div {...anim(0)}>
        <h1 className="text-2xl font-bold text-foreground">{greeting}, Sarah</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{todayLabel}</p>
        <div className="mt-3">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">
            {doneCount} of {jobs.length} job{jobs.length !== 1 ? 's' : ''} done
          </p>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(var(--muted))' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${jobs.length ? (doneCount / jobs.length) * 100 : 0}%`, background: 'linear-gradient(90deg, #06b6d4, #0ea5e9)' }} />
          </div>
        </div>
      </div>

      {/* Now / Next card */}
      {activeJob && (
        <div {...anim(1)}>
          <div className="rounded-2xl p-5"
            style={{ background: 'hsl(var(--card))', border: '1px solid rgba(6,182,212,0.4)', boxShadow: '0 0 24px rgba(6,182,212,0.12)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ color: '#06b6d4', background: 'rgba(6,182,212,0.12)' }}>
                {activeJob.status === 'in_progress' ? 'Now' : 'Next up'}
              </span>
              <span className="text-xs font-medium" style={{ color: STATUS_DOT[activeJob.status] }}>
                {STATUS_LABEL[activeJob.status]}
              </span>
            </div>

            <p className="text-3xl font-bold text-foreground tabular">{activeJob.time}</p>
            <p className="text-lg font-semibold text-foreground mt-1">{activeJob.client}</p>
            <p className="text-sm text-muted-foreground">{activeJob.service}</p>
            <p className="text-sm text-muted-foreground mt-1.5 flex items-start gap-1.5">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#06b6d4' }} />
              {activeJob.address}
            </p>

            {/* Navigate / Call */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <a href={mapsUrl(activeJob.address)} target="_blank" rel="noopener noreferrer"
                className="h-12 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 16px rgba(6,182,212,0.3)' }}>
                <MapPin className="h-4 w-4" />
                Navigate
              </a>
              {activeJob.phone ? (
                <a href={`tel:${activeJob.phone}`}
                  className="h-12 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
                  style={{ color: '#34d399', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)' }}>
                  <Phone className="h-4 w-4" />
                  Call
                </a>
              ) : (
                <span className="h-12 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold opacity-40"
                  style={{ color: '#34d399', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)' }}>
                  <Phone className="h-4 w-4" />
                  Call
                </span>
              )}
            </div>

            {/* Status advance */}
            {!completing && (
              <button onClick={() => advance(activeJob)}
                className="w-full h-12 mt-3 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
                style={activeJob.status === 'upcoming'
                  ? { color: '#fbbf24', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)' }
                  : activeJob.status === 'en_route'
                    ? { color: '#06b6d4', background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)' }
                    : { color: 'white', background: 'linear-gradient(135deg, #34d399, #10b981)', boxShadow: '0 0 16px rgba(52,211,153,0.3)' }}>
                {activeJob.status === 'upcoming' && <><Car className="h-4 w-4" /> Start driving</>}
                {activeJob.status === 'en_route' && <><Play className="h-4 w-4" /> Start job</>}
                {activeJob.status === 'in_progress' && <><CheckCircle className="h-4 w-4" /> Complete job ✓</>}
              </button>
            )}

            {/* Completion sheet */}
            {completing && activeJob.status === 'in_progress' && (
              <div className="mt-3 rounded-xl p-4 space-y-3 kv-anim"
                style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Anything to log?</label>
                  <textarea rows={3} className={inputCls + ' resize-none'} style={inputStyle}
                    placeholder="Notes about the job, parts used, follow-ups…"
                    value={completionNotes} onChange={e => setCompletionNotes(e.target.value)} />
                </div>

                <button onClick={() => setRequestReview(r => !r)}
                  className="w-full flex items-center justify-between rounded-lg px-3 py-3"
                  style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}>
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Star className="h-4 w-4" style={{ color: '#fbbf24' }} />
                    Request review from client
                  </span>
                  <span className="relative inline-flex h-5 w-9 rounded-full transition-colors shrink-0"
                    style={{ background: requestReview ? '#06b6d4' : 'rgba(255,255,255,0.15)' }}>
                    <span className="absolute top-0.5 h-4 w-4 rounded-full transition-transform"
                      style={{ background: 'white', transform: requestReview ? 'translateX(18px)' : 'translateX(2px)' }} />
                  </span>
                </button>

                <div className="flex gap-2">
                  <button onClick={() => { setCompleting(false); setCompletionNotes(''); setRequestReview(true) }}
                    className="h-12 px-4 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
                    style={{ border: '1px solid hsl(var(--border))' }}>
                    Cancel
                  </button>
                  <button onClick={() => finishJob(activeJob)}
                    className="flex-1 h-12 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg, #34d399, #10b981)', boxShadow: '0 0 16px rgba(52,211,153,0.3)' }}>
                    Finish
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div {...anim(2)}>
        <h2 className="text-sm font-semibold text-foreground mb-3">Today&apos;s schedule</h2>
        <div className="space-y-1">
          {jobs.map(job => {
            const isActive = activeJob?.id === job.id
            const isExpanded = expandedId === job.id
            const isDone = job.status === 'done'
            return (
              <div key={job.id}>
                <button
                  onClick={() => { if (!isActive) setExpandedId(id => id === job.id ? null : job.id) }}
                  className="w-full flex items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors"
                  style={isActive ? { background: 'rgba(6,182,212,0.06)' } : undefined}>
                  <span className="w-16 shrink-0 text-xs font-semibold tabular pt-0.5"
                    style={{ color: isDone ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))' }}>
                    {job.time}
                  </span>
                  <span className={`h-2.5 w-2.5 rounded-full mt-1 shrink-0 ${job.status === 'in_progress' ? 'animate-pulse' : ''}`}
                    style={{ background: STATUS_DOT[job.status] }} />
                  <span className="flex-1 min-w-0">
                    <span className={`block text-sm font-medium truncate ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {job.client} — {job.service}
                    </span>
                    <span className={`block text-xs text-muted-foreground truncate ${isDone ? 'line-through' : ''}`}>
                      {job.address}
                    </span>
                  </span>
                </button>

                {isExpanded && !isActive && (
                  <div className="kv-anim ml-[76px] mr-3 mb-2 rounded-xl p-3" style={cardStyle}>
                    <p className="text-xs text-muted-foreground mb-2.5">
                      {STATUS_LABEL[job.status]}{job.phone ? ` · ${job.phone}` : ''}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <a href={mapsUrl(job.address)} target="_blank" rel="noopener noreferrer"
                        className="h-12 flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold text-white transition-all active:scale-[0.98]"
                        style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                        <MapPin className="h-3.5 w-3.5" />
                        Navigate
                      </a>
                      {job.phone ? (
                        <a href={`tel:${job.phone}`}
                          className="h-12 flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-all active:scale-[0.98]"
                          style={{ color: '#34d399', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)' }}>
                          <Phone className="h-3.5 w-3.5" />
                          Call
                        </a>
                      ) : (
                        <span className="h-12 flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold opacity-40"
                          style={{ color: '#34d399', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)' }}>
                          <Phone className="h-3.5 w-3.5" />
                          Call
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* End-of-day summary */}
      {allDone && (
        <div {...anim(3)}>
          <div className="rounded-2xl p-6 text-center"
            style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.3)' }}>
            <p className="text-2xl mb-1">🎉</p>
            <p className="text-lg font-bold text-foreground">All jobs complete</p>
            <p className="text-sm text-muted-foreground mt-1">
              {jobs.length} job{jobs.length !== 1 ? 's' : ''} finished today. Nice work, Sarah.
            </p>
            <p className="text-xs text-muted-foreground mt-3">View tomorrow&apos;s schedule in the morning</p>
          </div>
        </div>
      )}
    </div>
  )
}
