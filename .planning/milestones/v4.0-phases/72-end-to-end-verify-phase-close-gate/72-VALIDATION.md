---
phase: 72
slug: end-to-end-verify-phase-close-gate
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-05
---

# Phase 72 - Validation Strategy

> Per-phase validation contract for the single milestone-level `verify:phase` close gate.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Existing phase verifiers + Vitest subsets already owned by Phase 67-71 |
| **Config file** | Existing per-phase runner config (`tsx`, server-only shim, phase-specific tsconfig remaps) |
| **Quick run command** | `pnpm verify:phase72` |
| **Full suite command** | `pnpm verify:phase` |
| **Estimated runtime** | ~3-6 minutes depending on local cache |

---

## Sampling Rate

- **After implementing the aggregator script:** run `pnpm verify:phase72`.
- **Before milestone close:** run `pnpm verify:phase` and require it to pass.
- **If any Phase 67-71 verifier changes later:** re-run `pnpm verify:phase` because it is now the authoritative gate.

---

## Per-Task Verification Map

| Task ID | Requirement | Secure Behavior | Automated Command | Status |
|---------|-------------|-----------------|-------------------|--------|
| 72-01-01 | GATE-01 | `verify:phase72` orchestrates Phase 67-71 proof lanes in dependency order | `pnpm verify:phase72` | ✅ green |
| 72-01-02 | GATE-01 | global `verify:phase` alias resolves to `verify:phase72` and passes end-to-end | `pnpm verify:phase` | ✅ green |

---

## Validation Sign-Off

- [x] Single authoritative command exists
- [x] Existing proof lanes are reused rather than duplicated
- [x] `verify:phase` alias points to the latest milestone gate
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** verified via `pnpm verify:phase` on 2026-06-05
