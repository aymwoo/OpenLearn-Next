---
phase: 32-end-to-end-hardening-and-milestone-proof
plan: 05
subsystem: runtime-host
tags: [runtime-proof, host, iframe-ready, html-courseware]

# Dependency graph
requires:
  - phase: 29-runtime-host-and-html-courseware-pilot
    provides: shared runtime host and local html proof runtime
provides:
  - pre-bootstrap iframe ready handshake that no longer deadlocks the seeded proof flow
  - placeholder ready contract coverage for the html pilot until bootstrap returns the final instance id
affects: [phase-32-verification, runtime-proof, classroom]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - attach host message listener before bootstrap can race past the first iframe ready signal
    - keep runtime-frame-ready as the only pre-bootstrap exception while preserving instance filtering for all other bridge messages

key-files:
  created: []
  modified:
    - src/features/runtime-platform/host/runtime-host-client.tsx
    - src/features/runtime-platform/host/runtime-host.test.tsx

key-decisions:
  - host 侧只提前接收 `runtime-frame-ready`，不放宽其他 bridge message 的实例过滤。
  - html pilot 继续使用 `runtime-pilot-pending` 占位 id，直到 bootstrap 返回最终实例 id。

requirements-completed: [RHOST-04]

# Metrics
duration: pending
completed: 2026-05-17
---

# Phase 32 Plan 05 summary

修复了 canonical proof 在浏览器链路中的 bootstrap deadlock：宿主现在会在
bootstrap 之前就挂好 message listener，因此不会再丢失 iframe 首次
`runtime-frame-ready` 握手，同时 save、submit、interaction 这些消息仍然必须
通过最终 `runtimeInstanceId` 过滤。

## Accomplishments

- 将 `RuntimeHostClient` 的 message listener 提前到 `useLayoutEffect`，避免首个
  placeholder ready 握手在监听注册前丢失。
- 保留 `runtime-frame-ready` 的 pre-bootstrap 特判和其余 bridge message 的严格
  instance filtering。
- 扩展 `runtime-host.test.tsx`，锁住监听时序、placeholder ready contract 和
  non-ready message filtering 三条语义。

## Self-Check: PASSED

- FOUND: `src/features/runtime-platform/host/runtime-host-client.tsx`
- FOUND: `src/features/runtime-platform/host/runtime-host.test.tsx`

---

*Phase: 32-end-to-end-hardening-and-milestone-proof*
*Completed: 2026-05-17*
