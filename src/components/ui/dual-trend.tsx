import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface DualTrendProps {
  previousData: number[]
  currentData: number[]
  color?: string
  previousColor?: string
  height?: number
  className?: string
}

/**
 * DualTrend - Continuous sparkline showing previous and current period
 *
 * Displays two periods as one smooth continuous line with gradient color
 * to provide visual comparison between periods at a glance.
 */
export const DualTrend: React.FC<DualTrendProps> = ({
  previousData,
  currentData,
  color = 'currentColor',
  previousColor = '#9ca3af',
  height = 32,
  className
}) => {
  // Guard: If both arrays are empty, render empty SVG
  if (previousData.length === 0 && currentData.length === 0) {
    return (
      <svg
        width="100%"
        height={height}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className={cn('overflow-visible', className)}
      />
    )
  }

  // Generate unique ID for gradient to avoid conflicts when multiple instances exist
  const gradientId = React.useId()

  // Combine both datasets to find global min/max for consistent scaling
  const allData = [...previousData, ...currentData]
  const min = Math.min(...allData)
  const max = Math.max(...allData)
  const range = max - min || 1 // Avoid division by zero

  // Normalize data to 0-1 range
  const normalize = (value: number) => ((value - min) / range)

  // Calculate total points
  const prevPoints = previousData.length
  const currPoints = currentData.length
  const totalPoints = prevPoints + currPoints

  // SVG dimensions
  const viewBoxWidth = 100
  const viewBoxHeight = 100
  const padding = 5

  // Calculate x positions for each point
  const getX = (index: number, isPrevious: boolean) => {
    const totalWidth = viewBoxWidth - (padding * 2)

    // Fallback: if no previous data, use full width for current data
    if (prevPoints === 0) {
      const pointWidth = totalWidth / (currPoints - 1 || 1)
      return padding + (index * pointWidth)
    }

    // Fallback: if no current data, use full width for previous data
    if (currPoints === 0) {
      const pointWidth = totalWidth / (prevPoints - 1 || 1)
      return padding + (index * pointWidth)
    }

    // Both periods present: distribute across full width
    const pointWidth = totalWidth / Math.max(totalPoints - 1, 1) // -1 because we connect points, protect against division by zero

    if (isPrevious) {
      return padding + (index * pointWidth)
    } else {
      return padding + ((prevPoints + index) * pointWidth)
    }
  }

  // Calculate y position (inverted because SVG y-axis goes down)
  const getY = (value: number) => {
    const normalizedValue = normalize(value)
    const availableHeight = viewBoxHeight - (padding * 2)
    return viewBoxHeight - padding - (normalizedValue * availableHeight)
  }

  // Generate smooth curve using Monotone Cubic Spline Interpolation
  // This is the same algorithm used by Chart.js for smooth, edge-free curves
  const generateSmoothPath = (data: number[], isPrevious: boolean) => {
    if (data.length === 0) return ''

    const points = data.map((value, index) => ({
      x: getX(index, isPrevious),
      y: getY(value)
    }))

    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y}`
    }

    if (points.length === 2) {
      return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
    }

    // Calculate slopes (m) for monotone cubic interpolation
    const n = points.length
    const slopes: number[] = []
    const tangents: number[] = []

    // Step 1: Calculate secant slopes between consecutive points
    for (let i = 0; i < n - 1; i++) {
      const dx = points[i + 1].x - points[i].x
      const dy = points[i + 1].y - points[i].y
      slopes[i] = dy / dx
    }

    // Step 2: Calculate tangents using monotone cubic formula
    // First point tangent
    tangents[0] = slopes[0]

    // Interior points - use monotone formula to prevent overshooting
    for (let i = 1; i < n - 1; i++) {
      const m0 = slopes[i - 1]
      const m1 = slopes[i]

      // If signs differ or either slope is zero, tangent is zero (preserves monotonicity)
      if (m0 * m1 <= 0) {
        tangents[i] = 0
      } else {
        // Weighted harmonic mean (prevents overshooting)
        const dx0 = points[i].x - points[i - 1].x
        const dx1 = points[i + 1].x - points[i].x
        const common = dx0 + dx1
        tangents[i] = 3 * common / ((common + dx1) / m0 + (common + dx0) / m1)
      }
    }

    // Last point tangent
    tangents[n - 1] = slopes[n - 2]

    // Step 3: Build the smooth path using cubic Bézier curves
    let path = `M ${points[0].x} ${points[0].y}`

    for (let i = 0; i < n - 1; i++) {
      const p0 = points[i]
      const p1 = points[i + 1]
      const m0 = tangents[i]
      const m1 = tangents[i + 1]

      // Calculate control points for cubic Bézier
      const dx = (p1.x - p0.x) / 3
      const cp1x = p0.x + dx
      const cp1y = p0.y + dx * m0
      const cp2x = p1.x - dx
      const cp2y = p1.y - dx * m1

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`
    }

    return path
  }

  // Fallback: If only one period has data, use that period's color
  const hasBothPeriods = previousData.length > 0 && currentData.length > 0
  const hasOnlyPrevious = previousData.length > 0 && currentData.length === 0
  const hasOnlyCurrent = previousData.length === 0 && currentData.length > 0

  // Generate smooth path combining both periods
  const previousPath = generateSmoothPath(previousData, true)
  const currentPath = generateSmoothPath(currentData, false)

  // Combine paths: if both exist, connect them smoothly
  let smoothPath = ''
  if (hasBothPeriods) {
    // Get connection points
    const lastPrevPoint = { x: getX(prevPoints - 1, true), y: getY(previousData[prevPoints - 1]) }
    const firstCurrPoint = { x: getX(0, false), y: getY(currentData[0]) }

    // Calculate smooth control points for connection curve (monotone cubic style)
    const dx = (firstCurrPoint.x - lastPrevPoint.x) / 3

    // Use horizontal tangents for smooth connection (no overshooting)
    const cp1x = lastPrevPoint.x + dx
    const cp1y = lastPrevPoint.y
    const cp2x = firstCurrPoint.x - dx
    const cp2y = firstCurrPoint.y

    // Remove the 'M' command from currentPath using regex (handles edge cases properly)
    const currentPathWithoutMove = currentPath.replace(/^M[^C]*/, '')

    // Combine: previous path + connecting curve + current path content
    smoothPath = previousPath + ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${firstCurrPoint.x} ${firstCurrPoint.y}` + currentPathWithoutMove
  } else if (hasOnlyPrevious) {
    smoothPath = previousPath
  } else {
    smoothPath = currentPath
  }

  // Calculate the midpoint percentage for gradient transition
  const midpointPercent = hasBothPeriods
    ? ((prevPoints / totalPoints) * 100).toFixed(1)
    : '50'

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      preserveAspectRatio="none"
      className={cn('overflow-visible', className)}
    >
      {/* Gradient definition for color transition */}
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          {hasBothPeriods ? (
            <>
              {/* Transition from previous to current color at midpoint */}
              <stop offset="0%" stopColor={previousColor} />
              <stop offset={`${midpointPercent}%`} stopColor={previousColor} />
              <stop offset={`${midpointPercent}%`} stopColor={color} />
              <stop offset="100%" stopColor={color} />
            </>
          ) : hasOnlyPrevious ? (
            <stop offset="0%" stopColor={previousColor} />
          ) : (
            <stop offset="0%" stopColor={color} />
          )}
        </linearGradient>
      </defs>

      {/* Single continuous smooth path with gradient stroke - Animated */}
      <motion.path
        d={smoothPath}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          pathLength: { duration: 1.2, ease: "easeInOut" },
          opacity: { duration: 0.3 }
        }}
        key={smoothPath} // Re-animate when data changes
      />
    </svg>
  )
}

export default DualTrend
