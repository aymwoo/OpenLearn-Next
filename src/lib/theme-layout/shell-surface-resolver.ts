import type {
  ShellSurfaceMetadata,
  ThemeLayoutRuntime,
  ThemeShellConfig,
  ThemeShellMode,
} from "@/lib/dto/resource-ai";
import {
  TEACHER_THEME_ROUTE_SURFACES,
  type TeacherThemeRouteKey,
} from "@/lib/theme-layout/route-surface-registry";

export type ShellVariant = ThemeShellMode;
export type ShellThemeSource = "default" | "active-theme";

type ShellSurfaceRegionName = ShellSurfaceMetadata["regions"][number]["region"];

export type TeacherShellUiState = {
  shellMode: ShellVariant;
  themeSource: ShellThemeSource;
  shellConfig: ThemeShellConfig;
  wrapper: "aurora" | "none";
  flags: {
    usesActiveThemeShell: boolean;
    isSquareShell: boolean;
    isFullWidthShell: boolean;
    isImmersiveChrome: boolean;
  };
  navigation: {
    showPrimaryNav: boolean;
    showTopNav: boolean;
    inverseTopNav: boolean;
  };
  visibility: {
    secondaryNav: boolean;
    contextPanel: boolean;
    pageFooter: boolean;
  };
  layout: {
    rootClassName: string;
    sidebarWrapperClassName: string;
    sidebarMargin: string;
    mainClassName: string;
    mainMargin: string;
    mainBorderRadius: string;
    topNavWrapperClassName: string;
    contentGridClassName: string;
    mainContentClassName: string;
    footerClassName: string;
    contextPanelCardClassName: string;
  };
  header: {
    variant: "stage-hero" | "surface-card";
    className: string;
    contentColumnClassName: string;
    titleClassName: string;
    actionsClassName: string;
  };
};

type GetShellSurfaceConfigInput = {
  routeKey: TeacherThemeRouteKey;
  layoutRuntime: ThemeLayoutRuntime;
};

type ResolveTeacherShellUiStateInput = {
  themeSource: ShellThemeSource;
  shellVariant: ShellVariant;
  shellConfig: ThemeShellConfig;
  surfaceMetadata: ShellSurfaceMetadata;
};

function hasVisibleRegion(
  surfaceMetadata: ShellSurfaceMetadata,
  regionName: ShellSurfaceRegionName,
) {
  return surfaceMetadata.regions.some(
    (region) => region.region === regionName && region.visible,
  );
}

export function resolveShellVariant(config: ThemeShellConfig): ShellVariant {
  return config.mode;
}

export function resolveTeacherShellUiState({
  themeSource,
  shellVariant,
  shellConfig,
  surfaceMetadata,
}: ResolveTeacherShellUiStateInput): TeacherShellUiState {
  const usesActiveThemeShell = themeSource === "active-theme";
  const isSquareShell = shellConfig.radius === "square";
  const isFullWidthShell = shellConfig.width === "full-width";
  const isImmersiveChrome = shellConfig.chrome === "immersive";
  const showPrimaryNav = shellVariant === "left-nav";

  return {
    shellMode: shellVariant,
    themeSource,
    shellConfig,
    wrapper: usesActiveThemeShell ? "aurora" : "none",
    flags: {
      usesActiveThemeShell,
      isSquareShell,
      isFullWidthShell,
      isImmersiveChrome,
    },
    navigation: {
      showPrimaryNav,
      showTopNav: !showPrimaryNav,
      inverseTopNav: usesActiveThemeShell,
    },
    visibility: {
      secondaryNav: hasVisibleRegion(surfaceMetadata, "secondary-nav"),
      contextPanel: hasVisibleRegion(surfaceMetadata, "context-panel"),
      pageFooter: hasVisibleRegion(surfaceMetadata, "page-footer"),
    },
    layout: {
      rootClassName: usesActiveThemeShell
        ? "flex h-screen overflow-hidden px-4 py-4 sm:px-5"
        : "flex h-screen overflow-hidden bg-surface",
      sidebarWrapperClassName: isSquareShell
        ? "shrink-0 [&>aside]:h-full [&>aside]:w-full [&>aside]:rounded-none"
        : "shrink-0 [&>aside]:h-full [&>aside]:w-full",
      sidebarMargin:
        "var(--layout-shell-inset, 0.5rem) 0 var(--layout-shell-inset, 0.5rem) 0",
      mainClassName: usesActiveThemeShell
        ? "flex min-w-0 flex-1 flex-col overflow-hidden bg-surface-container-low/96 shadow-[0_28px_80px_rgba(2,6,23,0.18)] ring-1 ring-white/10 backdrop-blur-xl"
        : "flex min-w-0 flex-1 flex-col overflow-hidden bg-surface-container-low shadow-ambient",
      mainMargin: showPrimaryNav
        ? "var(--layout-shell-inset, 0.5rem) var(--layout-shell-inset, 0.5rem) var(--layout-shell-inset, 0.5rem) 0"
        : "var(--layout-shell-inset, 0.5rem)",
      mainBorderRadius: isSquareShell
        ? "0"
        : "var(--layout-content-radius, 2rem)",
      topNavWrapperClassName: "px-4 pt-4 sm:px-5",
      contentGridClassName: "flex min-h-0 flex-1 gap-4 px-5 pb-5 sm:px-6",
      mainContentClassName: usesActiveThemeShell
        ? isFullWidthShell
          ? "flex-1 overflow-y-auto bg-surface-container-lowest"
          : "flex-1 overflow-y-auto rounded-[1.75rem] bg-surface-container-lowest"
        : "flex-1 overflow-y-auto",
      footerClassName:
        "rounded-[1.5rem] bg-surface-container-lowest px-5 py-4 text-sm text-on-surface-variant",
      contextPanelCardClassName:
        "rounded-[1.75rem] bg-surface-container-lowest p-5 shadow-ambient",
    },
    header: {
      variant: usesActiveThemeShell ? "stage-hero" : "surface-card",
      className: usesActiveThemeShell
        ? "w-full shrink-0 rounded-none"
        : isSquareShell
          ? "w-full shrink-0 bg-surface-container-lowest px-5 py-5 shadow-ambient"
          : "w-full shrink-0 rounded-[1.5rem] bg-surface-container-lowest px-5 py-5 shadow-ambient",
      contentColumnClassName: "max-w-none",
      titleClassName: "text-[2rem] sm:text-[2.4rem]",
      actionsClassName: usesActiveThemeShell
        ? "flex flex-wrap items-center justify-start gap-3 lg:justify-end"
        : "flex flex-wrap items-center gap-3",
    },
  };
}

export function getShellSurfaceConfig({
  routeKey,
  layoutRuntime,
}: GetShellSurfaceConfigInput): {
  shellVariant: ShellVariant;
  shellConfig: ThemeShellConfig;
  surfaceMetadata: ShellSurfaceMetadata;
} {
  const routeSurface = TEACHER_THEME_ROUTE_SURFACES[routeKey];
  const runtimeSurface = layoutRuntime.pages[routeKey] ?? layoutRuntime.defaultSurface;
  const shellConfig: ThemeShellConfig = {
    mode: runtimeSurface.shellConfig.mode,
    radius: runtimeSurface.shellConfig.radius,
    width: runtimeSurface.shellConfig.width,
    chrome: runtimeSurface.shellConfig.chrome,
  };

  return {
    shellVariant: resolveShellVariant(shellConfig),
    shellConfig,
    surfaceMetadata: {
      routeKey,
      label: routeSurface.label,
      regions: runtimeSurface.regions,
      summary: runtimeSurface.summary,
    },
  };
}
