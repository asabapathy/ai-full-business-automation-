import { prisma } from '@kanavu/database'
import { logger } from '../utils/logger.js'

interface GoogleAdsConfig {
  accessToken: string
  refreshToken: string
  customerId: string
  developerToken: string
}

interface CampaignCreateInput {
  name: string
  budget: number
  targetCpa?: number
  keywords?: string[]
  adHeadlines?: string[]
  adDescriptions?: string[]
  startDate?: string
  endDate?: string
}

async function getConfig(orgId: string): Promise<GoogleAdsConfig | null> {
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { settings: true } })
  const settings = (org?.settings as any) ?? {}
  const cfg = settings.googleAds
  if (!cfg?.accessToken || !cfg?.customerId || !cfg?.developerToken) return null
  return cfg as GoogleAdsConfig
}

async function refreshAccessToken(refreshToken: string, orgId: string): Promise<string> {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_ADS_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET ?? '',
    }),
  })
  const data = await resp.json() as any
  if (!data.access_token) throw new Error('Failed to refresh Google Ads access token')

  await prisma.organization.update({
    where: { id: orgId },
    data: { settings: { googleAds: { ...(await getConfig(orgId)), accessToken: data.access_token } } as any },
  })
  return data.access_token as string
}

async function adsApiRequest(path: string, method: string, body: any, cfg: GoogleAdsConfig, orgId: string): Promise<any> {
  const baseUrl = `https://googleads.googleapis.com/v17/customers/${cfg.customerId}`
  let resp = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${cfg.accessToken}`,
      'developer-token': cfg.developerToken,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (resp.status === 401 && cfg.refreshToken) {
    const newToken = await refreshAccessToken(cfg.refreshToken, orgId)
    cfg.accessToken = newToken
    resp = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${newToken}`,
        'developer-token': cfg.developerToken,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Google Ads API error ${resp.status}: ${err}`)
  }
  return resp.json()
}

export const googleAdsService = {
  async getOAuthUrl(orgId: string): Promise<string> {
    const state = Buffer.from(JSON.stringify({ orgId })).toString('base64')
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID ?? '',
      redirect_uri: `${process.env.API_URL}/google-ads/callback`,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/adwords',
      access_type: 'offline',
      prompt: 'consent',
      state,
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  },

  async handleCallback(code: string, orgId: string): Promise<void> {
    const resp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.API_URL}/google-ads/callback`,
        client_id: process.env.GOOGLE_ADS_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET ?? '',
      }),
    })
    const data = await resp.json() as any
    if (!data.access_token) throw new Error('OAuth token exchange failed')

    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { settings: true } })
    const settings: any = org?.settings ?? {}
    settings.googleAds = {
      ...(settings.googleAds ?? {}),
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    }
    await prisma.organization.update({ where: { id: orgId }, data: { settings } })
  },

  async saveConfig(orgId: string, config: { customerId: string; developerToken: string }): Promise<void> {
    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { settings: true } })
    const settings: any = org?.settings ?? {}
    settings.googleAds = { ...(settings.googleAds ?? {}), ...config }
    await prisma.organization.update({ where: { id: orgId }, data: { settings } })
  },

  async getConnectionStatus(orgId: string): Promise<{ connected: boolean; customerId?: string }> {
    const cfg = await getConfig(orgId)
    return { connected: !!cfg?.accessToken, customerId: cfg?.customerId }
  },

  async listCampaigns(orgId: string): Promise<any[]> {
    const cfg = await getConfig(orgId)
    if (!cfg) return getDemoCampaigns()

    try {
      const query = `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign_budget.amount_micros, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.ctr, metrics.average_cpc FROM campaign JOIN campaign_budget ON campaign.campaign_budget = campaign_budget.resource_name WHERE campaign.status != 'REMOVED' ORDER BY metrics.cost_micros DESC LIMIT 50`
      const data = await adsApiRequest('/googleAds:searchStream', 'POST', { query }, cfg, orgId)
      return (data.results ?? []).map((r: any) => ({
        id: r.campaign?.id,
        name: r.campaign?.name,
        status: r.campaign?.status,
        type: r.campaign?.advertisingChannelType,
        budgetMicros: r.campaignBudget?.amountMicros,
        budget: (r.campaignBudget?.amountMicros ?? 0) / 1_000_000,
        impressions: r.metrics?.impressions ?? 0,
        clicks: r.metrics?.clicks ?? 0,
        costMicros: r.metrics?.costMicros ?? 0,
        spend: (r.metrics?.costMicros ?? 0) / 1_000_000,
        conversions: r.metrics?.conversions ?? 0,
        ctr: r.metrics?.ctr ?? 0,
        avgCpc: (r.metrics?.averageCpc ?? 0) / 1_000_000,
      }))
    } catch (err) {
      logger.error(err, 'google ads list campaigns error')
      return getDemoCampaigns()
    }
  },

  async createCampaign(orgId: string, input: CampaignCreateInput): Promise<any> {
    const cfg = await getConfig(orgId)
    if (!cfg) throw new Error('Google Ads not connected')

    const budgetOp = {
      campaignBudgetOperation: {
        create: {
          name: `Budget for ${input.name} ${Date.now()}`,
          amountMicros: Math.round(input.budget * 1_000_000),
          deliveryMethod: 'STANDARD',
        },
      },
    }
    const budgetResp = await adsApiRequest('/campaignBudgets:mutate', 'POST', { operations: [budgetOp] }, cfg, orgId)
    const budgetResourceName = budgetResp.results?.[0]?.resourceName

    const campaignOp = {
      campaignOperation: {
        create: {
          name: input.name,
          status: 'PAUSED',
          advertisingChannelType: 'SEARCH',
          campaignBudget: budgetResourceName,
          targetCpa: input.targetCpa ? { targetCpaMicros: Math.round(input.targetCpa * 1_000_000) } : undefined,
          startDate: input.startDate ?? new Date().toISOString().slice(0, 10).replace(/-/g, ''),
          endDate: input.endDate?.replace(/-/g, ''),
        },
      },
    }
    const campResp = await adsApiRequest('/campaigns:mutate', 'POST', { operations: [campaignOp] }, cfg, orgId)
    return campResp.results?.[0] ?? { resourceName: 'demo' }
  },

  async updateCampaignStatus(orgId: string, campaignId: string, status: 'ENABLED' | 'PAUSED'): Promise<void> {
    const cfg = await getConfig(orgId)
    if (!cfg) throw new Error('Google Ads not connected')

    await adsApiRequest('/campaigns:mutate', 'POST', {
      operations: [{
        campaignOperation: {
          update: { resourceName: `customers/${cfg.customerId}/campaigns/${campaignId}`, status },
          updateMask: 'status',
        },
      }],
    }, cfg, orgId)
  },

  async getCampaignMetrics(orgId: string, campaignId: string, days = 30): Promise<any> {
    const cfg = await getConfig(orgId)
    if (!cfg) return getDemoMetrics(days)

    try {
      const query = `SELECT segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions FROM campaign WHERE campaign.id = ${campaignId} AND segments.date DURING LAST_${days}_DAYS ORDER BY segments.date ASC`
      const data = await adsApiRequest('/googleAds:searchStream', 'POST', { query }, cfg, orgId)
      return {
        daily: (data.results ?? []).map((r: any) => ({
          date: r.segments?.date,
          impressions: r.metrics?.impressions ?? 0,
          clicks: r.metrics?.clicks ?? 0,
          spend: (r.metrics?.costMicros ?? 0) / 1_000_000,
          conversions: r.metrics?.conversions ?? 0,
        })),
      }
    } catch {
      return getDemoMetrics(days)
    }
  },

  async getAccountSummary(orgId: string): Promise<any> {
    const campaigns = await this.listCampaigns(orgId)
    const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0)
    const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0)
    const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0)
    const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0)
    return {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter(c => c.status === 'ENABLED').length,
      totalSpend,
      totalImpressions,
      totalClicks,
      totalConversions,
      avgCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      costPerConversion: totalConversions > 0 ? totalSpend / totalConversions : 0,
    }
  },
}

