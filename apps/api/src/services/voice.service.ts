import { prisma } from './database.js'
import { aiService } from './ai.service.js'
import { logger } from '../utils/logger.js'

// TwiML builder helpers
function twimlSay(text: string, voice = 'Polly.Joanna'): string {
  return `<Say voice="${voice}">${text.replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] ?? c))}</Say>`
}

function twimlGather(opts: { action: string; input?: string; timeout?: number; speechTimeout?: string; hints?: string }): string {
  const attrs = [
    `action="${opts.action}"`,
    `input="${opts.input ?? 'speech dtmf'}"`,
    `timeout="${opts.timeout ?? 5}"`,
    opts.speechTimeout ? `speechTimeout="${opts.speechTimeout}"` : '',
    opts.hints ? `hints="${opts.hints}"` : '',
  ].filter(Boolean).join(' ')
  return `<Gather ${attrs}>`
}

function wrapTwiml(inner: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`
}

export class VoiceService {
  async handleInboundCall(orgSlug: string, callSid: string, from: string): Promise<string> {
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true, name: true, businessHours: true },
    })

    if (!org) {
      return wrapTwiml(twimlSay("Sorry, we couldn't find this business. Goodbye.") + '<Hangup/>')
    }

    // Store call session
    await prisma.chatSession.create({
      data: {
        organizationId: org.id,
        visitorId: from,
        channel: 'voice',
        metadata: { callSid, from, orgSlug },
      },
    }).catch(() => {})

    const apiBase = process.env['API_URL'] ?? 'http://localhost:4000/api/v1'
    const greeting = `Thank you for calling ${org.name}. I'm your AI receptionist. How can I help you today? You can say things like: book an appointment, check business hours, or speak with a team member.`

    return wrapTwiml(
      twimlGather({
        action: `${apiBase}/voice/${orgSlug}/respond`,
        input: 'speech',
        timeout: 10,
        speechTimeout: 'auto',
        hints: 'appointment, book, hours, location, pricing, speak to someone',
      }) +
      twimlSay(greeting) +
      '</Gather>' +
      twimlSay("I didn't catch that. Please call back and try again. Goodbye.") +
      '<Hangup/>',
    )
  }

  async handleVoiceResponse(orgSlug: string, speechResult: string, callSid: string): Promise<string> {
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true, name: true },
    })
    if (!org) return wrapTwiml(twimlSay('Sorry, something went wrong.') + '<Hangup/>')

    const lowerSpeech = speechResult.toLowerCase()
    const apiBase = process.env['API_URL'] ?? 'http://localhost:4000/api/v1'

    // Routing based on intent
    if (lowerSpeech.includes('book') || lowerSpeech.includes('appointment') || lowerSpeech.includes('schedule')) {
      const services = await prisma.service.findMany({
        where: { organizationId: org.id, isActive: true },
        select: { name: true },
        take: 5,
      })
      const serviceList = services.map(s => s.name).join(', ') || 'our services'
      const msg = `I can help you book an appointment. We offer ${serviceList}. You can also book online by visiting our website or I can transfer you to a team member. Press 1 to book online now, or hold for a team member.`
      return wrapTwiml(
        twimlGather({ action: `${apiBase}/voice/${orgSlug}/booking-intent`, input: 'dtmf', timeout: 8 }) +
        twimlSay(msg) +
        '</Gather>' +
        twimlSay("I'll transfer you to a team member. Please hold.") +
        '<Dial><Number>' + (process.env['BUSINESS_PHONE'] ?? '') + '</Number></Dial>',
      )
    }

    if (lowerSpeech.includes('hours') || lowerSpeech.includes('open') || lowerSpeech.includes('close')) {
      const businessHours = (org as { businessHours?: unknown }).businessHours
      const hoursText = businessHours
        ? `Our business hours are Monday through Friday 9 AM to 6 PM, and Saturday 10 AM to 4 PM. We are closed on Sundays.`
        : `Please visit our website for current business hours.`
      return wrapTwiml(
        twimlSay(hoursText) +
        twimlGather({ action: `${apiBase}/voice/${orgSlug}/respond`, input: 'speech', timeout: 5, speechTimeout: 'auto' }) +
        twimlSay('Is there anything else I can help you with?') +
        '</Gather>' +
        twimlSay('Thank you for calling. Have a great day!') +
        '<Hangup/>',
      )
    }

    if (lowerSpeech.includes('speak') || lowerSpeech.includes('human') || lowerSpeech.includes('person') || lowerSpeech.includes('someone') || lowerSpeech.includes('agent')) {
      return wrapTwiml(
        twimlSay("Of course! I'll transfer you to a team member right away. Please hold.") +
        '<Dial><Number>' + (process.env['BUSINESS_PHONE'] ?? '') + '</Number></Dial>',
      )
    }

    // Fallback: ask the AI brain
    try {
      const aiResponse = await aiService.chat(org.id, undefined, {
        message: `A customer called and said: "${speechResult}". Respond in 2-3 friendly sentences as the AI receptionist for ${org.name}. Keep it brief and helpful for a phone call.`,
      })
      const aiText = aiResponse.content.slice(0, 500)
      return wrapTwiml(
        twimlSay(aiText) +
        twimlGather({ action: `${apiBase}/voice/${orgSlug}/respond`, input: 'speech', timeout: 8, speechTimeout: 'auto' }) +
        twimlSay('Is there anything else I can help you with?') +
        '</Gather>' +
        twimlSay('Thank you for calling ' + org.name + '. Have a great day!') +
        '<Hangup/>',
      )
    } catch {
      return wrapTwiml(
        twimlSay("I'm sorry, I didn't quite get that. Let me transfer you to a team member.") +
        '<Dial><Number>' + (process.env['BUSINESS_PHONE'] ?? '') + '</Number></Dial>',
      )
    }
  }

  async handleVoicemail(orgSlug: string, recordingUrl: string, from: string, transcription?: string): Promise<void> {
    const org = await prisma.organization.findUnique({ where: { slug: orgSlug }, select: { id: true } })
    if (!org) return

    await prisma.notification.create({
      data: {
        organizationId: org.id,
        title: 'New Voicemail',
        body: transcription
          ? `Voicemail from ${from}: "${transcription.slice(0, 200)}"`
          : `New voicemail received from ${from}`,
        type: 'voicemail',
        data: { recordingUrl, from, transcription },
      },
    })

    logger.info({ orgSlug, from, transcription: !!transcription }, 'Voicemail received')
  }

  getTwilioWebhookUrls(orgSlug: string): Record<string, string> {
    const apiBase = process.env['API_URL'] ?? 'http://localhost:4000/api/v1'
    return {
      inbound: `${apiBase}/voice/${orgSlug}/inbound`,
      respond: `${apiBase}/voice/${orgSlug}/respond`,
      voicemail: `${apiBase}/voice/${orgSlug}/voicemail`,
      status: `${apiBase}/voice/${orgSlug}/status`,
    }
  }

  async getSettings(organizationId: string): Promise<Record<string, unknown>> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { slug: true, settings: true },
    })
    if (!org) return {}
    const settings = (org.settings as Record<string, unknown>) ?? {}
    const voiceSettings = (settings['voice'] as Record<string, unknown>) ?? {}
    return {
      slug: org.slug,
      config: {
        twilioAccountSid: voiceSettings['twilioAccountSid'] ?? '',
        twilioPhoneNumber: voiceSettings['twilioPhoneNumber'] ?? '',
        elevenLabsVoiceId: voiceSettings['elevenLabsVoiceId'] ?? 'Rachel',
        useElevenLabs: voiceSettings['useElevenLabs'] ?? false,
      },
    }
  }

  async saveSettings(organizationId: string, config: Record<string, unknown>): Promise<void> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    })
    const current = (org?.settings as Record<string, unknown>) ?? {}
    const safeConfig: Record<string, unknown> = {
      twilioAccountSid: config['twilioAccountSid'],
      twilioPhoneNumber: config['twilioPhoneNumber'],
      elevenLabsVoiceId: config['elevenLabsVoiceId'],
      useElevenLabs: config['useElevenLabs'],
    }
    if (config['twilioAuthToken']) safeConfig['twilioAuthToken'] = config['twilioAuthToken']
    if (config['elevenLabsApiKey']) safeConfig['elevenLabsApiKey'] = config['elevenLabsApiKey']

    await prisma.organization.update({
      where: { id: organizationId },
      data: { settings: { ...current, voice: safeConfig } },
    })
  }
}

export const voiceService = new VoiceService()
