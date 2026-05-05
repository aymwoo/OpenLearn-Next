# Roadmap: OpenLearn Next

## Overview

OpenLearn Next v1 按“可信基础 → 教师编排 → 学生学习闭环 → 实时课堂 → 安全扩展边界”的顺序交付。路线图采用 coarse granularity，但保留复杂项目需要的宽阶段：每个阶段都是可验证的能力边界，后续可拆成多个执行计划。UI 实现绑定 Stitch 项目 `5322129002350954765` 与本地 `DESIGN.md`，所有页面必须继承 The Luminous Academy / The Tactile Horizon 的简体中文、Lexend、tonal layering、无 1px 分割线、glassmorphism、渐变 CTA 和可访问性约束。

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Application foundation and design shell** - 建立 Next.js 16 应用骨架、路由外壳、PPR/cache 规则和绑定设计系统。 (Completed 2026-05-04)
- [x] **Phase 2: Auth, roles, schema, and DAL boundary** - 建立身份、角色、SQLite/Drizzle 数据模型、权限和 server-only DAL 安全边界。 (completed 2026-05-04)
- [ ] **Phase 3: Courses, lessons, steps, and teacher authoring** - 教师可以创建课程、编排步骤、自动保存、发布稳定课时版本。
- [x] **Phase 4: Student player, progress, submissions, and feedback** - 学生可以完成课时流程，教师可以查看进度、提交历史和反馈状态。 (Completed 2026-05-05)
- [ ] **Phase 5: Classroom runtime and Edge SSE** - 教师可以启动实时课堂、控制当前步骤和 locked/unlocked 模式，学生端实时同步。
- [ ] **Phase 6: Resource, AI/RAG/MCP, plugin, and theme foundations** - 建立资源中心与 AI、RAG、MCP、插件、主题的安全可扩展边界。

## Phase Details

### Phase 1: Application foundation and design shell
**Goal**: 用户和开发者拥有可运行的 Next.js 16 / React 19.2 应用基础、分区路由外壳和严格绑定 Stitch + `DESIGN.md` 的视觉系统。
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06
**Success Criteria** (what must be TRUE):
  1. User can open the application and see public, teacher, student, classroom, admin route shells with Simplified Chinese navigation.
  2. User sees homepage, teacher dashboard, student dashboard, editor, player, classroom console, resource, and course surfaces aligned to Stitch project `5322129002350954765` and `DESIGN.md`.
  3. Developer can build pages with shared Lexend design tokens and components that enforce tonal layering, no 1px divider lines, glass surfaces, gradient primary actions, and accessible focus states.
  4. Developer can identify explicit cache tags, PPR boundaries, and Suspense rules before adding user-specific or live classroom data.
**Plans**: 6 plans
Plans:
- [x] 01-01-PLAN.md — Scaffold Next.js 16 / React 19.2 baseline, Cache Components, Lexend root layout, and Tailwind v4 design tokens.
- [x] 01-02-PLAN.md — Create shared static data, navigation, cache policy, UI primitives, and shell components.
- [x] 01-03-PLAN.md — Build high-fidelity public home, teacher dashboard, and lesson editor surfaces.
- [x] 01-04-PLAN.md — Build student, player, classroom, course, resource, and admin route shells.
- [x] 01-05-PLAN.md — Finalize PPR/cache loading boundaries and automated Phase 1 shell verification.
- [x] 01-06-PLAN.md — Close Human UAT gaps by recalibrating home visual density plus navigation/CTA alignment against Stitch.
**UI hint**: yes

### Phase 2: Auth, roles, schema, and DAL boundary
**Goal**: 用户可以安全登录并进入角色对应工作区，开发者只能通过授权 DAL 和 Server Actions 访问 SQLite-first Drizzle 数据。
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, DATA-01, DATA-02, DATA-03, DATA-04, DATA-05
**Success Criteria** (what must be TRUE):
  1. User can sign in with Auth.js v5 and keep a Drizzle-backed session across protected app areas.
  2. Admin, teacher, and student users reach only their role-appropriate workspaces, while future roles exist in server models without unfinished UI exposure.
  3. Unauthenticated users are redirected away from protected teacher, student, classroom, admin, and API route families by `proxy.ts`.
  4. Developer can use SQLite-first Drizzle migrations, cascades, indexes, Zod validation, and server-only DAL modules for all auth, school, course, classroom, AI, MCP, plugin, and theme table groups.
  5. UI receives sanitized DTOs only after DAL and Server Actions verify actor identity, role, membership, ownership, enrollment, and resource scope.
