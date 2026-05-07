import { describe, expect, it } from "vitest";

import { compileThemeTokensToCssVariables, validateThemeTokens } from "@/server/themes/tokens";

describe("theme token compiler", () => {
  it("rejects non-Lexend font families", () => {
    expect(validateThemeTokens({ typography: { fontFamily: "Inter" } })).toBe(false);
  });

  it("compiles surfaces to color-prefixed CSS variables", () => {
    expect(compileThemeTokensToCssVariables({ surfaces: { "surface-container-low": "#eef1f3" } })).toEqual({
      "--color-surface-container-low": "#eef1f3",
    });
  });
});
