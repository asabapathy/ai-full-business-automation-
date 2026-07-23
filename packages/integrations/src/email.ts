import { Resend } from 'resend'

interface EmailMessage {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
}

interface EmailResult {
  id: string
  success: boolean
}

export class EmailService {
  private client: Resend
  private defaultFrom: string

  constructor(apiKey: string, defaultFrom: string) {
    this.client = new Resend(apiKey)
    this.defaultFrom = defaultFrom
  }

  static fromEnv(): EmailService {
    const apiKey = process.env['RESEND_API_KEY']
    const from = process.env['EMAIL_FROM'] ?? 'Kanavu AI <noreply@kanavu.ai>'
    if (!apiKey) throw new Error('RESEND_API_KEY env var not set')
    return new EmailService(apiKey, from)
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    const result = await this.client.emails.send({
      from: message.from ?? this.defaultFrom,
      to: Array.isArray(message.to) ? message.to : [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
      reply_to: message.replyTo,
    })
    if (result.error) throw new Error(result.error.message)
    return { id: result.data?.id ?? '', success: true }
  }

  async sendInvoice(to: string, opts: { businessName: string; invoiceNumber: string; amount: string; dueDate: string; paymentLink?: string }): Promise<EmailResult> {
    return this.send({
      to,
      subject: `Invoice #${opts.invoiceNumber} from ${opts.businessName}`,
      html: buildInvoiceEmail(opts),
    })
  }

  async sendPaymentReminder(to: string, opts: { businessName: string; invoiceNumber: string; amount: string; daysOverdue: number; contactName?: string }): Promise<EmailResult> {
    const urgency = opts.daysOverdue > 30 ? 'final' : opts.daysOverdue > 14 ? 'firm' : 'gentle'
    return this.send({
      to,
      subject: `${urgency === 'final' ? 'FINAL NOTICE: ' : ''}Payment reminder — Invoice #${opts.invoiceNumber}`,
      html: buildReminderEmail({ ...opts, urgency }),
    })
  }

  async sendAppointmentConfirmation(to: string, opts: { businessName: string; contactName: string; serviceName: string; appointmentTime: string; location?: string }): Promise<EmailResult> {
    return this.send({
      to,
      subject: `Appointment confirmed — ${opts.businessName}`,
      html: buildAppointmentEmail(opts),
    })
  }
}

function buildInvoiceEmail(opts: { businessName: string; invoiceNumber: string; amount: string; dueDate: string; paymentLink?: string }): string {
  return `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #1a1a2e;">${opts.businessName}</h2>
  <p>Please find your invoice below.</p>
  <div style="background: #f8f9fa; border-radius: 8px; padding: 24px; margin: 24px 0;">
    <p style="margin: 0 0 8px;"><strong>Invoice #:</strong> ${opts.invoiceNumber}</p>
    <p style="margin: 0 0 8px;"><strong>Amount Due:</strong> ${opts.amount}</p>
    <p style="margin: 0;"><strong>Due Date:</strong> ${opts.dueDate}</p>
  </div>
  ${opts.paymentLink ? `<a href="${opts.paymentLink}" style="background: #6c63ff; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Pay Now</a>` : ''}
  <p style="margin-top: 24px; color: #666;">Thank you for your business!</p>
</div>`
}

function buildReminderEmail(opts: { businessName: string; invoiceNumber: string; amount: string; daysOverdue: number; contactName?: string; urgency: string }): string {
  const greeting = opts.contactName ? `Hi ${opts.contactName},` : 'Hello,'
  const toneMap: Record<string, string> = {
    gentle: `This is a friendly reminder that payment for invoice #${opts.invoiceNumber} (${opts.amount}) was due ${opts.daysOverdue} days ago.`,
    firm: `Invoice #${opts.invoiceNumber} for ${opts.amount} is now ${opts.daysOverdue} days past due. Please arrange payment immediately.`,
    final: `FINAL NOTICE: Invoice #${opts.invoiceNumber} for ${opts.amount} is ${opts.daysOverdue} days overdue. Failure to pay may result in service interruption.`,
  }
  return `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #1a1a2e;">${opts.businessName}</h2>
  <p>${greeting}</p>
  <p>${toneMap[opts.urgency]}</p>
  <p>Please contact us if you have any questions.</p>
</div>`
}

function buildAppointmentEmail(opts: { businessName: string; contactName: string; serviceName: string; appointmentTime: string; location?: string }): string {
  return `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #1a1a2e;">${opts.businessName}</h2>
  <p>Hi ${opts.contactName},</p>
  <p>Your appointment has been confirmed!</p>
  <div style="background: #f8f9fa; border-radius: 8px; padding: 24px; margin: 24px 0;">
    <p style="margin: 0 0 8px;"><strong>Service:</strong> ${opts.serviceName}</p>
    <p style="margin: 0 0 8px;"><strong>Date & Time:</strong> ${opts.appointmentTime}</p>
    ${opts.location ? `<p style="margin: 0;"><strong>Location:</strong> ${opts.location}</p>` : ''}
  </div>
  <p>We look forward to seeing you!</p>
</div>`
}
