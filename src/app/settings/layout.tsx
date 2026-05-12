import { Suspense, type ReactNode } from "react";

import { headers } from "next/headers";

import { TeacherSidebarShell, TeacherSidebarShellFrame } from "@/components/shell/teacher-sidebar-shell";
import { getShellSurfaceConfig } from "@/lib/theme-layout/shell-surface-resolver";
import { resolveTeacherThemeRouteSurface } from "@/lib/theme-layout/route-surface-registry";
import { DEFAULT_THEME_LAYOUT_RUNTIME } from "@/server/themes/tokens";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<SettingsShellFallback />}>
      <SettingsLayoutContent>{children}</SettingsLayoutContent>
    </Suspense>
  );
}

async function SettingsLayoutContent({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-pathname") ?? requestHeaders.get("next-url") ?? "/settings";
  const routeKey = resolveTeacherThemeRouteSurface(pathname);

  return (
    <TeacherSidebarShell
      routeKey={routeKey}
      activePath={pathname}
      headerTitle="系统设置"
      headerDescription="管理主题、实验室布局与系统级偏好；启用主题插件后会自动切换到对应布局运行时。"
    >
      {children}
    </TeacherSidebarShell>
  );
}

function SettingsShellFallback() {
  const { shellVariant, shellConfig, surfaceMetadata } = getShellSurfaceConfig({
    routeKey: "/settings",
    layoutRuntime: DEFAULT_THEME_LAYOUT_RUNTIME,
  });

  return (
    <TeacherSidebarShellFrame
      routeKey="/settings"
      activePath="/settings"
      headerTitle="系统设置"
      headerDescription="正在加载系统设置。"
      shellVariant={shellVariant}
      shellConfig={shellConfig}
      surfaceMetadata={surfaceMetadata}
    >
      <div className="min-h-full" />
    </TeacherSidebarShellFrame>
  );
}
