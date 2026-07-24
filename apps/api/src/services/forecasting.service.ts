import { prisma } from './database.js'

interface ForecastPoint { date: string; projected: number; low: number; high: number }

export class ForecastingService {
  async generateForecast(orgId: string, days = 90): Promise<{ points: ForecastPoint[]; trend: string; confidence: number }> {
    // Collect last 180 days of daily revenue
    const since = new Date(Date.now() - 180 * 86_400_000)
    const invoices = await prisma.invoice.findMany({
      where: { organizationId: orgId, status: 'PAID', paidAt: { gte: since } },
      select: { total: true, paidAt: true },
    })

    // Build daily buckets
    const daily: Record<string, number> = {}
    for (const inv of invoices) {
      if (!inv.paidAt) continue
      const key = inv.paidAt.toISOString().slice(0, 10)
      daily[key] = (daily[key] ?? 0) + Number(inv.total)
    }

    const sortedKeys = Object.keys(daily).sort()
    const values = sortedKeys.map(k => daily[k] ?? 0)

    // Calculate moving average and trend
    const { slope, intercept } = this.linearRegression(values)
    const avgRevenue = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
    const confidence = Math.min(0.9, Math.max(0.5, values.length / 60))

    const trend = slope > avgRevenue * 0.01 ? 'growing' : slope < -avgRevenue * 0.01 ? 'declining' : 'stable'

    // Project forward
    const points: ForecastPoint[] = []
    const baseIndex = values.length
    const stdDev = this.standardDeviation(values)

    for (let i = 0; i < days; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i + 1)
      const dateStr = d.toISOString().slice(0, 10)

      // Day of week seasonality (weekend lower)
      const dow = d.getDay()
      const dowFactor = dow === 0 || dow === 6 ? 0.6 : 1.0

      const projected = Math.max(0, (intercept + slope * (baseIndex + i)) * dowFactor)
      const uncertainty = stdDev * (1 + i / days) // uncertainty grows with horizon

      points.push({
        date: dateStr,
        projected: Math.round(projected * 100) / 100,
        low: Math.max(0, Math.round((projected - uncertainty) * 100) / 100),
        high: Math.round((projected + uncertainty) * 100) / 100,
      })
    }

    // Cache forecast
    await prisma.revenueForecast.create({
      data: {
        organizationId: orgId,
        forecastData: { points, trend, confidence, days },
        confidence,
      },
    }).catch(() => {})

    return { points, trend, confidence: Math.round(confidence * 100) }
  }

  async getLatestForecast(orgId: string) {
    return prisma.revenueForecast.findFirst({
      where: { organizationId: orgId },
      orderBy: { generatedAt: 'desc' },
    })
  }

  async getHistoricalRevenue(orgId: string, days = 90) {
    const since = new Date(Date.now() - days * 86_400_000)
    const invoices = await prisma.invoice.findMany({
      where: { organizationId: orgId, status: 'PAID', paidAt: { gte: since } },
      select: { total: true, paidAt: true },
    })

    const daily: Record<string, number> = {}
    for (const inv of invoices) {
      if (!inv.paidAt) continue
      const key = inv.paidAt.toISOString().slice(0, 10)
      daily[key] = (daily[key] ?? 0) + Number(inv.total)
    }

    // Fill gaps with 0
    const result: Array<{ date: string; revenue: number }> = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000)
      const key = d.toISOString().slice(0, 10)
      result.push({ date: key, revenue: daily[key] ?? 0 })
    }

    return result
  }

  async getMonthlyComparison(orgId: string) {
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    const [current, last] = await Promise.all([
      prisma.invoice.aggregate({
        where: { organizationId: orgId, status: 'PAID', paidAt: { gte: currentMonthStart } },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: { organizationId: orgId, status: 'PAID', paidAt: { gte: lastMonthStart, lte: lastMonthEnd } },
        _sum: { total: true },
      }),
    ])

    const currentRev = Number(current._sum.total ?? 0)
    const lastRev = Number(last._sum.total ?? 0)
    const change = lastRev > 0 ? Math.round((currentRev - lastRev) / lastRev * 100) : 0

    return { currentMonth: currentRev, lastMonth: lastRev, change }
  }

  private linearRegression(values: number[]): { slope: number; intercept: number } {
    const n = values.length
    if (n < 2) return { slope: 0, intercept: values[0] ?? 0 }

    const sumX = (n * (n - 1)) / 2
    const sumY = values.reduce((a, b) => a + b, 0)
    const sumXY = values.reduce((s, y, x) => s + x * y, 0)
    const sumX2 = values.reduce((s, _, x) => s + x * x, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    return { slope, intercept }
  }

  private standardDeviation(values: number[]): number {
    if (values.length < 2) return 0
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (values.length - 1)
    return Math.sqrt(variance)
  }
}

export const forecastingService = new ForecastingService()
