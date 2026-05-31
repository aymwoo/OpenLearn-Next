import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('animate-pulse rounded-3xl bg-surface-container-low', className)} {...props} />
}