**Plans**: 4 plans
Plans:
- [x] 03-01-PLAN.md — Define authoring schema, DTO contracts, rank-string ordering, and push SQLite schema.
- [x] 03-02-PLAN.md — Implement server-only teacher authoring DAL with DTO-safe reads, scoped mutations, reorder, and publish snapshots.
- [x] 03-03-PLAN.md — Add Zod-validated authoring Server Actions, cache tag updates, conflict handling, and Phase 3 verification script.
- [x] 03-04-PLAN.md — Replace static editor with data-backed teacher authoring UI, step editing, reorder controls, and publish/status feedback.
**UI hint**: yes

### Phase 3: Courses, lessons, steps, and teacher authoring
**Goal**: 教师可以从课程/班级出发创建、编排、保存并发布由 `content`、`task`、`quiz` 步骤组成的稳定课时。
**Depends on**: Phase 2
**Requirements**: LESSON-01, LESSON-02, LESSON-03, LESSON-04, LESSON-05, LESSON-06, LESSON-07, LESSON-08
**Success Criteria** (what must be TRUE):
  1. Teacher can create and manage courses or classes with enrolled students.
  2. Teacher can create, edit, duplicate, archive, and publish lessons inside a course or class.
  3. Teacher can add validated `content`, `task`, and `quiz` steps, attach or reference basic materials, and keep drafts hidden from students.
  4. Teacher can reorder steps with LexoRank drag-and-drop without cascading updates across all steps.
  5. Teacher receives clear autosave, publish, conflict, and cache freshness feedback after Server Actions mutate lesson data.
**Plans**: TBD
**UI hint**: yes

### Phase 4: Student player, progress, submissions, and feedback
**Goal**: 学生可以按进度完成已发布课时并提交学习证据，教师可以查看进度、最新提交、尝试历史和基础反馈。
**Depends on**: Phase 3
**Requirements**: LEARN-01, LEARN-02, LEARN-03, LEARN-04, LEARN-05, LEARN-06, LEARN-07, LEARN-08, LEARN-09
**Success Criteria** (what must be TRUE):
  1. Student can see assigned or published lessons from a student dashboard and resume the most relevant lesson.
  2. Student can open a PPR lesson player with a cached shell and Suspense-streamed progress, runtime state, and latest submission data.
  3. Student can navigate permitted content, task, and quiz steps and resume from the first incomplete step or teacher-forced active step.
  4. Student can submit immutable append-only task attempts and quiz answers with latest-read optimization and captured or scored outcomes.
  5. Teacher can review progress, latest submissions, attempt history, quiz outcomes, feedback status, and leave short feedback without a full gradebook.
**Plans**: 7 plans
Plans:
- [x] 04-01-PLAN.md — Define learning schema, DTO contracts, and Phase 04 verification gate.
- [x] 04-02-PLAN.md — Implement server-only learning DAL for student reads, progress, append-only attempts, teacher review, and feedback.
- [x] 04-03-PLAN.md — Add validated learning Server Actions and explicit cache tags for progress, submissions, and review freshness.
- [x] 04-04-PLAN.md — Convert student dashboard/player into DTO-backed progress, task, quiz, latest attempt, and history UI.
- [x] 04-05-PLAN.md — Build teacher review cockpit and short feedback composer without gradebook scope.
- [x] 04-06-PLAN.md — Push Drizzle schema and close Phase 04 automated verification.
- [x] 04-07-PLAN.md — Close LEARN-02 gap by splitting the player into a cached shell and Suspense-streamed personal learning regions.
**UI hint**: yes

