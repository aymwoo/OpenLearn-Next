# Pitfall research

**Milestone:** v1.2 Course Import & Management  
**Researched:** 2026-05-09  
**Confidence:** HIGH

## Main risks

| Risk | Why it matters | Prevention |
|------|----------------|------------|
| School-scope leaks | Course, class, and enrollment data are school-scoped and cannot be exposed cross-tenant | Keep every read and write behind teacher membership and school-scope DAL checks. |
| Duplicate imports | Batch import can quickly create polluted course catalogs | Add explicit conflict detection and show created / updated / skipped / failed results. |
| Status drift | Draft, published, archived, and deleted courses can appear inconsistently across course center, lesson authoring, and classroom launch | Centralize lifecycle rules and test every read model that consumes course status. |
| Unsafe delete path | Teachers may try to remove courses that still have lessons or associations | Add eligibility rules, confirmation, and clear failure messaging for destructive actions. |
| Cache invalidation gaps | The course center will look broken if list counts or associations lag behind mutations | Invalidate all affected course, lesson, class, and enrollment tags after writes. |
| Import path divergence | A separate import-only write path will drift from manual course behavior | Reuse the same validation and DAL mutation helpers for both flows. |

## Phase guidance

1. Solve list, edit, and lifecycle consistency first.
2. Add association safety before broadening import reach.
3. Finish with preview/apply import integrity and regression coverage.
