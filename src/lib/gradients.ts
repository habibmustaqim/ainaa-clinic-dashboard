/**
 * Centralized Gradient System
 *
 * This file provides theme-aware gradient definitions for all chart components.
 * Uses concrete color values that match the CSS variables defined in index.css.
 */

export type GradientColor =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'teal'
  | 'purple'
  | 'rose'

export type GradientOrientation = 'vertical' | 'horizontal'

/**
 * Gradient configuration for a specific color
 */
export interface GradientConfig {
  id: string
  fromColor: string
  toColor: string
  orientation: GradientOrientation
}

/**
 * Static color map - matches CSS variables from index.css
 * These are concrete color values for use in SVG gradients
 */
const colorMap = {
  primary: {
    from: 'rgb(47, 64, 119)',
    to: 'rgba(47, 64, 119, 0.5)',
  },
  secondary: {
    from: 'rgb(139, 92, 246)',
    to: 'rgba(139, 92, 246, 0.5)',
  },
  accent: {
    from: 'rgb(59, 130, 246)',
    to: 'rgba(59, 130, 246, 0.5)',
  },
  success: {
    from: 'rgb(16, 185, 129)',
    to: 'rgba(16, 185, 129, 0.5)',
  },
  warning: {
    from: 'rgb(245, 158, 11)',
    to: 'rgba(245, 158, 11, 0.5)',
  },
  danger: {
    from: 'rgb(231, 0, 11)',
    to: 'rgba(231, 0, 11, 0.5)',
  },
  info: {
    from: 'rgb(14, 165, 233)',
    to: 'rgba(14, 165, 233, 0.5)',
  },
  teal: {
    from: 'rgb(20, 184, 166)',
    to: 'rgba(20, 184, 166, 0.5)',
  },
  purple: {
    from: 'rgb(139, 92, 246)',
    to: 'rgba(139, 92, 246, 0.5)',
  },
  rose: {
    from: 'rgb(244, 63, 94)',
    to: 'rgba(244, 63, 94, 0.5)',
  },
}

/**
 * Generate gradient ID for SVG
 */
export const getGradientId = (color: GradientColor, orientation: GradientOrientation = 'vertical'): string => {
  return `gradient-${color}-${orientation}`
}

/**
 * Get gradient colors from static color map
 */
export const getGradientColors = (color: GradientColor): { from: string; to: string } => {
  return colorMap[color]
}

/**
 * Generate gradient configuration for a specific color and orientation
 */
export const generateGradient = (
  color: GradientColor,
  orientation: GradientOrientation = 'vertical'
): GradientConfig => {
  const colors = getGradientColors(color)

  return {
    id: getGradientId(color, orientation),
    fromColor: colors.from,
    toColor: colors.to,
    orientation
  }
}

/**
 * Generate all gradient configurations for charts
 */
export const generateAllGradients = (
  orientation: GradientOrientation = 'vertical'
): GradientConfig[] => {
  const colors: GradientColor[] = [
    'primary',
    'secondary',
    'accent',
    'success',
    'warning',
    'danger',
    'info',
    'teal',
    'purple',
    'rose'
  ]

  return colors.map(color => generateGradient(color, orientation))
}

/**
 * Get fill URL for Recharts (references SVG gradient by ID)
 */
export const getGradientFill = (
  color: GradientColor,
  orientation: GradientOrientation = 'vertical'
): string => {
  return `url(#${getGradientId(color, orientation)})`
}

/**
 * Get stroke color (solid color for line strokes, borders, etc.)
 */
export const getStrokeColor = (color: GradientColor): string => {
  return colorMap[color].from
}

/**
 * Color mapping for gradients (used in components that need direct color references)
 */
export const gradientColorMap: Record<GradientColor, string> = {
  primary: colorMap.primary.from,
  secondary: colorMap.secondary.from,
  accent: colorMap.accent.from,
  success: colorMap.success.from,
  warning: colorMap.warning.from,
  danger: colorMap.danger.from,
  info: colorMap.info.from,
  teal: colorMap.teal.from,
  purple: colorMap.purple.from,
  rose: colorMap.rose.from,
}

/**
 * Get multiple colors for pie charts or multi-series charts
 * Returns an array of gradient "from" colors
 */
export const getChartColorPalette = (): string[] => {
  const colors: GradientColor[] = [
    'primary',
    'teal',
    'purple',
    'success',
    'warning',
    'rose',
    'danger',
    'info',
    'secondary',
    'accent'
  ]

  return colors.map(color => gradientColorMap[color])
}

/**
 * Get colors specifically for pie chart segments with gradients
 */
export const getPieChartColors = (): GradientColor[] => {
  return [
    'primary',
    'teal',
    'purple',
    'success',
    'warning',
    'rose',
    'danger',
    'info'
  ]
}
