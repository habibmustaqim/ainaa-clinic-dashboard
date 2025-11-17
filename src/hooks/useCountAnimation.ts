import { useEffect, useState } from 'react'

/**
 * Custom hook for animating number count-ups
 * Provides a smooth counting animation from 0 to target value
 */

interface UseCountAnimationOptions {
  /** Target value to count to */
  end: number
  /** Starting value (default: 0) */
  start?: number
  /** Animation duration in milliseconds (default: 2000) */
  duration?: number
  /** Number of decimal places (default: 0) */
  decimals?: number
  /** Delay before starting animation in ms (default: 0) */
  delay?: number
  /** Enable/disable animation (default: true) */
  enabled?: boolean
}

/**
 * Easing function for smooth count animation
 * Uses easeOutCubic for natural deceleration
 */
const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3)
}

export const useCountAnimation = ({
  end,
  start = 0,
  duration = 2000,
  decimals = 0,
  delay = 0,
  enabled = true,
}: UseCountAnimationOptions) => {
  const [count, setCount] = useState(start)

  useEffect(() => {
    if (!enabled) {
      setCount(end)
      return
    }

    const startTime = Date.now() + delay
    const difference = end - start

    const animate = () => {
      const currentTime = Date.now()
      const elapsed = currentTime - startTime

      if (elapsed < 0) {
        // Still in delay period
        requestAnimationFrame(animate)
        return
      }

      if (elapsed < duration) {
        // Calculate progress (0 to 1)
        const progress = elapsed / duration
        // Apply easing
        const easedProgress = easeOutCubic(progress)
        // Calculate current value
        const currentValue = start + difference * easedProgress
        setCount(Number(currentValue.toFixed(decimals)))
        requestAnimationFrame(animate)
      } else {
        // Animation complete
        setCount(end)
      }
    }

    const animationFrame = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationFrame)
    }
  }, [end, start, duration, decimals, delay, enabled])

  return count
}

/**
 * Hook for currency count animation
 * Automatically formats as currency with RM prefix
 */
export const useCurrencyCountAnimation = (
  value: number,
  options?: Omit<UseCountAnimationOptions, 'end' | 'decimals'>
) => {
  const count = useCountAnimation({
    ...options,
    end: value,
    decimals: 2,
  })

  return {
    count,
    formatted: `RM ${count.toLocaleString('en-MY', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
  }
}
