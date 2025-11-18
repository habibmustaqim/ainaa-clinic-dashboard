import React from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { DualTrend } from './dual-trend'
import { motion } from 'framer-motion'

export interface BentoCardProps {
  className?: string
  children?: React.ReactNode
  onClick?: () => void

  // Header props
  title?: string
  subtitle?: string
  icon?: LucideIcon
  iconColor?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger' | 'info'
  headerAction?: React.ReactNode

  // Style variants
  variant?: 'default' | 'gradient' | 'glass' | 'outlined' | 'filled'
  size?: 'sm' | 'md' | 'lg' | 'xl'

  // Grid span
  colSpan?: 1 | 2 | 3 | 4
  rowSpan?: 1 | 2 | 3 | 4

  // Loading state
  loading?: boolean
}

const sizeClasses = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-10',
}

const iconColorClasses = {
  primary: 'text-primary bg-primary/10 dark:text-primary dark:bg-primary/20',
  secondary: 'text-secondary bg-secondary/10 dark:text-secondary dark:bg-secondary/20',
  accent: 'text-accent bg-accent/10 dark:text-accent dark:bg-accent/20',
  success: 'text-success bg-success/10 dark:text-success dark:bg-success/20',
  warning: 'text-warning bg-warning/10 dark:text-warning dark:bg-warning/20',
  danger: 'text-destructive bg-destructive/10 dark:text-destructive dark:bg-destructive/20',
  info: 'text-info bg-info/10 dark:text-info dark:bg-info/20',
}

const gridSpanClasses = {
  col: {
    1: 'md:col-span-1',
    2: 'md:col-span-2',
    3: 'md:col-span-3',
    4: 'md:col-span-4',
  },
  row: {
    1: 'md:row-span-1',
    2: 'md:row-span-2',
    3: 'md:row-span-3',
    4: 'md:row-span-4',
  },
}

export const BentoCard = React.forwardRef<HTMLDivElement, BentoCardProps>(
  ({
    className,
    children,
    onClick,
    title,
    subtitle,
    icon: Icon,
    iconColor = 'primary',
    headerAction,
    variant = 'default',
    size = 'md',
    colSpan = 1,
    rowSpan = 1,
    loading,
    ...props
  }, ref) => {
    const variantClasses = {
      default: 'bg-card border border-border shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_-4px_6px_-1px_rgba(0,0,0,0.1)] hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_-10px_15px_-3px_rgba(0,0,0,0.1)]',
      gradient: 'gradient-border bg-card shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_-4px_6px_-1px_rgba(0,0,0,0.1)] hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_-10px_15px_-3px_rgba(0,0,0,0.1)]',
      glass: 'glass border-border/50 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_-4px_6px_-1px_rgba(0,0,0,0.1)] hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_-10px_15px_-3px_rgba(0,0,0,0.1)]',
      outlined: 'bg-transparent border-2 border-border hover:border-primary/60 shadow-[0_1px_2px_0_rgba(0,0,0,0.05),0_-1px_2px_0_rgba(0,0,0,0.05)] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_-4px_6px_-1px_rgba(0,0,0,0.1)]',
      filled: 'bg-card dark:bg-card border-0 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_-4px_6px_-1px_rgba(0,0,0,0.1)] hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_-10px_15px_-3px_rgba(0,0,0,0.1)]',
    }

    const baseClasses = cn(
      'rounded-xl transition-all duration-300 group relative overflow-hidden',
      sizeClasses[size],
      variantClasses[variant],
      gridSpanClasses.col[colSpan],
      gridSpanClasses.row[rowSpan],
      onClick && 'cursor-pointer',
      className
    )

    return (
      <div
        ref={ref}
        className={baseClasses}
        onClick={onClick}
        {...props}
      >
        {/* Subtle hover effect for gradient variant */}
        {variant === 'gradient' && (
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        )}

        {/* Header Section */}
        {(Icon || title || subtitle || headerAction) && (
          subtitle ? (
            // Card-style layout with subtitle (original layout)
            <div className="flex items-start gap-4 mb-4">
              {Icon && (
                <div className={cn(
                  'p-3 rounded-lg shrink-0',
                  iconColorClasses[iconColor]
                )}>
                  <Icon className="w-5 h-5" />
                </div>
              )}

              {(title || subtitle) && (
                <div className="flex-1 min-w-0">
                  {title && (
                    <h3 className="font-semibold text-foreground text-lg leading-tight mb-1">
                      {title}
                    </h3>
                  )}
                  {subtitle && (
                    <p className="text-sm text-muted-foreground">
                      {subtitle}
                    </p>
                  )}
                </div>
              )}

              {headerAction && (
                <div className="ml-auto shrink-0">
                  {headerAction}
                </div>
              )}
            </div>
          ) : (
            // Inline layout without subtitle (StatCard style)
            <div className="flex items-center gap-2 mb-4">
              {Icon && (
                <Icon className={cn('w-5 h-5', iconColorClasses[iconColor])} />
              )}
              {title && (
                <h3 className="text-lg font-semibold text-foreground">
                  {title}
                </h3>
              )}
              {headerAction && (
                <div className="ml-auto shrink-0">
                  {headerAction}
                </div>
              )}
            </div>
          )
        )}

        {/* Content */}
        <div className="relative">
          {children}
        </div>
      </div>
    )
  }
)

