---
status: investigating
trigger: "In editor, step card should show estimatedMinutes from teachingDesign (or legacy default if missing), but user reports看不到模块的时间"
created: 2026-05-13T00:00:00Z
updated: 2026-05-13T00:18:00Z
---

## Current Focus

hypothesis: FlowStepCard does compute and render duration, but the duration badge is implemented as a small unlabeled top-right flex item (`18 min`) inside a crowded row, so it is easy to collapse/be visually lost in the real editor card layout even though the DOM contains the text
test: verify that no alternative editor-card duration surface exists, and inspect whether the current badge relies only on a tiny right-aligned visual chip with no dedicated label or protected layout sizing
expecting: if the only per-step time UI is that small chip and tests only assert raw text presence, then the most likely root cause is presentation/layout, not missing data wiring
next_action: finalize diagnosis from workspace card structure and test coverage gap

## Symptoms

expected: Teacher can see each module/step time in the editor card.
actual: 用户报告：看不到模块的时间
errors: none reported
reproduction: Test 7 in UAT
started: Discovered during UAT

## Eliminated

## Evidence

- timestamp: 2026-05-13T00:02:00Z
  checked: .planning/phases/21-teaching-design-contracts-and-evidence-foundation/21-UAT.md
  found: Test 7 fails specifically with user report "看不到模块的时间", while Test 2 launch preview passes for structured teaching design fields including estimatedMinutes.
  implication: teachingDesign data likely exists in at least one teacher-facing surface; failure is likely editor-specific.

- timestamp: 2026-05-13T00:04:00Z
  checked: src/lib/dal/lesson-authoring.ts + src/lib/teaching-design.ts
  found: getLessonEditorDTO hydrates every step through hydrateTeachingDesign(), which calls resolveTeachingDesignInput() and always fills teachingDesign.estimatedMinutes either from explicit payload or legacy defaults (content 12/task 15/quiz 8).
  implication: editor DTO should always deliver a duration value; missing data from DAL is unlikely.

- timestamp: 2026-05-13T00:06:00Z
  checked: src/components/authoring/lesson-authoring-workspace.tsx
  found: FlowStepCard renders a duration badge at line 434 using getStepMinutes(step), and getStepMinutes() reads step.payload.teachingDesign?.estimatedMinutes with the same legacy fallback values as resolveTeachingDesignInput().
  implication: the code intends to show duration in the card, so the bug is not "duration feature absent" but likely "duration not meaningfully visible in the actual card UI".

- timestamp: 2026-05-13T00:08:00Z
  checked: src/components/authoring/lesson-authoring-workspace.test.tsx
  found: there is a unit test asserting "18 min" and "总时长约 18 分钟", which only verifies text presence in DOM, not whether the per-step badge is visually visible/usable in the real editor layout.
  implication: current regression coverage can pass even if the duration badge is visually hidden, clipped, or too easy to miss in the actual UI.

- timestamp: 2026-05-13T00:16:00Z
  checked: src/components/authoring/lesson-authoring-workspace.tsx render structure
  found: the only per-step duration UI is the tiny badge at line 434 (`{getStepMinutes(step)} min`) placed as the right-hand item of a `justify-between` row beside title/description content; it has no Chinese label, no icon, no `shrink-0`, and no separate metadata row, while the left content block also lacks explicit width protection.
  implication: in the real editor card, duration is present in markup but visually easy to miss or be squeezed by content/layout, matching the symptom "看不到模块的时间".

## Resolution

root_cause:
FlowStepCard does not lose estimatedMinutes in data flow; instead, it exposes the step time only as a small top-right `min` badge inside a crowded flex row. Because this badge is the sole per-step duration affordance and lacks a stronger/labeled metadata slot or layout protection, the editor can appear to have no visible module time even though the DOM contains the value.
fix:
verification:
files_changed: []
