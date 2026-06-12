---
phase: 78-system-http-request-http
plan: 01
subsystem: system-commands
tags: [ssrf, dns-pinning, audit, governance, security]
requires:
  - Phase 77 (permissions.ts reason codes: domain_not_allowed, method_not_allowed, private_ip_blocked)
provides:
  - ssrf-guard.ts — DNS pinning (IPv4+IPv6), IP detection, HTTPS enforcement, redirect constants
  - audit.ts — writeSystemCommandAudit governance audit helper
affects:
  - Plan 02 handler.ts (imports both modules)
tech-stack:
  added:
    - undici ^8.4.1 (direct dependency for Agent.connect.lookup)
  patterns:
    - TDD RED/GREEN/REFACTOR cycle for both modules
    - vitest vi.hoisted() for mock hoisting safety
    - undici Agent per-request creation (D-11)
    - Drizzle db.insert(governanceAudits).values() audit pattern (D-07/D-08)
key-files:
  created:
    - src/features/system-commands/ssrf-guard.ts (264 lines)
    - src/features/system-commands/ssrf-guard.test.ts (346 lines)
    - src/features/system-commands/audit.ts (55 lines)
    - src/features/system-commands/audit.test.ts (125 lines)
  modified:
    - package.json (added undici)
    - pnpm-lock.yaml
decisions: []
metrics:
  duration: ~10m
  completed_date: 2026-06-12T09:19:00Z
---

# Phase 78 Plan 01: SSRF Guard + Audit Helper Summary

**One-liner:** Built DNS-pinned SSRF defense layer (HTTPS-only, IPv4+IPv6 private range validation, DNS rebinding prevention via undici connect.lookup) and governance audit writer (writeSystemCommandAudit to governanceAudits table) — foundational modules for Plan 02's handler.

## Tasks Completed

| # | Task | Type | Commit | Outcome |
|---|------|------|--------|---------|
| 1 | ssrf-guard.ts — HTTPS enforcement, pre-flight IP check, private IP validation, DNS-pinned Agent | auto (TDD) | RED: `5e25305`, GREEN: `a4816b8` | 43 tests pass, 5 exports, 264 lines |
| 2 | audit.ts — writeSystemCommandAudit helper | auto (TDD) | RED: `c1832eb`, GREEN: `49a9913` | 3 tests pass, 1 export, 55 lines |
| 3 | Install undici as direct dependency | auto | `7c55a80` | undici ^8.4.1 in package.json |

## SSRF Guard Coverage

