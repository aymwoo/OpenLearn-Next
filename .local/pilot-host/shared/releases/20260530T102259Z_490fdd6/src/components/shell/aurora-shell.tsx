import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type AuroraShellProps = {
  children: ReactNode
  className?: string
  contentClassName?: string
}

export function AuroraShell({ children, className, contentClassName }: AuroraShellProps) {
  return (
    <div className={cn('relative min-h-screen overflow-hidden bg-[#07111f] text-white', className)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(129,140,248,0.24),_transparent_28%),radial-gradient(circle_at_80%_18%,_rgba(45,212,191,0.22),_transparent_24%),radial-gradient(circle_at_50%_100%,_rgba(59,130,246,0.18),_transparent_40%)]" />
      <div className="absolute left-[-12rem] top-28 h-80 w-80 rounded-full bg-[#7c3aed]/18 blur-3xl" />
      <div className="absolute right-[-8rem] top-10 h-72 w-72 rounded-full bg-[#22d3ee]/18 blur-3xl" />

      <div className={cn('relative z-10 min-h-screen', contentClassName)}>{children}</div>
    </div>
  )
}
