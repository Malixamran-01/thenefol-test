import React from 'react'
import { useCountUp } from '../hooks/useCountUp'

interface CountUpProps {
  end: number
  duration?: number
  startOnView?: boolean
  suffix?: string
  prefix?: string
  decimals?: number
  className?: string
  style?: React.CSSProperties
}

export default function CountUp({
  end,
  duration = 2000,
  startOnView = true,
  suffix = '%',
  prefix = '',
  decimals = 0,
  className = '',
  style
}: CountUpProps) {
  const { count, elementRef } = useCountUp({
    end,
    duration,
    startOnView,
    suffix,
    prefix,
    decimals
  })

  return (
    <span
      ref={elementRef as React.RefObject<HTMLSpanElement>}
      className={className}
      style={style}
    >
      {count}
    </span>
  )
}

