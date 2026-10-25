'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

type RevealProps = {
  children: ReactNode
  /** Stagger delay in seconds. */
  delay?: number
  /** Slide direction on entry. */
  direction?: 'up' | 'down' | 'left' | 'right'
  className?: string
}

const OFFSETS: Record<NonNullable<RevealProps['direction']>, { x: number; y: number }> = {
  up: { x: 0, y: 24 },
  down: { x: 0, y: -24 },
  left: { x: 24, y: 0 },
  right: { x: -24, y: 0 },
}

export function Reveal({ children, delay = 0, direction = 'up', className }: RevealProps) {
  const offset = OFFSETS[direction]
  // Reduced motion: fade only, no travel.
  const reduce = useReducedMotion()
  const from = reduce ? 'translate(0px, 0px)' : `translate(${offset.x}px, ${offset.y}px)`

  return (
    <motion.div
      className={className}
      // Full transform strings stay hardware-accelerated; x/y shorthands run on
      // the main thread and stutter while the page is still loading.
      initial={{ opacity: 0, transform: from }}
      whileInView={{ opacity: 1, transform: 'translate(0px, 0px)' }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: [0.23, 1, 0.32, 1] as const }}
    >
      {children}
    </motion.div>
  )
}
