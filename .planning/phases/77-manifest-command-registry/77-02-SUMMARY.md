---
phase: 77-manifest-command-registry
plan: 02
subsystem: platform-core/commands
tags: [command-bus, system-commands, governance, registry, contracts]
requires:
  - 77-01  # PluginManifest systemCommands schema (systemCommands declaration must exist)
provides:
  - PlatformCommandTypeSchema accepts system.http.request and system.config.set
  - PlatformCommandSchema discriminated union with 2 new system variants
  - platformCommandRegistry with 21 entries (19 original + 2 system)
  - GovernanceDeniedReasonValues with 11 entries (7 original + 4 new)
affects:
  - Phase 78 (HTTP proxy) — will wire real authorize/execute for system.http.request
  - Phase 79 (KV config) — will wire real authorize/execute for system.config.set
  - governanceAudit writers — new reason codes now in typed enum
tech-stack:
  added: []
  patterns:
    - Zod strictObject + discriminatedUnion for system command payloads
    - createPlatformCommandDefinition factory for registry entries
    - Placeholder handlers with clear Phase 78/79 delegation messages
    - Const array + z.enum spread pattern for PlatformCommandTypeSchema
key-files:
  created:
    - src/features/platform-core/commands/system-commands.test.ts
  modified:
    - src/features/platform-core/commands/contracts.ts
    - src/features/platform-core/commands/registry.ts
    - src/features/runtime-platform/contracts/permissions.ts
decisions:
  - schoolId and pluginId injected by envelope scope, not in payload
  - system.config.get excluded from PlatformCommandType (pure DAL read)
  - dedupe: required for both system command entries
  - placeholder authorize resolves immediately; execute throws explicit Phase 78/79 message
  - no schema migration needed for new reason codes (reasonCode is text column)
  - None
metrics:
  duration: ~1h
  completed_date: 2026-06-11
---

# Phase 77 Plan 02: Register system commands in platformCommandRegistry — Summary

**One-liner:** Registered system.http.request and system.config.set in the Command Bus with Zod-validated payloads, discriminated union variants, typed registry entries, and 4 new governance audit reason codes — foundation for Phase 78/79 implementations.

## Tasks Completed

| Task | Name | Type | Commit | Key Changes |
|------|------|------|--------|-------------|
| 1 | Add SystemCommandTypes array + payload schemas + discriminated union | auto (TDD) | `62d7aae` | SystemCommandTypes const array, SystemHttpRequestPayloadSchema, SystemConfigSetPayloadSchema, 2 new discriminated union variants |
| 2 | Register system commands in platformCommandRegistry | auto (TDD) | `cd0b6a9` | system.http.request and system.config.set entries with placeholder handlers |
| 3 | Add governance audit reason codes + comprehensive vitest assertions | auto (TDD) | `a316bb3` | 4 new reason codes in GovernanceDeniedReasonValues, 48 passing tests |

## TDD Gate Compliance

All three tasks followed the RED-GREEN commit sequence:

- **Task 1 RED:** `98c9e13` — test(77-02): add failing test for SystemCommandTypes, payload schemas, and discriminated union
- **Task 1 GREEN:** `62d7aae` — feat(77-02): add SystemCommandTypes, payload schemas, and discriminated union variants
- **Task 2 RED:** `99d5929` — test(77-02): add registry and governance reason code assertions
- **Task 2 GREEN:** `cd0b6a9` — feat(77-02): register system.http.request and system.config.set in platformCommandRegistry
- **Task 3 GREEN:** `a316bb3` — feat(77-02): add 4 new governance audit reason codes for system commands

All RED commits had failing tests that passed after the corresponding GREEN implementation.

## Deviations from Plan

None — plan executed exactly as written.

### Auto-fixed Issues

None — no bugs, missing functionality, or blocking issues encountered during execution.

## Known Stubs

| File | Line | Stub | Resolved By |
|------|------|------|-------------|
| src/features/platform-core/commands/registry.ts | 155-159 | system.http.request authorize/execute placeholder (TODO Phase 78) | Phase 78 |
| src/features/platform-core/commands/registry.ts | 166-170 | system.config.set authorize/execute placeholder (TODO Phase 79) | Phase 79 |

Both stubs are intentional per scope boundary: the registry entries exist for type registration; real HTTP proxy logic and KV config write logic are deferred to Phase 78/79.

## Verification Results

**system-commands.test.ts:** 48 tests, 0 failures — comprehensive coverage of:
- SystemCommandTypes array definition
- PlatformCommandTypeSchema (21 types, including rejection of system.config.get)
- PlatformCommandPayloadSchemas (both new schemas with strict validation)
- PlatformCommandSchema discriminated union (both new variants)
- platformCommandRegistry (21 entries, placeholder handler behavior)
- GovernanceDeniedReasonValues (11 reason codes, schema acceptance)

**Full command suite regression:** `src/features/platform-core/commands/` — 212 passing, 10 pre-existing failures (unrelated: next-auth module resolution, lifecycle state naming mismatch). No regressions introduced by this plan.

## Threat Flags

None — no new network endpoints, auth paths, or file access patterns introduced. The threat model in the plan identified T-77-04 through T-77-07; all mitigations are in place (.strict() on payloads, schoolId/pluginId not in payload, placeholder authorize with no security decisions, new reason codes in typed enum).

## Decisions Made

All decisions from CONTEXT.md (D-12 through D-15) implemented as specified:
- D-12: 4 new reason codes added to GovernanceDeniedReasonValues
- D-13: Audit granularity deferred to Phase 78/79 (handler implementations will write audit records)
- D-14: action field = commandType — existing audit writer pattern reads command.type
- D-15: No schema migration — reasonCode is text column in governanceAudits table

## Self-Check: PASSED

- [x] `src/features/platform-core/commands/system-commands.test.ts` exists
- [x] `src/features/platform-core/commands/contracts.ts` modified with SystemCommandTypes, payloads, union variants
- [x] `src/features/platform-core/commands/registry.ts` modified with 2 new entries
- [x] `src/features/runtime-platform/contracts/permissions.ts` modified with 4 new reason codes
- [x] All 5 commits verified in git log
- [x] All 48 system-commands tests pass
- [x] No untracked files from this plan (`.codegraph/` is pre-existing)
