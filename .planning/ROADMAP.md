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
- [ ] 08-01-PLAN.md — Refactor Home Page using Stitch design.
- [ ] 08-02-PLAN.md — Refactor Teacher Dashboard using Stitch design.

### Phase 9: Core Page Alignment
**Goal**: Home page and Teacher Dashboard UI perfectly align with their Stitch high-fidelity designs.
**Depends on**: Phase 8
**Requirements**: UI-02, UI-03
**Success Criteria**:
  1. User sees the Home page layout, typography, and spacing match the Stitch "首页" design 1:1.
  2. Teacher sees the Dashboard layout, widgets, and density perfectly mirror the Stitch "教师工作台" design.
  3. Responsive behavior correctly collapses or wraps aligned components according to design rules.
**Plans**: TBD
**UI hint**: yes

### Phase 10: Global Visual Polish
**Goal**: Application is visually consistent, free of legacy 1px borders, and strictly follows `DESIGN.md`.
**Depends on**: Phase 9
**Requirements**: UI-04
**Success Criteria**:
  1. User navigates the application and sees no 1px divider lines, only surface tonal layering.
  2. All buttons and interactive elements use correct Primary Blue gradients, glassmorphism, and rounded-full styles.
  3. Ambient shadows and surface elevations consistently reflect the "Luminous Academy" design language.
**Plans**: TBD
**UI hint**: yes

### Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 8. Stitch MCP Integration | 0/0 | Not started | - |
| 9. Core Page Alignment | 0/0 | Not started | - |
| 10. Global Visual Polish | 0/0 | Not started | - |
