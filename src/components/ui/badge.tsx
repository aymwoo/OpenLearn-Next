import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'accent'

type BadgeProps = ComponentPropsWithoutRef<'span'> & {
  variant?: BadgeVariant
}

const badgeVariantClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface-container-low text-on-surface-variant',
  success: 'bg-tertiary-container/70 text-tertiary',
  accent: 'bg-primary-container/20 text-primary',
}

export function Badge({ variant = 'default', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-sm font-normal',
        badgeVariantClasses[variant],
        className,
      )}
      {...props}
    />
  )
}
