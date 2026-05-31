/**
 * Runtime platform feature boundary map.
 *
 * This file is the landing zone for the Phase 27 runtime-platform migration.
 * Route consumers should move to `@/features/runtime-platform/*` public APIs,
 * while legacy DAL modules remain compatibility shims until deeper V2 moves are
 * complete.
 */

export const runtimePlatformBoundaryMap = {
  publicEntrypoints: [
    "@/features/runtime-platform",
    "@/features/runtime-platform/authoring",
    "@/features/runtime-platform/launch",
    "@/features/runtime-platform/classroom",
    "@/features/runtime-platform/player",
    "@/features/runtime-platform/plugins",
  ],
  implementationSources: {
    authoring: ["@/lib/dal/lesson-authoring"],
    launch: ["@/lib/dal/classroom"],
    classroom: ["@/lib/dal/classroom"],
    player: ["@/lib/dal/learning"],
    plugins: ["@/lib/dal/plugins", "@/lib/dal/themes"],
  },
  rules: [
    "Route pages must import runtime-platform capabilities from `@/features/runtime-platform/*` instead of direct `@/lib/dal/*` deep imports.",
    "The `runtime-platform` root stays single-root with subdomains (`authoring`, `launch`, `classroom`, `player`, `plugins`) during compatibility migration.",
    "Legacy routes keep working because legacy DAL entrypoints remain compatibility shims behind the new public barrels.",
    "Compatibility period changes must preserve existing URLs, query contracts, and visible classroom behavior while imports migrate.",
    "Public barrels are allowlisted surfaces only; do not expose ad hoc deep implementation paths from route consumers.",
    "This phase does not perform event bus cutover, WebSocket enablement, Redis requirements, or runtime host activation.",
  ],
} as const;
