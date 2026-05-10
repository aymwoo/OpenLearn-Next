import type { ReactNode } from "react";

import { TeacherSidebarShell } from "@/components/shell/teacher-sidebar-shell";

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <TeacherSidebarShell
      routeKey="/settings"
      activePath="/settings"
      headerTitle="系统设置"
      headerDescription="管理主题、实验室布局与系统级偏好；启用主题插件后会自动切换到对应布局运行时。"
    >
      {children}
    </TeacherSidebarShell>
  );
}
