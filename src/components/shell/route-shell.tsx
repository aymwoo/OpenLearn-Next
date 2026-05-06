import type { ReactNode } from 'react'
import { GlassNav } from '@/components/shell/glass-nav'
import { Sidebar } from '@/components/shell/sidebar'
import type { NavigationItem } from '@/lib/navigation'

type RouteShellProps = {
  children: ReactNode
  sidebarItems?: readonly NavigationItem[] | readonly { label: string; href: string; emphasis?: string }[]
  activePath?: string
  sidebarTitle?: string
  showTopNav?: boolean
}

export function RouteShell({ children, sidebarItems, activePath, sidebarTitle, showTopNav = true }: RouteShellProps) {
  return (
    <div className="min-h-screen bg-surface pb-12 pt-4 text-on-surface">
      {showTopNav ? <GlassNav /> : null}
      <div className="mx-auto mt-4 flex w-[min(1180px,calc(100%-24px))] gap-4 xl:gap-5">
        {sidebarItems ? <Sidebar items={sidebarItems} activePath={activePath} title={sidebarTitle} /> : null}
        <main className="min-w-0 flex-1 rounded-[var(--radius-shell)] bg-surface">{children}</main>
      </div>
    </div>
  )
}
