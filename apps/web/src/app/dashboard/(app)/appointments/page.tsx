'use client'

import { useState, useEffect } from 'react'
import { Calendar, Plus, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight, Phone, Zap } from 'lucide-react'
import { Button } from '../../../../../components/ui/button'
import { Badge } from '../../../../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/card'
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

function formatDate(isoString: string) {
  return new Date(isoString).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
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
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Receptionist</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Appointment scheduling and management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Zap className="h-4 w-4" />
            AI Book
          </Button>
          <Button>
            <Plus className="h-4 w-4" />
            New Appointment
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'This Month', value: analytics?.totalAppointments ?? '--', icon: Calendar, color: 'text-blue-600' },
          { label: 'Completed', value: analytics?.completedAppointments ?? '--', icon: CheckCircle, color: 'text-green-600' },
          { label: 'Show Rate', value: analytics ? `${analytics.showRate}%` : '--', icon: Clock, color: 'text-purple-600' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
              {isLoading ? <Skeleton className="h-8 w-16 mt-1" /> : <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Day View */}
        <div className="lg:col-span-2 space-y-4">
          {/* Date Navigation */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => changeDate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="font-semibold">{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
            <Button variant="ghost" size="icon" onClick={() => changeDate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Schedule — {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
                </div>
              ) : appointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <Calendar className="h-8 w-8 text-muted-foreground/50 mb-3" />
                  <p className="font-medium text-sm">No appointments today</p>
                </div>
              ) : (
                <div className="divide-y">
                  {appointments.map(appt => (
                    <div key={appt.id} className="flex items-start gap-4 px-6 py-4 hover:bg-muted/50 transition-colors">
                      <div className="text-center shrink-0 w-14">
                        <p className="text-sm font-bold">{formatTime(appt.startTime)}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{appt.duration}m</p>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{appt.title}</p>
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
                        {appt.service && <p className="text-xs text-muted-foreground">{appt.service.name}{appt.service.price ? ` — $${appt.service.price}` : ''}</p>}
                      </div>

                      <Badge variant={(STATUS_COLORS[appt.status] as never) ?? 'outline'} className="text-xs">
                        {appt.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Availability */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Available Slots</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9" />)
              ) : slots.filter(s => s.available).slice(0, 6).map((slot, i) => (
                <button
                  key={i}
                  className="w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-primary/5 hover:border-primary/50 transition-colors"
                >
                  <span className="font-medium">{formatTime(slot.startTime)}</span>
                  <span className="text-xs text-muted-foreground">1h</span>
                  <span className="text-xs text-green-600 font-medium">Book</span>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
