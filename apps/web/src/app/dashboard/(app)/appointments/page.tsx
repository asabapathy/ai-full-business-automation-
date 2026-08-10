'use client'

import { useState, useEffect } from 'react'
import { Calendar, Plus, Clock, CheckCircle, ChevronLeft, ChevronRight, Phone, Zap, X, User, Wrench, XCircle, AlertCircle } from 'lucide-react'
import { Skeleton } from '../../../../../components/ui/skeleton'
import { api } from '../../../../../lib/api-client'
import { toast } from '../../../../../lib/toast'

interface Appointment {
  id: string
  title: string
  startTime: string
  endTime: string
  duration: number
  status: string
  contact?: { firstName: string; lastName?: string; phone?: string }
  service?: { name: string; price?: number }
}

interface AvailabilitySlot {
  startTime: string
  endTime: string
  available: boolean
}

const STATUS_PILL: Record<string, { text: string; bg: string }> = {
  SCHEDULED: { text: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  CONFIRMED:  { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  COMPLETED:  { text: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  CANCELLED:  { text: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  NO_SHOW:    { text: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
}

function formatTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]!
}

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

const DURATIONS = [15, 30, 45, 60, 90, 120]

function buildWeekStrip(centerDate: string) {
  const center = new Date(centerDate + 'T12:00:00')
  const days = []
  for (let i = -3; i <= 3; i++) {
    const d = new Date(center)
    d.setDate(d.getDate() + i)
    days.push(d)
  }
  return days
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()))
  const [analytics, setAnalytics] = useState<{ totalAppointments: number; completedAppointments: number; showRate: number } | null>(null)
  const [showBook, setShowBook] = useState(false)
  const [booking, setBooking] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [bookForm, setBookForm] = useState({
    firstName: '', lastName: '', phone: '',
    serviceName: '', servicePrice: '',
    date: toDateStr(new Date()),
    time: '09:00',
    duration: 60,
    notes: '',
  })

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [apptData, slotsData, analyticsData] = await Promise.all([
          api.get<{ appointments: Appointment[] }>('/receptionist/appointments', { date: selectedDate }),
          api.get<{ slots: AvailabilitySlot[] }>('/receptionist/availability', { date: selectedDate }),
          api.get<{ totalAppointments: number; completedAppointments: number; showRate: number }>('/receptionist/analytics'),
        ])
        setAppointments(apptData.appointments)
        setSlots(slotsData.slots)
        setAnalytics(analyticsData)
      } catch {
        setAppointments([
          { id: '1', title: 'HVAC Tune-Up', startTime: new Date().toISOString(), endTime: new Date(Date.now() + 3600000).toISOString(), duration: 60, status: 'CONFIRMED', contact: { firstName: 'Mark', lastName: 'Johnson', phone: '555-0100' }, service: { name: 'Tune-Up', price: 150 } },
          { id: '2', title: 'AC Installation', startTime: new Date(Date.now() + 7200000).toISOString(), endTime: new Date(Date.now() + 14400000).toISOString(), duration: 120, status: 'SCHEDULED', contact: { firstName: 'Sarah', lastName: 'Williams', phone: '555-0101' }, service: { name: 'AC Installation', price: 3200 } },
        ])
        setSlots(Array.from({ length: 5 }, (_, i) => ({
          startTime: new Date(Date.now() + (i + 3) * 3600000).toISOString(),
          endTime: new Date(Date.now() + (i + 4) * 3600000).toISOString(),
          available: i !== 1,
        })))
        setAnalytics({ totalAppointments: 47, completedAppointments: 41, showRate: 87 })
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [selectedDate])

  const changeDate = (days: number) => {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + days)
    setSelectedDate(toDateStr(d))
  }

  function openBookModal(prefillTime?: string) {
    setBookForm(f => ({ ...f, date: selectedDate, time: prefillTime ?? '09:00' }))
    setShowBook(true)
  }

  async function handleBook() {
    if (!bookForm.firstName.trim()) return
    setBooking(true)
    try {
      const startISO = new Date(`${bookForm.date}T${bookForm.time}:00`).toISOString()
      const endISO = new Date(new Date(`${bookForm.date}T${bookForm.time}:00`).getTime() + bookForm.duration * 60000).toISOString()
      const body = {
        title: bookForm.serviceName
          ? `${bookForm.serviceName} — ${bookForm.firstName} ${bookForm.lastName}`.trim()
          : `Appointment — ${bookForm.firstName} ${bookForm.lastName}`.trim(),
        startTime: startISO,
        endTime: endISO,
        duration: bookForm.duration,
        contact: { firstName: bookForm.firstName, lastName: bookForm.lastName || undefined, phone: bookForm.phone || undefined },
        service: bookForm.serviceName ? { name: bookForm.serviceName, price: bookForm.servicePrice ? Number(bookForm.servicePrice) : undefined } : undefined,
        notes: bookForm.notes || undefined,
      }
      const res = await api.post('/receptionist/appointments', body) as any
      const newAppt = res?.appointment ?? res?.data?.appointment ?? res
      if (newAppt?.id) {
        setAppointments(prev => [...prev, newAppt].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()))
      }
      toast('Appointment booked', 'success')
      setShowBook(false)
      setBookForm({ firstName: '', lastName: '', phone: '', serviceName: '', servicePrice: '', date: selectedDate, time: '09:00', duration: 60, notes: '' })
    } catch {
      toast('Failed to book appointment', 'error')
    } finally {
      setBooking(false)
    }
  }

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id)
    try {
      await api.patch(`/receptionist/appointments/${id}`, { status })
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a))
      toast(`Marked ${status.toLowerCase().replace('_', '-')}`, 'success')
    } catch {
      toast('Failed to update status', 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  const weekDays = buildWeekStrip(selectedDate)
  const todayStr = toDateStr(new Date())

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      {/* Header */}
      <div {...anim(0)} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Appointments</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Scheduling and appointment management</p>
        </div>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors"
            style={{ color: '#a855f7', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}
          >
            <Zap className="h-4 w-4" />
            AI Book
          </button>
          <button
            onClick={() => openBookModal()}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.3)' }}
          >
            <Plus className="h-4 w-4" />
            New Appointment
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'This Month', value: analytics?.totalAppointments ?? '--', icon: Calendar, color: '#06b6d4' },
          { label: 'Completed', value: analytics?.completedAppointments ?? '--', icon: CheckCircle, color: '#34d399' },
          { label: 'Show Rate', value: analytics ? `${analytics.showRate}%` : '--', icon: Clock, color: '#a855f7' },
        ].map((stat, i) => (
          <div key={stat.label} className="kv-anim rounded-xl p-4" style={{ animationDelay: `${0.11 + i * 0.07}s`, ...cardStyle }}>
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
            {isLoading ? <Skeleton className="h-8 w-16 mt-1" /> : <p className="text-2xl font-bold tabular" style={{ color: stat.color }}>{stat.value}</p>}
          </div>
        ))}
      </div>

      {/* Week strip */}
      <div {...anim(3)} className="kv-anim flex items-center gap-2" style={{ animationDelay: '0.25s' }}>
        <button onClick={() => changeDate(-7)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent/60 text-muted-foreground transition-colors shrink-0">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 grid grid-cols-7 gap-1">
          {weekDays.map(day => {
            const ds = toDateStr(day)
            const isSelected = ds === selectedDate
            const isToday = ds === todayStr
            return (
              <button
                key={ds}
                onClick={() => setSelectedDate(ds)}
                className="flex flex-col items-center py-2 rounded-xl text-xs font-medium transition-all"
                style={isSelected
                  ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
                  : { ...cardStyle, color: isToday ? '#06b6d4' : 'hsl(var(--muted-foreground))' }
                }
              >
                <span className="text-[10px] uppercase tracking-wide">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span className="text-base font-bold mt-0.5">{day.getDate()}</span>
              </button>
            )
          })}
        </div>
        <button onClick={() => changeDate(7)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent/60 text-muted-foreground transition-colors shrink-0">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Day view */}
        <div className="lg:col-span-2 space-y-4">
          <div {...anim(4)}>
            <div className="rounded-xl overflow-hidden" style={cardStyle}>
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'hsl(var(--border))' }}>
                <h3 className="text-sm font-semibold text-foreground">
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h3>
                <span className="text-xs text-muted-foreground">{appointments.length} appointment{appointments.length !== 1 ? 's' : ''}</span>
              </div>

              {isLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
                </div>
              ) : appointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <Calendar className="h-8 w-8 text-muted-foreground/30 mb-3" />
                  <p className="font-medium text-sm text-foreground">No appointments this day</p>
                  <button onClick={() => openBookModal()} className="mt-3 text-xs text-primary hover:underline">Book one now</button>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                  {appointments.map(appt => {
                    const pill = STATUS_PILL[appt.status] ?? STATUS_PILL.SCHEDULED
                    const active = !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appt.status)
                    return (
                      <div key={appt.id} className="flex items-start gap-4 px-5 py-4 hover:bg-accent/30 transition-colors">
                        <div className="text-center shrink-0 w-14">
                          <p className="text-sm font-bold text-foreground tabular">{formatTime(appt.startTime)}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{appt.duration}m</p>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground">{appt.title}</p>
                          {appt.contact && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {appt.contact.firstName} {appt.contact.lastName}
                              {appt.contact.phone && (
                                <span className="ml-2 inline-flex items-center gap-0.5">
                                  <Phone className="h-2.5 w-2.5" />
                                  {appt.contact.phone}
                                </span>
                              )}
                            </p>
                          )}
                          {appt.service && (
                            <p className="text-xs text-muted-foreground">
                              {appt.service.name}{appt.service.price ? ` — $${appt.service.price}` : ''}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: pill.text, background: pill.bg }}>
                            {appt.status.replace('_', ' ')}
                          </span>
                          {active && (
                            <div className="flex gap-1">
                              {appt.status === 'SCHEDULED' && (
                                <button
                                  onClick={() => updateStatus(appt.id, 'CONFIRMED')}
                                  disabled={updatingId === appt.id}
                                  title="Confirm"
                                  className="p-1 rounded hover:bg-emerald-400/10 transition-colors disabled:opacity-50"
                                  style={{ color: '#34d399' }}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                              )}
                              {appt.status === 'CONFIRMED' && (
                                <button
                                  onClick={() => updateStatus(appt.id, 'COMPLETED')}
                                  disabled={updatingId === appt.id}
                                  title="Mark completed"
                                  className="p-1 rounded hover:bg-white/5 transition-colors disabled:opacity-50"
                                  style={{ color: '#94a3b8' }}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => updateStatus(appt.id, 'NO_SHOW')}
                                disabled={updatingId === appt.id}
                                title="No show"
                                className="p-1 rounded hover:bg-amber-400/10 transition-colors disabled:opacity-50"
                                style={{ color: '#f59e0b' }}
                              >
                                <AlertCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => updateStatus(appt.id, 'CANCELLED')}
                                disabled={updatingId === appt.id}
                                title="Cancel"
                                className="p-1 rounded hover:bg-red-400/10 transition-colors disabled:opacity-50"
                                style={{ color: '#f87171' }}
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Available slots */}
        <div {...anim(5)} className="rounded-xl overflow-hidden" style={cardStyle}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
            <h3 className="text-sm font-semibold text-foreground">Available Slots</h3>
          </div>
          <div className="p-4 space-y-2">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9" />)
            ) : slots.filter(s => s.available).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No open slots today</p>
            ) : (
              slots.filter(s => s.available).slice(0, 8).map((slot, i) => {
                const t = new Date(slot.startTime)
                const timeStr = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
                return (
                  <button
                    key={i}
                    onClick={() => openBookModal(timeStr)}
                    className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all hover:bg-primary/10"
                    style={{ border: '1px solid hsl(var(--border))' }}
                  >
                    <span className="font-medium text-foreground tabular">{formatTime(slot.startTime)}</span>
                    <span className="text-xs text-primary font-medium">+ Book</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Booking modal */}
      {showBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">New Appointment</h2>
              <button onClick={() => setShowBook(false)} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <User className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Customer</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">First Name *</label>
                  <input className={inputCls} style={inputStyle} placeholder="Jane" value={bookForm.firstName} onChange={e => setBookForm(f => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Last Name</label>
                  <input className={inputCls} style={inputStyle} placeholder="Smith" value={bookForm.lastName} onChange={e => setBookForm(f => ({ ...f, lastName: e.target.value }))} />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-xs text-muted-foreground mb-1">Phone</label>
                <input className={inputCls} style={inputStyle} placeholder="555-0100" value={bookForm.phone} onChange={e => setBookForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Service</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Service Name</label>
                  <input className={inputCls} style={inputStyle} placeholder="e.g. HVAC Tune-Up" value={bookForm.serviceName} onChange={e => setBookForm(f => ({ ...f, serviceName: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Price (USD)</label>
                  <input type="number" min="0" className={inputCls} style={inputStyle} placeholder="150" value={bookForm.servicePrice} onChange={e => setBookForm(f => ({ ...f, servicePrice: e.target.value }))} />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Date & Time</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Date</label>
                  <input type="date" className={inputCls} style={inputStyle} value={bookForm.date} onChange={e => setBookForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Time</label>
                  <input type="time" className={inputCls} style={inputStyle} value={bookForm.time} onChange={e => setBookForm(f => ({ ...f, time: e.target.value }))} />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-xs text-muted-foreground mb-1.5">Duration</label>
                <div className="flex gap-2 flex-wrap">
                  {DURATIONS.map(d => (
                    <button
                      key={d}
                      onClick={() => setBookForm(f => ({ ...f, duration: d }))}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={bookForm.duration === d
                        ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
                        : { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
                      }
                    >
                      {d >= 60 ? `${d / 60}h` : `${d}m`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Notes (optional)</label>
              <textarea
                className={inputCls + ' resize-none'}
                style={inputStyle}
                rows={2}
                placeholder="Any special instructions…"
                value={bookForm.notes}
                onChange={e => setBookForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowBook(false)} className="flex-1 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button
                onClick={handleBook}
                disabled={booking || !bookForm.firstName.trim()}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
              >
                {booking ? 'Booking…' : 'Book Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
