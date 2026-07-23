'use client'

import { useState, useEffect } from 'react'

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
  { id: '2', platform: 'YELP', reviewerName: 'Mike T.', rating: 2, content: 'Waited over an hour and the work wasn\'t what I expected. Very disappointed.', sentiment: 'NEGATIVE', publishedAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: '3', platform: 'FACEBOOK', reviewerName: 'Jessica L.', rating: 4, content: 'Good experience overall. Staff was friendly and helpful. Will come back again.', sentiment: 'POSITIVE', response: 'Thank you Jessica! We look forward to serving you again.', respondedAt: new Date(Date.now() - 3 * 86400000).toISOString(), publishedAt: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: '4', platform: 'GOOGLE', reviewerName: 'David K.', rating: 3, content: 'Service was okay. Nothing special but nothing terrible either.', sentiment: 'NEUTRAL', publishedAt: new Date(Date.now() - 7 * 86400000).toISOString() },
  { id: '5', platform: 'GOOGLE', reviewerName: 'Amanda P.', rating: 5, content: 'Best experience I\'ve had! The attention to detail is outstanding.', sentiment: 'POSITIVE', publishedAt: new Date(Date.now() - 10 * 86400000).toISOString() },
]

const PLATFORM_COLORS: Record<string, string> = {
  GOOGLE: 'text-blue-400',
  YELP: 'text-red-400',
  FACEBOOK: 'text-indigo-400',
  TRIPADVISOR: 'text-green-400',
  OTHER: 'text-gray-400',
}

const SENTIMENT_COLORS: Record<string, string> = {
  POSITIVE: 'text-green-400 bg-green-400/10',
  NEUTRAL: 'text-yellow-400 bg-yellow-400/10',
  NEGATIVE: 'text-red-400 bg-red-400/10',
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} className={s <= rating ? 'text-yellow-400' : 'text-gray-600'}>★</span>
      ))}
    </div>
  )
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reviews & Reputation</h1>
          <p className="text-gray-400 text-sm mt-1">Monitor and respond to customer reviews with AI</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-yellow-400">{stats.avgRating.toFixed(1)}</p>
          <p className="text-xs text-gray-400 mt-1">Avg Rating</p>
          <StarRating rating={Math.round(stats.avgRating)} />
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-gray-400 mt-1">Total Reviews</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{stats.responseRate}%</p>
          <p className="text-xs text-gray-400 mt-1">Response Rate</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-purple-400">{stats.positive}</p>
          <p className="text-xs text-gray-400 mt-1">Positive Reviews</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'unresponded', 'POSITIVE', 'NEUTRAL', 'NEGATIVE'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f as typeof filter)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${filter === f ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}
          >
            {f === 'unresponded' ? 'Needs Response' : f.toLowerCase()}
          </button>
        ))}
      </div>

      {/* Review list */}
      <div className="space-y-4">
        {filtered.map(review => (
          <div key={review.id} className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-sm font-bold ${PLATFORM_COLORS[review.platform] ?? 'text-gray-400'}`}>
                    {review.platform}
                  </span>
                  <StarRating rating={review.rating} />
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SENTIMENT_COLORS[review.sentiment]}`}>
                    {review.sentiment}
                  </span>
                  {review.respondedAt && (
                    <span className="text-xs text-green-400">✓ Responded</span>
                  )}
                </div>
                <p className="text-sm font-medium text-white mb-1">{review.reviewerName ?? 'Anonymous'}</p>
                {review.content && <p className="text-sm text-gray-400 leading-relaxed">{review.content}</p>}
                {review.response && (
                  <div className="mt-3 pl-3 border-l-2 border-purple-500/40">
                    <p className="text-xs text-purple-400 mb-1">Your response:</p>
                    <p className="text-sm text-gray-300">{review.response}</p>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">{new Date(review.publishedAt).toLocaleDateString()}</p>
              </div>
              {!review.respondedAt && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => generateAiResponse(review.id)}
                    disabled={generatingId === review.id}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-lg transition-colors disabled:opacity-50"
                  >
                    {generatingId === review.id ? 'Generating...' : '✨ AI Respond'}
                  </button>
                  <button
                    onClick={() => { setRespondingId(review.id); setResponseText('') }}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs rounded-lg transition-colors"
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
                  placeholder="Write your response..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => submitResponse(review.id)}
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg"
                  >
                    Post Response
                  </button>
                  <button
                    onClick={() => { setRespondingId(null); setResponseText('') }}
                    className="px-4 py-1.5 bg-white/5 text-gray-400 text-sm rounded-lg hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
