import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn, formatCurrency } from '../../lib/utils'
import { Card, CardContent } from '../ui/card'

interface StatCardProps {
  title: string
  value: string | number
  format?: 'currency' | 'number' | 'percent' | 'text'
  change?: number
  changePeriod?: string
  icon: LucideIcon
  iconColor?: string
  description?: string
  className?: string
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
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{formattedValue()}</p>
          </div>
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-full bg-current/10', iconColor)}>
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
        </div>

        {(change !== undefined || description) && (
          <div className="mt-3 flex items-center gap-2">
            {change !== undefined && (
              <div className={cn(
                'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                trend === 'up' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                trend === 'down' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                'bg-muted text-muted-foreground',
              )}>
                {trend === 'up' && <TrendingUp className="h-3 w-3" />}
                {trend === 'down' && <TrendingDown className="h-3 w-3" />}
                {trend === 'flat' && <Minus className="h-3 w-3" />}
                {Math.abs(change)}%
              </div>
            )}
            <span className="text-xs text-muted-foreground">{changePeriod}</span>
          </div>
        )}

        {description && (
          <p className="mt-2 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}
