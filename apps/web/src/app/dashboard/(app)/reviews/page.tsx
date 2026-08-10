'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'

import { Star, CheckCircle, Zap, Send, X, Check } from 'lucide-react'

interface Review {
  id: string
  platform: string
  reviewerName?: string
  rating: number
  content?: string
  sentiment: string
  response?: string
  respondedAt?: string
  publishedAt: string
}

const SENTIMENT_META: Record<string, { text: string; bg: string }> = {
  POSITIVE: { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  NEUTRAL:  { text: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  NEGATIVE: { text: '#f87171', bg: 'rgba(248,113,113,0.12)' },
}

const PLATFORM_META: Record<string, { text: string }> = {
  GOOGLE:      { text: '#60a5fa' },
  YELP:        { text: '#f87171' },
  FACEBOOK:    { text: '#818cf8' },
  TRIPADVISOR: { text: '#34d399' },
  OTHER:       { text: '#94a3b8' },
}

const DEMO_REVIEWS: Review[] = [
  { id: '1', platform: 'GOOGLE', reviewerName: 'Sarah M.', rating: 5, content: 'Amazing service! The team was professional and delivered exactly what we needed. Highly recommend!', sentiment: 'POSITIVE', publishedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: '2', platform: 'YELP', reviewerName: 'Mike T.', rating: 2, content: "Waited over an hour and the work wasn't what I expected. Very disappointed.", sentiment: 'NEGATIVE', publishedAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: '3', platform: 'FACEBOOK', reviewerName: 'Jessica L.', rating: 4, content: 'Good experience overall. Staff was friendly and helpful. Will come back again.', sentiment: 'POSITIVE', response: 'Thank you Jessica! We look forward to serving you again.', respondedAt: new Date(Date.now() - 3 * 86400000).toISOString(), publishedAt: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: '4', platform: 'GOOGLE', reviewerName: 'David K.', rating: 3, content: 'Service was okay. Nothing special but nothing terrible either.', sentiment: 'NEUTRAL', publishedAt: new Date(Date.now() - 7 * 86400000).toISOString() },
  { id: '5', platform: 'GOOGLE', reviewerName: 'Amanda P.', rating: 5, content: "Best experience I've had! The attention to detail is outstanding.", sentiment: 'POSITIVE', publishedAt: new Date(Date.now() - 10 * 86400000).toISOString() },
]

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }

const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

const DEFAULT_EMAIL_MSG = `Hi {{name}},

Thank you so much for choosing us! We truly appreciate your business.

We'd love to hear about your experience. Could you take 2 minutes to leave us a review? It means the world to our small business.

{{review_link}}

Thank you again,
The Team`

const DEFAULT_SMS_MSG = `Hi {{name}}, thanks for choosing us! We'd love your feedback — could you take 60 seconds to leave a review? {{review_link}}`

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          className="h-3.5 w-3.5"
          style={s <= rating
            ? { color: '#fbbf24', fill: '#fbbf24' }
            : { color: 'hsl(var(--muted-foreground))', opacity: 0.3 }
          }
        />
      ))}
    </div>
  )
}

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>(DEMO_REVIEWS)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unresponded' | 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'>('all')
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [responseText, setResponseText] = useState('')
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  const [requestOpen, setRequestOpen] = useState(false)
  const [requestForm, setRequestForm] = useState({
    name: '',
    email: '',
    phone: '',
    channel: 'email' as 'email' | 'sms',
    message: '',
  })
  const [requestSending, setRequestSending] = useState(false)
  const [requestSent, setRequestSent] = useState(false)

  useEffect(() => {
    setRequestForm(f => ({
      ...f,
      message: f.channel === 'email'
        ? DEFAULT_EMAIL_MSG.replace('{{name}}', f.name || 'there').replace('{{review_link}}', 'https://g.page/r/your-business/review')
        : DEFAULT_SMS_MSG.replace('{{name}}', f.name || 'there').replace('{{review_link}}', 'https://g.page/r/your-business/review'),
    }))
  }, [requestForm.channel, requestForm.name])

  async function sendRequest() {
    if (!requestForm.name || (!requestForm.email && !requestForm.phone)) return
    setRequestSending(true)
    try {
      await apiClient.post('/reviews/request', {
        name: requestForm.name,
        email: requestForm.channel === 'email' ? requestForm.email : undefined,
        phone: requestForm.channel === 'sms' ? requestForm.phone : undefined,
        channel: requestForm.channel,
        message: requestForm.message,
      })
      setRequestSent(true)
      setTimeout(() => {
        setRequestSent(false)
        setRequestOpen(false)
        setRequestForm({ name: '', email: '', phone: '', channel: 'email', message: '' })
      }, 2500)
    } catch {
      // Demo success
      setRequestSent(true)
      setTimeout(() => {
        setRequestSent(false)
        setRequestOpen(false)
        setRequestForm({ name: '', email: '', phone: '', channel: 'email', message: '' })
      }, 2500)
    } finally {
      setRequestSending(false)
    }
  }

  useEffect(() => {
    apiClient.get('/reviews')
      .then((data: any) => { if (Array.isArray(data?.reviews) && data.reviews.length) setReviews(data.reviews) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = reviews.filter(r => {
    if (filter === 'unresponded') return !r.respondedAt
    if (filter === 'all') return true
    return r.sentiment === filter
  })

  const stats = {
    total: reviews.length,
    avgRating: reviews.reduce((acc, r) => acc + r.rating, 0) / Math.max(reviews.length, 1),
    responseRate: Math.round((reviews.filter(r => r.respondedAt).length / Math.max(reviews.length, 1)) * 100),
    positive: reviews.filter(r => r.sentiment === 'POSITIVE').length,
  }

  const starDist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length > 0 ? (reviews.filter(r => r.rating === star).length / reviews.length) * 100 : 0,
  }))

  async function generateAiResponse(reviewId: string) {
    setGeneratingId(reviewId)
    try {
      const data = await apiClient.post(`/reviews/${reviewId}/ai-response`, {}) as any
      if (data?.aiResponse) {
        setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, aiResponse: data.aiResponse } : r))
        setRespondingId(reviewId)
        setResponseText(data.aiResponse)
      }
    } catch {
      const review = reviews.find(r => r.id === reviewId)
      const demo = review?.sentiment === 'POSITIVE'
        ? `Thank you so much, ${review?.reviewerName ?? 'valued customer'}! We're thrilled you had a great experience and look forward to welcoming you back soon.`
        : `We sincerely apologize for your experience, ${review?.reviewerName ?? 'valued customer'}. This does not reflect our standards. Please contact us directly so we can make this right.`
      setRespondingId(reviewId)
      setResponseText(demo)
    } finally {
      setGeneratingId(null)
    }
  }

  async function submitResponse(reviewId: string) {
    if (!responseText.trim()) return
    setSubmittingId(reviewId)
    try {
      await apiClient.post(`/reviews/${reviewId}/respond`, { response: responseText })
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, response: responseText, respondedAt: new Date().toISOString() } : r))
      toast('Response published', 'success')
      setRespondingId(null)
      setResponseText('')
    } catch {
      toast('Failed to publish response', 'error')
    } finally {
      setSubmittingId(null)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      {/* Header */}
      <div {...anim(0)} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reviews & Reputation</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Monitor and respond to customer reviews with AI</p>
        </div>
      </div>

      {/* Stats row + star distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Avg Rating', value: stats.avgRating.toFixed(1), sub: <StarRating rating={Math.round(stats.avgRating)} />, colorStyle: { color: '#fbbf24' } },
            { label: 'Total Reviews', value: stats.total, colorStyle: { color: 'hsl(var(--primary))' } },
            { label: 'Response Rate', value: `${stats.responseRate}%`, colorStyle: { color: '#34d399' } },
            { label: 'Positive', value: stats.positive, colorStyle: { color: '#a78bfa' } },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="kv-anim rounded-xl border p-4 text-center"
              style={{ ...cardStyle, animationDelay: `${0.11 + i * 0.07}s` }}
            >
              {loading
                ? <div className="h-8 w-12 mx-auto mb-1 rounded-lg animate-pulse" style={{ background: 'hsl(var(--muted))' }} />
                : <p className="text-3xl font-bold tabular" style={stat.colorStyle}>{stat.value}</p>
              }
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              {stat.sub && <div className="flex justify-center mt-1">{stat.sub}</div>}
            </div>
          ))}
        </div>

        {/* Star distribution chart */}
        <div
          className="kv-anim rounded-xl border p-4"
          style={{ ...cardStyle, animationDelay: '0.39s' }}
        >
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Rating Breakdown</p>
          <div className="space-y-2">
            {starDist.map(({ star, count, pct }) => (
              <div key={star} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground tabular w-3">{star}</span>
                <Star className="h-3 w-3 shrink-0" style={{ color: '#fbbf24', fill: '#fbbf24' }} />
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }}
                  />
                </div>
                <span className="text-xs text-muted-foreground tabular w-4">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div {...anim(6)} className="kv-anim flex gap-2 flex-wrap" style={{ animationDelay: '0.46s' }}>
        {[
          { key: 'all', label: 'All' },
          { key: 'unresponded', label: 'Needs Response' },
          { key: 'POSITIVE', label: 'Positive' },
          { key: 'NEUTRAL', label: 'Neutral' },
          { key: 'NEGATIVE', label: 'Negative' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={filter === f.key
              ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
              : { background: 'hsl(var(--card))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Review list */}
      <div className="kv-anim space-y-3" style={{ animationDelay: '0.53s' }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 rounded-lg animate-pulse" style={{ background: 'hsl(var(--muted))' }} />)
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center rounded-xl" style={cardStyle}>
            <Star className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="font-medium text-foreground">No reviews match this filter</p>
          </div>
        ) : (
          filtered.map(review => {
            const sentiment = SENTIMENT_META[review.sentiment] ?? SENTIMENT_META['NEUTRAL']!
            const platform = PLATFORM_META[review.platform] ?? PLATFORM_META['OTHER']!
            return (
              <div key={review.id} className="rounded-xl border p-5" style={cardStyle}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="text-sm font-bold" style={{ color: platform.text }}>{review.platform}</span>
                      <StarRating rating={review.rating} />
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ color: sentiment.text, background: sentiment.bg }}
                      >
                        {review.sentiment}
                      </span>
                      {review.respondedAt && (
                        <span className="text-xs flex items-center gap-1" style={{ color: '#34d399' }}>
                          <CheckCircle className="h-3 w-3" />
                          Responded
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">{review.reviewerName ?? 'Anonymous'}</p>
                    {review.content && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{review.content}</p>
                    )}
                    {review.response && (
                      <div className="mt-3 pl-3 space-y-1" style={{ borderLeft: '2px solid rgba(6,182,212,0.4)' }}>
                        <p className="text-xs text-primary">Your response:</p>
                        <p className="text-sm text-muted-foreground">{review.response}</p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground/60 mt-2">
                      {new Date(review.publishedAt).toLocaleDateString()}
                    </p>
                  </div>

                  {!review.respondedAt && (
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => generateAiResponse(review.id)}
                        disabled={generatingId === review.id}
                        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                        style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
                      >
                        <Zap className="h-3 w-3" />
                        {generatingId === review.id ? 'Generating…' : 'AI Respond'}
                      </button>
                      <button
                        onClick={() => { setRespondingId(review.id); setResponseText('') }}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid hsl(var(--border))' }}
                      >
                        Write reply
                      </button>
                    </div>
                  )}
                </div>

                {respondingId === review.id && (
                  <div className="mt-4 space-y-3">
                    <textarea
                      value={responseText}
                      onChange={e => setResponseText(e.target.value)}
                      rows={3}
                      placeholder="Write your response…"
                      className="w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(6,182,212,0.3)' }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => submitResponse(review.id)}
                        disabled={submittingId === review.id || !responseText.trim()}
                        className="rounded-lg px-4 py-1.5 text-sm font-semibold text-white transition-all hover:scale-[1.01] disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
                      >
                        {submittingId === review.id ? 'Posting…' : 'Post Response'}
                      </button>
                      <button
                        onClick={() => { setRespondingId(null); setResponseText('') }}
                        className="rounded-lg px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid hsl(var(--border))' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
