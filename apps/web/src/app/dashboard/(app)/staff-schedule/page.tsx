'use client'

import { useState, useEffect } from 'react'
import { Clock, Plus, Check, X, Calendar } from 'lucide-react'
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

export default function StaffSchedulePage() {
  const [tab, setTab] = useState<Tab>('shifts')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [timeOff, setTimeOff] = useState<TimeOffRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showShiftForm, setShowShiftForm] = useState(false)
  const [shiftForm, setShiftForm] = useState({ employeeId: '', date: '', startTime: '09:00', endTime: '17:00', role: '' })

  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

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
        <Button onClick={() => setShowShiftForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Shift
        </Button>
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
