// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/teacher",
}));

vi.mock("@/lib/dal/themes", () => ({
  getCurrentActorThemeRuntimeState: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

import type {
  ThemeLayoutRegionRuntime,
  ShellSurfaceMetadata,
  ThemeShellConfig,
} from "@/lib/dto/resource-ai";
import type { TeacherThemeRouteKey } from "@/lib/theme-layout/route-surface-registry";
import { TeacherSidebarShellFrame } from "@/components/shell/teacher-sidebar-shell";
import { DEFAULT_THEME_LAYOUT_RUNTIME } from "@/server/themes/tokens";

const defaultSurface = DEFAULT_THEME_LAYOUT_RUNTIME.defaultSurface;

function buildRegion(
  region: ThemeLayoutRegionRuntime["region"],
  visible: boolean,
): ThemeLayoutRegionRuntime {
  const baseRegion = defaultSurface.regions.find((item) => item.region === region);

  if (!baseRegion) {
    throw new Error(`Missing default region runtime for ${region}`);
  }

  return {
    ...baseRegion,
    visible,
  };
}

function buildSurfaceMetadata(
  overrides: Partial<ShellSurfaceMetadata> = {},
): ShellSurfaceMetadata {
  return {
    routeKey: "/teacher",
    label: "教师工作台",
    summary: {
      ...defaultSurface.summary,
      description: "统一的教师端壳层结构摘要。",
    },
    regions: defaultSurface.regions,
    ...overrides,
  };
}

function renderShell({
  routeKey = "/teacher",
  shellVariant = "left-nav",
  shellConfig = {
    mode: "left-nav",
    radius: "rounded",
    width: "default",
    chrome: "default",
  } satisfies ThemeShellConfig,
  surfaceMetadata = buildSurfaceMetadata(),
  themeSource = "default",
  hidePageHeader = false,
}: {
  routeKey?: TeacherThemeRouteKey;
  shellVariant?: ThemeShellConfig["mode"];
  shellConfig?: ThemeShellConfig;
  surfaceMetadata?: ShellSurfaceMetadata;
  themeSource?: "default" | "active-theme";
  hidePageHeader?: boolean;
} = {}) {
  return render(
    <TeacherSidebarShellFrame
      routeKey={routeKey}
      activePath="/teacher"
      shellVariant={shellVariant}
      shellConfig={shellConfig}
      surfaceMetadata={surfaceMetadata}
      themeSource={themeSource}
      hidePageHeader={hidePageHeader}
      headerActions={<button type="button">操作</button>}
    >
      <div>主内容</div>
    </TeacherSidebarShellFrame>,
  );
}

describe("TeacherSidebarShell theme layout hooks", () => {
  it("consumes resolver-driven shell config without route-string branching", () => {
    const { container } = renderShell({
      routeKey: "/settings",
      shellConfig: {
        mode: "left-nav",
        radius: "rounded",
        width: "default",
        chrome: "default",
      },
      themeSource: "active-theme",
    });

    const routeSurface = container.querySelector('[data-route-surface="/settings"]');
    const pageHeader = container.querySelector('[data-region="page-header"]');
    const mainContent = container.querySelector('[data-region="main-content"]');
    const primarySidebar = container.querySelector('[data-shell-region="primary-nav"]');
    const primarySidebarWrapper = primarySidebar?.parentElement;

    expect(routeSurface?.getAttribute("data-theme-layout-source")).toBe("active-theme");
    expect(routeSurface?.getAttribute("data-theme-shell-chrome")).toBe("default");
    expect(routeSurface?.className).toContain("px-4 py-4 sm:px-5");
    expect(pageHeader?.className).toContain("rounded-none");
    expect(mainContent?.className).toContain("bg-surface-container-lowest");
    expect(mainContent?.className).toContain("rounded-[1.75rem]");
    expect(primarySidebar?.getAttribute("data-shell-variant")).toBe("left-nav");
    expect(primarySidebarWrapper?.className).toContain("[&>aside]:w-full");
    expect(screen.getByRole("button", { name: "操作" })).toBeTruthy();
  });

  it("keeps shared rounded shell output unchanged for the default theme path", () => {
    const { container } = renderShell();

    const rootShell = container.querySelector('[data-route-surface="/teacher"]');
    const pageHeader = container.querySelector('[data-region="page-header"]');
    const mainContent = container.querySelector('[data-region="main-content"]');
    const primarySidebar = container.querySelector('[data-shell-region="primary-nav"]');
    const primaryNav = within(primarySidebar as HTMLElement).getByRole("navigation", {
      name: "教师端侧边导航",
    });

    expect(rootShell?.getAttribute("data-theme-layout-source")).toBe("default");
    expect(rootShell?.className).toContain("bg-surface");
    expect(within(pageHeader as HTMLElement).getByRole("heading", { level: 1, name: "教师工作台" })).toBeTruthy();
    expect(screen.getByText("统一的教师端壳层结构摘要。")).toBeTruthy();
    expect(screen.getByRole("button", { name: "操作" })).toBeTruthy();
    expect(screen.getByText("主内容")).toBeTruthy();
    expect(pageHeader?.className).toContain("rounded-[1.5rem]");
    expect(mainContent?.className).toContain("flex-1 overflow-y-auto");
    expect(within(primaryNav).getByRole("link", { name: "工作台" }).getAttribute("aria-current")).toBe("page");
  });

  it("renders shell regions from metadata visibility only", () => {
    const { container, rerender } = renderShell({
        surfaceMetadata: buildSurfaceMetadata({
          regions: [
            buildRegion("secondary-nav", true),
            buildRegion("context-panel", false),
            buildRegion("page-footer", true),
          ],
        }),
      });

    expect(screen.getByRole("navigation", { name: "教师端辅栏导航" })).toBeTruthy();
    expect(screen.getByRole("contentinfo", { name: "页面结构摘要" })).toBeTruthy();
    expect(screen.queryByLabelText("当前主题结构")).toBeNull();
    expect(container.querySelector('[data-region="secondary-nav"]')).toBeTruthy();

    rerender(
      <TeacherSidebarShellFrame
        routeKey="/teacher"
        activePath="/teacher"
        shellVariant="left-nav"
        shellConfig={{
          mode: "left-nav",
          radius: "rounded",
          width: "default",
          chrome: "default",
        }}
        surfaceMetadata={buildSurfaceMetadata({
          regions: [
            buildRegion("secondary-nav", false),
            buildRegion("context-panel", true),
            buildRegion("page-footer", false),
          ],
        })}
        themeSource="default"
        headerActions={<button type="button">操作</button>}
      >
        <div>主内容</div>
      </TeacherSidebarShellFrame>,
    );

    expect(screen.queryByRole("navigation", { name: "教师端辅栏导航" })).toBeNull();
    expect(screen.queryByRole("contentinfo", { name: "页面结构摘要" })).toBeNull();
    expect(screen.getByLabelText("当前主题结构")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "当前主题结构" })).toBeTruthy();
    expect(container.querySelector('[data-region="context-panel"]')).toBeTruthy();
  });

  it("omits page-header DOM entirely when hidePageHeader is true", () => {
    const { container } = renderShell({ hidePageHeader: true });

    expect(container.querySelector('[data-region="page-header"]')).toBeNull();
    expect(screen.queryByRole("heading", { level: 1, name: "教师工作台" })).toBeNull();
    expect(screen.queryByRole("button", { name: "操作" })).toBeNull();
    expect(screen.getByText("主内容")).toBeTruthy();
  });

  it("keeps page-header visible when hidePageHeader is false", () => {
    const { container } = renderShell({ hidePageHeader: false });

    expect(container.querySelector('[data-region="page-header"]')).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "教师工作台" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "操作" })).toBeTruthy();
  });
});
