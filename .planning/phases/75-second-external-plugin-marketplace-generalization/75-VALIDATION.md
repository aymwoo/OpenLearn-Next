---
phase: 75
slug: second-external-plugin-marketplace-generalization
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-10
---

# Phase 75 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts`（`@` → `src/` 路径别名） |
| **Quick run command** | `pnpm vitest run src/plugins/homework/` |
| **Full suite command** | `pnpm test run` |
| **Cross-plugin regression** | `pnpm vitest run src/plugins/quiz-sample/ && pnpm vitest run src/plugins/homework/` |
| **Estimated runtime** | ~60 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run src/plugins/homework/ && pnpm vitest run src/plugins/quiz-sample/`
- **After every plan wave:** Run `pnpm test run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Key milestone checkpoints:** After install / classroom runtime / upgrade → cross-plugin regression
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 75-01-01 | 01 | 1 | dataModel 声明 | — | N/A | unit | `pnpm vitest run src/plugins/homework/__tests__/data-model.test.ts` | ❌ W0 | ⬜ pending |
| 75-01-02 | 01 | 1 | allowlist 注册 | — | N/A | unit | `pnpm vitest run src/plugins/homework/__tests__/dal-operations.test.ts` | ❌ W0 | ⬜ pending |
| 75-02-01 | 02 | 2 | authoring UI | — | N/A | unit | `pnpm vitest run src/plugins/homework/` | ❌ W0 | ⬜ pending |
| 75-03-01 | 03 | 3 | lifecycle 验证 | — | N/A | integration | `pnpm vitest run src/plugins/homework/__tests__/lifecycle.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/plugins/homework/__tests__/` 目录 — homework 插件测试目录
- [ ] `src/plugins/homework/__tests__/data-model.test.ts` — dataModel 声明 + meta-schema 校验
- [ ] `src/plugins/homework/__tests__/dal-operations.test.ts` — 5 动词 DAL 操作测试
- [ ] `src/plugins/homework/__tests__/lifecycle.test.ts` — install → upgrade → uninstall 生命周期
- [ ] `src/plugins/homework/__tests__/cross-plugin-regression.test.ts` — quiz + homework 双绿回归
- [ ] `package.json` 新增 `verify:phase75` alias

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 教师 homework 步骤编辑器 | D-13 | 富文本编辑器 + LexoRank 拖拽交互难以自动化 | 创建 lesson → 添加 homework 步骤 → 填写标题/描述 → 保存 → 拖拽排序 |
| 学生 homework 提交流程 | D-14 | 播放器内 step card 渲染 + 多次提交交互 | 进入 classroom → 查看作业描述 → 输入答案 → 提交 → 重新提交 |
| 教师批改面板 | D-15 | classroom tab 切换 + 学生列表 + 评分表单交互 | 打开 /classroom → "作业提交" tab → 选择学生 → 打分 + 评语 → 保存 |
| Upgrade 迁移后数据完整性 | D-10 | 真实数据迁移的完整性需人工确认 | upgrade v1.0.0 → v1.1.0 → 确认已有数据不丢失 |
| Uninstall 重装恢复 | D-11 | 清理确认 token 交互 + 重装后功能回归 | uninstall → cleanup confirm → 重装 → 创建新作业验证功能正常 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
