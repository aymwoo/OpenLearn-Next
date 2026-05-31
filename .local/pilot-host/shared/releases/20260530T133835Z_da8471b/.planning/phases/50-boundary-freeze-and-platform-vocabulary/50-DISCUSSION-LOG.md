# Phase 50: Boundary Freeze & Platform Vocabulary - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 50-Boundary Freeze & Platform Vocabulary
**Areas discussed:** Ownership map, Command entry boundary, Vocabulary split, Deferred wall

---

## Ownership map

| Option | Description | Selected |
|--------|-------------|----------|
| Platform-core orchestration | `src/features/platform-core/` becomes the authoritative layer for command execution, action registry, lifecycle orchestration, and platform event outbox. | ✓ |
| DAL remains authority | Keep `src/lib/dal/plugins.ts` as the main lifecycle/orchestration authority with thin wrappers outside. | |
| Distributed ownership | Split authority across entrypoints, DAL, and runtime seam. | |

**User's choice:** Platform-core orchestration
**Notes:** `src/lib/dal/plugins.ts` should be reduced to domain DAL only; `src/server/plugins/registry.ts` should remain a static implementation catalog; runtime event seam and `runtimeEventOutbox` stay strictly runtime-only.

---

## Command entry boundary

| Option | Description | Selected |
|--------|-------------|----------|
| All three producers | `Server Actions`, `plugin host`, and `async task processors` are all future command producers. | ✓ |
| UI only producers | Only UI / Server Actions are treated as future command producers. | |

**User's choice:** All three producers
**Notes:** Existing direct mutation paths should be frozen as adapter-only posture, not co-equal long-term seams.

---

## Vocabulary split

| Option | Description | Selected |
|--------|-------------|----------|
| Action = discoverable capability unit | `action` is a discoverable, gated capability unit rather than the mutation request itself. | ✓ |
| Action = alias of command | Treat action as effectively the same as command. | |
| Action = UI-only shortcut | Keep action as button-level UI wording only. | |

**User's choice:** Action = discoverable capability unit
**Notes:** `command` was locked as authoritative mutation request; `event` as after-fact fact; `task` as deferred execution/orchestration unit; `runtime transport` as delivery-only mechanism.

---

## Deferred wall

| Option | Description | Selected |
|--------|-------------|----------|
| Named hard exclusions | Explicitly name deferred high-risk capabilities in the context file. | ✓ |
| Theme-level only | Say only that "big upgrades" are out of scope without naming them. | |
| Only immediate exclusions | Exclude only the nearest few risky items and leave the rest implicit. | |

**User's choice:** Named hard exclusions
**Notes:** BullMQ, Redis, and WebSocket should also be explicitly described as delivery/orchestration-only substrate, not future canonical truth or command/event authority.

## the agent's Discretion

- Exact internal module names under `src/features/platform-core/`
- Exact ledger / outbox / activation snapshot naming
- Exact location and shape of legacy adapter wrappers

## Deferred Ideas

- None beyond the formal deferred wall captured in CONTEXT.md
