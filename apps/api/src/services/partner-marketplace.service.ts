import { prisma } from '@kanavu/database'
import { logger } from '../utils/logger.js'

export interface PartnerListing {
  id: string
  name: string
  category: string
  tagline: string
  description: string
  logoUrl?: string
  websiteUrl?: string
  pricing: 'free' | 'freemium' | 'paid'
  pricingDetail?: string
  integrationStatus: 'native' | 'zapier' | 'api' | 'manual'
  rating: number
  reviewCount: number
  featured: boolean
  tags: string[]
  setupMinutes?: number
  createdAt: string
}

const MARKETPLACE_LISTINGS: PartnerListing[] = [
  { id: 'p1', name: 'QuickBooks Online', category: 'Accounting', tagline: 'Sync invoices and expenses automatically', description: 'Connect with QuickBooks to automatically sync invoices, payments, and customer records. Eliminate double entry and keep your books up to date in real time.', pricing: 'paid', pricingDetail: 'From $25/mo', integrationStatus: 'native', rating: 4.8, reviewCount: 312, featured: true, tags: ['accounting', 'invoicing', 'finance'], setupMinutes: 5, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'p2', name: 'Stripe', category: 'Payments', tagline: 'Accept payments and manage subscriptions', description: 'Stripe is already built into Kanavu AI. Accept cards, ACH, and international payments. Manage recurring subscriptions, payment links, and invoices.', pricing: 'freemium', pricingDetail: '2.9% + 30¢ per charge', integrationStatus: 'native', rating: 4.9, reviewCount: 891, featured: true, tags: ['payments', 'billing', 'subscriptions'], setupMinutes: 3, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'p3', name: 'Google Analytics 4', category: 'Analytics', tagline: 'Track website visitors and conversions', description: 'Connect Google Analytics to track website traffic, user behavior, and conversion events. See which marketing channels drive the most revenue.', pricing: 'free', integrationStatus: 'native', rating: 4.7, reviewCount: 456, featured: true, tags: ['analytics', 'website', 'marketing'], setupMinutes: 5, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'p4', name: 'Zapier', category: 'Automation', tagline: 'Connect to 5000+ apps', description: 'Use Zapier to connect Kanavu AI with thousands of other tools. Create custom workflows without writing code.', pricing: 'freemium', pricingDetail: 'Free up to 100 tasks/mo', integrationStatus: 'zapier', rating: 4.5, reviewCount: 234, featured: false, tags: ['automation', 'integration', 'workflow'], setupMinutes: 15, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'p5', name: 'Mailchimp', category: 'Email Marketing', tagline: 'Sync contacts to Mailchimp lists', description: 'Automatically sync your CRM contacts to Mailchimp lists. Segment by tags, pipeline stage, or custom fields for targeted campaigns.', pricing: 'freemium', pricingDetail: 'Free up to 500 contacts', integrationStatus: 'native', rating: 4.2, reviewCount: 189, featured: false, tags: ['email', 'marketing', 'campaigns'], setupMinutes: 10, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'p6', name: 'Calendly', category: 'Scheduling', tagline: 'Let clients book meetings automatically', description: 'Embed Calendly into your client portal and website. New bookings automatically create CRM contacts and trigger follow-up sequences.', pricing: 'freemium', pricingDetail: 'Free for basic', integrationStatus: 'zapier', rating: 4.6, reviewCount: 312, featured: false, tags: ['scheduling', 'appointments', 'calendar'], setupMinutes: 10, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'p7', name: 'Twilio', category: 'Communications', tagline: 'SMS, voice, and WhatsApp messaging', description: 'Twilio powers the SMS inbox, AI receptionist, and WhatsApp features. Bring your own Twilio account for custom phone numbers and pricing.', pricing: 'paid', pricingDetail: 'Pay-per-use', integrationStatus: 'native', rating: 4.7, reviewCount: 567, featured: true, tags: ['sms', 'voice', 'whatsapp', 'communications'], setupMinutes: 10, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'p8', name: 'Google My Business', category: 'Reviews & Reputation', tagline: 'Respond to reviews from one dashboard', description: 'Monitor and respond to Google reviews directly from Kanavu AI. Track your GMB rating and sync it with your reputation dashboard.', pricing: 'free', integrationStatus: 'native', rating: 4.8, reviewCount: 423, featured: true, tags: ['reviews', 'reputation', 'google', 'local-seo'], setupMinutes: 5, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'p9', name: 'Facebook & Instagram Ads', category: 'Advertising', tagline: 'Track ad leads in your CRM automatically', description: 'Connect Meta Lead Ads to automatically import leads into your CRM the moment they submit a form. Trigger instant follow-up sequences.', pricing: 'free', integrationStatus: 'native', rating: 4.5, reviewCount: 298, featured: false, tags: ['ads', 'facebook', 'instagram', 'leads'], setupMinutes: 10, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'p10', name: 'DocuSign', category: 'Documents & Contracts', tagline: 'Send and track eSignature contracts', description: 'Send contracts for e-signature directly from Kanavu AI. Track opening, viewing, and signing in real time. Get notified the moment a contract is signed.', pricing: 'paid', pricingDetail: 'From $10/mo', integrationStatus: 'api', rating: 4.7, reviewCount: 234, featured: false, tags: ['contracts', 'esignature', 'documents'], setupMinutes: 15, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'p11', name: 'Xero', category: 'Accounting', tagline: 'Cloud accounting for small businesses', description: 'Sync invoices, contacts, and payments with Xero. Keep your accounting records in sync without manual entry.', pricing: 'paid', pricingDetail: 'From $15/mo', integrationStatus: 'api', rating: 4.5, reviewCount: 167, featured: false, tags: ['accounting', 'invoicing', 'finance'], setupMinutes: 10, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'p12', name: 'ElevenLabs', category: 'AI Voice', tagline: 'Ultra-realistic AI voice for your receptionist', description: 'Upgrade your AI phone receptionist with ultra-realistic voice from ElevenLabs. Choose from dozens of voices or clone your own.', pricing: 'freemium', pricingDetail: 'Free tier available', integrationStatus: 'native', rating: 4.9, reviewCount: 89, featured: true, tags: ['ai', 'voice', 'receptionist'], setupMinutes: 5, createdAt: '2024-01-01T00:00:00Z' },
]

