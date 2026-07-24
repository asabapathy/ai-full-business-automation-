'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { apiClient } from '../../../lib/api-client'
import { Star, CheckCircle } from 'lucide-react'

interface CsatData {
  id: string
  score?: number
  submittedAt?: string
  survey: {
    name: string
    question: string
    organization: { name: string }
  }
}

export default function CsatResponsePage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<CsatData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    apiClient.get<{ response: CsatData }>(`/csat/respond/${token}`)
      .then(res => {
        setData(res.response)
        if (res.response.submittedAt) setSubmitted(true)
      })
      .catch(() => setError('This survey link is invalid or has expired.'))
      .finally(() => setLoading(false))
  }, [token])

  async function submit() {
    if (!score) return
    setSubmitting(true)
    try {
      await apiClient.post(`/csat/respond/${token}`, { score, comment: comment || undefined })
      setSubmitted(true)
    } catch (e: any) {
      setError(e.message ?? 'Failed to submit. Please try again.')
    } finally { setSubmitting(false) }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-muted-foreground animate-pulse">Loading…</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="bg-white dark:bg-gray-900 border rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
          <p className="text-red-500 font-medium">{error ?? 'Survey not found.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="bg-white dark:bg-gray-900 border rounded-2xl p-8 max-w-md w-full shadow-sm space-y-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground font-medium">{data.survey.organization.name}</p>
          <h1 className="text-xl font-bold mt-1">{data.survey.name}</h1>
        </div>

        {submitted ? (
          <div className="text-center space-y-3 py-4">
            <CheckCircle className="h-14 w-14 text-green-500 mx-auto" />
            <p className="text-lg font-semibold">Thank you for your feedback!</p>
            <p className="text-muted-foreground text-sm">Your response has been recorded.</p>
          </div>
        ) : (
          <>
            <div className="text-center">
              <p className="text-base font-medium">{data.survey.question}</p>
            </div>

            <div className="flex justify-center gap-3">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s}
                  onClick={() => setScore(s)}
                  onMouseEnter={() => setHovered(s)}
                  onMouseLeave={() => setHovered(0)}
                  className="transition-transform hover:scale-110 focus:outline-none">
                  <Star
                    className={`h-10 w-10 transition-colors ${(hovered || score) >= s ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                  />
                </button>
              ))}
            </div>

            {score > 0 && (
              <p className="text-center text-sm font-medium text-muted-foreground">
                {['', 'Very dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very satisfied'][score]}
              </p>
            )}

            <div>
              <label className="text-sm font-medium block mb-2">Additional comments (optional)</label>
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                rows={3} placeholder="Tell us more about your experience…"
                className="w-full border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
            </div>

            <button onClick={submit} disabled={submitting || !score}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-medium text-sm disabled:opacity-50 hover:opacity-90 transition-opacity">
              {submitting ? 'Submitting…' : 'Submit Feedback'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
