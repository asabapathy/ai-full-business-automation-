const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1'

interface Voice {
  voice_id: string
  name: string
  preview_url?: string
}

interface TextToSpeechOptions {
  voiceId?: string
  modelId?: string
  stability?: number
  similarityBoost?: number
}

export class ElevenLabsService {
  private apiKey: string
  private defaultVoiceId: string

  constructor(apiKey: string, defaultVoiceId = 'EXAVITQu4vr4xnSDxMaL') {
    this.apiKey = apiKey
    this.defaultVoiceId = defaultVoiceId
  }

  static fromEnv(): ElevenLabsService {
    const apiKey = process.env['ELEVENLABS_API_KEY']
    const voiceId = process.env['ELEVENLABS_VOICE_ID']
    if (!apiKey) throw new Error('ELEVENLABS_API_KEY env var not set')
    return new ElevenLabsService(apiKey, voiceId)
  }

  async textToSpeech(text: string, options: TextToSpeechOptions = {}): Promise<Buffer> {
    const voiceId = options.voiceId ?? this.defaultVoiceId
    const response = await fetch(`${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: options.modelId ?? 'eleven_turbo_v2',
        voice_settings: {
          stability: options.stability ?? 0.5,
          similarity_boost: options.similarityBoost ?? 0.75,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`ElevenLabs API error ${response.status}: ${error}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  async listVoices(): Promise<Voice[]> {
    const response = await fetch(`${ELEVENLABS_API_BASE}/voices`, {
      headers: { 'xi-api-key': this.apiKey },
    })
    if (!response.ok) throw new Error(`ElevenLabs API error ${response.status}`)
    const data = await response.json() as { voices: Voice[] }
    return data.voices
  }

  async generateVoicemail(opts: { businessName: string; contactName: string; message: string; callbackNumber: string }): Promise<Buffer> {
    const script = `Hi ${opts.contactName}, this is a message from ${opts.businessName}. ${opts.message} Please call us back at ${opts.callbackNumber}. Thank you and have a great day!`
    return this.textToSpeech(script)
  }

  async generateAppointmentReminder(opts: { contactName: string; businessName: string; service: string; dateTime: string }): Promise<Buffer> {
    const script = `Hi ${opts.contactName}! This is a reminder from ${opts.businessName} about your upcoming ${opts.service} appointment on ${opts.dateTime}. We look forward to seeing you! If you need to reschedule, please call us back. Thank you!`
    return this.textToSpeech(script)
  }
}
