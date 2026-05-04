import type { ReactNode } from 'react'
import { RouteShell } from '@/components/shell/route-shell'
import { adminNavigationItems } from '@/lib/navigation'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RouteShell sidebarItems={adminNavigationItems} sidebarTitle="管理后台">
      {children}
    </RouteShell>
  )
}
