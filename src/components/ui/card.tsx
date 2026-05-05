import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: ComponentPropsWithoutRef<'section'>) {
  return (
    <section
      className={cn('rounded-[var(--radius-shell)] bg-surface-container-lowest p-6 shadow-ambient', className)}
      {...props}
    />
  )
}