BentoCard.displayName = 'BentoCard'

// Bento Grid Container
export interface BentoGridProps {
  children: React.ReactNode
  className?: string
  cols?: 1 | 2 | 3 | 4 | 5 | 6
  gap?: 'sm' | 'md' | 'lg' | 'xl'
}

const gapClasses = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
}

const colClasses = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
  6: 'md:grid-cols-6',
}

export const BentoGrid: React.FC<BentoGridProps> = ({
  children,
  className,
  cols = 4,
  gap = 'md',
}) => {
  return (
    <div
      className={cn(
        'grid grid-cols-1 auto-rows-auto',
        colClasses[cols],
        gapClasses[gap],
        className
      )}
    >
      {children}
    </div>
  )
}

// Smooth Line Trend Component using Monotone Cubic Spline Interpolation
interface LineTrendProps {
  data: number[]
  color?: string
  height?: number
}

const LineTrend: React.FC<LineTrendProps> = ({ data, color = 'currentColor', height = 32 }) => {
  if (!data || data.length === 0) return null

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  // Normalize data to 0-1 range
  const normalize = (value: number) => ((value - min) / range)

  // SVG dimensions
  const viewBoxWidth = 100
  const viewBoxHeight = 100
  const padding = 5

  // Calculate positions
  const getX = (index: number) => {
    const totalWidth = viewBoxWidth - (padding * 2)
    const pointWidth = totalWidth / (data.length - 1 || 1)
    return padding + (index * pointWidth)
  }

  const getY = (value: number) => {
    const normalizedValue = normalize(value)
    const availableHeight = viewBoxHeight - (padding * 2)
    return viewBoxHeight - padding - (normalizedValue * availableHeight)
  }

  // Generate smooth path using Monotone Cubic Spline Interpolation
  const generateSmoothPath = () => {
    const points = data.map((value, index) => ({
      x: getX(index),
      y: getY(value)
    }))

    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y}`
    }

    if (points.length === 2) {
      return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
    }

    // Calculate slopes for monotone cubic interpolation
    const n = points.length
    const slopes: number[] = []
    const tangents: number[] = []

    // Step 1: Calculate secant slopes
    for (let i = 0; i < n - 1; i++) {
      const dx = points[i + 1].x - points[i].x
      const dy = points[i + 1].y - points[i].y
      slopes[i] = dy / dx
    }

    // Step 2: Calculate tangents
    tangents[0] = slopes[0]

    for (let i = 1; i < n - 1; i++) {
      const m0 = slopes[i - 1]
      const m1 = slopes[i]

      if (m0 * m1 <= 0) {
        tangents[i] = 0
      } else {
        const dx0 = points[i].x - points[i - 1].x
        const dx1 = points[i + 1].x - points[i].x
        const common = dx0 + dx1
        tangents[i] = 3 * common / ((common + dx1) / m0 + (common + dx0) / m1)
      }
    }

    tangents[n - 1] = slopes[n - 2]

    // Step 3: Build smooth path using cubic Bézier curves
    let path = `M ${points[0].x} ${points[0].y}`

    for (let i = 0; i < n - 1; i++) {
      const p0 = points[i]
      const p1 = points[i + 1]
      const m0 = tangents[i]
      const m1 = tangents[i + 1]

      const dx = (p1.x - p0.x) / 3
      const cp1x = p0.x + dx
      const cp1y = p0.y + dx * m0
      const cp2x = p1.x - dx
      const cp2y = p1.y - dx * m1

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`
    }

    return path
  }

  const smoothPath = generateSmoothPath()

  return (
    <svg
      className="w-full"
      style={{ height: `${height}px` }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <motion.path
        d={smoothPath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className="opacity-80"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.8 }}
        transition={{
          pathLength: { duration: 1.2, ease: "easeInOut" },
          opacity: { duration: 0.3 }
        }}
        key={smoothPath}
      />
    </svg>
  )
}

// CountUp Animation Component
interface CountUpProps {
  value: string | number
  duration?: number
}

