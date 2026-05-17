---
status: investigating
trigger: "Phase 32 diagnose-only: runtime still waits for iframe ready with 403"
created: 2026-05-17T00:00:00Z
updated: 2026-05-17T00:38:00Z
---

## Current Focus

hypothesis: confirmed — the current blocker is no longer the host handshake logic; the sandboxed iframe itself is booting in an opaque origin without `allow-same-origin`, which matches the browser same-origin error and prevents the Next/Turbopack runtime page from loading its CSS/app shell cleanly, so `runtime-frame-ready` never reaches the host
test: completed by comparing the already-fixed host handshake code with the iframe sandbox flags, app layout CSS dependency, and the reported browser errors
expecting: n/a
next_action: return diagnose-only root cause summary

## Symptoms

expected: 教师从 seeded lesson 开课后，学生端 runtime 能正常进入，不再停在“等待 iframe ready”；学生提交一次后，界面进入终态，保存和提交被锁定，并显示本次 proof 摘要。
actual: 仍然显示等待 iframe ready。控制台线索：Unsafe attempt to load URL http://localhost:3000/runtime/html-courseware/pilot from frame with URL http://localhost:3000/runtime/html-courseware/pilot. Domains, protocols and ports must match. 以及 %5Broot-of-the-server%5D__0b-dwpu._.css:1 Failed to load resource: the server responded with a status of 403 (Forbidden)。
errors: browser console errors above
reproduction: Test 2 in UAT
started: Discovered during post-fix UAT re-test

## Eliminated

## Evidence

- timestamp: 2026-05-17T00:12:00Z
  checked: branch base safety check
  found: `git merge-base HEAD 5cb35f6490d66d37692459b8aa6b350245566eed` returned `5cb35f6490d66d37692459b8aa6b350245566eed`
  implication: the current branch is based on the expected commit, so investigation can proceed safely without reset handling.

- timestamp: 2026-05-17T00:14:00Z
  checked: `.planning/phases/32-end-to-end-hardening-and-milestone-proof/32-UAT.md`
  found: UAT Test 2 is the only remaining phase-32 gap and records the same two console symptoms together: iframe-ready wait plus a `%5Broot-of-the-server%5D__0b-dwpu._.css` 403.
  implication: the current failure is specifically tied to the live browser walkthrough, not a broad regression across all runtime flows.

- timestamp: 2026-05-17T00:15:00Z
  checked: `.planning/debug/runtime-bootstrap-waits-for-iframe-ready.md` and `.planning/debug/runtime-transport-bootstrap.md`
  found: prior phase-32 investigations already identified two concrete blockers: transport bootstrap keyed by runtime session instead of classroom session, and the host ignoring the iframe's first `runtime-frame-ready` handshake before instance-id synchronization.
  implication: the current symptom overlaps a known failure mode, but the new 403 asset error may indicate an additional or regressed blocker.

- timestamp: 2026-05-17T00:17:00Z
  checked: `.planning/debug/knowledge-base.md`
  found: file does not exist yet.
  implication: there is no append-only debug knowledge base to consult, so prior session files are the only historical evidence.

- timestamp: 2026-05-17T00:24:00Z
  checked: `src/features/runtime-platform/host/runtime-host-client.tsx` and `src/app/runtime/html-courseware/pilot/page.tsx`
  found: the host now accepts `runtime-frame-ready` before instance-id filtering, and the pilot iframe still emits `runtime-frame-ready` immediately on mount with placeholder id `runtime-pilot-pending`.
  implication: the earlier pre-bootstrap handshake deadlock was addressed in code; if UAT still stalls, either the iframe page is not mounting cleanly or another regression prevents that ready event from ever reaching the host.

- timestamp: 2026-05-17T00:26:00Z
  checked: `src/features/runtime-platform/host/runtime-host-frame.tsx`
  found: the iframe is rendered with `sandbox="allow-scripts allow-forms"` but without `allow-same-origin`.
  implication: although the iframe URL is same-site (`/runtime/html-courseware/pilot`), the browser treats the sandboxed document as a unique opaque origin, which is a direct match for the reported console error `Unsafe attempt to load URL ... Domains, protocols and ports must match.`

- timestamp: 2026-05-17T00:27:00Z
  checked: `src/proxy.ts`
  found: the Auth.js proxy protects every non-API, non-`_next`, non-`favicon.ico` route via `matcher: ['/((?!api|_next|favicon.ico).*)']`.
  implication: the runtime page itself is inside the protected path space, so any auxiliary request under `/runtime/...` that does not bypass proxy or satisfy auth can legitimately return 403.

## Resolution

root_cause: The runtime host still embeds `/runtime/html-courseware/pilot` inside an iframe sandboxed as `allow-scripts allow-forms` without `allow-same-origin`. That makes the iframe document run under an opaque origin even though the URL is same-site, which directly matches the browser error `Unsafe attempt to load URL ... Domains, protocols and ports must match.` Because the pilot page is a normal Next.js app route under `src/app/layout.tsx` and depends on the app CSS/runtime shell, the sandbox/origin mismatch breaks its page boot path in live browser mode (surfacing as the `%5Broot-of-the-server%5D__0b-dwpu._.css` 403). The host-side `runtime-frame-ready` deadlock had already been fixed; the remaining wait state happens because the iframe page itself never becomes healthy enough to complete the ready handshake.
fix:
verification: diagnose-only
files_changed: []
