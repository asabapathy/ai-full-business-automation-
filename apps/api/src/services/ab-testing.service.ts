import { prisma } from '@kanavu/database'
import crypto from 'node:crypto'
import { logger } from '../utils/logger.js'

export type ExperimentStatus = 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED'
export type ExperimentType = 'email_subject' | 'email_body' | 'landing_page' | 'cta_text' | 'pricing' | 'onboarding'

interface Variant {
  id: string
  name: string
  content: string
  trafficSplit: number
}

interface ExperimentInput {
  name: string
  type: ExperimentType
  hypothesis: string
  variants: Omit<Variant, 'id'>[]
  minSampleSize?: number
  confidenceLevel?: number
}

interface VariantStats {
  variantId: string
  impressions: number
  conversions: number
  conversionRate: number
  revenue?: number
}

function computeStats(variants: Variant[], events: any[]): VariantStats[] {
  return variants.map(v => {
    const variantEvents = events.filter(e => e.variantId === v.id)
    const impressions = variantEvents.filter(e => e.type === 'impression').length
    const conversions = variantEvents.filter(e => e.type === 'conversion').length
    const revenue = variantEvents.filter(e => e.type === 'conversion').reduce((s, e) => s + (e.revenue ?? 0), 0)
    return {
      variantId: v.id,
      variantName: v.name,
      impressions,
      conversions,
      conversionRate: impressions > 0 ? conversions / impressions : 0,
      revenue,
    }
  })
}

function computeSignificance(control: VariantStats, treatment: VariantStats): number {
  if (control.impressions < 30 || treatment.impressions < 30) return 0
  const p1 = control.conversionRate
  const p2 = treatment.conversionRate
  const n1 = control.impressions
  const n2 = treatment.impressions
  const pooled = (p1 * n1 + p2 * n2) / (n1 + n2)
  if (pooled === 0 || pooled === 1) return 0
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2))
  if (se === 0) return 0
  const z = Math.abs(p2 - p1) / se
  const significance = 1 - Math.exp(-0.717 * z - 0.416 * z * z)
  return Math.min(Math.round(significance * 1000) / 10, 99.9)
}

