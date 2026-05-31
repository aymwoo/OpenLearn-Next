---
status: complete
---

# Quick Task 260512-daw Summary

- 已确认根因：`src/db/schema.ts` 定义了 `scheduleImportBatch.isPrimary`，但本地 `local.db` 的 `scheduleImportBatch` 表缺失该列。
- 已执行最小修复：为本地 SQLite 表补齐 `isPrimary INTEGER NOT NULL DEFAULT 0`。
- 已验证：`PRAGMA table_info('scheduleImportBatch')` 可见 `isPrimary`，且 `SELECT isPrimary FROM scheduleImportBatch LIMIT 1;` 可正常查询。
- 未创建 git commit。
