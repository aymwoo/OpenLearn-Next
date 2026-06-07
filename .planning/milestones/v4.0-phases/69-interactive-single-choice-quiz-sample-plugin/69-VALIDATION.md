---
phase: 69
slug: interactive-single-choice-quiz-sample-plugin
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-03
---

# Phase 69 — Validation Strategy

> Per-phase validation contract for teacher config -> launch freeze -> classroom answer -> governed plugin-owned persistence.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest（unit/integration）+ phase close-gate script (`tsx`) |
| **Config file** | Existing Vitest project conventions + `scripts/server-only-node-shim.cjs` for server scripts |
| **Quick run command** | `pnpm vitest run src/lib/dal/lesson-authoring.test.ts src/lib/dal/classroom.test.ts src/components/authoring/lesson-step-editor.test.tsx src/components/classroom/classroom-control-panel.test.tsx src/components/learning/classroom-runtime-client.test.tsx src/features/runtime-platform/classroom/runtime-session.test.ts` |
| **Full suite command** | `pnpm verify:phase69` (added only by `69-05-PLAN.md`; global `verify:phase` alias stays on Phase 68 until Phase 72) |
| **Estimated runtime** | ~60-90s once close gate exists |

---

## Sampling Rate

- **After every authoring task commit:** run focused Vitest on `lesson-authoring` DAL + `lesson-step-editor` UI tests.
- **After every classroom/runtime task commit:** run focused Vitest on `classroom` DAL + `classroom-control-panel` / student learning card tests.
- **After every plan wave:** run `pnpm vitest run` for touched areas plus any phase-specific verification script produced so far.
- **Before `/gsd-verify-work`:** `pnpm verify:phase69` must pass end-to-end, and `pnpm verify:phase68` must remain green because Phase 69 depends on governed data-access semantics.

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Automated Command | Test Assets | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| QUIZ-01 | 老师可保存 2-4 选项、正确答案命中启用项的 quiz sample 配置；非法配置保存前被拦截 | unit + component | `pnpm vitest run src/lib/dal/lesson-authoring.test.ts src/components/authoring/lesson-step-editor.test.tsx` | `src/lib/dal/lesson-authoring.test.ts` (extend), `src/components/authoring/lesson-step-editor.test.tsx` (extend) | ⬜ pending |
| QUIZ-01 | 保存 quiz sample 配置时同时更新 lesson step shell + plugin step extension，并 bump lesson revision + `cacheTags.lesson/steps/draftLesson` | integration | `pnpm vitest run src/lib/dal/lesson-authoring.test.ts -t "quiz sample"` | `src/lib/dal/lesson-authoring.test.ts` (extend) | ⬜ pending |
| QUIZ-02 | 开课时按 session 冻结完整题面到 `plugin_owned_quiz_questions`；后续修改备课配置不影响已开课 session | integration | `pnpm vitest run src/lib/dal/classroom.test.ts -t "launch quiz sample freeze"` | `src/lib/dal/classroom.test.ts` (extend) | ⬜ pending |
| QUIZ-02 | 学生提交答案固定走 `submitQuizSampleAnswerAction` -> `submitQuizSampleAnswer` -> `dispatchPluginDataAccess` 写 `plugin_owned_quiz_responses`，append-only + `isLatest` 成立 | integration | `pnpm vitest run src/lib/dal/classroom.test.ts src/features/runtime-platform/classroom/runtime-session.test.ts` | `src/lib/dal/classroom.test.ts` (extend), `src/features/runtime-platform/classroom/runtime-session.test.ts` (extend) | ⬜ pending |
| QUIZ-02 | 题目关闭或切走后不能继续改答；开放时允许改答且 latest 生效，且 `cacheTags.classroom/progress/submission/teacherReview` 被刷新 | integration + component | `pnpm vitest run src/lib/dal/classroom.test.ts src/components/classroom/classroom-control-panel.test.tsx src/components/learning/classroom-runtime-client.test.tsx` | `src/lib/dal/classroom.test.ts` (extend), `src/components/classroom/classroom-control-panel.test.tsx` (extend), `src/components/learning/classroom-runtime-client.test.tsx` (extend) | ⬜ pending |
| QUIZ-03 | quiz sample path 不写 core `quizAttempts` / 不直接 import db client 到 UI / built-in registration/bootstrap/discoverability 与 plugin-owned 写路径都在治理审计可见 | gate | `pnpm verify:phase69` | `scripts/verify-phase69-quiz-sample.ts` (new), `package.json` `verify:phase69` (new) | ⬜ pending |
| D-04 | question snapshot schema 含 A-D 文本列，重新编译 / 迁移产物无漂移 | gate | `pnpm plugin:compile && git diff --exit-code src/db/schema/generated/plugin-owned/quiz.ts src/db/schema/generated/plugin-owned/data-access-allowlist.ts` | `plugins/quiz-sample/data-model.ts` (edit), generated schema + allowlist + migration (edit) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `plugins/quiz-sample/data-model.ts` 扩 question snapshot schema（A-D 文本槽位）并重新生成 drizzle / allowlist 产物。
- [ ] `src/lib/dto/lesson-authoring.ts` / `src/lib/dto/resource-ai.ts` 增加 quiz sample authoring config / frozen contract DTO。
- [ ] `src/lib/dal/plugins.builtins.test.ts` / `src/lib/dal/plugins.test.ts` 覆盖 quiz sample built-in registration、bootstrap source、defaultEnabled 与 discoverability。
- [ ] `src/lib/dal/lesson-authoring.test.ts` 覆盖 quiz sample config save path、fieldErrors 与 `cacheTags.lesson/steps/draftLesson` 刷新。
- [ ] `src/components/authoring/lesson-step-editor.test.tsx` 覆盖 quiz sample config UI 校验、保存交互与插件专属配置卡。
- [ ] `src/lib/dal/classroom.test.ts` 覆盖 launch freeze、open/close、student re-answer latest 口径与 cache invalidation。
- [ ] `src/components/classroom/classroom-control-panel.test.tsx` 覆盖 quiz sample round open/close teacher controls。
- [ ] `src/components/learning/classroom-runtime-client.test.tsx` 覆盖 quiz sample answer card（开放/关闭/已作答/更新答案状态）。
- [ ] `src/features/runtime-platform/classroom/runtime-session.test.ts` 覆盖 `submitQuizSampleAnswerAction` -> `submitQuizSampleAnswer` -> `dispatchPluginDataAccess` 提交链。
- [ ] `scripts/verify-phase69-quiz-sample.ts` close-gate script：built-in registration/bootstrap -> authoring -> launch -> answer -> governed persistence -> no core backdoor。
- [ ] `package.json` 仅新增 `verify:phase69`；全局 `verify:phase` alias 保持不变，留待 Phase 72 收口。

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 教师配置卡与学生答题卡是否符合 UI-SPEC 的语气、层次、正式答题感 | QUIZ-01 / QUIZ-02 UI contract | 视觉语言、中文文案与“像正式答题卡而不是投票”难以完全自动判断 | 启动本地页面，检查老师端是否为插件专属配置卡、学生端是否为正式答题卡，确认无 1px divider、主 CTA 与状态文案符合 `69-UI-SPEC.md` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all missing tests/scripts
- [x] No watch-mode flags
- [x] Feedback latency < 90s for routine focused runs
- [x] `nyquist_compliant: true` set in frontmatter before verification handoff

**Approval:** ready for checker handoff
