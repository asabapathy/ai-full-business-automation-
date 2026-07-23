'use client'

import { useState, useEffect, useRef } from 'react'
import { FileSignature, CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { apiClient } from '../../../lib/api-client'

interface Proposal {
  id: string
  title: string
  htmlContent: string
  totalAmount: number
  status: 'DRAFT' | 'SENT' | 'SIGNED'
  signedAt?: string
  organization?: { name: string }
  contact?: { firstName: string; lastName: string; email: string }
}

export default function ProposalViewPage({ params }: { params: { token: string } }) {
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(false)
  const [signerName, setSignerName] = useState('')
  const [signerEmail, setSignerEmail] = useState('')
  const [showSignForm, setShowSignForm] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)

  useEffect(() => {
    fetchProposal()
  }, [])

  async function fetchProposal() {
    try {
      const data = await apiClient.get(`/proposals/view/${params.token}`)
      setProposal(data.proposal)
      if (data.proposal.contact) {
        setSignerName(`${data.proposal.contact.firstName} ${data.proposal.contact.lastName}`)
        setSignerEmail(data.proposal.contact.email)
      }
    } catch {
      setError('Proposal not found or has expired.')
    } finally {
      setLoading(false)
    }
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    drawing.current = true
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  function stopDraw() { drawing.current = false }

  function clearSignature() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  async function handleSign(e: React.FormEvent) {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const signatureData = canvas.toDataURL()
    setSigning(true)
    try {
      await apiClient.post(`/proposals/sign/${params.token}`, {
        signerName,
        signerEmail,
        signatureData,
      })
      setSigned(true)
    } catch {
      setError('Failed to sign proposal. Please try again.')
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && !proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <p className="text-xl font-semibold">{error}</p>
          <p className="text-muted-foreground text-sm">This link may be invalid or expired.</p>
        </div>
      </div>
    )
  }

  if (signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-lg space-y-4">
          <CheckCircle className="h-14 w-14 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold">Proposal Signed!</h1>
          <p className="text-muted-foreground">Thank you, {signerName}. Your signature has been recorded and the business has been notified.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{proposal?.title}</h1>
            {proposal?.organization && (
              <p className="text-muted-foreground text-sm">From {proposal.organization.name}</p>
            )}
          </div>
          {proposal?.status === 'SIGNED' ? (
            <div className="flex items-center gap-2 rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1.5 text-sm font-medium text-green-700 dark:text-green-300">
              <CheckCircle className="h-4 w-4" />
              Signed
            </div>
          ) : (
            <Button onClick={() => setShowSignForm(true)}>
              <FileSignature className="h-4 w-4 mr-2" />
              Sign Proposal
            </Button>
          )}
        </div>

        {/* Proposal content */}
        <div
          className="rounded-xl border bg-card p-8 prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: proposal?.htmlContent ?? '' }}
        />

        {/* Sign form */}
        {showSignForm && proposal?.status !== 'SIGNED' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-card border p-6 space-y-5 shadow-xl">
              <div className="flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-lg">Sign Proposal</h2>
              </div>
              <form onSubmit={handleSign} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Full Name</label>
                    <input
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      value={signerName}
                      onChange={e => setSignerName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      value={signerEmail}
                      onChange={e => setSignerEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium">Signature</label>
                    <button type="button" onClick={clearSignature} className="text-xs text-muted-foreground hover:text-foreground">
                      Clear
                    </button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={460}
                    height={120}
                    className="w-full rounded-lg border bg-white cursor-crosshair"
                    style={{ touchAction: 'none' }}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Draw your signature above</p>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={signing}>
                    {signing ? 'Signing...' : 'Sign & Accept Proposal'}
                  </Button>
                  <Button variant="outline" type="button" onClick={() => setShowSignForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