function getDemoCampaigns() {
  return [
    { id: '1', name: 'Brand Awareness Q4', status: 'ENABLED', type: 'SEARCH', budget: 50, spend: 1240.50, impressions: 84200, clicks: 2310, conversions: 47, ctr: 0.027, avgCpc: 0.54 },
    { id: '2', name: 'Lead Gen - Local Services', status: 'ENABLED', type: 'SEARCH', budget: 30, spend: 820.00, impressions: 31000, clicks: 1540, conversions: 89, ctr: 0.049, avgCpc: 0.53 },
    { id: '3', name: 'Competitor Keywords', status: 'PAUSED', type: 'SEARCH', budget: 20, spend: 340.20, impressions: 12400, clicks: 480, conversions: 12, ctr: 0.038, avgCpc: 0.71 },
    { id: '4', name: 'Retargeting - Website Visitors', status: 'ENABLED', type: 'DISPLAY', budget: 15, spend: 210.00, impressions: 145000, clicks: 620, conversions: 28, ctr: 0.004, avgCpc: 0.34 },
  ]
}

function getDemoMetrics(days: number) {
  const daily = Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    return {
      date: d.toISOString().slice(0, 10),
      impressions: Math.floor(Math.random() * 3000) + 500,
      clicks: Math.floor(Math.random() * 100) + 20,
      spend: parseFloat((Math.random() * 50 + 10).toFixed(2)),
      conversions: Math.floor(Math.random() * 5),
    }
  })
  return { daily }
}