export const abTestingService = {
  async createExperiment(orgId: string, input: ExperimentInput) {
    const variants = input.variants.map((v, i) => ({
      ...v,
      id: `v_${Date.now()}_${i}`,
      trafficSplit: v.trafficSplit ?? Math.floor(100 / input.variants.length),
    }))

    const experiment = await (prisma as any).abExperiment.create({
      data: {
        organizationId: orgId,
        name: input.name,
        type: input.type,
        hypothesis: input.hypothesis,
        status: 'DRAFT' as ExperimentStatus,
        variants: variants as any,
        minSampleSize: input.minSampleSize ?? 100,
        confidenceLevel: input.confidenceLevel ?? 95,
      },
    }).catch(async () => {
      const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { settings: true } })
      const settings: any = org?.settings ?? {}
      if (!settings.abExperiments) settings.abExperiments = []
      const exp = {
        id: `exp_${Date.now()}`,
        organizationId: orgId,
        name: input.name,
        type: input.type,
        hypothesis: input.hypothesis,
        status: 'DRAFT',
        variants,
        events: [],
        minSampleSize: input.minSampleSize ?? 100,
        confidenceLevel: input.confidenceLevel ?? 95,
        createdAt: new Date().toISOString(),
      }
      settings.abExperiments.push(exp)
      await prisma.organization.update({ where: { id: orgId }, data: { settings } })
      return exp
    })

    return experiment
  },

  async listExperiments(orgId: string) {
    try {
      const experiments = await (prisma as any).abExperiment.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
      })
      return experiments
    } catch {
      const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { settings: true } })
      return ((org?.settings as any)?.abExperiments ?? []) as any[]
    }
  },

  async updateStatus(orgId: string, experimentId: string, status: ExperimentStatus) {
    try {
      return await (prisma as any).abExperiment.update({
        where: { id: experimentId, organizationId: orgId },
        data: { status },
      })
    } catch {
      const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { settings: true } })
      const settings: any = org?.settings ?? {}
      settings.abExperiments = (settings.abExperiments ?? []).map((e: any) =>
        e.id === experimentId ? { ...e, status } : e
      )
      await prisma.organization.update({ where: { id: orgId }, data: { settings } })
    }
  },

  async assignVariant(orgId: string, experimentId: string, userId: string): Promise<string | null> {
    const experiments = await this.listExperiments(orgId)
    const experiment = experiments.find((e: any) => e.id === experimentId)
    if (!experiment || experiment.status !== 'RUNNING') return null

    const hash = crypto.createHash('md5').update(`${experimentId}:${userId}`).digest('hex')
    const hashInt = parseInt(hash.slice(0, 8), 16)
    const bucket = hashInt % 100

    let cumulative = 0
    const variants: Variant[] = experiment.variants
    for (const variant of variants) {
      cumulative += variant.trafficSplit
      if (bucket < cumulative) return variant.id
    }
    return variants[variants.length - 1]?.id ?? null
  },

  async recordEvent(orgId: string, experimentId: string, variantId: string, type: 'impression' | 'conversion', revenue?: number) {
    const event = { variantId, type, revenue, timestamp: new Date().toISOString() }
    try {
      await (prisma as any).abExperiment.update({
        where: { id: experimentId, organizationId: orgId },
        data: { events: { push: event } },
      })
    } catch {
      const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { settings: true } })
      const settings: any = org?.settings ?? {}
      settings.abExperiments = (settings.abExperiments ?? []).map((e: any) =>
        e.id === experimentId ? { ...e, events: [...(e.events ?? []), event] } : e
      )
      await prisma.organization.update({ where: { id: orgId }, data: { settings } })
    }
  },

  async getResults(orgId: string, experimentId: string) {
    const experiments = await this.listExperiments(orgId)
    const experiment = experiments.find((e: any) => e.id === experimentId)
    if (!experiment) throw new Error('Experiment not found')

    const events = experiment.events ?? []
    const variantStats = computeStats(experiment.variants, events)

    const [control, ...treatments] = variantStats
    const winners = treatments.map(t => ({
      ...t,
      uplift: control.conversionRate > 0 ? ((t.conversionRate - control.conversionRate) / control.conversionRate) * 100 : 0,
      significance: computeSignificance(control, t),
      isWinner: t.conversionRate > control.conversionRate,
    }))

    const totalImpressions = variantStats.reduce((s, v) => s + v.impressions, 0)
    const hasSignificantWinner = winners.some(w => w.significance >= (experiment.confidenceLevel ?? 95))

    return {
      experiment,
      variantStats,
      control,
      winners,
      totalImpressions,
      hasSignificantWinner,
      recommendation: hasSignificantWinner
        ? `Variant "${winners.find(w => w.isWinner && w.significance >= (experiment.confidenceLevel ?? 95))?.variantName ?? 'B'}" is the winner with statistical significance. Roll it out to 100% of users.`
        : totalImpressions < (experiment.minSampleSize ?? 100)
          ? `Collecting data... ${totalImpressions}/${experiment.minSampleSize ?? 100} impressions needed.`
          : 'No significant winner yet. Continue running the experiment.',
    }
  },

  async deleteExperiment(orgId: string, experimentId: string) {
    try {
      await (prisma as any).abExperiment.delete({ where: { id: experimentId, organizationId: orgId } })
    } catch {
      const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { settings: true } })
      const settings: any = org?.settings ?? {}
      settings.abExperiments = (settings.abExperiments ?? []).filter((e: any) => e.id !== experimentId)
      await prisma.organization.update({ where: { id: orgId }, data: { settings } })
    }
  },
}
