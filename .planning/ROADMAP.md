## ROADMAP

**Phases:** 5
**Granularity:** coarse
**Coverage:** 21/21 Phase 11 requirements mapped ✓

### Phases

- [ ] **Phase 8: Stitch MCP Integration** - Integrate Stitch MCP to fetch design tokens and UI structural data
- [ ] **Phase 9: Core Page Alignment** - Refactor Home Page and Teacher Dashboard to strictly match Stitch designs
- [x] **Phase 10: Global Visual Polish** - Fix 1px borders, tonal layering, and ensure release-ready visual consistency (completed 2026-05-06)
- [x] **Phase 11: Plugin, Theme, and Classroom Readiness** - Make plugin hooks, theme plugins, and teacher classroom workflows usable end-to-end from existing docs
- [ ] **Phase 12: Classroom Launch and Built-in Teaching Steps** - Add a dedicated classroom launch flow, complete lesson preview coverage, and ship first-party teaching-step plugins through the existing plugin system

### Phase Details

### Phase 8: Stitch MCP Integration
**Goal**: The system can fetch design tokens and page structures from the remote Stitch project via MCP.
**Depends on**: Phase 7
**Requirements**: UI-01
**Success Criteria**:
  1. Developer can configure Stitch MCP connection securely.
  2. System successfully fetches and caches design tokens from Stitch project `5322129002350954765`.
  3. System can query and retrieve page component structures via MCP for local alignment reference.
**Plans**: 2 plans
- [x] 08-01-PLAN.md — Refactor Home Page using Stitch design.
- [x] 08-02-PLAN.md — Refactor Teacher Dashboard using Stitch design.

### Phase 9: Core Page Alignment
**Goal**: All mapped Stitch pages align to their corresponding application routes, including newly added management and settings routes.
**Depends on**: Phase 8
**Requirements**: UI-02, UI-03
**Success Criteria**:
  1. User sees `/`, `/teacher`, `/classroom`, `/teacher/editor`, `/student`, `/student/player`, `/resources`, `/courses`, and `/teacher/review` match their mapped Stitch screens in layout, typography, density, and hierarchy.
  2. User can navigate to `/teacher/students`, `/settings`, and `/settings/labs` and see newly added pages that visually align with their mapped Stitch screens.
  3. Variant screens are rationalized consistently: `/classroom` uses `课堂教学流程运行管理` as the primary source with `课堂教学运行管理 - 优化版` as a supplement, and `/student` uses `学生学习页面 - OpenLear-Next` as the primary source.
**Plans**: 3 plans
- [x] 09-01-PLAN.md — Align home, teacher, classroom, and lesson editor pages.
- [x] 09-02-PLAN.md — Align student, player, resources, courses, and review pages.
- [x] 09-03-PLAN.md — Add students, settings, and lab settings routes.
**UI hint**: yes

### Phase 10: Global Visual Polish
**Goal**: Application is visually consistent, free of legacy 1px borders, and strictly follows `DESIGN.md`.
**Depends on**: Phase 9
**Requirements**: UI-04
**Success Criteria**:
  1. User navigates the application and sees no 1px divider lines, only surface tonal layering.
  2. All buttons and interactive elements use correct Primary Blue gradients, glassmorphism, and rounded-full styles.
  3. Ambient shadows and surface elevations consistently reflect the "Luminous Academy" design language.
**Plans**: 6 plans
- [x] 10-01-PLAN.md — Harden global visual tokens and shared UI primitives.
- [x] 10-02-PLAN.md — Converge shell, navigation, and login entry surfaces.
- [x] 10-03-PLAN.md — Polish teacher dashboard, editor, and students management density.
- [x] 10-04-PLAN.md — Tighten classroom runtime, launch, roster, and review flows.
- [x] 10-05-PLAN.md — Harmonize public, student, library, and settings page polish.
- [x] 10-06-PLAN.md — Close remaining ghost-focus and no-line interaction gaps.
**UI hint**: yes

