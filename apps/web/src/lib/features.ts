// Feature slug constants
export type Feature =
  | 'ai:brain' | 'ai:business_doctor' | 'ai:receptionist' | 'ai:email_writer' | 'ai:blog_writer'
  | 'core:automations' | 'core:dashboard' | 'core:crm' | 'core:sales' | 'core:appointments'
  | 'core:invoices' | 'core:proposals' | 'core:estimates' | 'core:contracts'
  | 'marketing:hub' | 'marketing:campaigns' | 'marketing:social' | 'marketing:content_calendar'
  | 'marketing:sequences' | 'marketing:drip' | 'marketing:broadcasts'
  | 'reputation:reviews' | 'reputation:testimonials' | 'reputation:referrals' | 'reputation:loyalty'
  | 'comm:team_inbox' | 'comm:sms' | 'comm:whatsapp' | 'comm:chat_widget' | 'comm:push'
  | 'finance:billing' | 'finance:subscriptions' | 'finance:expenses' | 'finance:job_costing'
  | 'finance:commissions' | 'finance:payment_links' | 'finance:gift_cards'
  | 'ops:hub' | 'ops:projects' | 'ops:time_tracking' | 'ops:staff_schedule' | 'ops:inventory'
  | 'ops:vendors' | 'ops:resources' | 'ops:documents' | 'ops:forms'
  | 'analytics:hub' | 'analytics:reports' | 'analytics:forecasting' | 'analytics:goals'
  | 'analytics:csat' | 'analytics:ab_testing'
  | 'clients:portal' | 'clients:onboarding' | 'clients:intake' | 'clients:knowledge_base'
  | 'clients:waitlist' | 'clients:recurring'
  | 'platform:website' | 'platform:locations' | 'platform:marketplace' | 'platform:white_label'
  | 'platform:competitors' | 'platform:google_ads'
  | 'settings:settings' | 'settings:team' | 'settings:api_keys' | 'settings:webhooks'
  | 'settings:notifications' | 'settings:audit_log'

export type PlanId = 'FREE' | 'FREE_TRIAL' | 'STARTER' | 'PRO' | 'BUSINESS' | 'ENTERPRISE' | 'CUSTOM'

// Settings are always available on every plan
const ALWAYS_ON: Feature[] = [
  'core:dashboard',
  'finance:billing',
  'settings:settings',
  'settings:team',
  'settings:notifications',
]

const STARTER_FEATURES: Feature[] = [
  ...ALWAYS_ON,
  'core:crm',
  'core:appointments',
  'core:invoices',
  'ai:receptionist',
  'ai:email_writer',
  'reputation:reviews',
  'analytics:hub',
  'clients:intake',
  'clients:waitlist',
  'clients:recurring',
]

const PRO_FEATURES: Feature[] = [
  ...STARTER_FEATURES,
  'ai:brain',
  'ai:business_doctor',
  'ai:blog_writer',
  'core:automations',
  'core:sales',
  'core:proposals',
  'core:estimates',
  'core:contracts',
  'marketing:hub',
  'marketing:campaigns',
  'marketing:social',
  'marketing:content_calendar',
  'marketing:sequences',
  'marketing:drip',
  'marketing:broadcasts',
  'reputation:testimonials',
  'reputation:referrals',
  'reputation:loyalty',
  'comm:team_inbox',
  'comm:sms',
  'comm:whatsapp',
  'comm:chat_widget',
  'comm:push',
  'finance:expenses',
  'finance:job_costing',
  'finance:commissions',
  'finance:payment_links',
  'finance:gift_cards',
  'ops:hub',
  'ops:projects',
  'ops:staff_schedule',
  'ops:vendors',
  'ops:documents',
  'ops:forms',
  'analytics:reports',
  'analytics:forecasting',
  'analytics:goals',
  'analytics:csat',
  'analytics:ab_testing',
  'clients:portal',
  'clients:onboarding',
  'clients:knowledge_base',
  'platform:website',
  'platform:locations',
  'platform:marketplace',
  'platform:competitors',
  'platform:google_ads',
  'settings:api_keys',
  'settings:webhooks',
]

const BUSINESS_FEATURES: Feature[] = [
  ...PRO_FEATURES,
  'platform:white_label',
  'finance:subscriptions',
  'ops:inventory',
  'ops:time_tracking',
  'ops:resources',
  'settings:audit_log',
]

