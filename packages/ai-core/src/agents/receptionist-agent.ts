import type { AITool, AgentContext } from '@kanavu/types'
import { BaseAgent, type AgentConfig } from './base-agent.js'

const RECEPTIONIST_SYSTEM_PROMPT = `You are the AI Receptionist for Kanavu AI — a professional, friendly virtual receptionist.

## Your Expertise
- Appointment scheduling and management
- Customer intake and qualification
- FAQ answering for business-specific questions
- Call handling scripts and responses
- SMS/chat-based booking flows
- Reminder sequences for upcoming appointments
- Post-appointment follow-up and review requests

## Your Approach
1. Be warm, professional, and efficient — represent the business well
2. Collect only the information needed to book or answer
3. Offer alternative times when preferred slot is unavailable
4. Send reminders at optimal times (24h before, 2h before)
5. Handle cancellations and reschedules gracefully
6. Always confirm bookings with all relevant details

## Response Style
- Conversational and friendly, like a human receptionist
- Brief but complete — don't make customers read walls of text
- Always end with a clear next step or confirmation
- Use the business name naturally in conversation`

export class ReceptionistAgent extends BaseAgent {
  readonly agentName = 'AI Receptionist'

  constructor(config: AgentConfig, context: AgentContext) {
    super(config, context)
  }

  get systemPrompt(): string {
    return RECEPTIONIST_SYSTEM_PROMPT
  }

  get tools(): AITool[] {
    return [
      {
        name: 'check_availability',
        description: 'Check available appointment slots',
        inputSchema: {
          type: 'object',
          properties: {
            serviceId: { type: 'string' },
            staffId: { type: 'string' },
            dateRange: { type: 'string', description: 'e.g., "next week", "this month"' },
            duration: { type: 'number', description: 'Duration in minutes' },
          },
          required: ['duration'],
        },
      },
      {
        name: 'book_appointment',
        description: 'Book an appointment for a customer',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string' },
            serviceId: { type: 'string' },
            staffId: { type: 'string' },
            startTime: { type: 'string', description: 'ISO datetime' },
            duration: { type: 'number', description: 'Duration in minutes' },
            notes: { type: 'string' },
            sendConfirmation: { type: 'boolean', default: true },
          },
          required: ['startTime', 'duration'],
        },
      },
      {
        name: 'send_appointment_reminder',
        description: 'Send reminder for upcoming appointment',
        inputSchema: {
          type: 'object',
          properties: {
            appointmentId: { type: 'string' },
            channel: { type: 'string', enum: ['sms', 'email', 'both'] },
            hoursBeforeAppointment: { type: 'number' },
          },
          required: ['appointmentId', 'channel'],
        },
      },
      {
        name: 'handle_cancellation',
        description: 'Process an appointment cancellation and offer rescheduling',
        inputSchema: {
          type: 'object',
          properties: {
            appointmentId: { type: 'string' },
            reason: { type: 'string' },
            offerReschedule: { type: 'boolean', default: true },
          },
          required: ['appointmentId'],
        },
      },
      {
        name: 'generate_intake_form',
        description: 'Create a customer intake form for a specific service',
        inputSchema: {
          type: 'object',
          properties: {
            serviceType: { type: 'string' },
            requiredFields: { type: 'array', items: { type: 'string' } },
          },
          required: ['serviceType'],
        },
      },
      {
        name: 'answer_faq',
        description: 'Answer a frequently asked customer question',
        inputSchema: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            channel: { type: 'string', enum: ['voice', 'sms', 'chat'] },
          },
          required: ['question'],
        },
      },
    ]
  }

  protected async handleToolCall(name: string, input: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'check_availability': return this.checkAvailability(input)
      case 'book_appointment': return this.bookAppointment(input)
      case 'send_appointment_reminder': return this.sendReminder(input)
      case 'handle_cancellation': return this.handleCancellation(input)
      case 'generate_intake_form': return this.generateIntakeForm(input)
      case 'answer_faq': return this.answerFaq(input)
      default: throw new Error(`Unknown tool: ${name}`)
    }
  }

  private async checkAvailability(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const slots = Array.from({ length: 5 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() + i + 1)
      date.setHours(9 + i * 2, 0, 0, 0)
      return { datetime: date.toISOString(), available: true, staffAvailable: true }
    })
    return { availableSlots: slots, duration: input['duration'], nextAvailable: slots[0]?.datetime }
  }

  private async bookAppointment(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const endTime = new Date(input['startTime'] as string)
    endTime.setMinutes(endTime.getMinutes() + (input['duration'] as number))
    return {
      confirmationNumber: `APT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      status: 'confirmed',
      startTime: input['startTime'],
      endTime: endTime.toISOString(),
      duration: input['duration'],
      confirmationSent: input['sendConfirmation'] ?? true,
    }
  }

  private async sendReminder(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      appointmentId: input['appointmentId'],
      channel: input['channel'],
      scheduledFor: new Date(Date.now() + ((input['hoursBeforeAppointment'] as number ?? 24) * 3600000)).toISOString(),
      status: 'scheduled',
      message: `Your appointment is coming up! We look forward to seeing you.`,
    }
  }

  private async handleCancellation(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      appointmentId: input['appointmentId'],
      status: 'cancelled',
      reason: input['reason'] ?? 'customer_request',
      rescheduleOffered: input['offerReschedule'] ?? true,
      nextAvailableSlots: input['offerReschedule']
        ? Array.from({ length: 3 }, (_, i) => new Date(Date.now() + (i + 1) * 86400000).toISOString())
        : [],
    }
  }

  private async generateIntakeForm(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const defaultFields = ['firstName', 'lastName', 'email', 'phone']
    const customFields = (input['requiredFields'] as string[]) ?? []
    return {
      formId: crypto.randomUUID(),
      serviceType: input['serviceType'],
      fields: [...defaultFields, ...customFields].map(field => ({
        name: field,
        type: field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text',
        required: defaultFields.includes(field),
      })),
      url: `/intake/${crypto.randomUUID()}`,
    }
  }

  private async answerFaq(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      question: input['question'],
      context: {
        businessName: this.context.businessContext?.name,
        industry: this.context.businessContext?.industry,
      },
      channel: input['channel'],
      instruction: `Answer this question as the AI receptionist for ${this.context.businessContext?.name ?? 'this business'}: "${input['question']}"`,
    }
  }
}
