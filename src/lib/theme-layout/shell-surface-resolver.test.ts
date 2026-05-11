import { describe, expect, it } from "vitest";

import type { ThemeLayoutRuntime } from "@/lib/dto/resource-ai";
import { DEFAULT_THEME_LAYOUT_RUNTIME } from "@/server/themes/tokens";
import { getShellSurfaceConfig, resolveShellVariant } from "@/lib/theme-layout/shell-surface-resolver";

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
  });

  it("keeps settings and resources on the shared rounded shell contract", () => {
    expect(getShellSurfaceConfig({ routeKey: "/settings", layoutRuntime: DEFAULT_THEME_LAYOUT_RUNTIME }).shellConfig).toEqual({
      mode: "left-nav",
      radius: "rounded",
      width: "default",
      chrome: "default",
    });
    expect(getShellSurfaceConfig({ routeKey: "/resources", layoutRuntime: DEFAULT_THEME_LAYOUT_RUNTIME }).shellConfig).toEqual({
      mode: "left-nav",
      radius: "rounded",
      width: "default",
      chrome: "default",
    });
  });

  it("returns structured future-safe chrome variants", () => {
    const teacherSurface = DEFAULT_THEME_LAYOUT_RUNTIME.pages["/teacher"];
    if (!teacherSurface) {
      throw new Error("/teacher runtime should be defined");
    }

    const layoutRuntime: ThemeLayoutRuntime = {
      ...DEFAULT_THEME_LAYOUT_RUNTIME,
      pages: {
        ...DEFAULT_THEME_LAYOUT_RUNTIME.pages,
        "/teacher": {
          ...teacherSurface,
          shellConfig: {
            mode: "left-nav",
            radius: "square",
            width: "full-width",
            chrome: "presentation",
          },
        },
      },
    };

    const resolved = getShellSurfaceConfig({ routeKey: "/teacher", layoutRuntime });

    expect(resolveShellVariant(resolved.shellConfig)).toBe("left-nav");
    expect(resolved.shellConfig.chrome).toBe("presentation");
    expect(["presentation", "focus", "fullscreen", "minimal"]).toContain(resolved.shellConfig.chrome);
  });
});
