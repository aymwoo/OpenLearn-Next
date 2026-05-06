'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  BookOpen, 
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
      case 'Users': return <Users className="size-5 shrink-0" />
      case 'FolderKanban': return <FolderKanban className="size-5 shrink-0" />
      case 'CheckSquare': return <CheckSquare className="size-5 shrink-0" />
      case 'LineChart': return <LineChart className="size-5 shrink-0" />
      default: return null
    }
  }

  return (
    <aside className="hidden w-64 shrink-0 bg-surface flex-col justify-between py-6 px-4 lg:flex h-full">
      <div className="flex flex-col gap-8">
        {/* Logo & User Profile Area */}
        <div className="flex items-center gap-3 px-2">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
            L
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-bold text-primary leading-tight tracking-tight">Luminous<br/>Academy</h1>
            <span className="text-[10px] text-on-surface-variant uppercase tracking-wider mt-0.5">高级教师版</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1">
          {items.map((item) => {
            const currentPath = activePath ?? pathname
            const active = currentPath === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex min-h-[3rem] items-center gap-3 rounded-[1rem] px-4 text-[0.9rem] font-medium transition-all focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary/40',
                  active 
                    ? 'bg-white text-primary shadow-sm' 
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
                  item.emphasis === 'low' && !active && 'opacity-70',
                )}
              >
                {renderIcon('icon' in item ? item.icon : undefined)}
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col gap-2">
        <button className="flex items-center justify-center gap-2 w-full py-3.5 rounded-full bg-gradient-to-r from-primary to-primary-container text-white font-medium shadow-ambient hover:opacity-95 transition-opacity mb-4">
          <Plus className="size-5" />
          开启新课堂
        </button>
        
        <Link href="/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-[1rem] transition-colors">
          <Settings className="size-5 shrink-0" />
          设置
        </Link>
        <Link href="/help" className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-[1rem] transition-colors">
          <HelpCircle className="size-5 shrink-0" />
          帮助中心
        </Link>
      </div>
    </aside>
  )
}
