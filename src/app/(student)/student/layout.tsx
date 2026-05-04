import type { ReactNode } from 'react'
import { RouteShell } from '@/components/shell/route-shell'
import { studentNavigationItems } from '@/lib/navigation'

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <RouteShell sidebarItems={studentNavigationItems} sidebarTitle="学生空间">
      {children}
    </RouteShell>
  )
}
