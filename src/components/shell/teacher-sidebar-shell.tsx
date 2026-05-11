import type { ReactNode } from "react";

import { teacherNavigationItems } from "@/lib/navigation";
import { getCurrentActorThemeRuntimeState } from "@/lib/dal/themes";
import type { TeacherThemeRouteKey } from "@/lib/theme-layout/route-surface-registry";
import {
  getShellSurfaceConfig,
  resolveTeacherShellUiState,
} from "@/lib/theme-layout/shell-surface-resolver";
import { AuroraShell } from "@/components/shell/aurora-shell";
import { Sidebar } from "@/components/shell/sidebar";
import { GlassNav } from "@/components/shell/glass-nav";
import { StageHero } from "@/components/surfaces/stage-hero";
import { DEFAULT_THEME_LAYOUT_RUNTIME } from "@/server/themes/tokens";
import type { ShellSurfaceMetadata, ThemeShellConfig } from "@/lib/dto/resource-ai";

const teacherSidebarItems = [
  { label: "工作台", href: "/teacher", icon: "LayoutDashboard" },
  { label: "班级管理", href: "/teacher/classes", icon: "GraduationCap" },
  { label: "课程管理", href: "/teacher/courses", icon: "BookOpen" },
  { label: "学生档案", href: "/teacher/students", icon: "Users" },
  { label: "教学资源", href: "/resources", icon: "FolderKanban" },
  { label: "批改中心", href: "/teacher/review", icon: "CheckSquare" },
  { label: "数据报表", href: "/teacher/reports", icon: "LineChart" },
] as const;

type TeacherSidebarShellProps = {
  children: ReactNode;
  routeKey?: TeacherThemeRouteKey;
  activePath?: string;
  headerTitle?: string;
  headerDescription?: string;
  headerActions?: ReactNode;
};

type TeacherSidebarShellFrameProps = TeacherSidebarShellProps & {
  shellVariant?: ThemeShellConfig["mode"];
  shellConfig?: ThemeShellConfig;
  surfaceMetadata?: ShellSurfaceMetadata;
  themeSource?: "default" | "active-theme";
};

export function TeacherSidebarShellFrame({
  children,
  routeKey = "/teacher",
  activePath,
  headerTitle,
  headerDescription,
  headerActions,
  shellVariant = "left-nav",
  shellConfig = DEFAULT_THEME_LAYOUT_RUNTIME.defaultSurface.shellConfig,
  surfaceMetadata = {
    routeKey: "/teacher",
    label: "教师工作台",
    regions: DEFAULT_THEME_LAYOUT_RUNTIME.defaultSurface.regions,
    summary: DEFAULT_THEME_LAYOUT_RUNTIME.defaultSurface.summary,
  },
  themeSource = "default",
}: TeacherSidebarShellFrameProps) {
  const shellState = resolveTeacherShellUiState({
    themeSource,
    shellVariant,
    shellConfig,
    surfaceMetadata,
  });
  const shellTitle = headerTitle ?? surfaceMetadata.label;
  const shellDescription =
    headerDescription ?? surfaceMetadata.summary.description;

  const shell = (
    <div
      className={shellState.layout.rootClassName}
      data-theme-layout-source={themeSource}
      data-theme-shell-mode={shellState.shellMode}
      data-theme-shell-chrome={shellConfig.chrome}
      data-route-surface={routeKey}
      style={{ gap: "var(--layout-shell-gap, 0rem)" }}
    >
      {shellState.navigation.showPrimaryNav ? (
        <div
          className={shellState.layout.sidebarWrapperClassName}
          style={{
            width: "var(--layout-sidebar-width, 16rem)",
            margin: shellState.layout.sidebarMargin,
          }}
        >
          <Sidebar items={teacherSidebarItems} activePath={activePath} region="primary-nav" />
        </div>
      ) : null}

      <main
        className={shellState.layout.mainClassName}
        style={{
          margin: shellState.layout.mainMargin,
          borderRadius: shellState.layout.mainBorderRadius,
        }}
      >
        {shellState.navigation.showTopNav ? (
          <div className={shellState.layout.topNavWrapperClassName}>
            <GlassNav
              items={teacherNavigationItems}
              brandHref="/teacher"
              brandLabel="OpenLearn Next"
              activePath={activePath}
              inverse={shellState.navigation.inverseTopNav}
            />
          </div>
        ) : null}

        {shellState.header.variant === "stage-hero" ? (
          <StageHero
            badge={surfaceMetadata.label}
            title={shellTitle}
            description={shellDescription}
            data-region="page-header"
            className={shellState.header.className}
            contentColumnClassName={shellState.header.contentColumnClassName}
            titleClassName={shellState.header.titleClassName}
            aside={
              headerActions ? (
                <div className={shellState.header.actionsClassName}>
                  {headerActions}
                </div>
              ) : null
            }
          />
        ) : (
          <div
            className={shellState.header.className}
            data-region="page-header"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-on-surface-variant">page-header</p>
                <h1 className="mt-2 text-2xl font-semibold text-on-surface">{shellTitle}</h1>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">{shellDescription}</p>
              </div>
              {headerActions ? (
                <div className={shellState.header.actionsClassName}>
                  {headerActions}
                </div>
              ) : null}
            </div>
          </div>
        )}

        <div className={shellState.layout.contentGridClassName}>
          {shellState.visibility.secondaryNav ? (
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
            <div className={shellState.layout.mainContentClassName} data-region="main-content">
              {children}
            </div>

            {shellState.visibility.pageFooter ? (
              <footer className={shellState.layout.footerClassName} data-region="page-footer">
                结构摘要：{surfaceMetadata.summary.description}
              </footer>
            ) : null}
          </div>

          {shellState.visibility.contextPanel ? (
            <aside className="hidden w-72 shrink-0 xl:block" data-region="context-panel">
              <div className={shellState.layout.contextPanelCardClassName}>
                <p className="text-sm text-on-surface-variant">context-panel</p>
                <h2 className="mt-2 text-lg font-semibold text-on-surface">当前主题结构</h2>
                <p className="mt-3 text-sm leading-6 text-on-surface-variant">{surfaceMetadata.summary.description}</p>
              </div>
            </aside>
          ) : null}
        </div>
      </main>
    </div>
  );

  return shellState.wrapper === "aurora" ? <AuroraShell>{shell}</AuroraShell> : shell;
}

export async function TeacherSidebarShell(props: TeacherSidebarShellProps) {
  const { layoutRuntime, themeSource } = await getCurrentActorThemeRuntimeState();
  const { shellVariant, shellConfig, surfaceMetadata } = getShellSurfaceConfig({
    routeKey: props.routeKey ?? "/teacher",
    layoutRuntime,
  });

  return (
    <TeacherSidebarShellFrame
      {...props}
      shellVariant={shellVariant}
      shellConfig={shellConfig}
      surfaceMetadata={surfaceMetadata}
      themeSource={themeSource}
    />
  );
}
