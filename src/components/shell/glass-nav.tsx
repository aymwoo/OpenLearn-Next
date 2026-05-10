'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import type { NavigationItem } from '@/lib/navigation'
import { navigationItems } from '@/lib/navigation'
import { cn } from '@/lib/utils'

type GlassNavProps = {
  items?: readonly NavigationItem[]
  brandHref?: string
  brandLabel?: string
  activePath?: string
  className?: string
}

export function GlassNav({
  items = navigationItems,
  brandHref = '/',
  brandLabel = 'OpenLearn Next',
  activePath,
  className,
}: GlassNavProps) {
  const pathname = usePathname()
  const currentPath = activePath ?? pathname

  return (
    <header className={cn('sticky top-3 z-30 mx-auto w-[min(1120px,calc(100%-20px))] rounded-full bg-surface/80 px-2 py-2 shadow-ambient backdrop-blur-xl', className)} data-shell-region="primary-nav" data-shell-variant="top-nav">
      <nav aria-label="主导航" className="flex min-h-11 items-center gap-2">
        <Link
          href={brandHref}
          className="flex min-h-11 shrink-0 items-center rounded-full bg-surface-container-lowest px-4 text-sm font-semibold text-primary transition hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary/40"
        >
          {brandLabel}
        </Link>
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => {
            const active = currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm transition hover:bg-surface-container-lowest focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary/40',
                  active && 'bg-linear-135 from-primary to-primary-container text-on-primary shadow-ambient',
                  !active && item.emphasis === 'low' && 'text-on-surface-variant/70',
                  !active && item.emphasis !== 'low' && 'text-on-surface-variant',
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </header>
  )
}
