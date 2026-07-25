import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn, formatCurrency } from '../../lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  format?: 'currency' | 'number' | 'percent' | 'text'
  change?: number
  changePeriod?: string
  icon: LucideIcon
  iconColor?: string
  description?: string
  sparkline?: number[]
  sparkColor?: string
  className?: string
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 88
  const h = 36
  const toY = (v: number) => h - ((v - min) / range) * (h - 6) - 3
  const pts = data.map((v, i) => ({ x: (i / (data.length - 1)) * w, y: toY(v) }))
  const linePts = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = [
    `M${pts[0].x.toFixed(1)},${h}`,
    ...pts.map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    `L${pts[pts.length - 1].x.toFixed(1)},${h}`,
    'Z',
  ].join(' ')
  const gradId = `sg-${color.replace('#', '')}`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <polyline points={linePts} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Endpoint dot */}
      <circle
        cx={pts[pts.length - 1].x}
        cy={pts[pts.length - 1].y}
        r="2.5"
        fill={color}
        stroke="transparent"
      />
    </svg>
  )
}

export function StatCard({
  title,
  value,
  format = 'text',
  change,
  changePeriod = 'vs last month',
  icon: Icon,
  iconColor = 'text-primary',
  description,
  sparkline,
  sparkColor = '#06b6d4',
  className,
}: StatCardProps) {
  const formattedValue = () => {
    if (format === 'currency') return formatCurrency(Number(value))
    if (format === 'number') return Number(value).toLocaleString()
    if (format === 'percent') return `${value}%`
    return String(value)
  }

  const trend = change === undefined ? null : change > 0 ? 'up' : change < 0 ? 'down' : 'flat'

  return (
    <div
      className={cn('relative overflow-hidden rounded-xl border p-5 flex flex-col gap-3 transition-shadow duration-300 hover:shadow-cyan-sm', className)}
      style={{
        background: 'hsl(var(--card))',
        borderColor: 'hsl(var(--border))',
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-foreground tabular">{formattedValue()}</p>
        </div>
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg shrink-0 bg-current/10', iconColor)}>
          <Icon className={cn('h-4.5 w-4.5', iconColor)} />
        </div>
      </div>

      {/* Sparkline */}
      {sparkline && sparkline.length > 1 && (
        <div className="overflow-hidden">
          <Sparkline data={sparkline} color={sparkColor} />
        </div>
      )}

      {/* Footer */}
      {(change !== undefined || description) && (
        <div className="flex items-center gap-2">
          {change !== undefined && (
            <div className={cn(
              'flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
              trend === 'up'
                ? 'bg-emerald-500/15 text-emerald-400'
                : trend === 'down'
                ? 'bg-red-500/15 text-red-400'
                : 'bg-muted text-muted-foreground',
            )}>
              {trend === 'up' && <TrendingUp className="h-3 w-3" />}
              {trend === 'down' && <TrendingDown className="h-3 w-3" />}
              {trend === 'flat' && <Minus className="h-3 w-3" />}
              {Math.abs(change)}%
            </div>
          )}
          <span className="text-[11px] text-muted-foreground">{description ?? changePeriod}</span>
        </div>
      )}

      {/* Subtle corner accent */}
      <div
        className="pointer-events-none absolute right-0 top-0 h-20 w-20 opacity-[0.03]"
        style={{ background: `radial-gradient(circle at top right, ${sparkColor}, transparent 70%)` }}
      />
    </div>
  )
}
