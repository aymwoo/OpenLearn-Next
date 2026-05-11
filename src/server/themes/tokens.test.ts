import { describe, expect, it } from "vitest";

import type { ThemeTokenRegistry } from "@/lib/dto/resource-ai";
import { compileThemeLayoutRuntime, compileThemeTokensToCssVariables, validateThemeTokens } from "@/server/themes/tokens";

describe("theme token compiler", () => {
  it("rejects non-Lexend font families", () => {
    expect(validateThemeTokens({ typography: { fontFamily: "Inter" } })).toBe(false);
  });

  it("rejects unsupported layout keys and invalid layout values", () => {
    expect(validateThemeTokens({ layout: { "shell-gap": "large" } })).toBe(false);
    expect(validateThemeTokens({ layout: { "unknown-layout": "1rem" } as ThemeTokenRegistry["layout"] })).toBe(false);
  });

  it("accepts the three allowlisted shell modes and required regions", () => {
    for (const shellMode of ["left-nav", "top-nav", "top-nav-secondary-rail"] as const) {
      expect(
        validateThemeTokens({
          layout: {
            shell: {
              mode: shellMode,
              radius: "rounded",
              width: "default",
              chrome: "default",
              defaultRegions: [
                { region: "primary-nav" },
                { region: "page-header" },
                { region: "main-content", split: "60/40" },
              ],
            },
          },
        }),
      ).toBe(true);
    }
  });

  it("rejects hidden required regions and unsupported split ratios", () => {
    expect(
      validateThemeTokens({
        layout: {
          shell: {
            mode: "left-nav",
            radius: "rounded",
            width: "default",
            chrome: "default",
            defaultRegions: [
              { region: "primary-nav", visible: false },
              { region: "page-header" },
              { region: "main-content", split: "60/40" },
            ],
          },
        },
      }),
    ).toBe(false);

    expect(
      validateThemeTokens({
        layout: {
          shell: {
            mode: "left-nav",
            radius: "rounded",
            width: "default",
            chrome: "default",
            defaultRegions: [
              { region: "primary-nav" },
              { region: "page-header" },
              { region: "main-content", split: "20/80" as never },
            ],
          },
        },
      }),
    ).toBe(false);
  });

  it("compiles surfaces to color-prefixed CSS variables", () => {
    expect(compileThemeTokensToCssVariables({ surfaces: { "surface-container-low": "#eef1f3" } })).toEqual({
      "--color-surface-container-low": "#eef1f3",
    });
  });

  it("compiles allowed layout tokens to layout-prefixed CSS variables", () => {
    expect(compileThemeTokensToCssVariables({
      layout: {
        "shell-gap": "1rem",
        "shell-inset": "0.75rem",
        "content-radius": "1.25rem",
        "sidebar-width": "18rem",
        "unknown-layout": "3rem",
      } as ThemeTokenRegistry["layout"],
    })).toEqual({
      "--layout-shell-gap": "1rem",
      "--layout-shell-inset": "0.75rem",
      "--layout-content-radius": "1.25rem",
      "--layout-sidebar-width": "18rem",
    });
  });

  it("falls back at the region boundary when a page override is incompatible", () => {
    const runtime = compileThemeLayoutRuntime({
        layout: {
          shell: {
            mode: "top-nav",
            radius: "rounded",
            width: "default",
            chrome: "default",
            defaultRegions: [
              { region: "primary-nav" },
              { region: "page-header" },
            { region: "main-content", split: "60/40" },
          ],
        },
        pages: {
          "/settings": {
            shell: { mode: "top-nav-secondary-rail" },
            regions: [
              { region: "secondary-nav", visible: true },
              { region: "main-content", modules: ["resource-library"] },
            ],
          },
        } as ThemeTokenRegistry["layout"] extends { pages?: infer Pages } ? Pages : never,
      },
    });

    const settingsRuntime = runtime.pages["/settings"];

    expect(settingsRuntime).toBeDefined();
    if (!settingsRuntime) {
      throw new Error("/settings runtime should be defined");
    }

    expect(settingsRuntime.shellMode).toBe("top-nav-secondary-rail");
    expect(settingsRuntime.shellConfig.radius).toBe("rounded");
    expect(settingsRuntime.shellConfig.width).toBe("default");
    expect(settingsRuntime.shellConfig.chrome).toBe("default");
    expect(settingsRuntime.regions.find((region) => region.region === "secondary-nav")?.visible).toBe(true);
    expect(settingsRuntime.regions.find((region) => region.region === "main-content")?.modules).toEqual(["settings-general"]);
    expect(settingsRuntime.summary.fallbackRegions).toContain("main-content");
  });

  it("preserves shell metadata for teacher home and default shared routes", () => {
    const runtime = compileThemeLayoutRuntime({});

    expect(runtime.pages["/teacher"]?.shellConfig).toEqual({
      mode: "left-nav",
      radius: "square",
      width: "full-width",
      chrome: "immersive",
    });
    expect(runtime.pages["/settings"]?.shellConfig).toEqual({
      mode: "left-nav",
      radius: "rounded",
      width: "default",
      chrome: "default",
    });
    expect(runtime.pages["/resources"]?.shellConfig).toEqual({
      mode: "left-nav",
      radius: "rounded",
      width: "default",
      chrome: "default",
    });
  });

  it("returns future chrome enums structurally without changing today's render contract", () => {
    const runtime = compileThemeLayoutRuntime({
      layout: {
        shell: {
          mode: "left-nav",
          radius: "rounded",
          width: "default",
          chrome: "default",
          defaultRegions: [
            { region: "primary-nav" },
            { region: "page-header" },
            { region: "main-content", split: "60/40" },
          ],
        },
        pages: {
          "/teacher": {
            shell: { chrome: "presentation", width: "full-width", radius: "square" },
          },
        },
      },
    });

    expect(runtime.pages["/teacher"]?.shellConfig.chrome).toBe("presentation");
    expect(runtime.pages["/teacher"]?.shellConfig.width).toBe("full-width");
    expect(runtime.pages["/teacher"]?.shellConfig.radius).toBe("square");
  });
});
