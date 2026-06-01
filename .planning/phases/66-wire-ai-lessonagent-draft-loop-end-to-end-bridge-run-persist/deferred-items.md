# Deferred / Out-of-Scope Items — Phase 66

Items discovered during execution that are **out of scope** for the current plan
(per executor SCOPE BOUNDARY: only auto-fix issues directly caused by the current task).

## 66-07 (e2e closure test)

Discovered while running the full suite (`pnpm test run`) as a post-task gate. These
failures are **pre-existing at HEAD** (`git diff --stat HEAD` shows the files are
unmodified vs the committed tree) and are **unrelated** to the isolated new test file
`src/server/ai/agents/lesson-draft-loop.e2e.test.ts` (Vitest isolates module graphs
per test file, so a new test file cannot change another file's outcome).

| File | Symptom | Notes |
| ---- | ------- | ----- |
| `src/lib/dal/lesson-authoring.draft-review.test.ts` | ~15 assertions fail (e.g. `result` shape mismatch around `version: 1`) | Pre-existing at HEAD; DAL draft-review behavior, not touched by 66-07. |
| `src/components/surfaces/classroom-incident-operator-surface.test.tsx` | Unhandled `ReferenceError: window is not defined` (react-dom client) | Pre-existing at HEAD; jsdom/environment config issue, unrelated to 66-07. |

Action: NOT fixed here (out of scope). The 66-07 target test passes 2/2 in isolation.
