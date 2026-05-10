import type { ReactNode } from "react";

import { TeacherSidebarShell } from "@/components/shell/teacher-sidebar-shell";

export default async function ResourcesLayout({ children }: { children: ReactNode }) {
  return (
    <TeacherSidebarShell routeKey="/resources" activePath="/resources" headerTitle="资源中心">
      {children}
    </TeacherSidebarShell>
  );
}
