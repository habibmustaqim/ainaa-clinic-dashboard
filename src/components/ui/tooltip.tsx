import * as React from "react"

export interface TooltipProps {
  content: string
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
}

export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && content && (
        <div
          className={`absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg whitespace-nowrap max-w-sm ${
            side === 'top' ? 'bottom-full left-1/2 -translate-x-1/2 mb-1' :
            side === 'bottom' ? 'top-full left-1/2 -translate-x-1/2 mt-1' :
            side === 'left' ? 'right-full top-1/2 -translate-y-1/2 mr-1' :
            'left-full top-1/2 -translate-y-1/2 ml-1'
          }`}
        >
          {content}
          <div
            className={`absolute w-1.5 h-1.5 bg-gray-900 transform rotate-45 ${
              side === 'top' ? 'bottom-[-3px] left-1/2 -translate-x-1/2' :
              side === 'bottom' ? 'top-[-3px] left-1/2 -translate-x-1/2' :
              side === 'left' ? 'right-[-3px] top-1/2 -translate-y-1/2' :
              'left-[-3px] top-1/2 -translate-y-1/2'
            }`}
          />
        </div>
      )}
    </div>
  )
}