const CountUp: React.FC<CountUpProps> = ({ value, duration = 1.5 }) => {
  const [displayValue, setDisplayValue] = React.useState<string | number>(0)
  const previousValueRef = React.useRef<number>(0)

  React.useEffect(() => {
    // Handle string values (like currency with RM prefix)
    const isString = typeof value === 'string'
    const numericValue = isString ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value

    if (isNaN(numericValue)) {
      setDisplayValue(value)
      return
    }

    const startTime = Date.now()
    // Start from previous value for smooth transitions
    const startValue = previousValueRef.current

    const animate = () => {
      const now = Date.now()
      const progress = Math.min((now - startTime) / (duration * 1000), 1)

      // Easing function (easeOutExpo)
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)

      const currentValue = startValue + (numericValue - startValue) * easeProgress

      // Format the value
      if (isString) {
        // Detect if the original value has decimals or currency symbols
        const prefix = value.toString().match(/^[^\d]*/)?.[0] || ''
        const hasDecimalInOriginal = value.toString().includes('.')
        const hasCurrencySymbol = /RM|MYR|\$|€|£/.test(value.toString())

        // Use decimals only for currency values or values that already have decimals
        const useDecimals = hasDecimalInOriginal || hasCurrencySymbol

        const formatted = new Intl.NumberFormat('en-MY', {
          minimumFractionDigits: useDecimals ? 2 : 0,
          maximumFractionDigits: useDecimals ? 2 : 0
        }).format(currentValue)
        setDisplayValue(prefix + formatted)
      } else {
        setDisplayValue(Math.round(currentValue))
      }

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        // Update ref with final value for next animation
        previousValueRef.current = numericValue
      }
    }

    requestAnimationFrame(animate)
  }, [value, duration])

  return <>{displayValue}</>
}

// Stat Card Component (for displaying metrics)
export interface StatCardProps extends BentoCardProps {
  value: string | number
  change?: number
  changeLabel?: string
  trend?: 'up' | 'down' | 'neutral'
  sparkline?: number[]
  previousSparkline?: number[] // Previous period data for comparison
  sparklineColor?: string // Custom color for current period line
  trendType?: 'bar' | 'line' | 'custom' // New prop to specify trend visualization type
  customSparkline?: React.ReactNode // Custom sparkline component
}

export const StatCard: React.FC<StatCardProps> = ({
  value,
  change,
  changeLabel,
  trend,
  sparkline,
  previousSparkline,
  sparklineColor,
  trendType = 'line', // Default to line trend
  customSparkline,
  title,
  icon: Icon,
  iconColor,
  ...props
}) => {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600 dark:text-green-400'
    if (trend === 'down') return 'text-red-600 dark:text-red-400'
    return 'text-muted-foreground'
  }

  const getLineColor = () => {
    if (trend === 'up') return '#10b981' // green-500
    if (trend === 'down') return '#ef4444' // red-500
    return 'hsl(var(--primary))' // primary color
  }

  // Import iconColorClasses from BentoCard
  const iconColorClasses = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    accent: 'text-accent',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-destructive',
    info: 'text-info',
  }

  return (
    <BentoCard {...props} title={undefined} icon={undefined} iconColor={undefined}>
      <div className="space-y-4">
        {/* Inline Icon + Title Header */}
        {(Icon || title) && (
          <div className="flex items-center gap-2">
            {Icon && (
              <Icon className={cn('w-5 h-5', iconColor && iconColorClasses[iconColor])} />
            )}
            {title && (
              <h3 className="text-lg font-semibold text-foreground">
                {title}
              </h3>
            )}
          </div>
        )}

        {/* Value Section */}
        <div className="text-2xl font-bold text-foreground tracking-tight">
          <CountUp value={value} duration={1.5} />
        </div>

        {/* Change Label with Badge */}
        {changeLabel && change !== undefined && change !== null && (
          <div className="flex items-center gap-2">
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
              trend === 'up' && 'bg-green-500/15 text-success',
              trend === 'down' && 'bg-red-500/15 text-destructive',
              trend === 'neutral' && 'bg-muted text-muted-foreground'
            )}>
              {trend === 'up' && <TrendingUp className="w-3 h-3" />}
              {trend === 'down' && <TrendingDown className="w-3 h-3" />}
              <span>
                {change > 0 ? '+' : ''}{change.toFixed(1)}%
              </span>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {changeLabel}
            </span>
          </div>
        )}

        {/* Trend Visualization */}
        {trendType === 'custom' && customSparkline ? (
          <div className="h-12 -mx-2">
            {customSparkline}
          </div>
        ) : sparkline && sparkline.length > 0 && (
          <div className="h-12 -mx-2">
            {trendType === 'line' ? (
              previousSparkline && previousSparkline.length > 0 ? (
                <DualTrend
                  previousData={previousSparkline}
                  currentData={sparkline}
                  color={sparklineColor || getLineColor()}
                  previousColor="#9ca3af"
                  height={48}
                />
              ) : (
                <LineTrend data={sparkline} color={sparklineColor || getLineColor()} height={48} />
              )
            ) : (
              <div className="h-full flex items-end gap-1">
                {sparkline.map((val, i) => {
                  const height = `${(val / Math.max(...sparkline)) * 100}%`
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-primary rounded-sm opacity-80 hover:opacity-100 transition-opacity"
                      style={{ height }}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </BentoCard>
  )
}

// Action Card Component (for quick actions)
export interface ActionCardProps extends BentoCardProps {
  action?: () => void
  actionLabel?: string
}

export const ActionCard: React.FC<ActionCardProps> = ({
  children,
  action,
  actionLabel,
  ...props
}) => {
  return (
    <BentoCard {...props} onClick={action}>
      {children}
      {actionLabel && (
        <div className="mt-4 flex items-center gap-2 text-sm font-medium text-primary dark:text-primary group-hover:gap-3 transition-all">
          <span>{actionLabel}</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </BentoCard>
  )
}