export const PLAN_FEATURE_SETS: Record<string, Set<Feature>> = {
  FREE:       new Set(ALWAYS_ON),
  FREE_TRIAL: new Set(BUSINESS_FEATURES),
  STARTER:    new Set(STARTER_FEATURES),
  PRO:        new Set(PRO_FEATURES),
  BUSINESS:   new Set(BUSINESS_FEATURES),
  ENTERPRISE: new Set(BUSINESS_FEATURES),
  CUSTOM:     new Set(BUSINESS_FEATURES),
}

// HIPAA-sensitive industries: only these features are ever visible
// Stores PHI must be avoided — no bulk outreach, no chat, no CRM marketing tools
const HIPAA_INDUSTRIES = new Set([
  'DENTAL_CLINIC', 'MEDICAL_PRACTICE', 'ABA_PROVIDER', 'AUTISM_THERAPY', 'DAYCARE',
])

const HIPAA_SAFE: Set<Feature> = new Set([
  'core:dashboard',
  'core:appointments',
  'core:invoices',
  'ai:receptionist',
  'reputation:reviews',
  'finance:billing',
  'analytics:hub',
  'clients:intake',
  'clients:waitlist',
  'clients:recurring',
  'clients:portal',
  'settings:settings',
  'settings:team',
  'settings:notifications',
])

export function getOrgFeatures(plan: string, industry?: string | null): Set<Feature> {
  const planKey = (plan ?? 'STARTER').toUpperCase()
  const planSet = PLAN_FEATURE_SETS[planKey] ?? PLAN_FEATURE_SETS.STARTER

  // HIPAA industries: hard-cap to the safe list (intersection)
  if (industry && HIPAA_INDUSTRIES.has(industry)) {
    return new Set([...planSet].filter(f => HIPAA_SAFE.has(f)))
  }

  return new Set(planSet)
}

export function isHipaaIndustry(industry?: string | null): boolean {
  return !!(industry && HIPAA_INDUSTRIES.has(industry))
}

// Plan metadata for pricing UI
export const PLAN_META = {
  STARTER: {
    name: 'Starter',
    price: 49,
    description: 'Core CRM, scheduling, and reputation tools for growing businesses.',
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, #06b6d4, #0ea5e9)',
    highlights: ['Up to 5 team members', '500 AI calls/month', 'CRM + Appointments', 'Invoicing', 'AI Receptionist', 'Reviews management', 'Email Writer', '10 GB storage'],
  },
  PRO: {
    name: 'Pro',
    price: 97,
    description: 'Full AI suite + marketing automation for established businesses.',
    color: '#a855f7',
    gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)',
    highlights: ['Up to 25 team members', '5,000 AI calls/month', 'Everything in Starter', 'AI Brain + Business Doctor', 'Full marketing suite', 'SMS, WhatsApp, Chat Widget', 'Website builder', 'Client portal', 'Projects & operations', 'API access', '100 GB storage'],
    popular: true,
  },
  BUSINESS: {
    name: 'Business',
    price: 197,
    description: 'White-label platform + unlimited scale for agencies and enterprises.',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    highlights: ['Unlimited team members', 'Unlimited AI calls', 'Everything in Pro', 'White-label branding', 'Inventory management', 'Time tracking', 'Resource booking', 'Customer subscriptions', 'Audit log', 'Unlimited storage'],
  },
} as const

export type PlanKey = keyof typeof PLAN_META

export const INDUSTRY_LABELS: Record<string, string> = {
  DENTAL_CLINIC: 'Dental Clinic',
  MEDICAL_PRACTICE: 'Medical Practice',
  ABA_PROVIDER: 'ABA Therapy',
  AUTISM_THERAPY: 'Autism Therapy',
  DAYCARE: 'Daycare / Childcare',
  HVAC: 'HVAC',
  PLUMBING: 'Plumbing',
  ELECTRICAL: 'Electrical',
  ROOFING: 'Roofing',
  LANDSCAPING: 'Landscaping',
  AUTO_REPAIR: 'Auto Repair',
  RESTAURANT: 'Restaurant',
  SALON: 'Salon / Spa',
  GYM: 'Gym / Fitness',
  LAW_FIRM: 'Law Firm',
  INSURANCE_AGENCY: 'Insurance Agency',
  REAL_ESTATE: 'Real Estate',
  ACCOUNTING_FIRM: 'Accounting',
  VETERINARY: 'Veterinary',
  CLEANING_COMPANY: 'Cleaning Company',
  ECOMMERCE: 'E-Commerce',
  RETAIL: 'Retail',
  TECHNOLOGY: 'Technology',
  CONSULTING: 'Consulting',
  OTHER: 'Other',
}
