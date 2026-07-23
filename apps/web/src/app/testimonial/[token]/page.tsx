'use client'

import { useState, useRef, useEffect } from 'react'
import { Video, Upload, Star, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { apiClient } from '../../../lib/api-client'

interface TestimonialRequest {
  id: string
  status: string
}

export default function TestimonialCapturePage({ params }: { params: { token: string } }) {
  const [request, setRequest] = useState<TestimonialRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'intro' | 'record' | 'upload' | 'rating' | 'done'>('intro')
  const [rating, setRating] = useState(0)
  const [videoUrl, setVideoUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [recording, setRecording] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    fetchRequest()
  }, [])

  async function fetchRequest() {
    try {
      const data = await apiClient.get(`/testimonials/capture/${params.token}`)
      setRequest(data.testimonial)
      if (data.testimonial.status !== 'pending') {
        setStep('done')
      }
    } catch {
      setError('This link is invalid or has expired.')
    } finally {
      setLoading(false)
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      mediaRecorder.ondataavailable = e => chunksRef.current.push(e.data)
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        setVideoUrl(url)
        stream.getTracks().forEach(t => t.stop())
        if (videoRef.current) {
          videoRef.current.srcObject = null
          videoRef.current.src = url
        }
        setStep('rating')
      }
      mediaRecorder.start()
      setRecording(true)
    } catch {
      setError('Could not access camera. Please allow camera permissions and try again.')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  async function handleSubmit() {
    if (!videoUrl) return
    setSubmitting(true)
    try {
      await apiClient.post(`/testimonials/capture/${params.token}/submit`, {
        videoUrl,
        rating: rating || undefined,
      })
      setStep('done')
    } catch {
      setError('Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && !request) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <p className="text-xl font-semibold">{error}</p>
        </div>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-lg space-y-4">
          <CheckCircle className="h-14 w-14 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold">Thank you!</h1>
          <p className="text-muted-foreground">Your video testimonial has been received. We truly appreciate you sharing your experience!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border bg-card shadow-xl overflow-hidden">
        {step === 'intro' && (
          <div className="p-8 text-center space-y-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto">
              <Video className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Share Your Experience</h1>
              <p className="text-muted-foreground">Record a short video testimonial (30-60 seconds) about your experience. It means the world to us!</p>
            </div>
            <div className="text-left rounded-xl bg-muted/40 p-4 space-y-2 text-sm">
              <p className="font-medium">Tips for a great testimonial:</p>
              <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                <li>Find a quiet, well-lit spot</li>
                <li>Mention what service you used</li>
                <li>Share a specific outcome or result</li>
                <li>Smile and speak naturally</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <Button className="flex-1" onClick={() => setStep('record')}>
                <Video className="h-4 w-4 mr-2" />
                Record Video
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setStep('upload')}>
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </Button>
            </div>
          </div>
        )}

        {step === 'record' && (
          <div className="space-y-4">
            <div className="relative bg-black aspect-video">
              <video ref={videoRef} className="w-full h-full object-cover" muted={recording} playsInline />
              {recording && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 text-white text-xs font-medium">
                  <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                  REC
                </div>
              )}
            </div>
            <div className="p-4 flex gap-3">
              {!recording ? (
                <Button className="flex-1" onClick={startRecording}>
                  <Video className="h-4 w-4 mr-2" />
                  Start Recording
                </Button>
              ) : (
                <Button className="flex-1" variant="destructive" onClick={stopRecording}>
                  Stop Recording
                </Button>
              )}
              <Button variant="outline" onClick={() => setStep('intro')}>Back</Button>
            </div>
            {error && <p className="px-4 pb-4 text-sm text-destructive">{error}</p>}
          </div>
        )}

        {step === 'upload' && (
          <div className="p-8 space-y-4">
            <h2 className="font-semibold text-lg">Upload Your Video</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Video URL</label>
              <input
                type="url"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                placeholder="https://..."
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Upload your video to a hosting service (Google Drive, Dropbox, etc.) and paste the link here.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setStep('rating')} disabled={!videoUrl}>Continue</Button>
              <Button variant="outline" onClick={() => setStep('intro')}>Back</Button>
            </div>
          </div>
        )}

        {step === 'rating' && (
          <div className="p-8 space-y-6">
            {videoUrl && (
              <video src={videoUrl} className="w-full rounded-xl aspect-video object-cover bg-black" controls />
            )}
            <div className="text-center space-y-3">
              <h2 className="font-semibold">How would you rate your overall experience?</h2>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <button key={i} type="button" onClick={() => setRating(i)}>
                    <Star className={`h-9 w-9 transition-colors ${i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Testimonial'}
              </Button>
              <Button variant="outline" onClick={() => setStep('intro')}>Back</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
