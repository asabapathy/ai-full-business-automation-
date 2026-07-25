'use client'

import { useState, useEffect } from 'react'
import { Calendar, Plus, Clock, CheckCircle, ChevronLeft, ChevronRight, Phone, Zap } from 'lucide-react'
import { Badge } from '../../../../../components/ui/badge'
import { Skeleton } from '../../../../../components/ui/skeleton'
import { api } from '../../../../../lib/api-client'

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

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'info',
  CONFIRMED: 'success',
  COMPLETED: 'secondary',
  CANCELLED: 'destructive',
  NO_SHOW: 'warning',
}

function formatTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]!)
  const [analytics, setAnalytics] = useState<{ totalAppointments: number; completedAppointments: number; showRate: number } | null>(null)

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
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().split('T')[0]!)
  }

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      {/* Header */}
      <div {...anim(0)} className="kv-anim flex items-center justify-between" style={{ animationDelay: '0.04s' }}>
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Receptionist</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Appointment scheduling and management</p>
        </div>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            style={{ border: '1px solid rgba(6,182,212,0.3)' }}
          >
            <Zap className="h-4 w-4" />
            AI Book
          </button>
          <button
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
          { label: 'This Month', value: analytics?.totalAppointments ?? '--', icon: Calendar, color: 'text-primary' },
          { label: 'Completed', value: analytics?.completedAppointments ?? '--', icon: CheckCircle, color: 'text-emerald-400' },
          { label: 'Show Rate', value: analytics ? `${analytics.showRate}%` : '--', icon: Clock, color: 'text-violet-400' },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="kv-anim rounded-xl border p-4"
            style={{
              animationDelay: `${0.11 + i * 0.07}s`,
              background: 'hsl(var(--card))',
              borderColor: 'hsl(var(--border))',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
            {isLoading
              ? <Skeleton className="h-8 w-16 mt-1" />
              : <p className={`text-2xl font-bold tabular ${stat.color}`}>{stat.value}</p>
            }
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Day View */}
        <div className="lg:col-span-2 space-y-4">
          {/* Date Navigation */}
          <div className="kv-anim flex items-center justify-between" style={{ animationDelay: '0.32s' }}>
            <button
              onClick={() => changeDate(-1)}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="font-semibold text-sm text-foreground">
              {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h2>
            <button
              onClick={() => changeDate(1)}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div
            className="kv-anim rounded-xl border overflow-hidden"
            style={{ animationDelay: '0.39s', background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
          >
            <div className="px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
              <h3 className="text-sm font-semibold text-foreground">
                Schedule — {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
              </h3>
            </div>

            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
              </div>
            ) : appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <Calendar className="h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="font-medium text-sm text-foreground">No appointments today</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                {appointments.map(appt => (
                  <div key={appt.id} className="flex items-start gap-4 px-5 py-4 hover:bg-accent/40 transition-colors">
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

                    <Badge variant={(STATUS_COLORS[appt.status] as never) ?? 'outline'} className="text-xs">
                      {appt.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Available Slots */}
        <div
          className="kv-anim rounded-xl border overflow-hidden"
          style={{ animationDelay: '0.46s', background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
        >
          <div className="px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
            <h3 className="text-sm font-semibold text-foreground">Available Slots</h3>
          </div>
          <div className="p-4 space-y-2">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9" />)
            ) : (
              slots.filter(s => s.available).slice(0, 6).map((slot, i) => (
                <button
                  key={i}
                  className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all hover:bg-primary/10"
                  style={{ border: '1px solid hsl(var(--border))' }}
                >
                  <span className="font-medium text-foreground tabular">{formatTime(slot.startTime)}</span>
                  <span className="text-xs text-muted-foreground">1h</span>
                  <span className="text-xs text-primary font-medium">Book</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
