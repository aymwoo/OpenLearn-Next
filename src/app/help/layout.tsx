import { Suspense, type ReactNode } from "react";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { TeacherSidebarShell, TeacherSidebarShellFrame } from "@/components/shell/teacher-sidebar-shell";
import { getCurrentUserDTO } from "@/lib/dal/auth";
import { getUserMembershipsDTO } from "@/lib/dal/membership";
import { getShellSurfaceConfig } from "@/lib/theme-layout/shell-surface-resolver";
import { resolveTeacherThemeRouteSurface } from "@/lib/theme-layout/route-surface-registry";
import { DEFAULT_THEME_LAYOUT_RUNTIME } from "@/server/themes/tokens";

export default function HelpLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<HelpShellFallback />}>
      <HelpLayoutContent>{children}</HelpLayoutContent>
    </Suspense>
  );
}

export async function HelpLayoutContent({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const user = await getCurrentUserDTO();

  if (!user) {
    redirect("/");
  }

  const memberships = await getUserMembershipsDTO(user.id);
  const isTeacher = memberships.some((membership) => membership.role === "teacher" && membership.status === "active");

  if (!isTeacher) {
    redirect("/unauthorized");
  }

  const pathname = requestHeaders.get("x-pathname") ?? requestHeaders.get("next-url") ?? "/help";
  const routeKey = resolveTeacherThemeRouteSurface(pathname);

  return (
    <TeacherSidebarShell
      routeKey={routeKey}
      activePath="/help"
      headerTitle="帮助中心"
      headerDescription="在同一个产品壳层里查看教师使用说明、插件开发、主题开发与 schedule 扩展边界。"
    >
      {children}
    </TeacherSidebarShell>
  );
}

function HelpShellFallback() {
  const { shellVariant, shellConfig, surfaceMetadata } = getShellSurfaceConfig({
    routeKey: "/help",
    layoutRuntime: DEFAULT_THEME_LAYOUT_RUNTIME,
  });

  return (
    <TeacherSidebarShellFrame
      routeKey="/help"
      activePath="/help"
      headerTitle="帮助中心"
      headerDescription="正在加载帮助中心。"
      shellVariant={shellVariant}
      shellConfig={shellConfig}
      surfaceMetadata={surfaceMetadata}
    >
      <div className="min-h-full" />
    </TeacherSidebarShellFrame>
  );
}
