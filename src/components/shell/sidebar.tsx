'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { NavigationItem } from '@/lib/navigation'
import { cn } from '@/lib/utils'

type SidebarProps = {
  items: readonly NavigationItem[] | readonly { label: string; href: string; emphasis?: string }[]
  activePath?: string
  title?: string
}

export function Sidebar({ items, activePath, title = '课堂导航' }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden w-64 shrink-0 rounded-[var(--radius-shell)] bg-surface-container-low p-4 lg:block">
      <p className="px-3 pb-3 text-sm text-on-surface-variant">{title}</p>
      <div className="space-y-2">
        {items.map((item) => {
          const currentPath = activePath ?? pathname
          const active = currentPath === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'block rounded-full px-4 py-3 text-sm transition hover:bg-surface-container-lowest',
                active ? 'bg-surface-container-lowest text-primary shadow-ambient' : 'text-on-surface-variant',
                item.emphasis === 'low' && !active && 'opacity-70',
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
