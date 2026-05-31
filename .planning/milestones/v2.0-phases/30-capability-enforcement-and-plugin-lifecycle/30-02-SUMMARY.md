# 30-02 Summary

## What shipped

- 将 plugin manifest 演进到 v2 posture：`manifestVersion`、`governance`、runtime declaration、requested capabilities、permission contract、lifecycle metadata 全部显式化。
- `RuntimeManifestV2Schema` 不再只是 placeholder，并把 runtime entry 限制为 local-only bootstrap。
- legacy manifest 继续可解析，但缺失 v2 governance 字段时不会隐式放宽能力面。

## Key files

- `src/features/runtime-platform/contracts/descriptors.ts`
- `src/lib/dto/resource-ai.ts`
- `src/features/runtime-platform/contracts/contracts.test.ts`
- `src/lib/dal/plugins.builtins.test.ts`

## Verification

- `pnpm exec vitest --run src/features/runtime-platform/contracts/contracts.test.ts src/lib/dal/plugins.builtins.test.ts`

## Notes

- remote bootstrap URL 现在会在 schema 层被拒绝，保持本地受控入口 posture。
