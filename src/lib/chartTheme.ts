/**
 * Chart Theme Configuration
 *
 * Centralized styling constants for all chart components.
 * Ensures consistent appearance across the dashboard.
 */

import { gradientColorMap, getChartColorPalette } from './gradients'

/**
 * Chart colors using CSS variables (theme-aware)
 */
export const chartColors = {
  primary: 'var(--gradient-primary-from)',
  secondary: 'var(--gradient-secondary-from)',
  accent: 'var(--gradient-accent-from)',
  success: 'var(--gradient-success-from)',
  warning: 'var(--gradient-warning-from)',
  danger: 'var(--gradient-danger-from)',
  info: 'var(--gradient-info-from)',
  teal: 'var(--gradient-teal-from)',
  purple: 'var(--gradient-purple-from)',
  rose: 'var(--gradient-rose-from)',
  // Legacy aliases
  blue: 'var(--gradient-primary-from)',
  green: 'var(--gradient-success-from)',
  yellow: 'var(--gradient-warning-from)',
  red: 'var(--gradient-danger-from)',
  pink: 'var(--gradient-rose-from)',
  indigo: 'var(--gradient-accent-from)',
  orange: 'var(--gradient-warning-from)',
}

/**
 * Typography settings for charts
 */
export const CHART_TYPOGRAPHY = {
  // Legend
  legendFontSize: 12,
  legendFontWeight: 400,
  legendIconSize: 14,
  legendPadding: 10,
  legendHeight: 36,

  // Axis labels
  axisFontSize: 12,
  axisFontWeight: 400,

  // Tooltip
  tooltipTitleSize: 14,
  tooltipValueSize: 12,
  tooltipSecondarySize: 10,
  tooltipFontWeight: 500,
}

/**
 * Spacing and layout settings
 */
export const CHART_SPACING = {
  // Default chart margins
  defaultMargin: {
    top: 10,
    right: 10,
    left: 0,
    bottom: 0,
  },

  // Chart with legend at bottom
  marginWithBottomLegend: {
    top: 10,
    right: 10,
    left: 0,
    bottom: 40,
  },

  // Padding
  chartPadding: 16,
  cardPadding: 24,
}

/**
 * Color settings for chart elements
 */
export const CHART_COLORS = {
  // Axis
  axisLine: 'var(--chart-axis-line)',
  axisTick: 'var(--chart-axis-tick)',

  // Grid
  grid: 'var(--chart-grid)',
  gridStrokeDasharray: '3 3',

  // Tooltip
  tooltipBackground: 'var(--background)',
  tooltipBorder: 'var(--border)',
  tooltipForeground: 'var(--foreground)',
  tooltipMuted: 'var(--muted-foreground)',
}

/**
 * Standardized XAxis configuration
 */
export const CHART_AXIS_STYLE = {
  className: 'text-xs',
  tick: { fill: CHART_COLORS.axisTick, fontSize: CHART_TYPOGRAPHY.axisFontSize },
  axisLine: { stroke: CHART_COLORS.axisLine },
  tickLine: { stroke: CHART_COLORS.axisLine },
}

/**
 * Standardized YAxis configuration
 */
export const CHART_YAXIS_STYLE = {
  ...CHART_AXIS_STYLE,
}

/**
 * Standardized CartesianGrid configuration
 */
export const CHART_GRID_STYLE = {
  strokeDasharray: CHART_COLORS.gridStrokeDasharray,
  stroke: CHART_COLORS.grid,
  vertical: false,
}

/**
 * Standardized Legend configuration
 */
export const CHART_LEGEND_STYLE = {
  wrapperStyle: {
    fontSize: `${CHART_TYPOGRAPHY.legendFontSize}px`,
    paddingTop: `${CHART_TYPOGRAPHY.legendPadding}px`,
  },
  iconType: 'line' as const,
  iconSize: CHART_TYPOGRAPHY.legendIconSize,
}

/**
 * Standardized Tooltip wrapper style
 */
export const CHART_TOOLTIP_WRAPPER_STYLE = {
  background: CHART_COLORS.tooltipBackground,
  border: `1px solid ${CHART_COLORS.tooltipBorder}`,
  borderRadius: '8px',
  padding: '12px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
}

/**
 * Chart configuration with color palette
 */
export const chartConfig = {
  colors: getChartColorPalette(),
  typography: CHART_TYPOGRAPHY,
  spacing: CHART_SPACING,
  chartColors: CHART_COLORS,
}

/**
 * Get theme-aware color by name
 */
export const getChartColor = (colorName: keyof typeof chartColors): string => {
  return chartColors[colorName]
}

/**
 * Animation duration settings
 */
export const CHART_ANIMATION = {
  duration: 1000,
  easing: 'ease-out' as const,
}

/**
 * Default chart heights
 */
export const CHART_HEIGHTS = {
  small: 200,
  medium: 300,
  large: 400,
  sparkline: 40,
}
