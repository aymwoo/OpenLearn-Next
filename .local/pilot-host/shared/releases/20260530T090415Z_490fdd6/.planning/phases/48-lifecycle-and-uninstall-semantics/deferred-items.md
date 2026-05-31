# Deferred items

- `pnpm exec tsc --noEmit` 仍被 Phase 46/47 既有文件阻塞：`src/lib/dal/plugin-data.ts`、`src/lib/dal/plugin-migration.ts` 与对应测试存在预存 TypeScript 错误，超出本计划直接修改范围，未在本次修复。
