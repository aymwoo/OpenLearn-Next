## ROADMAP

**Phases:** 3
**Granularity:** coarse
**Coverage:** 4/4 v1.1 requirements mapped ✓

### Phases

- [ ] **Phase 8: Stitch MCP Integration** - Integrate Stitch MCP to fetch design tokens and UI structural data
- [ ] **Phase 9: Core Page Alignment** - Refactor Home Page and Teacher Dashboard to strictly match Stitch designs
- [ ] **Phase 10: Global Visual Polish** - Fix 1px borders, tonal layering, and ensure release-ready visual consistency

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
**Plans**: 5 plans
- [x] 10-01-PLAN.md — Harden global visual tokens and shared UI primitives.
- [x] 10-02-PLAN.md — Converge shell, navigation, and login entry surfaces.
- [x] 10-03-PLAN.md — Polish teacher dashboard, editor, and students management density.
- [ ] 10-04-PLAN.md — Tighten classroom runtime, launch, roster, and review flows.
- [ ] 10-05-PLAN.md — Harmonize public, student, library, and settings page polish.
**UI hint**: yes

### Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 8. Stitch MCP Integration | 0/0 | Not started | - |
| 9. Core Page Alignment | 3/3 | Complete | 2026-05-06 |
| 10. Global Visual Polish | 3/5 | In Progress|  |
