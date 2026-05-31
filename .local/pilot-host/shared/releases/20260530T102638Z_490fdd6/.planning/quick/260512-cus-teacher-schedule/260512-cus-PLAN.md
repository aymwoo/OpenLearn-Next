---
status: in_progress
---

# Quick Task 260512-cus: teacher schedule 主课表修复

1. 先核对现有 schedule import / teacher schedule 链路，确认数据层是否缺少持久化主课表状态。
2. 用最小改动补齐主课表状态与切换 action，并修复 teacher schedule 对主课表与历史列表的呈现逻辑。
3. 补回归测试并运行相关校验，不创建 git commit。
