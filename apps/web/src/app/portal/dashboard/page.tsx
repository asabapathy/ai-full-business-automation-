'use client'

import { useState, useEffect } from 'react'
import { Calendar, FileText, LogOut, UserCircle, Clock, CheckCircle, AlertCircle } from 'lucide-react'

interface Appointment {
  id: string
  title?: string
  startTime: string
  endTime: string
  status: string
}

interface Invoice {
  id: string
  invoiceNumber?: string
  total: number
  status: string
  dueDate?: string
  createdAt: string
}

interface Contact {
  firstName: string
  lastName?: string
  email: string
  phone?: string
}

export default function PortalDashboardPage() {
  const [contact, setContact] = useState<Contact | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [tab, setTab] = useState<'appointments' | 'invoices'>('appointments')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('portal_token')
    if (!token) { window.location.href = '/portal/login'; return }

    const headers = { 'x-portal-token': token }

    const load = async () => {
      setLoading(true)
      try {
        const [meRes, apptRes, invRes] = await Promise.all([
          fetch('/api/client-portal/me', { headers }).then(r => r.json()),
          fetch('/api/client-portal/appointments', { headers }).then(r => r.json()),
          fetch('/api/client-portal/invoices', { headers }).then(r => r.json()),
        ])
        if (meRes.contact) setContact(meRes.contact)
        else { localStorage.removeItem('portal_token'); window.location.href = '/portal/login'; return }
        setAppointments(apptRes.appointments ?? [])
        setInvoices(invRes.invoices ?? [])
      } catch { window.location.href = '/portal/login' }
      setLoading(false)
    }
    load()
  }, [])

  const logout = () => {
    localStorage.removeItem('portal_token')
    localStorage.removeItem('portal_org')
    window.location.href = '/portal/login'
  }

  const apptStatusIcon = (s: string) => {
    if (s === 'COMPLETED') return <CheckCircle className="h-4 w-4 text-green-500" />
    if (s === 'CANCELED') return <AlertCircle className="h-4 w-4 text-red-400" />
    return <Clock className="h-4 w-4 text-blue-500" />
  }

  const invStatusColor = (s: string) =>
    s === 'PAID' ? 'bg-green-100 text-green-700' :
    s === 'OVERDUE' ? 'bg-red-100 text-red-700' :
    'bg-yellow-100 text-yellow-700'

  const fmt = (n: number) => `$${(n / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400">Loading your portal...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-gray-900">
              {contact ? `${contact.firstName}${contact.lastName ? ' ' + contact.lastName : ''}` : 'My Portal'}
            </span>
          </div>
          <button onClick={logout} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setTab('appointments')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'appointments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Calendar className="h-4 w-4" />
            Appointments
          </button>
          <button
            onClick={() => setTab('invoices')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'invoices' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <FileText className="h-4 w-4" />
            Invoices
          </button>
        </div>

        {tab === 'appointments' && (
          <div className="space-y-3">
            {appointments.length === 0 ? (
              <div className="rounded-xl border bg-white p-8 text-center text-gray-400">
                No appointments found
              </div>
            ) : appointments.map(appt => (
              <div key={appt.id} className="rounded-xl border bg-white p-4 flex items-center gap-4">
                {apptStatusIcon(appt.status)}
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{appt.title ?? 'Appointment'}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(appt.startTime).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                    {' · '}
                    {new Date(appt.startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    {' – '}
                    {new Date(appt.endTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${appt.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : appt.status === 'CANCELED' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-700'}`}>
                  {appt.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {tab === 'invoices' && (
          <div className="space-y-3">
            {invoices.length === 0 ? (
              <div className="rounded-xl border bg-white p-8 text-center text-gray-400">
                No invoices found
              </div>
            ) : invoices.map(inv => (
              <div key={inv.id} className="rounded-xl border bg-white p-4 flex items-center gap-4">
                <FileText className="h-4 w-4 text-gray-400" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Invoice {inv.invoiceNumber ?? `#${inv.id.slice(0, 8)}`}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(inv.createdAt).toLocaleDateString()}
                    {inv.dueDate && ` · Due ${new Date(inv.dueDate).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{fmt(inv.total)}</p>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium mt-1 ${invStatusColor(inv.status)}`}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
