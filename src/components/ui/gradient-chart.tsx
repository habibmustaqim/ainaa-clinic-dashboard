import React from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Label,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  TooltipProps,
} from 'recharts'
import { cn } from '@/lib/utils'
import {
  GradientColor,
  GradientOrientation,
  generateAllGradients,
  getGradientFill,
  getStrokeColor,
  getPieChartColors,
  getGradientId,
} from '@/lib/gradients'
import {
  CHART_AXIS_STYLE,
  CHART_YAXIS_STYLE,
  CHART_GRID_STYLE,
  CHART_LEGEND_STYLE,
  CHART_SPACING,
  CHART_TYPOGRAPHY,
  CHART_ANIMATION,
} from '@/lib/chartTheme'

// Gradient definitions for charts
export const ChartGradients = () => {
  const verticalGradients = generateAllGradients('vertical')
  const horizontalGradients = generateAllGradients('horizontal')
  const allGradients = [...verticalGradients, ...horizontalGradients]

  return (
    <defs>
      {allGradients.map((gradient) => {
        const isVertical = gradient.orientation === 'vertical'
        return (
          <linearGradient
            key={gradient.id}
            id={gradient.id}
            x1="0"
            y1={isVertical ? '0' : '0'}
            x2={isVertical ? '0' : '1'}
            y2={isVertical ? '1' : '0'}
          >
            <stop offset="0%" stopColor={gradient.fromColor} stopOpacity={1} />
            <stop offset="100%" stopColor={gradient.toColor} stopOpacity={1} />
          </linearGradient>
        )
      })}
    </defs>
  )
}

