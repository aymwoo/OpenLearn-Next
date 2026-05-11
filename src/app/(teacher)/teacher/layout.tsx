import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { TeacherSidebarShell, TeacherSidebarShellFrame } from "@/components/shell/teacher-sidebar-shell";
import { getCurrentUserDTO } from "@/lib/dal/auth";
import { getUserMembershipsDTO } from "@/lib/dal/membership";
import { resolveTeacherThemeRouteSurface } from "@/lib/theme-layout/route-surface-registry";
import { getShellSurfaceConfig } from "@/lib/theme-layout/shell-surface-resolver";
import { Button } from "@/components/ui/button";
import { Bell, Search, CalendarDays } from "lucide-react";
import { DEFAULT_THEME_LAYOUT_RUNTIME } from "@/server/themes/tokens";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<TeacherShellFallback />}>
        <TeacherLayoutContent>{children}</TeacherLayoutContent>
    </Suspense>
  );
}

async function TeacherLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = await headers();
  const user = await getCurrentUserDTO();

  if (!user) {
    redirect("/login");
  }

  const memberships = await getUserMembershipsDTO(user.id);
  const isTeacher = memberships.some((m) => m.role === "teacher" && m.status === "active");

  if (!isTeacher) {
    redirect("/unauthorized");
  }

  const avatarName = user.name?.trim() || "用户";
  const avatarInitial = avatarName.charAt(0).toUpperCase();
  const pathname = requestHeaders.get("x-pathname") ?? requestHeaders.get("next-url") ?? "/teacher";
  const routeKey = resolveTeacherThemeRouteSurface(pathname);

  return (
    <TeacherSidebarShell
      routeKey={routeKey}
      activePath={pathname}
      headerTitle="教师工作台"
      headerActions={
        <>
          <Button asChild className="px-5 text-sm">
            <Link href="/teacher/launch">开启新课堂</Link>
          </Button>
          <button className="relative rounded-full bg-surface-container-lowest p-2.5 text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary/40">
            <Bell className="size-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500"></span>
          </button>
          <button className="rounded-full bg-surface-container-lowest p-2.5 text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary/40">
            <Search className="size-5" />
          </button>
          <button className="rounded-full bg-surface-container-lowest p-2.5 text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary/40">
            <CalendarDays className="size-5" />
          </button>
          <div className="flex cursor-pointer items-center gap-3 rounded-full bg-surface-container-lowest px-2 py-2 shadow-ambient">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
              {avatarInitial}
            </div>
            <div className="hidden pr-2 sm:block">
              <p className="text-sm font-medium text-on-surface">{avatarName}</p>
              <p className="text-xs text-on-surface-variant">教师空间</p>
            </div>
          </div>
        </>
      }
    >
      {children}
    </TeacherSidebarShell>
  );
}

function TeacherShellFallback() {
  const { shellVariant, shellConfig, surfaceMetadata } = getShellSurfaceConfig({
    routeKey: "/teacher",
    layoutRuntime: DEFAULT_THEME_LAYOUT_RUNTIME,
  });

  return (
    <TeacherSidebarShellFrame
      routeKey="/teacher"
      headerTitle="教师工作台"
      headerDescription="正在加载主题布局运行时。"
      shellVariant={shellVariant}
      shellConfig={shellConfig}
      surfaceMetadata={surfaceMetadata}
    >
      <div className="min-h-full" />
    </TeacherSidebarShellFrame>
  );
}
