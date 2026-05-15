import { describe, expect, it } from "vitest";

import type { ThemeLayoutRegionRuntime, ThemeLayoutRuntime } from "@/lib/dto/resource-ai";
import { DEFAULT_THEME_LAYOUT_RUNTIME } from "@/server/themes/tokens";
import {
  getShellSurfaceConfig,
  resolveShellVariant,
  resolveTeacherShellUiState,
} from "@/lib/theme-layout/shell-surface-resolver";
import { resolveTeacherThemeRouteSurface } from "@/lib/theme-layout/route-surface-registry";

const defaultSurface = DEFAULT_THEME_LAYOUT_RUNTIME.defaultSurface;

function buildRegion(
  region: ThemeLayoutRegionRuntime["region"],
  visible: boolean,
): ThemeLayoutRegionRuntime {
  const baseRegion = defaultSurface.regions.find((item) => item.region === region);

  if (!baseRegion) {
    throw new Error(`${region} runtime should be defined`);
  }

  return {
    ...baseRegion,
    visible,
  };
}

function buildRuntime(
  routeKey: keyof ThemeLayoutRuntime["pages"],
  override: Partial<ThemeLayoutRuntime["defaultSurface"]>,
): ThemeLayoutRuntime {
  const currentSurface = DEFAULT_THEME_LAYOUT_RUNTIME.pages[routeKey];
  if (!currentSurface) {
    throw new Error(`${routeKey} runtime should be defined`);
  }

  return {
    ...DEFAULT_THEME_LAYOUT_RUNTIME,
    pages: {
      ...DEFAULT_THEME_LAYOUT_RUNTIME.pages,
      [routeKey]: {
        ...currentSurface,
        ...override,
        shellConfig: {
          ...currentSurface.shellConfig,
          ...override.shellConfig,
        },
        regions: override.regions ?? currentSurface.regions,
        summary: override.summary ?? currentSurface.summary,
      },
    },
  };
}

describe("shell surface resolver", () => {
  it("resolves teacher home with square full-width immersive metadata", () => {
    const resolved = getShellSurfaceConfig({
      routeKey: "/teacher",
      layoutRuntime: DEFAULT_THEME_LAYOUT_RUNTIME,
    });

    expect(resolved.shellVariant).toBe("left-nav");
    expect(resolved.shellConfig).toEqual({
      mode: "left-nav",
      radius: "square",
      width: "full-width",
      chrome: "immersive",
    });
    expect(resolved.surfaceMetadata.label).toBe("教师工作台");

    const shellState = resolveTeacherShellUiState({
      themeSource: "active-theme",
      shellVariant: resolved.shellVariant,
      shellConfig: resolved.shellConfig,
      surfaceMetadata: resolved.surfaceMetadata,
    });

    expect(shellState.wrapper).toBe("aurora");
    expect(shellState.flags).toMatchObject({
      usesActiveThemeShell: true,
      isSquareShell: true,
      isFullWidthShell: true,
      isImmersiveChrome: true,
    });
    expect(shellState.layout.rootClassName).toContain("px-4 py-4");
    expect(shellState.layout.mainBorderRadius).toBe("0");
    expect(shellState.layout.mainContentClassName).toBe(
      "flex-1 overflow-y-auto bg-surface-container-lowest",
    );
    expect(shellState.header.variant).toBe("stage-hero");
  });

  it("keeps settings and resources on the shared rounded shell contract", () => {
    const settingsConfig = getShellSurfaceConfig({
      routeKey: "/settings",
      layoutRuntime: DEFAULT_THEME_LAYOUT_RUNTIME,
    });
    const resourcesConfig = getShellSurfaceConfig({
      routeKey: "/resources",
      layoutRuntime: DEFAULT_THEME_LAYOUT_RUNTIME,
    });

    expect(settingsConfig.shellConfig).toEqual({
      mode: "left-nav",
      radius: "rounded",
      width: "default",
      chrome: "default",
    });
    expect(resourcesConfig.shellConfig).toEqual({
      mode: "left-nav",
      radius: "rounded",
      width: "default",
      chrome: "default",
    });

    const shellState = resolveTeacherShellUiState({
      themeSource: "default",
      shellVariant: settingsConfig.shellVariant,
      shellConfig: settingsConfig.shellConfig,
      surfaceMetadata: settingsConfig.surfaceMetadata,
    });

    expect(shellState.wrapper).toBe("none");
    expect(shellState.flags).toMatchObject({
      usesActiveThemeShell: false,
      isSquareShell: false,
      isFullWidthShell: false,
      isImmersiveChrome: false,
    });
    expect(shellState.header.variant).toBe("surface-card");
    expect(shellState.header.className).toContain("rounded-[1.5rem]");
    expect(shellState.layout.mainBorderRadius).toBe(
      "var(--layout-content-radius, 2rem)",
    );
  });

  it("resolves /teacher/trends through the shared rounded teacher shell", () => {
    expect(resolveTeacherThemeRouteSurface("/teacher/trends")).toBe("/teacher/trends");
    expect(resolveTeacherThemeRouteSurface("/teacher/trends/session-1")).toBe("/teacher/trends");

    const resolved = getShellSurfaceConfig({
      routeKey: "/teacher/trends",
      layoutRuntime: DEFAULT_THEME_LAYOUT_RUNTIME,
    });

    expect(resolved.shellConfig).toEqual({
      mode: "left-nav",
      radius: "rounded",
      width: "default",
      chrome: "default",
    });
    expect(resolved.surfaceMetadata.label).toBe("班级趋势");
  });

  it("derives region visibility from metadata instead of jsx-local booleans", () => {
    const layoutRuntime = buildRuntime("/teacher", {
      regions: [
        buildRegion("secondary-nav", true),
        buildRegion("context-panel", true),
        buildRegion("page-footer", false),
      ],
    });

    const resolved = getShellSurfaceConfig({ routeKey: "/teacher", layoutRuntime });
    const shellState = resolveTeacherShellUiState({
      themeSource: "active-theme",
      shellVariant: resolved.shellVariant,
      shellConfig: resolved.shellConfig,
      surfaceMetadata: resolved.surfaceMetadata,
    });

    expect(shellState.visibility).toEqual({
      secondaryNav: true,
      contextPanel: true,
      pageFooter: false,
    });
  });

  it("returns structured future-safe chrome variants", () => {
    const layoutRuntime = buildRuntime("/teacher", {
      shellConfig: {
        mode: "left-nav",
        radius: "rounded",
        width: "default",
        chrome: "presentation",
      },
    });

    const resolved = getShellSurfaceConfig({ routeKey: "/teacher", layoutRuntime });
    const shellState = resolveTeacherShellUiState({
      themeSource: "active-theme",
      shellVariant: resolved.shellVariant,
      shellConfig: resolved.shellConfig,
      surfaceMetadata: resolved.surfaceMetadata,
    });

    expect(resolveShellVariant(resolved.shellConfig)).toBe("left-nav");
    expect(resolved.shellConfig.chrome).toBe("presentation");
    expect(["presentation", "focus", "fullscreen", "minimal"]).toContain(resolved.shellConfig.chrome);
    expect(shellState.flags.isImmersiveChrome).toBe(false);
    expect(shellState.header.variant).toBe("stage-hero");
    expect(shellState.layout.mainContentClassName).toBe(
      "flex-1 overflow-y-auto rounded-[1.75rem] bg-surface-container-lowest",
    );
  });
});
