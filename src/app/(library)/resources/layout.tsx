import type { ReactNode } from "react";

import { TeacherSidebarShell } from "@/components/shell/teacher-sidebar-shell";

export default function ResourcesLayout({ children }: { children: ReactNode }) {
  return <TeacherSidebarShell>{children}</TeacherSidebarShell>;
}
