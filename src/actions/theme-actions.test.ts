import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync("src/actions/theme-actions.ts", "utf8");
const cookieSource = readFileSync("src/lib/theme-cookie.ts", "utf8");
const injectorSource = readFileSync("src/components/theme/theme-injector.tsx", "utf8");
const layoutSource = readFileSync("src/app/layout.tsx", "utf8");

describe("theme runtime actions", () => {
  it("defines the active theme cookie contract", () => {
    expect(cookieSource).toContain('ACTIVE_THEME_COOKIE = "activeThemeId"');
    expect(cookieSource).toContain("export async function getActiveThemeId");
    expect(cookieSource).toContain("export async function setActiveThemeId");
    expect(cookieSource).toContain("export async function clearActiveThemeId");
  });

  it("exports theme actions and revalidates the root layout", () => {
    expect(source).toContain("export async function setActiveThemeAction");
    expect(source).toContain("export async function registerThemeTokensAction");
    expect(source).toContain('revalidatePath("/", "layout")');
    expect(source).toContain("updateTag(cacheTags.themeRegistry)");
    expect(source).toContain("updateTag(cacheTags.theme(theme.id))");
  });

  it("injects active theme styles through an actor-scoped server component", () => {
    expect(injectorSource).toContain("export async function ThemeInjector");
    expect(injectorSource).toContain("getActiveThemeRuntimeForCurrentActor");
    expect(injectorSource).toContain('id="theme-injector"');
    expect(injectorSource).toContain("theme-layout-runtime");
    expect(layoutSource).toContain("ThemeInjector");
    expect(layoutSource).toContain("<ThemeInjector />");
  });
});