### Phase 11: Plugin, Theme, and Classroom Readiness
**Goal**: Plugin execution, theme plugin application, and the teacher classroom loop reach a usable end-to-end state based on `docs/plugin-system-review.md`, `docs/plugin-theme-implementation-plan.md`, `docs/theme-system-design.md`, and `docs/teacher-classroom-flow-review.md`.
**Depends on**: Phase 10
**Requirements**: PLUGIN-01, PLUGIN-02, PLUGIN-03, PLUGIN-04, PLUGIN-05, PLUGIN-06, PLUGIN-07, CLASS-01, CLASS-02, CLASS-03, CLASS-04, CLASS-05, CLASS-06, CLASS-07, LESSON-05, AUTH-05, DATA-04
**Success Criteria**:
  1. Admin/developer can register, list, enable/disable, kill-switch, and delete safe declarative plugins scoped to a school, with permissions and school isolation enforced before hook execution.
  2. Theme plugins can register validated theme tokens, users can select/reset an active theme, and valid tokens are applied at runtime through CSS variables without violating `DESIGN.md` rules.
  3. Teacher authoring autosaves editable lesson-step payloads, live classroom control enforces lock mode server-side, and student connection/snapshot behavior supports reliable teacher-led classroom flow.
  4. Plugin widgets and theme controls are surfaced in the existing dashboard/editor/settings UI without arbitrary plugin JavaScript, direct DB access, or unsafe runtime execution.
**Plans**: 6 plans
- [x] 11-01-PLAN.md — Harden plugin DAL, Server Actions, school isolation, permissions, and audit paths.
- [x] 11-04-PLAN.md — Make lesson step editor payload edits persist through autosave/save actions.
- [x] 11-05-PLAN.md — Harden classroom snapshot, presence, SSE reliability, and server-side lock enforcement.
- [x] 11-02-PLAN.md — Build theme plugin registration and runtime theme injection foundation.
- [x] 11-03-PLAN.md — Wire safe plugin widgets, anchors, settings theme selector, and labs plugin manager UI.
- [x] 11-06-PLAN.md — Add cross-flow Phase 11 verification, seed support, and docs alignment.
**UI hint**: yes

### Phase 12: Classroom Launch and Built-in Teaching Steps
**Goal**: Teachers can start a new classroom from a dedicated launch surface, preview lesson orchestration in context, and use first-party built-in teaching-step plugins that are enabled by default in the authoring flow and plugin marketplace.
**Depends on**: Phase 11
**Requirements**: CLASS-01, CLASS-02, CLASS-03, CLASS-04, CLASS-06, CLASS-07, LESSON-03, PLUGIN-04, PLUGIN-05
**Success Criteria**:
  1. Teacher can open a dedicated "开启新课堂" page that matches the current design language, choose a published lesson and class, and launch or resume classroom runtime from there.
  2. Teacher can access an implemented lesson orchestration preview experience, or a completed replacement, to preview existing classroom step structure before launching.
  3. System ships first-party built-in teaching-step plugins for 教师讲授、问卷调查、学生探究、课堂测验、评价, shows them in the plugin marketplace, enables them by default, and surfaces them in the classroom authoring page.
  4. Safe plugin action interfaces exist for the built-in teaching-step plugins so they can register validated payloads, authoring UI, and classroom/runtime behaviors without arbitrary JavaScript, direct DB access, or unsafe execution.
**Plans**: 4 plans
- [x] 12-01-PLAN.md — Build the dedicated classroom launch page and route existing launch/resume entry through it.
- [x] 12-02-PLAN.md — Audit and complete lesson orchestration preview coverage in the current teacher flow.
- [ ] 12-03-PLAN.md — Add seeded built-in teaching-step plugin manifests, marketplace entries, and default enablement.
- [ ] 12-04-PLAN.md — Extend safe plugin actions and authoring/runtime integration for built-in teaching-step plugins.
**UI hint**: yes

### Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 8. Stitch MCP Integration | 0/0 | Not started | - |
| 9. Core Page Alignment | 3/3 | Complete | 2026-05-06 |
| 10. Global Visual Polish | 6/6 | Complete    | 2026-05-06 |
| 11. Plugin, Theme, and Classroom Readiness | 6/6 | Complete | 2026-05-07 |
| 12. Classroom Launch and Built-in Teaching Steps | 2/4 | In Progress|  |
