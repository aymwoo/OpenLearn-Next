import { z } from "zod";

export const PlatformAuthorityAreaSchema = z.enum([
  "command_execution",
  "action_registry",
  "plugin_lifecycle_orchestration",
  "platform_event_outbox",
]);

export const PlatformLegacySeamPostureSchema = z.enum([
  "future_command_producer_adapter",
  "plugin_domain_dal",
  "static_implementation_catalog",
  "runtime_transport_only",
]);

export const PLATFORM_CORE_AUTHORITY_NOTES = [
  "Phase 50 boundary freeze: platform-core is the authoritative orchestration layer for v3.0 phase 1.",
  "Authority naming parity follows .planning/phases/50-boundary-freeze-and-platform-vocabulary/50-OWNERSHIP-MAP.md.",
  "This anchor is contract-only: no dispatch, handler registry, outbox write, or lifecycle orchestration implementation belongs here.",
] as const;

export type PlatformAuthorityArea = z.infer<typeof PlatformAuthorityAreaSchema>;
export type PlatformLegacySeamPosture = z.infer<typeof PlatformLegacySeamPostureSchema>;
