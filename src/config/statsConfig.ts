/**
 * Global configuration for stat cards
 * Ensures consistent icons and colors across all pages
 */

import {
  Users,
  DollarSign,
  ShoppingBag,
  Syringe,
  Activity,
  Clock,
  TrendingUp,
  Award,
  Heart,
  CreditCard,
  Calendar,
  Target
} from 'lucide-react'
import { getSparklineColor, type IconColorType } from '@/utils/colors'
import type { LucideIcon } from 'lucide-react'

export interface StatConfig {
  iconColor: IconColorType
  sparklineColor: string
  icon: LucideIcon
}

/**
 * Standard stat card configurations for common metrics
 * Use these to maintain consistency across the application
 */
export const STAT_CONFIGS = {
  // Position 1: Primary stats (Blue)
  customers: {
    iconColor: 'primary' as IconColorType,
    sparklineColor: getSparklineColor('primary'),
    icon: Users
  },
  visits: {
    iconColor: 'primary' as IconColorType,
    sparklineColor: getSparklineColor('primary'),
    icon: Activity
  },

  // Position 2: Success/Revenue stats (Green)
  revenue: {
    iconColor: 'success' as IconColorType,
    sparklineColor: getSparklineColor('success'),
    icon: DollarSign
  },
  lifetime: {
    iconColor: 'success' as IconColorType,
    sparklineColor: getSparklineColor('success'),
    icon: Award
  },

  // Position 3: Secondary/Transaction stats (Violet)
  transactions: {
    iconColor: 'secondary' as IconColorType,
    sparklineColor: getSparklineColor('secondary'),
    icon: ShoppingBag
  },
  payments: {
    iconColor: 'secondary' as IconColorType,
    sparklineColor: getSparklineColor('secondary'),
    icon: CreditCard
  },

  // Position 4: Accent/Treatment stats (Amber)
  treatments: {
    iconColor: 'accent' as IconColorType,
    sparklineColor: getSparklineColor('accent'),
    icon: Syringe
  },
  loyalty: {
    iconColor: 'accent' as IconColorType,
    sparklineColor: getSparklineColor('accent'),
    icon: Clock
  },

  // Additional stat types
  growth: {
    iconColor: 'info' as IconColorType,
    sparklineColor: getSparklineColor('info'),
    icon: TrendingUp
  },
  health: {
    iconColor: 'warning' as IconColorType,
    sparklineColor: getSparklineColor('warning'),
    icon: Heart
  },
  schedule: {
    iconColor: 'info' as IconColorType,
    sparklineColor: getSparklineColor('info'),
    icon: Calendar
  },
  goals: {
    iconColor: 'warning' as IconColorType,
    sparklineColor: getSparklineColor('warning'),
    icon: Target
  }
} as const

/**
 * Get stat configuration by key
 * @param key - The stat type key
 * @returns StatConfig object with icon, iconColor, and sparklineColor
 */
export function getStatConfig(key: keyof typeof STAT_CONFIGS): StatConfig {
  return STAT_CONFIGS[key]
}

/**
 * Standard 4-stat layout for main dashboard pages
 * Position 1: Primary (Blue) - Customer/User metrics
 * Position 2: Success (Green) - Revenue/Value metrics
 * Position 3: Secondary (Violet) - Transaction/Action metrics
 * Position 4: Accent (Amber) - Treatment/Service metrics
 */
export const MAIN_STATS_ORDER = {
  position1: 'primary' as IconColorType,   // Blue - Customers, Visits
  position2: 'success' as IconColorType,   // Green - Revenue, Lifetime Value
  position3: 'secondary' as IconColorType, // Violet - Transactions, Payments
  position4: 'accent' as IconColorType,    // Amber - Treatments, Loyalty
} as const

/**
 * Helper to create stat card props from config
 */
export function createStatCardProps(
  configKey: keyof typeof STAT_CONFIGS,
  additionalProps: Record<string, any> = {}
) {
  const config = getStatConfig(configKey)
  return {
    icon: config.icon,
    iconColor: config.iconColor,
    sparklineColor: config.sparklineColor,
    ...additionalProps
  }
}