export const partnerMarketplaceService = {
  async listListings(orgId: string, filters?: { category?: string; search?: string; pricing?: string }): Promise<PartnerListing[]> {
    let results = [...MARKETPLACE_LISTINGS]

    if (filters?.category && filters.category !== 'All') {
      results = results.filter(p => p.category === filters.category)
    }
    if (filters?.pricing && filters.pricing !== 'All') {
      results = results.filter(p => p.pricing === filters.pricing)
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase()
      results = results.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.tags.some(t => t.includes(q))
      )
    }

    const installedIds = await this.getInstalledIds(orgId)
    return results.map(p => ({ ...p, installed: installedIds.has(p.id) } as any))
  },

  async getInstalledIds(orgId: string): Promise<Set<string>> {
    try {
      const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { settings: true } })
      const installed: string[] = (org?.settings as any)?.installedPartners ?? []
      return new Set(installed)
    } catch {
      return new Set()
    }
  },

  async installPartner(orgId: string, partnerId: string): Promise<void> {
    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { settings: true } })
    const settings: any = org?.settings ?? {}
    const installed: string[] = settings.installedPartners ?? []
    if (!installed.includes(partnerId)) installed.push(partnerId)
    settings.installedPartners = installed
    await prisma.organization.update({ where: { id: orgId }, data: { settings } })
  },

  async uninstallPartner(orgId: string, partnerId: string): Promise<void> {
    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { settings: true } })
    const settings: any = org?.settings ?? {}
    settings.installedPartners = ((settings.installedPartners ?? []) as string[]).filter(id => id !== partnerId)
    await prisma.organization.update({ where: { id: orgId }, data: { settings } })
  },

  getCategories(): string[] {
    return Array.from(new Set(MARKETPLACE_LISTINGS.map(p => p.category))).sort()
  },
}