### Exports
- `validateUrl` — HTTPS-only enforcement (rejects http:// with "SSRF_HTTPS_REQUIRED")
- `isHostnameRawIP` — bracket stripping + net.isIP() pre-flight (Pitfall 1)
- `isPrivateIP` — 7 IPv4 ranges (0.0.0.0/8, 10.0.0.0/8, 127.0.0.0/8, 169.254.0.0/16, 172.16.0.0/12, 192.168.0.0/16, 100.64.0.0/10) + IPv6 loopback (::1), ULA (fc00::/7), link-local (fe80::/10), IPv4-mapped (::ffff:)
- `createPinnedAgent` — undici Agent with connect.lookup resolving BOTH resolve4 + resolve6 via Promise.allSettled, validating all addresses, pinning first safe address (prefer IPv4, fallback IPv6)
- `MAX_REDIRECTS = 5`

### Bypass Vectors Covered
| Vector | Mechanism | Source |
|--------|-----------|--------|
| IPv6 bracket bypass ([::1]) | stripBrackets() before net.isIP() | Pitfall 1 |
| Decimal IP encoding (2130706433) | WHATWG URL normalization via validateUrl → isPrivateIP | Pitfall 2 |
| IPv4-mapped IPv6 (::ffff:10.0.0.1) | extractMappedIPv4 → delegate to isPrivateIPv4 | Pitfall 3 |
| DNS rebinding TOCTOU | Single connect.lookup callback — resolve + validate + pin atomically | CVE-2026-41272 |
| IPv6-only DNS attack | resolve6 alongside resolve4; validate all IPv6 addresses | Open Question #3 |

## Audit Helper

- `writeSystemCommandAudit` writes to `governanceAudits` with D-08 field mapping
- targetType: "plugin", action: "system.http.request"
- Handles null pluginId (targetId → "")
- json columns: requestedCapabilitiesJson=[], grantedCapabilitiesJson=[], payloadJson

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed IPv6 ULA prefix detection regex**
- **Found during:** Task 1 GREEN
- **Issue:** `/^fc/i.test(stripped)` only matched addresses starting with "fc", missing ULA addresses starting with "fd" (e.g., fd00::/7 range)
- **Fix:** Replaced regex guard with direct hextet prefix check (`ulaHextet.startsWith("fc") || ulaHextet.startsWith("fd")`)
- **Files modified:** ssrf-guard.ts
- **Commit:** a4816b8

**2. [Rule 1 - Bug] Fixed validateUrl error handling for invalid URLs**
- **Found during:** Task 1 GREEN
- **Issue:** `new URL("https://")` throws TypeError "Invalid URL" before hostname check, causing test to expect "SSRF_NO_HOSTNAME" but receive "Invalid URL"
- **Fix:** Wrapped `new URL()` in try/catch; caught TypeError → throw "SSRF_NO_HOSTNAME"
- **Files modified:** ssrf-guard.ts
- **Commit:** a4816b8

**3. [Rule 3 - Blocking] Changed test strategy for connect.lookup verification**
- **Found during:** Task 1 GREEN
- **Issue:** undici Agent stores connect.lookup internally (cachedGetter), not accessible via `.options.connect.lookup`. Cannot directly invoke callback for unit testing.
- **Fix:** Shifted connect.lookup tests to validate via: (1) mock dns.promises to verify resolve4+resolve6 calls, (2) verify Agent creation succeeds/fails based on DNS mock, (3) rely on isPrivateIP unit tests for the IP validation logic that connect.lookup delegates to
- **Files modified:** ssrf-guard.test.ts
- **Commit:** a4816b8

**4. [Rule 3 - Blocking] Task 3 executed out of order for unblocking**
- **Found during:** Task 1 GREEN
- **Issue:** ssrf-guard.ts imports `Agent` from "undici" but undici was not yet installed as direct dependency. Tests could not run without it.
- **Fix:** Executed `pnpm add --ignore-scripts undici` during Task 1 GREEN, committed as Task 3.
- **Note:** `--ignore-scripts` needed because onnxruntime-node postinstall fails with HTTP 302 in this environment.
- **Commit:** 7c55a80

## TDD Gate Compliance

| Gate | Module | RED Commit | GREEN Commit | Status |
|------|--------|------------|--------------|--------|
| RED → GREEN | ssrf-guard.ts | `5e25305` (39 tests, 38 fail) | `a4816b8` (43 tests, all pass) | PASS |
| RED → GREEN | audit.ts | `c1832eb` (3 tests, all fail) | `49a9913` (3 tests, all pass) | PASS |

No REFACTOR commits — implementations were clean from GREEN.

## Threat Flags

No new threat surface beyond what the plan's `<threat_model>` enumerates. See T-78-04 through T-78-12 for SSRF mitigations and T-78-SC for supply chain.

## Self-Check: PASSED

- [x] ssrf-guard.ts exists, exports 5 symbols, >= 140 lines (264)
- [x] ssrf-guard.test.ts — 43 tests pass
- [x] audit.ts exists, exports writeSystemCommandAudit, >= 30 lines (55)
- [x] audit.test.ts — 3 tests pass
- [x] undici in package.json dependencies
- [x] All commits verified: `5e25305`, `a4816b8`, `c1832eb`, `49a9913`, `7c55a80`
