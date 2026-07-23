export type PlanTier = 'free' | 'starter' | 'pro' | 'enterprise'

export interface PlanFeatures {
  seats: number
  aiCallsPerMonth: number
  storageGb: number
  customWorkflows: boolean
  apiAccess: boolean
  whiteLabel: boolean
  prioritySupport: boolean
  voiceAI: boolean
  competitorIntel: boolean
  customDomain: boolean
}

export const PLAN_FEATURES: Record<PlanTier, PlanFeatures> = {
  free: {
    seats: 2,
    aiCallsPerMonth: 50,
    storageGb: 1,
    customWorkflows: false,
    apiAccess: false,
    whiteLabel: false,
    prioritySupport: false,
    voiceAI: false,
    competitorIntel: false,
    customDomain: false,
  },
  starter: {
    seats: 5,
    aiCallsPerMonth: 500,
    storageGb: 10,
    customWorkflows: true,
    apiAccess: false,
    whiteLabel: false,
    prioritySupport: false,
    voiceAI: false,
    competitorIntel: false,
    customDomain: true,
  },
  pro: {
    seats: 25,
    aiCallsPerMonth: 5000,
    storageGb: 100,
    customWorkflows: true,
    apiAccess: true,
    whiteLabel: false,
    prioritySupport: true,
    voiceAI: true,
    competitorIntel: true,
    customDomain: true,
  },
  enterprise: {
    seats: -1,
    aiCallsPerMonth: -1,
    storageGb: -1,
    customWorkflows: true,
    apiAccess: true,
    whiteLabel: true,
    prioritySupport: true,
    voiceAI: true,
    competitorIntel: true,
    customDomain: true,
  },
}
