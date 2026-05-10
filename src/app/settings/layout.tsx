import type { ReactNode } from "react";

import { TeacherSidebarShell } from "@/components/shell/teacher-sidebar-shell";

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <TeacherSidebarShell routeKey="/settings" activePath="/settings" headerTitle="系统设置">
      {children}
    </TeacherSidebarShell>
  );
}
