import { ThemeTokenRegistry } from "@/lib/dto/resource-ai";

export const DESIGN_SYSTEM_GUARDS = {
  fontFamily: "Lexend",
  noLineSurfaces: true,
  simplifiedChinese: true,
  permittedSurfaceRoles: [
    "surface",
    "surface-container-low",
    "surface-container-lowest",
    "primary",
    "primary-container",
  ],
};

export function validateThemeTokens(tokens: ThemeTokenRegistry): boolean {
  if (tokens.typography) {
    for (const [key, value] of Object.entries(tokens.typography)) {
      if (key === "fontFamily" && value !== "Lexend") return false;
    }
  }

  if (tokens.surfaces) {
    for (const key of Object.keys(tokens.surfaces)) {
      if (!DESIGN_SYSTEM_GUARDS.permittedSurfaceRoles.includes(key)) {
        return false;
      }
    }
  }

  return true;
}

export function compileThemeTokensToCssVariables(tokens: ThemeTokenRegistry): Record<string, string> {
  const cssVars: Record<string, string> = {};

  if (tokens.colors) {
    for (const [key, value] of Object.entries(tokens.colors)) {
      cssVars[`--color-${key}`] = value;
    }
  }

  if (tokens.surfaces) {
    for (const [key, value] of Object.entries(tokens.surfaces)) {
      cssVars[`--color-${key}`] = value;
    }
  }

  if (tokens.radius) {
    for (const [key, value] of Object.entries(tokens.radius)) {
      cssVars[`--radius-${key}`] = value;
    }
  }

  if (tokens.typography) {
    for (const [key, value] of Object.entries(tokens.typography)) {
      cssVars[`--typography-${key}`] = value;
    }
  }

  return cssVars;
}
