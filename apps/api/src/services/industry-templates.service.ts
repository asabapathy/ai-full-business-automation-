import { prisma } from '@kanavu/database'
import { logger } from '../utils/logger.js'

export interface IndustryTemplate {
  id: string
  name: string
  industry: string
  category: string
  description: string
  icon: string
  color: string
  features: string[]
  automations: TemplateAutomation[]
  emailSequences: TemplateEmailSequence[]
  invoiceItems: TemplateInvoiceItem[]
  intakeForms: TemplateForm[]
  createdAt?: string
}

interface TemplateAutomation {
  name: string
  trigger: string
  steps: Array<{ type: string; config: Record<string, any> }>
}

interface TemplateEmailSequence {
  name: string
  emails: Array<{ delay: number; subject: string; body: string }>
}

interface TemplateInvoiceItem {
  name: string
  description: string
  price: number
  unit: string
}

interface TemplateForm {
  name: string
  fields: Array<{ label: string; type: string; required: boolean }>
}

const BUILT_IN_TEMPLATES: Omit<IndustryTemplate, 'id' | 'createdAt'>[] = [
  {
    name: 'Home Services', industry: 'home_services', category: 'Service Business', icon: '🔧', color: '#f97316',
    description: 'Perfect for plumbers, electricians, HVAC, cleaning, landscaping, and general contractors.',
    features: ['Job scheduling', 'Estimates & invoices', 'Crew management', 'Customer follow-ups', 'Review requests'],
    automations: [
      { name: 'New lead follow-up', trigger: 'contact_created', steps: [{ type: 'delay', config: { duration: 5, unit: 'minutes' } }, { type: 'sms', config: { message: 'Hi {first_name}! Thanks for reaching out. We\'ll call you within 1 hour to schedule your free estimate.' } }] },
      { name: 'Post-job review request', trigger: 'invoice_paid', steps: [{ type: 'delay', config: { duration: 24, unit: 'hours' } }, { type: 'sms', config: { message: 'Thanks for letting us serve you! Would you mind leaving us a review? {review_link}' } }] },
    ],
    emailSequences: [
      { name: 'New customer welcome', emails: [{ delay: 0, subject: 'Welcome to {company_name}!', body: 'Hi {first_name},\n\nThank you for choosing us for your home service needs. We\'re committed to providing you with the best service possible.\n\nDon\'t hesitate to reach out anytime!\n\nBest,\n{company_name}' }, { delay: 7, subject: 'How did we do?', body: 'Hi {first_name},\n\nWe hope your recent service was everything you expected. We\'d love your feedback!\n\n{review_link}' }] },
    ],
    invoiceItems: [
      { name: 'Service Call', description: 'Standard service call fee', price: 75, unit: 'visit' },
      { name: 'Labor - Standard', description: 'Hourly labor rate', price: 95, unit: 'hour' },
      { name: 'Emergency Service', description: 'After-hours or emergency service', price: 150, unit: 'hour' },
      { name: 'Materials', description: 'Parts and materials', price: 0, unit: 'item' },
    ],
    intakeForms: [
      { name: 'Service Request', fields: [{ label: 'Service Type', type: 'select', required: true }, { label: 'Property Address', type: 'address', required: true }, { label: 'Issue Description', type: 'textarea', required: true }, { label: 'Preferred Date', type: 'date', required: false }, { label: 'Best Time to Call', type: 'select', required: false }] },
    ],
  },
  {
    name: 'Medical & Dental', industry: 'healthcare', category: 'Healthcare', icon: '🏥', color: '#06b6d4',
    description: 'Ideal for medical practices, dental offices, chiropractors, physical therapy, and wellness clinics.',
    features: ['HIPAA-ready forms', 'Appointment reminders', 'Patient intake', 'Insurance billing', 'Follow-up care'],
    automations: [
      { name: 'Appointment reminder 24h', trigger: 'appointment_scheduled', steps: [{ type: 'delay', config: { duration: 23, unit: 'hours' } }, { type: 'sms', config: { message: 'Reminder: You have an appointment tomorrow at {appointment_time}. Reply CONFIRM to confirm or CANCEL to cancel.' } }] },
      { name: 'New patient welcome', trigger: 'contact_created', steps: [{ type: 'email', config: { subject: 'Welcome to {practice_name}', body: 'Welcome! Please complete your patient intake form before your appointment: {intake_link}' } }] },
    ],
    emailSequences: [
      { name: 'Patient intake sequence', emails: [{ delay: 0, subject: 'Your upcoming appointment at {practice_name}', body: 'Please complete your patient intake forms: {intake_link}\n\nBring your insurance card and a valid ID.' }, { delay: -1, subject: 'See you tomorrow!', body: 'Just a reminder about your appointment tomorrow at {appointment_time}. Please arrive 15 minutes early.' }] },
    ],
    invoiceItems: [
      { name: 'New Patient Consultation', description: 'Initial consultation and examination', price: 200, unit: 'visit' },
      { name: 'Follow-up Visit', description: 'Established patient follow-up', price: 120, unit: 'visit' },
      { name: 'Treatment - Standard', description: 'Standard treatment session', price: 150, unit: 'session' },
    ],
    intakeForms: [
      { name: 'Patient Intake', fields: [{ label: 'Date of Birth', type: 'date', required: true }, { label: 'Primary Insurance', type: 'text', required: false }, { label: 'Medical History', type: 'textarea', required: true }, { label: 'Current Medications', type: 'textarea', required: false }, { label: 'Emergency Contact', type: 'text', required: true }] },
    ],
  },
  {
    name: 'Salon & Spa', industry: 'beauty', category: 'Beauty & Wellness', icon: '💅', color: '#ec4899',
    description: 'Built for hair salons, nail studios, spas, barbershops, and beauty professionals.',
    features: ['Online booking', 'Stylist scheduling', 'Retail upsells', 'Loyalty rewards', 'Birthday campaigns'],
    automations: [
      { name: 'Rebooking reminder', trigger: 'appointment_completed', steps: [{ type: 'delay', config: { duration: 28, unit: 'days' } }, { type: 'sms', config: { message: 'Hi {first_name}! It\'s been 4 weeks since your last visit. Ready to book your next appointment? {booking_link}' } }] },
      { name: 'Birthday message', trigger: 'contact_birthday', steps: [{ type: 'sms', config: { message: '🎂 Happy Birthday {first_name}! Enjoy 20% off your next service this week. Book now: {booking_link}' } }] },
    ],
    emailSequences: [
      { name: 'New client welcome', emails: [{ delay: 0, subject: 'Welcome to {salon_name}!', body: 'Hi {first_name}!\n\nThank you for your first visit. We hope you loved your experience.\n\nBook your next appointment online anytime: {booking_link}' }] },
    ],
    invoiceItems: [
      { name: 'Haircut & Style', description: 'Cut, blow dry, and style', price: 65, unit: 'service' },
      { name: 'Color Treatment', description: 'Full color application', price: 120, unit: 'service' },
      { name: 'Highlights', description: 'Partial or full highlights', price: 150, unit: 'service' },
      { name: 'Deep Conditioning', description: 'Deep conditioning treatment', price: 35, unit: 'service' },
    ],
    intakeForms: [
      { name: 'New Client Consultation', fields: [{ label: 'Hair History', type: 'textarea', required: true }, { label: 'Allergies/Sensitivities', type: 'textarea', required: false }, { label: 'Desired Outcome', type: 'textarea', required: true }, { label: 'How did you hear about us?', type: 'select', required: false }] },
    ],
  },
  {
    name: 'Fitness & Personal Training', industry: 'fitness', category: 'Health & Fitness', icon: '💪', color: '#10b981',
    description: 'For gyms, personal trainers, yoga studios, crossfit boxes, and fitness coaches.',
    features: ['Class scheduling', 'Membership management', 'Progress tracking', 'Nutrition plans', 'Client check-ins'],
    automations: [
      { name: 'Trial class follow-up', trigger: 'appointment_completed', steps: [{ type: 'delay', config: { duration: 2, unit: 'hours' } }, { type: 'sms', config: { message: 'Amazing job today, {first_name}! Ready to keep the momentum? Let\'s talk about a membership plan. {booking_link}' } }] },
      { name: 'Missed class check-in', trigger: 'appointment_no_show', steps: [{ type: 'delay', config: { duration: 4, unit: 'hours' } }, { type: 'sms', config: { message: 'Hey {first_name}, we missed you today! Life happens. Want to reschedule? {booking_link}' } }] },
    ],
    emailSequences: [
      { name: 'New member onboarding', emails: [{ delay: 0, subject: 'Welcome to {gym_name}!', body: 'Welcome to the family, {first_name}!\n\nHere\'s everything you need to get started:\n- Download our app\n- Book your orientation session\n- Set your first goal\n\nWe\'re excited to help you reach your goals!' }] },
    ],
    invoiceItems: [
      { name: 'Personal Training Session', description: '1-hour PT session', price: 80, unit: 'session' },
      { name: 'Monthly Membership', description: 'Unlimited access membership', price: 49, unit: 'month' },
      { name: 'Class Package - 10', description: '10-class punch card', price: 150, unit: 'package' },
      { name: 'Nutrition Coaching', description: 'Monthly nutrition coaching', price: 120, unit: 'month' },
    ],
    intakeForms: [
      { name: 'Fitness Assessment', fields: [{ label: 'Current Fitness Level', type: 'select', required: true }, { label: 'Primary Goal', type: 'select', required: true }, { label: 'Health Conditions', type: 'textarea', required: false }, { label: 'Available Days', type: 'checkbox', required: true }, { label: 'Emergency Contact', type: 'text', required: true }] },
    ],
  },
  {
    name: 'Real Estate', industry: 'real_estate', category: 'Professional Services', icon: '🏡', color: '#8b5cf6',
    description: 'For real estate agents, property managers, mortgage brokers, and real estate teams.',
    features: ['Lead nurturing', 'Property showcases', 'Contract management', 'Open house tracking', 'Referral programs'],
    automations: [
      { name: 'New buyer lead nurture', trigger: 'contact_created', steps: [{ type: 'delay', config: { duration: 10, unit: 'minutes' } }, { type: 'email', config: { subject: 'Your home search starts here!', body: 'Hi {first_name},\n\nThank you for your interest! I\'d love to learn more about what you\'re looking for. When are you available for a quick call?' } }] },
      { name: 'Listing update alert', trigger: 'new_listing', steps: [{ type: 'email', config: { subject: 'New listing matches your search!', body: 'Hi {first_name}, a new property matching your criteria just hit the market. Check it out: {listing_link}' } }] },
    ],
    emailSequences: [
      { name: 'Buyer nurture sequence', emails: [{ delay: 0, subject: 'Welcome! Here\'s your personalized search', body: 'Hi {first_name}, welcome! I\'ve set up a personalized property search for you.' }, { delay: 3, subject: 'Top neighborhoods to consider', body: 'Here are my top picks for neighborhoods matching your budget and preferences...' }, { delay: 7, subject: 'Are you pre-approved?', body: 'Getting pre-approved is the first step. I work with excellent lenders — want an introduction?' }] },
    ],
    invoiceItems: [
      { name: 'Buyer Consultation', description: 'Initial buyer strategy session', price: 0, unit: 'session' },
      { name: 'Transaction Coordination', description: 'Full transaction coordination fee', price: 500, unit: 'transaction' },
      { name: 'Property Management - Monthly', description: 'Monthly property management fee', price: 200, unit: 'month' },
    ],
    intakeForms: [
      { name: 'Buyer Questionnaire', fields: [{ label: 'Price Range', type: 'range', required: true }, { label: 'Preferred Neighborhoods', type: 'text', required: false }, { label: 'Bedrooms', type: 'select', required: true }, { label: 'Pre-approved?', type: 'radio', required: true }, { label: 'Timeline to Buy', type: 'select', required: true }] },
    ],
  },
  {
    name: 'Restaurants & Food', industry: 'food_beverage', category: 'Food & Beverage', icon: '🍽️', color: '#ef4444',
    description: 'For restaurants, cafes, catering companies, food trucks, and bakeries.',
    features: ['Reservation management', 'Catering quotes', 'Loyalty programs', 'Event booking', 'Review management'],
    automations: [
      { name: 'Reservation confirmation', trigger: 'appointment_scheduled', steps: [{ type: 'sms', config: { message: 'Your reservation at {restaurant_name} is confirmed for {appointment_date} at {appointment_time}. See you soon!' } }] },
      { name: 'Post-dining review request', trigger: 'appointment_completed', steps: [{ type: 'delay', config: { duration: 2, unit: 'hours' } }, { type: 'sms', config: { message: 'Thank you for dining with us! We\'d love your feedback: {review_link}' } }] },
    ],
    emailSequences: [
      { name: 'Catering inquiry follow-up', emails: [{ delay: 0, subject: 'Your catering inquiry at {restaurant_name}', body: 'Thank you for considering us for your event! I\'ll prepare a personalized quote within 24 hours.' }, { delay: 1, subject: 'Your custom catering quote', body: 'Please find your personalized catering quote attached.' }] },
    ],
    invoiceItems: [
      { name: 'Catering - Per Person', description: 'Full-service catering per person', price: 35, unit: 'person' },
      { name: 'Venue Rental', description: 'Private dining room rental', price: 500, unit: 'event' },
      { name: 'Cake/Desserts', description: 'Custom cake or dessert platter', price: 150, unit: 'order' },
    ],
    intakeForms: [
      { name: 'Event Catering Request', fields: [{ label: 'Event Date', type: 'date', required: true }, { label: 'Guest Count', type: 'number', required: true }, { label: 'Event Type', type: 'select', required: true }, { label: 'Dietary Requirements', type: 'textarea', required: false }, { label: 'Budget Range', type: 'select', required: false }] },
    ],
  },
  {
    name: 'Law Firms', industry: 'legal', category: 'Professional Services', icon: '⚖️', color: '#1d4ed8',
    description: 'For attorneys, law firms, legal consultants, and paralegals.',
    features: ['Client intake', 'Case tracking', 'Document collection', 'Consultation booking', 'Billing & retainers'],
    automations: [
      { name: 'New inquiry response', trigger: 'contact_created', steps: [{ type: 'delay', config: { duration: 30, unit: 'minutes' } }, { type: 'email', config: { subject: 'Your inquiry to {firm_name}', body: 'Thank you for reaching out. We\'ve received your inquiry and an attorney will review it within 24 hours.' } }] },
    ],
    emailSequences: [
      { name: 'New client onboarding', emails: [{ delay: 0, subject: 'Welcome to {firm_name}', body: 'Welcome. Attached are the engagement letter and intake forms. Please complete and return within 48 hours.' }, { delay: 3, subject: 'Case status update', body: 'We wanted to update you on your case. Our team is currently...' }] },
    ],
    invoiceItems: [
      { name: 'Initial Consultation', description: '1-hour initial consultation', price: 350, unit: 'hour' },
      { name: 'Attorney Fees', description: 'Legal services - hourly rate', price: 350, unit: 'hour' },
      { name: 'Retainer', description: 'Monthly retainer fee', price: 2500, unit: 'month' },
      { name: 'Document Preparation', description: 'Contract or document preparation', price: 500, unit: 'document' },
    ],
    intakeForms: [
      { name: 'Client Intake', fields: [{ label: 'Matter Type', type: 'select', required: true }, { label: 'Case Description', type: 'textarea', required: true }, { label: 'Opposing Party', type: 'text', required: false }, { label: 'Urgency', type: 'select', required: true }, { label: 'How did you find us?', type: 'select', required: false }] },
    ],
  },
  {
    name: 'Coaching & Consulting', industry: 'coaching', category: 'Professional Services', icon: '🎯', color: '#0891b2',
    description: 'For business coaches, life coaches, consultants, therapists, and mentors.',
    features: ['Discovery calls', 'Program management', 'Progress tracking', 'Content delivery', 'Group coaching'],
    automations: [
      { name: 'Discovery call booked', trigger: 'appointment_scheduled', steps: [{ type: 'email', config: { subject: 'Your discovery call is confirmed!', body: 'Can\'t wait to chat, {first_name}! Please complete this pre-call questionnaire so we can make the most of our time: {form_link}' } }] },
      { name: 'Program completion check-in', trigger: 'appointment_completed', steps: [{ type: 'delay', config: { duration: 7, unit: 'days' } }, { type: 'email', config: { subject: 'How are you doing with your goals?', body: 'Hi {first_name}, one week since our session — how\'s the progress? Share your wins!' } }] },
    ],
    emailSequences: [
      { name: 'New client journey', emails: [{ delay: 0, subject: 'Your coaching journey begins!', body: 'Congratulations on taking this step, {first_name}! Here\'s your onboarding checklist and next steps.' }, { delay: 7, subject: 'Week 1 check-in', body: 'How has your first week been? Any wins to celebrate or challenges to overcome together?' }] },
    ],
    invoiceItems: [
      { name: '1:1 Coaching Session', description: '60-minute coaching session', price: 200, unit: 'session' },
      { name: 'Coaching Package - 6 Sessions', description: '6-session coaching package', price: 1000, unit: 'package' },
      { name: 'Group Coaching', description: 'Monthly group coaching membership', price: 197, unit: 'month' },
      { name: 'Strategy Intensive', description: 'Full-day strategy intensive', price: 1500, unit: 'day' },
    ],
    intakeForms: [
      { name: 'Discovery Call Application', fields: [{ label: 'Your Biggest Challenge', type: 'textarea', required: true }, { label: 'Your Goal in 90 Days', type: 'textarea', required: true }, { label: 'Investment Budget', type: 'select', required: false }, { label: 'Have you worked with a coach before?', type: 'radio', required: false }] },
    ],
  },
]

