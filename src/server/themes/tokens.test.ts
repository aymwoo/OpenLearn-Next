import { describe, expect, it } from "vitest";

import { compileThemeTokensToCssVariables, validateThemeTokens } from "@/server/themes/tokens";

describe("theme token compiler", () => {
  it("rejects non-Lexend font families", () => {
    expect(validateThemeTokens({ typography: { fontFamily: "Inter" } })).toBe(false);
  });

  it("rejects unsupported layout keys and invalid layout values", () => {
    expect(validateThemeTokens({ layout: { "shell-gap": "large" } })).toBe(false);
    expect(validateThemeTokens({ layout: { "unknown-layout": "1rem" } })).toBe(false);
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
      },
    })).toEqual({
      "--layout-shell-gap": "1rem",
      "--layout-shell-inset": "0.75rem",
      "--layout-content-radius": "1.25rem",
      "--layout-sidebar-width": "18rem",
    });
  });
});
