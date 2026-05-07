'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  BookOpen, 
  GraduationCap,
  Users, 
  FolderKanban, 
  CheckSquare, 
  LineChart,
  Plus,
  Settings,
  HelpCircle
} from 'lucide-react'

type SidebarItem = {
  label: string
  href: string
  icon?: string
  emphasis?: string
}

type SidebarProps = {
  items: readonly SidebarItem[] | readonly { label: string; href: string; emphasis?: string }[]
  activePath?: string
  title?: string // Add title back for backwards compatibility with route-shell.tsx
}

export function Sidebar({ items, activePath }: SidebarProps) {
  const pathname = usePathname()

  const renderIcon = (iconName?: string) => {
    switch (iconName) {
      case 'LayoutDashboard': return <LayoutDashboard className="size-5 shrink-0" />
      case 'BookOpen': return <BookOpen className="size-5 shrink-0" />
      case 'GraduationCap': return <GraduationCap className="size-5 shrink-0" />
      case 'Users': return <Users className="size-5 shrink-0" />
      case 'FolderKanban': return <FolderKanban className="size-5 shrink-0" />
      case 'CheckSquare': return <CheckSquare className="size-5 shrink-0" />
      case 'LineChart': return <LineChart className="size-5 shrink-0" />
      default: return null
    }
  }

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col justify-between rounded-[2rem] bg-surface-container-low px-4 py-5 lg:flex">
      <div className="flex flex-col gap-7">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest text-sm font-semibold text-primary shadow-ambient">
            L
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-bold leading-tight tracking-tight text-on-surface">Luminous<br/>Academy</h1>
            <span className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">高级教师版</span>
          </div>
        </div>

        <nav className="flex flex-col gap-1.5" aria-label="教师端侧边导航">
          {items.map((item) => {
            const currentPath = activePath ?? pathname
            const active = currentPath === item.href || (item.href !== '/teacher' && currentPath.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex min-h-12 items-center gap-3 rounded-full px-4 text-[0.92rem] font-medium transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary/40',
                  active 
                    ? 'bg-surface-container-lowest text-primary shadow-ambient' 
                    : 'text-on-surface-variant hover:bg-surface-container-lowest hover:text-on-surface',
                  item.emphasis === 'low' && !active && 'text-on-surface-variant/72',
                )}
                aria-current={active ? 'page' : undefined}
              >
                {renderIcon('icon' in item ? item.icon : undefined)}
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-2 pt-4">
        <Button type="button" className="mb-2 w-full gap-2 text-base">
          <Plus className="size-5" />
          开启新课堂
        </Button>
        
        <Link href="/settings" className="flex min-h-11 items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-lowest hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary/40">
          <Settings className="size-5 shrink-0" />
          设置
        </Link>
        <Link href="/help" className="flex min-h-11 items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-lowest hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary/40">
          <HelpCircle className="size-5 shrink-0" />
          帮助中心
        </Link>
      </div>
    </aside>
  )
}
