/**
 * Color utility functions for consistent icon and sparkline colors
 */

export type IconColorType = 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger' | 'info'

/**
 * Maps iconColor values to their corresponding sparkline hex colors
 * These colors match the Tailwind color palette for consistency
 */
export const SPARKLINE_COLORS: Record<IconColorType, string> = {
  primary: '#3b82f6',    // blue-500
  secondary: '#8b5cf6',  // violet-500
  accent: '#f59e0b',     // amber-500
  success: '#10b981',    // emerald-500
  warning: '#f59e0b',    // amber-500 (same as accent)
  danger: '#ef4444',     // red-500
  info: '#0ea5e9'        // sky-500
}

/**
 * Get the appropriate sparkline color for a given icon color type
 * @param iconColor - The icon color type
 * @returns The hex color string for the sparkline
 */
export function getSparklineColor(iconColor: IconColorType): string {
  return SPARKLINE_COLORS[iconColor]
}
