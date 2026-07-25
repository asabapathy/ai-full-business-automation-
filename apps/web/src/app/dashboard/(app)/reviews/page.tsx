'use client'

import { useState, useEffect } from 'react'
import { Star, MessageSquare, TrendingUp, CheckCircle, Zap } from 'lucide-react'

interface Review {
  id: string
  platform: string
  reviewerName?: string
  rating: number
  content?: string
  sentiment: string
  response?: string
  aiResponse?: string
  respondedAt?: string
  publishedAt: string
}

const DEMO_REVIEWS: Review[] = [
  { id: '1', platform: 'GOOGLE', reviewerName: 'Sarah M.', rating: 5, content: 'Amazing service! The team was professional and delivered exactly what we needed. Highly recommend!', sentiment: 'POSITIVE', publishedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: '2', platform: 'YELP', reviewerName: 'Mike T.', rating: 2, content: "Waited over an hour and the work wasn't what I expected. Very disappointed.", sentiment: 'NEGATIVE', publishedAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: '3', platform: 'FACEBOOK', reviewerName: 'Jessica L.', rating: 4, content: 'Good experience overall. Staff was friendly and helpful. Will come back again.', sentiment: 'POSITIVE', response: 'Thank you Jessica! We look forward to serving you again.', respondedAt: new Date(Date.now() - 3 * 86400000).toISOString(), publishedAt: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: '4', platform: 'GOOGLE', reviewerName: 'David K.', rating: 3, content: 'Service was okay. Nothing special but nothing terrible either.', sentiment: 'NEUTRAL', publishedAt: new Date(Date.now() - 7 * 86400000).toISOString() },
  { id: '5', platform: 'GOOGLE', reviewerName: 'Amanda P.', rating: 5, content: "Best experience I've had! The attention to detail is outstanding.", sentiment: 'POSITIVE', publishedAt: new Date(Date.now() - 10 * 86400000).toISOString() },
]

const PLATFORM_COLORS: Record<string, string> = {
  GOOGLE: 'text-blue-400',
  YELP: 'text-red-400',
  FACEBOOK: 'text-indigo-400',
  TRIPADVISOR: 'text-emerald-400',
  OTHER: 'text-muted-foreground',
}

const SENTIMENT_COLORS: Record<string, { text: string; bg: string }> = {
  POSITIVE: { text: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  NEUTRAL: { text: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  NEGATIVE: { text: '#f87171', bg: 'rgba(248,113,113,0.1)' },
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`h-3.5 w-3.5 ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`} />
      ))}
    </div>
  )
}

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>(DEMO_REVIEWS)
  const [filter, setFilter] = useState<'all' | 'unresponded' | 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'>('all')
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [responseText, setResponseText] = useState('')
  const [generatingId, setGeneratingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/reviews')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data.reviews) && data.reviews.length) setReviews(data.reviews) })
      .catch(() => {})
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

  async function generateAiResponse(reviewId: string) {
    setGeneratingId(reviewId)
    try {
      const res = await fetch(`/api/reviews/${reviewId}/ai-response`, { method: 'POST' })
      const data = await res.json()
      if (data.aiResponse) {
        setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, aiResponse: data.aiResponse } : r))
        setRespondingId(reviewId)
        setResponseText(data.aiResponse)
      }
    } catch {
      const review = reviews.find(r => r.id === reviewId)
      const demo = review?.sentiment === 'POSITIVE'
        ? `Thank you so much, ${review.reviewerName ?? 'valued customer'}! We're thrilled you had a great experience and look forward to welcoming you back soon.`
        : `We sincerely apologize for your experience, ${review?.reviewerName ?? 'valued customer'}. This is not the standard we hold ourselves to. Please contact us directly so we can make this right.`
      setRespondingId(reviewId)
      setResponseText(demo)
    } finally {
      setGeneratingId(null)
    }
  }

  async function submitResponse(reviewId: string) {
    try {
      await fetch(`/api/reviews/${reviewId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: responseText }),
      })
    } catch {}
    setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, response: responseText, respondedAt: new Date().toISOString() } : r))
    setRespondingId(null)
    setResponseText('')
  }

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      {/* Header */}
      <div {...anim(0)} className="kv-anim flex items-center justify-between" style={{ animationDelay: '0.04s' }}>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reviews & Reputation</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Monitor and respond to customer reviews with AI</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Avg Rating', value: stats.avgRating.toFixed(1), sub: <StarRating rating={Math.round(stats.avgRating)} />, color: 'text-amber-400' },
          { label: 'Total Reviews', value: stats.total, icon: MessageSquare, color: 'text-primary' },
          { label: 'Response Rate', value: `${stats.responseRate}%`, icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Positive', value: stats.positive, icon: CheckCircle, color: 'text-violet-400' },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="kv-anim rounded-xl border p-4 text-center"
            style={{ animationDelay: `${0.11 + i * 0.07}s`, background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
          >
            <p className={`text-3xl font-bold tabular ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            {stat.sub && <div className="flex justify-center mt-1">{stat.sub}</div>}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="kv-anim flex gap-2 flex-wrap" style={{ animationDelay: '0.39s' }}>
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
      <div className="kv-anim space-y-3" style={{ animationDelay: '0.46s' }}>
        {filtered.map(review => {
          const sentiment = SENTIMENT_COLORS[review.sentiment]
          return (
            <div
              key={review.id}
              className="rounded-xl border p-5"
              style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className={`text-sm font-bold ${PLATFORM_COLORS[review.platform] ?? 'text-muted-foreground'}`}>
                      {review.platform}
                    </span>
                    <StarRating rating={review.rating} />
                    {sentiment && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ color: sentiment.text, background: sentiment.bg }}
                      >
                        {review.sentiment}
                      </span>
                    )}
                    {review.respondedAt && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
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
                    <div
                      className="mt-3 pl-3 space-y-1"
                      style={{ borderLeft: '2px solid rgba(6,182,212,0.4)' }}
                    >
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
                      className="rounded-lg px-4 py-1.5 text-sm font-semibold text-white transition-all hover:scale-[1.01]"
                      style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
                    >
                      Post Response
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
        })}
      </div>
    </div>
  )
}
