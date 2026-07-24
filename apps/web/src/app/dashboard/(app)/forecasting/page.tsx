'use client'

import { useState, useEffect } from 'react'
import { LineChart, TrendingUp, TrendingDown, RefreshCw, Calendar } from 'lucide-react'
import { Button } from '../../../../components/ui/button'
import { apiClient } from '../../../../lib/api-client'

interface ForecastPoint {
  date: string
  projected: number
  low: number
  high: number
}

interface Forecast {
  points: ForecastPoint[]
  trend: 'up' | 'down' | 'flat'
  confidence: number
}

interface MonthlyComparison {
  currentMonth: number
  lastMonth: number
  change: number
}

export default function ForecastingPage() {
  const [forecast, setForecast] = useState<Forecast | null>(null)
  const [monthly, setMonthly] = useState<MonthlyComparison | null>(null)
  const [historical, setHistorical] = useState<{ date: string; revenue: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [days, setDays] = useState(90)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      const [histData, monthData] = await Promise.all([
        apiClient.get('/forecasting/historical?days=90'),
        apiClient.get('/forecasting/monthly-comparison'),
      ])
      setHistorical(histData.data ?? [])
      setMonthly(monthData)
      await fetchForecast()
    } finally {
      setLoading(false)
    }
  }

  async function fetchForecast() {
    const data = await apiClient.get(`/forecasting/forecast?days=${days}`)
    setForecast(data)
  }

  async function handleRegenerate() {
    setRegenerating(true)
    try {
      await fetchForecast()
    } finally {
      setRegenerating(false)
    }
  }

  const maxRevenue = Math.max(
    ...historical.map(h => h.revenue),
    ...(forecast?.points.map(p => p.high) ?? []),
    1
  )

  const chartWidth = 800
  const chartHeight = 200
  const pad = { left: 50, right: 20, top: 10, bottom: 30 }

  const allPoints = [
    ...historical.map(h => ({ date: h.date, value: h.revenue, type: 'historical' as const })),
    ...(forecast?.points ?? []).map(p => ({ date: p.date, value: p.projected, type: 'forecast' as const })),
  ]

  function xPos(i: number) {
    return pad.left + (i / (allPoints.length - 1 || 1)) * (chartWidth - pad.left - pad.right)
  }

  function yPos(v: number) {
    return pad.top + chartHeight - pad.bottom - ((v / maxRevenue) * (chartHeight - pad.top - pad.bottom))
  }

  const histPath = historical.length > 1
    ? historical.map((h, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i)} ${yPos(h.revenue)}`).join(' ')
    : ''

  const forecastStartIdx = historical.length - 1

  const forecastPath = forecast?.points.length
    ? forecast.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(forecastStartIdx + i)} ${yPos(p.projected)}`).join(' ')
    : ''

  const confidenceBand = forecast?.points.length
    ? [
        ...forecast.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(forecastStartIdx + i)} ${yPos(p.high)}`),
        ...forecast.points.slice().reverse().map((p, i) => `L ${xPos(forecastStartIdx + (forecast.points.length - 1 - i))} ${yPos(p.low)}`),
        'Z'
      ].join(' ')
    : ''

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LineChart className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Financial Forecasting</h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-lg border bg-background px-3 py-2 text-sm"
            value={days}
            onChange={e => setDays(parseInt(e.target.value))}
          >
            <option value={30}>30-day forecast</option>
            <option value={60}>60-day forecast</option>
            <option value={90}>90-day forecast</option>
          </select>
          <Button variant="outline" onClick={handleRegenerate} disabled={regenerating}>
            <RefreshCw className={`h-4 w-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {monthly && (
          <>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">This Month</p>
              <p className="text-xl font-bold">${monthly.currentMonth.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Last Month</p>
              <p className="text-xl font-bold">${monthly.lastMonth.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">MoM Change</p>
              <div className="flex items-center gap-1">
                {monthly.change >= 0
                  ? <TrendingUp className="h-4 w-4 text-green-500" />
                  : <TrendingDown className="h-4 w-4 text-red-500" />}
                <p className={`text-xl font-bold ${monthly.change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {monthly.change >= 0 ? '+' : ''}{monthly.change.toFixed(1)}%
                </p>
              </div>
            </div>
          </>
        )}
        {forecast && (
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Forecast Confidence</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${forecast.confidence * 100}%` }} />
              </div>
              <span className="text-sm font-bold">{(forecast.confidence * 100).toFixed(0)}%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 capitalize">Trend: {forecast.trend}</p>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Revenue History + {days}-Day Forecast
        </h2>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading chart data...</p>
        ) : (
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full" style={{ minWidth: 400 }}>
              {/* Grid lines */}
              {[0.25, 0.5, 0.75, 1].map(pct => (
                <line key={pct}
                  x1={pad.left} y1={yPos(maxRevenue * pct)}
                  x2={chartWidth - pad.right} y2={yPos(maxRevenue * pct)}
                  stroke="currentColor" strokeOpacity={0.1} strokeWidth={1} />
              ))}
              {/* Confidence band */}
              {confidenceBand && (
                <path d={confidenceBand} fill="hsl(var(--primary))" fillOpacity={0.1} />
              )}
              {/* Historical line */}
              {histPath && (
                <path d={histPath} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} />
              )}
              {/* Forecast line */}
              {forecastPath && (
                <path d={forecastPath} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="4 2" />
              )}
              {/* Y axis labels */}
              {[0, 0.5, 1].map(pct => (
                <text key={pct} x={pad.left - 4} y={yPos(maxRevenue * pct) + 4}
                  textAnchor="end" fontSize={10} fill="currentColor" opacity={0.5}>
                  ${(maxRevenue * pct / 1000).toFixed(0)}k
                </text>
              ))}
            </svg>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-6 bg-muted-foreground" />
                <span>Historical</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-6 bg-primary" style={{ borderTop: '2px dashed' }} />
                <span>Forecast</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-6 rounded opacity-20 bg-primary" />
                <span>Confidence band</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Forecast table */}
      {forecast && forecast.points.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/50">
            <h3 className="font-medium text-sm">Forecast Breakdown (next {Math.min(14, forecast.points.length)} days)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Low</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Projected</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">High</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {forecast.points.slice(0, 14).map(p => (
                  <tr key={p.date} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2">{new Date(p.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">${p.low.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-medium">${p.projected.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">${p.high.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
