# Phase 1: Application foundation and design shell - Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers the runnable Next.js 16 / React 19.2 application foundation, route-group shells, shared design tokens/components, and explicit PPR/cache/Suspense conventions. It creates high-fidelity static shells for the mapped product areas, but it does not implement real authentication, database-backed business data, lesson editing logic, student progress, classroom runtime, AI, RAG, MCP, or plugin execution.

</domain>

<decisions>
## Implementation Decisions

### Shell depth

- **D-01:** Phase 1 shells must be high-fidelity static UI, not bare wireframes. They should look like the product is usable even though real data is not connected yet.
- **D-02:** Static shells must include working-looking navigation and active states, dashboard cards, and the core editor/player/classroom chrome.
- **D-03:** Use subtle Simplified Chinese demo copy to communicate that content is illustrative. Avoid disruptive demo banners and avoid implementation words such as mock, seed, database, or placeholder in user-facing UI.
- **D-04:** Highest-fidelity priority is public home, teacher dashboard, and lesson editor. Student dashboard, player, classroom console, resource/course areas, and admin shell can be slightly lighter but must still follow the approved UI-SPEC.

### Role entry

- **D-05:** Phase 1 must allow public demo navigation into teacher, student, classroom, and admin route shells. Do not block these behind fake auth in this phase.
- **D-06:** Provide a demo role switcher or equivalent role preview control. It only changes static shell presentation and must not imply real session/auth behavior.
- **D-07:** The teacher path is the primary user journey. Main CTA should route toward the teacher workspace or `开始备课` flow.
- **D-08:** Admin entry should exist but stay low-emphasis. It is a route-shell proof point, not the main product story for Phase 1.

### Demo content

- **D-09:** Static demo content should use 信息科技 as the main classroom context.
- **D-10:** The demo lesson topic is programming basics for middle school students.
- **D-11:** Copy should feel like real teacher preparation, not a marketing showcase. Use realistic class, lesson, step, and resource labels.
- **D-12:** Example lesson flow should cover 导入, 讲授, 练习, and 总结 so the step-based classroom workflow is visible from Phase 1.

### Mobile priority

- **D-13:** Mobile priority is homepage and dashboard quality first. Do not attempt full mobile parity for all complex shells in Phase 1.
- **D-14:** Editor and classroom console on mobile should provide readable preview plus a clear “建议使用桌面端编辑/控课” style message. Do not hide routes, and do not overbuild mobile editing/control interactions.
- **D-15:** Student player should be readable on mobile because students may use phones or tablets. It does not need full immersive parity in Phase 1.
- **D-16:** Mobile navigation should use top glass navigation with overflow behavior, preserving the UI-SPEC glass surface language and 44px touch targets.

### the agent's Discretion

No major areas were delegated fully to the agent. The planner may decide exact component names, file organization, and static data shape as long as the decisions above and UI-SPEC are preserved.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and phase scope

- `.planning/PROJECT.md` — Project vision, constraints, hard technology choices, and binding Stitch/design references.
- `.planning/REQUIREMENTS.md` — Phase 1 requirements `FOUND-01` through `FOUND-06` and v1 scope boundaries.
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria, dependencies, and UI hint.
- `.planning/STATE.md` — Current project state and session continuity.

### UI contract and design source

- `.planning/phases/01-application-foundation-and-design-shell/01-UI-SPEC.md` — Approved Phase 1 UI design contract. This is mandatory and should be treated as locked.
- `DESIGN.md` — Binding design system: Lexend, Simplified Chinese, no-line tonal layering, glass/gradient CTA, ambient shadows, and accessibility fallback rules.
- Stitch project `5322129002350954765` — Binding external design source. Use the mapped screens named in `PROJECT.md` and `01-UI-SPEC.md` for home, teacher dashboard, student dashboard, editor, player, classroom console, resource center, and course center.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- No reusable source components, hooks, or app routes exist yet. The repository is effectively greenfield aside from planning artifacts and `DESIGN.md`.
- `.planning/phases/01-application-foundation-and-design-shell/01-UI-SPEC.md` is the reusable design contract for all Phase 1 UI decisions.

### Established Patterns

- Planning docs establish a GSD workflow: write phase context before planning, then plan and execute via phase-specific artifacts.
- Project decisions already lock Next.js 16 App Router, React 19.2, Turbopack, Tailwind v4, Lexend, explicit cache components, PPR boundaries, and DAL/Server Action future boundaries.
- No app code patterns exist yet, so Phase 1 should create the initial structure rather than conforming to existing implementation patterns.

### Integration Points

- New code will connect to route groups for public, teacher, student, classroom, admin, resource, and course shell areas.
- New UI code must be structured so later phases can replace static demo content with DAL-backed DTOs without rewriting visual composition.
- PPR/cache conventions should be documented or scaffolded before any future user-specific or live classroom data is added.

</code_context>

<specifics>
## Specific Ideas

- Use an initial static lesson scenario around 初中信息科技 / 编程基础.
- Example step flow should include 导入, 讲授, 练习, 总结.
- The product story should center the teacher journey: homepage CTA to teacher workspace or `开始备课`, with teacher dashboard and lesson editor as the most polished shells.
- Demo role switcher should be clearly static and should not imply real authentication.
- Mobile editor and classroom console should remain honest: previewable, but with desktop-recommended copy for complex editing/control tasks.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-application-foundation-and-design-shell*
*Context gathered: 2026-05-04*
