# Phase 3 UI-SPEC: Teacher authoring

**Phase:** 03 — Courses, lessons, steps, and teacher authoring  
**Design source:** Stitch project `5322129002350954765` + `DESIGN.md`

## Objective

Convert the static teacher editor into a data-backed authoring cockpit that
feels like a premium sunlit classroom studio. The teacher must see where they
are in the course/class/lesson hierarchy, what changed, whether autosave is
fresh, and whether the lesson is ready to publish.

## Required screens and states

### Teacher editor route

Route: `src/app/(teacher)/teacher/editor/page.tsx`

The route must render a three-pane authoring workspace:

1. **Left rail:** Course/class context, lesson list, and ordered step rail.
2. **Center canvas:** Selected lesson and selected step editor.
3. **Right inspector:** Settings, materials, autosave, publish readiness,
   conflict, and freshness feedback.

### Required UI states

- Draft hidden from students: show `草稿仅教师可见`.
- Autosave fresh: show `已自动保存` with a timestamp or relative label.
- Autosave saving: show `正在保存...`.
- Conflict: show `检测到更新冲突` and a clear recovery action.
- Publish ready: show `可发布` only when title, objective, and at least one
  valid step exist.
- Published: show latest version and `学生将读取已发布版本`.

## Visual rules

- Use Lexend and Simplified Chinese copy.
- Use `bg-surface-container-low` for large sections and
  `bg-surface-container-lowest` for cards/editors.
- Do not add 1px divider lines or `border` sectioning.
- Primary publish CTA uses the existing gradient `Button` primary variant.
- Use rounded shells and whitespace to separate rail/canvas/inspector.
- Feedback text cannot rely on color alone; every state needs explicit text.

## Accessibility and interaction rules

- Step rail items must be buttons or links with visible text labels.
- Drag/reorder controls must also expose keyboard-accessible move actions or a
  deterministic action fallback such as `上移` / `下移`.
- Form controls need labels in Chinese.
- Conflict and publish errors must be rendered as text in the inspector.

## Anti-patterns

- No raw database rows in props.
- No English-only authoring labels.
- No placeholder-only editor that cannot call Server Actions.
- No hidden draft/publish state that only appears in console logs.
