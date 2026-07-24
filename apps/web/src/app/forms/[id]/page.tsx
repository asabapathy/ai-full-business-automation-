'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle } from 'lucide-react'

interface FormField {
  id: string
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'number'
  label: string
  placeholder?: string
  required?: boolean
  options?: string[]
}

interface LeadForm {
  id: string
  name: string
  description?: string
  fields: FormField[]
  settings: {
    submitLabel?: string
    successMessage?: string
  }
}

export default function PublicFormPage({ params }: { params: { id: string } }) {
  const [form, setForm] = useState<LeadForm | null>(null)
  const [values, setValues] = useState<Record<string, any>>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    fetch(`/api/forms/public/${params.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.form) {
          setForm(data.form)
          const init: Record<string, any> = {}
          data.form.fields.forEach((f: FormField) => { init[f.id] = f.type === 'checkbox' ? false : '' })
          setValues(init)
        }
      })
      .catch(() => setStatus('error'))
  }, [params.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return
    setStatus('loading')
    try {
      const res = await fetch(`/api/forms/public/${params.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Submission failed')
      }
      setStatus('success')
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Submission failed')
      setStatus('error')
    }
  }

  const renderField = (field: FormField) => {
    const base = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
    const val = values[field.id] ?? ''
    const onChange = (v: any) => setValues(prev => ({ ...prev, [field.id]: v }))

    switch (field.type) {
      case 'textarea':
        return <textarea rows={4} className={`${base} resize-none`} placeholder={field.placeholder} value={val} onChange={e => onChange(e.target.value)} required={field.required} />
      case 'select':
        return (
          <select className={base} value={val} onChange={e => onChange(e.target.value)} required={field.required}>
            <option value="">Select...</option>
            {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )
      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={!!val} onChange={e => onChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
            <span className="text-sm text-gray-700">{field.label}</span>
          </label>
        )
      case 'number':
        return <input type="number" className={base} placeholder={field.placeholder} value={val} onChange={e => onChange(e.target.value)} required={field.required} />
      default:
        return <input type={field.type} className={base} placeholder={field.placeholder} value={val} onChange={e => onChange(e.target.value)} required={field.required} />
    }
  }

  if (!form && status !== 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Loading form...</div>
      </div>
    )
  }

  if (!form || status === 'error' && !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-gray-600">Form not found or unavailable.</p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Submitted!</h2>
          <p className="text-gray-500">{form.settings?.successMessage ?? "Thank you! We'll be in touch soon."}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{form.name}</h1>
        {form.description && <p className="text-gray-500 text-sm mb-6">{form.description}</p>}

        <form onSubmit={handleSubmit} className="space-y-5">
          {form.fields.map(field => (
            <div key={field.id}>
              {field.type !== 'checkbox' && (
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
              )}
              {renderField(field)}
            </div>
          ))}

          {status === 'error' && errorMsg && (
            <p className="text-sm text-red-600 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {status === 'loading' ? 'Submitting...' : (form.settings?.submitLabel ?? 'Submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
