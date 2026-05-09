import type { ReactNode } from "react";

import { TeacherSidebarShell } from "@/components/shell/teacher-sidebar-shell";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <TeacherSidebarShell>{children}</TeacherSidebarShell>;
}
