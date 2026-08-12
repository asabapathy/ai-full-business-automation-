'use client'

import { useState, useEffect } from 'react'
import { Calendar, Plus, Clock, CheckCircle, ChevronLeft, ChevronRight, Phone, Zap, X, User, Wrench, XCircle, AlertCircle, List, CalendarDays, BellRing, Repeat } from 'lucide-react'

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
  seriesId?: string
}

interface AvailabilitySlot {
  startTime: string
  endTime: string
  available: boolean
}

interface DayHours { open: boolean; start: string; end: string }

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const DAY_LABELS: Record<string, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }
const DOW_TO_KEY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

const DEFAULT_HOURS: Record<string, DayHours> = {
  mon: { open: true, start: '08:00', end: '17:00' },
  tue: { open: true, start: '08:00', end: '17:00' },
  wed: { open: true, start: '08:00', end: '17:00' },
  thu: { open: true, start: '08:00', end: '17:00' },
  fri: { open: true, start: '08:00', end: '16:00' },
  sat: { open: false, start: '09:00', end: '13:00' },
  sun: { open: false, start: '09:00', end: '13:00' },
}

function fmtHour(t: string) {
  const [hStr = '0', mStr = '0'] = t.split(':')
  const h = Number(hStr)
  const m = Number(mStr)
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m ? `${h12}:${String(m).padStart(2, '0')}${ampm}` : `${h12}${ampm}`
}

