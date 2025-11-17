import { Variants } from 'framer-motion'

/**
 * Animation variants for consistent motion across the application
 * Uses Framer Motion for smooth, performant animations
 */

// Fade in from opacity 0 to 1
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
}

// Scale up from 0.8 to 1 with fade
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94], // Custom easing curve
    },
  },
}

// Slide up from bottom with fade
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
}

// Slide in from left
export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
}

// Chart entrance animation - slower, more dramatic
export const chartEntrance: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
}

// Stagger children animation
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

// Card entrance with slight bounce
export const cardEntrance: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.34, 1.56, 0.64, 1], // Slight bounce effect
    },
  },
}

// Number counter animation config
export const numberCounterConfig = {
  duration: 2,
  decimals: 2,
  separator: ',',
  useEasing: true,
  easingFn: (t: number, b: number, c: number, d: number) => {
    // EaseOut cubic easing
    t /= d
    t--
    return c * (t * t * t + 1) + b
  },
}

// Export default animations for common use cases
export const defaultAnimations = {
  statCard: cardEntrance,
  chart: chartEntrance,
  list: staggerContainer,
  item: slideUp,
  fade: fadeIn,
  scale: scaleIn,
}
