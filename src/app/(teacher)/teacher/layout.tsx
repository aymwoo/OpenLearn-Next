import type { ReactNode } from 'react'
import { RouteShell } from '@/components/shell/route-shell'
import { teacherNavigationItems } from '@/lib/navigation'

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return (
    <RouteShell sidebarItems={teacherNavigationItems} sidebarTitle="教师工作台">
      {children}
    </RouteShell>
  )
}
