'use client'

import { useState, useEffect } from 'react'
import { ClipboardCheck, CheckCircle } from 'lucide-react'
import { apiClient } from '../../../lib/api-client'

interface IntakeField {
  name: string
  label: string
  type: string
  required?: boolean
  options?: string[]
}

interface IntakeData {
  id: string
  status: string
  form: {
    name: string
    description?: string
    fields: IntakeField[]
  }
  contact?: { firstName: string; lastName: string }
}

export default function IntakePage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<IntakeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const json = await apiClient.get(`/intake/public/${params.token}`) as any
        setData(json.intake)
      } catch (e: any) {
        setError(e?.response?.data?.error ?? 'Form not found or link has expired')
      }
      setLoading(false)
    }
    load()
  }, [params.token])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await apiClient.post(`/intake/public/${params.token}/submit`, { data: values })
      setSubmitted(true)
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Failed to submit form')
    }
    setSubmitting(false)
  }

  const renderField = (field: IntakeField) => {
    const base = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none'
    switch (field.type) {
      case 'textarea':
        return <textarea rows={3} className={`${base} resize-none`} required={field.required} value={values[field.name] ?? ''} onChange={e => setValues(v => ({ ...v, [field.name]: e.target.value }))} />
      case 'select':
        return (
          <select className={base} required={field.required} value={values[field.name] ?? ''} onChange={e => setValues(v => ({ ...v, [field.name]: e.target.value }))}>
            <option value="">Select...</option>
            {(field.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )
      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600" checked={values[field.name] === 'true'} onChange={e => setValues(v => ({ ...v, [field.name]: String(e.target.checked) }))} />
            <span className="text-sm text-gray-700">Yes</span>
          </label>
        )
      default:
        return <input type={field.type || 'text'} className={base} required={field.required} value={values[field.name] ?? ''} onChange={e => setValues(v => ({ ...v, [field.name]: e.target.value }))} />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading form...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl">⚠️</div>
          <p className="text-gray-700 font-medium">{error || 'Form not found'}</p>
          <p className="text-sm text-gray-500">This link may have expired or the form has already been submitted.</p>
        </div>
      </div>
    )
  }

  if (submitted || data.status === 'completed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900">Form Submitted!</h1>
          <p className="text-gray-500">Thank you, {data.contact ? data.contact.firstName : 'there'}!</p>
          <p className="text-sm text-gray-400">Your intake form has been received. You may close this window.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
            <ClipboardCheck className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">{data.form.name}</h1>
          {data.form.description && <p className="text-sm text-gray-500">{data.form.description}</p>}
          {data.contact && <p className="text-sm text-gray-600">For: <strong>{data.contact.firstName} {data.contact.lastName}</strong></p>}
        </div>

        <form onSubmit={submit} className="rounded-xl border bg-white p-6 shadow-sm space-y-5">
          {data.form.fields.map(field => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {renderField(field)}
            </div>
          ))}

          {data.form.fields.length === 0 && (
            <p className="text-center text-gray-400 text-sm">No fields configured for this form.</p>
          )}

          <button type="submit" disabled={submitting} className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors mt-2">
            {submitting ? 'Submitting...' : 'Submit Intake Form'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400">This information is securely transmitted and stored.</p>
      </div>
    </div>
  )
}
