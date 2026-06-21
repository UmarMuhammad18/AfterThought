'use client'

import { motion } from 'framer-motion'
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

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: offset.x, y: offset.y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
