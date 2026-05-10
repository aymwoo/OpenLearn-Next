import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type StageHeroProps = {
  badge?: string
  title: string
  description: string
  meta?: ReactNode
  aside?: ReactNode
  actions?: ReactNode
  className?: string
  titleClassName?: string
}

export function StageHero({
  badge,
  title,
  description,
  meta,
  aside,
  actions,
  className,
  titleClassName,
}: StageHeroProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-[var(--radius-shell)] bg-[#09192f] text-white shadow-[0_28px_80px_rgba(2,6,23,0.24)]',
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(129,140,248,0.2),_transparent_30%),radial-gradient(circle_at_82%_18%,_rgba(45,212,191,0.16),_transparent_24%),linear-gradient(135deg,rgba(8,19,38,0.96),rgba(15,35,66,0.92))]" />
      <div className="absolute inset-x-8 top-0 h-px bg-white/10" />

      <div className="relative px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1 max-w-4xl">
            {badge ? <Badge className="bg-white/10 text-white">{badge}</Badge> : null}
            <h1 className={cn('mt-4 text-[2.2rem] font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-[3rem]', titleClassName)}>{title}</h1>
            <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base sm:leading-8">{description}</p>
            {meta ? <div className="mt-4">{meta}</div> : null}
            {actions ? <div className="mt-5 flex flex-wrap items-center gap-3">{actions}</div> : null}
          </div>

          {aside ? <div className="min-w-0 lg:w-[min(30rem,42%)] lg:shrink-0">{aside}</div> : null}
        </div>
      </div>
    </section>
  )
}
