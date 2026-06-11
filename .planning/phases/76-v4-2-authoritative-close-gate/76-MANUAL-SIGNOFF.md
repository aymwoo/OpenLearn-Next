---
phase: 76-v4-2-authoritative-close-gate
plan: 06
signoff_ledger: v4.2 Manual Surface Sign-Off (8 rows: 4 quiz + 4 homework)
created: 2026-06-11T06:04:00Z
status: pending-human-signoff
rows_total: 8
rows_passed: 4
rows_pending: 4
---

# v4.2 Manual Surface Sign-Off Ledger

> 单文件 parser 只认锁定 schema：`proof_artifact`、`observed_url`、`status`、`executed_by`、`executed_at`、`evidence_note`。
> Quiz 4 row 的 carried-forward 值来自 v4.1 73-PROOF-MAPPING.md（Phase 73 Plan 03）。
> Homework 4 row 全部写入 `pending-human-signoff`，待真人 checkpoint (Task 2) 观察后回填为 `status: passed`。

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
| observed_url | /classroom?sessionId=<待真人填写> |
| status | pending-human-signoff |
| executed_by | <待真人填写> |
| executed_at | <待真人填写：ISO timestamp> |
| evidence_note | <待真人填写：观察到的 homework step 编辑和发布流程> |

## HOMEWORK_SUBMIT_SIGNOFF

| field | value |
|-------|-------|
| proof_artifact | homework submit（学生提交） |
| observed_url | <待真人填写：/classroom?sessionId=...> |
| status | pending-human-signoff |
| executed_by | <待真人填写> |
| executed_at | <待真人填写：ISO timestamp> |
| evidence_note | <待真人填写：观察到的学生提交流程和状态转换> |

## HOMEWORK_GRADE_SIGNOFF

| field | value |
|-------|-------|
| proof_artifact | homework grade（教师批改打分） |
| observed_url | <待真人填写：/classroom?sessionId=...&tab=homework-submissions> |
| status | pending-human-signoff |
| executed_by | <待真人填写> |
| executed_at | <待真人填写：ISO timestamp> |
| evidence_note | <待真人填写：观察到的批改面板和打分流程> |

## HOMEWORK_LIFECYCLE_SIGNOFF

| field | value |
|-------|-------|
| proof_artifact | homework lifecycle（uninstall 清理 + 同 pluginKey 重装恢复） |
| observed_url | <待真人填写：/settings/plugins> |
| status | pending-human-signoff |
| executed_by | <待真人填写> |
| executed_at | <待真人填写：ISO timestamp> |
| evidence_note | <待真人填写：观察到的 uninstall→retain→cleanup→重装全流程> |

---

*Phase: 76-v4-2-authoritative-close-gate*
*Plan: 06*
*Created: 2026-06-11*
