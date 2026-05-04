import type { ReactNode } from 'react'
import { RouteShell } from '@/components/shell/route-shell'
import { classroomNavigationItems } from '@/lib/navigation'

export default function ClassroomLayout({ children }: { children: ReactNode }) {
  return (
    <RouteShell sidebarItems={classroomNavigationItems} sidebarTitle="课堂运行">
      {children}
    </RouteShell>
  )
}
