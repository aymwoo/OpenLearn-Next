---
phase: 77-manifest-command-registry
plan: 01
subsystem: Plugin Manifest DTO / systemCommands schema
tags: [manifest, schema, zod, discriminated-union, system-commands]
requires: []
provides:
  - PluginManifestSchema.systemCommands (.optional() discriminated union)
  - SystemCommandHttpRequestSchema (exported for Phase 78)
  - SystemCommandConfigSchema (exported for Phase 79)
  - SystemCommandDiscriminatedSchema (exported for Phase 78/79 runtime re-parsing)
  - SYSTEM_COMMAND_REASONS, SYSTEM_HTTP_METHODS constants
affects:
  - src/lib/dto/resource-ai.ts
  - src/lib/plugins/external-catalog.ts
tech-stack:
  added: []
  patterns:
    - "z.discriminatedUnion('command', [...]) for manifest declaration variants"
    - "z.strictObject.merge() for adding discriminator to command-specific shapes"
    - "UPPER_SNAKE reason codes via .regex(message) + .min(1, message) + z.enum(error)"
    - "Domain regex with wildcard support (*.example.com)"
    - "Key regex with single-colon constraint (prefix:segment or prefix:*)"
key-files:
  created:
    - src/lib/dto/resource-ai.system-commands.test.ts
  modified:
    - src/lib/dto/resource-ai.ts
    - src/lib/plugins/external-catalog.ts
decisions:
  - D-01: discriminated union with "command" discriminator field
  - D-02: Complete shape defined now (allowedDomains, allowedMethods, allowedKeys)
  - D-03: Schema in same file as PluginManifestSchema (resource-ai.ts)
  - D-04: systemCommands is .optional() for backward compatibility
  - D-05: Zod full validation (regex + enum + min constraints)
  - D-06: Named UPPER_SNAKE reason codes
metrics:
  duration: "~5 minutes"
  completed_date: "2026-06-11"
---

# Phase 77 Plan 01: Extend PluginManifestSchema with systemCommands Discriminated Union

**One-liner:** Added .optional() systemCommands discriminated union (system.http.request + system.config) to PluginManifestSchema with regex/enum validation and UPPER_SNAKE reason codes, fully backward compatible with all existing quiz/homework manifests.

## Summary

Extended `PluginManifestSchema` in `src/lib/dto/resource-ai.ts` with a new `.optional()` `systemCommands` field using Zod discriminated union on the `command` discriminator. Two command variants are defined:

1. **system.http.request** — validates `allowedDomains` (domain regex with wildcard support) and `allowedMethods` (z.enum GET/POST/PUT/DELETE/PATCH), plus optional `maxResponseSize` and `defaultTimeout`.
2. **system.config** — validates `allowedKeys` (key regex with single-colon constraint, prefix wildcard `prefix:*` supported), plus optional `maxValueSize`.

All validation failures produce UPPER_SNAKE reason codes: `SYSTEM_COMMAND_DOMAIN_INVALID`, `SYSTEM_COMMAND_METHOD_INVALID`, `SYSTEM_COMMAND_KEY_INVALID`.

### What Changed

- **src/lib/dto/resource-ai.ts** — Added 4 new exports: `SYSTEM_COMMAND_REASONS`, `SYSTEM_HTTP_METHODS`, `SystemCommandHttpRequestSchema`, `SystemCommandConfigSchema`, `SystemCommandDiscriminatedSchema`. Added `systemCommands: z.array(SystemCommandDiscriminatedSchema).optional()` to `PluginManifestSchema`.
- **src/lib/dto/resource-ai.system-commands.test.ts** — 35 comprehensive vitest assertions covering: standalone schema validation (Task 1), PluginManifestSchema backward compatibility with external catalog manifests (Task 2+3), positive/negative systemCommands cases, governance interaction, and individual schema exports.
- **src/lib/plugins/external-catalog.ts** — Exported `buildExternalQuizManifest` and `buildExternalHomeworkManifest` functions to enable compatibility testing.

### Key Decisions Realized

| Decision | Implementation |
|----------|---------------|
| D-01: command discriminator | `z.discriminatedUnion("command", [...])` |
| D-02: Complete shape now | allowedDomains, allowedMethods, allowedKeys with optional fields |
| D-03: Same file | All schemas in resource-ai.ts |
| D-04: .optional() | Backward compatible with existing manifests |
| D-05: Full Zod validation | regex + z.enum(error) + .min(1, message) |
| D-06: UPPER_SNAKE codes | SYSTEM_COMMAND_DOMAIN_INVALID, etc. |
| D-08: No registry lookup | discriminatedUnion z.literal naturally constrains command names |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Exported buildExternalQuizManifest and buildExternalHomeworkManifest for compat testing**
- **Found during:** Task 2+3 GREEN phase implementation
- **Issue:** External catalog build functions were private — test could not import them for compatibility assertions
- **Fix:** Added `export` keyword to both functions in `src/lib/plugins/external-catalog.ts`
- **Files modified:** `src/lib/plugins/external-catalog.ts`
- **Commit:** 65e66e5

**2. [Rule 1 - Bug] KEY_PATTERN regex allowed multiple colon separators**
- **Found during:** Task 1 GREEN phase testing
- **Issue:** Regex `/^[a-zA-Z_][a-zA-Z0-9_]*(?::[a-zA-Z_][a-zA-Z0-9_]*)*(?::\*)?$/` allowed `invalid:key:here` (two colons) which violates the prefix-wildcard-only rule
- **Fix:** Changed to `/^[a-zA-Z_][a-zA-Z0-9_]*(?::(?:[a-zA-Z_][a-zA-Z0-9_]*|\*))?$/` — exactly one optional colon separator with identifier or wildcard
- **Files modified:** `src/lib/dto/resource-ai.ts`
- **Commit:** 920b6b3

## Commits

| # | Hash | Type | Message |
|---|------|------|---------|
| 1 | db60527 | test | test(77-01): add failing test for SystemCommandHttpRequestSchema and SystemCommandConfigSchema |
| 2 | 920b6b3 | feat | feat(77-01): implement SystemCommandHttpRequestSchema and SystemCommandConfigSchema |
| 3 | 65e66e5 | feat | feat(77-01): add systemCommands discriminated union to PluginManifestSchema |

## Test Results

```
Test Files  1 passed (1)
Tests      35 passed (35)
Duration   ~325ms
```

## Self-Check: PASSED
