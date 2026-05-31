# Quick Task 260512-daw

修复课表页面运行时报错 `Failed query on scheduleImportBatch selecting isPrimary`。

1. 确认 `src/db/schema.ts` 与本地 `local.db` 的 `scheduleImportBatch` 表结构是否一致。
2. 采用最小正确修复恢复本地运行。
3. 不创建 git commit。
