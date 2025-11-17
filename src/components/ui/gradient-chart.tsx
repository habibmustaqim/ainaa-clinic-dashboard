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

// Gradient definitions for charts
export const ChartGradients = () => (
  <defs>
    {/* Primary Gradient */}
    <linearGradient id="gradientPrimary" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="rgb(47, 64, 119)" stopOpacity={0.8} />
      <stop offset="100%" stopColor="rgb(47, 64, 119)" stopOpacity={0.1} />
    </linearGradient>

    {/* Secondary Gradient */}
    <linearGradient id="gradientSecondary" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="rgba(47, 64, 119, 0.7)" stopOpacity={0.8} />
      <stop offset="100%" stopColor="rgba(47, 64, 119, 0.7)" stopOpacity={0.1} />
    </linearGradient>

    {/* Accent Gradient */}
    <linearGradient id="gradientAccent" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="rgba(47, 64, 119, 0.5)" stopOpacity={0.8} />
      <stop offset="100%" stopColor="rgba(47, 64, 119, 0.5)" stopOpacity={0.1} />
    </linearGradient>

    {/* Success Gradient */}
    <linearGradient id="gradientSuccess" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.8} />
      <stop offset="100%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.1} />
    </linearGradient>

    {/* Warning Gradient */}
    <linearGradient id="gradientWarning" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.8} />
      <stop offset="100%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.1} />
    </linearGradient>

    {/* Danger Gradient */}
    <linearGradient id="gradientDanger" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.8} />
      <stop offset="100%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.1} />
    </linearGradient>

    {/* Horizontal Gradients for Bars */}
    <linearGradient id="gradientBarPrimary" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="rgb(47, 64, 119)" stopOpacity={0.9} />
      <stop offset="100%" stopColor="rgba(47, 64, 119, 0.7)" stopOpacity={0.9} />
    </linearGradient>

    <linearGradient id="gradientBarAccent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="rgba(47, 64, 119, 0.6)" stopOpacity={0.9} />
      <stop offset="100%" stopColor="rgb(47, 64, 119)" stopOpacity={0.9} />
    </linearGradient>
  </defs>
)

// Custom Tooltip Component
const CustomTooltip: React.FC<TooltipProps<any, any>> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card p-3 rounded-lg shadow-lg border border-border">
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
              {entry.value?.toLocaleString()}
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
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger'
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
  const gradientMap = {
    primary: 'url(#gradientPrimary)',
    secondary: 'url(#gradientSecondary)',
    accent: 'url(#gradientAccent)',
    success: 'url(#gradientSuccess)',
    warning: 'url(#gradientWarning)',
    danger: 'url(#gradientDanger)',
  }

  const strokeColors = {
    primary: 'rgb(47, 64, 119)',
    secondary: 'rgba(47, 64, 119, 0.7)',
    accent: 'rgba(47, 64, 119, 0.5)',
    success: 'hsl(142, 71%, 45%)',
    warning: 'hsl(38, 92%, 50%)',
    danger: 'hsl(0, 84%, 60%)',
  }

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <ChartGradients />
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-border"
              vertical={false}
            />
          )}
          <XAxis
            dataKey={xAxisKey}
            className="text-xs"
            tick={{ fill: 'hsl(215, 16%, 47%)' }}
            axisLine={{ stroke: 'hsl(214, 32%, 91%)' }}
          />
          <YAxis
            className="text-xs"
            tick={{ fill: 'hsl(215, 16%, 47%)' }}
            axisLine={{ stroke: 'hsl(214, 32%, 91%)' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={strokeColors[color]}
            strokeWidth={2}
            fill={gradientMap[color]}
            animationDuration={animate ? 1000 : 0}
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
    color: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger'
    name?: string
  }>
  xAxisKey: string
  height?: number
  className?: string
  showGrid?: boolean
  animate?: boolean
}

