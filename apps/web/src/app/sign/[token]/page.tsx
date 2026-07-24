'use client'

import { useState, useEffect, useRef } from 'react'
import { FileSignature, CheckCircle } from 'lucide-react'
import { apiClient } from '../../../lib/api-client'

interface SignDoc {
  id: string
  status: string
  expiresAt: string
  template: {
    name: string
    content: string
    fields: Array<{ name: string; label: string; type: string; required?: boolean }>
  }
}

export default function SignPage({ params }: { params: { token: string } }) {
  const [doc, setDoc] = useState<SignDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [signed, setSigned] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiClient.get(`/documents/sign/${params.token}`) as any
        setDoc(data.document)
      } catch (e: any) {
        setError(e?.response?.data?.error ?? 'Document not found or expired')
      }
      setLoading(false)
    }
    load()
  }, [params.token])

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    setDrawing(true)
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')!
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')!
    ctx.lineWidth = 2
    ctx.strokeStyle = '#1e3a5f'
    ctx.lineCap = 'round'
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
    setHasSignature(true)
  }

  const endDraw = () => setDrawing(false)

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const submit = async () => {
    if (!hasSignature) { alert('Please draw your signature'); return }
    const canvas = canvasRef.current
    if (!canvas) return
    const signatureData = canvas.toDataURL('image/png')
    setSubmitting(true)
    try {
      await apiClient.post(`/documents/sign/${params.token}`, { signatureData, fieldValues })
      setSigned(true)
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Failed to sign document')
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading document...</div>
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl">⚠️</div>
          <p className="text-gray-700 font-medium">{error || 'Document not found'}</p>
          <p className="text-sm text-gray-500">This link may have expired or already been signed.</p>
        </div>
      </div>
    )
  }

  if (signed || doc.status === 'signed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900">Document Signed</h1>
          <p className="text-gray-500">You have successfully signed <strong>{doc.template.name}</strong>.</p>
          <p className="text-sm text-gray-400">You may close this window.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
            <FileSignature className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{doc.template.name}</h1>
            <p className="text-sm text-gray-500">Please review and sign the document below</p>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: doc.template.content }} />
        </div>

        {doc.template.fields.length > 0 && (
          <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-gray-900">Required Information</h2>
            {doc.template.fields.map(field => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                <input
                  type={field.type === 'date' ? 'date' : 'text'}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none"
                  value={fieldValues[field.name] ?? ''}
                  onChange={e => setFieldValues(v => ({ ...v, [field.name]: e.target.value }))}
                  required={field.required}
                />
              </div>
            ))}
          </div>
        )}

        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Your Signature</h2>
            <button onClick={clearSignature} className="text-xs text-gray-500 hover:text-red-500 underline">Clear</button>
          </div>
          <p className="text-sm text-gray-500">Draw your signature in the box below using your mouse or touch.</p>
          <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden">
            <canvas
              ref={canvasRef}
              width={700}
              height={160}
              className="w-full touch-none cursor-crosshair"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
            />
          </div>
          {!hasSignature && <p className="text-xs text-gray-400 text-center">Sign above</p>}
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-xs text-gray-500 mb-4">
            By clicking "Sign Document", I agree that my electronic signature is legally binding and I have read and understood the document above.
          </p>
          <button onClick={submit} disabled={submitting || !hasSignature} className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {submitting ? 'Signing...' : 'Sign Document'}
          </button>
          <p className="text-xs text-gray-400 text-center mt-3">
            Expires: {new Date(doc.expiresAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  )
}
