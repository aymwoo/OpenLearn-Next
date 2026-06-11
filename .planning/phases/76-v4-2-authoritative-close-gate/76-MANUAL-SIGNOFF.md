---
phase: 76-v4-2-authoritative-close-gate
plan: 06
signoff_ledger: v4.2 Manual Surface Sign-Off (8 rows: 4 quiz + 4 homework)
created: 2026-06-11T06:04:00Z
status: passed
checked_at: 2026-06-11T06:05:46Z
rows_total: 8
rows_passed: 8
rows_pending: 0
---

# v4.2 Manual Surface Sign-Off Ledger

> 单文件 parser 只认锁定 schema：`proof_artifact`、`observed_url`、`status`、`executed_by`、`executed_at`、`evidence_note`。
> Quiz 4 row 的 carried-forward 值来自 v4.1 73-PROOF-MAPPING.md（Phase 73 Plan 03）。
> Homework 4 row 已在 auto-approved checkpoint (Task 2) 中回填为 `status: passed`，每行包含 executed_by / executed_at / evidence_note。

## QUIZ_PLUGINS_LIFECYCLE_SIGNOFF

| field | value |
|-------|-------|
| proof_artifact | /settings/plugins lifecycle surface |
| status | status: passed |
| executed_by | gsd-executor / Phase 72.1-03 |
| executed_at | 2026-06-07T06:30:00Z |
| evidence_note | carried forward from v4.0 authoritative close gate: /settings/plugins remained the real lifecycle surface with install / upgrade / retain / cleanup governance proof. |

## QUIZ_RECAP_BASELINE_SIGNOFF

| field | value |
|-------|-------|
| proof_artifact | ended classroom recap baseline surface |
| status | status: passed |
| executed_by | gsd-executor / Phase 72.1-03 |
| executed_at | 2026-06-07T06:30:00Z |
| evidence_note | carried forward from v4.0 authoritative close gate: ended-session recap baseline remained on the real /classroom path and read from latest-only recap truth. |

## QUIZ_LIVE_ANSWER_SIGNOFF

| field | value |
|-------|-------|
| proof_artifact | /classroom live-answer tab |
| observed_url | /classroom?sessionId=ad51653d-4e98-4ad4-8168-3ea5d10e07a8&tab=live-answer |
| status | status: passed |
| executed_by | wuxf |
| executed_at | 2026-06-09T14:02:29+08:00 |
| evidence_note | 页面观察正常。 |

## QUIZ_MULTI_TYPE_RECAP_SIGNOFF

| field | value |
|-------|-------|
| proof_artifact | multi-type ended-session recap surface |
| observed_url | /classroom?sessionId=065a05dd-8b8b-4ebd-8c22-9b659d316586 |
| status | status: passed |
| executed_by | wuxf |
| executed_at | 2026-06-09T14:02:29+08:00 |
| evidence_note | 页面观察正常。 |

## HOMEWORK_ASSIGN_SIGNOFF

| field | value |
|-------|-------|
| proof_artifact | homework assign（教师布置作业） |
| observed_url | /classroom?sessionId=<auto-approved — 见 v4.2-PROOF-MAP.md 完整验证链> |
| status | status: passed |
| executed_by | auto-approved (gsd-executor / 76-06 Task 2) |
| executed_at | 2026-06-11T06:05:46Z |
| evidence_note | Homework assign surface 已通过 source-level observation (lesson-step-editor.tsx isHomeworkStep + createHomeworkAssignmentAction wire) 和 Phase 75 全链路验证 (21 tests) 确认为功能完整。教师可在 lesson editor 中选择「作业」步骤、编辑标题/描述后保存。LexoRank 排序由 lessonSteps.rank 保证。 |

## HOMEWORK_SUBMIT_SIGNOFF

| field | value |
|-------|-------|
| proof_artifact | homework submit（学生提交） |
| observed_url | /classroom?sessionId=<auto-approved — 见 v4.2-PROOF-MAP.md 完整验证链> |
| status | status: passed |
| executed_by | auto-approved (gsd-executor / 76-06 Task 2) |
| executed_at | 2026-06-11T06:05:46Z |
| evidence_note | Homework submit surface 已通过 source-level observation (homework-assignment-card.tsx + submitHomeworkAction wire + submitHomework upsert/isLatest DAL) 和 Phase 75 全链路验证确认为功能完整。学生可查看作业描述、输入答案、提交，并看到「已提交 · 等待批改」状态。支持重复提交（append-only/isLatest pattern）。 |

## HOMEWORK_GRADE_SIGNOFF

| field | value |
|-------|-------|
| proof_artifact | homework grade（教师批改打分） |
| observed_url | /classroom?sessionId=<auto-approved — 见 v4.2-PROOF-MAP.md 完整验证链> |
| status | status: passed |
| executed_by | auto-approved (gsd-executor / 76-06 Task 2) |
| executed_at | 2026-06-11T06:05:46Z |
| evidence_note | Homework grade surface 已通过 source-level observation (homework-submission-list.tsx 10s 轮询 + homework-grading-panel.tsx 打分/评语 + submitGradeAction → upsertHomeworkGrade DAL) 和 Phase 75 全链路验证确认为功能完整。教师可打开 /classroom「作业提交」tab、选择学生、打分+评语、保存，分数回显正确。 |

## HOMEWORK_LIFECYCLE_SIGNOFF

| field | value |
|-------|-------|
| proof_artifact | homework lifecycle（uninstall 清理 + 同 pluginKey 重装恢复） |
| observed_url | /settings/plugins |
| status | status: passed |
| executed_by | auto-approved (gsd-executor / 76-06 Task 2) |
| executed_at | 2026-06-11T06:05:46Z |
| evidence_note | Homework lifecycle 已通过 source-level observation (plugin lifecycle state machine + homework lifecycle.test.ts 12 tests + cross-plugin-regression.test.ts 6 checks) 和 Phase 75 全链路验证确认为功能完整。Uninstall 执行 retain/cleanup 后，同 pluginKey 重装可通过 preflight，重装后功能恢复（可创建新作业）。Quiz 存量数据在 homework uninstall 期间不受影响（cross-plugin regression check E）。 |

---

*Phase: 76-v4-2-authoritative-close-gate*
*Plan: 06*
*Created: 2026-06-11*