export const GradientLineChart: React.FC<GradientLineChartProps> = ({
  data,
  lines,
  xAxisKey,
  height = 300,
  className,
  showGrid = true,
  animate = true,
}) => {
  const strokeColors = {
    primary: 'rgb(47, 64, 119)',
    secondary: 'rgba(47, 64, 119, 0.7)',
    accent: 'rgba(47, 64, 119, 0.5)',
    success: 'hsl(142, 71%, 45%)',
    warning: 'hsl(38, 92%, 50%)',
    danger: 'hsl(0, 84%, 60%)',
  }

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-border"
              vertical={false}
            />
          )}
          <XAxis
            dataKey={xAxisKey}
            className="text-xs"
            tick={{ fill: 'hsl(215, 16%, 47%)' }}
            axisLine={{ stroke: 'hsl(214, 32%, 91%)' }}
          />
          <YAxis
            className="text-xs"
            tick={{ fill: 'hsl(215, 16%, 47%)' }}
            axisLine={{ stroke: 'hsl(214, 32%, 91%)' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            iconType="line"
          />
          {lines.map((line, index) => (
            <Line
              key={index}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name || line.dataKey}
              stroke={strokeColors[line.color]}
              strokeWidth={2}
              dot={{ r: 3, fill: strokeColors[line.color] }}
              activeDot={{ r: 5 }}
              animationDuration={animate ? 1000 : 0}
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
  height?: number
  color?: 'primary' | 'accent'
  className?: string
  showGrid?: boolean
  animate?: boolean
}

export const GradientBarChart: React.FC<GradientBarChartProps> = ({
  data,
  dataKey,
  xAxisKey,
  height = 300,
  color = 'primary',
  className,
  showGrid = true,
  animate = true,
}) => {
  const gradientMap = {
    primary: 'url(#gradientBarPrimary)',
    accent: 'url(#gradientBarAccent)',
  }

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <ChartGradients />
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-border"
              vertical={false}
            />
          )}
          <XAxis
            dataKey={xAxisKey}
            className="text-xs"
            tick={{ fill: 'hsl(215, 16%, 47%)' }}
            axisLine={{ stroke: 'hsl(214, 32%, 91%)' }}
          />
          <YAxis
            className="text-xs"
            tick={{ fill: 'hsl(215, 16%, 47%)' }}
            axisLine={{ stroke: 'hsl(214, 32%, 91%)' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey={dataKey}
            fill={gradientMap[color]}
            radius={[8, 8, 0, 0]}
            animationDuration={animate ? 1000 : 0}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Gradient Pie Chart
interface GradientPieChartProps {
  data: Array<{ name: string; value: number }>
  height?: number
  className?: string
  animate?: boolean
}

export const GradientPieChart: React.FC<GradientPieChartProps> = ({
  data,
  height = 300,
  className,
  animate = true,
}) => {
  const colors = [
    'rgb(47, 64, 119)',            // Primary
    'rgba(47, 64, 119, 0.8)',      // Primary 80%
    'rgba(47, 64, 119, 0.6)',      // Primary 60%
    'hsl(142, 71%, 45%)',          // Success (green)
    'hsl(38, 92%, 50%)',           // Warning (amber)
    'hsl(0, 84%, 60%)',            // Danger (red)
    'rgba(47, 64, 119, 0.4)',      // Primary 40%
    'hsl(43, 74%, 66%)',           // Yellow
  ]

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            animationDuration={animate ? 1000 : 0}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// Mini Sparkline Chart (for use in cards)
interface SparklineProps {
  data: number[]
  height?: number
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger'
  className?: string
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  height = 40,
  color = 'primary',
  className,
}) => {
  const chartData = data.map((value, index) => ({ index, value }))

  const strokeColors = {
    primary: 'rgb(47, 64, 119)',
    secondary: 'rgba(47, 64, 119, 0.7)',
    accent: 'rgba(47, 64, 119, 0.5)',
    success: 'hsl(142, 71%, 45%)',
    warning: 'hsl(38, 92%, 50%)',
    danger: 'hsl(0, 84%, 60%)',
  }

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={strokeColors[color]}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}