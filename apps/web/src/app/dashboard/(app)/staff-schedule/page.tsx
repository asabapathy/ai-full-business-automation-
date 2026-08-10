'use client'

import { useState, useEffect } from 'react'
import { Clock, Plus, Check, X, Calendar, ChevronLeft, ChevronRight, List, CalendarDays } from 'lucide-react'
import { Button } from '../../../../components/ui/button'
import { apiClient } from '../../../../lib/api-client'

interface Shift {
  id: string
  date: string
  startTime: string
  endTime: string
  role?: string
  status: string
  employee?: { firstName: string; lastName: string }
}

interface TimeOffRequest {
  id: string
  startDate: string
  endDate: string
  type: string
  status: string
  reason?: string
  employee?: { firstName: string; lastName: string }
}

interface Employee {
  id: string
  firstName: string
  lastName: string
  role?: string
}

type Tab = 'shifts' | 'time-off'

const STAFF_COLORS = ['#06b6d4', '#a78bfa', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#fb923c']

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }

function getWeekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })
}

function shiftsOnDay(day: Date, shifts: Shift[]): Shift[] {
  return shifts.filter(s => {
    const dateStr = s.date ?? ''
    if (!dateStr) return false
    const shiftDate = new Date(dateStr)
    return (
      shiftDate.getFullYear() === day.getFullYear() &&
      shiftDate.getMonth() === day.getMonth() &&
      shiftDate.getDate() === day.getDate()
    )
  })
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function getStaffName(s: Shift): string {
  return s.employee ? `${s.employee.firstName} ${s.employee.lastName}` : 'Unknown'
}

export default function StaffSchedulePage() {
  const [tab, setTab] = useState<Tab>('shifts')
  const [view, setView] = useState<'list' | 'week'>('list')
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay()) // Sunday
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [employees, setEmployees] = useState<Employee[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [timeOff, setTimeOff] = useState<TimeOffRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showShiftForm, setShowShiftForm] = useState(false)
  const [shiftForm, setShiftForm] = useState({ employeeId: '', date: '', startTime: '09:00', endTime: '17:00', role: '' })

  const weekEnd = new Date(weekStart.getTime() + 6 * 86400000)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    try {
      const [empData, shiftData, toData] = await Promise.all([
        apiClient.get('/staff-schedule/employees'),
        apiClient.get(`/staff-schedule/shifts?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`),
        apiClient.get('/staff-schedule/time-off'),
      ])
      setEmployees(empData.employees ?? [])
      setShifts(shiftData.shifts ?? [])
      setTimeOff(toData.requests ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateShift(e: React.FormEvent) {
    e.preventDefault()
    await apiClient.post('/staff-schedule/shifts', shiftForm)
    setShowShiftForm(false)
    setShiftForm({ employeeId: '', date: '', startTime: '09:00', endTime: '17:00', role: '' })
    fetchAll()
  }

  async function handleDeleteShift(id: string) {
    await apiClient.delete(`/staff-schedule/shifts/${id}`)
    fetchAll()
  }

  async function handleApproveTimeOff(id: string, approved: boolean) {
    await apiClient.post(`/staff-schedule/time-off/${id}/approve`, { approved })
    fetchAll()
  }

  const statusStyle: Record<string, { background: string; color: string }> = {
    scheduled: { background: 'rgba(6,182,212,0.1)', color: '#06b6d4' },
    completed: { background: 'rgba(52,211,153,0.1)', color: '#34d399' },
    cancelled: { background: 'rgba(248,113,113,0.1)', color: '#f87171' },
    pending: { background: 'rgba(251,191,36,0.1)', color: '#fbbf24' },
    approved: { background: 'rgba(52,211,153,0.1)', color: '#34d399' },
    denied: { background: 'rgba(248,113,113,0.1)', color: '#f87171' },
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Staff Schedule</h1>
        </div>
        <div className="flex items-center gap-3">
          {tab === 'shifts' && (
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid hsl(var(--border))' }}>
              {(['list', 'week'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium capitalize"
                  style={
                    view === v
                      ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
                      : { background: 'hsl(var(--card))', color: 'hsl(var(--muted-foreground))' }
                  }
                >
                  {v === 'list' ? <List className="h-3.5 w-3.5" /> : <CalendarDays className="h-3.5 w-3.5" />}
                  {v === 'list' ? 'List' : 'Week'}
                </button>
              ))}
            </div>
          )}
          <Button onClick={() => setShowShiftForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Shift
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(['shifts', 'time-off'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'time-off' ? 'Time Off' : 'Shifts'}
          </button>
        ))}
      </div>

      {showShiftForm && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold">New Shift</h2>
          <form onSubmit={handleCreateShift} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Employee</label>
              <select
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={shiftForm.employeeId}
                onChange={e => setShiftForm(f => ({ ...f, employeeId: e.target.value }))}
                required
              >
                <option value="">Select employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input type="date" className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={shiftForm.date} onChange={e => setShiftForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role (optional)</label>
              <input type="text" className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                placeholder="e.g. Cashier" value={shiftForm.role} onChange={e => setShiftForm(f => ({ ...f, role: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <input type="time" className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={shiftForm.startTime} onChange={e => setShiftForm(f => ({ ...f, startTime: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input type="time" className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={shiftForm.endTime} onChange={e => setShiftForm(f => ({ ...f, endTime: e.target.value }))} required />
            </div>
            <div className="col-span-2 flex gap-2">
              <Button type="submit">Create Shift</Button>
              <Button variant="outline" type="button" onClick={() => setShowShiftForm(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : tab === 'shifts' ? (
        <>
          {/* Week navigation — only shown in week view */}
          {view === 'week' && (
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })}
                className="p-2 rounded-lg transition-colors"
                style={cardStyle}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
                {new Date(weekStart.getTime() + 6 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <button
                onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })}
                className="p-2 rounded-lg transition-colors"
                style={cardStyle}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* List view */}
          {view === 'list' && (
            <div className="rounded-xl border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Employee</th>
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                    <th className="text-left px-4 py-3 font-medium">Time</th>
                    <th className="text-left px-4 py-3 font-medium">Role</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {shifts.map(s => (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">{s.employee ? `${s.employee.firstName} ${s.employee.lastName}` : '—'}</td>
                      <td className="px-4 py-3">{new Date(s.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{s.startTime} – {s.endTime}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.role ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={statusStyle[s.status] ?? {}}>{s.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteShift(s.id)}>
                          <X className="h-3 w-3 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {shifts.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No shifts this week.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Week calendar view */}
          {view === 'week' && (
            <div className="rounded-xl overflow-hidden" style={cardStyle}>
              {/* Day header row */}
              <div className="grid grid-cols-7" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                {getWeekDays(weekStart).map((day, i) => {
                  const isToday = isSameDay(day, new Date())
                  return (
                    <div
                      key={i}
                      className="py-3 text-center"
                      style={i < 6 ? { borderRight: '1px solid hsl(var(--border))' } : undefined}
                    >
                      <p className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                      </p>
                      <div className="flex items-center justify-center mt-1">
                        <span
                          className="h-7 w-7 flex items-center justify-center rounded-full text-sm font-semibold"
                          style={
                            isToday
                              ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
                              : { color: 'hsl(var(--foreground))' }
                          }
                        >
                          {day.getDate()}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Shift rows — one row per staff member */}
              {(() => {
                const staffNames = [...new Set(shifts.map(getStaffName))]
                if (staffNames.length === 0) {
                  return (
                    <div className="py-12 text-center text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      No shifts scheduled this week
                    </div>
                  )
                }
                return staffNames.map((staffName, si) => {
                  const color = STAFF_COLORS[si % STAFF_COLORS.length]
                  return (
                    <div
                      key={si}
                      className="grid grid-cols-7 min-h-[80px]"
                      style={{ borderTop: '1px solid hsl(var(--border))' }}
                    >
                      {getWeekDays(weekStart).map((day, di) => {
                        const dayShifts = shiftsOnDay(day, shifts).filter(s => getStaffName(s) === staffName)
                        return (
                          <div
                            key={di}
                            className="p-1.5 min-h-[80px]"
                            style={di < 6 ? { borderRight: '1px solid hsl(var(--border))' } : undefined}
                          >
                            {dayShifts.map((shift, sfi) => (
                              <div
                                key={sfi}
                                className="rounded-md p-1.5 mb-1 text-xs"
                                style={{ background: `${color}18`, border: `1px solid ${color}40`, color }}
                              >
                                <p className="font-semibold truncate">{staffName}</p>
                                <p className="truncate" style={{ opacity: 0.8 }}>
                                  {shift.startTime}{shift.endTime ? ` – ${shift.endTime}` : ''}
                                </p>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  )
                })
              })()}
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Employee</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Dates</th>
                <th className="text-left px-4 py-3 font-medium">Reason</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {timeOff.map(r => (
                <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">{r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : '—'}</td>
                  <td className="px-4 py-3 capitalize">{r.type}</td>
                  <td className="px-4 py-3">
                    {new Date(r.startDate).toLocaleDateString()} – {new Date(r.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.reason ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={statusStyle[r.status] ?? {}}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {r.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7" onClick={() => handleApproveTimeOff(r.id, true)}>
                          <Check className="h-3 w-3" style={{ color: '#34d399' }} />
                        </Button>
                        <Button size="sm" variant="outline" className="h-7" onClick={() => handleApproveTimeOff(r.id, false)}>
                          <X className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {timeOff.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No time-off requests.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