export const industryTemplatesService = {
  async listTemplates(orgId: string) {
    const builtIn = BUILT_IN_TEMPLATES.map((t, i) => ({ ...t, id: `builtin_${i}`, createdAt: '2024-01-01T00:00:00Z' }))

    try {
      const customDocs = await prisma.aiTask.findMany({
        where: { organizationId: orgId, type: 'industry_template' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      const custom = customDocs.map(d => ({ ...(d.metadata as any), id: d.id, createdAt: d.createdAt.toISOString() }))
      return { builtin: builtIn, custom }
    } catch {
      return { builtin: builtIn, custom: [] }
    }
  },

  getBuiltinTemplate(id: string): IndustryTemplate | null {
    const idx = parseInt(id.replace('builtin_', ''))
    if (isNaN(idx) || idx < 0 || idx >= BUILT_IN_TEMPLATES.length) return null
    return { ...BUILT_IN_TEMPLATES[idx], id, createdAt: '2024-01-01T00:00:00Z' }
  },

  async applyTemplate(orgId: string, templateId: string): Promise<{ applied: string[] }> {
    const template = this.getBuiltinTemplate(templateId)
    if (!template) throw new Error('Template not found')

    const applied: string[] = []

    try {
      for (const seq of template.emailSequences) {
        await prisma.dripCampaign.create({
          data: {
            organizationId: orgId,
            name: seq.name,
            status: 'DRAFT',
            steps: seq.emails as any,
          },
        })
        applied.push(`Email sequence: ${seq.name}`)
      }
    } catch (err) {
      logger.warn(err, 'template apply: drip campaigns skipped')
    }

    try {
      for (const automation of template.automations) {
        await (prisma as any).automation.create({
          data: {
            organizationId: orgId,
            name: automation.name,
            trigger: automation.trigger,
            steps: automation.steps as any,
            status: 'INACTIVE',
          },
        }).catch(() => null)
        applied.push(`Automation: ${automation.name}`)
      }
    } catch {
    }

    applied.push(`Template "${template.name}" markers applied`)
    return { applied }
  },
}
