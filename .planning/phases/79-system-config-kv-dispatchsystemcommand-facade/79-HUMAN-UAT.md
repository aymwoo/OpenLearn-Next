---
status: partial
phase: 79-system-config-kv-dispatchsystemcommand-facade
source: [79-VERIFICATION.md]
started: 2026-06-12T07:30:00Z
updated: 2026-06-12T07:30:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. 端到端 system.config.set 流程
expected: 通过 dispatchSystemCommand({commandType:"system.config.set", ...}) 调用，经 governance-gate → Command Bus → handler.authorize（manifest re-parse）→ handler.execute（pluginOwnedBusinessData upsert），验证 audit 记录中 action="system.config.set"、decision="allowed"
result: [pending]

### 2. 端到端 system.config.get 流程
expected: 通过 dispatchSystemCommand({commandType:"system.config.get", ...}) 调用，经 governance-gate → handler.authorize（manifest re-parse）→ handler.execute（DAL 查询），验证返回值和 source="dal"，验证不产生 audit 记录
result: [pending]

### 3. manifest allowedKeys 前缀通配真实行为
expected: plugin manifest 中声明 `allowedKeys: ["homework:*"]`，使用 configKey="homework_title" 调用 set/get，验证通过；使用 configKey="homework_sub_key" 验证被拒绝
result: [pending]

### 4. 治理门拒绝场景（kill-switch/lifecycle）
expected: 将插件 lifecycle 设置为 disabled 或启用 kill-switch，调用 dispatchSystemCommand 验证被拒绝，确认 audit 记录包含对应的 reasonCode
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
