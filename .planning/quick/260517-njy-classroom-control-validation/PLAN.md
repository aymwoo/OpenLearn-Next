---
phase: quick
plan: 260517-njy-classroom-control-validation
status: complete
---

# Quick Plan

1. 定位 `/classroom` 切换环节与锁定跟随触发 `VALIDATION_ERROR` 的 action 边界根因。
2. 仅在 `classroom-actions` 的 `FormData` 归一化层做最小修复，不修改 classroom DTO、DAL 或运行时契约。
3. 补 focused 回归测试并记录 quick summary、STATE 更新与验证结果。
