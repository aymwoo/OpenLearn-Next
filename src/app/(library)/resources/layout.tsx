import { Suspense, type ReactNode } from "react";

import {
  TeacherSidebarShell,
  TeacherSidebarShellFrame,
} from "@/components/shell/teacher-sidebar-shell";
import { getShellSurfaceConfig } from "@/lib/theme-layout/shell-surface-resolver";
import { DEFAULT_THEME_LAYOUT_RUNTIME } from "@/server/themes/tokens";

export default function ResourcesLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ResourcesShellFallback />}>
      <ResourcesLayoutContent>{children}</ResourcesLayoutContent>
    </Suspense>
  );
}

async function ResourcesLayoutContent({ children }: { children: ReactNode }) {
  return (
    <TeacherSidebarShell routeKey="/resources" activePath="/resources" headerTitle="资源中心">
      {children}
    </TeacherSidebarShell>
  );
}

function ResourcesShellFallback() {
  const { shellVariant, shellConfig, surfaceMetadata } = getShellSurfaceConfig({
    routeKey: "/resources",
    layoutRuntime: DEFAULT_THEME_LAYOUT_RUNTIME,
  });

  return (
    <TeacherSidebarShellFrame
      routeKey="/resources"
      activePath="/resources"
      headerTitle="资源中心"
      headerDescription="正在加载资源中心。"
      shellVariant={shellVariant}
      shellConfig={shellConfig}
      surfaceMetadata={surfaceMetadata}
    >
      <div className="min-h-full" />
    </TeacherSidebarShellFrame>
  );
}
