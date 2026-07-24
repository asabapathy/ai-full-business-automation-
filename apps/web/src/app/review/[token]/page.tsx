'use client'

import { useState } from 'react'
import { Star, CheckCircle } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { apiClient } from '../../../lib/api-client'

export default function ReviewFeedbackPage({ params }: { params: { token: string } }) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ redirectUrl: string | null } | null>(null)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) { setError('Please select a rating.'); return }
    setSubmitting(true)
    try {
      const data = await apiClient.post('/review-requests/feedback', {
        token: params.token,
        rating,
        note: note || undefined,
      })
      setResult(data)
      if (data.redirectUrl) {
        setTimeout(() => { window.location.href = data.redirectUrl }, 1500)
      }
    } catch {
      setError('Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-lg space-y-4">
          <CheckCircle className="h-14 w-14 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold">Thank you!</h1>
          {result.redirectUrl ? (
            <p className="text-muted-foreground">We're glad you had a great experience! Redirecting you to leave a public review...</p>
          ) : (
            <p className="text-muted-foreground">Your feedback has been received. We appreciate you helping us improve!</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-lg space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">How was your experience?</h1>
          <p className="text-muted-foreground text-sm">Your feedback helps us improve our service.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Stars */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <button
                key={i}
                type="button"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(0)}
                onClick={() => { setRating(i); setError('') }}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-10 w-10 transition-colors ${
                    i <= (hover || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground'
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-center text-sm font-medium text-muted-foreground">
              {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][rating]}
            </p>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">Additional comments (optional)</label>
            <textarea
              className="w-full rounded-xl border bg-background px-4 py-3 text-sm resize-none min-h-[100px]"
              placeholder="Tell us more about your experience..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" size="lg" disabled={submitting || rating === 0}>
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </form>
      </div>
    </div>
  )
}
