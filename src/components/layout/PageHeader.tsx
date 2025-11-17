import React from 'react'
import { ArrowLeft, LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { BentoCard } from '@/components/ui/bento-card'
import { cn } from '@/lib/utils'

export interface PageHeaderBadge {
  label: string
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  icon?: LucideIcon
}

export interface PageHeaderProps {
  // Core content
  title: string
  subtitle?: string | React.ReactNode

  // Visual elements
  icon?: LucideIcon
  iconVariant?: 'none' | 'simple' | 'box' | 'circle' | 'gradient'
  iconColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'accent'

  // Navigation
  showBackButton?: boolean
  backButtonLabel?: string
  onBackClick?: () => void
  backButtonVariant?: 'ghost' | 'outline'
  backTo?: string

  // Badges and metadata
  badges?: PageHeaderBadge[]

  // Layout options
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'card' | 'gradient'
  alignment?: 'left' | 'center'

  // Actions
  actions?: React.ReactNode

  // Additional content
  children?: React.ReactNode

  // Styling
  className?: string
  titleClassName?: string
  subtitleClassName?: string
  animation?: 'slide-up' | 'fade-in' | 'scale-in' | 'none'

  // Spacing
  spacing?: 'tight' | 'normal' | 'relaxed'
}

/**
 * PageHeader - Unified page header component
 *
 * Provides consistent styling for page titles, subtitles, icons, navigation,
 * and actions. All colors and fonts use the global theme system.
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="Analytics Dashboard"
 *   subtitle="Comprehensive insights"
 *   icon={BarChart3}
 *   iconVariant="box"
 *   showBackButton
 *   size="xl"
 * />
 * ```
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  iconVariant = 'none',
  iconColor = 'primary',
  showBackButton = false,
  backButtonLabel = 'Back to Home',
  onBackClick,
  backButtonVariant = 'ghost',
  backTo = '/',
  badges = [],
  size = 'lg',
  variant = 'default',
  alignment = 'left',
  actions,
  children,
  className,
  titleClassName,
  subtitleClassName,
  animation = 'slide-up',
  spacing = 'normal',
}) => {
  const navigate = useNavigate()

  // Size mappings
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-3xl md:text-4xl',
    xl: 'text-4xl',
  }

  const iconSizes = {
    sm: { container: 'h-8 w-8', icon: 'h-4 w-4' },
    md: { container: 'h-10 w-10', icon: 'h-5 w-5' },
    lg: { container: 'h-12 w-12', icon: 'h-6 w-6' },
    xl: { container: 'h-16 w-16', icon: 'h-8 w-8' },
  }

  const spacingClasses = {
    tight: 'mb-4',
    normal: 'mb-6',
    relaxed: 'mb-8',
  }

  const animationClasses = {
    'slide-up': 'animate-slide-up',
    'fade-in': 'animate-fade-in',
    'scale-in': 'animate-scale-in',
    'none': '',
  }

  const iconColorClasses = {
    primary: 'bg-primary',
    secondary: 'bg-secondary',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-destructive',
    accent: 'bg-accent',
  }

  // Handle back button click
  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick()
    } else {
      navigate(backTo)
    }
  }

  // Render icon based on variant
  const renderIcon = () => {
    if (!Icon || iconVariant === 'none') return null

    const iconSize = iconSizes[size]
    const colorClass = iconColorClasses[iconColor]

    switch (iconVariant) {
      case 'simple':
        return <Icon className={cn(iconSize.icon, `text-${iconColor}`)} />

      case 'box':
        return (
          <div
            className={cn(
              iconSize.container,
              'rounded-xl flex items-center justify-center',
              colorClass
            )}
          >
            <Icon className={cn(iconSize.icon, 'text-primary-foreground')} />
          </div>
        )

      case 'circle':
        return (
          <div
            className={cn(
              iconSize.container,
              'rounded-full flex items-center justify-center',
              `${colorClass}/10 dark:${colorClass}/20`
            )}
          >
            <Icon className={cn(iconSize.icon, `text-${iconColor}`)} />
          </div>
        )

      case 'gradient':
        return (
          <div className="relative">
            <div
              className={cn(
                iconSize.container,
                'rounded-full flex items-center justify-center',
                'bg-primary/20 dark:bg-primary/30'
              )}
            >
              <Icon className={cn(iconSize.icon, 'text-primary')} />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // Main content
  const renderContent = () => (
    <>
      {showBackButton && (
        <Button
          variant={backButtonVariant}
          onClick={handleBackClick}
          className="mb-4 hover:bg-accent/50"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {backButtonLabel}
        </Button>
      )}

      <div
        className={cn(
          'flex flex-col md:flex-row md:items-start',
          alignment === 'center' ? 'justify-center items-center' : 'md:justify-between',
          Icon && iconVariant !== 'none' && 'gap-3'
        )}
      >
        {/* Icon and Title Section */}
        <div
          className={cn(
            'flex items-center gap-3 flex-1',
            alignment === 'center' && 'flex-col'
          )}
        >
          {renderIcon()}

          <div className={alignment === 'center' ? 'text-center' : ''}>
            <div className="flex items-center gap-3 flex-wrap">
              <h1
                className={cn(
                  sizeClasses[size],
                  'font-bold text-primary',
                  alignment === 'center' && 'mb-2',
                  titleClassName
                )}
              >
                {title}
              </h1>

              {badges.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {badges.map((badge, index) => (
                    <Badge key={index} variant={badge.variant || 'outline'}>
                      {badge.icon && <badge.icon className="h-3 w-3 mr-1" />}
                      {badge.label}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {subtitle && (
              <p
                className={cn(
                  'text-muted-foreground mt-1',
                  size === 'xl' ? 'text-base' : 'text-sm',
                  subtitleClassName
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Actions Section */}
        {actions && (
          <div className="flex items-center gap-2 mt-4 md:mt-0 w-full md:w-auto">
            {actions}
          </div>
        )}
      </div>

      {/* Children (for custom content) */}
      {children && <div className="mt-4">{children}</div>}
    </>
  )

  // Variant-based wrapper
  const content = renderContent()

  switch (variant) {
    case 'card':
      return (
        <Card
          className={cn(
            'border-none shadow-lg',
            spacingClasses[spacing],
            animationClasses[animation],
            className
          )}
        >
          <CardContent className="pt-6">{content}</CardContent>
        </Card>
      )

    case 'gradient':
      return (
        <BentoCard
          variant="gradient"
          className={cn(spacingClasses[spacing], animationClasses[animation], className)}
        >
          {content}
        </BentoCard>
      )

    case 'default':
    default:
      return (
        <div className={cn(spacingClasses[spacing], animationClasses[animation], className)}>
          {content}
        </div>
      )
  }
}
