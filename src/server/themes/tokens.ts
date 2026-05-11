import {
  ThemeShellConfig,
  ThemeLayoutContract,
  ThemeLayoutRegion,
  ThemeLayoutRegionKey,
  ThemeLayoutRuntime,
  ThemeLayoutSummary,
  ThemePageModuleKey,
  ThemePageSurfaceRuntime,
  ThemeTokenRegistry,
  ThemeTokenRegistrySchema,
  ThemeShellMode,
} from "@/lib/dto/resource-ai";
import {
  TEACHER_THEME_ROUTE_KEYS,
  TEACHER_THEME_ROUTE_SURFACES,
  THEME_LAYOUT_REQUIRED_REGIONS,
  type TeacherThemeRouteKey,
  type ThemeLayoutSplit,
} from "@/lib/theme-layout/route-surface-registry";

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
  permittedLayoutRoles: [
    "shell-gap",
    "shell-inset",
    "content-radius",
    "sidebar-width",
  ],
};

const CSS_LENGTH_PATTERN = /^(?:0|\d+(?:\.\d+)?(?:px|rem|vw|vh|%))$/;

const PRIMARY_NAV_MODULES: readonly ThemePageModuleKey[] = ["workspace-nav", "workspace-status"];
const PAGE_HEADER_MODULES: readonly ThemePageModuleKey[] = ["page-title", "page-actions"];
const PAGE_FOOTER_MODULES: readonly ThemePageModuleKey[] = ["status-footer"];
const DEFAULT_THEME_SHELL_MODE: ThemeShellMode = "left-nav";
const DEFAULT_MAIN_SPLIT: ThemeLayoutSplit = "60/40";
const ALLOWLISTED_THEME_SHELL_MODES = ["left-nav", "top-nav", "top-nav-secondary-rail"] as const;

type ThemeRegionState = {
  region: ThemeLayoutRegionKey;
  visible: boolean;
  modules: ThemePageModuleKey[];
  split: ThemeLayoutSplit | null;
  fallback: boolean;
};

type ThemeRegionMap = Record<ThemeLayoutRegionKey, ThemeRegionState>;

function isValidLayoutValue(value: string) {
  return CSS_LENGTH_PATTERN.test(value.trim());
}

function getLayoutContract(layout: ThemeTokenRegistry["layout"]): ThemeLayoutContract | null {
  if (!layout || Array.isArray(layout) || typeof layout !== "object" || !("shell" in layout)) {
    return null;
  }

  return layout;
}

function getLayoutTokens(layout: ThemeTokenRegistry["layout"]): Record<string, string> | null {
  if (!layout || Array.isArray(layout) || typeof layout !== "object") {
    return null;
  }

  if ("shell" in layout) {
    return layout.tokens ?? null;
  }

  return layout;
}

function hasRequiredRegions(regions: readonly ThemeLayoutRegion[]) {
  const regionMap = new Map(regions.map((region) => [region.region, region]));
  return THEME_LAYOUT_REQUIRED_REGIONS.every((requiredRegion) => {
    const config = regionMap.get(requiredRegion);
    return Boolean(config) && config?.visible !== false;
  });
}

