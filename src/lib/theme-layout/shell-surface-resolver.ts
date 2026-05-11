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

type GetShellSurfaceConfigInput = {
  routeKey: TeacherThemeRouteKey;
  layoutRuntime: ThemeLayoutRuntime;
};

export function resolveShellVariant(config: ThemeShellConfig): ShellVariant {
  return config.mode;
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
