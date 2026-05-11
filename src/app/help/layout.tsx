import type { ReactNode } from "react";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { TeacherSidebarShell } from "@/components/shell/teacher-sidebar-shell";
import { getCurrentUserDTO } from "@/lib/dal/auth";
import { getUserMembershipsDTO } from "@/lib/dal/membership";
import { resolveTeacherThemeRouteSurface } from "@/lib/theme-layout/route-surface-registry";

export default async function HelpLayout({ children }: { children: ReactNode }) {
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
