'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'

interface Service {
  id: string
  name: string
  description?: string
  duration: number
  price: number
  category?: string
  color?: string
}

interface Slot {
  start: string
  end: string
}

type Step = 'service' | 'datetime' | 'info' | 'confirm' | 'done'

export default function BookingPage() {
  const { slug } = useParams() as { slug: string }
  const [orgName, setOrgName] = useState('')
  const [services, setServices] = useState<Service[]>([])
  const [step, setStep] = useState<Step>('service')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', notes: '' })

  useEffect(() => {
    fetch(`${API_URL}/portal/${slug}`)
      .then(r => r.json())
      .then(d => { if (d.success) setOrgName(d.data.org.name) })

    fetch(`${API_URL}/portal/${slug}/services`)
      .then(r => r.json())
      .then(d => { if (d.success) setServices(d.data.services) })
  }, [slug])

  useEffect(() => {
    if (!selectedService || !selectedDate) return
    setLoadingSlots(true)
    setSlots([])
    setSelectedSlot(null)
    fetch(`${API_URL}/portal/${slug}/book/slots?serviceId=${selectedService.id}&date=${selectedDate}`)
      .then(r => r.json())
      .then(d => { if (d.success) setSlots(d.data.slots) })
      .finally(() => setLoadingSlots(false))
  }, [selectedService, selectedDate, slug])

  const handleBook = async () => {
    if (!selectedService || !selectedSlot) return
    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/portal/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedService.id,
          startTime: selectedSlot.start,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone || undefined,
          notes: form.notes || undefined,
        }),
      })
      const data = await res.json() as { success: boolean; error?: string }
      if (data.success) {
        setStep('done')
      } else {
        toast.error(data.error ?? 'Booking failed. Please try again.')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]!

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="min-h-screen">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href={`/portal/${slug}`} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            ←
          </Link>
          <div>
            <h1 className="font-bold text-gray-900 dark:text-white">{orgName}</h1>
            <p className="text-xs text-gray-500">Book an Appointment</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* Steps indicator */}
        {step !== 'done' && (
          <div className="flex items-center gap-2 mb-8 overflow-x-auto">
            {(['service', 'datetime', 'info', 'confirm'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2 shrink-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === s ? 'bg-blue-600 text-white' :
                  ['service', 'datetime', 'info', 'confirm'].indexOf(step) > i ? 'bg-green-500 text-white' :
                  'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}>
                  {['service', 'datetime', 'info', 'confirm'].indexOf(step) > i ? '✓' : i + 1}
                </div>
                <span className={`text-xs capitalize ${step === s ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-400'}`}>
                  {s === 'datetime' ? 'Date & Time' : s === 'info' ? 'Your Info' : s}
                </span>
                {i < 3 && <div className="w-8 h-px bg-gray-200 dark:bg-gray-700" />}
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Select service */}
        {step === 'service' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Choose a service</h2>
            {services.length === 0 ? (
              <p className="text-gray-500 text-center py-12">No services available at this time.</p>
            ) : (
              <div className="grid gap-3">
                {services.map(svc => (
                  <button
                    key={svc.id}
                    onClick={() => { setSelectedService(svc); setStep('datetime') }}
                    className="w-full text-left bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-blue-400 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{svc.name}</div>
                        {svc.description && <div className="text-sm text-gray-500 mt-1">{svc.description}</div>}
                        <div className="text-sm text-gray-400 mt-2">{svc.duration} min</div>
                      </div>
                      <div className="text-lg font-semibold text-blue-600 dark:text-blue-400 ml-4">
                        ${Number(svc.price).toFixed(2)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Date & time */}
        {step === 'datetime' && selectedService && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Pick a date & time</h2>
            <p className="text-gray-500 text-sm mb-5">{selectedService.name} · {selectedService.duration} min</p>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date</label>
              <input
                type="date"
                min={today}
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {selectedDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Available times for {formatDate(selectedDate + 'T12:00:00')}
                </label>
                {loadingSlots ? (
                  <div className="flex items-center gap-2 text-gray-500 py-4">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    Checking availability...
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-gray-500 py-4">No availability on this date. Please choose another day.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map(slot => (
                      <button
                        key={slot.start}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2.5 rounded-lg text-sm font-medium border-2 transition-colors ${
                          selectedSlot?.start === slot.start
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {formatTime(slot.start)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep('service')} className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Back
              </button>
              <button
                onClick={() => setStep('info')}
                disabled={!selectedSlot}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Contact info */}
        {step === 'info' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Your information</h2>
            <p className="text-gray-500 text-sm mb-5">We&apos;ll send your confirmation here</p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First name *</label>
                <input
                  value={form.firstName}
                  onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last name</label>
                <input
                  value={form.lastName}
                  onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone (optional)</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Anything we should know before your appointment?"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('datetime')} className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Back
              </button>
              <button
                onClick={() => setStep('confirm')}
                disabled={!form.firstName || !form.email}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                Review booking
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 'confirm' && selectedService && selectedSlot && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-5">Confirm your booking</h2>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-5 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Service</span>
                <span className="font-medium text-gray-900 dark:text-white">{selectedService.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Date</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatDate(selectedSlot.start)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Time</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatTime(selectedSlot.start)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Duration</span>
                <span className="font-medium text-gray-900 dark:text-white">{selectedService.duration} min</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 dark:border-gray-700 pt-3">
                <span className="text-gray-500 text-sm">Price</span>
                <span className="font-bold text-gray-900 dark:text-white">${Number(selectedService.price).toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl p-4 mb-5 text-sm">
              <div className="font-medium text-blue-800 dark:text-blue-200 mb-1">Confirmation will be sent to:</div>
              <div className="text-blue-600 dark:text-blue-400">{form.email}</div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('info')} className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Back
              </button>
              <button
                onClick={handleBook}
                disabled={submitting}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                {submitting ? 'Booking...' : 'Confirm booking'}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Done */}
        {step === 'done' && selectedService && selectedSlot && (
          <div className="text-center py-8">
            <div className="text-6xl mb-5">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Booking confirmed!</h2>
            <p className="text-gray-500 mb-6">
              We&apos;ll see you on <strong>{formatDate(selectedSlot.start)}</strong> at <strong>{formatTime(selectedSlot.start)}</strong>.
              A confirmation has been sent to {form.email}.
            </p>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 text-left max-w-sm mx-auto mb-6">
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">{selectedService.name}</div>
              <div className="text-sm text-gray-500">{formatDate(selectedSlot.start)} · {formatTime(selectedSlot.start)}</div>
              <div className="text-sm text-gray-500">{selectedService.duration} minutes</div>
            </div>
            <Link
              href={`/portal/${slug}`}
              className="inline-block text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              ← Back to portal
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
