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
  ShellSurfaceMetadata,
  ThemeShellConfig,
} from "@/lib/dto/resource-ai";
import { TeacherSidebarShellFrame } from "@/components/shell/teacher-sidebar-shell";

function buildSurfaceMetadata(
  overrides: Partial<ShellSurfaceMetadata> = {},
): ShellSurfaceMetadata {
  return {
    routeKey: "/teacher",
    label: "教师工作台",
    summary: {
      description: "统一的教师端壳层结构摘要。",
    },
    regions: [],
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
  themeSource = "default" as const,
} = {}) {
  return render(
    <TeacherSidebarShellFrame
      routeKey={routeKey}
      activePath="/teacher"
      shellVariant={shellVariant}
      shellConfig={shellConfig}
      surfaceMetadata={surfaceMetadata}
      themeSource={themeSource}
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
        radius: "square",
        width: "full-width",
        chrome: "immersive",
      },
      themeSource: "active-theme",
    });

    const routeSurface = container.querySelector('[data-route-surface="/settings"]');
    const pageHeader = container.querySelector('[data-region="page-header"]');
    const mainContent = container.querySelector('[data-region="main-content"]');
    const primarySidebar = container.querySelector('[data-shell-region="primary-nav"]');
    const primarySidebarWrapper = primarySidebar?.parentElement;

    expect(routeSurface?.getAttribute("data-theme-layout-source")).toBe("active-theme");
    expect(routeSurface?.getAttribute("data-theme-shell-chrome")).toBe("immersive");
    expect(routeSurface?.className).toContain("px-4 py-4 sm:px-5");
    expect(pageHeader?.className).toContain("w-full shrink-0 rounded-none");
    expect(mainContent?.className).toContain("bg-surface-container-lowest");
    expect(mainContent?.className).not.toContain("rounded-[1.75rem]");
    expect(primarySidebar?.getAttribute("data-shell-variant")).toBe("left-nav");
    expect(primarySidebarWrapper?.className).toContain("rounded-none");
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
          { region: "secondary-nav", visible: true },
          { region: "context-panel", visible: false },
          { region: "page-footer", visible: true },
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
            { region: "secondary-nav", visible: false },
            { region: "context-panel", visible: true },
            { region: "page-footer", visible: false },
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
});
