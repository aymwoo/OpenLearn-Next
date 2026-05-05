import { Slot } from '@radix-ui/react-slot'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'tertiary'

type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  asChild?: boolean
  variant?: ButtonVariant
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-linear-135 from-primary to-primary-container text-on-primary shadow-ambient',
  secondary: 'bg-surface-container-lowest text-primary shadow-ambient',
  tertiary: 'bg-transparent text-primary hover:bg-surface-container-low',
}

export function Button({ asChild, variant = 'primary', className, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      className={cn(
        'inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold transition hover:-translate-y-0.5 focus-visible:outline-2',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
