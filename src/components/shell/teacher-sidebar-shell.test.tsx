import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/dal/themes", () => ({
  getCurrentActorThemeRuntimeState: vi.fn(),
}));

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
  return renderToStaticMarkup(
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
    const markup = renderShell({
      routeKey: "/settings",
      shellConfig: {
        mode: "left-nav",
        radius: "square",
        width: "full-width",
        chrome: "immersive",
      },
      themeSource: "active-theme",
    });

    expect(markup).toContain('data-route-surface="/settings"');
    expect(markup).toContain('data-theme-layout-source="active-theme"');
    expect(markup).toContain("px-4 py-4 sm:px-5");
    expect(markup).toContain('data-region="main-content"');
    expect(markup).toContain("flex-1 overflow-y-auto bg-surface-container-lowest");
    expect(markup).toContain('data-region="page-header"');
    expect(markup).toContain("w-full shrink-0 rounded-none");
    expect(markup).toContain("[&amp;&gt;aside]:rounded-none");
  });

  it("keeps shared rounded shell output unchanged for the default theme path", () => {
    const markup = renderShell();

    expect(markup).toContain('data-theme-layout-source="default"');
    expect(markup).toContain("flex h-screen overflow-hidden bg-surface");
    expect(markup).toContain('data-region="page-header"');
    expect(markup).toContain("rounded-[1.5rem] bg-surface-container-lowest px-5 py-5 shadow-ambient");
    expect(markup).toContain('data-region="main-content"');
    expect(markup).toContain('class="flex-1 overflow-y-auto"');
    expect(markup).toContain("统一的教师端壳层结构摘要。");
    expect(markup).toContain(">操作<");
  });

  it("renders shell regions from metadata visibility only", () => {
    const withSecondaryAndFooter = renderShell({
      surfaceMetadata: buildSurfaceMetadata({
        regions: [
          { region: "secondary-nav", visible: true },
          { region: "context-panel", visible: false },
          { region: "page-footer", visible: true },
        ],
      }),
    });

    expect(withSecondaryAndFooter).toContain('data-region="secondary-nav"');
    expect(withSecondaryAndFooter).toContain('data-region="page-footer"');
    expect(withSecondaryAndFooter).not.toContain('data-region="context-panel"');

    const withContextPanel = renderShell({
      surfaceMetadata: buildSurfaceMetadata({
        regions: [
          { region: "secondary-nav", visible: false },
          { region: "context-panel", visible: true },
          { region: "page-footer", visible: false },
        ],
      }),
    });

    expect(withContextPanel).not.toContain('data-region="secondary-nav"');
    expect(withContextPanel).not.toContain('data-region="page-footer"');
    expect(withContextPanel).toContain('data-region="context-panel"');
  });
});
