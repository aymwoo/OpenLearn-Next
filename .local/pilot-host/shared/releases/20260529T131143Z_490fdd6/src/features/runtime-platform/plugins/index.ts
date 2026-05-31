import "server-only";

/**
 * Runtime platform plugin boundary placeholder.
 *
 * Phase 27 keeps plugin ownership under the same `runtime-platform` root so
 * later runtime host / event bus work can move here without creating a second
 * top-level feature root.
 */
export const runtimePlatformPluginBoundary = {
  status: "placeholder",
  ownership: "plugin runtime hooks stay under the runtime-platform root",
  cutoversDeferred: ["runtime host", "event bus", "websocket", "redis"],
} as const;
