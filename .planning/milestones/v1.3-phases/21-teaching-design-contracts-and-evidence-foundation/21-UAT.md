---
status: complete
phase: 21-teaching-design-contracts-and-evidence-foundation
source: [21-01-SUMMARY.md, 21-02-SUMMARY.md, 21-03-SUMMARY.md, 21-04-SUMMARY.md, 21-05-SUMMARY.md]
started: 2026-05-13T02:45:59Z
updated: 2026-05-20T13:43:20+08:00
---

## Current Test

[testing complete]

## Tests

### 1. 冷启动冒烟测试
expected: 停掉当前服务后，从干净状态重新启动应用。启动过程中不应出现 migration、seed 或启动报错；启动完成后，首页或主入口页面应能正常打开，而不是空白页、500 页面或卡死。
result: skipped
reason: "历史 UAT 遗留项，未在 Phase 21 会话内实际执行；不再作为开放测试保留。后续如需验证冷启动，应在当前 milestone 环境下重新发起新的 UAT。"

### 2. 编辑器能编辑教学设计字段
expected: 教师打开 `/teacher/editor`，编辑一个 content、task 或 quiz 步骤时，编辑区能看到 teaching design 相关字段，至少包括活动意图、预计时长、活动方式和证据期待，而不是只有旧版步骤字段。
result: skipped
reason: "历史 UAT 受当时开发库缺少种子用户数据影响而未能执行；该环境阻塞不再作为当前 planning 开放项保留。若需复核，应在当前数据库基线下重新发起新的 UAT。"

### 3. 开课预览显示结构化教学意图
expected: 教师打开 `/teacher/launch` 并选择一个已发布课时后，开课预览中的每个步骤都能看到结构化教学信息，如活动意图、活动方式、预计时长和证据摘要，而不是只显示旧的泛化步骤说明。
result: pass

### 4. 旧课时显示默认推断或待完善标记
expected: 打开一个没有显式 teaching design 的旧课时时，教师侧 editor、教师预览或开课预览会明确显示"默认推断"或"待完善"之类的提示，并让人知道当前值来自 fallback，而不是伪装成完整配置。
result: pass

### 5. 学生可以提交课堂证据
expected: 在一个真实课堂 session 中，学生可以提交课堂证据；提交后不会只停留在本地界面，教师侧或后续课堂数据读取链路应能基于该 session 看到这条证据已经被记录。
result: pass

### 6. 教师可以记录并查看课堂干预时间线
expected: 在真实课堂 session 中，教师记录一条课堂干预后，运行台应在独立的干预记录区域或时间线里看到这条记录，至少包含标题或正文，以及稳定的教师侧展示；该内容不应以学生视角泄漏出去。
result: pass

### 7. verify:phase21 校验通过
expected: 本地运行 `pnpm verify:phase21` 时应成功退出，证明 fallback 提示、课堂证据写入链路、缓存失效和相关安全边界仍然成立。
result: pass

### 8. 编辑器步骤卡显示带标签的预计时长
expected: 在 `/teacher/editor` 的步骤卡上，每个步骤都应以清晰可感知的方式显示"预计时长"元信息；即使是旧课时 fallback 场景，也不应只剩一个难以察觉的小 badge 或完全看不到时间。
result: pass

## Summary

total: 8
passed: 6
issues: 0
pending: 0
skipped: 2
blocked: 0

## Gaps

[none yet]