export function validateThemeTokens(tokens: ThemeTokenRegistry): boolean {
  const parsed = ThemeTokenRegistrySchema.safeParse(tokens);
  if (!parsed.success) {
    return false;
  }

  const validatedTokens = parsed.data;

  if (validatedTokens.typography) {
    for (const [key, value] of Object.entries(validatedTokens.typography)) {
      if (key === "fontFamily" && value !== "Lexend") return false;
    }
  }

  if (validatedTokens.surfaces) {
    for (const key of Object.keys(validatedTokens.surfaces)) {
      if (!DESIGN_SYSTEM_GUARDS.permittedSurfaceRoles.includes(key)) {
        return false;
      }
    }
  }

  const layoutTokens = getLayoutTokens(validatedTokens.layout);
  if (layoutTokens) {
    for (const [key, value] of Object.entries(layoutTokens)) {
      if (!DESIGN_SYSTEM_GUARDS.permittedLayoutRoles.includes(key) || !isValidLayoutValue(value)) {
        return false;
      }
    }
  }

  const layoutContract = getLayoutContract(validatedTokens.layout);
  if (layoutContract) {
    if (!hasRequiredRegions(layoutContract.shell.defaultRegions)) {
      return false;
    }

    for (const override of Object.values(layoutContract.pages ?? {})) {
      for (const region of override.regions ?? []) {
        if (THEME_LAYOUT_REQUIRED_REGIONS.includes(region.region as (typeof THEME_LAYOUT_REQUIRED_REGIONS)[number]) && region.visible === false) {
          return false;
        }
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

  const layoutTokens = getLayoutTokens(tokens.layout);
  if (layoutTokens) {
    for (const [key, value] of Object.entries(layoutTokens)) {
      if (DESIGN_SYSTEM_GUARDS.permittedLayoutRoles.includes(key) && isValidLayoutValue(value)) {
        cssVars[`--layout-${key}`] = value;
      }
    }
  }

  return cssVars;
}

function shellModeLabel(shellMode: ThemeShellMode) {
  switch (shellMode) {
    case "top-nav":
      return "顶部导航";
    case "top-nav-secondary-rail":
      return "顶部导航 + 左侧辅栏";
    default:
      return "左侧导航";
  }
}

function splitLabel(split: ThemeLayoutSplit) {
  return `主内容 ${split.replace("/", ":")}`;
}

function createBaseRegions(routeKey: TeacherThemeRouteKey, shellMode: ThemeShellMode): ThemeRegionMap {
  const surface = TEACHER_THEME_ROUTE_SURFACES[routeKey];

  return {
    "primary-nav": {
      region: "primary-nav" as const,
      visible: true,
      modules: [...PRIMARY_NAV_MODULES],
      split: null,
      fallback: false,
    },
    "secondary-nav": {
      region: "secondary-nav" as const,
      visible: shellMode === "top-nav-secondary-rail",
      modules: [] as ThemePageModuleKey[],
      split: null,
      fallback: false,
    },
    "page-header": {
      region: "page-header" as const,
      visible: true,
      modules: [...PAGE_HEADER_MODULES],
      split: null,
      fallback: false,
    },
    "main-content": {
      region: "main-content" as const,
      visible: true,
      modules: [...surface.allowedModules],
      split: surface.defaultSplit,
      fallback: false,
    },
    "context-panel": {
      region: "context-panel" as const,
      visible: false,
      modules: [] as ThemePageModuleKey[],
      split: surface.defaultSplit,
      fallback: false,
    },
    "page-footer": {
      region: "page-footer" as const,
      visible: false,
      modules: [...PAGE_FOOTER_MODULES],
      split: null,
      fallback: false,
    },
  };
}

function isRegionRequired(region: ThemeLayoutRegionKey) {
  return THEME_LAYOUT_REQUIRED_REGIONS.includes(region as (typeof THEME_LAYOUT_REQUIRED_REGIONS)[number]);
}

function getAllowedModules(routeKey: TeacherThemeRouteKey, region: ThemeLayoutRegionKey) {
  if (region === "primary-nav") {
    return PRIMARY_NAV_MODULES;
  }

  if (region === "page-header") {
    return PAGE_HEADER_MODULES;
  }

  if (region === "page-footer") {
    return PAGE_FOOTER_MODULES;
  }

  return TEACHER_THEME_ROUTE_SURFACES[routeKey].allowedModules;
}

function applyRegionOverride(
  routeKey: TeacherThemeRouteKey,
  baseRegions: ThemeRegionMap,
  override: ThemeLayoutRegion,
  fallbackRegions: ThemeLayoutRegionKey[],
) {
  const baseRegion = baseRegions[override.region];
  if (!baseRegion) {
    return;
  }

  if (isRegionRequired(override.region) && override.visible === false) {
    baseRegions[override.region] = {
      ...baseRegion,
      fallback: true,
    };
    fallbackRegions.push(override.region);
    return;
  }

  const allowedModules = getAllowedModules(routeKey, override.region);
  const hasUnsupportedModule = (override.modules ?? []).some((module) => !allowedModules.includes(module));
  if (hasUnsupportedModule) {
    baseRegions[override.region] = {
      ...baseRegion,
      fallback: true,
    };
    fallbackRegions.push(override.region);
    return;
  }

  baseRegions[override.region] = {
    ...baseRegion,
    visible: override.visible ?? baseRegion.visible,
    modules: override.modules ? [...override.modules] : baseRegion.modules,
    split: override.split ?? baseRegion.split,
  };
}

function buildSummary(shellMode: ThemeShellMode, mainSplit: ThemeLayoutSplit, regions: ThemeRegionMap, fallbackRegions: ThemeLayoutRegionKey[]): ThemeLayoutSummary {
  const helperRegionSummary = [
    `${regions["secondary-nav"].visible ? "启用" : "未启用"}左侧辅栏`,
    `${regions["context-panel"].visible ? "启用" : "未启用"}上下文侧栏`,
    `${regions["page-footer"].visible ? "启用" : "未启用"}页面底栏`,
  ];
  const fallbackLabel = fallbackRegions.length > 0 ? `局部回退：${fallbackRegions.join("、")}` : null;

  return {
    shellMode,
    shellLabel: shellModeLabel(shellMode),
    mainSplit,
    mainSplitLabel: splitLabel(mainSplit),
    helperRegionSummary,
    fallbackRegions,
    fallbackLabel,
    description: [shellModeLabel(shellMode), splitLabel(mainSplit), ...helperRegionSummary, fallbackLabel].filter(Boolean).join(" / "),
  };
}

function getShellConfig(routeKey: TeacherThemeRouteKey, layoutContract: ThemeLayoutContract | null): ThemeShellConfig {
  const routeDefaults = TEACHER_THEME_ROUTE_SURFACES[routeKey].shell;
  const shellDefaults = layoutContract?.shell;
  const pageShellOverride = layoutContract?.pages?.[routeKey]?.shell;

  return {
    mode: pageShellOverride?.mode ?? shellDefaults?.mode ?? routeDefaults.mode,
    radius: pageShellOverride?.radius ?? shellDefaults?.radius ?? routeDefaults.radius,
    width: pageShellOverride?.width ?? shellDefaults?.width ?? routeDefaults.width,
    chrome: pageShellOverride?.chrome ?? shellDefaults?.chrome ?? routeDefaults.chrome,
  };
}

function compileSurface(routeKey: TeacherThemeRouteKey, layoutContract: ThemeLayoutContract | null): ThemePageSurfaceRuntime {
  const shellConfig = getShellConfig(routeKey, layoutContract);
  const shellMode = ALLOWLISTED_THEME_SHELL_MODES.includes(shellConfig.mode) ? shellConfig.mode : DEFAULT_THEME_SHELL_MODE;
  const baseRegions = createBaseRegions(routeKey, shellMode);
  const fallbackRegions: ThemeLayoutRegionKey[] = [];

  for (const region of layoutContract?.shell.defaultRegions ?? []) {
    applyRegionOverride(routeKey, baseRegions, region, fallbackRegions);
  }

  for (const region of layoutContract?.pages?.[routeKey]?.regions ?? []) {
    applyRegionOverride(routeKey, baseRegions, region, fallbackRegions);
  }

  const mainSplit = (baseRegions["main-content"].split ?? DEFAULT_MAIN_SPLIT) as ThemeLayoutSplit;
  const summary = buildSummary(shellMode, mainSplit, baseRegions, Array.from(new Set(fallbackRegions)));

  return {
    routeKey,
    shellMode,
    shellConfig: {
      ...shellConfig,
      mode: shellMode,
    },
    regions: [
      baseRegions["primary-nav"],
      baseRegions["secondary-nav"],
      baseRegions["page-header"],
      baseRegions["main-content"],
      baseRegions["context-panel"],
      baseRegions["page-footer"],
    ],
    summary,
  };
}

export const DEFAULT_THEME_LAYOUT_RUNTIME: ThemeLayoutRuntime = (() => {
  const pages = Object.fromEntries(
    TEACHER_THEME_ROUTE_KEYS.map((routeKey) => [routeKey, compileSurface(routeKey, null)]),
  ) as Record<TeacherThemeRouteKey, ThemePageSurfaceRuntime>;

  return {
    defaultSurface: pages["/teacher"],
    pages,
    summary: pages["/teacher"].summary,
  };
})();

export function compileThemeLayoutRuntime(tokens: ThemeTokenRegistry): ThemeLayoutRuntime {
  const parsed = ThemeTokenRegistrySchema.safeParse(tokens);
  if (!parsed.success) {
    return DEFAULT_THEME_LAYOUT_RUNTIME;
  }

  const layoutContract = getLayoutContract(parsed.data.layout);
  const pages = Object.fromEntries(
    TEACHER_THEME_ROUTE_KEYS.map((routeKey) => [routeKey, compileSurface(routeKey, layoutContract)]),
  ) as Record<TeacherThemeRouteKey, ThemePageSurfaceRuntime>;

  return {
    defaultSurface: pages["/teacher"],
    pages,
    summary: pages["/teacher"].summary,
  };
}
