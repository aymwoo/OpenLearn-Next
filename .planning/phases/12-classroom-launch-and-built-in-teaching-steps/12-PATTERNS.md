# Phase 12: Classroom Launch and Built-in Teaching Steps - Patterns

## Source patterns

### Pattern 1: Dedicated stage + tonal work panels

- **Use for:** New `开启新课堂` route and any launch-specific hero/metrics.
- **Closest analog:** `src/components/surfaces/classroom-console-surface.tsx`
- **Why:** It already implements the Phase 10/11 classroom visual language: one
  dominant gradient stage followed by tonal operational cards.

Key excerpt:

```tsx
<section className="overflow-hidden rounded-[var(--radius-shell)] bg-surface-container-low shadow-ambient">
  <div className="bg-linear-135 from-primary to-primary-container px-5 py-6 text-on-primary sm:px-6 sm:py-7">
```

### Pattern 2: Launch still goes through Server Action + DAL

- **Use for:** New launch page submit path.
- **Closest analog:** `src/components/classroom/classroom-launch-panel.tsx`
- **Why:** Current launch panel already normalizes launch around
  `launchClassroomSessionAction()` and client transition state.

Key excerpt:

```tsx
const result = await launchClassroomSessionAction(formData)
if (result.ok) {
  router.refresh()
} else {
  setError(result.message)
}
```

### Pattern 3: Teacher-scoped route assembly in App Router

- **Use for:** New teacher launch route under the teacher shell.
- **Closest analog:** `src/app/(teacher)/teacher/editor/page.tsx`
- **Why:** It resolves teacher scope server-side, loads overview data, and then
  renders a surface component without leaking DAL access into client UI.

Key excerpt:

```tsx
const [scope, overview] = await Promise.all([assertActiveTeacher(), getTeacherAuthoringOverview()])
const lesson = firstLesson ? await getLessonEditorDTO(firstLesson.id) : null
```

### Pattern 4: First-level step action buttons in authoring

- **Use for:** Built-in teaching-step insertion buttons.
- **Closest analog:** `src/components/authoring/lesson-authoring-workspace.tsx`
- **Why:** Base step insertion is already direct and teacher-optimized; built-in
  steps should extend this rhythm rather than introduce a second chooser.

Key excerpt:

```tsx
<Button type="button" className="min-h-10 px-4 text-sm" onClick={() => addStep("content")}>新增内容</Button>
<Button type="button" variant="secondary" className="min-h-10 px-4 text-sm" onClick={() => addStep("task")}>新增任务</Button>
<Button type="button" variant="secondary" className="min-h-10 px-4 text-sm" onClick={() => addStep("quiz")}>新增测验</Button>
```

### Pattern 5: Registry-backed plugin management UI

- **Use for:** Built-in plugin labels and toggles in labs/plugin management.
- **Closest analog:** `src/components/surfaces/settings-surface.tsx`
- **Why:** Labs settings already list plugins by school and submit toggles
  through Server Actions.

Key excerpt:

```tsx
<form action={submitPluginToggle}>
  <input type="hidden" name="pluginId" value={plugin.id} />
  <input type="hidden" name="schoolId" value={plugin.schoolId} />
  <input type="hidden" name="enabled" value={plugin.enabled ? 'false' : 'true'} />
</form>
```

### Pattern 6: Safe plugin rendering through local widgets only

- **Use for:** Built-in authoring/runtime suggestions or sidebar affordances.
- **Closest analog:** `src/components/plugins/plugin-renderer.tsx`
- **Why:** It already resolves enabled plugins, runs hook actions on the server,
  and renders local widget components only.

Key excerpt:

```tsx
const proposals = await Promise.all(
  plugins.flatMap((plugin) =>
    plugin.manifestJson.actions.map((action) =>
      runPluginHook({ ... })
    )
  )
)
```

### Pattern 7: DTO-level schema extension before UI usage

- **Use for:** Built-in plugin metadata or launch preview DTO expansion.
- **Closest analog:** `src/lib/dto/classroom.ts`, `src/lib/dto/resource-ai.ts`
- **Why:** Existing features add or evolve UI behavior only after DTO schemas
  define the exact contract.

### Pattern 8: Dev bootstrap as the canonical seed path

- **Use for:** Built-in plugin seed records and default enablement.
- **Closest analog:** `scripts/bootstrap-dev-db.ts`
- **Why:** The project already uses one script to create dev-ready courses,
  lessons, and published versions; built-in plugin seeds belong in the same
  reproducible bootstrap path.

## File-role map

| File | Role in Phase 12 |
|------|------------------|
| `src/app/(teacher)/teacher/launch/page.tsx` | New dedicated teacher launch route |
| `src/components/surfaces/classroom-launch-surface.tsx` | New launch preparation surface |
| `src/components/classroom/classroom-launch-panel.tsx` | Shared launch form + inline preview shell |
| `src/lib/dal/classroom.ts` | Launch page data shaping, live-session resume, preview DTO |
| `src/lib/dto/classroom.ts` | Launch preview / built-in session summary contract |
| `src/components/authoring/lesson-authoring-workspace.tsx` | Built-in teaching-step quick-add group |
| `src/lib/dal/plugins.ts` | Built-in metadata, delete guard, list behavior |
| `src/lib/dto/resource-ai.ts` | Built-in plugin manifest/DTO metadata |
| `src/components/surfaces/settings-surface.tsx` | Built-in labels and toggles in labs/settings |
| `scripts/bootstrap-dev-db.ts` | Seed built-in plugins and default-enabled state |
| `src/server/plugins/registry.ts` | Explicit first-party safe action extensions |

## Anti-patterns to avoid

- Do not add a second runtime console on the launch route.
- Do not hard-code built-in plugin truth only in UI components.
- Do not bypass the plugin registry because the plugins are first-party.
- Do not add draft-only preview behavior that differs from launchable lesson
  structure without making the distinction explicit.
- Do not expose destructive delete affordances for built-in plugins.