// Custom Tooltip Component
interface CustomTooltipProps extends TooltipProps<any, any> {
  formatter?: (value: number) => string
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, formatter }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background backdrop-blur-sm border border-border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-foreground mb-2">
          {label}
        </p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">
              {entry.name}:
            </span>
            <span className="font-medium text-foreground">
              {formatter ? formatter(entry.value) : entry.value?.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

// Gradient Area Chart
interface GradientAreaChartProps {
  data: any[]
  dataKey: string
  xAxisKey: string
  height?: number
  color?: GradientColor
  className?: string
  showGrid?: boolean
  animate?: boolean
}

export const GradientAreaChart: React.FC<GradientAreaChartProps> = ({
  data,
  dataKey,
  xAxisKey,
  height = 300,
  color = 'primary',
  className,
  showGrid = true,
  animate = true,
}) => {
  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={CHART_SPACING.defaultMargin}>
          <ChartGradients />
          {showGrid && (
            <CartesianGrid
              {...CHART_GRID_STYLE}
              className="stroke-border"
            />
          )}
          <XAxis
            dataKey={xAxisKey}
            {...CHART_AXIS_STYLE}
          />
          <YAxis
            {...CHART_YAXIS_STYLE}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={getStrokeColor(color)}
            strokeWidth={2}
            fill={getGradientFill(color, 'vertical')}
            animationDuration={animate ? CHART_ANIMATION.duration : 0}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// Gradient Line Chart
interface GradientLineChartProps {
  data: any[]
  lines: Array<{
    dataKey: string
    color: GradientColor
    name?: string
  }>
  xAxisKey: string
  height?: number
  className?: string
  showGrid?: boolean
  animate?: boolean
  showBackground?: boolean
  backgroundGradient?: GradientColor
}

export const GradientLineChart: React.FC<GradientLineChartProps> = ({
  data,
  lines,
  xAxisKey,
  height = 300,
  className,
  showGrid = true,
  animate = true,
  showBackground = false,
  backgroundGradient = 'primary',
}) => {
  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={CHART_SPACING.defaultMargin}>
          <ChartGradients />
          {showGrid && (
            <CartesianGrid
              {...CHART_GRID_STYLE}
              className="stroke-border"
            />
          )}
          <XAxis
            dataKey={xAxisKey}
            {...CHART_AXIS_STYLE}
          />
          <YAxis
            {...CHART_YAXIS_STYLE}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            {...CHART_LEGEND_STYLE}
          />
          {/* Optional gradient background */}
          {showBackground && (
            <defs>
              <linearGradient id="lineChartBackground" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={getStrokeColor(backgroundGradient)} stopOpacity={0.1} />
                <stop offset="100%" stopColor={getStrokeColor(backgroundGradient)} stopOpacity={0} />
              </linearGradient>
            </defs>
          )}
          {lines.map((line, index) => (
            <Line
              key={index}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name || line.dataKey}
              stroke={getStrokeColor(line.color)}
              strokeWidth={2}
              dot={{ r: 3, fill: getStrokeColor(line.color) }}
              activeDot={{ r: 5 }}
              animationDuration={animate ? CHART_ANIMATION.duration : 0}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Gradient Bar Chart
interface GradientBarChartProps {
  data: any[]
  dataKey: string
  xAxisKey: string
  yAxisKey?: string  // For vertical layout (horizontal bars)
  height?: number
  color?: GradientColor
  colors?: string[]  // Custom colors array for each bar
  gradientColors?: GradientColor[]  // Gradient colors for each bar
  useGradient?: boolean  // Whether to use gradient fills for bars
  layout?: 'horizontal' | 'vertical'  // 'horizontal' = vertical bars (default), 'vertical' = horizontal bars
  className?: string
  showGrid?: boolean
  showXAxis?: boolean  // Show/hide X axis
  showYAxis?: boolean  // Show/hide Y axis
  animate?: boolean
  showTooltip?: boolean
  formatter?: (value: number) => string
}

export const GradientBarChart: React.FC<GradientBarChartProps> = ({
  data,
  dataKey,
  xAxisKey,
  yAxisKey,
  height = 300,
  color = 'primary',
  colors,
  gradientColors,
  useGradient = true,
  layout = 'horizontal',
  className,
  showGrid = true,
  showXAxis = true,
  showYAxis = true,
  animate = true,
  showTooltip = true,
  formatter,
}) => {
  const isHorizontalBars = layout === 'vertical'
  const gradientOrientation: GradientOrientation = isHorizontalBars ? 'horizontal' : 'vertical'

  // Generate all gradients if using gradient colors for each bar
  const allGradients = (useGradient && gradientColors) ? generateAllGradients(gradientOrientation) : []

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={CHART_SPACING.defaultMargin}
          layout={layout}
        >
          <ChartGradients />
          {useGradient && gradientColors && (
            <defs>
              {allGradients.map((gradient) => (
                <linearGradient
                  key={gradient.id}
                  id={gradient.id}
                  x1={gradientOrientation === 'horizontal' ? '0' : '0'}
                  y1={gradientOrientation === 'horizontal' ? '0' : '0'}
                  x2={gradientOrientation === 'horizontal' ? '1' : '0'}
                  y2={gradientOrientation === 'horizontal' ? '0' : '1'}
                >
                  <stop offset="0%" stopColor={gradient.fromColor} stopOpacity={1} />
                  <stop offset="100%" stopColor={gradient.toColor} stopOpacity={1} />
                </linearGradient>
              ))}
            </defs>
          )}
          {showGrid && (
            <CartesianGrid
              {...CHART_GRID_STYLE}
              className="stroke-border"
            />
          )}
          {isHorizontalBars ? (
            <>
              <XAxis
                type="number"
                tick={showXAxis}
                axisLine={showXAxis}
                tickLine={showXAxis}
              />
              <YAxis
                type="category"
                dataKey={yAxisKey || xAxisKey}
                tick={showYAxis ? { fill: 'var(--muted-foreground)', fontSize: 10 } : false}
                axisLine={false}
                tickLine={false}
                width={80}
              />
            </>
          ) : (
            <>
              <XAxis
                type="category"
                dataKey={xAxisKey}
                tick={showXAxis}
                axisLine={showXAxis}
                tickLine={showXAxis}
                {...CHART_AXIS_STYLE}
              />
              <YAxis
                type="number"
                tick={showYAxis}
                axisLine={showYAxis}
                tickLine={showYAxis}
                {...CHART_YAXIS_STYLE}
              />
            </>
          )}
          {showTooltip && <Tooltip content={<CustomTooltip formatter={formatter} />} />}
          <Bar
            dataKey={dataKey}
            fill={useGradient && !gradientColors && !colors ? getGradientFill(color, gradientOrientation) : getStrokeColor(color)}
            radius={isHorizontalBars ? [8, 8, 8, 8] : [8, 8, 0, 0]}
            animationDuration={animate ? CHART_ANIMATION.duration : 0}
          >
            {gradientColors ? (
              data.map((entry, index) => {
                const gradientColor = gradientColors[index % gradientColors.length]
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={useGradient ? getGradientFill(gradientColor, gradientOrientation) : getStrokeColor(gradientColor)}
                  />
                )
              })
            ) : colors ? (
              data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))
            ) : null}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Donut Center Label Component
interface DonutCenterLabelProps {
  viewBox?: { cx: number; cy: number }
  totalValue?: string
  totalCount?: string | number
}

const DonutCenterLabel: React.FC<DonutCenterLabelProps> = ({
  viewBox,
  totalValue,
  totalCount
}) => {
  if (!viewBox) return null
  const { cx, cy } = viewBox

  return (
    <g>
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        dominantBaseline="central"
        style={{
          fill: 'var(--foreground)',
          fontWeight: 600,
          fontSize: '24px'
        }}
      >
        {totalValue}
      </text>
      {totalCount && (
        <text
          x={cx}
          y={cy + 18}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fill: 'var(--muted-foreground)',
            fontSize: '12px'
          }}
        >
          {totalCount}
        </text>
      )}
    </g>
  )
}

// Gradient Pie Chart
interface GradientPieChartProps {
  data: Array<{ name: string; value: number; count?: number }>
  height?: number
  className?: string
  animate?: boolean
  showLabel?: boolean
  legendPosition?: 'bottom' | 'right' | 'top' | 'left'
  showLegend?: boolean
  showTooltip?: boolean
  formatter?: (value: number) => string
  useGradient?: boolean  // Whether to use gradient fills for segments
  donutMode?: boolean  // Enable donut chart mode
  innerRadius?: string | number  // Inner radius for donut mode
  paddingAngle?: number  // Spacing between segments
  cornerRadius?: number  // Rounded corners on segments
  centerLabel?: {  // Center label configuration for donut mode
    value: string
    subtitle?: string
  }
}

export const GradientPieChart: React.FC<GradientPieChartProps> = ({
  data,
  height = 300,
  className,
  animate = true,
  showLabel = false,
  legendPosition = 'bottom',
  showLegend = true,
  showTooltip = true,
  formatter,
  useGradient = true,
  donutMode = false,
  innerRadius,
  paddingAngle = 0,
  cornerRadius = 0,
  centerLabel,
}) => {
  const colors = getPieChartColors()

  // Generate all gradients needed for pie chart
  const allGradients = useGradient ? generateAllGradients('vertical') : []

  // Custom tooltip with formatter support, count, and percentage
  const CustomPieTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (!active || !payload || !payload.length) return null

    const item = payload[0]
    const value = item.value as number
    const displayValue = formatter ? formatter(value) : value.toLocaleString()

    // Calculate total value and percentage
    const totalValue = data.reduce((sum, d) => sum + d.value, 0)
    const percentage = ((value / totalValue) * 100).toFixed(1)

    // Get count from payload if available
    const count = item.payload?.count

    return (
      <div className="bg-background backdrop-blur-sm border border-border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-foreground">{item.name}</p>
        <p className="text-sm text-muted-foreground mt-1">{displayValue}</p>
        {count !== undefined && (
          <p className="text-xs text-muted-foreground/80 mt-1">
            {count.toLocaleString()} transactions • {percentage}%
          </p>
        )}
        {count === undefined && (
          <p className="text-xs text-muted-foreground/80 mt-1">
            {percentage}%
          </p>
        )}
      </div>
    )
  }

  // Generate fill colors or gradients
  const getFillForIndex = (index: number): string => {
    if (useGradient) {
      const gradientColor = colors[index % colors.length]
      return getGradientFill(gradientColor, 'vertical')
    } else {
      return getStrokeColor(colors[index % colors.length])
    }
  }

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          {useGradient && (
            <defs>
              {allGradients.map((gradient) => (
                <linearGradient
                  key={gradient.id}
                  id={gradient.id}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={gradient.fromColor} stopOpacity={1} />
                  <stop offset="100%" stopColor={gradient.toColor} stopOpacity={1} />
                </linearGradient>
              ))}
            </defs>
          )}
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={showLabel}
            label={showLabel ? ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%` : false}
            innerRadius={donutMode ? (innerRadius || "60%") : 0}
            outerRadius={donutMode ? "80%" : 80}
            paddingAngle={paddingAngle}
            cornerRadius={cornerRadius}
            fill="#8884d8"
            dataKey="value"
            animationDuration={animate ? CHART_ANIMATION.duration : 0}
          >
            {donutMode && centerLabel && (
              <Label
                content={
                  <DonutCenterLabel
                    totalValue={centerLabel.value}
                    totalCount={centerLabel.subtitle}
                  />
                }
                position="center"
              />
            )}
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getFillForIndex(index)} />
            ))}
          </Pie>
          {showTooltip && <Tooltip content={<CustomPieTooltip />} />}
          {showLegend && (
            <Legend
              verticalAlign={legendPosition === 'bottom' || legendPosition === 'top' ? legendPosition : 'middle'}
              align={legendPosition === 'left' || legendPosition === 'right' ? legendPosition : 'center'}
              height={legendPosition === 'bottom' || legendPosition === 'top' ? CHART_TYPOGRAPHY.legendHeight : undefined}
              wrapperStyle={{
                fontSize: `${CHART_TYPOGRAPHY.legendFontSize}px`,
                paddingTop: legendPosition === 'bottom' ? `${CHART_TYPOGRAPHY.legendPadding}px` : '0'
              }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// Mini Sparkline Chart (for use in cards)
interface SparklineProps {
  data: number[]
  height?: number
  color?: GradientColor
  className?: string
  useGradient?: boolean
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  height = 40,
  color = 'primary',
  className,
  useGradient = true,
}) => {
  const chartData = data.map((value, index) => ({ index, value }))

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          {useGradient && <ChartGradients />}
          <Line
            type="monotone"
            dataKey="value"
            stroke={getStrokeColor(color)}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
