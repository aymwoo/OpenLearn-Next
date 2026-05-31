---
phase: 44-plugin-identity-and-namespace-contract
plan: 03
subsystem: plugin-registry
tags: [plugin, built-in, bootstrap, registry, gitnexus]
requires:
  - phase: 44-plugin-identity-and-namespace-contract
    provides: Phase 44 SQL identity and namespace truth
provides:
  - default plugin bootstrap 改走共享 reconcile path
  - pluginKey-based built-in definition lookup
  - built-in definition carries canonical pluginKey mapping
affects: [plugin-registry, bootstrap-dev-db, runPluginHook]
gitnexus_preflight:
  upsertBuiltInPlugins:
    risk: LOW
    impactedCount: 3
    affected_processes: []
  resolveBuiltInTeachingStep:
    risk: LOW
    impactedCount: 6
    affected_processes: [TeacherEditorPage, TeacherPage]
  runPluginHook:
    risk: HIGH
    impactedCount: 8
    affected_processes: [TeacherEditorPage, TeacherPage, StudentPage]
---

# Phase 44 Plan 03 Execution Summary (Draft)

## GitNexus Impact Preflight Analysis

Before modifying any symbol, we executed `gitnexus impact` to analyze the blast radius of target methods:

1. **`upsertBuiltInPlugins`** (in `scripts/bootstrap-dev-db.ts`):
   - **Risk Level**: LOW (impactedCount: 3)
   - **Blast Radius**: Confined solely to `bootstrapDevDb` -> `main` in the database bootstrap script. It has no runtime process impact.

2. **`resolveBuiltInTeachingStep`** (in `src/server/plugins/registry.ts`):
   - **Risk Level**: LOW (impactedCount: 6)
   - **Blast Radius**: Confined directly to `dispatchPluginAction` -> `runPluginHook` and helper templates. Indirectly affects teacher-facing editor pages.

3. **`runPluginHook`** (in `src/lib/dal/plugins.ts`):
   - **Risk Level**: **HIGH** (impactedCount: 8)
   - **Blast Radius**: Highly critical runtime method. Directly called by server action wrapper `runPluginHookAction` and templates, and transitively feeds into `TeacherEditorPage`, `TeacherPage`, and `StudentPage`.
   - **Mitigation/Escalation Plan**: Changes must strictly preserve signature backward compatibility and not alter non-built-in plugin invocation pathways. We only inject the newly supported `pluginKey` for built-in hooks and keep `pluginName` intact for display compatibility.
