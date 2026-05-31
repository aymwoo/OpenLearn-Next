# Phase 27 Patterns

## Target file patterns and analogs

| Target area | New files to create/modify | Closest analog | Pattern to copy |
|---|---|---|---|
| Feature root public API | `src/features/runtime-platform/index.ts`, `src/features/runtime-platform/*/index.ts` | `src/features/schedule/index.ts` | single root barrel re-exporting stable subdomains |
| Boundary map | `src/features/runtime-platform/shared/boundary-map.ts` | `src/features/schedule/shared/boundary-map.ts` | explicit `publicEntrypoints`, `implementationSources`, `rules` |
| Compatibility re-export posture | touched legacy `src/lib/*` / `src/actions/*` wrappers | `src/lib/dto/schedule.ts`, `src/lib/dal/schedule-runtime.ts`, `src/actions/schedule-import-actions.ts` | one-line compatibility re-export or thin wrapper |
| Pure contracts root | `src/features/runtime-platform/contracts/*.ts` | `src/lib/dto/classroom.ts` | Zod-first typed contract modules with exported schemas + types |
| Route consumer migration | `src/app/(teacher)/teacher/editor/page.tsx`, `src/app/(teacher)/teacher/launch/page.tsx`, `src/app/(classroom)/classroom/page.tsx`, `src/app/(student)/student/player/page.tsx` | current files themselves | route pages import public feature APIs, not deep legacy modules |
| Canonical verifier | `scripts/verify-phase27-runtime-platform.ts` | `scripts/verify-phase18-schedule.ts`, `scripts/verify-phase26-trends-productization.ts` | static guards first, then targeted `pnpm test --run`, optional composition of earlier `verify:phaseN` commands |
| Compatibility assertions | focused route tests | `src/app/(classroom)/classroom/page.test.tsx`, `src/components/surfaces/*.test.tsx` patterns used by phases 24-26 | semantic assertions, not comment-count or raw snapshot gating |
| Route metadata integrity | runtime-platform teacher-facing additions | `src/lib/theme-layout/route-surface-registry.ts` | centralized route surface registry only |
| Navigation integrity | teacher chain links back to editor/launch/classroom/trends | `src/lib/navigation.ts` | shared nav contract, no page-local string branching |
| Future seams | `src/features/runtime-platform/seams/**/*.ts` | verifier/static-guard style from `scripts/verify-phase18-schedule.ts` | centralized contract + default implementation + no hidden toggle |

## Non-negotiable path rules for planning

1. `runtime-platform` 必须是单根目录，子域挂在其下。
2. contracts 只能放在这个根下的纯 contract 子域，不拆正式 monorepo packages。
3. seams 统一集中在 `runtime-platform/seams` 或等价集中子域。
4. route-level consumers 只依赖 runtime-platform public APIs。
5. teacher-facing route 若新增 surface metadata，必须继续走
   `route-surface-registry.ts`。

## Verification patterns to reuse

- 使用 `execFileSync("pnpm", [...])` 运行已有 verifier / focused tests。
- 使用 `readFileSync()` + token checks 做 fail-loud static guards。
- 避免注释命中误判：如需 grep/token gate，先过滤 line comments。
- focused regression suite 优先覆盖 DTO/DAL/action/route/page-shell 的行为断言。