function hoursSummary(hours: Record<string, DayHours>) {
  const runs: { start: number; end: number; s: string; e: string }[] = []
  DAY_KEYS.forEach((k, i) => {
    const d = hours[k]
    if (!d?.open) return
    const last = runs[runs.length - 1]
    if (last && last.end === i - 1 && last.s === d.start && last.e === d.end) last.end = i
    else runs.push({ start: i, end: i, s: d.start, e: d.end })
  })
  if (runs.length === 0) return 'Closed all week'
  if (runs.length > 1) return 'Custom hours'
  const r = runs[0]!
  const label = r.start === r.end
    ? DAY_LABELS[DAY_KEYS[r.start]!]
    : `${DAY_LABELS[DAY_KEYS[r.start]!]}–${DAY_LABELS[DAY_KEYS[r.end]!]}`
  return `Open ${label} · ${fmtHour(r.s)}–${fmtHour(r.e)}`
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

type RepeatFreq = 'none' | 'weekly' | 'biweekly' | 'monthly'

const REPEAT_OPTIONS: { value: RepeatFreq; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
]

function seriesDates(dateStr: string, timeStr: string, freq: Exclude<RepeatFreq, 'none'>, count: number) {
  const dates: Date[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(`${dateStr}T${timeStr}:00`)
    if (freq === 'monthly') d.setMonth(d.getMonth() + i)
    else d.setDate(d.getDate() + (freq === 'weekly' ? 7 : 14) * i)
    dates.push(d)
  }
  return dates
}

function SeriesBadge() {
  return (
    <span title="Part of a series"
      className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
      style={{ color: '#a78bfa', background: 'rgba(167,139,250,0.12)' }}>
      <Repeat className="h-2.5 w-2.5" />
      Series
    </span>
  )
}

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function daysInMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() }
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function appointmentsOnDay(day: Date, apts: Appointment[]) {
  return apts.filter(apt => {
    const d = new Date(apt.startTime ?? '')
    return !isNaN(d.getTime()) && isSameDay(d, day)
  })
}

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
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [calMonth, setCalMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [reminderSettings, setReminderSettings] = useState({ enabled: true, hoursBefore: 24, channel: 'both' as 'email' | 'sms' | 'both' })
  const [reminderSettingsOpen, setReminderSettingsOpen] = useState(false)
  const [savingReminders, setSavingReminders] = useState(false)
  const [remindingId, setRemindingId] = useState<string | null>(null)
  const [hours, setHours] = useState(DEFAULT_HOURS)
  const [bookingRules, setBookingRules] = useState({ slotMinutes: 60, bufferMinutes: 15, maxPerDay: 8, leadHours: 24 })
  const [hoursOpen, setHoursOpen] = useState(false)
  const [savingHours, setSavingHours] = useState(false)
  const [repeat, setRepeat] = useState<{ freq: RepeatFreq; count: number }>({ freq: 'none', count: 6 })
  const [seriesConfirmId, setSeriesConfirmId] = useState<string | null>(null)
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

  useEffect(() => {
    api.get<typeof reminderSettings>('/appointments/reminder-settings')
      .then(s => s && setReminderSettings(s))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('kv-business-hours')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.hours) setHours(parsed.hours)
        if (parsed?.booking) setBookingRules(b => ({ ...b, ...parsed.booking }))
      }
    } catch { /* ignore */ }
    api.get<{ hours: Record<string, DayHours>; booking: { slotMinutes: number; bufferMinutes: number; maxPerDay: number; leadHours: number } }>('/appointments/business-hours')
      .then((res: { hours?: Record<string, DayHours>; booking?: Partial<{ slotMinutes: number; bufferMinutes: number; maxPerDay: number; leadHours: number }> } | null) => {
        if (res?.hours) setHours(res.hours)
        if (res?.booking) setBookingRules(b => ({ ...b, ...res.booking }))
      })
      .catch(() => {})
  }, [])

  async function saveHours() {
    setSavingHours(true)
    try {
      await api.put('/appointments/business-hours', { hours, booking: bookingRules })
    } catch { /* demo mode */ }
    try {
      localStorage.setItem('kv-business-hours', JSON.stringify({ hours, booking: bookingRules }))
    } catch { /* ignore */ }
    setSavingHours(false)
    setHoursOpen(false)
    toast('Business hours saved', 'success')
  }

  function copyMondayToWeekdays() {
    setHours(h => {
      const mon = h.mon ?? DEFAULT_HOURS.mon!
      return { ...h, tue: { ...mon }, wed: { ...mon }, thu: { ...mon }, fri: { ...mon } }
    })
  }

  async function saveReminderSettings() {
    setSavingReminders(true)
    try {
      await api.put('/appointments/reminder-settings', reminderSettings)
    } catch { /* demo mode */ }
    setSavingReminders(false)
    setReminderSettingsOpen(false)
    toast('Reminder settings saved', 'success')
  }

  async function sendReminderNow(appt: Appointment) {
    setRemindingId(appt.id)
    try {
      await api.post(`/appointments/${appt.id}/remind`, {})
    } catch { /* demo */ }
    setRemindingId(null)
    toast(`Reminder sent to ${appt.contact?.firstName ?? 'client'}`, 'success')
  }

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
      const seriesId = repeat.freq !== 'none' ? crypto.randomUUID() : undefined
      const res = await api.post('/receptionist/appointments', body) as any
      const newAppt = res?.appointment ?? res?.data?.appointment ?? res
      if (newAppt?.id) {
        setAppointments(prev => [...prev, seriesId ? { ...newAppt, seriesId } : newAppt].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()))
      }
      if (repeat.freq !== 'none' && seriesId) {
        const occurrences: Appointment[] = seriesDates(bookForm.date, bookForm.time, repeat.freq, repeat.count).slice(1).map(d => ({
          ...body,
          id: crypto.randomUUID(),
          status: 'SCHEDULED',
          startTime: d.toISOString(),
          endTime: new Date(d.getTime() + bookForm.duration * 60000).toISOString(),
          seriesId,
        }))
        setAppointments(prev => [...prev, ...occurrences].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()))
        api.post('/appointments/series', { base: body, freq: repeat.freq, count: repeat.count }).catch(() => {})
        toast(`Series booked — ${repeat.count} visits scheduled`, 'success')
      } else {
        toast('Appointment booked', 'success')
      }
      setShowBook(false)
      setBookForm({ firstName: '', lastName: '', phone: '', serviceName: '', servicePrice: '', date: selectedDate, time: '09:00', duration: 60, notes: '' })
      setRepeat({ freq: 'none', count: 6 })
    } catch {
      toast('Failed to book appointment', 'error')
    } finally {
      setBooking(false)
    }
  }

  async function cancelSeries(seriesId: string) {
    setSeriesConfirmId(null)
    setAppointments(prev => prev.filter(a => a.seriesId !== seriesId))
    try {
      await api.delete(`/appointments/series/${seriesId}`)
    } catch { /* demo mode */ }
    toast('Series cancelled', 'success')
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
        <div className="flex items-center gap-2">
          <button onClick={() => setHoursOpen(true)} title="Edit business hours"
            className="hidden xl:inline-flex items-center rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            style={cardStyle}>
            {hoursSummary(hours)}
          </button>
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid hsl(var(--border))' }}>
            {(['list', 'calendar'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium capitalize"
                style={view === v
                  ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
                  : { background: 'hsl(var(--card))', color: 'hsl(var(--muted-foreground))' }}>
                {v === 'list' ? <List className="h-3.5 w-3.5" /> : <CalendarDays className="h-3.5 w-3.5" />}
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={() => setHoursOpen(true)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            <Clock className="h-4 w-4" />
            Hours
          </button>
          <button onClick={() => setReminderSettingsOpen(true)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            <BellRing className="h-4 w-4" />
            Reminders
            {reminderSettings.enabled && <span className="h-2 w-2 rounded-full" style={{ background: '#34d399' }} />}
          </button>
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
            {isLoading ? <div className="h-8 w-16 mt-1 rounded-lg animate-pulse" style={{ background: 'hsl(var(--muted))' }} /> : <p className="text-2xl font-bold tabular" style={{ color: stat.color }}>{stat.value}</p>}
          </div>
        ))}
      </div>

      {view === 'list' && (<>
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
                  {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-lg animate-pulse" style={{ background: 'hsl(var(--muted))' }} />)}
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
                      <div key={appt.id} className="hover:bg-accent/30 transition-colors">
                      <div className="flex items-start gap-4 px-5 py-4">
                        <div className="text-center shrink-0 w-14">
                          <p className="text-sm font-bold text-foreground tabular">{formatTime(appt.startTime)}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{appt.duration}m</p>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground inline-flex items-center gap-1.5">{appt.title}{appt.seriesId && <SeriesBadge />}</p>
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
                              <button
                                onClick={(e) => { e.stopPropagation?.(); sendReminderNow(appt) }}
                                disabled={remindingId === appt.id}
                                title="Send reminder now"
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                                style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                              >
                                <BellRing className="h-4 w-4" style={remindingId === appt.id ? { color: '#fbbf24' } : undefined} />
                              </button>
                              {appt.status === 'SCHEDULED' && (
                                <button
                                  onClick={() => updateStatus(appt.id, 'CONFIRMED')}
                                  disabled={updatingId === appt.id}
                                  title="Confirm"
                                  className="p-1 rounded hover:bg-accent/20 transition-colors disabled:opacity-50"
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
                                  className="p-1 rounded hover:bg-accent/20 transition-colors disabled:opacity-50"
                                  style={{ color: '#94a3b8' }}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => updateStatus(appt.id, 'NO_SHOW')}
                                disabled={updatingId === appt.id}
                                title="No show"
                                className="p-1 rounded hover:bg-accent/20 transition-colors disabled:opacity-50"
                                style={{ color: '#f59e0b' }}
                              >
                                <AlertCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => appt.seriesId ? setSeriesConfirmId(cid => cid === appt.id ? null : appt.id) : updateStatus(appt.id, 'CANCELLED')}
                                disabled={updatingId === appt.id}
                                title="Cancel"
                                className="p-1 rounded hover:bg-accent/20 transition-colors disabled:opacity-50"
                                style={{ color: '#f87171' }}
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {seriesConfirmId === appt.id && appt.seriesId && (
                        <div className="flex items-center gap-2 px-5 pb-3 -mt-1">
                          <Repeat className="h-3 w-3 shrink-0" style={{ color: '#a78bfa' }} />
                          <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>Cancel this visit or the entire series?</span>
                          <button
                            onClick={() => { setSeriesConfirmId(null); updateStatus(appt.id, 'CANCELLED') }}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                            style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}>
                            This visit only
                          </button>
                          <button
                            onClick={() => cancelSeries(appt.seriesId!)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                            style={{ border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.12)', color: '#f87171' }}>
                            Entire series
                          </button>
                          <button onClick={() => setSeriesConfirmId(null)} className="p-1 text-muted-foreground hover:text-foreground">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
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
              Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-9 rounded-lg animate-pulse" style={{ background: 'hsl(var(--muted))' }} />)
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
      </>)}

      {/* Calendar view */}
      {view === 'calendar' && (
        <div {...anim(3)}>
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              className="p-2 rounded-lg transition-colors"
              style={{ ...cardStyle, color: 'hsl(var(--muted-foreground))' }}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="text-base font-semibold text-foreground">
              {calMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              className="p-2 rounded-lg transition-colors"
              style={{ ...cardStyle, color: 'hsl(var(--muted-foreground))' }}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-xs font-medium py-2" style={{ color: 'hsl(var(--muted-foreground))' }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid hsl(var(--border))' }}>
            {(() => {
              const start = startOfMonth(calMonth)
              const totalDays = daysInMonth(calMonth)
              const startDow = start.getDay()
              const cells: (Date | null)[] = Array(startDow).fill(null)
              for (let i = 1; i <= totalDays; i++) {
                cells.push(new Date(calMonth.getFullYear(), calMonth.getMonth(), i))
              }
              while (cells.length % 7 !== 0) cells.push(null)
              const weeks: (Date | null)[][] = []
              for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
              const today = new Date()
              return weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7">
                  {week.map((day, di) => {
                    const isToday = day ? isSameDay(day, today) : false
                    const isSelected = day && selectedDay ? isSameDay(day, selectedDay) : false
                    const dayApts = day ? appointmentsOnDay(day, appointments) : []
                    const isClosed = day ? !(hours[DOW_TO_KEY[day.getDay()]!]?.open ?? true) : false
                    return (
                      <div key={di}
                        onClick={() => day && setSelectedDay(day)}
                        className={`min-h-[80px] p-1.5 transition-colors ${day ? 'cursor-pointer hover:bg-muted/50' : ''} ${isClosed && !isSelected ? 'opacity-60' : ''}`}
                        style={{
                          background: isSelected ? 'rgba(6,182,212,0.08)' : day ? (isClosed ? 'hsl(var(--muted))' : 'hsl(var(--card))') : 'hsl(var(--muted))',
                          borderBottom: wi < weeks.length - 1 ? '1px solid hsl(var(--border))' : undefined,
                          borderRight: di < 6 ? '1px solid hsl(var(--border))' : undefined,
                        }}>
                        {day && (
                          <>
                            <div className="flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium mb-1"
                              style={isToday
                                ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
                                : { color: isSelected ? '#06b6d4' : 'hsl(var(--foreground))' }}>
                              {day.getDate()}
                            </div>
                            <div className="space-y-0.5">
                              {dayApts.slice(0, 2).map((apt, ai) => (
                                <div key={ai} className="text-xs px-1 py-0.5 rounded truncate"
                                  style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4' }}>
                                  {apt.contact ? `${apt.contact.firstName} ${apt.contact.lastName ?? ''}`.trim() : apt.title}
                                </div>
                              ))}
                              {dayApts.length > 2 && (
                                <div className="text-xs px-1" style={{ color: 'hsl(var(--muted-foreground))' }}>+{dayApts.length - 2} more</div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))
            })()}
          </div>

          {/* Selected day detail panel */}
          {selectedDay && (() => {
            const dayApts = appointmentsOnDay(selectedDay, appointments)
            return (
              <div className="mt-4 rounded-xl p-4" style={cardStyle}>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  <span className="ml-2 text-xs font-normal" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {dayApts.length} appointment{dayApts.length !== 1 ? 's' : ''}
                  </span>
                </h3>
                {dayApts.length === 0 ? (
                  <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>No appointments scheduled.</p>
                ) : (
                  <div className="space-y-2">
                    {dayApts.map((apt, i) => {
                      const pill = STATUS_PILL[apt.status] ?? STATUS_PILL.SCHEDULED
                      return (
                        <div key={i} className="flex items-start gap-3 rounded-lg p-3"
                          style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}>
                          <div className="h-2 w-2 rounded-full mt-1.5 shrink-0" style={{ background: '#06b6d4' }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground inline-flex items-center gap-1.5">
                              {apt.contact ? `${apt.contact.firstName} ${apt.contact.lastName ?? ''}`.trim() : apt.title}
                              {apt.seriesId && <SeriesBadge />}
                            </p>
                            <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{apt.service?.name ?? ''}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                              {new Date(apt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {apt.duration ? ` · ${apt.duration}m` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ background: pill.bg, color: pill.text }}>
                              {apt.status.replace('_', ' ')}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation?.(); sendReminderNow(apt) }}
                              disabled={remindingId === apt.id}
                              title="Send reminder now"
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                              style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                            >
                              <BellRing className="h-4 w-4" style={remindingId === apt.id ? { color: '#fbbf24' } : undefined} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* Business hours & booking settings modal */}
      {hoursOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-lg rounded-xl overflow-hidden flex flex-col max-h-[90vh]" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" style={{ color: '#06b6d4' }} />
                <h2 className="text-sm font-semibold text-foreground">Business Hours & Booking</h2>
              </div>
              <button onClick={() => setHoursOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Business hours */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-muted-foreground">Business hours</label>
                  <button onClick={copyMondayToWeekdays} className="text-xs font-medium hover:underline" style={{ color: '#06b6d4' }}>
                    Copy Monday to all
                  </button>
                </div>
                <div className="space-y-2">
                  {DAY_KEYS.map(k => {
                    const d = hours[k] ?? DEFAULT_HOURS[k]!
                    return (
                      <div key={k} className="flex items-center gap-3">
                        <span className="w-10 shrink-0 text-xs font-medium text-foreground">{DAY_LABELS[k]}</span>
                        <button onClick={() => setHours(h => ({ ...h, [k]: { ...d, open: !d.open } }))}
                          className="shrink-0">
                          <span className="relative inline-flex h-5 w-9 rounded-full transition-colors"
                            style={{ background: d.open ? '#06b6d4' : 'rgba(255,255,255,0.15)' }}>
                            <span className="absolute top-0.5 h-4 w-4 rounded-full transition-transform"
                              style={{ background: 'white', transform: d.open ? 'translateX(18px)' : 'translateX(2px)' }} />
                          </span>
                        </button>
                        {d.open ? (
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <input type="time" value={d.start}
                              onChange={e => setHours(h => ({ ...h, [k]: { ...d, start: e.target.value } }))}
                              className={inputCls + ' !px-2 !py-1.5 text-xs'} style={inputStyle} />
                            <span className="text-xs text-muted-foreground shrink-0">–</span>
                            <input type="time" value={d.end}
                              onChange={e => setHours(h => ({ ...h, [k]: { ...d, end: e.target.value } }))}
                              className={inputCls + ' !px-2 !py-1.5 text-xs'} style={inputStyle} />
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground flex-1">Closed</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Booking rules */}
              <div className="pt-4" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                <label className="text-xs font-medium text-muted-foreground block mb-3">Booking rules</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Slot length</label>
                    <div className="flex gap-1.5">
                      {[30, 45, 60, 90].map(m => (
                        <button key={m} onClick={() => setBookingRules(b => ({ ...b, slotMinutes: m }))}
                          className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={bookingRules.slotMinutes === m
                            ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
                            : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }}>
                          {m}m
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Buffer between jobs</label>
                    <div className="flex gap-1.5">
                      {[0, 15, 30].map(m => (
                        <button key={m} onClick={() => setBookingRules(b => ({ ...b, bufferMinutes: m }))}
                          className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={bookingRules.bufferMinutes === m
                            ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
                            : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }}>
                          {m}m
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Max bookings/day</label>
                    <input type="number" min="1" max="50" value={bookingRules.maxPerDay}
                      onChange={e => setBookingRules(b => ({ ...b, maxPerDay: Math.max(1, Number(e.target.value) || 1) }))}
                      className={inputCls + ' !py-1.5'} style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Minimum notice</label>
                    <div className="flex gap-1.5">
                      {[2, 12, 24, 48].map(h => (
                        <button key={h} onClick={() => setBookingRules(b => ({ ...b, leadHours: h }))}
                          className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={bookingRules.leadHours === h
                            ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
                            : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }}>
                          {h}h
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-1">
                <button onClick={() => setHoursOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground"
                  style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>Cancel</button>
                <button onClick={saveHours} disabled={savingHours}
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                  {savingHours ? 'Saving…' : 'Save Hours'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reminder settings modal */}
      {reminderSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-md rounded-xl overflow-hidden" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4" style={{ color: '#06b6d4' }} />
                <h2 className="text-sm font-semibold text-foreground">Appointment Reminders</h2>
              </div>
              <button onClick={() => setReminderSettingsOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Enable toggle */}
              <button onClick={() => setReminderSettings(s => ({ ...s, enabled: !s.enabled }))}
                className="w-full flex items-center justify-between rounded-lg px-3 py-3"
                style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">Automatic reminders</p>
                  <p className="text-xs text-muted-foreground">Notify clients before their appointment</p>
                </div>
                <span className="relative inline-flex h-5 w-9 rounded-full transition-colors shrink-0"
                  style={{ background: reminderSettings.enabled ? '#06b6d4' : 'rgba(255,255,255,0.15)' }}>
                  <span className="absolute top-0.5 h-4 w-4 rounded-full transition-transform"
                    style={{ background: 'white', transform: reminderSettings.enabled ? 'translateX(18px)' : 'translateX(2px)' }} />
                </span>
              </button>

              {/* Timing */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2">Send reminder</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 4, 24, 48].map(h => (
                    <button key={h} onClick={() => setReminderSettings(s => ({ ...s, hoursBefore: h }))}
                      className="py-2 rounded-lg text-xs font-medium transition-all"
                      style={reminderSettings.hoursBefore === h
                        ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
                        : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }}>
                      {h < 24 ? `${h}h` : `${h / 24}d`} before
                    </button>
                  ))}
                </div>
              </div>

              {/* Channel */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2">Channel</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['email', 'sms', 'both'] as const).map(ch => (
                    <button key={ch} onClick={() => setReminderSettings(s => ({ ...s, channel: ch }))}
                      className="py-2 rounded-lg text-xs font-medium capitalize transition-all"
                      style={reminderSettings.channel === ch
                        ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
                        : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }}>
                      {ch === 'both' ? 'Email + SMS' : ch.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-1">
                <button onClick={() => setReminderSettingsOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground"
                  style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>Cancel</button>
                <button onClick={saveReminderSettings} disabled={savingReminders}
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                  {savingReminders ? 'Saving…' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              <div className="flex items-center gap-2 mb-3">
                <Repeat className="h-3.5 w-3.5" style={{ color: '#a78bfa' }} />
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Repeats</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {REPEAT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setRepeat(r => ({ ...r, freq: opt.value }))}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={repeat.freq === opt.value
                      ? { background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)', color: 'white' }
                      : { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {repeat.freq !== 'none' && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">for</span>
                    <input
                      type="number" min={2} max={24}
                      value={repeat.count}
                      onChange={e => setRepeat(r => ({ ...r, count: Math.min(24, Math.max(2, Number(e.target.value) || 2)) }))}
                      className={inputCls + ' !w-20 !py-1.5'}
                      style={inputStyle}
                    />
                    <span className="text-xs text-muted-foreground">visits</span>
                  </div>
                  <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {(() => {
                      const dates = seriesDates(bookForm.date, bookForm.time, repeat.freq, repeat.count)
                      const preview = dates.slice(0, 3).map(d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })).join(', ')
                      return dates.length > 3 ? `${preview} …and ${dates.length - 3} more` : preview
                    })()}
                  </p>
                </div>
              )}
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
