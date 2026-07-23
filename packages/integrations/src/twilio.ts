import twilio from 'twilio'

interface TwilioConfig {
  accountSid: string
  authToken: string
  phoneNumber: string
}

export class TwilioService {
  private client: ReturnType<typeof twilio>
  private from: string

  constructor(config: TwilioConfig) {
    this.client = twilio(config.accountSid, config.authToken)
    this.from = config.phoneNumber
  }

  static fromEnv(): TwilioService {
    const accountSid = process.env['TWILIO_ACCOUNT_SID']
    const authToken = process.env['TWILIO_AUTH_TOKEN']
    const phoneNumber = process.env['TWILIO_PHONE_NUMBER']
    if (!accountSid || !authToken || !phoneNumber) {
      throw new Error('Twilio env vars not configured: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER')
    }
    return new TwilioService({ accountSid, authToken, phoneNumber })
  }

  async sendSms(to: string, body: string): Promise<{ sid: string; status: string }> {
    const message = await this.client.messages.create({ to, from: this.from, body })
    return { sid: message.sid, status: message.status }
  }

  async makeCall(to: string, twimlUrl: string): Promise<{ sid: string; status: string }> {
    const call = await this.client.calls.create({ to, from: this.from, url: twimlUrl })
    return { sid: call.sid, status: call.status }
  }

  async makeCallWithTwiml(to: string, twiml: string): Promise<{ sid: string; status: string }> {
    const call = await this.client.calls.create({ to, from: this.from, twiml })
    return { sid: call.sid, status: call.status }
  }

  validateWebhookSignature(url: string, params: Record<string, string>, signature: string): boolean {
    return twilio.validateRequest(
      process.env['TWILIO_AUTH_TOKEN'] ?? '',
      signature,
      url,
      params,
    )
  }
}

export function buildAppointmentReminderTwiml(contactName: string, businessName: string, appointmentTime: string, callbackNumber: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    Hello ${contactName}, this is a reminder from ${businessName}.
    You have an appointment scheduled for ${appointmentTime}.
    Press 1 to confirm, press 2 to cancel, or press 3 to speak with us.
  </Say>
  <Gather numDigits="1" timeout="10">
    <Say>Please press a key now.</Say>
  </Gather>
  <Say>We didn't receive your input. Please call us back at ${callbackNumber}. Thank you!</Say>
</Response>`
}