### Phase 5: Classroom runtime and Edge SSE
**Goal**: 教师可以把已发布课时作为实时课堂运行，并通过持久化课堂状态和 Edge SSE 让学生端可靠跟随。
**Depends on**: Phase 4
**Requirements**: CLASS-01, CLASS-02, CLASS-03, CLASS-04, CLASS-05, CLASS-06, CLASS-07
**Success Criteria** (what must be TRUE):
  1. Teacher can launch a published lesson as a classroom session with a roster of participants.
  2. Teacher can see and change the active step and switch between locked and unlocked classroom modes.
  3. Student player reflects active step and lock mode changes through an Edge Runtime SSE stream.
  4. Late-joining or reconnecting students receive a consistent snapshot from durable SQLite classroom state rather than SSE memory.
  5. Teacher can recover from classroom control conflicts or stale UI with clear state feedback.
**Plans**: TBD
**UI hint**: yes

### Phase 6: Resource, AI/RAG/MCP, plugin, and theme foundations
**Goal**: 教师和开发者拥有最小资源中心，以及 AI、RAG、MCP、插件和主题的声明式、安全、可审计扩展边界。
**Depends on**: Phase 5
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07, PLUGIN-01, PLUGIN-02, PLUGIN-03, PLUGIN-04, PLUGIN-05, PLUGIN-06, PLUGIN-07
**Success Criteria** (what must be TRUE):
  1. Teacher can manage a minimal resource center with metadata, ownership, visibility, and future RAG eligibility.
  2. Developer can register AI agent capability interfaces, agent run metadata, audit logs, feature flags, structured outputs, and teacher-approval gates without raw database access.
  3. Developer can define RAG `KnowledgeSource`, chunk metadata, Qdrant-ready retrieval filters, and MCP server/credential/capability/audit tables behind server-side adapter boundaries.
  4. Developer can register declarative JSON plugins with permissions, safe context injection, hook anchors, action allowlists, denied-action audit logs, and kill-switch state.
  5. Admin or developer can define declarative theme tokens that preserve `DESIGN.md`, Lexend, Simplified Chinese UI, no-line tonal surfaces, and accessibility constraints.
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Application foundation and design shell | 6/6 | Complete | 2026-05-04 |
| 2. Auth, roles, schema, and DAL boundary | 3/3 | Complete   | 2026-05-04 |
| 3. Courses, lessons, steps, and teacher authoring | 0/TBD | Not started | - |
| 4. Student player, progress, submissions, and feedback | 7/7 | Complete | 2026-05-05 |
| 5. Classroom runtime and Edge SSE | 0/TBD | Not started | - |
| 6. Resource, AI/RAG/MCP, plugin, and theme foundations | 0/TBD | Not started | - |

## Coverage

Every v1 requirement maps to exactly one phase.

| Phase | Requirements | Count |
|-------|--------------|-------|
| 1. Application foundation and design shell | FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06 | 6 |
| 2. Auth, roles, schema, and DAL boundary | AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, DATA-01, DATA-02, DATA-03, DATA-04, DATA-05 | 11 |
| 3. Courses, lessons, steps, and teacher authoring | LESSON-01, LESSON-02, LESSON-03, LESSON-04, LESSON-05, LESSON-06, LESSON-07, LESSON-08 | 8 |
| 4. Student player, progress, submissions, and feedback | LEARN-01, LEARN-02, LEARN-03, LEARN-04, LEARN-05, LEARN-06, LEARN-07, LEARN-08, LEARN-09 | 9 |
| 5. Classroom runtime and Edge SSE | CLASS-01, CLASS-02, CLASS-03, CLASS-04, CLASS-05, CLASS-06, CLASS-07 | 7 |
| 6. Resource, AI/RAG/MCP, plugin, and theme foundations | AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07, PLUGIN-01, PLUGIN-02, PLUGIN-03, PLUGIN-04, PLUGIN-05, PLUGIN-06, PLUGIN-07 | 14 |

**Coverage status:** 55/55 v1 requirements mapped; 0 orphaned; 0 duplicated.

---
*Roadmap created: 2026-05-04*
