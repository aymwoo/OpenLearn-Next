/**
 * Schedule feature boundary map.
 *
 * This file is the landing zone for the Phase 18 schedule feature migration.
 * Real schedule behavior now lives under `src/features/schedule/*`, while
 * legacy top-level `src/actions` and `src/lib/dal` files remain compatibility
 * re-exports. New app entrypoints should prefer `@/features/schedule/*`
 * imports so later file moves stay local to the feature root.
 */

export const scheduleFeatureBoundaryMap = {
  publicEntrypoints: [
    "@/features/schedule",
    "@/features/schedule/runtime",
    "@/features/schedule/import",
    "@/features/schedule/operations",
    "@/features/schedule/reminders",
    "@/features/schedule/assistant",
    "@/features/schedule/shared",
  ],
  implementationSources: {
    runtime: [
      "@/features/schedule/runtime/server",
      "@/components/surfaces/teacher-schedule-surface",
      "@/features/schedule/shared/dto/runtime",
    ],
    import: [
      "@/features/schedule/import/actions",
      "@/features/schedule/import/server",
      "@/components/surfaces/schedule-import-review-surface",
      "@/features/schedule/shared/dto/import",
    ],
    operations: [
      "@/features/schedule/operations/actions",
      "@/features/schedule/operations/server",
      "@/components/surfaces/schedule-operations-surface",
      "@/features/schedule/shared/dto/operations",
    ],
    reminders: [
      "@/features/schedule/reminders/actions",
      "@/features/schedule/reminders/server",
      "@/components/surfaces/schedule-reminder-surface",
      "@/features/schedule/shared/dto/reminders",
    ],
    assistant: [
      "@/features/schedule/assistant/actions",
      "@/features/schedule/assistant/server",
      "@/components/surfaces/schedule-assistant-surface",
      "@/features/schedule/shared/dto/assistant",
    ],
  },
  rules: [
    "App routes should import schedule read models and surfaces from `@/features/schedule/*` instead of legacy DAL or surface paths.",
    "Feature-local DTO contracts now live under `@/features/schedule/shared/dto/*`; `@/lib/dto/schedule` remains a compatibility re-export during migration.",
    "Schedule auth access should flow through `@/features/schedule/shared/auth` instead of importing `lesson-authoring.assertActiveTeacher` directly.",
    "Schedule cache invalidation and tag names should flow through `@/features/schedule/shared/cache` instead of using raw schedule tags in every action file.",
    "Runtime reads stay read-only and must not depend on raw import staging rows.",
    "Assistant and plugin flows stay proposal-only; approval can create drafts but must not write runtime schedule rows directly.",
    "Legacy top-level schedule action/DAL files should remain compatibility re-exports once a subdomain's real implementation has moved under `src/features/schedule/*`.",
  ],
} as const;
