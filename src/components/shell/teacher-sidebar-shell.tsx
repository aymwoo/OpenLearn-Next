import type { ReactNode } from "react";

import { teacherNavigationItems } from "@/lib/navigation";
import { getActiveThemeRuntimeForCurrentActor } from "@/lib/dal/themes";
import type { TeacherThemeRouteKey } from "@/lib/theme-layout/route-surface-registry";
import { Sidebar } from "@/components/shell/sidebar";
import { GlassNav } from "@/components/shell/glass-nav";
import { getActiveThemeId } from "@/lib/theme-cookie";
import { DEFAULT_THEME_LAYOUT_RUNTIME } from "@/server/themes/tokens";

const teacherSidebarItems = [
  { label: "工作台", href: "/teacher", icon: "LayoutDashboard" },
  { label: "班级管理", href: "/teacher/classes", icon: "GraduationCap" },
  { label: "课程管理", href: "/teacher/courses", icon: "BookOpen" },
  { label: "学生档案", href: "/teacher/students", icon: "Users" },
  { label: "教学资源", href: "/resources", icon: "FolderKanban" },
  { label: "批改中心", href: "/teacher/review", icon: "CheckSquare" },
  { label: "数据报表", href: "/teacher/reports", icon: "LineChart" },
] as const;

const ALLOWLISTED_SHELL_MODES = ["left-nav", "top-nav", "top-nav-secondary-rail"] as const;

type TeacherSidebarShellProps = {
  children: ReactNode;
  routeKey?: TeacherThemeRouteKey;
  activePath?: string;
  headerTitle?: string;
  headerDescription?: string;
  headerActions?: ReactNode;
};

function resolveSurfaceLabel(routeKey: TeacherThemeRouteKey) {
  switch (routeKey) {
    case "/settings":
      return "系统设置";
    case "/settings/labs":
      return "实验室布局管理";
    case "/settings/plugins":
      return "插件市场";
    case "/resources":
      return "资源中心";
    case "/teacher/editor":
      return "课时编辑";
    case "/teacher/launch":
      return "课堂准备";
    case "/teacher/review":
      return "批改中心";
    case "/teacher/students":
      return "学生档案";
    case "/teacher/classes":
      return "班级管理";
    case "/teacher/courses":
    case "/teacher/courses/[courseId]":
    case "/teacher/courses/[courseId]/lessons":
      return "课程管理";
    default:
      return "教师工作台";
  }
}

export async function TeacherSidebarShell({
  children,
  routeKey = "/teacher",
  activePath,
  headerTitle,
  headerDescription,
  headerActions,
}: TeacherSidebarShellProps) {
  const activeThemeId = await getActiveThemeId();
  const themeRuntime = activeThemeId ? await getActiveThemeRuntimeForCurrentActor(activeThemeId) : null;
  const layoutRuntime = themeRuntime?.layoutRuntime ?? DEFAULT_THEME_LAYOUT_RUNTIME;
  const surface = layoutRuntime.pages[routeKey] ?? layoutRuntime.defaultSurface;
  const shellMode = ALLOWLISTED_SHELL_MODES.includes(surface.shellMode) ? surface.shellMode : "left-nav";
  const secondaryNavVisible = surface.regions.some((region) => region.region === "secondary-nav" && region.visible);
  const contextPanelVisible = surface.regions.some((region) => region.region === "context-panel" && region.visible);
  const pageFooterVisible = surface.regions.some((region) => region.region === "page-footer" && region.visible);
  const shellTitle = headerTitle ?? resolveSurfaceLabel(routeKey);

  return (
    <div
      className="flex h-screen overflow-hidden bg-surface"
      data-theme-shell-mode={shellMode}
      data-route-surface={routeKey}
      style={{ gap: "var(--layout-shell-gap, 0rem)" }}
    >
      {shellMode === "left-nav" ? (
        <div
          className="shrink-0 [&>aside]:h-full [&>aside]:w-full"
          style={{
            width: "var(--layout-sidebar-width, 16rem)",
            margin: "var(--layout-shell-inset, 0.5rem) 0 var(--layout-shell-inset, 0.5rem) 0",
          }}
        >
          <Sidebar items={teacherSidebarItems} activePath={activePath} region="primary-nav" />
        </div>
      ) : null}

      <main
        className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface-container-low shadow-ambient"
        style={{
          margin:
            shellMode === "left-nav"
              ? "var(--layout-shell-inset, 0.5rem) var(--layout-shell-inset, 0.5rem) var(--layout-shell-inset, 0.5rem) 0"
              : "var(--layout-shell-inset, 0.5rem)",
          borderRadius: "var(--layout-content-radius, 2rem)",
        }}
      >
        {shellMode !== "left-nav" ? (
          <div className="px-4 pt-4 sm:px-5">
            <GlassNav items={teacherNavigationItems} brandHref="/teacher" brandLabel="OpenLearn Next" activePath={activePath} />
          </div>
        ) : null}

        <section className="shrink-0 px-5 pb-4 pt-5 sm:px-6" data-region="page-header">
          <div className="rounded-[1.5rem] bg-surface-container-lowest px-5 py-5 shadow-ambient">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm text-on-surface-variant">page-header</p>
                <h1 className="mt-2 text-2xl font-semibold text-on-surface">{shellTitle}</h1>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  {headerDescription ?? surface.summary.description}
                </p>
              </div>
              {headerActions ? <div className="flex items-center gap-3">{headerActions}</div> : null}
            </div>
          </div>
        </section>

        <div className="flex min-h-0 flex-1 gap-4 px-5 pb-5 sm:px-6">
          {secondaryNavVisible ? (
            <div className="hidden w-56 shrink-0 lg:block" data-region="secondary-nav">
              <Sidebar
                items={teacherSidebarItems}
                activePath={activePath}
                region="secondary-nav"
                title="辅栏导航"
                className="h-full"
              />
            </div>
          ) : null}

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex-1 overflow-y-auto rounded-[1.75rem] bg-surface-container-lowest" data-region="main-content">
              {children}
            </div>

            {pageFooterVisible ? (
              <footer className="rounded-[1.5rem] bg-surface-container-lowest px-5 py-4 text-sm text-on-surface-variant" data-region="page-footer">
                结构摘要：{surface.summary.description}
              </footer>
            ) : null}
          </div>

          {contextPanelVisible ? (
            <aside className="hidden w-72 shrink-0 xl:block" data-region="context-panel">
              <div className="rounded-[1.75rem] bg-surface-container-lowest p-5 shadow-ambient">
                <p className="text-sm text-on-surface-variant">context-panel</p>
                <h2 className="mt-2 text-lg font-semibold text-on-surface">当前主题结构</h2>
                <p className="mt-3 text-sm leading-6 text-on-surface-variant">{surface.summary.description}</p>
              </div>
            </aside>
          ) : null}
        </div>
      </main>
    </div>
  );
}
